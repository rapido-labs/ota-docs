---
title: "Basic Integration Flow"
sidebar_label: "Integration Basics"
sidebar_position: 1
---

# Basic Integration Flow

This guide provides a comprehensive, step-by-step breakdown of integrating your PWA with Rapido's Single Sign-On system. Each phase is explained in detail with code examples and best practices.

## Integration Flow Overview

The integration consists of 5 main phases:

1. **PWA Launch** - User navigates to your PWA from Rapido
2. **Token Request** - PWA requests authentication token via JS Bridge
3. **User Consent** - Rapido shows consent screen and handles user approval
4. **Backend Validation** - Your backend validates the token with Rapido's API
5. **Session Management** - PWA stores and manages session for future visits

## Phase 1: PWA Launch from Rapido

When a user accesses your PWA through Rapido, the app launches your PWA with a specific URL format.

### URL Patterns

#### First-time Access (No Session)
```
https://your-pwa.com/app
```

#### Returning User (With Session)
```
https://your-pwa.com/app?sessionId=abc123xyz789
```

### Initial Setup Code

```javascript
// PWA initialization script
(function() {
    'use strict';
    
    let rapidoIntegration = {
        sessionId: null,
        isAuthenticated: false,
        
        init: function() {
            this.parseUrlParameters();
            this.checkAuthenticationStatus();
        },
        
        parseUrlParameters: function() {
            const urlParams = new URLSearchParams(window.location.search);
            this.sessionId = urlParams.get('sessionId');
            
            console.log('Session ID from URL:', this.sessionId);
        },
        
        checkAuthenticationStatus: function() {
            if (this.sessionId) {
                // Validate existing session
                this.validateExistingSession(this.sessionId);
            } else {
                // Check for stored session
                this.checkStoredSession();
            }
        },
        
        checkStoredSession: function() {
            try {
                if (window.NativeJSBridge && typeof window.NativeJSBridge.fetchSessionId === 'function') {
                    const storedSessionId = window.NativeJSBridge.fetchSessionId();
                    
                    if (storedSessionId && storedSessionId !== 'null') {
                        console.log('Found stored session:', storedSessionId);
                        this.validateExistingSession(storedSessionId);
                        return;
                    }
                }
            } catch (error) {
                console.log('No stored session available:', error);
            }
            
            // No session found - initiate authentication
            this.requestAuthentication();
        }
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            rapidoIntegration.init();
        });
    } else {
        rapidoIntegration.init();
    }
    
    // Make available globally for Rapido callbacks
    window.rapidoIntegration = rapidoIntegration;
})();
```

## Phase 2: Token Request via JavaScript Bridge

When no valid session exists, your PWA requests a token from Rapido using the JavaScript Bridge.

### Bridge Method Usage

```javascript
requestAuthentication: function() {
    console.log('Initiating Rapido authentication...');
    
    // Show loading state to user
    this.showLoadingState('Connecting to Rapido...');
    
    try {
        if (window.NativeJSBridge && typeof window.NativeJSBridge.requestUserToken === 'function') {
            // Request token from Rapido
            // Replace with your actual client ID from Rapido partner portal
            window.NativeJSBridge.requestUserToken('your-partner-client-id');
        } else {
            throw new Error('Rapido NativeJSBridge interface not available');
        }
    } catch (error) {
        console.error('Failed to request token:', error);
        this.handleAuthenticationError('Unable to connect to Rapido. Please try again.');
    }
},

showLoadingState: function(message) {
    // Show loading UI to user
    const loadingElement = document.getElementById('loading-message');
    if (loadingElement) {
        loadingElement.textContent = message;
        loadingElement.style.display = 'block';
    }
},

hideLoadingState: function() {
    const loadingElement = document.getElementById('loading-message');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
}
```

### Client ID Configuration

Your client ID is provided by Rapido's team. Store it securely:

```javascript
// Configuration object
const RAPIDO_CONFIG = {
    CLIENT_ID: 'your-partner-client-id', // Provided by Rapido
    API_BASE_URL: 'https://your-api.com',
    DEBUG_MODE: false // Set to false in production
};
```

## Phase 3: User Consent and Token Reception

After requesting a token, Rapido shows a consent screen to the user. Upon approval, Rapido calls your `onTokenReceived` function.

### Setting Up Callbacks

```javascript
setupCallbacks: function() {
    // CRITICAL: These functions must be globally accessible
    window.onTokenReceived = this.handleTokenReceived.bind(this);
    window.onUserSkippedLogin = this.handleUserSkippedLogin.bind(this);
    window.onError = this.handleError.bind(this);
},

handleTokenReceived: function(token) {
    if (!token) {
        this.handleAuthenticationError('No token received from Rapido');
        return;
    }
    
    console.log('Processing received token...');
    this.hideLoadingState();
    this.showLoadingState('Validating credentials...');
    
    // Send token to backend for validation
    this.validateTokenWithBackend(token);
},

handleUserSkippedLogin: function() {
    console.log('User skipped login');
    this.hideLoadingState();
    this.showLoginForm();
},

handleError: function(error) {
    console.error('JSBridge Error:', error);
    this.hideLoadingState();
    this.showErrorMessage('Authentication failed. Please try again.');
}
```

### Backend Token Validation

```javascript
validateTokenWithBackend: function(token) {
    fetch(`${RAPIDO_CONFIG.API_BASE_URL}/api/auth/rapido-login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ 
            token: token,
            clientId: RAPIDO_CONFIG.CLIENT_ID
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        this.handleBackendResponse(data);
    })
    .catch(error => {
        console.error('Backend validation failed:', error);
        this.handleAuthenticationError('Authentication failed. Please try again.');
    });
}
```

### Error Handling for Consent

```javascript
// Handle case where user denies consent
handleAuthenticationError: function(message) {
    this.hideLoadingState();
    
    // Show user-friendly error message
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
    
    // Optionally provide retry mechanism
    this.showRetryOption();
},

showRetryOption: function() {
    const retryButton = document.getElementById('retry-auth');
    if (retryButton) {
        retryButton.style.display = 'block';
        retryButton.onclick = () => {
            this.requestAuthentication();
        };
    }
}
```

## Phase 4: Backend Token Validation

Your backend server validates the token with Rapido's API and returns user information.

### Backend Implementation (Node.js Example)

```javascript
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rapido API configuration
const RAPIDO_API = {
    BASE_URL: 'https://partner-api.rapido.bike',
    PARTNER_ID: process.env.RAPIDO_PARTNER_ID, // Store securely
    PARTNER_KEY: process.env.RAPIDO_PARTNER_API_KEY, // Store securely
    TIMEOUT: 10000 // 10 seconds
};

// Token validation endpoint
app.post('/api/auth/rapido-login', async (req, res) => {
    try {
        const { token } = req.body;
        
        // Validate request
        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Token is required'
            });
        }
        
        console.log('Validating token with Rapido API...');
        
        // Call Rapido API
        const rapidoResponse = await axios.post(
            `${RAPIDO_API.BASE_URL}/partner/fetch-user-details`,
            {
                token: token
            },
            {
                headers: {
                    'Authorization': `Bearer ${RAPIDO_API.PARTNER_KEY}`,
                    'x-client-id': `${PARTNER_ID}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'YourApp-Partner/1.0'
                },
                timeout: RAPIDO_API.TIMEOUT
            }
        );
        
        if (rapidoResponse.data && rapidoResponse.data.valid) {
            const userData = rapidoResponse.data.user;
            
            // Process user data
            const processedUser = await processUserAuthentication(userData);
            
            // Generate session
            const sessionData = await createUserSession(processedUser);
            
            res.json({
                success: true,
                sessionId: sessionData.sessionId,
                user: {
                    id: processedUser.id,
                    name: processedUser.name,
                    mobile: processedUser.mobile 
                },
                expiresAt: sessionData.expiresAt
            });
            
        } else {
            console.log('Token validation failed:', rapidoResponse.data);
            res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }
        
    } catch (error) {
        console.error('Token validation error:', error);
        
        if (error.response) {
            // Rapido API returned an error
            const status = error.response.status;
            const message = error.response.data?.message || 'Authentication failed';
            
            res.status(status).json({
                success: false,
                error: message
            });
        } else {
            // Network or other error
            res.status(500).json({
                success: false,
                error: 'Authentication service unavailable'
            });
        }
    }
});

// Helper functions
async function processUserAuthentication(userData) {
    // Create or update user in your database
    const user = {
        name: userData.name,
        mobile: userData.mobile,
        lastLoginAt: new Date()
    };
    
    // Your database logic here
    const savedUser = await saveOrUpdateUser(user);
    
    return savedUser;
}

async function createUserSession(user) {
    //
}
```


## Phase 5: Session Storage and Management

After successful authentication, store the session ID using Rapido's secure storage.

### Frontend Session Management

```javascript
handleBackendResponse: function(data) {
    this.hideLoadingState();
    
    if (data.success && data.sessionId) {
        console.log('Authentication successful');
        
        // Store session ID securely using Rapido's storage
        this.storeSessionId(data.sessionId);
        
        // Update UI state
        this.isAuthenticated = true;
        this.sessionId = data.sessionId;
        
        // Redirect to authenticated view
        this.redirectToAuthenticatedView(data.user);
        
    } else {
        console.error('Backend authentication failed:', data.error);
        this.handleAuthenticationError(data.error || 'Authentication failed');
    }
},

storeSessionId: function(sessionId) {
    try {
        if (window.NativeJSBridge && typeof window.NativeJSBridge.storeSessionId === 'function') {
            const result = window.NativeJSBridge.storeSessionId(sessionId);
            if (result === 'SUCCESS') {
                console.log('Session ID stored successfully');
            } else {
                console.warn('Failed to store session ID:', result);
            }
        } else {
            console.warn('Rapido storage not available - session will not persist');
        }
    } catch (error) {
        console.error('Failed to store session ID:', error);
    }
},

redirectToAuthenticatedView: function(userData) {
    // Store user data in application state
    this.setUserData(userData);
    
    // Remove URL parameters
    const url = new URL(window.location);
    url.searchParams.delete('sessionId');
    window.history.replaceState({}, document.title, url.pathname);
    
    // Navigate to main application
    window.location.href = '/dashboard';
},

validateExistingSession: function(sessionId) {
    // validate session as required
}
```

## Complete Integration Example

Here's a complete, production-ready implementation:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your PWA - Rapido Integration</title>
</head>
<body>
    <div id="loading-container" style="display: none;">
        <div id="loading-message">Initializing...</div>
    </div>
    
    <div id="error-container" style="display: none;">
        <div id="error-message"></div>
        <button id="retry-auth" style="display: none;">Retry Authentication</button>
    </div>
    
    <div id="app-container" style="display: none;">
        <!-- Your authenticated app content -->
    </div>
    
    <script>
        // Configuration
        const RAPIDO_CONFIG = {
            CLIENT_ID: 'your-partner-client-id',
            API_BASE_URL: 'https://your-api.com',
            DEBUG_MODE: false
        };
        
        // Global callback for Rapido
        function onTokenReceived(token) {
            if (window.rapidoIntegration) {
                window.rapidoIntegration.handleTokenReceived(token);
            }
        }
        
        // Main integration object
        const rapidoIntegration = {
            // ... (include all the methods shown above)
        };
        
        // Bridge readiness check
        function checkBridgeReady() {
            const maxWaitTime = 5000;
            const startTime = window.bridgeCheckStartTime || (window.bridgeCheckStartTime = Date.now());
            
            if (window.NativeJSBridge && typeof window.NativeJSBridge.requestUserToken === 'function') {
                console.log('✅ Bridge ready in ' + (Date.now() - startTime) + 'ms');
                rapidoIntegration.setupCallbacks();
                rapidoIntegration.init();
            } else if (Date.now() - startTime < maxWaitTime) {
                setTimeout(checkBridgeReady, 10);
            } else {
                console.error('❌ Bridge failed to initialize within 5 seconds');
                rapidoIntegration.handleAuthenticationError('Bridge connection failed');
            }
        }
        
        // Initialize
        window.onload = function() {
            checkBridgeReady();
        };
        
        // Make globally available
        window.rapidoIntegration = rapidoIntegration;
    </script>
</body>
</html>
```

---

**Next Steps**: 
- Learn about [JavaScript Bridge methods](./javascript-bridge.md) in detail
- Review [Security Guidelines](../security.md) for production deployment
- Check [API Reference](../api/overview.md) for backend integration specifications
- Check [Quick Start Guide](../quickstart.md) for step-by-step instructions