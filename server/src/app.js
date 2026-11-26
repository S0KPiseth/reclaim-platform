import express from "express";
import cors from "cors";
import session from "express-session";
import path from "node:path";
import { config } from "./config.js";
import authRoutes from "./routes/auth.js";
import itemsRouter from "./routes/items.js";
import { imagesRouter, itemImagesRouter } from "./routes/images.js";
import claimsRouter, { itemClaimsRouter } from "./routes/claims.js";
import categoriesRouter from "./routes/categories.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";

export const app = express();

app.use(
  cors({
    origin: [
      /^http:\/\/localhost(:\d+)?$/,
      /^https:\/\/localhost(:\d+)?$/,
      /^http:\/\/127\.0\.0\.1(:\d+)?$/,
    ],
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    name: config.sessionCookieName,
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: config.cookieSecure,
      maxAge: config.sessionMaxAgeMs,
    },
  }),
);

// Serve uploaded images at /uploads/<filename>
app.use(config.publicPathPrefix, express.static(path.resolve(process.cwd(), config.uploadDir)));

app.get("/", (_req, res) => {
  res.json({ name: "Reclaim Lost & Found API", status: "ok" });
});

app.use("/auth", authRoutes);
// Claim/image sub-routes are two-segment paths, so they never clash with /items/:id.
app.use("/items", itemClaimsRouter);
app.use("/items", itemImagesRouter);
app.use("/items", itemsRouter);
app.use("/claims", claimsRouter);
app.use("/categories", categoriesRouter);
app.use("/images", imagesRouter);

app.use(notFoundHandler);
app.use(errorHandler);
