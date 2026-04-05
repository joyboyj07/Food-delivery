const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const cors   = require('cors');
const path   = require('path');
require('dotenv').config();

const { connectDB } = require('./config/db');
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/restaurants', require('./routes/restaurants'));
app.use('/api/orders',      require('./routes/orders'));
app.use('/api/cart',        require('./routes/cart'));

// Socket.io — real-time order tracking
io.on('connection', (socket) => {
  socket.on('join_order', (orderId) => socket.join(`order_${orderId}`));
  socket.on('update_order_status', async (data) => {
    io.to(`order_${data.orderId}`).emit('order_status_update', data);
  });
  socket.on('disconnect', () => {});
});

// Make io accessible in routes
app.set('io', io);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`\n🍕 QuickBite running at http://localhost:${PORT}`);
    console.log(`📡 API at http://localhost:${PORT}/api`);
  });
});
