// backend/src/routes/inspirations.ts
import express from 'express';
import Inspiration from '../models/Inspiration';
import User from '../models/User';
import { requireAuth } from '../middlewares/auth';
import { RequestWithUser } from '../types';

const router = express.Router();

// ─── GET /api/inspirations (Public feed with personalization) ────────────────
router.get('/', async (req, res) => {
  try {
    const { styles, search, page = 1, limit = 20, userId } = req.query;
    
    const query: any = { status: 'published' };
    
    // Filter by styles
    if (styles && typeof styles === 'string') {
      const styleArray = styles.split(',').map(s => s.trim());
      if (styleArray.length > 0 && styleArray[0] !== 'All') {
        query.styles = { $in: styleArray };
      }
    }
    
    // Search
    if (search && typeof search === 'string') {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    
    // Fetch inspirations with designer details
    const inspirations = await Inspiration.find(query)
      .populate('designer', 'name avatar designerProfile')
      .sort({ createdAt: -1 }) // Most recent first
      .skip(skip)
      .limit(Number(limit))
      .lean();
    
    // Transform for frontend
    const transformed = inspirations.map((insp: any) => ({
      _id: insp._id,
      id: insp._id.toString(),
      title: insp.title,
      description: insp.description,
      beforeImage: insp.beforeImage,
      afterImage: insp.afterImage,
      image: insp.beforeImage, // Fallback for compatibility
      style: insp.styles[0] || 'Modern', // Primary style
      styles: insp.styles,
      location: insp.location,
      projectCost: insp.projectCost,
      designerName: insp.designer?.name || 'Designer',
      designerId: insp.designer?._id?.toString(),
      designerAvatar: insp.designer?.avatar,
      verified: insp.designer?.designerProfile?.verified || false,
      likes: insp.likes,
      views: insp.views,
      createdAt: insp.createdAt,
    }));
    
    const total = await Inspiration.countDocuments(query);
    
    res.json({
      success: true,
      inspirations: transformed,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('[GET /inspirations] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch inspirations' });
  }
});

// ─── GET /api/inspirations/personalized (Personalized feed) ──────────────────
router.get('/personalized', requireAuth, async (req: RequestWithUser, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    
    const { page = 1, limit = 20 } = req.query;
    
    // Get user's preferred styles from profile
    const userDoc = await User.findById(user._id).lean();
    const preferredStyles = userDoc?.preferences?.styles || [];
    
    const query: any = { status: 'published' };
    
    // Personalization: If user has style preferences, boost those
    let sortCriteria: any = { createdAt: -1 };
    
    if (preferredStyles.length > 0) {
      // Add scoring based on style match
      query.$or = [
        { styles: { $in: preferredStyles } }, // Preferred styles
        { styles: { $nin: preferredStyles } }, // Other styles
      ];
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const inspirations = await Inspiration.find(query)
      .populate('designer', 'name avatar designerProfile')
      .sort(sortCriteria)
      .skip(skip)
      .limit(Number(limit))
      .lean();
    
    const transformed = inspirations.map((insp: any) => ({
      _id: insp._id,
      id: insp._id.toString(),
      title: insp.title,
      description: insp.description,
      beforeImage: insp.beforeImage,
      afterImage: insp.afterImage,
      image: insp.beforeImage,
      style: insp.styles[0] || 'Modern',
      styles: insp.styles,
      location: insp.location,
      projectCost: insp.projectCost,
      designerName: insp.designer?.name || 'Designer',
      designerId: insp.designer?._id?.toString(),
      designerAvatar: insp.designer?.avatar,
      verified: insp.designer?.designerProfile?.verified || false,
      likes: insp.likes,
      views: insp.views,
      createdAt: insp.createdAt,
      isPreferred: preferredStyles.some((s: string) => insp.styles.includes(s)),
    }));
    
    const total = await Inspiration.countDocuments(query);
    
    res.json({
      success: true,
      inspirations: transformed,
      preferredStyles,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('[GET /inspirations/personalized] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch personalized feed' });
  }
});

// ─── GET /api/inspirations/:id (Single inspiration) ──────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const inspiration = await Inspiration.findById(req.params.id)
      .populate('designer', 'name avatar designerProfile location')
      .lean();
    
    if (!inspiration) {
      return res.status(404).json({ success: false, error: 'Inspiration not found' });
    }
    
    // Increment view count
    await Inspiration.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    
    const transformed = {
      _id: inspiration._id,
      id: inspiration._id.toString(),
      title: inspiration.title,
      description: inspiration.description,
      beforeImage: inspiration.beforeImage,
      afterImage: inspiration.afterImage,
      styles: inspiration.styles,
      location: inspiration.location,
      projectCost: inspiration.projectCost,
      designerName: (inspiration.designer as any)?.name || 'Designer',
      designerId: (inspiration.designer as any)?._id?.toString(),
      designerAvatar: (inspiration.designer as any)?.avatar,
      designerLocation: (inspiration.designer as any)?.designerProfile?.location,
      verified: (inspiration.designer as any)?.designerProfile?.verified || false,
      likes: inspiration.likes,
      views: (inspiration.views || 0) + 1, // Include incremented view
      createdAt: inspiration.createdAt,
    };
    
    res.json({ success: true, inspiration: transformed });
  } catch (error) {
    console.error('[GET /inspirations/:id] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch inspiration' });
  }
});

// ─── POST /api/inspirations (Create inspiration - designers only) ────────────
router.post('/', requireAuth, async (req: RequestWithUser, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    
    // Check if user is an approved designer
    if (!user.roles.includes('designer') || !user.designerProfile) {
      return res.status(403).json({ 
        success: false, 
        error: 'Only approved designers can post inspirations' 
      });
    }
    
    if (user.designerProfile.status !== 'approved') {
      return res.status(403).json({ 
        success: false, 
        error: 'Your designer profile must be approved before posting' 
      });
    }
    
    const { 
      title, 
      description, 
      beforeImage, 
      afterImage, 
      styles, 
      location, 
      projectCost,
      status = 'published' 
    } = req.body;
    
    // Validation
    if (!title || !description || !beforeImage || !afterImage || !styles || styles.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: title, description, images, and styles' 
      });
    }
    
    const inspiration = await Inspiration.create({
      designer: user._id,
      title,
      description,
      beforeImage,
      afterImage,
      styles,
      location,
      projectCost,
      status,
    });
    
    const populated = await inspiration.populate('designer', 'name avatar designerProfile');
    
    res.status(201).json({
      success: true,
      message: 'Inspiration created successfully',
      inspiration: populated,
    });
  } catch (error: any) {
    console.error('[POST /inspirations] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create inspiration',
      details: error.message 
    });
  }
});

// ─── PATCH /api/inspirations/:id (Update - owner only) ───────────────────────
router.patch('/:id', requireAuth, async (req: RequestWithUser, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    
    const inspiration = await Inspiration.findById(req.params.id);
    
    if (!inspiration) {
      return res.status(404).json({ success: false, error: 'Inspiration not found' });
    }
    
    // Check ownership
    if (inspiration.designer.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    
    const { title, description, beforeImage, afterImage, styles, location, projectCost, status } = req.body;
    
    if (title) inspiration.title = title;
    if (description) inspiration.description = description;
    if (beforeImage) inspiration.beforeImage = beforeImage;
    if (afterImage) inspiration.afterImage = afterImage;
    if (styles) inspiration.styles = styles;
    if (location !== undefined) inspiration.location = location;
    if (projectCost !== undefined) inspiration.projectCost = projectCost;
    if (status) inspiration.status = status;
    
    await inspiration.save();
    
    res.json({
      success: true,
      message: 'Inspiration updated successfully',
      inspiration,
    });
  } catch (error: any) {
    console.error('[PATCH /inspirations/:id] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update inspiration',
      details: error.message 
    });
  }
});

// ─── DELETE /api/inspirations/:id (Delete - owner only) ──────────────────────
router.delete('/:id', requireAuth, async (req: RequestWithUser, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    
    const inspiration = await Inspiration.findById(req.params.id);
    
    if (!inspiration) {
      return res.status(404).json({ success: false, error: 'Inspiration not found' });
    }
    
    // Check ownership
    if (inspiration.designer.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    
    await inspiration.deleteOne();
    
    res.json({
      success: true,
      message: 'Inspiration deleted successfully',
    });
  } catch (error) {
    console.error('[DELETE /inspirations/:id] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete inspiration' });
  }
});

// ─── GET /api/inspirations/designer/:designerId (Designer's inspirations) ────
router.get('/designer/:designerId', async (req, res) => {
  try {
    const inspirations = await Inspiration.find({
      designer: req.params.designerId,
      status: 'published',
    })
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({
      success: true,
      inspirations,
      count: inspirations.length,
    });
  } catch (error) {
    console.error('[GET /inspirations/designer/:designerId] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch designer inspirations' });
  }
});

export default router;