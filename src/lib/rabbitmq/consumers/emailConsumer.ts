import type { Channel, ConsumeMessage } from 'amqplib';
import { QUEUE_NAMES } from '../connection';
import type { QueueMessage } from '../producer';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

async function processEmailMessage(message: QueueMessage): Promise<void> {
  const payload = message.payload as unknown as EmailPayload;
  console.info(`[EmailConsumer] Processing email to: ${payload.to}, subject: ${payload.subject}`);

  // Email sending will be implemented with nodemailer transporter
  // For now, log the message for development
  console.info(`[EmailConsumer] Email processed successfully`);
}

export async function startEmailConsumer(channel: Channel): Promise<void> {
  console.info('[EmailConsumer] Starting email consumer...');

  await channel.consume(
    QUEUE_NAMES.EMAIL,
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      try {
        const content = JSON.parse(msg.content.toString()) as QueueMessage;
        await processEmailMessage(content);
        channel.ack(msg);
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[EmailConsumer] Error processing message: ${error}`);

        // Reject and requeue if retry count is below threshold
        const content = JSON.parse(msg.content.toString()) as QueueMessage;
        const retryCount = content.retryCount ?? 0;

        if (retryCount < 3) {
          channel.nack(msg, false, true);
        } else {
          console.error(`[EmailConsumer] Message exceeded retry limit, discarding`);
          channel.nack(msg, false, false);
        }
      }
    },
    { noAck: false }
  );

  console.info('[EmailConsumer] Email consumer started');
}
