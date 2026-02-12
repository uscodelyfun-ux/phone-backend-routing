import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());

// Store active phone connections
// Map: username -> socket
const phoneConnections = new Map();

// Map: requestId -> response callback
const pendingRequests = new Map();

console.log('🚀 Phone Backend Routing Service Starting...');

// WebSocket connection from phones
io.on('connection', (socket) => {
  console.log('📱 Device connected:', socket.id);

  // Authenticate phone
  socket.on('authenticate', (data) => {
    const { username, userId } = data;
    
    if (!username) {
      socket.emit('auth_error', { message: 'Username required' });
      return;
    }

    // Store connection
    phoneConnections.set(username, socket);
    socket.username = username;
    socket.userId = userId;
    
    console.log(`✅ Phone authenticated: ${username}`);
    socket.emit('authenticated', { 
      success: true,
      username: username,
      message: 'Connected to routing service'
    });

    // Broadcast online status
    io.emit('phone_status', {
      username: username,
      status: 'online'
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.username) {
      phoneConnections.delete(socket.username);
      console.log(`📴 Phone disconnected: ${socket.username}`);
      
      // Broadcast offline status
      io.emit('phone_status', {
        username: socket.username,
        status: 'offline'
      });
    }
  });

  // Heartbeat
  socket.on('heartbeat', () => {
    socket.emit('heartbeat_ack', { timestamp: Date.now() });
  });

  // Response from phone
  socket.on('api_response', (data) => {
    const { requestId, statusCode, body, error } = data;
    
    const callback = pendingRequests.get(requestId);
    if (callback) {
      callback({ statusCode, body, error });
      pendingRequests.delete(requestId);
    }
  });

  // Data snapshot response
  socket.on('data_snapshot', (data) => {
    const { requestId, snapshot } = data;
    
    const callback = pendingRequests.get(requestId);
    if (callback) {
      callback({ snapshot });
      pendingRequests.delete(requestId);
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    connectedPhones: phoneConnections.size,
    activeRequests: pendingRequests.size,
    uptime: process.uptime()
  });
});

// Check phone status
app.get('/api/phone-status/:username', (req, res) => {
  const { username } = req.params;
  const isOnline = phoneConnections.has(username);
  
  res.json({
    username,
    status: isOnline ? 'online' : 'offline',
    timestamp: new Date().toISOString()
  });
});

// Get data snapshot from phone
app.get('/api/data-snapshot/:username', async (req, res) => {
  const { username } = req.params;
  
  const phoneSocket = phoneConnections.get(username);
  
  if (!phoneSocket) {
    return res.status(503).json({
      error: 'Phone offline',
      message: 'The phone is not connected'
    });
  }

  const requestId = `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Set timeout
  const timeout = setTimeout(() => {
    pendingRequests.delete(requestId);
    res.status(504).json({
      error: 'Timeout',
      message: 'Phone did not respond in time'
    });
  }, 10000);

  // Store callback
  pendingRequests.set(requestId, (response) => {
    clearTimeout(timeout);
    res.json(response.snapshot || {});
  });

  // Send request to phone
  phoneSocket.emit('get_data_snapshot', { requestId });
});

// API endpoint to route requests to phones
app.all('/api/u/:username/*', async (req, res) => {
  const { username } = req.params;
  const path = '/' + req.params[0];
  
  console.log(`📨 Request: ${req.method} ${path} for user ${username}`);
  
  const phoneSocket = phoneConnections.get(username);
  
  if (!phoneSocket) {
    return res.status(503).json({
      error: 'Phone offline',
      message: 'The backend phone is not connected. Please ensure the phone is online.'
    });
  }

  // Generate unique request ID
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Create request object
  const request = {
    id: requestId,
    method: req.method,
    path: path,
    headers: req.headers,
    body: req.body,
    query: req.query
  };

  // Set timeout (30 seconds)
  const timeout = setTimeout(() => {
    pendingRequests.delete(requestId);
    res.status(504).json({
      error: 'Timeout',
      message: 'Phone did not respond in time'
    });
  }, 30000);

  // Store callback
  pendingRequests.set(requestId, (response) => {
    clearTimeout(timeout);
    
    if (response.error) {
      res.status(500).json({ error: response.error });
    } else {
      res.status(response.statusCode || 200).json(response.body);
    }
  });

  // Send request to phone
  phoneSocket.emit('api_request', request);
});

// List all connected phones (admin endpoint)
app.get('/api/phones', (req, res) => {
  const phones = Array.from(phoneConnections.keys()).map(username => ({
    username,
    status: 'online',
    connectedAt: new Date().toISOString()
  }));
  
  res.json({
    count: phones.length,
    phones
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Routing service running on port ${PORT}`);
  console.log(`📱 Ready to accept phone connections`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});
