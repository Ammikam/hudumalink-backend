// backend/src/routes/proposals.ts
import express from 'express';
import Proposal from '../models/Proposal';
import Project from '../models/Project';
import { requireAuth } from '../middlewares/auth';
import { RequestWithUser } from '../types'; 
import mongoose from 'mongoose';

const router = express.Router();

// ─── Helper: Get Invite model ────────────────────────────────────────────────
const InviteSchema = new mongoose.Schema({
  project:  { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  designer: { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true, index: true },
  status:   { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  respondedAt: { type: Date },
}, { timestamps: true });

InviteSchema.index({ project: 1, designer: 1 }, { unique: true });
const Invite = mongoose.models.Invite || mongoose.model('Invite', InviteSchema);

// ─── POST /api/proposals ─────────────────────────────────────────────────────
router.post('/', requireAuth, async (req: RequestWithUser, res) => {
  try {
    const { projectId, message, price, timeline } = req.body;

    if (!projectId || !message?.trim() || !price || !timeline?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required: projectId, message, price, timeline',
      });
    }

    const designerId = req.user?._id;
    if (!designerId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const existingInvite = await Invite.findOne({
      project: projectId,
      designer: designerId,
      status: 'pending',
    });

    if (existingInvite) {
      existingInvite.status = 'accepted';
      existingInvite.respondedAt = new Date();
      await existingInvite.save();
    }

    const proposal = new Proposal({
      project: projectId,
      designer: designerId,
      message: message.trim(),
      price: Number(price),
      timeline: timeline.trim(),
      status: 'pending',
    });

    await proposal.save();
    await proposal.populate('designer', 'name avatar phone');

    return res.json({
      success: true,
      proposal,
      message: existingInvite
        ? 'Proposal sent & invite accepted!'
        : 'Proposal sent successfully!',
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'You have already sent a proposal for this project',
      });
    }
    console.error('Proposal creation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send proposal',
      details: error.message,
    });
  }
});

// ─── GET /api/proposals/my ───────────────────────────────────────────────────
router.get('/my', requireAuth, async (req: RequestWithUser, res) => {
  try {
    const designerId = req.user?._id;
    if (!designerId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const proposals = await Proposal.find({ designer: designerId })
      .populate('project', 'title description budget timeline status')
      .sort({ createdAt: -1 });

    res.json({ success: true, proposals });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch proposals' });
  }
});

// ─── GET /api/proposals/project/:projectId ───────────────────────────────────
router.get('/project/:projectId', requireAuth, async (req: RequestWithUser, res) => {
  try {
    const proposals = await Proposal.find({ project: req.params.projectId })
      .populate('designer', 'name avatar phone')
      .sort({ createdAt: -1 });

    res.json({ success: true, proposals });
  } catch (error) {
    console.error('Fetch project proposals error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch proposals' });
  }
});

// ─── GET /api/proposals/project/:projectId/accepted ──────────────────────────
// Returns the single accepted proposal for a project.
// Used by PaymentPage to get the correct designer fee to charge.
router.get('/project/:projectId/accepted', requireAuth, async (req: RequestWithUser, res) => {
  try {
    const proposal = await Proposal.findOne({
      project: req.params.projectId,
      status: 'accepted',
    }).populate('designer', 'name avatar');

    if (!proposal) {
      return res.status(404).json({
        success: false,
        error: 'No accepted proposal found for this project',
      });
    }

    res.json({
      success: true,
      proposal: {
        _id: proposal._id,
        price: proposal.price,       // ← designer's quoted fee — this is what client pays
        timeline: proposal.timeline,
        message: proposal.message,
        designer: proposal.designer,
      },
    });
  } catch (error) {
    console.error('Fetch accepted proposal error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch accepted proposal' });
  }
});

// ─── PATCH /api/proposals/:id/accept ────────────────────────────────────────
router.patch('/:id/accept', requireAuth, async (req: RequestWithUser, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id)
      .populate('project')
      .populate('designer');

    if (!proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }

    const projectClientClerkId = (proposal.project as any).client?.clerkId;
    if (projectClientClerkId !== req.user?.clerkId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You can only accept proposals for your own projects',
      });
    }

    proposal.status = 'accepted';
    await proposal.save();

    await Proposal.updateMany(
      {
        project: (proposal.project as any)._id,
        _id: { $ne: proposal._id },
        status: 'pending',
      },
      {
        status: 'rejected',
        rejectionReason: 'Project awarded to another designer',
      }
    );

    await Project.findByIdAndUpdate((proposal.project as any)._id, {
      status: 'payment_pending',
      designer: (proposal.designer as any)._id,
    });

    res.json({
      success: true,
      message: 'Designer hired! Please complete payment to start the project.',
      projectId: (proposal.project as any)._id,
    });
  } catch (error: any) {
    console.error('Accept proposal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to accept proposal',
      details: error.message,
    });
  }
});

// ─── PATCH /api/proposals/:id/reject ────────────────────────────────────────
router.patch('/:id/reject', requireAuth, async (req: RequestWithUser, res) => {
  try {
    const { reason } = req.body;

    const proposal = await Proposal.findById(req.params.id).populate('project');

    if (!proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }

    const project = proposal.project as any;

    if (project?.client?.clerkId !== req.user?.clerkId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You can only reject proposals for your own projects',
      });
    }

    proposal.status = 'rejected';
    if (reason?.trim()) proposal.rejectionReason = reason.trim();
    await proposal.save();

    res.json({ success: true, message: 'Proposal rejected successfully', proposal });
  } catch (error: any) {
    console.error('Reject proposal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject proposal',
      details: error.message,
    });
  }
});

export default router;