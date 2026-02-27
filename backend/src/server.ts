import 'dotenv/config';
import app from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    app.listen(env.port, () => {
      console.log(`🚀 Server running on http://localhost:${env.port}`);
      console.log(`   Environment: ${env.nodeEnv}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();
