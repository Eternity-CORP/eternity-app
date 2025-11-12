import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { PushToken, PushTokenPlatform } from '../../database/entities/push-token.entity';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class PushNotificationService {
  private expo: Expo;

  constructor(
    @InjectRepository(PushToken)
    private pushTokenRepository: Repository<PushToken>,
  ) {
    this.expo = new Expo();
  }

  /**
   * Send push notification to a single Expo push token
   */
  async sendPushNotification(
    expoPushToken: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<ExpoPushTicket[]> {
    if (!Expo.isExpoPushToken(expoPushToken)) {
      console.error(`Push token ${expoPushToken} is not a valid Expo push token`);
      return [];
    }

    const messages: ExpoPushMessage[] = [
      {
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
      },
    ];

    try {
      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      }

      return tickets;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return [];
    }
  }

  /**
   * Send push notification to all user's devices
   */
  async sendToUser(
    user: User,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    const pushTokens = await this.pushTokenRepository.find({
      where: {
        user: { id: user.id },
        active: true,
      },
    });

    if (pushTokens.length === 0) {
      console.log(`No active push tokens for user ${user.id}`);
      return;
    }

    const promises = pushTokens.map((token) => {
      return this.sendPushNotification(token.expoPushToken, title, body, data).then(() => {
        // Update last used timestamp
        token.lastUsedAt = new Date();
        return this.pushTokenRepository.save(token);
      });
    });

    await Promise.allSettled(promises);
  }

  /**
   * Send push notification by wallet address
   */
  async sendToWalletAddress(
    walletAddress: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    const pushTokens = await this.pushTokenRepository.find({
      where: {
        user: { walletAddress: walletAddress.toLowerCase() },
        active: true,
      },
      relations: ['user'],
    });

    if (pushTokens.length === 0) {
      console.log(`No active push tokens for wallet ${walletAddress}`);
      return;
    }

    const promises = pushTokens.map((token) =>
      this.sendPushNotification(token.expoPushToken, title, body, data),
    );

    await Promise.allSettled(promises);
  }

  /**
   * Register a new push token for a user
   */
  async registerPushToken(
    user: User,
    expoPushToken: string,
    platform: PushTokenPlatform,
    deviceId?: string,
  ): Promise<PushToken> {
    // Check if token already exists
    let pushToken = await this.pushTokenRepository.findOne({
      where: {
        user: { id: user.id },
        expoPushToken,
      },
    });

    if (pushToken) {
      // Update existing token
      pushToken.active = true;
      pushToken.platform = platform;
      pushToken.deviceId = deviceId || null;
      pushToken.lastUsedAt = new Date();
    } else {
      // Create new token
      pushToken = this.pushTokenRepository.create({
        user,
        expoPushToken,
        platform,
        deviceId: deviceId || null,
        active: true,
        lastUsedAt: new Date(),
      });
    }

    return this.pushTokenRepository.save(pushToken);
  }

  /**
   * Deactivate a push token
   */
  async deactivatePushToken(expoPushToken: string): Promise<void> {
    await this.pushTokenRepository.update(
      { expoPushToken },
      { active: false },
    );
  }

  /**
   * Get all active push tokens for a user
   */
  async getUserPushTokens(userId: string): Promise<PushToken[]> {
    return this.pushTokenRepository.find({
      where: {
        user: { id: userId },
        active: true,
      },
    });
  }
}
