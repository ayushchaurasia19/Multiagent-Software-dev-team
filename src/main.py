import os
import shutil
from dotenv import load_dotenv
load_dotenv()
from src.graph.workflow import create_workflow

def run():
    print("Initializing Multi-Agent Workflow...")
    app = create_workflow()
    
    workspace_dir = os.path.join(os.getcwd(), "workspace")
    if os.path.exists(workspace_dir):
        print("Clearing previous workspace...")
        shutil.rmtree(workspace_dir)
    os.makedirs(workspace_dir, exist_ok=True)
    
    # Initial state payload
    inputs = {
        "requirements": "Build a simple library management web app. Create a backend API with FastAPI (api.py) and a frontend HTML file (index.html) that fetches from the API.",
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
    
    print(f"\n--- Starting Workflow Execution ---")
    print(f"Goal: {inputs['requirements']}")
    
    try:
        # Run the compiled workflow
        final_state = app.invoke(inputs)
        
        print("\n--- Planner Output ---")
        print("Backend Tasks:")
        for idx, task in enumerate(final_state.get("backend_tasks", [])):
            print(f"  {idx+1}. {task}")
        print("Frontend Tasks:")
        for idx, task in enumerate(final_state.get("frontend_tasks", [])):
            print(f"  {idx+1}. {task}")
            
        print("\n--- Reviewer Status & Feedback ---")
        status = final_state.get("review_status", "N/A")
        count = final_state.get("review_count", 0)
        print(f"Final Status: {status}")
        print(f"Total Review Cycles: {count}")
        feedback = final_state.get("review_feedback", [])
        if feedback:
            print("Issues identified by Reviewer/Tester:")
            for idx, issue in enumerate(feedback):
                print(f" {idx+1}. {issue}")
        else:
            print("No issues identified by Reviewer/Tester (Approved!).")
            
        print("\n--- Tester Report Summary ---")
        report = final_state.get("test_report", "No report generated.")
        print(report)
            
        print("\n--- Generated Files in Workspace ---")
        for root, dirs, files in os.walk(workspace_dir):
            for file in files:
                rel_dir = os.path.relpath(root, workspace_dir)
                if rel_dir == ".":
                    print(f"- {file}")
                else:
                    print(f"- {os.path.join(rel_dir, file)}")
        
        print("\n--- Workflow Messages ---")
        for msg in final_state.get("messages", []):
            print(f"[*] {msg}")
        
    except Exception as e:
        print(f"Error during execution: {e}")

if __name__ == "__main__":
    run()
