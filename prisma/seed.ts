import { scryptSync, randomBytes } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

async function main() {
  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD;
  if (!email || !password) {
    console.log("SEED_USER_EMAIL / SEED_USER_PASSWORD not set — skipping seed.");
    return;
  }

  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {},
    create: {
      email: email.toLowerCase(),
      passwordHash: hashPassword(password),
      name: "Dev User",
      knowledge: {
        create: {
          headline: "",
          expertise: "",
          audience: "",
          tone: "",
          topics: [],
          sources: "",
        },
      },
    },
  });

  console.log(`Seeded user: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
