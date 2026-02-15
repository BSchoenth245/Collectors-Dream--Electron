// Configuration for API URL
// Automatically detects environment and uses correct server
// Works for: Desktop App, Web App, Local Development

const config = {
    API_URL: (() => {
        // Check if we're in a browser environment
        if (typeof window !== 'undefined' && window.location) {
            const hostname = window.location.hostname;
            
            // Local development or desktop app pointing to local server
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                return 'http://127.0.0.1:8000';
            }
            
            // Production web app - use whatever domain/IP the user is visiting
            return `http://${hostname}:8000`;
        }
        
        // Fallback for Node.js environments (shouldn't normally be used)
        return 'http://127.0.0.1:8000';
    })()
};

// Make config available globally in browser
if (typeof window !== 'undefined') {
    window.APP_CONFIG = config;
}

// For Node.js environments (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
}