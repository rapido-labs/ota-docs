---
sidebar_position: 4
---
# API Reference

## Get Token for User

- **Method:** POST  
- **URL:** `https://partner-api.rapido.bike/ota/fetch-user-token`  
- **Headers:**
```json
{
  "x-consumer-userId": "rapido-user-id"
}
Body
{
  "client": "client-id"
}
Response
{
  "token": "some-encrypted-token-A"
}
```

```
Get User Details for Token
Method: POST
URL: https://partner-api.rapido.bike/ota/fetch-user-details
Headers:
{
  "x-client-id": "client-id"
}
Body:
{
  "token": "some-encrypted-token-A"
}
Response Success
{
  "valid": true,
  "details": {
    "name": "RapidoUser",
    "mobile": "9876543210"
  }
}
Response Failure
{
  "valid": false,
  "code": 7001
}
```