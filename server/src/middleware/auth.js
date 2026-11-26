import { config } from "../config.js";
import { prisma } from "../db.js";
import { forbidden, unauthorized } from "./errors.js";

export const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  phone: user.phone,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// Regenerates the session ID on login/register to prevent session fixation.
export function establishSession(req, user) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((regenErr) => {
      if (regenErr) return reject(regenErr);
      req.session.userId = user.id;
      req.session.save((saveErr) => {
        if (saveErr) return reject(saveErr);
        resolve();
      });
    });
  });
}

export function destroySession(req, res) {
  return new Promise((resolve, reject) => {
    const clear = () => {
      res.clearCookie(config.sessionCookieName, {
        httpOnly: true,
        sameSite: "lax",
        secure: config.cookieSecure,
      });
      resolve();
    };
    if (!req.session) return clear();
    req.session.destroy((err) => {
      if (err) return reject(err);
      clear();
    });
  });
}

async function loadUserFromRequest(req) {
  const userId = req.session?.userId;
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    req.session.userId = null;
    throw unauthorized("User no longer exists", "INVALID_SESSION");
  }

  return user;
}

// Requires a valid session; sets req.user.
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
