// backend/src/routes/invites.ts
import express from 'express';
import mongoose, { Schema, Document } from 'mongoose';
import { requireAuth } from '../middlewares/auth';
import { RequestWithUser } from '../types';
import Project from '../models/Project';
import User from '../models/User';

// ─── Invite model ─────────────────────────────────────────────────────────────

interface IInvite extends Document {
  project: mongoose.Types.ObjectId;
  designer: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  respondedAt?: Date;
}

const InviteSchema = new Schema<IInvite>({
  project:  { type: Schema.Types.ObjectId, ref: 'Project',  required: true, index: true },
  designer: { type: Schema.Types.ObjectId, ref: 'User',     required: true, index: true },
  status:   { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  respondedAt: { type: Date },
}, { timestamps: true });

// Prevent duplicate invites for the same project-designer pair
InviteSchema.index({ project: 1, designer: 1 }, { unique: true });

const Invite = mongoose.models.Invite || mongoose.model<IInvite>('Invite', InviteSchema);

const router = express.Router();

// ─── POST /api/invites ────────────────────────────────────────────────────────
// Create an invite when a client posts a project targeting a specific designer
router.post('/', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { projectId, designerId } = req.body;

  if (!projectId || !designerId) {
    return res.status(400).json({ success: false, error: 'projectId and designerId are required' });
  }

  try {
    // Verify the project belongs to this client
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    if (project.client.clerkId !== user.clerkId) {
      return res.status(403).json({ success: false, error: 'You can only invite designers to your own projects' });
    }

    // Verify the designer exists
    const designer = await User.findById(designerId);
    if (!designer || !designer.roles.includes('designer')) {
      return res.status(404).json({ success: false, error: 'Designer not found' });
    }

    // Create or update the invite (upsert to handle duplicate attempts gracefully)
    const invite = await Invite.findOneAndUpdate(
      { project: projectId, designer: designerId },
      { $setOnInsert: { status: 'pending' } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ success: true, invite });
  } catch (err: any) {
    console.error('[invites POST]', err);
    // Handle duplicate key error gracefully
    if (err.code === 11000) {
      return res.status(200).json({ success: true, message: 'Invite already exists' });
    }
    res.status(500).json({ success: false, error: 'Failed to create invite' });
  }
});

// ─── GET /api/invites/my ──────────────────────────────────────────────────────
// Get all pending invites for the current designer
router.get('/my', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const invites = await Invite.find({
      designer: user._id,
      status:   'pending',
    })
      .populate({
        path: 'project',
        select: 'title description location budget timeline styles photos client createdAt',
      })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, invites });
  } catch (err) {
    console.error('[invites/my]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch invites' });
  }
});

// ─── PATCH /api/invites/:id/accept ────────────────────────────────────────────
router.patch('/:id/accept', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const invite = await Invite.findById(req.params.id);
    if (!invite) return res.status(404).json({ success: false, error: 'Invite not found' });

    if (invite.designer.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    invite.status = 'accepted';
    invite.respondedAt = new Date();
    await invite.save();

    // Return the project details so the designer can navigate to the proposal form
    const project = await Project.findById(invite.project).lean();

    res.json({ success: true, invite, project });
  } catch (err) {
    console.error('[invites/accept]', err);
    res.status(500).json({ success: false, error: 'Failed to accept invite' });
  }
});

// ─── PATCH /api/invites/:id/decline ───────────────────────────────────────────
router.patch('/:id/decline', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const invite = await Invite.findById(req.params.id);
    if (!invite) return res.status(404).json({ success: false, error: 'Invite not found' });

    if (invite.designer.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    invite.status = 'declined';
    invite.respondedAt = new Date();
    await invite.save();

    res.json({ success: true, invite });
  } catch (err) {
    console.error('[invites/decline]', err);
    res.status(500).json({ success: false, error: 'Failed to decline invite' });
  }
});

export default router;