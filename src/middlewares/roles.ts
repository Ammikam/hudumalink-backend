import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  user?: {
    roles?: string[];
  };
}

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!req.user.roles?.includes('admin')) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization error',
    });
  }
};

export const requireDesigner = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!req.user.roles?.includes('designer')) {
      return res.status(403).json({
        success: false,
        error: 'Designer access required',
      });
    }

    next();
  } catch (error) {
    console.error('Designer middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization error',
    });
  }
};
