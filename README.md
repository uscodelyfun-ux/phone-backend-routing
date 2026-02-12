# 🔄 Routing Service

WebSocket-based routing service that connects phones to API clients.

## 🎯 Purpose

Routes HTTP API requests to the correct phone via WebSocket connections.

## 🚀 Quick Deploy

### Railway (Recommended)

```bash
1. Push this folder to GitHub
2. Go to railway.app
3. New Project → Deploy from GitHub
4. Select repo
5. Deploy!
```

### Render

```bash
1. Push to GitHub
2. Go to render.com
3. New Web Service
4. Connect repo
5. Start Command: node server.js
6. Deploy
```

### Local Development

```bash
npm install
node server.js

# Server runs on http://localhost:3001
```

## 📡 Endpoints

### Public Endpoints

```
GET  /health
GET  /api/u/:username/*
POST /api/u/:username/*
PATCH /api/u/:username/*
DELETE /api/u/:username/*
```

### Admin Endpoints

```
GET /api/phone-status/:username
GET /api/data-snapshot/:username
GET /api/phones
```

## 🔌 WebSocket Events

### From Phone

```javascript
authenticate: { username, userId }
heartbeat: {}
api_response: { requestId, statusCode, body }
data_snapshot: { requestId, snapshot }
```

### To Phone

```javascript
authenticated: { success, username }
api_request: { id, method, path, headers, body }
get_data_snapshot: { requestId }
heartbeat_ack: { timestamp }
```

## ✅ Health Check

```bash
curl http://localhost:3001/health

# Response:
{
  "status": "ok",
  "connectedPhones": 0,
  "activeRequests": 0,
  "uptime": 123.45
}
```

## 🧪 Testing

```bash
# Check phone status
curl http://localhost:3001/api/phone-status/testuser

# List all phones
curl http://localhost:3001/api/phones
```

## 🔧 Environment Variables

```bash
PORT=3001  # Optional, defaults to 3001
```

## 📊 Monitoring

The service logs:
- Phone connections/disconnections
- API requests
- Errors

Example output:
```
🚀 Routing service running on port 3001
📱 Device connected: abc123
✅ Phone authenticated: testuser
📨 Request: GET /todos for user testuser
✅ 200
```

## 🐛 Troubleshooting

**Phones won't connect:**
- Check WebSocket support
- Verify CORS settings
- Check firewall rules

**Requests timeout:**
- Verify phone is connected
- Check phone is processing requests
- Increase timeout if needed

**High latency:**
- Deploy closer to phones
- Check network speed
- Enable compression

## 🎯 Production Tips

1. **Use a reverse proxy** (nginx)
2. **Enable SSL** (Let's Encrypt)
3. **Add rate limiting**
4. **Monitor with PM2 or similar**
5. **Set up logging** (Winston)
6. **Use Redis** for multi-instance scaling

## 📝 Notes

- Supports multiple phones
- Handles reconnections
- Request/response mapping
- Timeout handling
- Error handling
