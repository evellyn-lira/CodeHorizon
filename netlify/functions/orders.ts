import type { Config } from "@netlify/functions";
import { desc, eq, inArray } from "drizzle-orm";
import { randomInt } from "node:crypto";
import { db } from "../../db/index.js";
import { orderItems, orders, products } from "../../db/schema.js";
import { getUserFromRequest, jsonError } from "../../lib/auth.js";

const PAYMENTS = ["pix", "card", "boleto"];

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export default async (req: Request) => {
  const user = await getUserFromRequest(req);

  if (req.method === "GET") {
    if (!user) return jsonError("Faça login para ver seus pedidos.", 401);

    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, user.id))
      .orderBy(desc(orders.createdAt));

    return Response.json(rows);
  }

  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const items: { id: number; quantity: number }[] = Array.isArray(body.items) ? body.items : [];

    const customer = str(body.customer);
    const address = str(body.address);
    const city = str(body.city);
    const payment = str(body.payment);

    if (!customer || !address || !city) return jsonError("Preencha nome, endereço e cidade.", 400);
    if (!PAYMENTS.includes(payment)) return jsonError("Forma de pagamento inválida.", 400);
    if (items.length === 0) return jsonError("O carrinho está vazio.", 400);

    // Preços sempre vêm do banco, nunca do navegador.
    const ids = items.map((item) => Number(item.id)).filter(Number.isInteger);
    const found = ids.length ? await db.select().from(products).where(inArray(products.id, ids)) : [];
    const byId = new Map(found.map((p) => [p.id, p]));

    const lines = items
      .map((item) => ({ product: byId.get(Number(item.id)), quantity: Math.floor(Number(item.quantity)) }))
      .filter((line) => line.product && line.quantity > 0);

    if (lines.length !== items.length) return jsonError("Algum produto do carrinho não está mais disponível.", 400);

    const total = Math.round(lines.reduce((sum, l) => sum + l.product!.price * l.quantity, 0) * 100) / 100;
    const itemsCount = lines.reduce((sum, l) => sum + l.quantity, 0);
    const code = `ECH-${Date.now().toString(36).toUpperCase()}${randomInt(100, 999)}`;

    const order = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(orders)
        .values({
          code,
          userId: user?.id ?? null,
          customer,
          address,
          number: str(body.number),
          city,
          cep: str(body.cep),
          payment,
          total,
          itemsCount,
        })
        .returning();

      await tx.insert(orderItems).values(
        lines.map((l) => ({
          orderId: created.id,
          productId: l.product!.id,
          name: l.product!.name,
          unitPrice: l.product!.price,
          quantity: l.quantity,
        }))
      );

      return created;
    });

    return Response.json(order, { status: 201 });
  }

  return jsonError("Método não permitido.", 405);
};

export const config: Config = {
  path: "/api/orders",
};
