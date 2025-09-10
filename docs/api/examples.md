---
title: "API Examples"
sidebar_label: "Code Examples"
sidebar_position: 3
---

# API Integration Examples

This page provides complete, production-ready code examples for integrating with Rapido's Partner APIs across different programming languages and frameworks.

## Complete Integration Example (Node.js)

Here's a comprehensive Node.js implementation with Express.js:

```javascript
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const app = express();

// Configuration
const config = {
    rapido: {
        apiKey: process.env.CLIENT_KEY,
        clientId: process.env.CLIENT_ID,
        baseURL: process.env.NODE_ENV === 'production' 
            ? '<rapido-host-url-prod>/api/ota'
            : '<rapido-host-url-staging>/api/ota',
        timeout: 10000
    },
    session: {
        secret: process.env.SESSION_SECRET,
        expiry: 24 * 60 * 60 * 1000 // 24 hours
    }
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 requests per windowMs
    message: {
        success: false,
        error: 'Too many authentication attempts, please try again later'
    }
});

app.use('/api/auth', authLimiter);

// Rapido API Client
class RapidoAPIClient {
    constructor(config) {
        this.config = config;
        this.axios = axios.create({
            baseURL: config.baseURL,
            timeout: config.timeout,
            headers: {
                'authorization': `${config.apiKey}`,
                'Content-Type': 'application/json',
                'User-Agent': 'PartnerApp/1.0.0'
            }
        });
        
        // Add request interceptor for logging
        this.axios.interceptors.request.use(
            (config) => {
                console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
                return config;
            },
            (error) => {
                console.error('API Request Error:', error);
                return Promise.reject(error);
            }
        );
        
        // Add response interceptor for error handling
        this.axios.interceptors.response.use(
            (response) => {
                console.log(`API Response: ${response.status} ${response.config.url}`);
                return response;
            },
            (error) => {
                this.handleAPIError(error);
                return Promise.reject(error);
            }
        );
    }
    
    async validateToken(token) {
        const requestId = this.generateRequestId();
        
        try {
            const response = await this.axios.post('/fetch-user-details', {
                token: token
            }, {
                headers: {
                    'x-client-id': this.config.clientId,
                    'x-client-service': '<your_service_offering>',
                    'x-client-appid': '<your_app_id>'
                }
            });
            
            return response.data;
        } catch (error) {
            console.error(`Token validation failed (${requestId}):`, error.message);
            throw error;
        }
    }
    
    generateRequestId() {
        return `req_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    }
    
    handleAPIError(error) {
        if (error.response) {
            const { status, data } = error.response;
            console.error(`API Error ${status}:`, data);
            
            // Add specific error handling based on status codes
            switch (status) {
                case 401:
                    console.error('Unauthorized: Check API key configuration');
                    break;
                case 429:
                    console.error('Rate limited: Slow down API requests');
                    break;
                case 503:
                    console.error('Service unavailable: Rapido API is down');
                    break;
            }
        } else if (error.request) {
            console.error('Network Error: Unable to reach Rapido API');
        }
    }
}

// Database models (example with MongoDB/Mongoose)
const userSchema = {
    rapidoUserId: String,
    name: String,
    email: String,
    mobile: String,
    profile: Object,
    createdAt: { type: Date, default: Date.now },
    lastLoginAt: Date
};

const sessionSchema = {
    sessionId: String,
    userId: String,
    expiresAt: Date,
    createdAt: { type: Date, default: Date.now },
    lastAccessedAt: Date
};

// Services
class UserService {
    static async createOrUpdateUser(userData) {
        // Implementation depends on your database
        // This is a conceptual example
        
        const existingUser = await User.findOne({ 
            rapidoUserId: userData.id 
        });
        
        if (existingUser) {
            // Update existing user
            existingUser.name = userData.name;
            existingUser.email = userData.email;
            existingUser.mobile = userData.mobile;
            existingUser.profile = userData.profile;
            existingUser.lastLoginAt = new Date();
            
            return await existingUser.save();
        } else {
            // Create new user
            const newUser = new User({
                rapidoUserId: userData.id,
                name: userData.name,
                email: userData.email,
                mobile: userData.mobile,
                profile: userData.profile,
                lastLoginAt: new Date()
            });
            
            return await newUser.save();
        }
    }
}

class SessionService {
    static generateSessionId() {
        return crypto.randomBytes(32).toString('hex');
    }
    
    static async createSession(userId) {
        const sessionId = this.generateSessionId();
        const expiresAt = new Date(Date.now() + config.session.expiry);
        
        const session = new Session({
            sessionId,
            userId,
            expiresAt,
            lastAccessedAt: new Date()
        });
        
        await session.save();
        
        return {
            sessionId,
            expiresAt
        };
    }
    
    static async validateSession(sessionId) {
        const session = await Session.findOne({ 
            sessionId,
            expiresAt: { $gt: new Date() }
        });
        
        if (session) {
            // Update last accessed time
            session.lastAccessedAt = new Date();
            await session.save();
            
            return {
                valid: true,
                userId: session.userId
            };
        } else {
            // Clean up expired session
            await Session.deleteOne({ sessionId });
            return { valid: false };
        }
    }
    
    static async deleteSession(sessionId) {
        await Session.deleteOne({ sessionId });
    }
}

// Initialize Rapido API client
const rapidoAPI = new RapidoAPIClient(config.rapido);

// Routes
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
        
        // Validate token with Rapido
        const rapidoResponse = await rapidoAPI.validateToken(token);
        
        if (rapidoResponse.success && rapidoResponse.data.valid) {
            const userData = rapidoResponse.data.user;
            
            // Create or update user
            const user = await UserService.createOrUpdateUser(userData);
            
            // Create session
            const sessionData = await SessionService.createSession(user._id);
            
            res.json({
                success: true,
                sessionId: sessionData.sessionId,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email
                },
                expiresAt: sessionData.expiresAt
            });
            
        } else {
            res.status(401).json({
                success: false,
                error: 'Token validation failed'
            });
        }
        
    } catch (error) {
        console.error('Authentication error:', error);
        
        // Return appropriate error based on error type
        if (error.response?.status === 401) {
            res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        } else if (error.response?.status === 429) {
            res.status(429).json({
                success: false,
                error: 'Rate limit exceeded. Please try again later.'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Authentication service temporarily unavailable'
            });
        }
    }
});

app.post('/api/auth/validate-session', async (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (!sessionId) {
            return res.json({ valid: false });
        }
        
        const validation = await SessionService.validateSession(sessionId);
        
        res.json(validation);
        
    } catch (error) {
        console.error('Session validation error:', error);
        res.json({ valid: false });
    }
});

app.post('/api/auth/logout', async (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (sessionId) {
            await SessionService.deleteSession(sessionId);
        }
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Logout error:', error);
        res.json({ success: true }); // Always return success for logout
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

module.exports = app;
```

## Python/Django Example

```python
import os
import time
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

import requests
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.views import View
from django.conf import settings
import json

# Configuration
RAPIDO_CONFIG = {
    'API_KEY': os.environ.get('CLIENT_KEY'),
    'CLIENT_ID': os.environ.get('CLIENT_ID'),
    'BASE_URL': '<rapido-host-url-prod>/api/ota' if os.environ.get('ENV') == 'production' 
               else '<rapido-host-url-staging>/api/ota',
    'TIMEOUT': 10
}

class RapidoAPIClient:
    def __init__(self):
        self.api_key = RAPIDO_CONFIG['API_KEY']
        self.client_id = RAPIDO_CONFIG['CLIENT_ID']
        self.base_url = RAPIDO_CONFIG['BASE_URL']
        self.timeout = RAPIDO_CONFIG['TIMEOUT']
    
    def validate_token(self, token: str) -> Dict[str, Any]:
        """Validate token with Rapido API"""
        
        url = f"{self.base_url}/fetch-user-details"
        headers = {
            'authorization': f'{self.api_key}',
            'Content-Type': 'application/json',
            'User-Agent': 'PartnerApp/1.0.0',
            'x-client-id': self.client_id,
            'x-client-service': '<your_service_offering>',
            'x-client-appid': '<your_app_id>'
        }
        data = {
            'token': token
        }
        
        try:
            response = requests.post(
                url, 
                json=data, 
                headers=headers, 
                timeout=self.timeout
            )
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.Timeout:
            raise Exception("Rapido API timeout")
        except requests.exceptions.HTTPError as e:
            self._handle_http_error(e.response)
        except requests.exceptions.RequestException as e:
            raise Exception(f"Network error: {str(e)}")
    
    def _generate_request_id(self) -> str:
        timestamp = str(int(time.time()))
        random_part = secrets.token_hex(8)
        return f"req_{timestamp}_{random_part}"
    
    def _handle_http_error(self, response):
        try:
            error_data = response.json()
            error_message = error_data.get('error', {}).get('message', 'API request failed')
        except:
            error_message = f"HTTP {response.status_code}: {response.text}"
        
        if response.status_code == 401:
            raise Exception("Unauthorized: Invalid API key or token")
        elif response.status_code == 429:
            raise Exception("Rate limit exceeded")
        else:
            raise Exception(error_message)

# Models (Django example)
from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    rapido_user_id = models.CharField(max_length=100, unique=True, null=True)
    mobile = models.CharField(max_length=20, null=True)
    profile_data = models.JSONField(default=dict)
    last_login_at = models.DateTimeField(null=True)
    
    def save(self, *args, **kwargs):
        if not self.last_login_at:
            self.last_login_at = datetime.now()
        super().save(*args, **kwargs)

class UserSession(models.Model):
    session_id = models.CharField(max_length=64, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    last_accessed_at = models.DateTimeField(auto_now=True)
    
    @classmethod
    def create_session(cls, user, duration_hours=24):
        session_id = secrets.token_hex(32)
        expires_at = datetime.now() + timedelta(hours=duration_hours)
        
        session = cls.objects.create(
            session_id=session_id,
            user=user,
            expires_at=expires_at
        )
        
        return session
    
    @classmethod
    def validate_session(cls, session_id):
        try:
            session = cls.objects.get(
                session_id=session_id,
                expires_at__gt=datetime.now()
            )
            
            # Update last accessed time
            session.last_accessed_at = datetime.now()
            session.save()
            
            return session
        except cls.DoesNotExist:
            return None

# Views
@method_decorator(csrf_exempt, name='dispatch')
class RapidoAuthView(View):
    def __init__(self):
        super().__init__()
        self.rapido_client = RapidoAPIClient()
    
    def post(self, request):
        try:
            data = json.loads(request.body)
            token = data.get('token')
            
            if not token:
                return JsonResponse({
                    'success': False,
                    'error': 'Token is required'
                }, status=400)
            
            # Validate token with Rapido
            rapido_response = self.rapido_client.validate_token(token)
            
            if rapido_response.get('success') and rapido_response.get('data', {}).get('valid'):
                user_data = rapido_response['data']['user']
                
                # Create or update user
                user = self._create_or_update_user(user_data)
                
                # Create session
                session = UserSession.create_session(user)
                
                return JsonResponse({
                    'success': True,
                    'sessionId': session.session_id,
                    'user': {
                        'id': user.id,
                        'name': user.get_full_name(),
                        'email': user.email
                    },
                    'expiresAt': session.expires_at.isoformat()
                })
            else:
                return JsonResponse({
                    'success': False,
                    'error': 'Token validation failed'
                }, status=401)
                
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)
    
    def _create_or_update_user(self, user_data):
        try:
            user = User.objects.get(rapido_user_id=user_data['id'])
            # Update existing user
            user.first_name = user_data.get('profile', {}).get('firstName', '')
            user.last_name = user_data.get('profile', {}).get('lastName', '')
            user.email = user_data.get('email', '')
            user.mobile = user_data.get('mobile', '')
            user.profile_data = user_data.get('profile', {})
            user.last_login_at = datetime.now()
            user.save()
            
        except User.DoesNotExist:
            # Create new user
            user = User.objects.create(
                username=user_data['id'],  # Use Rapido ID as username
                rapido_user_id=user_data['id'],
                first_name=user_data.get('profile', {}).get('firstName', ''),
                last_name=user_data.get('profile', {}).get('lastName', ''),
                email=user_data.get('email', ''),
                mobile=user_data.get('mobile', ''),
                profile_data=user_data.get('profile', {}),
                last_login_at=datetime.now()
            )
        
        return user

@method_decorator(csrf_exempt, name='dispatch')
class SessionValidateView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            session_id = data.get('sessionId')
            
            if not session_id:
                return JsonResponse({'valid': False})
            
            session = UserSession.validate_session(session_id)
            
            if session:
                return JsonResponse({
                    'valid': True,
                    'userId': session.user.id
                })
            else:
                return JsonResponse({'valid': False})
                
        except Exception as e:
            return JsonResponse({'valid': False})

# URL configuration (urls.py)
from django.urls import path

urlpatterns = [
    path('api/auth/rapido-login', RapidoAuthView.as_view(), name='rapido_login'),
    path('api/auth/validate-session', SessionValidateView.as_view(), name='validate_session'),
]
```

## PHP/Laravel Example

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class RapidoAPIService
{
    private $apiKey;
    private $clientId;
    private $baseUrl;
    private $timeout;

    public function __construct()
    {
        $this->apiKey = config('services.rapido.api_key');
        $this->clientId = config('services.rapido.client_id');
        $this->baseUrl = config('services.rapido.base_url');
        $this->timeout = config('services.rapido.timeout', 10);
    }

    public function validateToken(string $token): array
    {
        $requestId = $this->generateRequestId();
        
        try {
            $response = Http::withHeaders([
                'authorization' => $this->apiKey,
                'Content-Type' => 'application/json',
                'User-Agent' => 'PartnerApp/1.0.0',
                'x-client-id' => $this->clientId,
                'x-client-service' => '<your_service_offering>',
                'x-client-appid' => '<your_app_id>'
            ])
            ->timeout($this->timeout)
            ->post($this->baseUrl . '/fetch-user-details', [
                'token' => $token
            ]);

            if ($response->successful()) {
                return $response->json();
            } else {
                $this->handleHttpError($response, $requestId);
            }
        } catch (Exception $e) {
            Log::error("Rapido API error ({$requestId}): " . $e->getMessage());
            throw new Exception('Failed to validate token with Rapido API');
        }
    }

    private function generateRequestId(): string
    {
        return 'req_' . time() . '_' . bin2hex(random_bytes(8));
    }

    private function handleHttpError($response, $requestId)
    {
        $status = $response->status();
        $body = $response->json();
        
        Log::error("Rapido API HTTP error ({$requestId}): {$status}", $body);
        
        switch ($status) {
            case 401:
                throw new Exception('Unauthorized: Invalid API key or token');
            case 429:
                throw new Exception('Rate limit exceeded');
            default:
                $message = $body['error']['message'] ?? 'API request failed';
                throw new Exception($message);
        }
    }
}

// Controller
namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\RapidoAPIService;
use App\Models\User;
use App\Models\UserSession;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class RapidoAuthController extends Controller
{
    private $rapidoService;

    public function __construct(RapidoAPIService $rapidoService)
    {
        $this->rapidoService = $rapidoService;
    }

    public function login(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'token' => 'required|string'
            ]);

            $token = $request->input('token');
            
            // Validate token with Rapido
            $rapidoResponse = $this->rapidoService->validateToken($token);
            
            if ($rapidoResponse['success'] && $rapidoResponse['data']['valid']) {
                $userData = $rapidoResponse['data']['user'];
                
                // Create or update user
                $user = $this->createOrUpdateUser($userData);
                
                // Create session
                $session = UserSession::createSession($user);
                
                return response()->json([
                    'success' => true,
                    'sessionId' => $session->session_id,
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                    ],
                    'expiresAt' => $session->expires_at->toISOString(),
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'error' => 'Token validation failed'
                ], 401);
            }
            
        } catch (Exception $e) {
            Log::error('Rapido authentication error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'error' => 'Authentication failed'
            ], 500);
        }
    }

    public function validateSession(Request $request): JsonResponse
    {
        try {
            $sessionId = $request->input('sessionId');
            
            if (!$sessionId) {
                return response()->json(['valid' => false]);
            }
            
            $session = UserSession::validateSession($sessionId);
            
            if ($session) {
                return response()->json([
                    'valid' => true,
                    'userId' => $session->user_id
                ]);
            } else {
                return response()->json(['valid' => false]);
            }
            
        } catch (Exception $e) {
            Log::error('Session validation error: ' . $e->getMessage());
            return response()->json(['valid' => false]);
        }
    }

    private function createOrUpdateUser(array $userData): User
    {
        $user = User::updateOrCreate(
            ['rapido_user_id' => $userData['id']],
            [
                'name' => $userData['name'],
                'email' => $userData['email'] ?? '',
                'mobile' => $userData['mobile'] ?? '',
                'profile_data' => $userData['profile'] ?? [],
                'last_login_at' => now(),
            ]
        );

        return $user;
    }
}

// Model
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Carbon\Carbon;

class UserSession extends Model
{
    protected $fillable = [
        'session_id',
        'user_id',
        'expires_at',
    ];

    protected $dates = [
        'expires_at',
        'last_accessed_at',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public static function createSession(User $user, $durationHours = 24)
    {
        $sessionId = Str::random(64);
        $expiresAt = Carbon::now()->addHours($durationHours);

        return self::create([
            'session_id' => $sessionId,
            'user_id' => $user->id,
            'expires_at' => $expiresAt,
            'last_accessed_at' => Carbon::now(),
        ]);
    }

    public static function validateSession($sessionId)
    {
        $session = self::where('session_id', $sessionId)
                      ->where('expires_at', '>', Carbon::now())
                      ->first();

        if ($session) {
            $session->update(['last_accessed_at' => Carbon::now()]);
            return $session;
        }

        // Clean up expired session
        self::where('session_id', $sessionId)->delete();
        
        return null;
    }
}
```

## Error Handling Best Practices

### Comprehensive Error Handler (Node.js)

```javascript
class RapidoAPIError extends Error {
    constructor(message, code, status, details = null) {
        super(message);
        this.name = 'RapidoAPIError';
        this.code = code;
        this.status = status;
        this.details = details;
    }
}

class ErrorHandler {
    static handleRapidoAPIError(error) {
        if (error.response) {
            const { status, data } = error.response;
            const errorCode = data.error?.code || 'UNKNOWN_ERROR';
            const errorMessage = data.error?.message || 'API request failed';
            const errorDetails = data.error?.details || null;
            
            throw new RapidoAPIError(errorMessage, errorCode, status, errorDetails);
        } else if (error.request) {
            throw new RapidoAPIError(
                'Network error: Unable to reach Rapido API',
                'NETWORK_ERROR',
                0
            );
        } else {
            throw new RapidoAPIError(
                error.message || 'Unknown error occurred',
                'UNKNOWN_ERROR',
                0
            );
        }
    }
    
    static sendErrorResponse(res, error) {
        let status = 500;
        let errorResponse = {
            success: false,
            error: 'Internal server error'
        };
        
        if (error instanceof RapidoAPIError) {
            switch (error.code) {
                case 'INVALID_TOKEN':
                    status = 401;
                    errorResponse.error = 'Invalid or expired token';
                    break;
                case 'UNAUTHORIZED':
                    status = 401;
                    errorResponse.error = 'Authentication failed';
                    break;
                case 'RATE_LIMITED':
                    status = 429;
                    errorResponse.error = 'Rate limit exceeded. Please try again later.';
                    break;
                case 'NETWORK_ERROR':
                    status = 503;
                    errorResponse.error = 'Authentication service temporarily unavailable';
                    break;
                default:
                    status = error.status || 500;
                    errorResponse.error = error.message;
            }
        }
        
        res.status(status).json(errorResponse);
    }
}

// Usage in routes
app.post('/api/auth/rapido-login', async (req, res) => {
    try {
        // ... authentication logic
    } catch (error) {
        console.error('Authentication error:', error);
        ErrorHandler.sendErrorResponse(res, error);
    }
});
```

## Testing Examples

## Session Management Integration Examples

### Complete Frontend + Backend Session Flow

```javascript
// Frontend session management with Rapido JSBridge
class RapidoSessionManager {
    constructor() {
        this.setupCallbacks();
    }
    
    setupCallbacks() {
        // Set up session ID callback
        window.JSBridge.onSessionIdReceived = (sessionId) => {
            if (sessionId && sessionId !== 'null') {
                console.log('Stored session found');
                this.validateSession(sessionId);
            } else {
                console.log('No stored session - requesting authentication');
                this.requestAuthentication();
            }
        };
        
        // Set up token callback
        window.JSBridge.onTokenReceived = (token) => {
            this.processAuthToken(token);
        };
    }
    
    // Check for existing session on app load
    checkExistingSession() {
        if (window.NativeJSBridge && window.NativeJSBridge.requestSessionId) {
            window.NativeJSBridge.requestSessionId();
        } else {
            this.requestAuthentication();
        }
    }
    
    async validateSession(sessionId) {
        try {
            const response = await fetch('/api/auth/validate-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
            });
            
            const result = await response.json();
            
            if (result.valid) {
                this.redirectToDashboard();
            } else {
                // Session expired - clear and request new auth
                this.clearSession();
                this.requestAuthentication();
            }
        } catch (error) {
            console.error('Session validation failed:', error);
            this.requestAuthentication();
        }
    }
    
    requestAuthentication() {
        if (window.NativeJSBridge && window.NativeJSBridge.requestUserToken) {
            window.NativeJSBridge.requestUserToken({ scope: ["profile"] });
        }
    }
    
    async processAuthToken(token) {
        try {
            const response = await fetch('/api/auth/rapido-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Store session ID securely
                this.storeSession(result.sessionId);
                
                // Notify native app
                if (window.NativeJSBridge && window.NativeJSBridge.updateLoginStatus) {
                    window.NativeJSBridge.updateLoginStatus(true, null);
                }
                
                this.redirectToDashboard();
            } else {
                throw new Error(result.error || 'Authentication failed');
            }
        } catch (error) {
            console.error('Authentication failed:', error);
            
            // Notify native app of failure
            if (window.NativeJSBridge && window.NativeJSBridge.updateLoginStatus) {
                window.NativeJSBridge.updateLoginStatus(false, error.message);
            }
        }
    }
    
    storeSession(sessionId) {
        if (window.NativeJSBridge && window.NativeJSBridge.storeSessionId) {
            const result = window.NativeJSBridge.storeSessionId(sessionId);
            if (result === 'SUCCESS') {
                console.log('Session stored successfully');
            }
        }
    }
    
    clearSession() {
        if (window.NativeJSBridge && window.NativeJSBridge.clearUserToken) {
            window.NativeJSBridge.clearUserToken();
        }
    }
    
    redirectToDashboard() {
        window.location.href = '/dashboard';
    }
}

// Initialize session manager
const sessionManager = new RapidoSessionManager();

// Check for existing session on page load
document.addEventListener('DOMContentLoaded', () => {
    sessionManager.checkExistingSession();
});
```

### Backend Session Validation with Cleanup

```javascript
// Enhanced session service with automatic cleanup
class SessionService {
    static generateSessionId() {
        return crypto.randomBytes(32).toString('hex');
    }
    
    static async createSession(userId, metadata = {}) {
        const sessionId = this.generateSessionId();
        const expiresAt = new Date(Date.now() + config.session.expiry);
        
        // Clean up any existing sessions for this user
        await Session.deleteMany({ 
            userId,
            expiresAt: { $lt: new Date() }
        });
        
        const session = new Session({
            sessionId,
            userId,
            expiresAt,
            metadata,
            lastAccessedAt: new Date(),
            userAgent: metadata.userAgent || 'Unknown',
            ipAddress: metadata.ipAddress || 'Unknown'
        });
        
        await session.save();
        
        // Schedule cleanup job
        this.scheduleSessionCleanup(sessionId, expiresAt);
        
        return {
            sessionId,
            expiresAt
        };
    }
    
    static async validateSession(sessionId) {
        const session = await Session.findOne({ 
            sessionId,
            expiresAt: { $gt: new Date() }
        }).populate('user');
        
        if (session) {
            // Update last accessed time
            session.lastAccessedAt = new Date();
            await session.save();
            
            return {
                valid: true,
                userId: session.userId,
                user: session.user,
                metadata: session.metadata
            };
        } else {
            // Clean up expired session
            await Session.deleteOne({ sessionId });
            return { valid: false };
        }
    }
    
    static async deleteSession(sessionId) {
        await Session.deleteOne({ sessionId });
    }
    
    static async cleanupExpiredSessions() {
        const result = await Session.deleteMany({
            expiresAt: { $lt: new Date() }
        });
        
        console.log(`Cleaned up ${result.deletedCount} expired sessions`);
        return result.deletedCount;
    }
    
    static scheduleSessionCleanup(sessionId, expiresAt) {
        const timeUntilExpiry = expiresAt.getTime() - Date.now();
        
        setTimeout(async () => {
            await this.deleteSession(sessionId);
            console.log(`Auto-cleaned expired session: ${sessionId}`);
        }, timeUntilExpiry);
    }
}

// Enhanced session validation route
app.post('/api/auth/validate-session', async (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (!sessionId) {
            return res.json({ valid: false });
        }
        
        const validation = await SessionService.validateSession(sessionId);
        
        if (validation.valid) {
            res.json({
                valid: true,
                userId: validation.userId,
                user: {
                    id: validation.user._id,
                    name: validation.user.name,
                    email: validation.user.email
                }
            });
        } else {
            res.json({ valid: false });
        }
        
    } catch (error) {
        console.error('Session validation error:', error);
        res.json({ valid: false });
    }
});

// Session cleanup cron job (run every hour)
const cron = require('node-cron');

cron.schedule('0 * * * *', async () => {
    try {
        await SessionService.cleanupExpiredSessions();
    } catch (error) {
        console.error('Session cleanup error:', error);
    }
});
```

### Unit Tests (Jest)

```javascript
const RapidoAPIClient = require('../src/services/RapidoAPIClient');
const axios = require('axios');

jest.mock('axios');
const mockedAxios = axios;

describe('RapidoAPIClient', () => {
    let client;
    
    beforeEach(() => {
        client = new RapidoAPIClient({
            apiKey: 'test-api-key',
            clientId: 'test-client-id',
            baseURL: 'https://test-api.rapido.bike/partner'
        });
    });
    
    afterEach(() => {
        jest.clearAllMocks();
    });
    
    describe('validateToken', () => {
        it('should successfully validate a valid token', async () => {
            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        valid: true,
                        user: {
                            id: 'user_123',
                            name: 'John Doe',
                            email: 'john@example.com'
                        }
                    }
                }
            };
            
            mockedAxios.post.mockResolvedValue(mockResponse);
            
            const result = await client.validateToken('valid-token');
            
            expect(result.success).toBe(true);
            expect(result.data.valid).toBe(true);
            expect(result.data.user.id).toBe('user_123');
            
            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/fetch-user-details',
                {
                    token: 'valid-token'
                },
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'x-client-id': 'test_client_id'
                    })
                })
            );
        });
        
        it('should handle invalid token error', async () => {
            const mockError = {
                response: {
                    status: 401,
                    data: {
                        success: false,
                        error: {
                            code: 'INVALID_TOKEN',
                            message: 'Token is invalid or expired'
                        }
                    }
                }
            };
            
            mockedAxios.post.mockRejectedValue(mockError);
            
            await expect(client.validateToken('invalid-token'))
                .rejects
                .toThrow('Token is invalid or expired');
        });
        
        it('should handle network errors', async () => {
            const mockError = {
                request: {}
            };
            
            mockedAxios.post.mockRejectedValue(mockError);
            
            await expect(client.validateToken('some-token'))
                .rejects
                .toThrow('Network error: Unable to reach Rapido API');
        });
    });
});
```

---

**Related Documentation**:
- [API Overview](./overview.md) - Complete API documentation
- [Token Validation API](./token-validation.md) - Detailed endpoint specifications
- [Integration Basics](../integration/basics.md) - Frontend integration guide