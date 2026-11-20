import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "./config.js";

// Prisma 7 no longer reads `url` from schema.prisma — the runtime connection is
// provided by a driver adapter (node-postgres in this case).
const adapter = new PrismaPg({ connectionString: config.databaseUrl });

// Single PrismaClient instance shared across the app (avoids dev hot-reload leaks).
export const prisma = new PrismaClient({ adapter });
