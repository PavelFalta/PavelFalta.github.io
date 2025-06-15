// Configuration file for the BMC Tool
// Modify the BACKEND_URL below to point to your backend server

const CONFIG = {
    // Backend server configuration
    BACKEND_URL: 'http://localhost:8000',
    
    // API endpoints (automatically constructed from BACKEND_URL)
    get API_HEALTHCHECK() {
        return `${this.BACKEND_URL}/api/healthcheck`;
    },
    
    get API_CHAT() {
        return `${this.BACKEND_URL}/api/chat`;
    }
};

// Make config globally available
window.CONFIG = CONFIG; 