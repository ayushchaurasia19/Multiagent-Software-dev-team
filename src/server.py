import os
from dotenv import load_dotenv
load_dotenv()

import json
import shutil
import asyncio
import io
import contextlib
import sys
import uuid
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

active_run = {
    "queue": None,
    "is_running": False,
    "thread_id": None
}

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

async def run_workflow_task(inputs, thread_id):
    active_run["is_running"] = True
    active_run["queue"] = asyncio.Queue()
    active_run["thread_id"] = thread_id
    
    config = {"configurable": {"thread_id": thread_id}}
    main_loop = asyncio.get_running_loop()
    
    class QueueWriter:
        def write(self, message):
            if message and message.strip():
                main_loop.call_soon_threadsafe(
                    active_run["queue"].put_nowait, 
                    {"type": "log", "content": message.strip()}
                )
            sys.__stdout__.write(message)
            
        def flush(self):
            sys.__stdout__.flush()
            
    original_stdout = sys.stdout
    sys.stdout = QueueWriter()
    
    try:
        # Stream all fine-grained events (version v2 required for LangChain >= 0.2.0)
        async for event in workflow_app.astream_events(inputs, config=config, version="v2"):
            # Filter non-serializable data
            safe_event = {
                "event": event["event"],
                "name": event["name"],
                "run_id": event["run_id"],
                "tags": event.get("tags", []),
                "data": filter_event_data(event.get("data", {}))
            }
            
            await active_run["queue"].put({
                "type": "trace",
                "content": safe_event
            })
            
            # Send node update manually since astream_events doesn't wrap node_updates cleanly
            if event["event"] == "on_chain_end" and not event["name"].startswith("LangGraph"):
                # If it's a node finishing
                if "output" in event.get("data", {}) and isinstance(event["data"]["output"], dict):
                     await active_run["queue"].put({
                        "type": "node_update",
                        "node": event["name"],
                        "state": filter_event_data(event["data"]["output"])
                    })
                    
        await active_run["queue"].put({"type": "done", "thread_id": thread_id})
    except Exception as e:
        await active_run["queue"].put({"type": "error", "message": str(e), "thread_id": thread_id})
    finally:
        sys.stdout = original_stdout
        active_run["is_running"] = False

@app.post("/api/run")
async def run_workflow(req: RunRequest):
    if active_run["is_running"]:
        raise HTTPException(status_code=400, detail="A workflow is already running")
        
    workspace_dir = os.path.join(os.getcwd(), "workspace")
    if os.path.exists(workspace_dir):
        shutil.rmtree(workspace_dir)
    os.makedirs(workspace_dir, exist_ok=True)
    
    inputs = {
        "requirements": req.requirements,
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
    
    thread_id = str(uuid.uuid4())
    asyncio.create_task(run_workflow_task(inputs, thread_id))
    
    return {"status": "started", "thread_id": thread_id}

@app.post("/api/resume")
async def resume_workflow(req: ResumeRequest):
    if active_run["is_running"]:
        raise HTTPException(status_code=400, detail="A workflow is already running")
    
    # Passing None as inputs tells LangGraph to resume from the last checkpoint
    asyncio.create_task(run_workflow_task(None, req.thread_id))
    return {"status": "resumed", "thread_id": req.thread_id}

@app.get("/api/stream")
async def stream_logs(request: Request):
    async def event_generator():
        queue = active_run["queue"]
        if not queue:
            yield f"data: {json.dumps({'type': 'idle'})}\n\n"
            return
            
        while True:
            if await request.is_disconnected():
                break
            try:
                event = await asyncio.wait_for(queue.get(), timeout=1.0)
                yield f"data: {json.dumps(event)}\n\n"
                if event["type"] in ["done", "error"]:
                    break
            except asyncio.TimeoutError:
                yield ": keepalive\n\n"
                
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/api/workspace")
def get_workspace():
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
