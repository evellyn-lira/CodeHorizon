CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY,
	"order_id" integer NOT NULL,
	"product_id" integer,
	"name" text NOT NULL,
	"unit_price" numeric(10,2) NOT NULL,
	"quantity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY,
	"code" text NOT NULL UNIQUE,
	"user_id" integer,
	"customer" text NOT NULL,
	"address" text NOT NULL,
	"number" text DEFAULT '' NOT NULL,
	"city" text NOT NULL,
	"cep" text DEFAULT '' NOT NULL,
	"payment" text NOT NULL,
	"total" numeric(10,2) NOT NULL,
	"items_count" integer NOT NULL,
	"status" text DEFAULT 'Em preparo' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"price" numeric(10,2) NOT NULL,
	"unit" text NOT NULL,
	"origin" text NOT NULL,
	"farmer" text NOT NULL,
	"organic" boolean DEFAULT false NOT NULL,
	"certified" boolean DEFAULT false NOT NULL,
	"carbon" numeric(6,2) DEFAULT '0' NOT NULL,
	"rating" numeric(3,1) DEFAULT '0' NOT NULL,
	"reviews" integer DEFAULT 0 NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"distance" integer DEFAULT 0 NOT NULL,
	"badge" text,
	"badge_color" text,
	"description" text,
	"producer_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token" text PRIMARY KEY,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"first_name" text NOT NULL,
	"last_name" text DEFAULT '' NOT NULL,
	"email" text NOT NULL UNIQUE,
	"password_hash" text NOT NULL,
	"birthdate" text DEFAULT '' NOT NULL,
	"niche" text DEFAULT '' NOT NULL,
	"account_type" text DEFAULT 'pessoal' NOT NULL,
	"objective" text DEFAULT 'conhecer' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_producer_id_users_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;