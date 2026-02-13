// src/routes/users.ts
import express from 'express';
import User from '../models/User';
import { requireAuth } from '../middlewares/auth';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { RequestWithUser } from '../types';


// Memory storage → pipe directly to Cloudinary, no temp files
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB cap
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

function uploadToCloudinary(buffer: Buffer, folder: string, publicId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, overwrite: true, resource_type: 'image' },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error('Cloudinary upload failed'));
        resolve(result.secure_url);
      }
    );
    Readable.from(buffer).pipe(stream);
  });
}

const router = express.Router();

// GET /api/users/mongo-id/:clerkId
router.get('/mongo-id/:clerkId', requireAuth, async (req, res) => {
  try {
    console.log(`[mongo-id] Requested for clerkId: ${req.params.clerkId}`);

    const user = await User.findOne({ clerkId: req.params.clerkId }).select('_id');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      mongoId: user._id.toString()
    });
  } catch (err) {
    console.error('[mongo-id] Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// If you already have /api/users/:clerkId for full user, keep it
router.get('/:clerkId', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ clerkId: req.params.clerkId });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/users/upload-avatar
router.post('/upload-avatar', requireAuth, upload.single('avatar'), async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user)     return res.status(401).json({ success: false, error: 'Unauthorized' });
  if (!req.file) return res.status(400).json({ success: false, error: 'No file provided' });

  try {
    const url = await uploadToCloudinary(
      req.file.buffer,
      'designer-avatars',
      `avatar_${user.clerkId}`   // same public_id = auto-overwrite on re-upload
    );
    await User.findOneAndUpdate({ clerkId: user.clerkId }, { $set: { avatar: url } });
    res.json({ success: true, url });
  } catch (err) {
    console.error('[upload-avatar]', err);
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

// POST /api/users/upload-cover
router.post('/upload-cover', requireAuth, upload.single('cover'), async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user)     return res.status(401).json({ success: false, error: 'Unauthorized' });
  if (!req.file) return res.status(400).json({ success: false, error: 'No file provided' });

  try {
    const url = await uploadToCloudinary(
      req.file.buffer,
      'designer-covers',
      `cover_${user.clerkId}`
    );
    await User.findOneAndUpdate(
      { clerkId: user.clerkId },
      { $set: { 'designerProfile.coverImage': url } }
    );
    res.json({ success: true, url });
  } catch (err) {
    console.error('[upload-cover]', err);
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

export default router;