-- CreateTable
CREATE TABLE "shopify_connections" (
    "id" TEXT NOT NULL,
    "shop_domain" TEXT NOT NULL,
    "encrypted_token" TEXT NOT NULL,
    "encrypted_secret" TEXT NOT NULL,
    "shopify_webhook_id" TEXT,
    "webhook_topic" TEXT NOT NULL DEFAULT 'orders/create',
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopify_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shopify_connections_shop_domain_key" ON "shopify_connections"("shop_domain");
