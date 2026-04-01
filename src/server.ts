// src/server.ts
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// === FORCE CLEAN MODEL REGISTRATION (Development only) ===
delete (mongoose as any).models.Message;
delete (mongoose as any).models.User;
delete (mongoose as any).models.ChatMessage;

// Clear require cache to prevent stale model loading with ts-node-dev
delete require.cache[require.resolve('./models/Message')];
delete require.cache[require.resolve('./models/User')];

import projectRoutes from './routes/Projects';
import designerRoutes from './routes/Designers';
import uploadRoutes from './routes/Upload';
import adminRoutes from './routes/Admin';
import proposalRoutes from './routes/Proposals';
import reviewRoutes from './routes/reviews';
import userRouter from './routes/users';
import messagesRouter from './routes/messages';
import statsRouter from './routes/stats';
import invitesRouter from './routes/invites';
import inspirationsRouter from './routes/Inspirations';
import paymentRoutes from './routes/payments';

import ChatMessage from './models/Message';   // ← Now importing ChatMessage
import User from './models/User';

const app = express();
const httpServer = createServer(app);

// ====================== CONFIG ======================
const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:5174'];

// Dynamic CORS
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// ====================== SOCKET.IO ======================
const io = new Server(httpServer, {
  cors: { ...corsOptions },
});

// ====================== CLOUDINARY ======================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ====================== MIDDLEWARE ======================
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

// ====================== ROUTES ======================
app.get('/', (req, res) => {
  res.send(`Hudumalink Backend Live 🇰🇪 - ${isProduction ? 'Production' : 'Development'} Mode`);
});

app.use('/api/projects', projectRoutes);
app.use('/api/designers', designerRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/stats', statsRouter);
app.use('/api/invites', invitesRouter);
app.use('/api/inspirations', inspirationsRouter);
app.use('/api/payments', paymentRoutes);

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

// Health check for Render
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    environment: isProduction ? 'production' : 'development',
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// === SOCKET.IO REAL-TIME CHAT ===
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('join_project', (projectId) => {
    socket.join(`project-${projectId}`);
    console.log(`Socket ${socket.id} joined project-${projectId}`);
  });

  // Load messages
  socket.on('load_messages', async (projectId) => {
    try {
      const messages = await ChatMessage.find({ project: projectId })
        .populate('sender', 'name avatar')
        .sort({ createdAt: 1 })
        .limit(100);

      socket.emit('messages_loaded', messages);
      console.log(`Loaded ${messages.length} messages for project ${projectId}`);
    } catch (error) {
      console.error('Load messages error:', error);
    }
  });

  // Send message
  socket.on('send_message', async (data) => {
    const { projectId, senderId, message } = data;

    if (!projectId || !senderId || !message?.trim()) {
      console.warn('Missing required fields:', { projectId, senderId, message: message?.trim() });
      return;
    }

    try {
      const newMessage = new ChatMessage({
        project: projectId,
        sender: senderId,
        message: message.trim(),
      });

      await newMessage.save();
      await newMessage.populate('sender', 'name avatar');

      io.to(`project-${projectId}`).emit('new_message', newMessage);

      console.log(`✅ Message saved and broadcasted for project ${projectId}`);
    } catch (error: any) {
      console.error('Send message error:', error.message || error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// ====================== DATABASE & SERVER START ======================
mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

if (isNaN(PORT)) {
  console.error('❌ Invalid PORT environment variable');
  process.exit(1);
}

// Graceful shutdown for Socket.io on Render
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(async () => {
    console.log('HTTP server closed');
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${isProduction ? 'Production' : 'Development'}`);
  console.log(`📡 Allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`🔌 Socket.io ready for real-time chat`);
});