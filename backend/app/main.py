from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
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

# Track last activity time per session
session_activity: Dict[str, datetime] = {}

# Track client IDs per session to prevent duplicates
session_clients: Dict[str, Dict[str, WebSocket]] = {}

def update_session_activity(session_id: str):
    session_activity[session_id] = datetime.now()

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
    """Simple endpoint to keep the server alive"""
    return {"status": "alive", "timestamp": datetime.now().isoformat()}

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    session_id: str, 
    client_id: str = Query(None)
):
    await websocket.accept()
    
    if session_id not in sessions:
        await websocket.close(code=1000, reason="Session not found")
        return
    
    # Check if client_id was provided
    if not client_id:
        await websocket.close(code=1000, reason="Client ID is required")
        return

    # Initialize client tracking for this session if it doesn't exist
    if session_id not in session_clients:
        session_clients[session_id] = {}
    
    # Check if this client already has a connection in this session
    previous_connection = session_clients[session_id].get(client_id)
    if previous_connection:
        try:
            # Get the current light from the previous connection
            current_light = None
            if hasattr(previous_connection, "current_light"):
                current_light = getattr(previous_connection, "current_light")
            
            # Try to close the previous connection
            await previous_connection.close(code=1000, reason="New connection from same client")
            print(f"Closed previous connection for client {client_id} in session {session_id}")
            
            # Find and remove the previous connection from connections list
            if session_id in connections and previous_connection in connections[session_id]:
                connections[session_id].remove(previous_connection)
                
                # If this connection had incremented a counter, decrement it
                if hasattr(previous_connection, "has_incremented") and previous_connection.has_incremented:
                    if current_light and current_light in ["red", "yellow", "green"]:
                        # Ensure we don't go below zero
                        sessions[session_id]["lights"][current_light] = max(0, sessions[session_id]["lights"][current_light] - 1)
        except Exception as e:
            print(f"Error closing previous connection: {e}")
    
    # Store this client's connection
    session_clients[session_id][client_id] = websocket
    
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
    
    # This is a new unique connection from this client, so increment the counter
    sessions[session_id]["lights"][user_light] += 1
    # Track that this connection has incremented a counter
    setattr(websocket, "has_incremented", True)
    setattr(websocket, "current_light", user_light)
    setattr(websocket, "client_id", client_id)
    
    # Broadcast the update to all clients
    await broadcast_update(session_id)
    
    try:
        while True:
            try:
                data = await websocket.receive_text()
                try:
                    message = json.loads(data)
                    if message.get("type") == "select_light" and "light" in message:
                        new_light = message["light"]
                        # Ensure the light selection is valid
                        if new_light in ["red", "yellow", "green"] and new_light != user_light:
                            # Only update counts if this connection has incremented a counter
                            if hasattr(websocket, "has_incremented") and websocket.has_incremented:
                                # Ensure we don't decrement below zero
                                sessions[session_id]["lights"][user_light] = max(0, sessions[session_id]["lights"][user_light] - 1)
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
                break
            except Exception as e:
                print(f"Error handling WebSocket message: {e}")
                break
    finally:
        # Cleanup code that runs whether there's an error or normal disconnect
        
        # Only update counts if this connection has incremented a counter
        if hasattr(websocket, "has_incremented") and websocket.has_incremented:
            current_light = getattr(websocket, "current_light", user_light)
            if current_light in ["red", "yellow", "green"]:
                # Ensure we don't go below zero
                sessions[session_id]["lights"][current_light] = max(0, sessions[session_id]["lights"][current_light] - 1)
        
        # Remove this websocket from the connections list
        if websocket in connections[session_id]:
            connections[session_id].remove(websocket)
        
        # Remove from client tracking if this is still the active connection for this client
        client_id = getattr(websocket, "client_id", None)
        if client_id and session_id in session_clients and session_clients[session_id].get(client_id) == websocket:
            del session_clients[session_id][client_id]
        
        # Check if session is now empty
        total_users = sum(sessions[session_id]["lights"].values())
        if total_users == 0:
            # Mark session as inactive for future cleanup
            inactive_sessions[session_id] = datetime.now()
        
        try:
            # Broadcast the update to remaining clients
            await broadcast_update(session_id)
        except Exception as e:
            print(f"Error in final broadcast: {e}")

async def broadcast_update(session_id: str):
    if session_id in connections:
        # Ensure all light counts are non-negative
        for light in sessions[session_id]["lights"]:
            sessions[session_id]["lights"][light] = max(0, sessions[session_id]["lights"][light])
        
        message = json.dumps({
            "type": "update",
            "data": sessions[session_id]
        })
        
        # Create a list of connections to remove
        to_remove = []
        
        for connection in connections[session_id]:
            try:
                # Only send to connections in OPEN state
                if hasattr(connection, '_protocol') and connection._protocol:
                    await connection.send_text(message)
                else:
                    # Connection is no longer valid, mark for removal
                    to_remove.append(connection)
            except Exception as e:
                print(f"Failed to send to a client, will remove connection: {e}")
                to_remove.append(connection)
        
        # Remove dead connections
        for connection in to_remove:
            if connection in connections[session_id]:
                connections[session_id].remove(connection)
                
                # If this connection had incremented a counter, reduce the count
                if hasattr(connection, "has_incremented") and connection.has_incremented:
                    current_light = getattr(connection, "current_light", "green")
                    if current_light in ["red", "yellow", "green"]:
                        # Ensure we don't go below zero
                        sessions[session_id]["lights"][current_light] = max(0, sessions[session_id]["lights"][current_light] - 1)
                
                # Remove from client tracking
                client_id = getattr(connection, "client_id", None)
                if client_id and session_id in session_clients and session_clients[session_id].get(client_id) == connection:
                    del session_clients[session_id][client_id]


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