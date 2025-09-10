---
title: "Events Tracking"
sidebar_label: "Events Tracking"
sidebar_position: 3
---

# Events Tracking Integration

Rapido provides two complementary event tracking mechanisms to give you complete visibility into user interactions and business events across your PWA integration.

## Overview

| **Event Flow** | **Use Case** | **Triggered By** | **Data Flow** |
|----------------|--------------|------------------|---------------|
| **PWA to Native** | Real-time user interactions, analytics | User actions in PWA | PWA → Rapido App → Analytics |
| **Server to Server** | Business events, order lifecycle | Backend business logic | Partner Server → Rapido Server |

Both flows work together to provide comprehensive event tracking for your integration.

---

## PWA to Native Events

### Purpose
Track real-time user interactions, page views, and custom analytics events directly from your PWA to the Rapido mobile app.

### When to Use
- User interaction tracking (clicks, form submissions)
- Page view analytics
- Feature usage metrics
- Real-time user behavior analysis
- Custom analytics events

### Implementation

#### Method: `logEvents(eventType, propertiesJson)`

```javascript
// Track user action
function trackUserAction(actionName, additionalData = {}) {
    const properties = {
        action_name: actionName,
        timestamp: new Date().toISOString(),
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        ...additionalData
    };
    
    if (window.NativeJSBridge && window.NativeJSBridge.logEvents) {
        window.NativeJSBridge.logEvents('user_action', JSON.stringify(properties));
    }
}

// Track page view
function trackPageView() {
    const properties = {
        page_name: document.title,
        page_url: window.location.href,
        referrer: document.referrer,
        timestamp: new Date().toISOString(),
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight
    };
    
    window.NativeJSBridge.logEvents('page_view', JSON.stringify(properties));
}

// Track business event
function trackBusinessEvent(eventType, businessData) {
    const properties = {
        event_type: eventType,
        timestamp: new Date().toISOString(),
        session_id: getCurrentSessionId(),
        ...businessData
    };
    
    window.NativeJSBridge.logEvents('business_event', JSON.stringify(properties));
}
```

#### Event Types and Examples

```javascript
// User engagement events
trackUserAction('search_performed', {
    search_query: 'flights to bangalore',
    results_count: 45,
    search_filters: ['economy', 'direct_flights']
});

// Conversion events
trackBusinessEvent('booking_initiated', {
    service_type: 'flight',
    origin: 'DEL',
    destination: 'BLR',
    departure_date: '2024-02-15',
    estimated_price: 5500
});

// Feature usage
trackUserAction('filter_applied', {
    filter_type: 'price_range',
    min_price: 2000,
    max_price: 8000
});
```

#### Error Handling

```javascript
function safeLogEvent(eventType, properties) {
    try {
        if (!window.NativeJSBridge) {
            console.warn('Running outside Rapido app - event not logged');
            return false;
        }
        
        if (typeof window.NativeJSBridge.logEvents !== 'function') {
            console.error('logEvents method not available');
            return false;
        }
        
        if (!eventType || typeof eventType !== 'string') {
            throw new Error('eventType must be a non-empty string');
        }
        
        const propertiesJson = JSON.stringify(properties || {});
        window.NativeJSBridge.logEvents(eventType, propertiesJson);
        
        return true;
        
    } catch (error) {
        console.error('Failed to log event:', error);
        // Optional: Store for later retry
        storeEventForLater(eventType, properties);
        return false;
    }
}
```

#### Best Practices

- **Event Naming**: Use consistent naming conventions (e.g., snake_case)
- **Property Structure**: Keep properties flat and avoid deeply nested objects
- **Data Size**: Limit property objects to avoid large JSON strings
- **Error Handling**: Always wrap in try-catch and provide fallbacks
- **Timestamp**: Include timestamps for accurate event sequencing
- **User Context**: Add session and user context when available

---

## Server to Server Events

### Purpose
Track business-critical events, order lifecycle, and backend business logic events from your server to Rapido's analytics and business intelligence systems.

### When to Use
- Order confirmations and status updates
- Payment processing events
- Booking lifecycle tracking
- Business KPI events
- Integration health monitoring

### API Endpoint

**Method**: `POST`  
**URL**: `https://<rapido-host-url>/api/ota/event`

### Authentication & Headers

```http
POST /api/ota/event HTTP/1.1
Host: <rapido-host-url>
Content-Type: application/json
x-client-id: your-client-id
x-client-service: flights/hotels
x-client-app-id: your-app-id
authorization: your-client-key
```

### Request Schema

#### Base Event Structure

```json
{
  "userId": "user_id_from_rapido",
  "event": {
    "type": "order.confirmed",
    "id": "evt_unique_event_id"
  },
  "attributes": {
    // Service-specific attributes
  },
  "schemaVersion": 1
}
```

#### Flight Booking Events

```json
{
  "userId": "rapido_user_12345",
  "event": {
    "type": "order.confirmed",
    "id": "evt_flight_confirm_789"
  },
  "attributes": {
    "orderId": "FL_BOOKING_ABC123",
    "orderStatus": "CONFIRMED",
    "amount_total": 8500,
    "location_origin_lat": 28.5562,
    "location_origin_long": 77.1000,
    "location_dest_lat": 12.9716,
    "location_dest_long": 77.5946,
    "start_time": 1708156800,
    "end_time": 1708163000,
    "hostStatus": "CONFIRMED",
    "tz": "Asia/Kolkata"
  },
  "schemaVersion": 1
}
```

#### Hotel Booking Events

```json
{
  "userId": "rapido_user_12345",
  "event": {
    "type": "order.confirmed",
    "id": "evt_hotel_confirm_456"
  },
  "attributes": {
    "orderId": "HTL_BOOKING_XYZ789",
    "orderStatus": "CONFIRMED",
    "amount_total": 12000,
    "location_origin_lat": 28.6139,
    "location_origin_long": 77.2090,
    "location_dest_lat": 28.6139,
    "location_dest_long": 77.2090,
    "start_time": 1708156800,
    "end_time": 1708415200,
    "hostStatus": "CONFIRMED",
    "tz": "Asia/Kolkata"
  },
  "schemaVersion": 1
}
```

### Event Types

| **Event Type** | **Description** | **When to Send** |
|----------------|-----------------|------------------|
| `order.confirmed` | Order successfully confirmed | After successful booking/reservation |
| `order.cancelled` | Order cancelled by user/system | When booking is cancelled |
| `order.modified` | Order details changed | When booking is modified |
| `payment.completed` | Payment successfully processed | After payment confirmation |
| `payment.failed` | Payment processing failed | When payment fails |

### Implementation Examples

#### Node.js Implementation

```javascript
const axios = require('axios');

class RapidoEventClient {
    constructor(clientId, clientKey, serviceType, appId) {
        this.config = {
            clientId,
            clientKey,
            serviceType,
            appId,
            baseURL: '<rapido-host-url>'
        };
    }

    async postEvent(userId, eventType, eventId, attributes) {
        try {
            const eventData = {
                userId: userId,
                event: {
                    type: eventType,
                    id: eventId
                },
                attributes: attributes,
                schemaVersion: 1
            };

            const response = await axios.post(
                `${this.config.baseURL}/api/ota/event`,
                eventData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-client-id': this.config.clientId,
                        'x-client-service': this.config.serviceType,
                        'x-client-app-id': this.config.appId,
                        'authorization': this.config.clientKey
                    }
                }
            );

            if (response.data.success) {
                console.log('Event posted successfully:', response.data.requestId);
                return response.data;
            } else {
                throw new Error(`Event posting failed: ${response.data.error?.message}`);
            }

        } catch (error) {
            console.error('Failed to post event to Rapido:', error);
            throw error;
        }
    }

    // Helper method for flight bookings
    async postFlightBookingEvent(userId, orderId, orderStatus, bookingDetails) {
        const eventId = `evt_flight_${orderId}_${Date.now()}`;
        const attributes = {
            orderId: orderId,
            orderStatus: orderStatus,
            amount_total: bookingDetails.totalAmount,
            location_origin_lat: bookingDetails.origin.lat,
            location_origin_long: bookingDetails.origin.lng,
            location_dest_lat: bookingDetails.destination.lat,
            location_dest_long: bookingDetails.destination.lng,
            start_time: bookingDetails.departureTime,
            end_time: bookingDetails.arrivalTime,
            hostStatus: orderStatus === 'CONFIRMED' ? 'CONFIRMED' : 'CANCELLED',
            tz: bookingDetails.timezone || 'Asia/Kolkata'
        };

        return await this.postEvent(userId, 'order.confirmed', eventId, attributes);
    }

    // Helper method for hotel bookings
    async postHotelBookingEvent(userId, orderId, orderStatus, bookingDetails) {
        const eventId = `evt_hotel_${orderId}_${Date.now()}`;
        const attributes = {
            orderId: orderId,
            orderStatus: orderStatus,
            amount_total: bookingDetails.totalAmount,
            location_origin_lat: bookingDetails.hotel.lat,
            location_origin_long: bookingDetails.hotel.lng,
            location_dest_lat: bookingDetails.hotel.lat,
            location_dest_long: bookingDetails.hotel.lng,
            start_time: bookingDetails.checkInTime,
            end_time: bookingDetails.checkOutTime,
            hostStatus: orderStatus === 'CONFIRMED' ? 'CONFIRMED' : 'CANCELLED',
            tz: bookingDetails.timezone || 'Asia/Kolkata'
        };

        return await this.postEvent(userId, 'order.confirmed', eventId, attributes);
    }
}

// Usage example
const rapidoEvents = new RapidoEventClient(
    'your-client-id',
    'your-client-key', 
    'flights',
    'your-app-id'
);

// Post flight booking confirmation
async function handleFlightBookingConfirmation(booking) {
    try {
        await rapidoEvents.postFlightBookingEvent(
            booking.rapidoUserId,
            booking.id,
            'CONFIRMED',
            {
                totalAmount: booking.totalPrice,
                origin: booking.originAirport.location,
                destination: booking.destinationAirport.location,
                departureTime: booking.departureTimestamp,
                arrivalTime: booking.arrivalTimestamp,
                timezone: booking.timezone
            }
        );

        console.log('Flight booking event sent to Rapido successfully');
    } catch (error) {
        console.error('Failed to notify Rapido of booking confirmation:', error);
        // Handle error appropriately (retry, alert, etc.)
    }
}
```

#### Python Implementation

```python
import requests
import json
from datetime import datetime
from typing import Dict, Any, Optional

class RapidoEventClient:
    def __init__(self, client_id: str, client_key: str, service_type: str, app_id: str):
        self.config = {
            'client_id': client_id,
            'client_key': client_key,
            'service_type': service_type,
            'app_id': app_id,
            'baseURL: '<rapido-host-url>'
        }
    
    def post_event(self, user_id: str, event_type: str, event_id: str, attributes: Dict[str, Any]) -> Dict[str, Any]:
        """Post an event to Rapido's event API"""
        
        event_data = {
            'userId': user_id,
            'event': {
                'type': event_type,
                'id': event_id
            },
            'attributes': attributes,
            'schemaVersion': 1
        }
        
        headers = {
            'Content-Type': 'application/json',
            'x-client-id': self.config['client_id'],
            'x-client-service': self.config['service_type'],
            'x-client-app-id': self.config['app_id'],
            'authorization': self.config['client_key']
        }
        
        try:
            response = requests.post(
                f"{self.config['base_url']}/api/ota/event",
                json=event_data,
                headers=headers,
                timeout=30
            )
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            print(f"Failed to post event to Rapido: {e}")
            raise
    
    def post_booking_event(self, user_id: str, order_id: str, order_status: str, 
                          service_type: str, booking_details: Dict[str, Any]) -> Dict[str, Any]:
        """Post a booking event (works for both flights and hotels)"""
        
        event_id = f"evt_{service_type}_{order_id}_{int(datetime.now().timestamp())}"
        
        attributes = {
            'orderId': order_id,
            'orderStatus': order_status,
            'amount_total': booking_details['total_amount'],
            'location_origin_lat': booking_details['origin_lat'],
            'location_origin_long': booking_details['origin_lng'],
            'location_dest_lat': booking_details['dest_lat'],
            'location_dest_long': booking_details['dest_lng'],
            'start_time': booking_details['start_time'],
            'end_time': booking_details['end_time'],
            'hostStatus': 'CONFIRMED' if order_status == 'CONFIRMED' else 'CANCELLED',
            'tz': booking_details.get('timezone', 'Asia/Kolkata')
        }
        
        return self.post_event(user_id, 'order.confirmed', event_id, attributes)

# Usage example
rapido_client = RapidoEventClient(
    client_id='your-client-id',
    client_key='your-client-key',
    service_type='flights',
    app_id='your-app-id'
)

def handle_booking_confirmation(booking_data):
    try:
        result = rapido_client.post_booking_event(
            user_id=booking_data['rapido_user_id'],
            order_id=booking_data['booking_id'],
            order_status='CONFIRMED',
            service_type='flight',
            booking_details={
                'total_amount': booking_data['total_price'],
                'origin_lat': booking_data['origin']['latitude'],
                'origin_lng': booking_data['origin']['longitude'],
                'dest_lat': booking_data['destination']['latitude'],
                'dest_lng': booking_data['destination']['longitude'],
                'start_time': booking_data['departure_timestamp'],
                'end_time': booking_data['arrival_timestamp'],
                'timezone': booking_data.get('timezone', 'Asia/Kolkata')
            }
        )
        
        if result.get('success'):
            print(f"Event posted successfully: {result['requestId']}")
        else:
            print(f"Event posting failed: {result.get('error', {}).get('message')}")
            
    except Exception as e:
        print(f"Failed to post booking event: {e}")
        # Handle error appropriately
```

### Response Handling

#### Success Response (HTTP 200)

```json
{
  "success": true,
  "code": 7000,
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_123456789"
}
```

#### Error Responses

| **HTTP Status** | **Description** | **Action Required** |
|-----------------|-----------------|-------------------|
| 400 | Bad Request - Invalid data format | Fix request payload |
| 401 | Unauthorized - Invalid credentials | Check API keys |
| 429 | Too Many Requests - Rate limited | Implement exponential backoff |
| 499 | Client Closed Request - Request timeout | Retry with proper timeout |
| 500 | Internal Server Error | Retry after delay |

#### Error Response Format

```json
{
  "success": false,
  "code": 7001,
  "error": {
    "message": "Human-readable error description",
    "details": {
      "field": "Additional context if applicable"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_123456789"
}
```

### Best Practices

#### Event Design
- **Unique Event IDs**: Generate unique event IDs to prevent duplicates
- **Consistent Timestamps**: Use Unix timestamps for time fields
- **Required Fields**: Always include all mandatory attributes
- **Event Naming**: Use clear, consistent event type naming

#### Error Handling & Reliability
- **Retry Logic**: Implement exponential backoff for transient failures
- **Queue Events**: Queue events locally for reliability during outages
- **Monitoring**: Log and monitor event posting success rates
- **Idempotency**: Design events to be safely retryable

#### Security & Performance
- **API Key Security**: Store API keys securely, rotate regularly
- **Rate Limiting**: Respect rate limits, implement client-side throttling  
- **Payload Size**: Keep event payloads under recommended limits
- **Batch Processing**: Consider batching for high-volume scenarios

---

## Complete Integration Example

### Coordinated Event Tracking

Here's how both event flows work together in a complete booking flow:

```javascript
// Frontend PWA - Track user interactions
class BookingEventTracker {
    constructor() {
        this.sessionId = this.getSessionId();
        this.rapidoEventClient = new RapidoServerEventClient();
    }

    // PWA to Native events
    trackSearchInitiated(searchParams) {
        safeLogEvent('search_initiated', {
            service_type: searchParams.service,
            origin: searchParams.origin,
            destination: searchParams.destination,
            departure_date: searchParams.departureDate,
            return_date: searchParams.returnDate,
            passengers: searchParams.passengers,
            session_id: this.sessionId,
            timestamp: new Date().toISOString()
        });
    }

    trackResultsViewed(resultsData) {
        safeLogEvent('results_viewed', {
            service_type: resultsData.service,
            results_count: resultsData.totalResults,
            filters_applied: resultsData.appliedFilters,
            sort_order: resultsData.sortOrder,
            session_id: this.sessionId,
            timestamp: new Date().toISOString()
        });
    }

    trackBookingInitiated(bookingData) {
        safeLogEvent('booking_initiated', {
            service_type: bookingData.service,
            selected_option_id: bookingData.optionId,
            estimated_price: bookingData.price,
            session_id: this.sessionId,
            timestamp: new Date().toISOString()
        });
    }

    // Coordinate with backend events
    async handleBookingConfirmation(bookingResult) {
        // Track frontend completion
        safeLogEvent('booking_completed', {
            booking_id: bookingResult.bookingId,
            final_price: bookingResult.totalAmount,
            payment_method: bookingResult.paymentMethod,
            session_id: this.sessionId,
            timestamp: new Date().toISOString()
        });

        // Trigger server-to-server event
        try {
            await this.rapidoEventClient.postBookingConfirmation(bookingResult);
        } catch (error) {
            console.error('Failed to post server event:', error);
            // Log failure for monitoring
            safeLogEvent('server_event_failed', {
                booking_id: bookingResult.bookingId,
                error_message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
}

// Backend - Server to Server events
class RapidoServerEventClient {
    constructor() {
        this.client = new RapidoEventClient(
            process.env.RAPIDO_CLIENT_ID,
            process.env.RAPIDO_CLIENT_KEY,
            process.env.SERVICE_TYPE,
            process.env.APP_ID
        );
    }

    async postBookingConfirmation(bookingData) {
        const eventDetails = this.prepareBookingEventData(bookingData);
        
        return await this.client.postFlightBookingEvent(
            bookingData.rapidoUserId,
            bookingData.bookingId,
            'CONFIRMED',
            eventDetails
        );
    }

    prepareBookingEventData(booking) {
        return {
            totalAmount: booking.totalAmount,
            origin: {
                lat: booking.origin.latitude,
                lng: booking.origin.longitude
            },
            destination: {
                lat: booking.destination.latitude, 
                lng: booking.destination.longitude
            },
            departureTime: booking.departureTimestamp,
            arrivalTime: booking.arrivalTimestamp,
            timezone: booking.timezone || 'Asia/Kolkata'
        };
    }
}

// Usage in booking flow
const eventTracker = new BookingEventTracker();

// User searches for flights
eventTracker.trackSearchInitiated({
    service: 'flight',
    origin: 'DEL',
    destination: 'BLR',
    departureDate: '2024-02-15',
    passengers: 2
});

// User views results
eventTracker.trackResultsViewed({
    service: 'flight',
    totalResults: 45,
    appliedFilters: ['economy', 'morning'],
    sortOrder: 'price_low_high'
});

// User initiates booking
eventTracker.trackBookingInitiated({
    service: 'flight',
    optionId: 'flight_123',
    price: 8500
});

// Booking confirmed - coordinate both event types
eventTracker.handleBookingConfirmation({
    bookingId: 'FL_BOOKING_ABC123',
    rapidoUserId: 'rapido_user_12345',
    totalAmount: 8500,
    paymentMethod: 'credit_card',
    origin: { latitude: 28.5562, longitude: 77.1000 },
    destination: { latitude: 12.9716, longitude: 77.5946 },
    departureTimestamp: 1708156800,
    arrivalTimestamp: 1708163000,
    timezone: 'Asia/Kolkata'
});
```

This coordinated approach ensures:
- **Complete User Journey Tracking**: PWA events capture user interactions and decision-making
- **Business Event Reliability**: Server events ensure critical business events are recorded
- **Data Consistency**: Both flows share common identifiers (session IDs, booking IDs)
- **Failure Resilience**: Frontend events continue even if server events fail

---

**Next Steps**: 
- Review [JavaScript Bridge](./javascript-bridge.md) for detailed PWA event implementation
- Check [API Examples](../api/examples.md) for server-side integration examples
- See [Security Guidelines](../security.md) for event data protection requirements
