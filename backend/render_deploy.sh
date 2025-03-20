#!/bin/bash

# Simple script to prepare backend for Render deployment

echo "Preparing backend for Render deployment..."

# Create a Procfile for Render (if not exists)
if [ ! -f "Procfile" ]; then
  echo "web: cd app && uvicorn main:app --host 0.0.0.0 --port \$PORT" > Procfile
  echo "Created Procfile"
fi

# Make sure requirements.txt is up to date
if [ ! -f "requirements.txt" ]; then
  echo "Creating requirements.txt..."
  pip freeze > requirements.txt
  echo "Created requirements.txt"
else
  echo "requirements.txt already exists"
fi

# Add .env.sample file for reference
if [ ! -f ".env.sample" ]; then
  echo "Creating .env.sample..."
  echo "# Sample environment variables for deployment" > .env.sample
  echo "FRONTEND_URL=https://pavelfalta.github.io" >> .env.sample
  echo "PORT=10000" >> .env.sample
  echo "Created .env.sample"
fi

echo "Backend is ready for deployment to Render!"
echo ""
echo "To deploy to Render:"
echo "1. Push these changes to your GitHub repository"
echo "2. Create a new Web Service on Render.com"
echo "3. Connect your GitHub repository"
echo "4. Set the following configuration:"
echo "   - Build Command: pip install -r requirements.txt"
echo "   - Start Command: uvicorn app.main:app --host 0.0.0.0 --port \$PORT"
echo "   - Environment Variables:"
echo "     - FRONTEND_URL=https://pavelfalta.github.io"
echo "     - PORT=10000"
echo ""
echo "Done!" 