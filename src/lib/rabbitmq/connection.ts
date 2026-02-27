import amqplib, { type ChannelModel, type Channel } from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL;

interface RabbitMQCache {
  connection: ChannelModel | null;
  channel: Channel | null;
  connecting: Promise<Channel> | null;
}

declare global {
  // eslint-disable-next-line no-var, no-unused-vars
  var rabbitmqCache: RabbitMQCache | undefined;
}

const cached: RabbitMQCache = global.rabbitmqCache ?? {
  connection: null,
  channel: null,
  connecting: null,
};

if (!global.rabbitmqCache) {
  global.rabbitmqCache = cached;
}

export const QUEUE_NAMES = {
  EMAIL: 'email_queue',
  NOTIFICATION: 'notification_queue',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

async function createConnection(): Promise<Channel> {
  if (!RABBITMQ_URL) {
    throw new Error('RABBITMQ_URL environment variable is not defined');
  }

  const connection = await amqplib.connect(RABBITMQ_URL);

  connection.on('error', (err: Error) => {
    console.error('[RabbitMQ] Connection error:', err.message);
    cached.connection = null;
    cached.channel = null;
    cached.connecting = null;
  });

  connection.on('close', () => {
    console.info('[RabbitMQ] Connection closed. Will reconnect on next use.');
    cached.connection = null;
    cached.channel = null;
    cached.connecting = null;
  });

  const channel = await connection.createChannel();

  await channel.prefetch(10);

  for (const queueName of Object.values(QUEUE_NAMES)) {
    await channel.assertQueue(queueName, {
      durable: true,
      arguments: {
        'x-message-ttl': 86400000, // 24 hours
      },
    });
  }

  console.info('[RabbitMQ] Connected and queues asserted');

  cached.connection = connection;
  cached.channel = channel;

  return channel;
}

export async function getRabbitMQChannel(): Promise<Channel> {
  if (cached.channel) {
    return cached.channel;
  }

  if (!cached.connecting) {
    cached.connecting = createConnection();
  }

  const channel = await cached.connecting;
  cached.connecting = null;
  return channel;
}

export async function closeRabbitMQ(): Promise<void> {
  if (cached.channel) {
    await cached.channel.close();
    cached.channel = null;
  }
  if (cached.connection) {
    await cached.connection.close();
    cached.connection = null;
  }
  cached.connecting = null;
  console.info('[RabbitMQ] Disconnected gracefully');
}
