import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { Wallet, HDNodeWallet } from 'ethers';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Entity, Column, PrimaryColumn, UpdateDateColumn, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';
import { Module, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { verifyMessage } from 'ethers';

// =====================================================
// Test-compatible entities (using simple-json instead of jsonb)
// =====================================================

@Entity('address_preferences')
class TestAddressPreferences {
  @PrimaryColumn({ type: 'varchar', length: 42 })
  address: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'default_network' })
  defaultNetwork: string | null;

  @Column({ type: 'simple-json', default: '{}', name: 'token_overrides' })
  tokenOverrides: Record<string, string>;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('usernames')
class TestUsername {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  @Index()
  username: string;

  @Column({ type: 'varchar', length: 42, unique: true })
  @Index()
  address: string;

  @Column({ type: 'text' })
  signature: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// =====================================================
// Test-compatible services
// =====================================================

const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;

@Injectable()
class TestPreferencesService {
  constructor(
    @InjectRepository(TestAddressPreferences)
    private readonly preferencesRepository: Repository<TestAddressPreferences>,
  ) {}

  async findByAddress(address: string): Promise<TestAddressPreferences | null> {
    return this.preferencesRepository.findOne({
      where: { address: address.toLowerCase() },
    });
  }

  async upsert(
    address: string,
    defaultNetwork: string | null,
    tokenOverrides: Record<string, string>,
  ): Promise<TestAddressPreferences> {
    const normalizedAddress = address.toLowerCase();
    let preferences = await this.findByAddress(normalizedAddress);

    if (preferences) {
      preferences.defaultNetwork = defaultNetwork;
      preferences.tokenOverrides = tokenOverrides;
    } else {
      preferences = this.preferencesRepository.create({
        address: normalizedAddress,
        defaultNetwork,
        tokenOverrides,
      });
    }

    return this.preferencesRepository.save(preferences);
  }

  verifySignature(address: string, signature: string, timestamp: number): boolean {
    const now = Date.now();
    if (Math.abs(now - timestamp) > SIGNATURE_MAX_AGE_MS) {
      return false;
    }

    try {
      const message = `E-Y:preferences:${address.toLowerCase()}:${timestamp}`;
      const recoveredAddress = verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch {
      return false;
    }
  }
}

@Injectable()
class TestUsernameService {
  constructor(
    @InjectRepository(TestUsername)
    private usernameRepository: Repository<TestUsername>,
    private readonly preferencesService: TestPreferencesService,
  ) {}

  async lookup(username: string): Promise<{
    username: string;
    address: string;
    preferences: { defaultNetwork: string | null; tokenOverrides: Record<string, string> } | null;
    createdAt: Date;
  } | null> {
    const normalizedUsername = username.toLowerCase();
    const record = await this.usernameRepository.findOne({
      where: { username: normalizedUsername },
    });

    if (!record) return null;

    const preferences = await this.preferencesService.findByAddress(record.address);

    return {
      username: record.username,
      address: record.address,
      preferences: preferences
        ? { defaultNetwork: preferences.defaultNetwork, tokenOverrides: preferences.tokenOverrides }
        : null,
      createdAt: record.createdAt,
    };
  }

  async register(dto: {
    username: string;
    address: string;
    signature: string;
    timestamp: number;
  }): Promise<{ username: string; address: string }> {
    const normalizedUsername = dto.username.toLowerCase();
    const normalizedAddress = dto.address.toLowerCase();

    this.verifySignature(normalizedUsername, normalizedAddress, dto.signature, dto.timestamp, 'claim');

    const record = this.usernameRepository.create({
      username: normalizedUsername,
      address: normalizedAddress,
      signature: dto.signature,
    });

    await this.usernameRepository.save(record);

    return { username: record.username, address: record.address };
  }

  private verifySignature(
    username: string,
    address: string,
    signature: string,
    timestamp: number,
    action: 'claim' | 'update' | 'delete',
  ): void {
    const now = Date.now();
    if (now - timestamp > SIGNATURE_MAX_AGE_MS) {
      throw new Error('TIMESTAMP_EXPIRED');
    }

    const message = `E-Y:${action}:@${username}:${address}:${timestamp}`;
    const recoveredAddress = verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      throw new Error('SIGNATURE_INVALID');
    }
  }
}

// =====================================================
// Test-compatible controllers
// =====================================================

import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  NotFoundException,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  IsString,
  IsOptional,
  IsObject,
  IsNumber,
  Matches,
  ValidateIf,
} from 'class-validator';

class SavePreferencesDto {
  @IsOptional()
  @ValidateIf((o) => o.defaultNetwork !== null)
  @IsString()
  @Matches(/^(ethereum|polygon|arbitrum|base|optimism)$/, {
    message: 'defaultNetwork must be a valid network ID',
  })
  defaultNetwork: string | null;

  @IsObject()
  tokenOverrides: Record<string, string>;

  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message: 'address must be a valid Ethereum address',
  })
  address: string;

  @IsString()
  signature: string;

  @IsNumber()
  timestamp: number;
}

class RegisterUsernameDto {
  @IsString()
  @Matches(/^[a-zA-Z][a-zA-Z0-9_]{2,19}$/)
  username: string;

  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/)
  address: string;

  @IsString()
  signature: string;

  @IsNumber()
  timestamp: number;
}

@Controller('api')
class TestPreferencesController {
  constructor(private readonly preferencesService: TestPreferencesService) {}

  @Get('address/:address/preferences')
  async getPreferences(@Param('address') address: string) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new BadRequestException({
        success: false,
        error: { code: 'INVALID_ADDRESS', message: 'Invalid Ethereum address' },
      });
    }

    const preferences = await this.preferencesService.findByAddress(address);

    if (!preferences) {
      throw new NotFoundException({
        success: false,
        error: { code: 'PREFERENCES_NOT_FOUND', message: 'No preferences found for this address' },
      });
    }

    return {
      success: true,
      data: {
        address: preferences.address,
        preferences: {
          defaultNetwork: preferences.defaultNetwork,
          tokenOverrides: preferences.tokenOverrides,
          updatedAt: preferences.updatedAt.toISOString(),
        },
      },
    };
  }

  @Put('preferences')
  async savePreferences(@Body() dto: SavePreferencesDto) {
    const isValid = this.preferencesService.verifySignature(dto.address, dto.signature, dto.timestamp);

    if (!isValid) {
      const now = Date.now();
      if (Math.abs(now - dto.timestamp) > 5 * 60 * 1000) {
        throw new BadRequestException({
          success: false,
          error: { code: 'TIMESTAMP_EXPIRED', message: 'Request timestamp is too old' },
        });
      }

      throw new BadRequestException({
        success: false,
        error: { code: 'INVALID_SIGNATURE', message: 'Signature verification failed' },
      });
    }

    const preferences = await this.preferencesService.upsert(
      dto.address,
      dto.defaultNetwork,
      dto.tokenOverrides,
    );

    return {
      success: true,
      data: {
        address: preferences.address,
        preferences: {
          defaultNetwork: preferences.defaultNetwork,
          tokenOverrides: preferences.tokenOverrides,
          updatedAt: preferences.updatedAt.toISOString(),
        },
      },
    };
  }
}

@Controller('api/username')
class TestUsernameController {
  constructor(private readonly usernameService: TestUsernameService) {}

  @Get(':name')
  async lookup(@Param('name') name: string) {
    const result = await this.usernameService.lookup(name);
    if (!result) {
      throw new NotFoundException({
        success: false,
        error: { code: 'USERNAME_NOT_FOUND', message: 'Username not found' },
      });
    }
    return { success: true, data: result };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterUsernameDto) {
    const result = await this.usernameService.register(dto);
    return { success: true, data: result };
  }
}

// =====================================================
// Test module
// =====================================================

@Module({
  imports: [TypeOrmModule.forFeature([TestAddressPreferences])],
  controllers: [TestPreferencesController],
  providers: [TestPreferencesService],
  exports: [TestPreferencesService],
})
class TestPreferencesModule {}

@Module({
  imports: [TypeOrmModule.forFeature([TestUsername]), TestPreferencesModule],
  controllers: [TestUsernameController],
  providers: [TestUsernameService],
})
class TestUsernameModule {}

// =====================================================
// Test suite
// =====================================================

describe('Preferences API (e2e)', () => {
  let app: INestApplication;
  let testWallet: HDNodeWallet;
  let testAddress: string;

  beforeAll(async () => {
    testWallet = Wallet.createRandom();
    testAddress = testWallet.address.toLowerCase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [TestAddressPreferences, TestUsername],
          synchronize: true,
          dropSchema: true,
        }),
        TestPreferencesModule,
        TestUsernameModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /api/address/:address/preferences', () => {
    it('should return 404 for unknown address', async () => {
      const unknownAddress = '0x1234567890123456789012345678901234567890';

      const response = await request(app.getHttpServer())
        .get(`/api/address/${unknownAddress}/preferences`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'PREFERENCES_NOT_FOUND',
          message: 'No preferences found for this address',
        },
      });
    });

    it('should return 400 for invalid address format', async () => {
      const invalidAddress = 'not-a-valid-address';

      const response = await request(app.getHttpServer())
        .get(`/api/address/${invalidAddress}/preferences`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_ADDRESS');
    });

    it('should return 400 for address with wrong length', async () => {
      const shortAddress = '0x1234567890';

      const response = await request(app.getHttpServer())
        .get(`/api/address/${shortAddress}/preferences`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_ADDRESS');
    });

    it('should return preferences for known address after creation', async () => {
      const timestamp = Date.now();
      const message = `E-Y:preferences:${testAddress}:${timestamp}`;
      const signature = await testWallet.signMessage(message);

      await request(app.getHttpServer())
        .put('/api/preferences')
        .send({
          address: testWallet.address,
          defaultNetwork: 'polygon',
          tokenOverrides: { USDC: 'arbitrum' },
          signature,
          timestamp,
        })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/api/address/${testAddress}/preferences`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.address).toBe(testAddress);
      expect(response.body.data.preferences.defaultNetwork).toBe('polygon');
      expect(response.body.data.preferences.tokenOverrides).toEqual({ USDC: 'arbitrum' });
      expect(response.body.data.preferences.updatedAt).toBeDefined();
    });
  });

  describe('PUT /api/preferences', () => {
    it('should create preferences with valid signature', async () => {
      const newWallet = Wallet.createRandom();
      const newAddress = newWallet.address.toLowerCase();
      const timestamp = Date.now();
      const message = `E-Y:preferences:${newAddress}:${timestamp}`;
      const signature = await newWallet.signMessage(message);

      const response = await request(app.getHttpServer())
        .put('/api/preferences')
        .send({
          address: newWallet.address,
          defaultNetwork: 'ethereum',
          tokenOverrides: { ETH: 'ethereum', USDC: 'polygon' },
          signature,
          timestamp,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.address).toBe(newAddress);
      expect(response.body.data.preferences.defaultNetwork).toBe('ethereum');
      expect(response.body.data.preferences.tokenOverrides).toEqual({
        ETH: 'ethereum',
        USDC: 'polygon',
      });
    });

    it('should return 400 for invalid signature', async () => {
      const timestamp = Date.now();
      const invalidSignature = '0x' + '00'.repeat(65);

      const response = await request(app.getHttpServer())
        .put('/api/preferences')
        .send({
          address: testWallet.address,
          defaultNetwork: 'ethereum',
          tokenOverrides: {},
          signature: invalidSignature,
          timestamp,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_SIGNATURE');
    });

    it('should return 400 for expired timestamp', async () => {
      const expiredTimestamp = Date.now() - 6 * 60 * 1000;
      const expiredAddress = testWallet.address.toLowerCase();
      const message = `E-Y:preferences:${expiredAddress}:${expiredTimestamp}`;
      const signature = await testWallet.signMessage(message);

      const response = await request(app.getHttpServer())
        .put('/api/preferences')
        .send({
          address: testWallet.address,
          defaultNetwork: 'ethereum',
          tokenOverrides: {},
          signature,
          timestamp: expiredTimestamp,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TIMESTAMP_EXPIRED');
    });

    it('should return 400 for invalid network ID', async () => {
      const timestamp = Date.now();
      const message = `E-Y:preferences:${testAddress}:${timestamp}`;
      const signature = await testWallet.signMessage(message);

      const response = await request(app.getHttpServer())
        .put('/api/preferences')
        .send({
          address: testWallet.address,
          defaultNetwork: 'invalid-network',
          tokenOverrides: {},
          signature,
          timestamp,
        })
        .expect(400);

      expect(response.body.message).toContain('defaultNetwork must be a valid network ID');
    });

    it('should update existing preferences', async () => {
      const timestamp = Date.now();
      const message = `E-Y:preferences:${testAddress}:${timestamp}`;
      const signature = await testWallet.signMessage(message);

      await request(app.getHttpServer())
        .put('/api/preferences')
        .send({
          address: testWallet.address,
          defaultNetwork: 'ethereum',
          tokenOverrides: { ETH: 'ethereum' },
          signature,
          timestamp,
        })
        .expect(200);

      const timestamp2 = Date.now();
      const message2 = `E-Y:preferences:${testAddress}:${timestamp2}`;
      const signature2 = await testWallet.signMessage(message2);

      const response = await request(app.getHttpServer())
        .put('/api/preferences')
        .send({
          address: testWallet.address,
          defaultNetwork: 'arbitrum',
          tokenOverrides: { USDC: 'base' },
          signature: signature2,
          timestamp: timestamp2,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.preferences.defaultNetwork).toBe('arbitrum');
      expect(response.body.data.preferences.tokenOverrides).toEqual({ USDC: 'base' });
    });

    it('should accept null as defaultNetwork', async () => {
      const newWallet = Wallet.createRandom();
      const newAddress = newWallet.address.toLowerCase();
      const timestamp = Date.now();
      const message = `E-Y:preferences:${newAddress}:${timestamp}`;
      const signature = await newWallet.signMessage(message);

      const response = await request(app.getHttpServer())
        .put('/api/preferences')
        .send({
          address: newWallet.address,
          defaultNetwork: null,
          tokenOverrides: {},
          signature,
          timestamp,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.preferences.defaultNetwork).toBeNull();
    });

    it('should return 400 for signature from different wallet', async () => {
      const otherWallet = Wallet.createRandom();
      const timestamp = Date.now();
      const message = `E-Y:preferences:${testAddress}:${timestamp}`;
      const signature = await testWallet.signMessage(message);

      const response = await request(app.getHttpServer())
        .put('/api/preferences')
        .send({
          address: otherWallet.address,
          defaultNetwork: 'ethereum',
          tokenOverrides: {},
          signature,
          timestamp,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_SIGNATURE');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/preferences')
        .send({
          address: testWallet.address,
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('GET /api/username/:name (preferences integration)', () => {
    it('should include preferences in username lookup when user has them', async () => {
      const userWallet = Wallet.createRandom();
      const userAddress = userWallet.address.toLowerCase();
      const username = 'testuser' + Date.now().toString().slice(-6);

      const usernameTimestamp = Date.now();
      const usernameMessage = `E-Y:claim:@${username}:${userAddress}:${usernameTimestamp}`;
      const usernameSignature = await userWallet.signMessage(usernameMessage);

      await request(app.getHttpServer())
        .post('/api/username')
        .send({
          username,
          address: userWallet.address,
          signature: usernameSignature,
          timestamp: usernameTimestamp,
        })
        .expect(201);

      const prefTimestamp = Date.now();
      const prefMessage = `E-Y:preferences:${userAddress}:${prefTimestamp}`;
      const prefSignature = await userWallet.signMessage(prefMessage);

      await request(app.getHttpServer())
        .put('/api/preferences')
        .send({
          address: userWallet.address,
          defaultNetwork: 'optimism',
          tokenOverrides: { USDT: 'polygon' },
          signature: prefSignature,
          timestamp: prefTimestamp,
        })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/api/username/${username}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe(username);
      expect(response.body.data.address).toBe(userAddress);
      expect(response.body.data.preferences).toEqual({
        defaultNetwork: 'optimism',
        tokenOverrides: { USDT: 'polygon' },
      });
    });

    it('should return null preferences in username lookup when user has none', async () => {
      const userWallet = Wallet.createRandom();
      const userAddress = userWallet.address.toLowerCase();
      const username = 'noprefs' + Date.now().toString().slice(-6);

      const usernameTimestamp = Date.now();
      const usernameMessage = `E-Y:claim:@${username}:${userAddress}:${usernameTimestamp}`;
      const usernameSignature = await userWallet.signMessage(usernameMessage);

      await request(app.getHttpServer())
        .post('/api/username')
        .send({
          username,
          address: userWallet.address,
          signature: usernameSignature,
          timestamp: usernameTimestamp,
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/api/username/${username}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe(username);
      expect(response.body.data.address).toBe(userAddress);
      expect(response.body.data.preferences).toBeNull();
    });
  });
});
