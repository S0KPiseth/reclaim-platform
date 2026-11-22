import { app } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { embeddingHealth, isEmbeddingEnabled } from "./lib/embedding.js";

const server = app.listen(config.port, () => {
  console.log(`Reclaim API listening on http://localhost:${config.port}`);
  // Report embedding-service state once at boot. A missing service is not
  // fatal: search degrades to keyword matching and writes still work.
  if (!isEmbeddingEnabled()) {
    console.log("Embedding service disabled (EMBEDDING_URL not set) - search uses SQL keywords only");
    return;
  }
  embeddingHealth().then((health) => {
    if (health.status === "ok") {
      console.log(
        `Embedding service ready at ${config.embeddingUrl} (model ${health.model_version}, dim ${health.dim}, ${health.device})`,
      );
    } else {
      console.warn(
        `Embedding service unavailable at ${config.embeddingUrl} (${health.error ?? health.status}) - search falls back to keywords`,
      );
    }
  });
});

async function shutdown(signal) {
  console.log(`\n${signal} received, shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
