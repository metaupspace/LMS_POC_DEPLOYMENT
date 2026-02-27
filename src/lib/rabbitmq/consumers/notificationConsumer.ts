import type { Channel, ConsumeMessage } from 'amqplib';
import { QUEUE_NAMES } from '../connection';
import type { QueueMessage } from '../producer';

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

async function processNotificationMessage(message: QueueMessage): Promise<void> {
  const payload = message.payload as unknown as NotificationPayload;
  console.info(
    `[NotificationConsumer] Processing notification for user: ${payload.userId}, title: ${payload.title}`
  );

  // Notification persistence and real-time delivery will be implemented here
  // For now, log the message for development
  console.info(`[NotificationConsumer] Notification processed successfully`);
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
