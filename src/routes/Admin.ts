import express from 'express';
import User from '../models/User';
import Project from '../models/Project';
import { requireAuth } from '../middlewares/auth';
import { requireAdmin } from '../middlewares/roles';

const router = express.Router();


router.use(requireAuth);
router.use(requireAdmin);


router.get('/stats', async (_req, res) => {
  try {
    const [
      totalUsers,
      totalClients,
      totalDesigners,
      pendingDesigners,
      approvedDesigners,
      verifiedDesigners,
      superVerifiedDesigners,
      totalProjects,
      openProjects,
      inProgressProjects,
      completedProjects,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ roles: 'client' }),
      User.countDocuments({ roles: 'designer' }),
      User.countDocuments({
        roles: 'designer',
        'designerProfile.status': 'pending',
      }),
      User.countDocuments({
        roles: 'designer',
        'designerProfile.status': 'approved',
      }),
      User.countDocuments({
        roles: 'designer',
        'designerProfile.verified': true,
      }),
      User.countDocuments({
        roles: 'designer',
        'designerProfile.superVerified': true,
      }),
      Project.countDocuments(),
      Project.countDocuments({ status: 'open' }),
      Project.countDocuments({ status: 'in_progress' }),
      Project.countDocuments({ status: 'completed' }),
    ]);

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          clients: totalClients,
          designers: totalDesigners,
          pendingDesigners,
          approvedDesigners,
          verifiedDesigners,
          superVerifiedDesigners,
        },
        projects: {
          total: totalProjects,
          open: openProjects,
          inProgress: inProgressProjects,
          completed: completedProjects,
        },
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load admin statistics',
    });
  }
});

router.get('/designers/pending', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [designers, total] = await Promise.all([
      User.find({
        roles: 'designer',
        'designerProfile.status': 'pending',
      })
        .select('name email avatar createdAt designerProfile')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      User.countDocuments({
        roles: 'designer',
        'designerProfile.status': 'pending',
      }),
    ]);

    res.json({
      success: true,
      designers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Pending designers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending designers',
    });
  }
});

router.get('/designers', async (req, res) => {
  try {
    const { status, verified, search, page: pageStr, limit: limitStr } = req.query;
    const page = parseInt(pageStr as string) || 1;
    const limit = parseInt(limitStr as string) || 20;
    const skip = (page - 1) * limit;

    const query: any = { roles: 'designer' };

    if (status) query['designerProfile.status'] = status;
    if (verified !== undefined) query['designerProfile.verified'] = verified === 'true';

    if (search) {
      const searchRegex = { $regex: search as string, $options: 'i' };
      query.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    const [designers, total] = await Promise.all([
      User.find(query)
        .select('name email phone avatar roles createdAt designerProfile')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      designers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Fetch designers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch designers',
    });
  }
});


router.patch('/designers/:id/approve', async (req, res) => {
  try {
    const designer = await User.findById(req.params.id);

    if (!designer || !designer.roles.includes('designer')) {
      return res.status(404).json({ success: false, error: 'Designer not found' });
    }

    if (!designer.designerProfile) {
      return res.status(400).json({ success: false, error: 'Designer profile missing' });
    }

    designer.designerProfile.status = 'approved';
    designer.designerProfile.rejectionReason = undefined;

    await designer.save();

    res.json({
      success: true,
      message: 'Designer approved',
      designer,
    });
  } catch (error) {
    console.error('Approve designer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve designer',
    });
  }
});


router.patch('/designers/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;

    const designer = await User.findById(req.params.id);

    if (!designer || !designer.roles.includes('designer')) {
      return res.status(404).json({ success: false, error: 'Designer not found' });
    }

    if (!designer.designerProfile) {
      return res.status(400).json({ success: false, error: 'Designer profile missing' });
    }

    designer.designerProfile.status = 'rejected';
    designer.designerProfile.rejectionReason = reason || 'Rejected by admin';

    await designer.save();

    res.json({
      success: true,
      message: 'Designer rejected',
    });
  } catch (error) {
    console.error('Reject designer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject designer',
    });
  }
});


router.patch('/designers/:id/suspend', async (req, res) => {
  try {
    const { suspended, reason } = req.body;

    const designer = await User.findById(req.params.id);

    if (!designer || !designer.roles.includes('designer')) {
      return res.status(404).json({ success: false, error: 'Designer not found' });
    }

    if (!designer.designerProfile) {
      return res.status(400).json({ success: false, error: 'Designer profile missing' });
    }

    designer.designerProfile.status = suspended ? 'suspended' : 'approved';
    designer.designerProfile.rejectionReason = suspended ? reason : undefined;

    await designer.save();

    res.json({
      success: true,
      message: suspended ? 'Designer suspended' : 'Designer unsuspended',
    });
  } catch (error) {
    console.error('Suspend designer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update designer status',
    });
  }
});

router.patch('/designers/:id/verify', async (req, res) => {
  try {
    const { verified } = req.body;

    const designer = await User.findById(req.params.id);

    if (!designer || !designer.roles.includes('designer') || !designer.designerProfile) {
      return res.status(404).json({ success: false, error: 'Designer not found' });
    }

    designer.designerProfile.verified = verified;
    await designer.save();

    res.json({
      success: true,
      message: verified ? 'Designer verified' : 'Designer unverified',
    });
  } catch (error) {
    console.error('Verify designer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify designer',
    });
  }
});


router.patch('/designers/:id/super-verify', async (req, res) => {
  try {
    const { superVerified } = req.body;

    const designer = await User.findById(req.params.id);

    if (!designer || !designer.roles.includes('designer') || !designer.designerProfile) {
      return res.status(404).json({ success: false, error: 'Designer not found' });
    }

    designer.designerProfile.superVerified = superVerified;
    if (superVerified) {
      designer.designerProfile.verified = true;
    }

    await designer.save();

    res.json({
      success: true,
      message: 'Super verification updated',
    });
  } catch (error) {
    console.error('Super verify error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update super verification',
    });
  }
});


router.get('/users', async (req, res) => {
  try {
    const { search } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const query: any = {};

    if (search) {
      const searchRegex = { $regex: search as string, $options: 'i' };
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('name email avatar roles createdAt banned')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
    });
  }
});

router.patch('/users/:id/ban', async (req, res) => {
  try {
    const { banned, reason } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Prevent banning admins
    if (user.roles.includes('admin')) {
      return res.status(403).json({ success: false, error: 'Cannot ban an admin' });
    }

    user.banned = banned;
    user.banReason = banned ? reason : undefined;
    user.bannedAt = banned ? new Date() : undefined;

    await user.save();

    res.json({
      success: true,
      message: banned ? 'User banned successfully' : 'User unbanned successfully',
    });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ success: false, error: 'Failed to update user status' });
  }
});

router.get('/projects', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      Project.find()
        .populate('client', 'name avatar')
        .populate('designer', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Project.countDocuments(),
    ]);

    res.json({
      success: true,
      projects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Fetch projects error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
    });
  }
});


router.delete('/projects/:id', async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.json({
      success: true,
      message: 'Project deleted',
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project',
    });
  }
});




export default router;