// src/routes/users.ts
import express from 'express';
import User from '../models/User';
import { requireAuth } from '../middlewares/auth';

const router = express.Router();

// GET /api/users/mongo-id/:clerkId
router.get('/mongo-id/:clerkId', requireAuth, async (req, res) => {
  try {
    console.log(`[mongo-id] Requested for clerkId: ${req.params.clerkId}`);

    const user = await User.findOne({ clerkId: req.params.clerkId }).select('_id');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      mongoId: user._id.toString()
    });
  } catch (err) {
    console.error('[mongo-id] Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// If you already have /api/users/:clerkId for full user, keep it
router.get('/:clerkId', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ clerkId: req.params.clerkId });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;