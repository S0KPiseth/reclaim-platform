import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7: the database connection URL for the CLI lives here (not in schema.prisma).
// The application runtime connects through a driver adapter — see src/db.js.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
