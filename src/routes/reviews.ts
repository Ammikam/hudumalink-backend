// backend/routes/reviews.ts
import express from 'express';
import Review from '../models/Review';
import Project from '../models/Project';
import User from '../models/User';
import { requireAuth } from '../middlewares/auth';
import { RequestWithUser } from '../types';

const router = express.Router();

// Create a review
router.post('/', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const { projectId, designerId, rating, review } = req.body;

    // Validate required fields
    if (!projectId || !designerId || !rating) {
      return res.status(400).json({
        success: false,
        error: 'Project ID, Designer ID, and rating are required',
      });
    }

    // Check if project exists and belongs to the user
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    if (project.client.clerkId !== user.clerkId) {
      return res.status(403).json({
        success: false,
        error: 'You can only review your own projects',
      });
    }

    // Check if project is completed
    if (project.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Project must be completed before reviewing',
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ project: projectId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        error: 'You have already reviewed this project',
      });
    }

    // Create review
    const newReview = new Review({
      project: projectId,
      client: user._id,
      designer: designerId,
      rating,
      review: review || '',
    });

    await newReview.save();

    // Update designer's average rating
    await updateDesignerRating(designerId);

    res.status(201).json({
      success: true,
      review: newReview,
      message: 'Review submitted successfully',
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create review',
    });
  }
});

// Get reviews for a designer
router.get('/designer/:designerId', async (req, res) => {
  try {
    const reviews = await Review.find({ designer: req.params.designerId })
      .populate('client', 'name avatar')
      .populate('project', 'title')
      .sort({ createdAt: -1 });

    const stats = await getDesignerReviewStats(req.params.designerId);

    res.json({
      success: true,
      reviews,
      stats,
    });
  } catch (error) {
    console.error('Error fetching designer reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reviews',
    });
  }
});

// Get review for a specific project
router.get('/project/:projectId', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const review = await Review.findOne({ project: req.params.projectId })
      .populate('client', 'name avatar')
      .populate('designer', 'name avatar');

    res.json({
      success: true,
      review,
    });
  } catch (error) {
    console.error('Error fetching project review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch review',
    });
  }
});

// Helper function to calculate and update designer rating
async function updateDesignerRating(designerId: string) {
  const reviews = await Review.find({ designer: designerId });
  
  if (reviews.length === 0) return;

  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalRating / reviews.length;

  await User.findByIdAndUpdate(designerId, {
    'designer.rating': averageRating,
    'designer.reviewCount': reviews.length,
  });
}

// Helper function to get designer review statistics
async function getDesignerReviewStats(designerId: string) {
  const reviews = await Review.find({ designer: designerId });
  
  if (reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    };
  }

  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalRating / reviews.length;

  const ratingDistribution = reviews.reduce((acc, review) => {
    acc[review.rating] = (acc[review.rating] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  return {
    averageRating: Math.round(averageRating * 10) / 10,
    totalReviews: reviews.length,
    ratingDistribution: {
      5: ratingDistribution[5] || 0,
      4: ratingDistribution[4] || 0,
      3: ratingDistribution[3] || 0,
      2: ratingDistribution[2] || 0,
      1: ratingDistribution[1] || 0,
    },
  };
}

export default router;