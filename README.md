# Traffic Light Application

A real-time traffic light application where users can connect to the same session and see each other's selections in real-time.

## Features

- Create traffic light sessions with unique URLs
- Real-time updates using WebSockets
- Modern UI with React, TypeScript, and Tailwind CSS
- FastAPI backend with in-memory storage (no database required)
- See how many users are on each traffic light color in real-time
- QR code generation for easy sharing on mobile devices

## Project Structure

- `frontend/`: React frontend application
- `backend/`: FastAPI backend application

## Getting Started

### Local Development (Without Docker)

#### Backend

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Start the backend server:
   ```
   python run.py
   ```

The backend will be available at http://localhost:8000

#### Frontend

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

The frontend will be available at http://localhost:5173

### Docker Deployment

This project includes Docker configuration for easy development and testing.

#### Using the start script

The easiest way to run the application is using the provided script:

1. Make the script executable (if not already):
   ```
   chmod +x start.sh
   ```

2. Start the application:
   ```
   ./start.sh up
   ```

3. To stop the application:
   ```
   ./start.sh down
   ```

#### Manual Docker commands

Alternatively, you can use Docker Compose directly:

1. Build and start the containers:
   ```
   docker-compose up -d
   ```

2. Stop the containers:
   ```
   docker-compose down
   ```

Once running, access the application at:
- Frontend: http://localhost
- Backend API: http://localhost:8000

## How to Use

1. Open the application in your browser
2. Click on the "Start" button to create a new session
3. Share the generated URL with others
4. Click on any of the traffic lights to switch your selection
5. Watch the counts update in real-time as others join and make selections

## Technologies

- **Frontend**: React, TypeScript, Tailwind CSS, WebSockets
- **Backend**: FastAPI, Uvicorn, WebSockets
- **Deployment**: Docker, Nginx 