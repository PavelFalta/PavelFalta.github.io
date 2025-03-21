from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uuid
import random
import string
from typing import Dict, List, Set
import json
import os
from dotenv import load_dotenv
import asyncio
import time
from datetime import datetime, timedelta


load_dotenv()

app = FastAPI(
    title="Traffic Light API",
    description="A FastAPI backend for the Traffic Light real-time application",
    version="1.0.0"
)

# Track last activity time
last_activity_time = datetime.now()

def update_activity():
    global last_activity_time
    last_activity_time = datetime.now()

frontend_url = os.getenv("FRONTEND_URL", "http://localhost")
frontend_urls = [
    frontend_url,
    "http://localhost:5173",  
    "http://localhost",        
    "https://pavelfalta.github.io"  
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now - you can restrict this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


sessions: Dict[str, Dict] = {}
connections: Dict[str, List[WebSocket]] = {}

inactive_sessions: Dict[str, datetime] = {}


def generate_short_id(length=8):
    
    chars = string.ascii_lowercase + '23456789'
    while True:
        
        session_id = ''.join(random.choice(chars) for _ in range(length))
        
        if session_id not in sessions:
            return session_id

@app.get("/")
async def read_root():
    return {"message": "Traffic Light API"}

@app.post("/create-session")
async def create_session():
    
    session_id = generate_short_id()
    sessions[session_id] = {
        "lights": {
            "red": 0,
            "yellow": 0,
            "green": 0  
        }
    }
    connections[session_id] = []
    
    return {"session_id": session_id, "url": f"/traffic-light/{session_id}"}

@app.get("/session/{session_id}")
async def get_session(session_id: str):
    if session_id not in sessions:
        return {"error": "Session not found"}
    
    return sessions[session_id]

@app.get("/list-sessions")
async def list_sessions():
    # Prepare a list of sessions with user counts
    session_list = []
    
    for session_id, session_data in sessions.items():
        # Skip sessions that are marked as inactive
        if session_id in inactive_sessions:
            continue
            
        # Calculate total users in this session
        total_users = sum(session_data["lights"].values())
        
        # Only include sessions with at least one user
        if total_users > 0:
            session_list.append({
                "session_id": session_id,
                "user_count": total_users
            })
    
    # Sort sessions by user count (descending)
    sorted_sessions = sorted(session_list, key=lambda x: x["user_count"], reverse=True)
    
    return {"sessions": sorted_sessions}

@app.get("/heartbeat")
async def heartbeat():
    """Endpoint to keep the server alive when there are active WebSocket connections"""
    update_activity()
    return {"status": "alive", "last_activity": last_activity_time.isoformat()}

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    update_activity()  # Track WebSocket connection as activity
    
    if session_id not in sessions:
        await websocket.close(code=1000, reason="Session not found")
        return
    
    # Add or initialize connection list for this session
    if session_id not in connections:
        connections[session_id] = []
    
    # Store this websocket connection so we can track it
    connections[session_id].append(websocket)
    
    # Remove from inactive sessions if it was marked as inactive
    if session_id in inactive_sessions:
        del inactive_sessions[session_id]
    
    # Set default light selection without incrementing the counter yet
    # We'll only increment once we're sure this is a unique connection
    user_light = "green"
    
    # Check if this is a unique connection before incrementing
    if len(connections[session_id]) == 1 or all(conn != websocket for conn in connections[session_id][:-1]):
        # This is a new unique connection, so increment the counter
        sessions[session_id]["lights"][user_light] += 1
        # Track that this connection has incremented a counter
        setattr(websocket, "has_incremented", True)
        setattr(websocket, "current_light", user_light)
    
    # Broadcast the update to all clients
    await broadcast_update(session_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("type") == "select_light" and "light" in message:
                    new_light = message["light"]
                    if new_light in ["red", "yellow", "green"] and new_light != user_light:
                        # Only update counts if this connection has incremented a counter
                        if hasattr(websocket, "has_incremented") and websocket.has_incremented:
                            sessions[session_id]["lights"][user_light] -= 1
                            sessions[session_id]["lights"][new_light] += 1
                            
                        # Update the user's current light selection
                        user_light = new_light
                        if hasattr(websocket, "current_light"):
                            websocket.current_light = new_light
                        
                        # Broadcast the update to all clients
                        await broadcast_update(session_id)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        # Only update counts if this connection has incremented a counter
        if hasattr(websocket, "has_incremented") and websocket.has_incremented:
            current_light = getattr(websocket, "current_light", user_light)
            sessions[session_id]["lights"][current_light] -= 1
        
        # Remove this websocket from the connections list
        if websocket in connections[session_id]:
            connections[session_id].remove(websocket)
        
        # Check if session is now empty
        total_users = sum(sessions[session_id]["lights"].values())
        if total_users == 0:
            # Mark session as inactive for future cleanup
            inactive_sessions[session_id] = datetime.now()
        
        # Broadcast the update to remaining clients
        await broadcast_update(session_id)

async def broadcast_update(session_id: str):
    if session_id in connections:
        message = json.dumps({
            "type": "update",
            "data": sessions[session_id]
        })
        
        
        for connection in connections[session_id]:
            try:
                await connection.send_text(message)
            except:
                pass


async def cleanup_inactive_sessions():
    while True:
        try:
            now = datetime.now()
            
            session_ids = list(inactive_sessions.keys())
            
            for session_id in session_ids:
                if session_id in inactive_sessions:
                    inactive_time = inactive_sessions[session_id]
                    
                    if now - inactive_time > timedelta(hours=1):
                        
                        if session_id in sessions:
                            del sessions[session_id]
                        if session_id in connections:
                            del connections[session_id]
                        del inactive_sessions[session_id]
                        print(f"Cleaned up inactive session: {session_id}")
        except Exception as e:
            print(f"Error in cleanup task: {e}")
            
        
        await asyncio.sleep(600)


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(cleanup_inactive_sessions()) 