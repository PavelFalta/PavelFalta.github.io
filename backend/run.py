import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    
    print(f"Starting Traffic Light API on http://{host}:{port}")
    uvicorn.run("app.main:app", host=host, port=port, reload=True) 