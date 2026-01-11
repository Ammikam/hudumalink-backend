import express from 'express';
import Project from '../models/Project';
import { requireAuth } from '../middlewares/auth';
import { requireAdmin } from '../middlewares/roles';

const router = express.Router();

/**
 * CLIENT: Get own projects
 * GET /api/projects
 */
router.get('/', requireAuth, async (req: any, res) => {
  try {
    const projects = await Project.find({
      'client.clerkId': req.user.clerkId,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      projects,
      count: projects.length,
    });
  } catch (error) {
    console.error('Error fetching client projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
    });
  }
});

/**
 * ADMIN: Get all projects
 * GET /api/projects/admin
 */
router.get('/admin', requireAuth, requireAdmin, async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      projects,
      count: projects.length,
    });
  } catch (error) {
    console.error('Error fetching admin projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
    });
  }
});

/**
 * Get single project (client OR admin)
 * GET /api/projects/:id
 */
router.get('/:id', requireAuth, async (req: any, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    // Client can only view own project
    if (
      !req.user.isAdmin &&
      project.client.clerkId !== req.user.clerkId
    ) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    res.json({
      success: true,
      project,
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project',
    });
  }
});

/**
 * Create project (client only)
 * POST /api/projects
 */
router.post('/', requireAuth, async (req: any, res) => {
  try {
    const project = new Project({
      ...req.body,
      client: {
        ...req.body.client,
        clerkId: req.user.clerkId, // 🔐 never trust frontend
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
    res.status(500).json({
      success: false,
      error: 'Failed to create project',
    });
  }
});

/**
 * Update project (owner or admin)
 * PATCH /api/projects/:id
 */
router.patch('/:id', requireAuth, async (req: any, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    if (
      !req.user.isAdmin &&
      project.client.clerkId !== req.user.clerkId
    ) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    Object.assign(project, req.body);
    await project.save();

    res.json({
      success: true,
      project,
      message: 'Project updated successfully',
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project',
    });
  }
});

/**
 * Delete project (admin only)
 * DELETE /api/projects/:id
 */
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project',
    });
  }
});

export default router;
