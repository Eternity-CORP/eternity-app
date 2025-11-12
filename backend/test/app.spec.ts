import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('App Bootstrap', () => {
  it('should compile the module', async () => {
    const module: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    expect(module).toBeDefined();
  });
});
