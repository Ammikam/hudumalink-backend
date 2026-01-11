import express from 'express';
import User from '../models/User';

const router = express.Router();

/**
 * Helper: transform user → public designer shape
 */
function transformDesigner(designer: any) {
  const d = designer.toObject();

  return {
    _id: d._id,
    id: d._id.toString(),
    clerkId: d.clerkId,
    name: d.name,

    location: d.designerProfile?.location || 'Nairobi, Kenya',
    avatar: d.designerProfile?.avatar || '',
    coverImage: d.designerProfile?.coverImage || '',
    about: d.designerProfile?.about || '',
    calendlyLink: d.designerProfile?.calendlyLink || '',

    rating: d.designerProfile?.rating || 0,
    reviewCount: d.designerProfile?.reviews?.length || 0,
    projectsCompleted: d.designerProfile?.projectsCompleted || 0,
    responseTime: d.designerProfile?.responseTime || 'Not set',
    startingPrice: d.designerProfile?.startingPrice || 0,

    styles: d.designerProfile?.styles || [],
    verified: d.designerProfile?.verified || false,
    superVerified: d.designerProfile?.superVerified || false,

    portfolio: d.designerProfile?.portfolio || [],
    reviews: d.designerProfile?.reviews || [],
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
      'designerProfile.approved': true,
      'designerProfile.banned': { $ne: true },
    }).sort({ createdAt: -1 });

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
 * Public - single approved designer
 */
router.get('/:id', async (req, res) => {
  try {
    const designer = await User.findOne({
      _id: req.params.id,
      roles: 'designer',
      designerProfile: { $ne: null },
      'designerProfile.approved': true,
      'designerProfile.banned': { $ne: true },
    });

    if (!designer) {
      return res.status(404).json({
        success: false,
        error: 'Designer not found',
      });
    }

    res.json({
      success: true,
      designer: transformDesigner(designer),
    });
  } catch (error) {
    console.error('Error fetching designer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch designer',
    });
  }
});

export default router;
