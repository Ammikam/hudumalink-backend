// backend/src/routes/projects.ts - COMPLETE UPDATED VERSION WITH PHOTO SEPARATION
import express from 'express';
import Project, { IProjectPopulated } from '../models/Project';
import { requireAuth } from '../middlewares/auth';
import { requireAdmin } from '../middlewares/roles';
import { RequestWithUser } from '../types';
import User from '../models/User';
import mongoose from 'mongoose';

const router = express.Router();

// ─── Client's own projects ────────────────────────────────────────────────────
router.get('/', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const projects = await Project.find({
      'client.clerkId': user.clerkId,
    })
      .populate('designer', 'name avatar')
      .sort({ createdAt: -1 })
      .lean();

    // ✅ UPDATED: Transform to include separate photo arrays
    const transformedProjects = projects.map(project => ({
      ...project,
      photos: project.photos || [],
      beforePhotos: project.beforePhotos || [],
      inspirationPhotos: project.inspirationPhotos || [],
      inspirationNotes: project.inspirationNotes || '',
    }));

    res.json({
      success: true,
      projects: transformedProjects,
      count: transformedProjects.length,
    });
  } catch (error) {
    console.error('Error fetching client projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
    });
  }
});

// ─── Admin: all projects ──────────────────────────────────────────────────────
router.get('/admin', requireAuth, requireAdmin, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const page  = parseInt(req.query.page  as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const skip  = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      Project.find()
        .populate('designer', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Project.countDocuments(),
    ]);

    const formattedProjects = projects.map(project => {
      const client = project.client || { name: 'Unknown Client', clerkId: 'unknown', avatar: null };

      return {
        _id:         project._id.toString(),
        title:       project.title       || 'Untitled Project',
        description: project.description || 'No description',
        budget:      project.budget      || 0,
        status:      project.status      || 'open',
        createdAt:   project.createdAt,
        client: {
          _id:    client.clerkId || project._id.toString(),
          name:   client.name,
          avatar: client.avatar  || null,
        },
        designer: project.designer ?? null,
        // ✅ UPDATED: Include photo arrays
        photos: project.photos || [],
        beforePhotos: project.beforePhotos || [],
        inspirationPhotos: project.inspirationPhotos || [],
        inspirationNotes: project.inspirationNotes || '',
      };
    });

    res.json({
      success: true,
      projects: formattedProjects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('PROJECTS ADMIN ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
      details: error.message,
    });
  }
});

// ─── Public open projects (for designers to browse) ──────────────────────────
router.get('/open', async (_req, res) => {
  try {
    const projects = await Project.find({ status: 'open' })
      .sort({ createdAt: -1 })
      .lean();

    // ✅ UPDATED: Transform to include separate photo arrays
    const transformedProjects = projects.map(project => ({
      ...project,
      photos: project.photos || [],
      beforePhotos: project.beforePhotos || [],
      inspirationPhotos: project.inspirationPhotos || [],
      inspirationNotes: project.inspirationNotes || '',
    }));

    res.json(transformedProjects);
  } catch (error) {
    console.error('Error fetching open projects:', error);
    res.status(500).json({ error: 'Failed to fetch open projects' });
  }
});

// ─── Designer's active (hired) projects ──────────────────────────────────────
router.get('/my-active', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const designerId = user._id;
    const projects = await Project.find({
      designer: designerId,
      status:   'in_progress',
    })
      .sort({ createdAt: -1 })
      .lean();

    // ✅ UPDATED: Transform to include separate photo arrays
    const transformedProjects = projects.map(project => ({
      ...project,
      photos: project.photos || [],
      beforePhotos: project.beforePhotos || [],
      inspirationPhotos: project.inspirationPhotos || [],
      inspirationNotes: project.inspirationNotes || '',
    }));

    res.json({ success: true, projects: transformedProjects });
  } catch (error) {
    console.error('Error fetching active projects:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch active projects' });
  }
});

// ─── Get MongoDB _id from Clerk ID (used by chat) ────────────────────────────
router.get('/mongo-id/:clerkId', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const targetUser = await User.findOne({ clerkId: req.params.clerkId }).select('_id');
    if (!targetUser) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, mongoId: targetUser._id.toString() });
  } catch (error) {
    console.error('Error fetching mongo ID:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── Mark project as COMPLETE ─────────────────────────────────────────────────
// Must be BEFORE /:id to avoid route collision
router.patch('/:id/complete', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Only client can mark as complete
    if (project.client.clerkId !== user.clerkId) {
      return res.status(403).json({
        success: false,
        error: 'Only the project client can mark it as complete',
      });
    }

    // Must be in progress to complete
    if (project.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        error: 'Only in-progress projects can be completed',
      });
    }

    // Increment the designer's projectsCompleted count
    if (project.designer) {
      await User.findByIdAndUpdate(project.designer, {
        $inc: { 'designerProfile.projectsCompleted': 1 },
      });
    }

    project.status = 'completed';
    await project.save();

    // Re-fetch with populated designer
    const populated = await Project.findById(project._id)
      .populate('designer', 'name avatar')
      .lean();

    // ✅ UPDATED: Transform to include photo arrays
    const transformed = {
      ...populated,
      photos: populated?.photos || [],
      beforePhotos: populated?.beforePhotos || [],
      inspirationPhotos: populated?.inspirationPhotos || [],
      inspirationNotes: populated?.inspirationNotes || '',
    };

    res.json({
      success: true,
      project: transformed,
      message: 'Project marked as complete',
    });
  } catch (error) {
    console.error('Error completing project:', error);
    res.status(500).json({ success: false, error: 'Failed to complete project' });
  }
});

// ─── Single project detail ────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid project ID' });
    }

    const project = await Project.findById(req.params.id)
      .populate('designer', 'name avatar')
      .lean();

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const isAdmin    = user.isAdmin;
    const isClient   = project.client.clerkId === user.clerkId;
    const isDesigner = project.designer &&
      project.designer._id.toString() === user._id.toString();

    if (!isAdmin && !isClient && !isDesigner) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You are not the project client or hired designer',
      });
    }

    // ✅ UPDATED: Transform to include photo arrays
    const transformed = {
      ...project,
      photos: project.photos || [],
      beforePhotos: project.beforePhotos || [],
      inspirationPhotos: project.inspirationPhotos || [],
      inspirationNotes: project.inspirationNotes || '',
    };

    res.json({ success: true, project: transformed });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch project' });
  }
});

// ─── Create project ───────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    // ✅ UPDATED: Extract new photo fields from request
    const {
      title,
      description,
      location,
      budget,
      timeline,
      styles,
      photos,
      beforePhotos,
      inspirationPhotos,
      inspirationNotes,
      client,
    } = req.body;

    const project = new Project({
      title,
      description,
      location,
      budget,
      timeline,
      styles: styles || [],
      photos: photos || [],
      // ✅ NEW: Save separate photo arrays
      beforePhotos: beforePhotos || [],
      inspirationPhotos: inspirationPhotos || [],
      inspirationNotes: inspirationNotes || '',
      client: {
        ...client,
        clerkId: user.clerkId,
      },
    });

    await project.save();

    res.status(201).json({
      success: true,
      project,
      message: 'Project created successfully',
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ success: false, error: 'Failed to create project' });
  }
});

// ─── Update project ───────────────────────────────────────────────────────────
router.patch('/:id', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    if (!user.isAdmin && project.client.clerkId !== user.clerkId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // ✅ UPDATED: Handle new photo fields in updates
    const {
      title,
      description,
      location,
      budget,
      timeline,
      styles,
      photos,
      beforePhotos,
      inspirationPhotos,
      inspirationNotes,
    } = req.body;

    if (title !== undefined) project.title = title;
    if (description !== undefined) project.description = description;
    if (location !== undefined) project.location = location;
    if (budget !== undefined) project.budget = budget;
    if (timeline !== undefined) project.timeline = timeline;
    if (styles !== undefined) project.styles = styles;
    if (photos !== undefined) project.photos = photos;
    // ✅ NEW: Update photo arrays if provided
    if (beforePhotos !== undefined) project.beforePhotos = beforePhotos;
    if (inspirationPhotos !== undefined) project.inspirationPhotos = inspirationPhotos;
    if (inspirationNotes !== undefined) project.inspirationNotes = inspirationNotes;

    await project.save();

    res.json({
      success: true,
      project,
      message: 'Project updated successfully',
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ success: false, error: 'Failed to update project' });
  }
});

// ─── Delete project (admin only) ─────────────────────────────────────────────
router.delete('/:id', requireAuth, requireAdmin, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const project = await Project.findByIdAndDelete(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ success: false, error: 'Failed to delete project' });
  }
});

export default router;