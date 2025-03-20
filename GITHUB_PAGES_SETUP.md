# GitHub Pages Deployment Guide

## Fixed Issues

We've fixed the following issues with the GitHub Pages deployment:

1. **Fixed Absolute Paths**: Modified asset paths in the built `index.html` to use relative paths (with `./` prefix) instead of absolute paths.

2. **Fixed Base URL Configuration**: Updated the Vite configuration to use the correct repository name `/traffic-light/` as the base path.

3. **Updated Frontend URLs in Backend**: Added `https://pavelfalta.github.io` to the allowed origins in `main.py`.

4. **Added SPA Support Files**: Added proper 404.html file and SPA redirect script to make React Router work correctly with GitHub Pages.

5. **Created .nojekyll file**: Prevents GitHub Pages from processing the site with Jekyll, which can interfere with React apps.

## Deployment Process

The application has been successfully deployed to GitHub Pages:

1. **Frontend**: Deployed to GitHub Pages using:
   ```
   npm run deploy
   ```

2. **Backend**: Prepared for Render deployment with a helper script:
   ```
   cd backend
   ./render_deploy.sh
   ```

## What's Working

- The frontend is now deployed at https://pavelfalta.github.io/traffic-light/
- GitHub Pages is serving the SPA correctly with React Router
- Assets (JavaScript, CSS, images) are loading with the correct paths

## Next Steps

1. **Deploy Backend to Render**:
   - Push changes to GitHub
   - Create a new Web Service on Render.com
   - Connect your GitHub repository
   - Set the configurations as specified in `render_deploy.sh`

2. **Test Full Application**:
   - Once both frontend and backend are deployed, test the WebSocket connections
   - Ensure all features are working correctly in production

## Troubleshooting

If you encounter any issues:

1. **Check Browser Console**: Look for any 404 errors or CORS issues
2. **Check Network Tab**: Ensure all assets are loading correctly
3. **Verify CORS Settings**: Make sure the backend is allowing requests from your GitHub Pages domain
4. **Check WebSocket Connections**: The WebSocket URL should be using `wss://` protocol and pointing to your Render deployment

## Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [React Router and GitHub Pages](https://create-react-app.dev/docs/deployment/#github-pages)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html#github-pages)
- [Render Deployment Documentation](https://render.com/docs/deploy-node-express-app) 