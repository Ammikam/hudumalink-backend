
import express from 'express';
import User from '../models/User';
import Project from '../models/Project';

const router = express.Router();

// Cache for 60 seconds to avoid hitting DB on every homepage load
let cachedStats: any = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 1000; // 60 seconds

// ─── GET /api/stats ───────────────────────────────────────────────────────────
// Returns real platform-wide statistics for the homepage hero
router.get('/', async (_req, res) => {
  try {
    const now = Date.now();

    // Return cached if fresh
    if (cachedStats && now - cacheTimestamp < CACHE_TTL) {
      return res.json({ success: true, stats: cachedStats, cached: true });
    }

    // ── 1. Verified designers count ──────────────────────────────────────────
    const verifiedCount = await User.countDocuments({
      roles: 'designer',
      designerProfile: { $ne: null },
      'designerProfile.status': 'approved',
      banned: { $ne: true },
      $or: [
        { 'designerProfile.verified': true },
        { 'designerProfile.superVerified': true },
      ],
    });

    // ── 2. Total completed projects ──────────────────────────────────────────
    const completedProjectsCount = await Project.countDocuments({ status: 'completed' });

    // ── 3. Average rating across all designers ───────────────────────────────
    const designers = await User.find({
      roles: 'designer',
      designerProfile: { $ne: null },
      'designerProfile.status': 'approved',
      banned: { $ne: true },
      'designerProfile.reviewCount': { $gt: 0 }, // only count designers with reviews
    }).select('designerProfile.rating designerProfile.reviewCount');

    let totalRating = 0;
    let totalReviews = 0;

    designers.forEach(d => {
      const rating = d.designerProfile?.rating ?? 0;
      const count  = d.designerProfile?.reviewCount ?? 0;
      if (count > 0) {
        totalRating  += rating * count; // weighted by review count
        totalReviews += count;
      }
    });

    const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;

    // ── 4. Best project (admin-selected or highest-budget completed) ─────────
    // For now we'll use the highest-budget completed project with photos
    // Later you can add a `featured: true` field and let admin pick it
    const bestProject = await Project.findOne({
      status: 'completed',
      photos: { $exists: true, $ne: [] },
    })
      .sort({ budget: -1 }) // highest budget first
      .populate('designer', 'name avatar rating')
      .lean();

    // Build the stats object
    const stats = {
      verifiedDesigners: verifiedCount,
      completedProjects: completedProjectsCount,
      averageRating: Number(averageRating.toFixed(1)),

      // Best project (can be null if no completed projects with photos exist yet)
      featuredProject: bestProject ? {
        _id:         bestProject._id.toString(),
        title:       bestProject.title || 'Featured Project',
        location:    bestProject.location || 'Nairobi',
        budget:      bestProject.budget || 0,
        timeline:    bestProject.timeline || '',
        photos:      bestProject.photos || [],
        clientName:  bestProject.client?.name || 'Client',
        designer: bestProject.designer ? {
          _id:    (bestProject.designer as any)._id.toString(),
          name:   (bestProject.designer as any).name || 'Designer',
          avatar: (bestProject.designer as any).avatar || '',
          rating: (bestProject.designer as any).rating || 0,
        } : null,
      } : null,
    };

    // Cache it
    cachedStats = stats;
    cacheTimestamp = now;

    res.json({ success: true, stats, cached: false });
  } catch (error) {
    console.error('[stats] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

export default router;