// src/server.ts
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { createServer } from 'http'; 
import { Server } from 'socket.io'; 
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

import projectRoutes from './routes/Projects';
import designerRoutes from './routes/Designers';
import uploadRoutes from './routes/Upload';
import adminRoutes from './routes/Admin';
import proposalRoutes from './routes/Proposals';
import Message from './models/Message'; 
import User from './models/User';

dotenv.config();

const app = express();
const httpServer = createServer(app); 
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' })); 

// Test route
app.get('/', (req, res) => {
  res.send('Hudumalink Backend Live 🇰🇪');
});

// Routes
app.use('/api/projects', projectRoutes);
app.use('/api/designers', designerRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/proposals', proposalRoutes);

// Get user by clerkId
app.get('/api/users/:clerkId', async (req, res) => {
  const { clerkId } = req.params;

  try {
    const user = await User.findOne({ clerkId }).lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        roles: user.roles || ['client'],
        designerProfile: user.designerProfile || null,
      },
    });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// === SOCKET.IO REAL-TIME CHAT ===
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Join project room
  socket.on('join_project', (projectId) => {
    socket.join(`project-${projectId}`);
    console.log(`Socket ${socket.id} joined project-${projectId}`);
  });

  // Load past messages
  socket.on('load_messages', async (projectId) => {
    try {
      const messages = await Message.find({ project: projectId })
        .populate('sender', 'name avatar')
        .sort({ createdAt: 1 })
        .limit(50);

      socket.emit('messages_loaded', messages);
    } catch (error) {
      console.error('Load messages error:', error);
    }
  });

  // Send new message
  socket.on('send_message', async (data) => {
    const { projectId, senderId, message } = data;

    if (!message?.trim()) return;

    try {
      const newMessage = new Message({
        project: projectId,
        sender: senderId,
        message: message.trim(),
      });

      await newMessage.save();

      await newMessage.populate('sender', 'name avatar');

      // Broadcast to project room
      io.to(`project-${projectId}`).emit('new_message', newMessage);
    } catch (error) {
      console.error('Send message error:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.io ready for real-time chat`);
});