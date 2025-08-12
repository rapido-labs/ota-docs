---
title: "Using the Rapido JS Bridge"
sidebar_label: "JavaScript Bridge"
sidebar_position: 2
---

# Using the Rapido JavaScript Bridge

The Rapido JavaScript Bridge provides secure communication between your PWA and the Rapido mobile application. This page documents all available methods, event handlers, and best practices for implementation.

## Bridge Overview

The JavaScript Bridge is exposed through the `window.NativeJSBridge` object when your PWA runs inside the Rapido app. It provides three core functionalities:

1. **Authentication Token** - Request user authentication tokens
2. **Session Storage** - Securely store and retrieve session IDs
3. **Event Handling** - Receive callbacks from Rapido

## Available Methods

### requestUserToken(clientId)

Initiates the user authentication flow by requesting a token from Rapido.

#### Parameters
- `clientId` (string, required): Your partner client ID provided by Rapido

#### Usage
```javascript
function initiateLogin() {
    if (window.NativeJSBridge && window.NativeJSBridge.requestUserToken) {
        window.NativeJSBridge.requestUserToken('your-partner-client-id');
    } else {
        console.error('Rapido NativeJSBridge not available');
    }
}
```

#### Behavior
1. Triggers Rapido's consent screen
2. User approves or denies access
3. On approval, calls your `onTokenReceived` function
4. On denial, calls your `onUserSkippedLogin` function

#### Error Handling
```javascript
function safeRequestToken(clientId) {
    try {
        if (!window.NativeJSBridge) {
            throw new Error('Running outside Rapido app');
        }
        
        if (typeof window.NativeJSBridge.requestUserToken !== 'function') {
            throw new Error('requestUserToken method not available');
        }
        
        window.NativeJSBridge.requestUserToken(clientId);
        
    } catch (error) {
        console.error('Failed to request token:', error);
        // Handle gracefully - maybe show manual login option
        showManualLoginOption();
    }
}
```

### storeSessionId(sessionId)

Securely stores a session ID in Rapido's encrypted storage.

#### Parameters
- `sessionId` (string, required): The session ID to store

#### Returns
- `string`: "SUCCESS" on success, "ERROR:message" on failure

#### Usage
```javascript
function saveSession(sessionId) {
    if (window.NativeJSBridge && window.NativeJSBridge.storeSessionId) {
        try {
            const result = window.NativeJSBridge.storeSessionId(sessionId);
            if (result === 'SUCCESS') {
                console.log('Session stored successfully');
            } else {
                console.error('Failed to store session:', result);
            }
        } catch (error) {
            console.error('Failed to store session:', error);
        }
    }
}
```

#### Best Practices
```javascript
function secureStoreSession(sessionId) {
    // Validate session ID format
    if (!sessionId || typeof sessionId !== 'string' || sessionId.length < 10) {
        throw new Error('Invalid session ID format');
    }
    
    // Store with error handling
    try {
        if (window.NativeJSBridge && window.NativeJSBridge.storeSessionId) {
            window.NativeJSBridge.storeSessionId(sessionId);
            
            // Verify storage by immediately fetching
            const stored = window.NativeJSBridge.fetchSessionId();
            if (stored !== sessionId) {
                throw new Error('Session storage verification failed');
            }
            
            return true;
        } else {
            console.warn('Session storage not available - user will need to re-authenticate');
            return false;
        }
    } catch (error) {
        console.error('Session storage failed:', error);
        throw error;
    }
}
```

### fetchSessionId()

Retrieves the stored session ID from Rapido's secure storage.

#### Returns
- `string|null`: The stored session ID, or `null` if no session exists

#### Usage
```javascript
function getStoredSession() {
    if (window.NativeJSBridge && window.NativeJSBridge.fetchSessionId) {
        try {
            const sessionId = window.NativeJSBridge.fetchSessionId();
            return sessionId && sessionId !== 'null' ? sessionId : null;
        } catch (error) {
            console.error('Failed to fetch session:', error);
            return null;
        }
    }
    return null;
}
```

#### Advanced Usage with Validation
```javascript
async function validateAndGetSession() {
    const sessionId = getStoredSession();
    
    if (!sessionId) {
        console.log('No stored session found');
        return null;
    }
    
    // Validate session with backend
    try {
        const response = await fetch('/api/auth/validate-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        });
        
        const data = await response.json();
        
        if (data.valid) {
            return sessionId;
        } else {
            console.log('Stored session is invalid');
            // Clear invalid session
            clearStoredSession();
            return null;
        }
    } catch (error) {
        console.error('Session validation failed:', error);
        return null;
    }
}

function clearStoredSession() {
    // Clear by storing empty string
    if (window.NativeJSBridge && window.NativeJSBridge.storeSessionId) {
        window.NativeJSBridge.storeSessionId('');
    }
}
```

## Event Handlers

### onTokenReceived(token)

**CRITICAL**: This function must be globally accessible and will be called by Rapido when a user token is available.

#### Parameters
- `token` (string): Encrypted authentication token from Rapido

#### Implementation
```javascript
// Global function - must be accessible from window scope
function onTokenReceived(token) {
    console.log('Token received from Rapido');
    
    // Validate token parameter
    if (!token || typeof token !== 'string') {
        console.error('Invalid token received');
        handleAuthError('Invalid token received');
        return;
    }
    
    // Process token
    processReceivedToken(token);
}

async function processReceivedToken(token) {
    try {
        // Show processing state
        showLoadingState('Validating credentials...');
        
        // Send to backend for validation
        const response = await fetch('/api/auth/rapido-login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Store session and redirect
            await handleSuccessfulAuth(data);
        } else {
            throw new Error(data.error || 'Authentication failed');
        }
        
    } catch (error) {
        console.error('Token processing failed:', error);
        handleAuthError(error.message);
    } finally {
        hideLoadingState();
    }
}
```

### onUserSkippedLogin()

Called when user declines authentication.

#### Implementation
```javascript
function onUserSkippedLogin() {
    console.log('User skipped login');
    hideLoadingState();
    showLoginForm();
}
```

### onError(error)

Called when an error occurs during bridge operations.

#### Parameters
- `error` (string): Error message

#### Implementation
```javascript
function onError(error) {
    console.error('JSBridge Error:', error);
    hideLoadingState();
    showErrorMessage('Authentication failed. Please try again.');
}
```

## Bridge Readiness Check

### Why Bridge Readiness Check is Required

The JSBridge interface (`window.NativeJSBridge`) is injected asynchronously by the WebView. Even though `window.onload` fires when the DOM is ready, the JavaScript interface might not be immediately accessible, creating a race condition.

**Bridge readiness check:**
- ✅ **Immediate execution** - No waiting when bridge is ready
- ✅ **Reliable detection** - Actively checks for bridge availability
- ✅ **Graceful fallback** - Continues checking until bridge is ready
- ✅ **Better performance** - Eliminates arbitrary delays

### Implementation

```javascript
// Bridge readiness check with timeout protection
function checkBridgeReady() {
    const maxWaitTime = 5000; // Maximum 5 seconds
    const startTime = window.bridgeCheckStartTime || (window.bridgeCheckStartTime = Date.now());
    
    if (window.NativeJSBridge && typeof window.NativeJSBridge.requestUserToken === 'function') {
        // Bridge confirmed ready - proceed immediately
        console.log('✅ Bridge ready in ' + (Date.now() - startTime) + 'ms');
        window.NativeJSBridge.requestUserToken('your_client_id');
    } else if (Date.now() - startTime < maxWaitTime) {
        // Bridge not ready - check again in 10ms
        setTimeout(checkBridgeReady, 10);
    } else {
        // Timeout protection - prevent infinite waiting
        console.error('❌ Bridge failed to initialize within 5 seconds');
        // Show fallback authentication method
    }
}

## Bridge Detection and Compatibility

### Checking Bridge Availability

```javascript
function isBridgeAvailable() {
    return typeof window.NativeJSBridge === 'object' && window.NativeJSBridge !== null;
}

function checkBridgeCapabilities() {
    if (!isBridgeAvailable()) {
        return {
            available: false,
            capabilities: {}
        };
    }
    
    return {
        available: true,
        capabilities: {
            requestUserToken: typeof window.NativeJSBridge.requestUserToken === 'function',
            storeSessionId: typeof window.NativeJSBridge.storeSessionId === 'function',
            fetchSessionId: typeof window.NativeJSBridge.fetchSessionId === 'function'
        }
    };
}

// Usage
const bridge = checkBridgeCapabilities();

if (bridge.available) {
    console.log('Bridge capabilities:', bridge.capabilities);
    
    if (!bridge.capabilities.requestUserToken) {
        console.warn('Token request not supported in this Rapido version');
    }
} else {
    console.log('Running outside Rapido app or bridge not available');
}
```

### Graceful Degradation

```javascript
function initializeWithFallback() {
    const bridge = checkBridgeCapabilities();
    
    if (bridge.available && bridge.capabilities.requestUserToken) {
        // Full bridge functionality available
        initializeRapidoAuth();
    } else if (bridge.available) {
        // Partial bridge functionality
        console.warn('Limited bridge functionality - some features may not work');
        initializeWithLimitedFeatures();
    } else {
        // No bridge - provide alternative authentication
        console.log('Bridge not available - using alternative auth');
        initializeAlternativeAuth();
    }
}
```

## Testing and Debugging

### Debug Helper Functions

```javascript
// Debug utilities for development
const RapidoBridgeDebug = {
    logBridgeInfo() {
        console.group('Rapido Bridge Debug Info');
        console.log('Bridge available:', !!window.NativeJSBridge);
        
        if (window.NativeJSBridge) {
            console.log('Methods available:', {
                requestUserToken: typeof window.NativeJSBridge.requestUserToken,
                storeSessionId: typeof window.NativeJSBridge.storeSessionId,
                fetchSessionId: typeof window.NativeJSBridge.fetchSessionId
            });
            
            // Try to get stored session
            try {
                const stored = window.NativeJSBridge.fetchSessionId();
                console.log('Stored session:', stored);
            } catch (e) {
                console.log('Could not fetch stored session:', e.message);
            }
        }
        
        console.log('Global callback set:', typeof window.onTokenReceived);
        console.groupEnd();
    },
    
    testTokenCallback(mockToken = 'test-token-123') {
        if (typeof window.onTokenReceived === 'function') {
            console.log('Testing token callback with mock token');
            window.onTokenReceived(mockToken);
        } else {
            console.error('onTokenReceived not defined');
        }
    },
    
    simulateBridgeEnvironment() {
        if (!window.NativeJSBridge) {
            console.log('Creating mock NativeJSBridge for testing');
            window.NativeJSBridge = {
                requestUserToken: (clientId) => {
                    console.log('Mock: requestUserToken called with', clientId);
                    setTimeout(() => {
                        if (window.onTokenReceived) {
                            window.onTokenReceived('mock-token-' + Date.now());
                        }
                    }, 1000);
                },
                storeSessionId: (sessionId) => {
                    console.log('Mock: storing session', sessionId);
                    localStorage.setItem('mockRapidoSession', sessionId);
                    return 'SUCCESS';
                },
                fetchSessionId: () => {
                    const session = localStorage.getItem('mockRapidoSession');
                    console.log('Mock: fetching session', session);
                    return session;
                }
            };
        }
    }
};

// Use in development
if (process.env.NODE_ENV === 'development') {
    window.RapidoBridgeDebug = RapidoBridgeDebug;
}
```

### Testing Checklist

When testing your JavaScript Bridge integration:

- [ ] **Bridge Detection**: Verify bridge availability detection works
- [ ] **Token Request**: Test `requestUserToken` with valid client ID
- [ ] **Consent Flow**: Test both approval and denial scenarios
- [ ] **Token Processing**: Verify `onTokenReceived` callback works
- [ ] **Session Storage**: Test `storeSessionId` and `fetchSessionId`
- [ ] **Error Handling**: Test with invalid tokens and network failures
- [ ] **Multiple Sessions**: Test session replacement and updates
- [ ] **Bridge Unavailable**: Test graceful degradation when bridge is not available
- [ ] **Bridge Readiness**: Test bridge readiness check with timeout protection

---

**Next Steps**:
- Review [Integration Basics](./basics.md) for complete implementation flow
- Check [Security Guidelines](../security.md) for production security requirements
- See [Troubleshooting](../troubleshooting.md) for common integration issues