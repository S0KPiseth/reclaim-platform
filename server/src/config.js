import "dotenv/config";

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const config = {
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  port: Number(process.env.PORT ?? 3445),
  jwtExpiresIn: "7d",
  uploadDir: "uploads",
  publicPathPrefix: "/uploads",
  maxImagesPerItem: 5,
  maxImageBytes: 5 * 1024 * 1024, // 5 MB
};
