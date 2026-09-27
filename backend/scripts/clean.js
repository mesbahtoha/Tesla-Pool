// One-off cleanup of temp/debug users. Usage: node scripts/clean.js <email>
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("Usage: node scripts/clean.js <email>");
  let emails = [email];
  if (email.endsWith("%")) {
    const prefix = email.slice(0, -1);
    const found = await prisma.user.findMany({ where: { email: { startsWith: prefix } }, select: { email: true } });
    emails = found.map((f) => f.email);
    if (!emails.length) {
      console.log("no users with prefix:", prefix);
      return;
    }
  }
  for (const em of emails) {
    const u = await prisma.user.findUnique({ where: { email: em } });
    if (!u) continue;
  await prisma.rideEvent.deleteMany({ where: { actorId: u.id } });
    // If the user occupies seats in someone else's pool, give them back first.
    const seats = await prisma.poolMember.findMany({ where: { passengerId: u.id }, select: { poolId: true, seats: true } });
    await prisma.poolMember.deleteMany({ where: { passengerId: u.id } });
    for (const s of seats) {
      await prisma.pool.update({ where: { id: s.poolId }, data: { occupiedSeats: { decrement: s.seats } } });
    }
    await prisma.rideRequest.deleteMany({ where: { passengerId: u.id } });
    await prisma.transaction.deleteMany({ where: { userId: u.id } });
    const pools = await prisma.pool.findMany({ where: { driverId: u.id }, select: { id: true } });
    for (const pl of pools) {
      await prisma.poolMember.deleteMany({ where: { poolId: pl.id } });
      await prisma.rideEvent.deleteMany({ where: { poolId: pl.id } });
    }
    await prisma.pool.deleteMany({ where: { driverId: u.id } });
    await prisma.vehicle.deleteMany({ where: { driverId: u.id } });
    await prisma.user.delete({ where: { id: u.id } });
    console.log("cleaned:", em);
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); }).finally(() => prisma.$disconnect());
