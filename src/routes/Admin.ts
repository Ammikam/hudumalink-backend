// routes/Admin.ts
import express from 'express';
import User from '../models/User';
import Project from '../models/Project';
import { requireAuth } from '../middlewares/auth';
import { requireAdmin } from '../middlewares/roles';

const router = express.Router();

/**
 * All admin routes require:
 * - authenticated user
 * - admin role
 */
router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/stats
 * Admin dashboard statistics
 */
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
      completedProjectsCount,
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
          completed: completedProjectsCount,
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

/**
 * GET /api/admin/designers
 * Get all designers (optional status filter)
 */
router.get('/designers', async (req, res) => {
  try {
    const { status } = req.query;

    const query: any = { roles: 'designer' };

    if (status) {
      query['designerProfile.status'] = status;
    }

    const designers = await User.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      designers,
      count: designers.length,
    });
  } catch (error) {
    console.error('Fetch designers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch designers',
    });
  }
});

/**
 * GET /api/admin/designers/pending
 */
router.get('/designers/pending', async (_req, res) => {
  try {
    const designers = await User.find({
      roles: 'designer',
      'designerProfile.status': 'pending',
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      designers,
      count: designers.length,
    });
  } catch (error) {
    console.error('Pending designers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending designers',
    });
  }
});

/**
 * PATCH /api/admin/designers/:id/approve
 */
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

/**
 * PATCH /api/admin/designers/:id/reject
 */
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

/**
 * PATCH /api/admin/designers/:id/suspend
 */
router.patch('/designers/:id/suspend', async (req, res) => {
  try {
    const { suspend, reason } = req.body;

    const designer = await User.findById(req.params.id);

    if (!designer || !designer.roles.includes('designer')) {
      return res.status(404).json({ success: false, error: 'Designer not found' });
    }

    if (!designer.designerProfile) {
      return res.status(400).json({ success: false, error: 'Designer profile missing' });
    }

    designer.designerProfile.status = suspend ? 'suspended' : 'approved';
    designer.designerProfile.rejectionReason = suspend ? reason : undefined;

    await designer.save();

    res.json({
      success: true,
      message: suspend ? 'Designer suspended' : 'Designer unsuspended',
    });
  } catch (error) {
    console.error('Suspend designer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update designer status',
    });
  }
});

/**
 * PATCH /api/admin/designers/:id/verify
 */
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

/**
 * PATCH /api/admin/designers/:id/super-verify
 */
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

/**
 * GET /api/admin/users
 */
router.get('/users', async (_req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      users,
      count: users.length,
    });
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
    });
  }
});

/**
 * GET /api/admin/projects
 */
router.get('/projects', async (_req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      projects,
      count: projects.length,
    });
  } catch (error) {
    console.error('Fetch projects error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
    });
  }
});

/**
 * DELETE /api/admin/projects/:id
 */
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
