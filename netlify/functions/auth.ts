import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { sessions, users } from "../../db/schema.js";
import {
  createSession,
  getToken,
  getUserFromRequest,
  hashPassword,
  jsonError,
  publicUser,
  verifyPassword,
} from "../../lib/auth.js";

const ACCOUNT_TYPES = ["pessoal", "empresarial"];

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export default async (req: Request) => {
  const action = new URL(req.url).pathname.split("/").pop();
  const body = req.method === "GET" ? {} : await req.json().catch(() => ({}));

  if (action === "register" && req.method === "POST") {
    const email = str(body.email).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    const firstName = str(body.firstName);

    if (!firstName || !email.includes("@")) return jsonError("Preencha nome e e-mail válidos.", 400);
    if (password.length < 6) return jsonError("A senha precisa ter pelo menos 6 caracteres.", 400);

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (existing) return jsonError("Já existe uma conta com este e-mail.", 409);

    const [user] = await db
      .insert(users)
      .values({
        firstName,
        lastName: str(body.lastName),
        email,
        passwordHash: await hashPassword(password),
        birthdate: str(body.birthdate),
        niche: str(body.niche),
        accountType: ACCOUNT_TYPES.includes(body.accountType) ? body.accountType : "pessoal",
        objective: str(body.objective) || "conhecer",
      })
      .returning();

    const token = await createSession(user.id);
    return Response.json({ token, user: publicUser(user) }, { status: 201 });
  }

  if (action === "login" && req.method === "POST") {
    const email = str(body.email).toLowerCase();
    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user || !(await verifyPassword(String(body.password || ""), user.passwordHash))) {
      return jsonError("E-mail ou senha incorretos.", 401);
    }

    const token = await createSession(user.id);
    return Response.json({ token, user: publicUser(user) });
  }

  if (action === "logout" && req.method === "POST") {
    const token = getToken(req);
    if (token) await db.delete(sessions).where(eq(sessions.token, token));
    return Response.json({ ok: true });
  }

  const user = await getUserFromRequest(req);
  if (!user) return jsonError("Faça login para continuar.", 401);

  if (action === "me" && req.method === "GET") {
    return Response.json({ user: publicUser(user) });
  }

  if (action === "me" && req.method === "PUT") {
    const email = str(body.email).toLowerCase() || user.email;

    if (email !== user.email) {
      const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
      if (taken) return jsonError("Este e-mail já está em uso por outra conta.", 409);
    }

    const [updated] = await db
      .update(users)
      .set({
        firstName: str(body.firstName) || user.firstName,
        lastName: str(body.lastName),
        email,
        birthdate: str(body.birthdate),
        niche: str(body.niche),
        accountType: ACCOUNT_TYPES.includes(body.accountType) ? body.accountType : user.accountType,
        objective: str(body.objective) || user.objective,
      })
      .where(eq(users.id, user.id))
      .returning();

    return Response.json({ user: publicUser(updated) });
  }

  if (action === "password" && req.method === "POST") {
    if (!(await verifyPassword(String(body.currentPassword || ""), user.passwordHash))) {
      return jsonError("Senha atual incorreta.", 400);
    }
    const next = typeof body.newPassword === "string" ? body.newPassword : "";
    if (next.length < 6) return jsonError("A nova senha precisa ter pelo menos 6 caracteres.", 400);

    await db.update(users).set({ passwordHash: await hashPassword(next) }).where(eq(users.id, user.id));
    return Response.json({ ok: true });
  }

  return jsonError("Rota não encontrada.", 404);
};

export const config: Config = {
  path: ["/api/auth/register", "/api/auth/login", "/api/auth/logout", "/api/auth/me", "/api/auth/password"],
};
