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

    if (!projectId || !message || !price || !timeline) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const designerId = req.user?._id;
    if (!designerId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const proposal = new Proposal({
      project: projectId,
      designer: designerId,
      message,
      price,
      timeline,
      status: 'pending',
    });

    await proposal.save();

    await proposal.populate('designer', 'name avatar');

    res.json({
      success: true,
      proposal,
      message: 'Proposal sent successfully',
    });
  } catch (error: any) {
    console.error('Proposal error:', error);
    res.status(500).json({
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