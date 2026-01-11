export const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.user.roles.includes('admin')) {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
};

export const requireDesigner = (req: any, res: any, next: any) => {
  if (!req.user.roles.includes('designer')) {
    return res.status(403).json({ error: 'Designer only' });
  }
  next();
};
