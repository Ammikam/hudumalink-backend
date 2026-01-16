import { clerkClient } from '@clerk/clerk-sdk-node';
import User from '../models/User';
import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  user?: any; // We'll improve typing later if needed
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No authorization token provided',
      });
    }

    const token = authHeader.replace('Bearer ', '');

    const verified = await clerkClient.verifyToken(token);

    if (!verified || !verified.sub) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }

    let user = await User.findOne({ clerkId: verified.sub });

    if (!user) {
      const clerkUserData = await clerkClient.users.getUser(verified.sub);

      user = await User.create({
        clerkId: verified.sub,
        name:
          clerkUserData.firstName && clerkUserData.lastName
            ? `${clerkUserData.firstName} ${clerkUserData.lastName}`
            : clerkUserData.username || 'User',
        email: clerkUserData.emailAddresses[0]?.emailAddress || '',
        roles: ['client'],
      });

      console.log('New user created:', user.email);
    }

    // Attach the FULL user document — safer and more reliable
    req.user = user;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};