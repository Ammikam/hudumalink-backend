// backend/routes/designers.ts
import express from 'express';
import User from '../models/User';
import { requireAuth } from '../middlewares/auth';
import { RequestWithUser } from '../types';

const router = express.Router();

/**
 * Helper: transform user → public designer shape
 */
function transformDesigner(designer: any) {
  const d = designer.toObject ? designer.toObject() : designer;
  const profile = d.designerProfile || {};

  return {
    _id: d._id,
    id: d._id.toString(),
    clerkId: d.clerkId,
    name: d.name,
    email: d.email,
    phone: d.phone,
    avatar: d.avatar || profile.avatar || '',
    
    // Profile fields
    coverImage: profile.coverImage || '',
    tagline: profile.tagline || 'Creative Interior Designer & Space Planner',
    location: profile.location || 'Nairobi, Kenya',
    about: profile.about || '',
    
    // Stats
    verified: profile.verified || false,
    superVerified: profile.superVerified || false,
    rating: profile.rating || 0,
    reviewCount: profile.reviewCount || 0,
    projectsCompleted: profile.projectsCompleted || 0,
    
    // Business info
    responseTime: profile.responseTime || 'Not set',
    startingPrice: profile.startingPrice || 0,
    calendlyLink: profile.calendlyLink || '',
    
    // Arrays
    styles: profile.styles || [],
    portfolioImages: profile.portfolioImages || [],
    
    // Social links
    socialLinks: profile.socialLinks || {
      instagram: '',
      pinterest: '',
      website: '',
    },
    
    // Reviews - now properly included
    reviews: (profile.reviews || []).map((review: any) => ({
      _id: review._id?.toString(),
      clientName: review.clientName || 'Anonymous',
      clientAvatar: review.clientAvatar || '',
      rating: review.rating || 5,
      comment: review.comment || '',
      date: review.date || review.createdAt,
      projectImage: review.projectImage || '',
    })),
  };
}

/**
 * GET /api/designers
 * Public - approved & not banned designers
 */
router.get('/', async (_req, res) => {
  try {
    const designers = await User.find({
      roles: 'designer',
      designerProfile: { $ne: null },
      'designerProfile.status': 'approved',
      banned: { $ne: true },
    }).sort({ 'designerProfile.rating': -1, createdAt: -1 });

    res.json({
      success: true,
      designers: designers.map(transformDesigner),
      count: designers.length,
    });
  } catch (error) {
    console.error('Error fetching designers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch designers',
    });
  }
});

/**
 * GET /api/designers/:id
 * Public/Auth - single designer by MongoDB _id
 * Now properly returns the complete designer object with reviews
 */
router.get('/:id', async (req, res) => {
  try {
    console.log(`[designers/:id] Fetching designer with ID: ${req.params.id}`);

    const user = await User.findById(req.params.id);

    if (!user) {
      console.log(`[designers/:id] User not found for ID: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        error: 'Designer not found',
      });
    }

    if (!user.designerProfile) {
      console.log(`[designers/:id] User has no designer profile`);
      return res.status(404).json({
        success: false,
        error: 'This user is not a designer',
      });
    }

    if (user.designerProfile.status !== 'approved') {
      console.log(`[designers/:id] Designer not approved, status: ${user.designerProfile.status}`);
      return res.status(404).json({
        success: false,
        error: 'Designer profile not approved',
      });
    }

    const transformed = transformDesigner(user);
    console.log(`[designers/:id] Successfully transformed designer:`, {
      id: transformed._id,
      name: transformed.name,
      reviewCount: transformed.reviews.length,
      portfolioCount: transformed.portfolioImages.length,
    });

    res.json({
      success: true,
      designer: transformed,
    });
  } catch (error) {
    console.error('[designers/:id] Error fetching designer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch designer',
    });
  }
});

/**
 * PATCH /api/designers/:id
 * Auth required - update own designer profile
 */
router.patch('/:id', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const designerUser = await User.findById(req.params.id);

    if (!designerUser) {
      return res.status(404).json({ success: false, error: 'Designer not found' });
    }

    // Only allow updating own profile (unless admin)
    if (designerUser.clerkId !== user.clerkId && !user.isAdmin) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const allowedUpdates = [
      'tagline',
      'location',
      'about',
      'responseTime',
      'startingPrice',
      'calendlyLink',
      'styles',
      'coverImage',
      'socialLinks',
    ];

    const updates: any = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[`designerProfile.${field}`] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update',
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      designer: transformDesigner(updatedUser),
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Error updating designer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
    });
  }
});

export default router;