# BMC Tool Configuration

## Backend Server Configuration

To configure the backend server URL for your BMC Tool, follow these simple steps:

### 1. Locate the Configuration File

Open the file: `html/js/config.js`

### 2. Update the Backend URL

Find this line in the config file:
```javascript
BACKEND_URL: 'http://localhost:8000',
```

Replace `http://localhost:8000` with your actual backend server URL.

### Examples:

**Local Development:**
```javascript
BACKEND_URL: 'http://localhost:8000',
```

**Production Server:**
```javascript
BACKEND_URL: 'https://your-domain.com',
```

**Different Port:**
```javascript
BACKEND_URL: 'http://localhost:3000',
```

**IP Address:**
```javascript
BACKEND_URL: 'http://192.168.1.100:8000',
```

### 3. Save and Reload

1. Save the `config.js` file
2. Refresh your browser to load the new configuration

### Notes:

- Make sure your backend server is running and accessible at the configured URL
- The frontend will automatically construct the API endpoints (`/api/healthcheck` and `/api/chat`) based on your base URL
- If you're serving the frontend and backend from different domains, ensure CORS is properly configured on your backend server

### Troubleshooting:

- If the chat doesn't work after changing the URL, check the browser's developer console for error messages
- Verify that your backend server is running and accessible at the new URL
- Make sure there are no trailing slashes in your BACKEND_URL 