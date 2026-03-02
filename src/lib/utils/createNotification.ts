import { connectDB } from '@/lib/db/connect';
import Notification from '@/lib/db/models/Notification';

export interface BulkNotificationPayload {
  userIds: string[];
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Write notifications directly to DB. Used by:
 * 1. The RabbitMQ consumer (normal path)
 * 2. Fallback when RabbitMQ is down
 */
export async function createBulkNotifications(payload: BulkNotificationPayload): Promise<void> {
  await connectDB();

  const docs = payload.userIds.map((userId) => ({
    user: userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    read: false,
    metadata: payload.metadata ?? {},
  }));

  await Notification.insertMany(docs);
}
