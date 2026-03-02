export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { getRabbitMQChannel } = await import('@/lib/rabbitmq/connection');
      const { startNotificationConsumer } = await import(
        '@/lib/rabbitmq/consumers/notificationConsumer'
      );

      const channel = await getRabbitMQChannel();
      await startNotificationConsumer(channel);

      console.info('[Instrumentation] RabbitMQ consumers started');
    } catch (err) {
      console.error(
        '[Instrumentation] Failed to start RabbitMQ consumers — notifications will use direct DB fallback:',
        err instanceof Error ? err.message : err
      );
    }
  }
}
