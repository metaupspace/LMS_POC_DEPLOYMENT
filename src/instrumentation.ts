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

    // Start cron jobs (session status sync, etc.)
    try {
      const { startCronJobs } = await import('@/lib/cron/index');
      startCronJobs();
      console.info('[Instrumentation] Cron jobs started');
    } catch (err) {
      console.error(
        '[Instrumentation] Failed to start cron jobs:',
        err instanceof Error ? err.message : err
      );
    }
  }
}
