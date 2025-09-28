import { prisma } from '@repo/prisma';

async function main() {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const res = await prisma.activityLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  // eslint-disable-next-line no-console
  console.log(`Purged ${res.count} activity logs older than 90 days`);
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
