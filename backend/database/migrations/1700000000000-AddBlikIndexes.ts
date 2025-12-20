import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Миграция для добавления составных индексов для оптимизации BLIK запросов
 */
export class AddBlikIndexes1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Составной индекс для быстрого поиска pending кодов
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_requests_code_status 
      ON payment_requests(code, status) 
      WHERE status = 'pending';
    `);

    // Индекс для поиска активных кодов пользователя
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_requests_user_status 
      ON payment_requests(to_user_id, status) 
      WHERE status = 'pending';
    `);

    // Индекс для крон-задачи expireOldRequests
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_requests_expires_pending 
      ON payment_requests(expires_at, status) 
      WHERE status = 'pending';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_payment_requests_code_status;
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_payment_requests_user_status;
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_payment_requests_expires_pending;
    `);
  }
}
