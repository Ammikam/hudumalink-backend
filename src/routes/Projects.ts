import express from 'express';
import Project from '../models/Project';
import { requireAuth } from '../middlewares/auth';
import { requireAdmin } from '../middlewares/roles';

const router = express.Router();


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


router.get('/admin', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('Admin fetching projects...');

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const skip = (page - 1) * limit;

    const projects = await Project.find()
      .populate('client', 'name avatar')
      .populate('designer', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log('Projects fetched:', projects.length); 
    console.log('Sample project:', projects[0]);

    const total = await Project.countDocuments();

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
  } catch (error: any) {
    console.error('PROJECTS ADMIN ERROR:', error); 
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
      details: error.message,
    });
  }
});


router.get('/:id', requireAuth, async (req: any, res) => {
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
