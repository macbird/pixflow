import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required (export it before running check_db.js)");
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

async function check() {
  try {
    await prisma.$connect();
    console.log("Connected successfully!");
    
    // Check if key tables exist
    const result = await prisma.$queryRaw`SELECT count(*) FROM information_schema.tables WHERE table_name = 'payment_webhook_logs';`;
    console.log("PaymentWebhookLog table exists:", result[0].count > 0);
    
    await prisma.$disconnect();
  } catch (e) {
    console.error("Connection failed:", e.message);
    process.exit(1);
  }
}
check();
