import { getRabbitMQChannel, type QueueName } from './connection';

export interface QueueMessage {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
  retryCount?: number;
}

export async function publishToQueue(queueName: QueueName, message: QueueMessage): Promise<boolean> {
  const channel = await getRabbitMQChannel();

  const buffer = Buffer.from(JSON.stringify(message));

  const sent = channel.sendToQueue(queueName, buffer, {
    persistent: true,
    contentType: 'application/json',
    timestamp: Date.now(),
  });

  if (!sent) {
    console.error(`[RabbitMQ] Failed to publish message to ${queueName}`);
  }

  return sent;
}
