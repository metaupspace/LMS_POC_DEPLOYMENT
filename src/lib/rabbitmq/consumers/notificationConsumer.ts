import type { Channel, ConsumeMessage } from 'amqplib';
import { QUEUE_NAMES } from '../connection';
import type { QueueMessage } from '../producer';
import { connectDB } from '@/lib/db/connect';
import Notification from '@/lib/db/models/Notification';
import { sseManager } from '@/lib/sse/sseManager';

// Map queue message types to notification DB types
const typeMap: Record<string, string> = {
  assignment: 'assignment',
  course_assigned: 'assignment',
  session_assigned: 'session_reminder',
  badge_earned: 'badge_earned',
  proof_update: 'proof_update',
  streak: 'streak',
  welcome: 'general',
  general: 'general',
};

function resolveNotificationType(rawType: string): string {
  return typeMap[rawType] ?? 'general';
}

interface NotificationPayload {
  userId?: string;
  userIds?: string[];
  title?: string;
  message?: string;
  type?: string;
  courseId?: string;
  courseTitle?: string;
  sessionId?: string;
  sessionTitle?: string;
  badgeName?: string;
  badgeIcon?: string;
  [key: string]: unknown;
}

function buildNotification(
  msgType: string,
  payload: NotificationPayload
): { title: string; message: string; type: string; metadata: Record<string, unknown> } {
  const type = resolveNotificationType(msgType);

  // Use explicit title/message if provided
  if (payload.title && payload.message) {
    return {
      title: payload.title,
      message: payload.message,
      type,
      metadata: payload,
    };
  }

  // Build title/message from payload context
  switch (msgType) {
    case 'assignment':
    case 'course_assigned':
      return {
        title: 'New Course Assigned',
        message: payload.courseTitle
          ? `You have been assigned to "${payload.courseTitle}".`
          : 'You have been assigned a new course.',
        type,
        metadata: payload,
      };
    case 'session_assigned':
      return {
        title: 'New Training Session',
        message: payload.sessionTitle
          ? `You are enrolled in "${payload.sessionTitle}".`
          : 'You have been enrolled in a new session.',
        type,
        metadata: payload,
      };
    case 'badge_earned':
      return {
        title: 'Badge Earned!',
        message: payload.badgeName
          ? `You earned the ${payload.badgeName} badge! ${payload.badgeIcon ?? ''}`
          : 'You earned a new badge!',
        type,
        metadata: payload,
      };
    case 'proof_update':
      return {
        title: 'Proof of Work Update',
        message: 'Your proof of work submission has been reviewed.',
        type,
        metadata: payload,
      };
    default:
      return {
        title: payload.title ?? 'Notification',
        message: payload.message ?? 'You have a new notification.',
        type,
        metadata: payload,
      };
  }
}

async function processNotificationMessage(queueMsg: QueueMessage): Promise<void> {
  await connectDB();

  const payload = queueMsg.payload as unknown as NotificationPayload;
  const msgType = queueMsg.type;

  // Determine recipient(s)
  const userIds: string[] = payload.userIds
    ? payload.userIds
    : payload.userId
      ? [payload.userId]
      : [];

  if (userIds.length === 0) {
    console.warn('[NotificationConsumer] No recipient userIds, skipping');
    return;
  }

  const { title, message, type, metadata } = buildNotification(msgType, payload);

  // Persist to DB
  const docs = userIds.map((userId) => ({
    user: userId,
    title,
    message,
    type,
    read: false,
    metadata,
  }));

  await Notification.insertMany(docs);

  // Push to SSE clients in real-time
  const ssePayload = {
    type,
    title,
    message,
    metadata,
    createdAt: new Date().toISOString(),
  };

  sseManager.sendToUsers(userIds, ssePayload);
}

export async function startNotificationConsumer(channel: Channel): Promise<void> {
  console.info('[NotificationConsumer] Starting notification consumer...');

  await channel.consume(
    QUEUE_NAMES.NOTIFICATION,
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      try {
        const content = JSON.parse(msg.content.toString()) as QueueMessage;
        await processNotificationMessage(content);
        channel.ack(msg);
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[NotificationConsumer] Error processing message: ${error}`);

        const content = JSON.parse(msg.content.toString()) as QueueMessage;
        const retryCount = content.retryCount ?? 0;

        if (retryCount < 3) {
          channel.nack(msg, false, true);
        } else {
          console.error(`[NotificationConsumer] Message exceeded retry limit, discarding`);
          channel.nack(msg, false, false);
        }
      }
    },
    { noAck: false }
  );

  console.info('[NotificationConsumer] Notification consumer started');
}
