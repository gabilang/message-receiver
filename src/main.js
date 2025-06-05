/**
 * Web App B - Token Receiver
 * Main Entry Point
 * 
 * Current Date: 2025-06-05 02:52:47 UTC
 * User: gabilang
 */
import TokenStorage from './token-storage';
import SecureCommunication from './secure-comm';

// Initialize the application
function initializeApp() {
  console.log('Initializing Web App B at:', '2025-06-05 02:52:47 UTC');
  
  const tokenStorage = new TokenStorage({
    debug: true
  });
  
  // Create and initialize the secure communication manager
  const secureComm = new SecureCommunication({
    senderOrigin: 'http://localhost:3002',
    tokenStorage,
    debug: true
  })
  .init()
  .onTokensReceived((tokens, metadata) => {
    console.log('Tokens received in app initialization', metadata);
    
    // Here you would initialize your application with the received tokens
    // For example, set up API clients, auth state, etc.
    
    // Example: Update application state
    document.body.classList.add('authenticated');
  });
  
  // Clean up before page unload
  window.addEventListener('beforeunload', () => {
    secureComm.disconnect();
  });
  
  // Parse query parameters to check if this is a valid authentication flow
  const queryParams = getQueryParams();
  if (queryParams.source !== 'webapp-a' || !window.opener) {
    updateStatus('Error: Invalid authentication flow', 'error');
  }
  
  console.log('Web App B initialized successfully');
}

// Helper: Parse query parameters
function getQueryParams() {
  const params = {};
  const queryString = window.location.search.substring(1);
  const pairs = queryString.split('&');
  
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i].split('=');
    params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
  }
  
  return params;
}

// Helper: Update status display
function updateStatus(message, type = 'pending') {
  const statusContainer = document.getElementById('statusContainer');
  const statusMessage = document.getElementById('statusMessage');
  
  if (statusContainer && statusMessage) {
    statusContainer.className = `status ${type}`;
    statusMessage.textContent = message;
  }
  
  console.log(`[WebApp B] ${message}`);
}

// Initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
