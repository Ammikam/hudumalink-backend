import { clerkClient } from '@clerk/clerk-sdk-node';
import User from '../models/User';

export const requireAuth = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        error: 'No authorization token provided' 
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token with Clerk - simpler approach without extra options
    const verified = await clerkClient.verifyToken(token);

    if (!verified || !verified.sub) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token' 
      });
    }

    // Find or create user in your database
    let user = await User.findOne({ clerkId: verified.sub });
    
    if (!user) {
      // Fetch user details from Clerk
      const clerkUserData = await clerkClient.users.getUser(verified.sub);
      
      // Auto-create user with Clerk data
      user = await User.create({
        clerkId: verified.sub,
        name: clerkUserData.firstName && clerkUserData.lastName 
          ? `${clerkUserData.firstName} ${clerkUserData.lastName}`
          : clerkUserData.username || 'User',
        email: clerkUserData.emailAddresses[0]?.emailAddress || '',
        roles: ['client'],
      });
      
      console.log('✅ New user created:', user.email);
    }

    // Attach user to request
    req.user = {
      _id: user._id,
      clerkId: user.clerkId,
      roles: user.roles,
      isAdmin: user.roles?.includes('admin') || false,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ 
      success: false,
      error: 'Invalid or expired token' 
    });
  }
};