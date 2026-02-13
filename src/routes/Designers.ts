// backend/src/routes/designers.ts
import express from 'express';
import User from '../models/User';
import Project from '../models/Project';
import { requireAuth } from '../middlewares/auth';
import { RequestWithUser } from '../types';

const router = express.Router();

/**
 * Helper: transform user → public designer shape
 * Now accepts completed projects to include in the response
 */
function transformDesigner(designer: any, completedProjects: any[] = []) {
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
    coverImage:  profile.coverImage  || '',
    tagline:     profile.tagline     || 'Creative Interior Designer & Space Planner',
    location:    profile.location    || 'Nairobi, Kenya',
    about:       profile.about       || '',

    // Stats
    verified:          profile.verified          || false,
    superVerified:     profile.superVerified      || false,
    rating:            profile.rating             || 0,
    reviewCount:       profile.reviewCount        || 0,
    projectsCompleted: profile.projectsCompleted  || 0,

    // Business info
    responseTime: profile.responseTime || 'Not set',
    startingPrice: profile.startingPrice || 0,
    calendlyLink:  profile.calendlyLink  || '',

    // Styles & raw portfolio images (uploaded during application)
    styles:         profile.styles         || [],
    portfolioImages: profile.portfolioImages || [],

    // Social links
    socialLinks: profile.socialLinks || {
      instagram: '',
      pinterest: '',
      website:   '',
    },

    // ✅ Completed projects — full info from the Project collection
    completedProjects: completedProjects.map((p: any) => ({
      _id:         p._id.toString(),
      title:       p.title       || 'Untitled Project',
      description: p.description || '',
      location:    p.location    || '',
      budget:      p.budget      || 0,
      timeline:    p.timeline    || '',
      styles:      p.styles      || [],
      // Use project photos; fall back to empty array
      photos:      p.photos      || [],
      // Convenience: first photo as thumbnail
      thumbnail:   p.photos?.[0] || '',
      completedAt: p.updatedAt   || p.createdAt,
      clientName:  p.client?.name || 'Client',
    })),

    // Reviews
    reviews: (profile.reviews || []).map((review: any) => ({
      _id:         review._id?.toString(),
      clientName:  review.clientName  || 'Anonymous',
      clientAvatar: review.clientAvatar || '',
      rating:      review.rating       || 5,
      comment:     review.comment      || '',
      date:        review.date         || review.createdAt,
      projectImage: review.projectImage || '',
    })),
  };
}

// ─── GET /api/designers ───────────────────────────────────────────────────────
router.get('/', async (_req, res) => {
  try {
    const designers = await User.find({
      roles: 'designer',
      designerProfile: { $ne: null },
      'designerProfile.status': 'approved',
      banned: { $ne: true },
    }).sort({ 'designerProfile.rating': -1, createdAt: -1 });

    // For the list view we don't need full project details — keep it fast
    res.json({
      success: true,
      designers: designers.map(d => transformDesigner(d, [])),
      count: designers.length,
    });
  } catch (error) {
    console.error('Error fetching designers:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch designers' });
  }
});

// ─── GET /api/designers/:id ───────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    console.log(`[designers/:id] Fetching designer: ${req.params.id}`);

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'Designer not found' });
    }
    if (!user.designerProfile) {
      return res.status(404).json({ success: false, error: 'This user is not a designer' });
    }
    if (user.designerProfile.status !== 'approved') {
      return res.status(404).json({ success: false, error: 'Designer profile not approved' });
    }

    // ✅ Fetch completed projects for this designer from the Project collection
    const completedProjects = await Project.find({
      designer: user._id,
      status:   'completed',
    })
      .sort({ updatedAt: -1 })
      .lean();

    console.log(`[designers/:id] Found ${completedProjects.length} completed projects`);

    const transformed = transformDesigner(user, completedProjects);

    res.json({ success: true, designer: transformed });
  } catch (error) {
    console.error('[designers/:id] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch designer' });
  }
});

// ─── PATCH /api/designers/:id ─────────────────────────────────────────────────
router.patch('/:id', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const designerUser = await User.findById(req.params.id);
    if (!designerUser) {
      return res.status(404).json({ success: false, error: 'Designer not found' });
    }

    if (designerUser.clerkId !== user.clerkId && !user.isAdmin) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Fields that live inside designerProfile.*
    const profileFields = [
      'tagline', 'location', 'about', 'responseTime',
      'startingPrice', 'calendlyLink', 'styles', 'coverImage', 'socialLinks',
    ];

    // Fields that live at the top level of the User document
    const topLevelFields = ['avatar'];

    const updates: any = {};

    profileFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[`designerProfile.${field}`] = req.body[field];
      }
    });

    topLevelFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      designer: transformDesigner(updatedUser, []),
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Error updating designer:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

export default router;