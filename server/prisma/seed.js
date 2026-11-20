import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { slugifyCategory } from "../src/lib/category.js";

// Prisma 7 runtime connections go through a driver adapter (see src/db.js).
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

async function main() {
  console.log("Seeding database...");

  // Idempotent seed: wipe in FK-safe order.
  await prisma.claim.deleteMany();
  await prisma.itemImage.deleteMany();
  await prisma.item.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@reclaim.test",
      passwordHash,
      name: "Admin User",
      phone: "+85511111111",
      role: "ADMIN",
    },
  });

  const sothy = await prisma.user.create({
    data: {
      email: "sothy@reclaim.test",
      passwordHash,
      name: "Sothy Chan",
      phone: "+85522222222",
    },
  });

  const dada = await prisma.user.create({
    data: {
      email: "dada@reclaim.test",
      passwordHash,
      name: "Dada Kim",
      phone: "+85533333333",
    },
  });

  const itemsData = [
    {
      title: "Black iPhone charger with blue tape",
      description:
        "Found a black USB-C charger with blue electrical tape near the library entrance. The cable has a small fray near the plug.",
      category: "Charger",
      foundLocation: "Main Library, 1st floor entrance",
      foundAt: daysAgo(1),
      posterId: sothy.id,
    },
    {
      title: "Silver umbrella with wooden handle",
      description:
        "Left behind in the cafeteria. Silver canopy, wooden J-shaped handle with the initials 'KM' written in marker.",
      category: "Umbrella",
      foundLocation: "Cafeteria, table 12",
      foundAt: daysAgo(2),
      posterId: sothy.id,
    },
    {
      title: "Casio scientific calculator",
      description:
        "Found a Casio fx-991 calculator on the first row of seats in Room B204. Back cover has a red sticker.",
      category: "Calculator",
      foundLocation: "Room B204",
      foundAt: daysAgo(3),
      posterId: dada.id,
    },
    {
      title: "Blue metal water bottle",
      description:
        "A blue metal water bottle with a dent near the base, found on the basketball court bench.",
      category: "Water bottle",
      foundLocation: "Basketball court bench",
      foundAt: daysAgo(4),
      posterId: dada.id,
    },
    {
      title: "Keyring with three keys and a green tag",
      description:
        "Found a keyring with three silver keys and a green plastic tag in the shuttle bus. Handing it to campus security if unclaimed.",
      category: "Keys",
      foundLocation: "Campus shuttle bus #3",
      foundAt: daysAgo(6),
      posterId: admin.id,
    },
    {
      title: "Prescription glasses in a brown case",
      description:
        "A brown glasses case with metal-framed prescription glasses inside. Left in the computer lab next to workstation 7.",
      category: "Eyewear",
      foundLocation: "Computer lab, workstation 7",
      foundAt: daysAgo(8),
      posterId: sothy.id,
      status: "RETURNED",
      handoverNote: "Returned to owner after verifying prescription receipt.",
    },
  ];

  // Categories are poster-defined: create them on the fly from the seed data.
  const categoryIds = new Map();
  const categoryId = async (name) => {
    if (categoryIds.has(name)) return categoryIds.get(name);
    const slug = slugifyCategory(name);
    const category = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name, slug },
    });
    categoryIds.set(name, category.id);
    return category.id;
  };

  const items = [];
  for (const data of itemsData) {
    const { category, ...rest } = data;
    items.push(
      await prisma.item.create({ data: { ...rest, categoryId: await categoryId(category) } }),
    );
  }

  await prisma.claim.create({
    data: {
      itemId: items[2].id, // calculator
      claimantId: sothy.id,
      message:
        "That is my calculator. The back cover has a red sticker and the initials 'SC' scratched inside the battery compartment.",
    },
  });

  await prisma.claim.create({
    data: {
      itemId: items[0].id, // charger
      claimantId: dada.id,
      message:
        "I lost this charger on Tuesday. The blue tape is mine — I wrapped it around the joint because it was fraying.",
    },
  });

  console.log("Seed complete:");
  console.log(`  users: ${[admin, sothy, dada].map((u) => u.email).join(", ")}`);
  console.log("  password for all users: password123");
  console.log(`  categories: ${categoryIds.size}, items: ${items.length}, claims: 2`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
