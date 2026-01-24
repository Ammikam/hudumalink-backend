// src/routes/Proposals.ts
import express from 'express';
import Proposal from '../models/Proposal';
import Project from '../models/Project';
import { requireAuth } from '../middlewares/auth';
import { RequestWithUser, UserPayload } from '../types'; 

const router = express.Router();

// POST /api/proposals
router.post('/', requireAuth, async (req: RequestWithUser, res) => {
  try {
    const { projectId, message, price, timeline } = req.body;

    // Validation
    if (!projectId || !message?.trim() || !price || !timeline?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required: projectId, message, price, timeline',
      });
    }

    const designerId = req.user?._id;
    if (!designerId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Create proposal
    const proposal = new Proposal({
      project: projectId,
      designer: designerId,
      message: message.trim(),
      price: Number(price),
      timeline: timeline.trim(),
      status: 'pending',
    });

    await proposal.save();

    // Populate designer info for response
    await proposal.populate('designer', 'name avatar phone');

    return res.json({
      success: true,
      proposal,
      message: 'Proposal sent successfully!',
    });
  } catch (error: any) {
    // Handle duplicate proposal (from unique index)
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

// GET /api/proposals/my - My proposals
router.get('/my', requireAuth, async (req: RequestWithUser, res) => {
  try {
    const designerId = req.user?._id;
    if (!designerId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const proposals = await Proposal.find({ designer: designerId })
      .populate('project', 'title description budget timeline')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      proposals,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch proposals',
    });
  }
});

// GET /api/proposals/project/:projectId - Client sees proposals for their project
router.get('/project/:projectId', requireAuth, async (req: RequestWithUser, res) => {
  try {
    const projectId = req.params.projectId;

    const proposals = await Proposal.find({ project: projectId })
      .populate('designer', 'name avatar phone')
      .sort({ createdAt: -1 });

    res.json({ success: true, proposals });
  } catch (error) {
    console.error('Fetch project proposals error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch proposals' });
  }
});

router.patch('/:id/accept', requireAuth, async (req: RequestWithUser, res) => {
  try {
    const proposalId = req.params.id;

    const proposal = await Proposal.findById(proposalId)
      .populate('project')
      .populate('designer');

    if (!proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }

    proposal.status = 'accepted';
    await proposal.save();

    // Update project status and assign designer
    await Project.findByIdAndUpdate(proposal.project._id, {
      status: 'in_progress',
      designer: proposal.designer._id,
    });

    res.json({ success: true, message: 'Designer hired successfully!' });
  } catch (error) {
    console.error('Accept proposal error:', error);
    res.status(500).json({ success: false, error: 'Failed to accept proposal' });
  }
});

// PATCH /api/proposals/:id/reject
router.patch('/:id/reject', requireAuth, async (req: RequestWithUser, res) => {
  try {
    const proposalId = req.params.id;
    const { reason } = req.body; // Optional reason

    // Find proposal and populate project (to get client)
    const proposal = await Proposal.findById(proposalId)
      .populate('project'); // populate full project

    if (!proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }

    // Type assertion because populate doesn't change TS type
    const project = proposal.project as any;

    // Ownership check — only project owner can reject
    const projectClientClerkId = project?.client?.clerkId;
    const currentUserClerkId = req.user?.clerkId;

    if (projectClientClerkId !== currentUserClerkId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You can only reject proposals for your own projects',
      });
    }

    // Reject the proposal
    proposal.status = 'rejected';
    if (reason?.trim()) {
      proposal.rejectionReason = reason.trim();
    }
    await proposal.save();

    res.json({
      success: true,
      message: 'Proposal rejected successfully',
      proposal,
    });
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