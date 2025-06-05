/**
 * Secure Communication Manager for Web App B
 * Handles secure postMessage communication with Web App A
 * 
 * Current Date: 2025-06-05 02:52:47 UTC
 * User: gabilang
 */
export default class SecureCommunication {
  constructor(options = {}) {
    this.config = {
      senderOrigin: 'http://localhost:3002',
      debug: false,
      ...options
    };
    
    this.sourceWindow = null;
    this.handshakeComplete = false;
    this.connectionStatus = 'disconnected';
    this.tokenStorage = options.tokenStorage;
    
    // Bind methods
    this.handleMessage = this.handleMessage.bind(this);
    this.initiateHandshake = this.initiateHandshake.bind(this);
  }
  
  /**
   * Initialize the communication manager
   */
  init() {
    // Set up message listener
    window.addEventListener('message', this.handleMessage, false);
    
    if (this.config.debug) {
      console.log('[WebApp B] Secure communication manager initialized');
    }
    
    // Automatically initiate handshake on init
    setTimeout(this.initiateHandshake, 1000); // Short delay to ensure everything is loaded
    
    return this;
  }
  
  /**
   * Register a callback for when tokens are received
   */
  onTokensReceived(callback) {
    this.tokensReceivedCallback = callback;
    return this;
  }
  
  /**
   * Set token storage
   */
  setTokenStorage(tokenStorage) {
    this.tokenStorage = tokenStorage;
    return this;
  }
  
  /**
   * Initiate handshake with Web App A
   */
  initiateHandshake() {
    if (!window.opener) {
      this._updateStatus('Error: Cannot establish connection to parent window', 'error');
      return false;
    }
    
    // Create a handshake request
    const requestId = this._generateId();
    const handshakeRequest = {
      type: 'HANDSHAKE_REQUEST',
      requestId,
      data: {
        timestamp: new Date().toISOString(),
        receiver: window.location.origin
      }
    };
    
    // Send the handshake request to Web App A
    try {
      window.opener.postMessage(handshakeRequest, this.config.senderOrigin);
      this._updateStatus('Handshake initiated with Web App A', 'pending');
      
      // Set a timeout for the handshake
      setTimeout(() => {
        if (!this.handshakeComplete) {
          this._updateStatus('Handshake timed out. Please try again.', 'error');
        }
      }, 30000); // 30 second timeout
      
      return true;
    } catch (error) {
      if (this.config.debug) {
        console.error('[WebApp B] Error initiating handshake:', error);
      }
      this._updateStatus('Error establishing connection to Web App A', 'error');
      return false;
    }
  }
  
  /**
   * Clean up resources
   */
  disconnect() {
    window.removeEventListener('message', this.handleMessage);
    this.sourceWindow = null;
    this.handshakeComplete = false;
    this.connectionStatus = 'disconnected';
    
    if (this.config.debug) {
      console.log('[WebApp B] Communication manager disconnected');
    }
    
    return this;
  }
  
  /**
   * Handle incoming messages
   * @private
   */
  handleMessage(event) {
    // Always verify origin
    if (event.origin !== this.config.senderOrigin) {
      if (this.config.debug) {
        console.warn(`[WebApp B] Rejected message from unauthorized origin: ${event.origin}`);
      }
      return;
    }

    const message = event.data;
    
    // Basic message validation
    if (!message || !message.type) {
      return;
    }
    
    // Validate message (except for handshake response which validates later)
    if (message.type !== 'HANDSHAKE_RESPONSE' && !this._isMessageValid(message)) {
      return;
    }
    
    if (this.config.debug) {
      console.log(`[WebApp B] Received message: ${message.type}`);
    }
    
    switch (message.type) {
      case 'HANDSHAKE_RESPONSE':
        // Web App A acknowledged our handshake
        this.handshakeComplete = true;
        this.connectionStatus = 'connected';
        this.sourceWindow = event.source;
        
        this._updateStatus('Connected to Web App A and waiting for tokens...', 'pending');
        break;
        
      case 'TOKEN_TRANSFER':
        // Process and store the received tokens
        if (!this.handshakeComplete) {
          this._updateStatus('Security error: Received tokens before handshake completion', 'error');
          return;
        }
        
        const { tokens, userId, issuedAt } = message.data || {};
        
        if (!tokens || !tokens.accessToken || !tokens.refreshToken) {
          this._updateStatus('Error: Received invalid token data', 'error');
          return;
        }
        
        // Store the tokens securely
        if (this.tokenStorage) {
          this.tokenStorage.storeTokens(tokens, { 
            userId, 
            issuedAt,
            source: this.config.senderOrigin
          });
        }
        
        // Update UI
        this._updateStatus('Tokens received successfully!', 'success');
        this._updateTokenInfo();
        
        // Acknowledge token receipt
        this._sendMessage({
          type: 'TOKEN_RECEIVED',
          requestId: message.requestId,
          data: { 
            success: true,
            timestamp: new Date().toISOString()
          }
        });
        
        // Trigger callback if registered
        if (this.tokensReceivedCallback && typeof this.tokensReceivedCallback === 'function') {
          this.tokensReceivedCallback(tokens, { userId, issuedAt });
        }
        break;
    }
  }
  
  /**
   * Send a message to the source window
   * @private
   */
  _sendMessage(message) {
    if (!this.sourceWindow && !window.opener) {
      if (this.config.debug && message.type !== 'HANDSHAKE_REQUEST') {
        console.warn('[WebApp B] Cannot send message: No valid connection to source window');
      }
      return false;
    }
    
    // Add security metadata
    const secureMessage = {
      ...message,
      metadata: {
        timestamp: new Date().toISOString(),
        sender: window.location.origin
      }
    };
    
    try {
      if (message.type === 'HANDSHAKE_REQUEST' && window.opener) {
        // For initial handshake, use window.opener
        window.opener.postMessage(secureMessage, this.config.senderOrigin);
      } else if (this.sourceWindow) {
        // For subsequent messages, use the stored sourceWindow
        this.sourceWindow.postMessage(secureMessage, this.config.senderOrigin);
      } else {
        return false;
      }
      
      if (this.config.debug) {
        console.log(`[WebApp B] Message sent: ${message.type}`);
      }
      
      return true;
    } catch (error) {
      if (this.config.debug) {
        console.error('[WebApp B] Error sending message:', error);
      }
      this._updateStatus('Error communicating with Web App A', 'error');
      return false;
    }
  }
  
  /**
   * Validate message timestamp
   * @private
   */
  _isMessageValid(message) {
    if (!message.metadata || !message.metadata.timestamp || !message.metadata.expiresAt) {
      return false;
    }
    
    try {
      const now = new Date();
      const expiresAt = new Date(message.metadata.expiresAt);
      const timestamp = new Date(message.metadata.timestamp);
      
      // Check if message is expired
      if (now > expiresAt) {
        if (this.config.debug) {
          console.warn('[WebApp B] Received expired message');
        }
        return false;
      }
      
      // Check if message is from the future (clock skew or manipulation)
      if (timestamp > new Date(now.getTime() + 60000)) { // Allow 1 minute clock skew
        if (this.config.debug) {
          console.warn('[WebApp B] Received message with future timestamp');
        }
        return false;
      }
      
      // Check if message is too old (replay attack)
      if (now - timestamp > 120000) { // 2 minutes max age
        if (this.config.debug) {
          console.warn('[WebApp B] Received message is too old');
        }
        return false;
      }
      
      return true;
    } catch (err) {
      if (this.config.debug) {
        console.error('[WebApp B] Error validating message:', err);
      }
      return false;
    }
  }
  
  /**
   * Update token info UI
   * @private
   */
  _updateTokenInfo() {
    if (!this.tokenStorage) return;
    
    const tokenInfoContainer = document.getElementById('tokenInfoContainer');
    const userIdDisplay = document.getElementById('userIdDisplay');
    const tokenStatusDisplay = document.getElementById('tokenStatusDisplay');
    const tokenReceivedAtDisplay = document.getElementById('tokenReceivedAtDisplay');
    
    if (!tokenInfoContainer) return;
    
    if (this.tokenStorage.hasTokens()) {
      const metadata = this.tokenStorage.getTokenMetadata() || {};
      
      if (userIdDisplay) {
        userIdDisplay.textContent = metadata.userId || 'Unknown';
      }
      
      if (tokenStatusDisplay) {
        tokenStatusDisplay.textContent = 'Valid';
      }
      
      if (tokenReceivedAtDisplay) {
        tokenReceivedAtDisplay.textContent = metadata.receivedAt || new Date().toISOString();
      }
      
      tokenInfoContainer.classList.remove('hidden');
    } else {
      tokenInfoContainer.classList.add('hidden');
    }
  }
  
  /**
   * Update status UI
   * @private
   */
  _updateStatus(message, type = 'pending') {
    const statusContainer = document.getElementById('statusContainer');
    const statusMessage = document.getElementById('statusMessage');
    
    if (statusContainer && statusMessage) {
      statusContainer.className = `status ${type}`;
      statusMessage.textContent = message;
    }
    
    if (this.config.debug) {
      console.log(`[WebApp B] ${message}`);
    }
  }
  
  /**
   * Generate a secure random ID
   * @private
   */
  _generateId(length = 32) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const randomValues = new Uint8Array(length);
    window.crypto.getRandomValues(randomValues);
    randomValues.forEach(val => {
      result += characters.charAt(val % characters.length);
    });
    return result;
  }
}
