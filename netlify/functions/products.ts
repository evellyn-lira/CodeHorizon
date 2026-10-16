import type { Config } from "@netlify/functions";
import { asc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { products } from "../../db/schema.js";
import { getUserFromRequest, jsonError } from "../../lib/auth.js";

const CATEGORIES = [
  "Frutas",
  "Verduras e Legumes",
  "Sementes",
  "Grãos e Cereais",
  "Ovos e Laticínios",
  "Mel e Derivados",
  "Temperos e Ervas",
  "Doces e Conservas",
];

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export default async (req: Request) => {
  if (req.method === "GET") {
    const rows = await db.select().from(products).orderBy(asc(products.id));
    return Response.json(rows);
  }

  if (req.method === "POST") {
    const user = await getUserFromRequest(req);
    if (!user) return jsonError("Faça login para cadastrar produtos.", 401);
    if (user.accountType !== "empresarial") {
      return jsonError("Somente contas empresariais (produtores) podem cadastrar produtos.", 403);
    }

    const body = await req.json().catch(() => ({}));
    const name = str(body.name);
    const category = str(body.category);
    const price = Number(body.price);

    if (!name) return jsonError("Informe o nome do produto.", 400);
    if (!CATEGORIES.includes(category)) return jsonError("Escolha uma categoria válida.", 400);
    if (!Number.isFinite(price) || price <= 0) return jsonError("Informe um preço válido.", 400);

    const farmer = str(body.farmer) || [user.firstName, user.lastName].filter(Boolean).join(" ");

    const [product] = await db
      .insert(products)
      .values({
        name,
        category,
        price: Math.round(price * 100) / 100,
        unit: str(body.unit) || "unidade",
        origin: str(body.origin) || "Não informado",
        farmer,
        organic: Boolean(body.organic),
        certified: Boolean(body.certified),
        carbon: Math.max(0, Number(body.carbon) || 0),
        distance: Math.max(0, Math.round(Number(body.distance) || 0)),
        image: str(body.image),
        description: str(body.description) || null,
        badge: "Novo",
        badgeColor: "primary",
        producerId: user.id,
      })
      .returning();

    return Response.json(product, { status: 201 });
  }

  return jsonError("Método não permitido.", 405);
};

export const config: Config = {
  path: "/api/products",
};
