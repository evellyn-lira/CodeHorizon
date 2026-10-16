import { pgTable, serial, text, timestamp, integer, boolean, numeric, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial().primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull().default(""),
  email: text().notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  birthdate: text().notNull().default(""),
  niche: text().notNull().default(""),
  accountType: text("account_type").notNull().default("pessoal"),
  objective: text().notNull().default("conhecer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  token: text().primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: serial().primaryKey(),
  name: text().notNull(),
  category: text().notNull(),
  price: numeric({ precision: 10, scale: 2, mode: "number" }).notNull(),
  unit: text().notNull(),
  origin: text().notNull(),
  farmer: text().notNull(),
  organic: boolean().notNull().default(false),
  certified: boolean().notNull().default(false),
  carbon: numeric({ precision: 6, scale: 2, mode: "number" }).notNull().default(0),
  rating: numeric({ precision: 3, scale: 1, mode: "number" }).notNull().default(0),
  reviews: integer().notNull().default(0),
  image: text().notNull().default(""),
  distance: integer().notNull().default(0),
  badge: text(),
  badgeColor: text("badge_color"),
  description: text(),
  producerId: integer("producer_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: serial().primaryKey(),
  code: text().notNull().unique(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  customer: text().notNull(),
  address: text().notNull(),
  number: text().notNull().default(""),
  city: text().notNull(),
  cep: text().notNull().default(""),
  payment: text().notNull(),
  total: numeric({ precision: 10, scale: 2, mode: "number" }).notNull(),
  itemsCount: integer("items_count").notNull(),
  status: text().notNull().default("Em preparo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: serial().primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  name: text().notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2, mode: "number" }).notNull(),
  quantity: integer().notNull(),
});
