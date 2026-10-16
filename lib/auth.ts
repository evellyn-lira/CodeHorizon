import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { sessions, users } from "../db/schema.js";

const scryptAsync = promisify(scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scryptAsync(password, salt, 64);
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = await scryptAsync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  await db.insert(sessions).values({ token, userId });
  return token;
}

export function getToken(req: Request) {
  const header = req.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

/* Retorna o usuário dono do token enviado no cabeçalho, ou null. */
export async function getUserFromRequest(req: Request) {
  const token = getToken(req);
  if (!token) return null;

  const [row] = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.token, token));

  return row?.user ?? null;
}

/* Formato do usuário enviado ao navegador (nunca inclui a senha). */
export function publicUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    birthdate: user.birthdate,
    niche: user.niche,
    accountType: user.accountType,
    objective: user.objective,
  };
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}
