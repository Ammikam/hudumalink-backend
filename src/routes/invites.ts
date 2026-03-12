// backend/src/routes/invites.ts - UPDATED FOR currentPhotos
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
router.post('/', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { projectId, designerId } = req.body;

  if (!projectId || !designerId) {
    return res.status(400).json({ success: false, error: 'projectId and designerId are required' });
  }

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    if (project.client.clerkId !== user.clerkId) {
      return res.status(403).json({ success: false, error: 'You can only invite designers to your own projects' });
    }

    const designer = await User.findById(designerId);
    if (!designer || !designer.roles.includes('designer')) {
      return res.status(404).json({ success: false, error: 'Designer not found' });
    }

    const invite = await Invite.findOneAndUpdate(
      { project: projectId, designer: designerId },
      { $setOnInsert: { status: 'pending' } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ success: true, invite });
  } catch (err: any) {
    console.error('[invites POST]', err);
    if (err.code === 11000) {
      return res.status(200).json({ success: true, message: 'Invite already exists' });
    }
    res.status(500).json({ success: false, error: 'Failed to create invite' });
  }
});

// ─── GET /api/invites/my ──────────────────────────────────────────────────────
router.get('/my', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const invites = await Invite.find({
      designer: user._id,
      status: 'pending',
    })
      .populate({
        path: 'project',
        // ✅ UPDATED: Include currentPhotos in select
        select: 'title description location budget timeline styles photos currentPhotos beforePhotos inspirationPhotos inspirationNotes afterPhotos client status createdAt',
      })
      .sort({ createdAt: -1 })
      .lean();

    // ✅ Transform projects to include currentPhotos fallback
    const transformedInvites = invites.map(invite => ({
      ...invite,
      project: invite.project ? {
        ...invite.project,
        currentPhotos: (invite.project as any).currentPhotos || (invite.project as any).beforePhotos || [],
        beforePhotos: (invite.project as any).beforePhotos || [],
        inspirationPhotos: (invite.project as any).inspirationPhotos || [],
        inspirationNotes: (invite.project as any).inspirationNotes || '',
        afterPhotos: (invite.project as any).afterPhotos || [],
        photos: (invite.project as any).photos || [],
      } : null,
    }));

    res.json({ success: true, invites: transformedInvites });
  } catch (err) {
    console.error('[invites/my]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch invites' });
  }
});

// ─── PATCH /api/invites/:id/accept ────────────────────────────────────────────
router.patch('/:id/accept', requireAuth, async (req: RequestWithUser, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const invite = await Invite.findById(req.params.id).populate('project');
    
    if (!invite) {
      return res.status(404).json({ success: false, error: 'Invite not found' });
    }
    
    if (invite.designer.toString() !== user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        error: 'You are not authorized to accept this invite' 
      });
    }
    
    if (invite.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        error: `This invite has already been ${invite.status}` 
      });
    }
    
    invite.status = 'accepted';
    invite.respondedAt = new Date();
    await invite.save();
    
    const project = await Project.findById(invite.project);
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        error: 'Project not found' 
      });
    }

    if (project.status !== 'open') {
      return res.status(400).json({ 
        success: false, 
        error: 'This project is no longer available' 
      });
    }
    
    project.designer = user._id;
    project.status = 'in_progress';
    await project.save();
    
    await Invite.updateMany(
      { 
        project: invite.project,
        _id: { $ne: invite._id },
        status: 'pending'
      },
      { 
        status: 'declined',
        respondedAt: new Date(),
      }
    );
    
    const updatedProject = await Project.findById(project._id)
      .populate('designer', 'name avatar')
      .lean();
    
    // ✅ Transform project with currentPhotos
    const transformedProject = updatedProject ? {
      ...updatedProject,
      currentPhotos: updatedProject.currentPhotos || updatedProject.beforePhotos || [],
      beforePhotos: updatedProject.beforePhotos || [],
      inspirationPhotos: updatedProject.inspirationPhotos || [],
      inspirationNotes: updatedProject.inspirationNotes || '',
      afterPhotos: updatedProject.afterPhotos || [],
      photos: updatedProject.photos || [],
    } : null;
    
    res.json({ 
      success: true, 
      message: 'Invite accepted! Project assigned successfully.',
      invite,
      project: transformedProject
    });
    
  } catch (error) {
    console.error('Error accepting invite:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to accept invite. Please try again.' 
    });
  }
});

// ─── PATCH /api/invites/:id/decline ───────────────────────────────────────────
router.patch('/:id/decline', requireAuth, async (req: RequestWithUser, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const invite = await Invite.findById(req.params.id);
    
    if (!invite) {
      return res.status(404).json({ success: false, error: 'Invite not found' });
    }
    
    if (invite.designer.toString() !== user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        error: 'You are not authorized to decline this invite' 
      });
    }
    
    if (invite.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        error: `This invite has already been ${invite.status}` 
      });
    }
    
    invite.status = 'declined';
    invite.respondedAt = new Date();
    await invite.save();
    
    res.json({ 
      success: true, 
      message: 'Invite declined.',
      invite
    });
    
  } catch (error) {
    console.error('Error declining invite:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to decline invite. Please try again.' 
    });
  }
});

export default router;