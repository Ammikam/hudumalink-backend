import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { v2 as cloudinary } from 'cloudinary';

import dotenv from 'dotenv';
import projectRoutes from './routes/Projects';
import designerRoutes from './routes/Designers';
import uploadRoutes from './routes/Upload';
import adminRoutes from './routes/Admin';
import User from './models/User';
dotenv.config();



const app = express();


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
app.use(express.json({ limit: '50mb' })); // for large image uploads

// Test route
app.get('/', (req, res) => {
  res.send('Hudumalink Backend Live 🇰🇪');
});


app.use('/api/projects', projectRoutes);
app.use('/api/designers', designerRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);

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


app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});