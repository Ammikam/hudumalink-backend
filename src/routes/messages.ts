
import express from 'express';
import mongoose, { Schema, Document } from 'mongoose';
import { requireAuth } from '../middlewares/auth';
import { RequestWithUser } from '../types';

// ─── Inline Message model (or import from models/Message if you have one) ────
interface IMessage extends Document {
  project: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  senderClerkId: string;
  text: string;
  readBy: string[]; // array of clerkIds who have read this message
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  project:       { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  sender:        { type: Schema.Types.ObjectId, ref: 'User',    required: true },
  senderClerkId: { type: String, required: true },
  text:          { type: String, required: true },
  readBy:        { type: [String], default: [] },
}, { timestamps: true });

const Message = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);

const router = express.Router();

// ─── GET /api/messages/unread-counts ─────────────────────────────────────────
// Returns { projectId: unreadCount } for every project the caller is part of.
// Used by dashboards to show unread badges without fetching full conversations.
router.get('/unread-counts', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    // Aggregate: for each project, count messages NOT read by this user
    // and NOT sent by this user
    const counts = await Message.aggregate([
      {
        $match: {
          senderClerkId: { $ne: user.clerkId },   // not sent by me
          readBy:        { $nin: [user.clerkId] }, // not yet read by me
        },
      },
      {
        $group: {
          _id:   '$project',
          count: { $sum: 1 },
        },
      },
    ]);

    // Shape into { [projectId]: count }
    const result: Record<string, number> = {};
    counts.forEach(({ _id, count }) => {
      result[_id.toString()] = count;
    });

    res.json({ success: true, unreadCounts: result });
  } catch (err) {
    console.error('[unread-counts]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch unread counts' });
  }
});

// ─── POST /api/messages ───────────────────────────────────────────────────────
// Send a message. Body: { projectId, text }
router.post('/', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { projectId, text } = req.body;
  if (!projectId || !text?.trim()) {
    return res.status(400).json({ success: false, error: 'projectId and text are required' });
  }

  try {
    const msg = await Message.create({
      project:       projectId,
      sender:        user._id,
      senderClerkId: user.clerkId,
      text:          text.trim(),
      readBy:        [user.clerkId], // sender has already "read" their own message
    });

    res.status(201).json({ success: true, message: msg });
  } catch (err) {
    console.error('[send-message]', err);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// ─── GET /api/messages/:projectId ────────────────────────────────────────────
// Fetch all messages for a project + mark them as read for the caller.
router.get('/:projectId', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const messages = await Message.find({ project: req.params.projectId })
      .sort({ createdAt: 1 })
      .populate('sender', 'name avatar')
      .lean();

    // Mark all unread messages as read for this user (bulk write for performance)
    await Message.updateMany(
      {
        project: req.params.projectId,
        readBy:  { $nin: [user.clerkId] },
      },
      { $addToSet: { readBy: user.clerkId } }
    );

    res.json({ success: true, messages });
  } catch (err) {
    console.error('[get-messages]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

export default router;
export { Message }; // export model in case ProjectChat needs to import it