---
title: "Troubleshooting Common Issues"
sidebar_label: "Troubleshooting"
sidebar_position: 6
---

# Troubleshooting Common Issues

This guide helps you diagnose and resolve common issues when integrating with Rapido's Partner PWA platform. Issues are organized by category with step-by-step solutions.

## Authentication Issues

### `onTokenReceived` Not Triggered

This is the most common issue developers face. Here's how to diagnose and fix it:

#### Diagnostic Steps

1. **Check if function is globally accessible**
   ```javascript
   // Test in browser console
   console.log(typeof window.onTokenReceived); // Should be 'function'
   
   // If undefined, the function isn't globally accessible
   if (typeof window.onTokenReceived === 'undefined') {
       console.error('onTokenReceived is not globally accessible');
   }
   ```

2. **Verify function timing**
   ```javascript
   // ❌ Wrong - function defined after token request
   window.NativeJSBridge.requestUserToken('client-id');
   window.onTokenReceived = function(token) { /* ... */ };
   
   // ✅ Correct - function defined before token request
   window.onTokenReceived = function(token) { /* ... */ };
   window.NativeJSBridge.requestUserToken('client-id');
   ```

3. **Check bridge availability**
   ```javascript
   function debugBridge() {
       console.log('NativeJSBridge available:', !!window.NativeJSBridge);
       
       if (window.NativeJSBridge) {
           console.log('requestUserToken available:', typeof window.NativeJSBridge.requestUserToken);
           console.log('storeSessionId available:', typeof window.NativeJSBridge.storeSessionId);
           console.log('fetchSessionId available:', typeof window.NativeJSBridge.fetchSessionId);
       } else {
           console.warn('Not running in Rapido app environment');
       }
   }
   
   debugBridge();
   ```

#### Solutions

**Problem**: Function inside module/closure
```javascript
// ❌ Problem - function not globally accessible
(function() {
    function onTokenReceived(token) {
        console.log('Token received');
    }
})();

// ✅ Solution - make function globally accessible
window.onTokenReceived = function(token) {
    console.log('Token received');
    // Handle token
};
```

**Problem**: Function overwritten by framework
```javascript
// ❌ Problem - React/Vue might overwrite the function
useEffect(() => {
    window.onTokenReceived = handleToken;
}, []); // Function might be overwritten

// ✅ Solution - ensure function persists
useEffect(() => {
    // Store reference to prevent overwriting
    const originalCallback = window.onTokenReceived;
    
    window.onTokenReceived = function(token) {
        handleToken(token);
        // Call original if it existed
        if (originalCallback && originalCallback !== handleToken) {
            originalCallback(token);
        }
    };
    
    return () => {
        // Cleanup if needed
        if (window.onTokenReceived === handleToken) {
            delete window.onTokenReceived;
        }
    };
}, []);
```

**Problem**: User denied consent
```javascript
// ✅ Solution - implement timeout detection
function requestTokenWithTimeout() {
    let timeoutId;
    let tokenReceived = false;
    
    // Store original callback
    const originalCallback = window.onTokenReceived;
    
    // Set up timeout (30 seconds)
    timeoutId = setTimeout(() => {
        if (!tokenReceived) {
            console.log('Token request timed out - user likely denied consent');
            showConsentRequiredMessage();
            
            // Restore original callback
            window.onTokenReceived = originalCallback;
        }
    }, 30000);
    
    // Override callback temporarily
    window.onTokenReceived = function(token) {
        tokenReceived = true;
        clearTimeout(timeoutId);
        
        // Call original callback
        if (originalCallback) {
            originalCallback(token);
        }
        
        // Restore original callback
        window.onTokenReceived = originalCallback;
    };
    
    // Request token
    if (window.NativeJSBridge && window.NativeJSBridge.requestUserToken) {
        window.NativeJSBridge.requestUserToken('your-client-id');
    } else {
        console.error('Rapido bridge not available');
        clearTimeout(timeoutId);
    }
}
```

### Token Validation Errors

#### HTTP 401 - Unauthorized

**Symptoms**: Backend returns 401 when validating tokens

**Diagnostic Steps**:
```javascript
// Check API key configuration
function validateAPIConfig() {
    const apiKey = process.env.RAPIDO_PARTNER_API_KEY;
    
    if (!apiKey) {
        console.error('RAPIDO_PARTNER_API_KEY not set');
        return false;
    }
    
    if (apiKey.length < 32) {
        console.error('API key appears to be invalid (too short)');
        return false;
    }
    
    if (apiKey.startsWith('your-') || apiKey.includes('example')) {
        console.error('API key appears to be a placeholder');
        return false;
    }
    
    console.log('API key configuration appears valid');
    return true;
}
```

**Solutions**:

1. **Check environment variables**
   ```bash
   # Verify environment variables are set
   echo $RAPIDO_PARTNER_API_KEY
   echo $RAPIDO_CLIENT_ID
   
   # For Node.js applications
   node -e "console.log('API Key:', process.env.RAPIDO_PARTNER_API_KEY ? 'SET' : 'NOT SET')"
   ```

2. **Verify API endpoint**
   ```javascript
   // Ensure you're using the correct environment
   const baseURL = process.env.NODE_ENV === 'production'
       ? 'https://partner-api.rapido.bike/ota'      // Production
       : 'https://staging-api.rapido.bike/partner'; // Staging
   
   console.log('Using API endpoint:', baseURL);
   ```

3. **Check API key format**
   ```javascript
   // Test API key with a simple request
   async function testAPIKey() {
       try {
           const response = await fetch(`${baseURL}/health`, {
               headers: {
                   'Authorization': `Bearer ${apiKey}`,
                   'Content-Type': 'application/json'
               }
           });
           
           console.log('API key test status:', response.status);
           
           if (response.status === 401) {
               console.error('API key is invalid or expired');
           }
       } catch (error) {
           console.error('API key test failed:', error.message);
       }
   }
   ```

#### HTTP 400 - Bad Request

**Symptoms**: Invalid request format or missing parameters

**Common Causes**:
```javascript
// ❌ Missing client ID
const response = await fetch('/partner/fetch-user-details', {
    method: 'POST',
    body: JSON.stringify({ token: token }) // Missing clientId
});

// ✅ Correct request format
const response = await fetch('/partner/fetch-user-details', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
        token: token,
        clientId: clientId
    })
});
```

#### HTTP 429 - Rate Limited

**Symptoms**: Too many requests error

**Solutions**:
```javascript
// Implement exponential backoff
async function validateTokenWithBackoff(token, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch('/api/auth/rapido-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
            
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After') || Math.pow(2, attempt);
                console.log(`Rate limited. Retrying after ${retryAfter} seconds`);
                
                if (attempt === maxRetries) {
                    throw new Error('Rate limit exceeded. Please try again later.');
                }
                
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                continue;
            }
            
            return await response.json();
            
        } catch (error) {
            if (attempt === maxRetries) throw error;
            
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
```

## Network and API Issues

### CORS Errors

**Symptoms**: "Access blocked by CORS policy" errors

**Diagnostic Steps**:
```javascript
// Check if CORS error is due to domain mismatch
function debugCORS() {
    console.log('Current domain:', window.location.hostname);
    console.log('Current protocol:', window.location.protocol);
    
    // CORS errors often indicate domain not whitelisted
    if (window.location.protocol !== 'https:') {
        console.error('❌ Using HTTP - Rapido requires HTTPS');
    }
    
    if (window.location.hostname === 'localhost') {
        console.warn('⚠️ Using localhost - ensure this domain is whitelisted for testing');
    }
}

debugCORS();
```

**Solutions**:

1. **Verify domain whitelisting**
   ```bash
   # Contact Rapido integration team to whitelist your domains:
   # - Production: https://your-app.com
   # - Staging: https://staging.your-app.com
   # - Development: https://localhost:3000
   ```

2. **Check CORS configuration (backend)**
   ```javascript
   // Express.js CORS configuration
   const cors = require('cors');
   
   const corsOptions = {
       origin: [
           'https://your-app.com',
           'https://staging.your-app.com',
           'https://localhost:3000' // Development only
       ],
       credentials: true,
       optionsSuccessStatus: 200
   };
   
   app.use(cors(corsOptions));
   ```

### SSL/TLS Certificate Issues

**Symptoms**: Certificate errors or "connection not secure" warnings

**Diagnostic Steps**:
```bash
# Check SSL certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Check certificate expiry
curl -vI https://your-domain.com 2>&1 | grep -E "expire|issuer"

# Test SSL configuration
curl -I https://your-domain.com
```

**Solutions**:

1. **Verify certificate chain**
   ```bash
   # Ensure intermediate certificates are included
   openssl verify -CAfile ca-bundle.crt your-certificate.crt
   ```

2. **Check certificate validity**
   ```javascript
   // Frontend certificate validation
   function checkSSLStatus() {
       if (location.protocol !== 'https:') {
           console.error('❌ Site not using HTTPS');
           return false;
       }
       
       // Check if certificate is valid (no warnings)
       if (navigator.webkitGetUserMedia || navigator.mozGetUserMedia) {
           console.log('✅ HTTPS appears to be working correctly');
           return true;
       }
       
       return false;
   }
   ```

### Timeout Issues

**Symptoms**: API requests timing out

**Solutions**:

1. **Implement proper timeout handling**
   ```javascript
   async function makeAPIRequestWithTimeout(url, options, timeoutMs = 10000) {
       const controller = new AbortController();
       const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
       
       try {
           const response = await fetch(url, {
               ...options,
               signal: controller.signal
           });
           
           clearTimeout(timeoutId);
           return response;
           
       } catch (error) {
           clearTimeout(timeoutId);
           
           if (error.name === 'AbortError') {
               throw new Error(`Request timeout after ${timeoutMs}ms`);
           }
           
           throw error;
       }
   }
   ```

2. **Configure appropriate timeouts**
   ```javascript
   // Different timeouts for different operations
   const TIMEOUTS = {
       TOKEN_VALIDATION: 10000,    // 10 seconds
       SESSION_VALIDATION: 5000,   // 5 seconds
       USER_DATA_FETCH: 15000      // 15 seconds
   };
   
   async function validateToken(token) {
       return makeAPIRequestWithTimeout(
           '/api/auth/rapido-login',
           {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ token })
           },
           TIMEOUTS.TOKEN_VALIDATION
       );
   }
   ```

## Production Environment Issues

### Environment Variable Problems

**Symptoms**: Integration works in development but fails in production

**Diagnostic Checklist**:
```bash
# Check if environment variables are set
printenv | grep RAPIDO

# For Docker containers
docker exec container_name printenv | grep RAPIDO

# For systemd services
systemctl show-environment | grep RAPIDO
```

**Solutions**:

1. **Validate environment on startup**
   ```javascript
   // Add to your application startup
   function validateEnvironment() {
       const required = [
           'RAPIDO_PARTNER_API_KEY',
           'RAPIDO_CLIENT_ID',
           'SESSION_SECRET'
       ];
       
       const missing = required.filter(key => !process.env[key]);
       
       if (missing.length > 0) {
           console.error('❌ Missing required environment variables:', missing);
           process.exit(1);
       }
       
       console.log('✅ All required environment variables are set');
   }
   
   validateEnvironment();
   ```

2. **Use environment-specific configurations**
   ```javascript
   // config/index.js
   const environments = {
       development: {
           rapidoAPI: 'https://staging-api.rapido.bike/partner',
           logLevel: 'debug'
       },
       staging: {
           rapidoAPI: 'https://staging-api.rapido.bike/partner',
           logLevel: 'info'
       },
       production: {
           rapidoAPI: 'https://partner-api.rapido.bike/ota',
           logLevel: 'warn'
       }
   };
   
   const config = environments[process.env.NODE_ENV] || environments.development;
   module.exports = config;
   ```

## Debugging Tools

### Enable Debug Mode

```javascript
// Add debug logging throughout your integration
const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';

function debugLog(category, message, data = null) {
    if (DEBUG) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${category}] ${message}`, data || '');
    }
}

// Usage throughout your code
debugLog('AUTH', 'Token received from Rapido');
debugLog('SESSION', 'Storing session ID', { sessionId: sessionId.substring(0, 8) + '...' });
debugLog('API', 'Validating token with backend');
```

### Create Integration Test Script

```javascript
// integration-test.js - Run this to test your integration
async function runIntegrationTest() {
    console.log('🔍 Running Rapido Integration Test\n');
    
    // Test 1: Environment variables
    console.log('1. Checking environment variables...');
    const apiKey = process.env.RAPIDO_PARTNER_API_KEY;
    const clientId = process.env.RAPIDO_CLIENT_ID;
    
    if (!apiKey) {
        console.error('❌ RAPIDO_PARTNER_API_KEY not set');
        return;
    }
    
    if (!clientId) {
        console.error('❌ RAPIDO_CLIENT_ID not set');
        return;
    }
    
    console.log('✅ Environment variables configured\n');
    
    // Test 2: API connectivity
    console.log('2. Testing API connectivity...');
    try {
        const response = await fetch(`${config.rapidoAPI}/health`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            },
            timeout: 10000
        });
        
        if (response.ok) {
            console.log('✅ API connectivity working\n');
        } else {
            console.error(`❌ API returned status ${response.status}\n`);
        }
    } catch (error) {
        console.error('❌ API connectivity failed:', error.message, '\n');
    }
    
    // Test 3: Database connectivity
    console.log('3. Testing database connectivity...');
    try {
        await mongoose.connection.db.admin().ping();
        console.log('✅ Database connectivity working\n');
    } catch (error) {
        console.error('❌ Database connectivity failed:', error.message, '\n');
    }
    
    // Test 4: Session operations
    console.log('4. Testing session operations...');
    try {
        const testSession = await Session.create({
            sessionId: 'test-' + Date.now(),
            userId: 'test-user',
            expiresAt: new Date(Date.now() + 60000)
        });
        
        await Session.deleteOne({ _id: testSession._id });
        console.log('✅ Session operations working\n');
    } catch (error) {
        console.error('❌ Session operations failed:', error.message, '\n');
    }
    
    console.log('🎉 Integration test complete!');
}

runIntegrationTest().catch(console.error);
```

---

**Still Having Issues?**

If you're still experiencing problems after following this troubleshooting guide:

1. **Enable debug logging** and gather detailed error information
2. **Run the integration test script** to identify specific failure points
3. **Check our [FAQ](./faq.md)** for additional common questions
4. **Contact support** at [partner-support@rapido.bike](mailto:partner-support@rapido.bike) with:
   - Detailed error messages
   - Steps to reproduce the issue
   - Your environment details (Node.js version, browser, etc.)
   - Debug logs (with sensitive information removed)

**Emergency Support**: For production issues affecting live users, contact [emergency-support@rapido.bike](mailto:emergency-support@rapido.bike) with "URGENT" in the subject line.