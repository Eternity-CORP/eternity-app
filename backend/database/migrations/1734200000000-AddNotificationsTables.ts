import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationsTables1734200000000 implements MigrationInterface {
  name = 'AddNotificationsTables1734200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create push_tokens table
    await queryRunner.query(`
      CREATE TABLE "push_tokens" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "expoPushToken" text NOT NULL,
        "platform" varchar NOT NULL CHECK ("platform" IN ('IOS', 'ANDROID', 'WEB')),
        "deviceId" varchar(255),
        "active" boolean NOT NULL DEFAULT true,
        "lastUsedAt" timestamp with time zone,
        "userId" uuid NOT NULL,
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
        "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "FK_push_tokens_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_push_token_user" ON "push_tokens" ("userId")
    `);

    // Create scheduled_payments table
    await queryRunner.query(`
      CREATE TABLE "scheduled_payments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "recipientAddress" varchar(64) NOT NULL,
        "amount" numeric(30,18) NOT NULL,
        "currency" varchar(16) NOT NULL DEFAULT 'ETH',
        "message" text,
        "emoji" varchar(10),
        "scheduledFor" timestamp with time zone NOT NULL,
        "status" varchar NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
        "transactionHash" varchar(128),
        "errorMessage" text,
        "executedAt" timestamp with time zone,
        "userId" uuid NOT NULL,
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
        "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "FK_scheduled_payments_user" FOREIGN KEY ("userId") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_scheduled_payment_user" ON "scheduled_payments" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_scheduled_payment_scheduled_for" ON "scheduled_payments" ("scheduledFor")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_scheduled_payment_status" ON "scheduled_payments" ("status")
    `);

    // Create split_bills table
    await queryRunner.query(`
      CREATE TABLE "split_bills" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "totalAmount" numeric(30,18) NOT NULL,
        "currency" varchar(16) NOT NULL DEFAULT 'ETH',
        "mode" varchar NOT NULL DEFAULT 'EQUAL' CHECK ("mode" IN ('EQUAL', 'CUSTOM')),
        "participantsCount" int NOT NULL,
        "status" varchar NOT NULL DEFAULT 'DRAFT' CHECK ("status" IN ('DRAFT', 'PENDING', 'COMPLETED')),
        "message" text,
        "emoji" varchar(10),
        "shareableLink" varchar(255),
        "creatorId" uuid NOT NULL,
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
        "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "FK_split_bills_creator" FOREIGN KEY ("creatorId") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_split_bill_creator" ON "split_bills" ("creatorId")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_split_bill_status" ON "split_bills" ("status")
    `);

    // Create split_bill_participants table
    await queryRunner.query(`
      CREATE TABLE "split_bill_participants" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "participantAddress" varchar(64) NOT NULL,
        "amount" numeric(30,18) NOT NULL,
        "paid" boolean NOT NULL DEFAULT false,
        "transactionHash" varchar(128),
        "paidAt" timestamp with time zone,
        "notificationSent" boolean NOT NULL DEFAULT false,
        "splitBillId" uuid NOT NULL,
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
        "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "FK_split_bill_participants_split_bill" FOREIGN KEY ("splitBillId") REFERENCES "split_bills"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_split_bill_participant_split_bill" ON "split_bill_participants" ("splitBillId")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_split_bill_participant_address" ON "split_bill_participants" ("participantAddress")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "split_bill_participants"`);
    await queryRunner.query(`DROP TABLE "split_bills"`);
    await queryRunner.query(`DROP TABLE "scheduled_payments"`);
    await queryRunner.query(`DROP TABLE "push_tokens"`);
  }
}
