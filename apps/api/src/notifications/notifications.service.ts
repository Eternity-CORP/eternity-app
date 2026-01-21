import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushDevice } from './push-device.entity';
import { RegisterDeviceDto, UnregisterDeviceDto } from './dto/register-device.dto';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error: string };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly expoPushUrl = 'https://exp.host/--/api/v2/push/send';

  constructor(
    @InjectRepository(PushDevice)
    private readonly pushDeviceRepository: Repository<PushDevice>,
  ) {}

  /**
   * Register a device for push notifications
   */
  async registerDevice(dto: RegisterDeviceDto): Promise<PushDevice> {
    // Check if device already exists
    let device = await this.pushDeviceRepository.findOne({
      where: { pushToken: dto.pushToken },
    });

    if (device) {
      // Update existing device
      device.walletAddress = dto.walletAddress;
      device.platform = dto.platform;
      device.deviceName = dto.deviceName || device.deviceName;
      device.active = true;
    } else {
      // Create new device
      device = this.pushDeviceRepository.create({
        walletAddress: dto.walletAddress,
        pushToken: dto.pushToken,
        platform: dto.platform,
        deviceName: dto.deviceName,
        active: true,
      });
    }

    return this.pushDeviceRepository.save(device);
  }

  /**
   * Unregister a device
   */
  async unregisterDevice(dto: UnregisterDeviceDto): Promise<void> {
    await this.pushDeviceRepository.update(
      { pushToken: dto.pushToken, walletAddress: dto.walletAddress },
      { active: false },
    );
  }

  /**
   * Get all active devices for a wallet address
   */
  async getDevicesForWallet(walletAddress: string): Promise<PushDevice[]> {
    return this.pushDeviceRepository.find({
      where: { walletAddress: walletAddress.toLowerCase(), active: true },
    });
  }

  /**
   * Send push notification to a specific wallet address
   */
  async sendToWallet(
    walletAddress: string,
    notification: {
      title: string;
      body: string;
      data?: Record<string, unknown>;
      channelId?: string;
    },
  ): Promise<void> {
    const devices = await this.getDevicesForWallet(walletAddress.toLowerCase());

    if (devices.length === 0) {
      this.logger.debug(`No devices found for wallet ${walletAddress}`);
      return;
    }

    const messages: ExpoPushMessage[] = devices.map((device) => ({
      to: device.pushToken,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      sound: 'default',
      channelId: notification.channelId,
      priority: 'high',
    }));

    await this.sendPushNotifications(messages);
  }

  /**
   * Send push notification to multiple wallet addresses
   */
  async sendToWallets(
    walletAddresses: string[],
    notification: {
      title: string;
      body: string;
      data?: Record<string, unknown>;
      channelId?: string;
    },
  ): Promise<void> {
    const allDevices: PushDevice[] = [];

    for (const address of walletAddresses) {
      const devices = await this.getDevicesForWallet(address.toLowerCase());
      allDevices.push(...devices);
    }

    if (allDevices.length === 0) {
      this.logger.debug('No devices found for any of the wallet addresses');
      return;
    }

    const messages: ExpoPushMessage[] = allDevices.map((device) => ({
      to: device.pushToken,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      sound: 'default',
      channelId: notification.channelId,
      priority: 'high',
    }));

    await this.sendPushNotifications(messages);
  }

  /**
   * Send BLIK matched notification
   */
  async sendBlikMatchedNotification(
    senderAddress: string,
    code: string,
    receiverAddress: string,
    amount: string,
    token: string,
  ): Promise<void> {
    await this.sendToWallet(senderAddress, {
      title: 'BLIK Code Matched!',
      body: `Someone entered your code ${code}. Confirm to send ${amount} ${token}`,
      data: {
        type: 'blik_matched',
        blikCode: code,
        receiverAddress,
        amount,
        token,
      },
      channelId: 'blik',
    });
  }

  /**
   * Send BLIK confirmed notification
   */
  async sendBlikConfirmedNotification(
    receiverAddress: string,
    amount: string,
    token: string,
    senderAddress: string,
    txHash: string,
  ): Promise<void> {
    await this.sendToWallet(receiverAddress, {
      title: 'Payment Received!',
      body: `You received ${amount} ${token} via BLIK`,
      data: {
        type: 'blik_confirmed',
        senderAddress,
        amount,
        token,
        txHash,
      },
      channelId: 'blik',
    });
  }

  /**
   * Send split request notification
   */
  async sendSplitRequestNotification(
    participantAddresses: string[],
    splitId: string,
    creatorName: string,
    amount: string,
    token: string,
    description?: string,
  ): Promise<void> {
    const body = description
      ? `${creatorName} requested ${amount} ${token} for "${description}"`
      : `${creatorName} requested ${amount} ${token}`;

    await this.sendToWallets(participantAddresses, {
      title: 'Payment Request',
      body,
      data: {
        type: 'split_request',
        splitId,
        amount,
        token,
      },
      channelId: 'payments',
    });
  }

  /**
   * Send split paid notification
   */
  async sendSplitPaidNotification(
    creatorAddress: string,
    splitId: string,
    payerName: string,
    amount: string,
    token: string,
  ): Promise<void> {
    await this.sendToWallet(creatorAddress, {
      title: 'Payment Received',
      body: `${payerName} paid their share: ${amount} ${token}`,
      data: {
        type: 'split_paid',
        splitId,
        amount,
        token,
      },
      channelId: 'payments',
    });
  }

  /**
   * Send split complete notification
   */
  async sendSplitCompleteNotification(
    creatorAddress: string,
    splitId: string,
    totalAmount: string,
    token: string,
  ): Promise<void> {
    await this.sendToWallet(creatorAddress, {
      title: 'Split Bill Complete!',
      body: `Everyone has paid. Total: ${totalAmount} ${token}`,
      data: {
        type: 'split_complete',
        splitId,
        amount: totalAmount,
        token,
      },
      channelId: 'payments',
    });
  }

  /**
   * Send push notifications via Expo Push API
   */
  private async sendPushNotifications(messages: ExpoPushMessage[]): Promise<void> {
    if (messages.length === 0) return;

    // Expo recommends batching in chunks of 100
    const chunks = this.chunkArray(messages, 100);

    for (const chunk of chunks) {
      try {
        const response = await fetch(this.expoPushUrl, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk),
        });

        const result = await response.json();
        const tickets = result.data as ExpoPushTicket[];

        // Log any errors
        tickets.forEach((ticket, index) => {
          if (ticket.status === 'error') {
            this.logger.error(
              `Push notification failed: ${ticket.message}`,
              ticket.details,
            );

            // If the token is invalid, mark the device as inactive
            if (ticket.details?.error === 'DeviceNotRegistered') {
              this.markDeviceInactive(chunk[index].to);
            }
          }
        });
      } catch (error) {
        this.logger.error('Failed to send push notifications:', error);
      }
    }
  }

  /**
   * Mark a device as inactive (invalid token)
   */
  private async markDeviceInactive(pushToken: string): Promise<void> {
    await this.pushDeviceRepository.update(
      { pushToken },
      { active: false },
    );
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
