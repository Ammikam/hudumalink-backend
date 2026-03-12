// backend/src/routes/stats.ts - UPDATED FOR currentPhotos
import express from 'express';
import User from '../models/User';
import Project from '../models/Project';

const router = express.Router();

// GET /api/stats - Public homepage statistics
router.get('/', async (req, res) => {
  try {
    // ✅ Count verified designers
    const verifiedDesigners = await User.countDocuments({
      roles: 'designer',
      'designerProfile.status': 'approved',
      banned: false,
    });

    // ✅ Count completed projects
    const completedProjects = await Project.countDocuments({
      status: 'completed',
    });

    // ✅ Calculate average rating from all verified designers
    const designers = await User.find({
      roles: 'designer',
      'designerProfile.status': 'approved',
      'designerProfile.reviewCount': { $gt: 0 },
    }).select('designerProfile.rating designerProfile.reviewCount');

    let averageRating = 0;
    if (designers.length > 0) {
      const totalRating = designers.reduce(
        (sum, d) => sum + (d.designerProfile?.rating || 0),
        0
      );
      averageRating = Math.round((totalRating / designers.length) * 10) / 10;
    }

    // ✅ Get featured project - Intelligent selection with currentPhotos
    // Priority:
    // 1. Completed projects with designer assigned
    // 2. Has both currentPhotos and afterPhotos (for before/after slider)
    // 3. Designer has good rating
    // 4. Project has good budget (indicates quality)
    
    // Try to find project with currentPhotos AND afterPhotos
    let featuredProject = await Project.findOne({
      status: 'completed',
      designer: { $ne: null },
      $and: [
        { $expr: { $gt: [{ $size: { $ifNull: ['$currentPhotos', []] } }, 0] } },
        { $expr: { $gt: [{ $size: { $ifNull: ['$afterPhotos', []] } }, 0] } },
      ],
    })
      .populate({
        path: 'designer',
        select: 'name avatar designerProfile.rating',
        match: { 'designerProfile.rating': { $gte: 4.0 } }, // Good rating
      })
      .sort({ 
        budget: -1,  // Higher budget first
      })
      .lean();

    // Fallback 1: Try beforePhotos + afterPhotos (old data)
    if (!featuredProject || !featuredProject.designer) {
      featuredProject = await Project.findOne({
        status: 'completed',
        designer: { $ne: null },
        $and: [
          { $expr: { $gt: [{ $size: { $ifNull: ['$beforePhotos', []] } }, 0] } },
          { $expr: { $gt: [{ $size: { $ifNull: ['$afterPhotos', []] } }, 0] } },
        ],
      })
        .populate('designer', 'name avatar designerProfile.rating')
        .sort({ budget: -1 })
        .lean();
    }

    // Fallback 2: Any completed project with at least 2 photos total
    if (!featuredProject || !featuredProject.designer) {
      featuredProject = await Project.findOne({
        status: 'completed',
        designer: { $ne: null },
        $expr: { $gte: [{ $size: { $ifNull: ['$photos', []] } }, 2] },
      })
        .populate('designer', 'name avatar designerProfile.rating')
        .sort({ createdAt: -1 })
        .lean();
    }

    // Format featured project
    let formattedProject = null;
    if (featuredProject && featuredProject.designer) {
      formattedProject = {
        _id: featuredProject._id,
        title: featuredProject.title,
        location: featuredProject.location,
        budget: featuredProject.budget,
        timeline: featuredProject.timeline,
        
        // ✅ UPDATED: Include both currentPhotos and beforePhotos for backwards compatibility
        currentPhotos: featuredProject.currentPhotos || featuredProject.beforePhotos || [],
        beforePhotos: featuredProject.beforePhotos || [],
        afterPhotos: featuredProject.afterPhotos || [],
        photos: featuredProject.photos || [],
        
        clientName: featuredProject.client?.name || 'Anonymous',
        designer: {
          _id: (featuredProject.designer as any)._id,
          name: (featuredProject.designer as any).name,
          avatar: (featuredProject.designer as any).avatar || '',
          rating: (featuredProject.designer as any).designerProfile?.rating || 0,
        },
      };
    }

    res.json({
      success: true,
      stats: {
        verifiedDesigners,
        completedProjects,
        averageRating,
        featuredProject: formattedProject,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
    });
  }
});

export default router;