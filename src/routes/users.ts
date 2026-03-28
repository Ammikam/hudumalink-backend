// backend/src/routes/users.ts 
import express from 'express';
import User from '../models/User';
import { requireAuth } from '../middlewares/auth';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { RequestWithUser } from '../types';

// ─── Multer + Cloudinary setup ───────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
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

// ─── GET /api/users/me ────────────────────────────────────────────────────────
// Used by the admin panel's ProtectedAdminRoute to verify admin role
router.get('/me', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  res.json({
    success: true,
    user: {
      id: user._id,
      roles: user.roles || ['client'],
    },
  });
});

// ─── PATCH /api/users/update-profile ─────────────────────────────────────────
router.patch('/update-profile', requireAuth, async (req: RequestWithUser, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { location, phone, bio } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          ...(location !== undefined && { location }),
          ...(phone !== undefined && { phone }),
          ...(bio !== undefined && { bio }),
        },
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        location: updatedUser.location,
        phone: updatedUser.phone,
        bio: updatedUser.bio,
      },
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// ─── GET /api/users/profile ───────────────────────────────────────────────────
router.get('/profile', requireAuth, async (req: RequestWithUser, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const userProfile = await User.findById(user._id).select(
      'name email clerkId location phone bio avatar roles createdAt'
    );

    if (!userProfile) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, user: userProfile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// ─── GET /api/users/mongo-id/:clerkId ────────────────────────────────────────
router.get('/mongo-id/:clerkId', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ clerkId: req.params.clerkId }).select('_id');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, mongoId: user._id.toString() });
  } catch (err) {
    console.error('[mongo-id] Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /api/users/designer-status ──────────────────────────────────────────
router.get('/designer-status', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });


  try {
    //  Ban check — must be first, before anything else
    if (user.banned) {
      return res.status(403).json({
        success: false,
        banned: true,
        reason: user.banReason || 'Your account has been banned. Contact support to appeal.',
      });
    }

    // Not a designer
    if (!user.roles.includes('designer') || !user.designerProfile) {
      return res.json({ success: true, status: 'none' });
    }

    const status = user.designerProfile.status || 'pending';

    res.json({
      success: true,
      status,
      // Return suspend reason so the frontend SuspendedPage can display it
      reason: status === 'suspended'
        ? (user.designerProfile.rejectionReason || null)
        : null,
      rejectionReason: user.designerProfile.rejectionReason,
    });
  } catch (err) {
    console.error('[designer-status]', err);
    res.status(500).json({ success: false, error: 'Failed to check status' });
  }
});

// ─── POST /api/users/apply-designer ──────────────────────────────────────────
router.post('/apply-designer', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  // Banned users cannot apply
  if (user.banned) {
    return res.status(403).json({
      success: false,
      banned: true,
      error: 'Your account has been banned.',
    });
  }

  try {
    const {
      idNumber, location, about, styles, startingPrice,
      responseTime, portfolioImages, references, calendlyLink, socialLinks,
    } = req.body;

    if (!idNumber?.trim()) {
      return res.status(400).json({ success: false, error: 'National ID number is required' });
    }
    if (!location?.trim() || !about?.trim() || !Array.isArray(styles) || styles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: location, about, and at least one style',
      });
    }
    if (!Array.isArray(portfolioImages) || portfolioImages.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'At least 3 portfolio images are required',
      });
    }
    if (!Array.isArray(references) || references.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 professional references are required',
      });
    }

    if (user.roles.includes('designer') && user.designerProfile) {
      const status = user.designerProfile.status;
      if (status === 'pending') {
        return res.status(400).json({ success: false, error: 'You already have a pending application' });
      }
      if (status === 'approved') {
        return res.status(400).json({ success: false, error: 'You are already an approved designer' });
      }
    }

    const updates: any = {};
    if (!user.roles.includes('designer')) {
      updates.$addToSet = { roles: 'designer' };
    }

    updates.$set = {
      'designerProfile.status': 'pending',
      'designerProfile.idNumber': idNumber.trim(),
      'designerProfile.location': location.trim(),
      'designerProfile.about': about.trim(),
      'designerProfile.styles': styles,
      'designerProfile.startingPrice': Number(startingPrice) || 250000,
      'designerProfile.responseTime': responseTime || 'Within 24 hours',
      'designerProfile.portfolioImages': portfolioImages.filter((url: string) => url?.trim()),
      'designerProfile.references': references.filter((ref: any) =>
        ref.name?.trim() && ref.email?.trim() && ref.relation?.trim()
      ),
      'designerProfile.calendlyLink': calendlyLink?.trim() || '',
      'designerProfile.socialLinks': socialLinks || {},
      'designerProfile.rating': 0,
      'designerProfile.reviewCount': 0,
      'designerProfile.projectsCompleted': 0,
      'designerProfile.verified': false,
      'designerProfile.superVerified': false,
      'designerProfile.reviews': [],
      'designerProfile.credentials': [],
    };

    const updated = await User.findByIdAndUpdate(user._id, updates, { new: true, runValidators: true });

    if (!updated) return res.status(404).json({ success: false, error: 'User not found' });

    res.json({ success: true, message: 'Designer application submitted successfully', user: updated });
  } catch (err: any) {
    console.error('[apply-designer]', err);
    res.status(500).json({ success: false, error: 'Failed to submit application', details: err.message });
  }
});

// ─── GET /api/users/:clerkId ─────────────────────────────────────────────────
router.get('/:clerkId', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ clerkId: req.params.clerkId });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST /api/users/upload-avatar ───────────────────────────────────────────
router.post('/upload-avatar', requireAuth, upload.single('avatar'), async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user)     return res.status(401).json({ success: false, error: 'Unauthorized' });
  if (!req.file) return res.status(400).json({ success: false, error: 'No file provided' });

  try {
    const url = await uploadToCloudinary(req.file.buffer, 'designer-avatars', `avatar_${user.clerkId}`);
    await User.findByIdAndUpdate(user._id, { $set: { avatar: url } });
    res.json({ success: true, url });
  } catch (err) {
    console.error('[upload-avatar]', err);
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

// ─── POST /api/users/upload-cover ────────────────────────────────────────────
router.post('/upload-cover', requireAuth, upload.single('cover'), async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user)     return res.status(401).json({ success: false, error: 'Unauthorized' });
  if (!req.file) return res.status(400).json({ success: false, error: 'No file provided' });

  try {
    const url = await uploadToCloudinary(req.file.buffer, 'designer-covers', `cover_${user.clerkId}`);
    await User.findByIdAndUpdate(user._id, { $set: { 'designerProfile.coverImage': url } });
    res.json({ success: true, url });
  } catch (err) {
    console.error('[upload-cover]', err);
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

export default router;