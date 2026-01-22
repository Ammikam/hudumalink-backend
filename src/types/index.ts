// src/types/index.ts
import { Request } from 'express';

export interface UserPayload {
  _id: string;
  clerkId: string;
  email: string;
  name: string;
  roles: string[];
  isAdmin?: boolean;
}

export interface RequestWithUser extends Request {
  user?: UserPayload;
}