import express from 'express';
import User from '../models/User';
import Project from '../models/Project';
import { requireAuth } from '../middlewares/auth';
import { requireAdmin } from '../middlewares/roles';
import Payment from '../models/Payment';


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


// ─── GET /api/admin/payments ──────────────────────────────────────────────────
// List all transactions with filters: status, dateFrom, dateTo, search
router.get('/payments', async (req, res) => {
  try {
    const { status, dateFrom, dateTo, search, page: pageStr, limit: limitStr } = req.query;
    const page  = parseInt(pageStr as string)  || 1;
    const limit = parseInt(limitStr as string) || 20;
    const skip  = (page - 1) * limit;

    const query: any = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom as string);
      if (dateTo)   query.createdAt.$lte = new Date(new Date(dateTo as string).setHours(23, 59, 59));
    }

    // Search by M-Pesa receipt number
    if (search) {
      query.mpesaReceiptNumber = { $regex: search as string, $options: 'i' };
    }

    const [payments, total, stats] = await Promise.all([
      Payment.find(query)
        .populate('project', 'title')
        .populate('client', 'name email')
        .populate('designer', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Payment.countDocuments(query),

      // Aggregate stats for the summary cards (unaffected by pagination)
      Payment.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount:    { $sum: '$amount' },
            totalPlatformFee: { $sum: '$platformFee' },
            totalDesignerAmount: { $sum: '$designerAmount' },
          },
        },
      ]),
    ]);

    // Shape stats into a flat object
    const summary = {
      totalRevenue: 0,
      totalHeld: 0,
      totalReleased: 0,
      totalFailed: 0,
      countHeld: 0,
      countReleased: 0,
      countPending: 0,
      countFailed: 0,
    };

    stats.forEach((s: any) => {
      if (s._id === 'held') {
        summary.totalHeld   = s.totalAmount;
        summary.countHeld   = s.count;
        summary.totalRevenue += s.totalPlatformFee;
      }
      if (s._id === 'released') {
        summary.totalReleased   = s.totalAmount;
        summary.countReleased   = s.count;
        summary.totalRevenue   += s.totalPlatformFee;
      }
      if (s._id === 'pending') {
        summary.countPending = s.count;
      }
      if (s._id === 'failed') {
        summary.totalFailed  = s.totalAmount;
        summary.countFailed  = s.count;
      }
    });

    res.json({
      success: true,
      payments,
      summary,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin payments error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payments' });
  }
});

// ─── PATCH /api/admin/payments/:id/status ────────────────────────────────────
// Admin override — manually set a payment status (e.g. stuck pending → held)
router.patch('/payments/:id/status', async (req, res) => {
  try {
    const { status, note } = req.body;

    const validStatuses = ['pending', 'held', 'released', 'refunded', 'failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    const previousStatus = payment.status;
    payment.status = status;

    // Set relevant timestamps
    if (status === 'held'     && !payment.heldAt)     payment.heldAt     = new Date();
    if (status === 'released' && !payment.releasedAt) payment.releasedAt = new Date();
    if (status === 'refunded' && !payment.refundedAt) payment.refundedAt = new Date();

    // Record the admin override in metadata
    payment.metadata = {
      ...payment.metadata,
      adminOverride: {
        previousStatus,
        newStatus: status,
        note: note || 'Manual override by admin',
        overriddenAt: new Date(),
      },
    };

    await payment.save();

    // If releasing, also mark project as completed
    if (status === 'released') {
      await Project.findByIdAndUpdate(payment.project, { status: 'completed' });
    }

    // If overriding to held, make sure project is in_progress
    if (status === 'held') {
      await Project.findByIdAndUpdate(payment.project, { status: 'in_progress' });
    }

    res.json({
      success: true,
      message: `Payment status updated from ${previousStatus} to ${status}`,
      payment,
    });
  } catch (error) {
    console.error('Admin override payment error:', error);
    res.status(500).json({ success: false, error: 'Failed to update payment status' });
  }
});

// ─── POST /api/admin/payments/:id/release ────────────────────────────────────
// Admin manually releases held payment to designer (bypasses client approval)
router.post('/payments/:id/release', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('designer');
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    if (payment.status !== 'held') {
      return res.status(400).json({
        success: false,
        error: `Payment must be in 'held' status to release. Current: ${payment.status}`,
      });
    }

    payment.status     = 'released';
    payment.releasedAt = new Date();
    payment.metadata   = {
      ...payment.metadata,
      adminRelease: {
        releasedAt: new Date(),
        note: req.body.note || 'Released by admin',
      },
    };

    await payment.save();
    await Project.findByIdAndUpdate(payment.project, { status: 'completed' });

    res.json({
      success: true,
      message: `KSh ${payment.designerAmount.toLocaleString()} released to designer`,
      payment,
    });
  } catch (error) {
    console.error('Admin release payment error:', error);
    res.status(500).json({ success: false, error: 'Failed to release payment' });
  }
});

// ─── POST /api/admin/payments/:id/refund ─────────────────────────────────────
// Admin flags a payment as refunded (actual refund via M-Pesa done manually)
router.post('/payments/:id/refund', async (req, res) => {
  try {
    const { reason } = req.body;

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    if (!['held', 'pending'].includes(payment.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot refund a payment with status: ${payment.status}`,
      });
    }

    payment.status     = 'refunded';
    payment.refundedAt = new Date();
    payment.metadata   = {
      ...payment.metadata,
      refund: {
        reason: reason || 'Refunded by admin',
        refundedAt: new Date(),
      },
    };

    await payment.save();

    // Reopen the project so the client can hire a new designer
    await Project.findByIdAndUpdate(payment.project, {
      status: 'open',
      designer: null,
    });

    res.json({
      success: true,
      message: `Payment marked as refunded. Project reopened.`,
      payment,
    });
  } catch (error) {
    console.error('Admin refund payment error:', error);
    res.status(500).json({ success: false, error: 'Failed to refund payment' });
  }
});

// ─── POST /api/admin/payments/:id/flag ───────────────────────────────────────
// Flag a payment as disputed for investigation
router.post('/payments/:id/flag', async (req, res) => {
  try {
    const { reason } = req.body;

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    payment.metadata = {
      ...payment.metadata,
      dispute: {
        flagged: true,
        reason: reason || 'Flagged for investigation',
        flaggedAt: new Date(),
      },
    };

    await payment.save();

    res.json({
      success: true,
      message: 'Payment flagged for investigation',
      payment,
    });
  } catch (error) {
    console.error('Admin flag payment error:', error);
    res.status(500).json({ success: false, error: 'Failed to flag payment' });
  }
});




export default router;