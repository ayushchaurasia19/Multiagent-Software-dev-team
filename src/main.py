import os
import shutil
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
        "requirements": "Build a simple library management system with books and users. Create a models.py for the database schema, an api.py for the routes, and a README.md explaining the system.",
        "tasks": [],
        "code": "",
        "review_status": "",
        "review_feedback": [],
        "review_count": 0,
        "messages": [],
        "agent_messages": []
    }
    
    print(f"\n--- Starting Workflow Execution ---")
    print(f"Goal: {inputs['requirements']}")
    
    try:
        # Run the compiled workflow
        final_state = app.invoke(inputs)
        
        print("\n--- Planner Output (Tasks) ---")
        for idx, task in enumerate(final_state.get("tasks", [])):
            print(f"{idx+1}. {task}")
            
        print("\n--- Reviewer Status & Feedback ---")
        status = final_state.get("review_status", "N/A")
        count = final_state.get("review_count", 0)
        print(f"Final Status: {status}")
        print(f"Total Review Cycles: {count}")
        feedback = final_state.get("review_feedback", [])
        if feedback:
            print("Issues identified by Reviewer:")
            for idx, issue in enumerate(feedback):
                print(f" {idx+1}. {issue}")
        else:
            print("No issues identified by Reviewer (Approved!).")
            
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
