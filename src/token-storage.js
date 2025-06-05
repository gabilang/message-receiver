/**
 * Secure Token Storage
 * Manages secure in-memory storage of JWT tokens
 * 
 * Current Date: 2025-06-05 02:52:47 UTC
 * User: gabilang
 */
export default class TokenStorage {
  constructor(options = {}) {
    this.debug = options.debug || false;
    
    // Private storage using closure
    let accessToken = null;
    let refreshToken = null;
    let tokenMetadata = null;
    
    // Public methods that encapsulate the private variables
    this.storeTokens = (tokens, metadata = {}) => {
      if (!tokens || !tokens.accessToken || !tokens.refreshToken) {
        return false;
      }
      
      accessToken = tokens.accessToken;
      refreshToken = tokens.refreshToken;
      tokenMetadata = {
        ...metadata,
        receivedAt: new Date().toISOString()
      };
      
      if (this.debug) {
        console.log('[TokenStorage] Tokens stored successfully');
      }
      
      return true;
    };
    
    this.getAccessToken = () => accessToken;
    
    this.getRefreshToken = () => refreshToken;
    
    this.getTokenMetadata = () => ({ ...tokenMetadata });
    
    this.hasTokens = () => !!accessToken && !!refreshToken;
    
    this.clearTokens = () => {
      accessToken = null;
      refreshToken = null;
      tokenMetadata = null;
      
      if (this.debug) {
        console.log('[TokenStorage] Tokens cleared');
      }
    };
  }
}
