# Traffic Light App Deployment Guide

This guide provides detailed instructions for deploying the Traffic Light application to GitHub Pages (frontend) and Render (backend).

## 1. Preparing for Deployment

### Set Up GitHub Repository

1. Create a GitHub repository named `traffic-light`
2. Push your code to the repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/traffic-light.git
   git push -u origin main
   ```

## 2. Deploy Backend to Render

1. **Create a Render Account**:
   - Sign up at [render.com](https://render.com/)

2. **Create a Web Service**:
   - From your Render dashboard, click "New" and select "Web Service"
   - Connect to your GitHub repository (or enter the URL manually)

3. **Configure the Service**:
   - **Name**: `traffic-light-backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python run.py`
   - **Root Directory**: `/backend` (if your repo contains both frontend and backend)

4. **Add Environment Variables**:
   - Click "Environment" tab and add:
     - `FRONTEND_URL=https://YOUR_USERNAME.github.io`
     - `PORT=10000` (Render will use its own port, but this is for local development)

5. **Deploy the Service**:
   - Click "Create Web Service"
   - Wait for the deployment to complete (this may take a few minutes)
   - Note your service URL (e.g., `https://traffic-light-backend.onrender.com`)

## 3. Deploy Frontend to GitHub Pages

1. **Update Environment Configuration**:
   - Edit `frontend/.env.production`:
     ```
     VITE_API_URL=https://your-render-backend-url.onrender.com
     VITE_WS_PROTOCOL=wss
     ```

2. **Update Vite Configuration**:
   - Edit `frontend/vite.config.ts`:
     ```javascript
     // Set this to true when deploying to GitHub Pages
     const isGitHubPages = true
     ```

3. **Install gh-pages Package** (if not already installed):
   ```bash
   cd frontend
   npm install --save-dev gh-pages
   ```

4. **Build and Deploy**:
   ```bash
   cd frontend
   npm run deploy
   ```

5. **Configure GitHub Pages**:
   - Go to your GitHub repository
   - Navigate to Settings > Pages
   - Source: Deploy from a branch
   - Branch: gh-pages
   - Click Save

6. **Verify Deployment**:
   - Your site should be available at `https://YOUR_USERNAME.github.io/traffic-light/`
   - It may take a few minutes for the site to become available

## 4. Troubleshooting

### WebSocket Connection Issues

If you're experiencing WebSocket connection issues:

1. **Check CORS Configuration**:
   - Make sure your backend's CORS settings allow your GitHub Pages domain

2. **Verify Protocols**:
   - HTTPS frontend must use WSS protocol for WebSockets

3. **Check Console for Errors**:
   - Browser dev tools will show any connection errors

### Render Free Tier Limitations

The free tier on Render spins down after periods of inactivity:

- Initial connections may be slow as the service spins up
- For production use, consider upgrading to a paid tier

## 5. Updating Your Deployment

When making changes to your application:

1. **For Backend Updates**:
   - Push changes to your GitHub repository
   - Render will automatically redeploy

2. **For Frontend Updates**:
   - Make your changes
   - Run `npm run deploy` from the frontend directory
   - This will push changes to the gh-pages branch

## 6. Custom Domain (Optional)

For a more professional appearance:

1. **GitHub Pages Custom Domain**:
   - Settings > Pages > Custom domain
   - Add your domain and configure DNS settings

2. **Render Custom Domain**:
   - Go to your service dashboard
   - Settings > Custom Domain
   - Follow the instructions to configure your domain

---

If you encounter any issues with this deployment process, please refer to the [GitHub Pages documentation](https://docs.github.com/en/pages) or [Render documentation](https://render.com/docs) for detailed guidance. 