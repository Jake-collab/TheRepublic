import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = await db.select({ isBanned: usersTable.isBanned }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (user[0]?.isBanned) {
    res.status(403).json({ error: "Account suspended. Please contact support." });
    return;
  }
  (req as any).userId = userId;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user[0]?.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  (req as any).userId = userId;
  next();
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const { userId } = getAuth(req);
  (req as any).userId = userId ?? null;
  next();
}

// JIT provision user from Clerk into our DB
export async function ensureUser(req: Request, res: Response, next: NextFunction) {
  const { userId, sessionClaims } = getAuth(req);
  if (!userId) {
    next();
    return;
  }
  try {
    const existing = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!existing[0]) {
      const email = (sessionClaims?.email as string) ?? "";
      const name = (sessionClaims?.name as string) ?? email.split("@")[0] ?? "User";
      await db.insert(usersTable).values({ id: userId, email, displayName: name }).onConflictDoNothing();
    }
  } catch (err) {
    req.log.warn({ err }, "Failed to JIT provision user");
  }
  next();
}
