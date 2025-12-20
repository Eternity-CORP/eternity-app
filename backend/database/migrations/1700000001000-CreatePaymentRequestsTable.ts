import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentRequestsTable1700000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "payment_requests" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "code" varchar(8) UNIQUE NOT NULL,
        "to_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "from_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "amount" decimal(36, 18) NOT NULL,
        "token_symbol" varchar(16) NOT NULL,
        "preferred_chain_id" varchar(32),
        "status" varchar(16) NOT NULL DEFAULT 'pending',
        "created_at" timestamp NOT NULL DEFAULT NOW(),
        "expires_at" timestamp NOT NULL,
        "executed_at" timestamp,
        "tx_hash" varchar(128),
        "actual_chain_id" varchar(32),
        "metadata" jsonb
      );

      CREATE INDEX "idx_payment_requests_code" ON "payment_requests"("code");
      CREATE INDEX "idx_payment_requests_to_user_id" ON "payment_requests"("to_user_id");
      CREATE INDEX "idx_payment_requests_from_user_id" ON "payment_requests"("from_user_id") WHERE "from_user_id" IS NOT NULL;
      CREATE INDEX "idx_payment_requests_status" ON "payment_requests"("status");
      CREATE INDEX "idx_payment_requests_created_at" ON "payment_requests"("created_at");
      CREATE INDEX "idx_payment_requests_expires_at" ON "payment_requests"("expires_at") WHERE "status" = 'pending';
      CREATE INDEX "idx_payment_requests_tx_hash" ON "payment_requests"("tx_hash") WHERE "tx_hash" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "payment_requests"`);
  }
}
