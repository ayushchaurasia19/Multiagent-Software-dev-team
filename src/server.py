import os
from dotenv import load_dotenv
load_dotenv()

import json
import shutil
import asyncio
import sys
import uuid
import boto3
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.graph.workflow import create_workflow

app = FastAPI(title="DevTeam Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)



class RunRequest(BaseModel):
    requirements: str

class ResumeRequest(BaseModel):
    thread_id: str

workflow_app = create_workflow()

def filter_event_data(data):
    """Recursively filter out non-serializable objects from event data"""
    if hasattr(data, "content") and isinstance(getattr(data, "content"), str):
        # Extract text from LangChain message objects like AIMessageChunk
        return {"content": data.content}
    elif isinstance(data, dict):
        return {k: filter_event_data(v) for k, v in data.items() if isinstance(v, (str, int, float, bool, list, dict, type(None))) or hasattr(v, "content")}
    elif isinstance(data, list):
        return [filter_event_data(v) for v in data if isinstance(v, (str, int, float, bool, list, dict, type(None))) or hasattr(v, "content")]
    return data

@app.get("/api/run_stream")
async def run_stream(prompt: str, request: Request, workDir: str = ""):
    # Initialize workspace
    is_aws = os.getenv("DEPLOYMENT_ENV") == "AWS"
    workspace_dir = "/tmp/workspace" if is_aws else os.path.join(os.getcwd(), "workspace")
    
    if os.path.exists(workspace_dir):
        shutil.rmtree(workspace_dir)
    os.makedirs(workspace_dir, exist_ok=True)
    
    thread_id = str(uuid.uuid4())
    inputs = {
        "requirements": prompt,
        "backend_tasks": [],
        "frontend_tasks": [],
        "review_status": "",
        "review_feedback": [],
        "review_count": 0,
        "messages": [],
        "backend_messages": [],
        "frontend_messages": [],
        "tester_messages": [],
        "backend_done": False,
        "frontend_done": False,
        "tester_done": False,
        "test_report": ""
    }
    
    config = {"configurable": {"thread_id": thread_id}}
    
    async def event_generator():
        try:
            async for event in workflow_app.astream_events(inputs, config=config, version="v2"):
                if await request.is_disconnected():
                    break
                    
                safe_event = {
                    "event": event["event"],
                    "name": event["name"],
                    "run_id": event["run_id"],
                    "tags": event.get("tags", []),
                    "data": filter_event_data(event.get("data", {}))
                }
                
                yield f"data: {json.dumps({'type': 'trace', 'content': safe_event})}\n\n"
                
                if event["event"] == "on_chain_end" and not event["name"].startswith("LangGraph"):
                    node_state = event.get("data", {}).get("output", {})
                    if isinstance(node_state, dict):
                        safe_node_state = filter_event_data(node_state)
                        yield f"data: {json.dumps({'type': 'node_update', 'node': event['name'], 'state': safe_node_state})}\n\n"
                        
            yield f"data: {json.dumps({'type': 'done', 'thread_id': thread_id})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e), 'thread_id': thread_id})}\n\n"
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/api/workspace")
def get_workspace():
    is_aws = os.getenv("DEPLOYMENT_ENV") == "AWS"
    
    if is_aws:
        # S3-based workspace retrieval
        try:
            s3_client = boto3.client('s3')
            bucket = os.getenv("S3_WORKSPACE_BUCKET", "default-workspace-bucket")
            response = s3_client.list_objects_v2(Bucket=bucket, Prefix="workspace/")
            
            if "Contents" not in response:
                return {"files": []}
                
            s3_keys = [obj["Key"] for obj in response["Contents"]]
            
            # Reconstruct tree from flat S3 keys
            root = {}
            for key in s3_keys:
                # Remove 'workspace/' prefix
                relative_path = key.replace("workspace/", "", 1)
                if not relative_path or relative_path.endswith('/'):
                    continue
                    
                parts = relative_path.split("/")
                current = root
                current_path = ""
                
                for i, part in enumerate(parts):
                    current_path = os.path.join(current_path, part) if current_path else part
                    is_file = (i == len(parts) - 1)
                    
                    if part not in current:
                        current[part] = {
                            "name": part,
                            "path": current_path,
                            "type": "file" if is_file else "folder",
                            "children": {} if not is_file else None
                        }
                    if not is_file:
                        current = current[part]["children"]
                        
            def format_tree(node):
                result = []
                for k, v in node.items():
                    if v["type"] == "folder":
                        v["children"] = format_tree(v["children"])
                    result.append(v)
                return sorted(result, key=lambda x: (x["type"] != "folder", x["name"]))
                
            return {"files": format_tree(root)}
            
        except Exception as e:
            print(f"Error fetching workspace from S3: {e}")
            return {"files": []}
            
    else:
        # Local filesystem workspace retrieval
        workspace_dir = os.path.join(os.getcwd(), "workspace")
        if not os.path.exists(workspace_dir):
            return {"files": []}
            
        def build_tree(path):
            tree = []
            for item in os.listdir(path):
                item_path = os.path.join(path, item)
                rel_path = os.path.relpath(item_path, workspace_dir)
                if os.path.isdir(item_path):
                    if item in [".pytest_cache", "__pycache__"]:
                        continue
                    tree.append({
                        "name": item,
                        "path": rel_path,
                        "type": "folder",
                        "children": build_tree(item_path)
                    })
                else:
                    tree.append({
                        "name": item,
                        "path": rel_path,
                        "type": "file"
                    })
            return sorted(tree, key=lambda x: (x["type"] != "folder", x["name"]))
            
        return {"files": build_tree(workspace_dir)}

@app.get("/api/workspace/file")
def get_file_content(path: str):
    is_aws = os.getenv("DEPLOYMENT_ENV") == "AWS"
    
    if is_aws:
        # Fetch file from S3
        try:
            s3_client = boto3.client('s3')
            bucket = os.getenv("S3_WORKSPACE_BUCKET", "default-workspace-bucket")
            clean_path = os.path.normpath(path).lstrip("/")
            s3_key = f"workspace/{clean_path}"
            
            response = s3_client.get_object(Bucket=bucket, Key=s3_key)
            content = response["Body"].read().decode("utf-8")
            return {"content": content}
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"File not found in S3: {str(e)}")
    else:
        # Fetch file locally
        workspace_dir = os.path.join(os.getcwd(), "workspace")
        target_path = os.path.abspath(os.path.join(workspace_dir, path))
        
        if not target_path.startswith(workspace_dir):
            raise HTTPException(status_code=403, detail="Access denied")
            
        if not os.path.exists(target_path):
            raise HTTPException(status_code=404, detail="File not found")
            
        try:
            with open(target_path, "r", encoding="utf-8") as f:
                return {"content": f.read()}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


