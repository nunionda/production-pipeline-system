import "dotenv/config";
import { PrismaClient, UserRole } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hash } from "bcryptjs";

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Admin user
  const adminPassword = await hash("admin1234", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@nunionda.com" },
    update: {},
    create: {
      email: "admin@nunionda.com",
      name: "관리자",
      hashedPassword: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  // PD user
  const pdPassword = await hash("pd1234", 12);
  const pd = await prisma.user.upsert({
    where: { email: "pd@nunionda.com" },
    update: {},
    create: {
      email: "pd@nunionda.com",
      name: "김PD",
      hashedPassword: pdPassword,
      role: UserRole.PD,
    },
  });

  // AD user
  const adPassword = await hash("ad1234", 12);
  const ad = await prisma.user.upsert({
    where: { email: "ad@nunionda.com" },
    update: {},
    create: {
      email: "ad@nunionda.com",
      name: "이조감독",
      hashedPassword: adPassword,
      role: UserRole.AD,
    },
  });

  console.log("✅ Users created:", { admin: admin.email, pd: pd.email, ad: ad.email });

  // Sample project
  const project = await prisma.project.upsert({
    where: { id: "sample-project-1" },
    update: {},
    create: {
      id: "sample-project-1",
      title: "비밀의 숲 시즌3",
      format: "DRAMA",
      platform: "tvN",
      description: "검찰과 경찰의 합동 수사를 다룬 추리 스릴러 드라마 시즌3",
      phase: "PRE_PRODUCTION",
      members: {
        create: [
          { userId: pd.id, role: "PD" },
          { userId: ad.id, role: "AD" },
        ],
      },
    },
  });

  console.log("✅ Sample project created:", project.title);
  console.log("");
  console.log("📋 로그인 정보:");
  console.log("  관리자: admin@nunionda.com / admin1234");
  console.log("  PD: pd@nunionda.com / pd1234");
  console.log("  조감독: ad@nunionda.com / ad1234");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
