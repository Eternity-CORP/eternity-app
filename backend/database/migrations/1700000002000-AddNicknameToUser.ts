import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNicknameToUser1700000002000 implements MigrationInterface {
    name = 'AddNicknameToUser1700000002000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD COLUMN "nickname" varchar(50) NULL
        `);

        await queryRunner.query(`
            CREATE UNIQUE INDEX "idx_user_nickname"
            ON "users" ("nickname")
            WHERE "nickname" IS NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_nickname"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "nickname"`);
    }
}
