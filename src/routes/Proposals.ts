// src/routes/Proposals.ts
import express from 'express';
import Proposal from '../models/Proposal';
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

export default router;