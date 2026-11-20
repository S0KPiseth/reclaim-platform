import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { forbidden, unauthorized } from "./errors.js";

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

export const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  phone: user.phone,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

async function loadUserFromRequest(req) {
  const header = req.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) return null;

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw unauthorized("Invalid or expired token", "INVALID_TOKEN");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw unauthorized("User no longer exists", "INVALID_TOKEN");

  return user;
}

// Requires a valid Bearer token; sets req.user.
export async function requireAuth(req, _res, next) {
  try {
    const user = await loadUserFromRequest(req);
    if (!user) throw unauthorized("Authentication required", "UNAUTHORIZED");
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// For public routes that change behaviour for logged-in users; never throws.
export async function optionalAuth(req, _res, next) {
  try {
    req.user = (await loadUserFromRequest(req)) ?? null;
  } catch {
    req.user = null;
  }
  next();
}

// Responds 403 when the current user is neither the owner nor an admin.
export function requireOwnerOrAdmin(getOwnerId) {
  return async (req, res, next) => {
    try {
      const ownerId = await getOwnerId(req);
      const isOwner = ownerId === req.user.id;
      const isAdmin = req.user.role === "ADMIN";
      if (!isOwner && !isAdmin) throw forbidden("Only the owner or an admin can do that");
      next();
    } catch (err) {
      next(err);
    }
  };
}

export const isAdmin = (user) => user?.role === "ADMIN";
