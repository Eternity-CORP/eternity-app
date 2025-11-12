import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1690000000000 implements MigrationInterface {
  name = 'InitSchema1690000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "users" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "walletAddress" varchar(64) UNIQUE NOT NULL,
      "encryptedDeviceToken" text,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_user_wallet_address ON "users" ("walletAddress")`);

    await queryRunner.query(`CREATE TYPE payment_status_enum AS ENUM ('PENDING','COMPLETED','FAILED')`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "payments" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "userId" uuid NOT NULL,
      "transactionHash" varchar(128),
      "status" payment_status_enum NOT NULL DEFAULT 'PENDING',
      "currency" varchar(16) NOT NULL,
      "amount" numeric(30,18) NOT NULL,
      "idempotencyKey" varchar(64),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT fk_payment_user FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    )`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payment_tx_hash ON "payments" ("transactionHash")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
    await queryRunner.query(`DROP TYPE IF EXISTS payment_status_enum`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payment_tx_hash`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_wallet_address`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
