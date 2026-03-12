import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { RegisterDeviceDto, UnregisterDeviceDto } from './dto/register-device.dto';

interface PushDevice {
  id: string;
  wallet_address: string;
  push_token: string;
  platform: string;
  device_name?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

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
    private readonly supabase: SupabaseService,
  ) {}

  /**
   * Register a device for push notifications
   */
  async registerDevice(dto: RegisterDeviceDto): Promise<PushDevice> {
    // Check if device already exists
    const { data: existingDevice } = await this.supabase
      .from('push_devices')
      .select('*')
      .eq('push_token', dto.pushToken)
      .single();

    if (existingDevice) {
      // Update existing device
      const { data, error } = await this.supabase
        .from('push_devices')
        .update({
          wallet_address: dto.walletAddress,
          platform: dto.platform,
          device_name: dto.deviceName || existingDevice.device_name,
          active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('push_token', dto.pushToken)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Create new device
      const { data, error } = await this.supabase
        .from('push_devices')
        .insert({
          wallet_address: dto.walletAddress,
          push_token: dto.pushToken,
          platform: dto.platform,
          device_name: dto.deviceName,
          active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  }

  /**
   * Unregister a device
   */
  async unregisterDevice(dto: UnregisterDeviceDto): Promise<void> {
    const { error } = await this.supabase
      .from('push_devices')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('push_token', dto.pushToken)
      .eq('wallet_address', dto.walletAddress);

    if (error) throw error;
  }

  /**
   * Get all active devices for a wallet address
   */
  async getDevicesForWallet(walletAddress: string): Promise<PushDevice[]> {
    const { data, error } = await this.supabase
      .from('push_devices')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .eq('active', true);

    if (error) throw error;
    return data || [];
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
      to: device.push_token,
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
      to: device.push_token,
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
   * Send split created notification to participants
   */
  async sendSplitCreatedNotification(
    participantAddresses: string[],
    creatorName: string,
    description: string | null,
    totalAmount: string,
    tokenSymbol: string,
    splitId: string,
  ): Promise<void> {
    const body = description
      ? `${creatorName} added you to "${description}" - ${totalAmount} ${tokenSymbol}`
      : `${creatorName} added you to a split bill - ${totalAmount} ${tokenSymbol}`;

    await this.sendToWallets(participantAddresses, {
      title: 'New Split Bill',
      body,
      data: {
        type: 'split_created',
        splitId,
        totalAmount,
        tokenSymbol,
      },
      channelId: 'payments',
    });
  }

  /**
   * Send split paid notification to the creator
   */
  async sendSplitPaidNotification(
    creatorAddress: string,
    payerName: string,
    amount: string,
    tokenSymbol: string,
    splitId: string,
  ): Promise<void> {
    await this.sendToWallet(creatorAddress, {
      title: 'Split Payment Received',
      body: `${payerName} paid their share: ${amount} ${tokenSymbol}`,
      data: {
        type: 'split_paid',
        splitId,
        amount,
        tokenSymbol,
      },
      channelId: 'payments',
    });
  }

  /**
   * Send split completed notification to all participants
   */
  async sendSplitCompleteNotification(
    allAddresses: string[],
    totalAmount: string,
    tokenSymbol: string,
    splitId: string,
  ): Promise<void> {
    await this.sendToWallets(allAddresses, {
      title: 'Split Bill Complete!',
      body: `Everyone has paid. Total: ${totalAmount} ${tokenSymbol}`,
      data: {
        type: 'split_complete',
        splitId,
        totalAmount,
        tokenSymbol,
      },
      channelId: 'payments',
    });
  }

  /**
   * Send payment received notification (generic transfer)
   */
  async sendPaymentReceivedNotification(
    receiverAddress: string,
    amount: string,
    tokenSymbol: string,
    fromAddress: string,
    fromName: string | undefined,
    txHash: string,
  ): Promise<void> {
    const sender = fromName || `${fromAddress.slice(0, 6)}...${fromAddress.slice(-4)}`;

    await this.sendToWallet(receiverAddress, {
      title: 'Payment Received',
      body: `You received ${amount} ${tokenSymbol} from ${sender}`,
      data: {
        type: 'payment_received',
        fromAddress,
        amount,
        tokenSymbol,
        txHash,
      },
      channelId: 'payments',
    });
  }

  /**
   * Send scheduled payment executed notification
   */
  async sendScheduledExecutedNotification(
    creatorAddress: string,
    recipient: string,
    amount: string,
    tokenSymbol: string,
    txHash: string,
  ): Promise<void> {
    const recipientShort = `${recipient.slice(0, 6)}...${recipient.slice(-4)}`;
    const creatorShort = `${creatorAddress.slice(0, 6)}...${creatorAddress.slice(-4)}`;

    // Notify creator
    await this.sendToWallet(creatorAddress, {
      title: 'Scheduled Payment Executed',
      body: `Your payment of ${amount} ${tokenSymbol} to ${recipientShort} was sent`,
      data: {
        type: 'scheduled_executed',
        recipient,
        amount,
        tokenSymbol,
        txHash,
      },
      channelId: 'scheduled',
    });

    // Notify recipient
    await this.sendToWallet(recipient, {
      title: 'Payment Received',
      body: `You received ${amount} ${tokenSymbol} from ${creatorShort}`,
      data: {
        type: 'scheduled_received',
        sender: creatorAddress,
        amount,
        tokenSymbol,
        txHash,
      },
      channelId: 'scheduled',
    });
  }

  /**
   * Send scheduled payment reminder notification
   */
  async sendScheduledReminderNotification(
    creatorAddress: string,
    recipient: string,
    amount: string,
    tokenSymbol: string,
    paymentId: string,
  ): Promise<void> {
    const recipientShort = `${recipient.slice(0, 6)}...${recipient.slice(-4)}`;

    await this.sendToWallet(creatorAddress, {
      title: 'Payment Due Soon',
      body: `Your payment of ${amount} ${tokenSymbol} to ${recipientShort} is due soon`,
      data: {
        type: 'scheduled_reminder',
        paymentId,
        recipient,
        amount,
        tokenSymbol,
      },
      channelId: 'scheduled',
    });
  }

  /**
   * Send scheduled payment failed notification
   */
  async sendScheduledFailedNotification(
    creatorAddress: string,
    recipient: string,
    amount: string,
    tokenSymbol: string,
    reason: string,
    paymentId: string,
  ): Promise<void> {
    const recipientShort = `${recipient.slice(0, 6)}...${recipient.slice(-4)}`;

    await this.sendToWallet(creatorAddress, {
      title: 'Scheduled Payment Failed',
      body: `Payment of ${amount} ${tokenSymbol} to ${recipientShort} failed: ${reason}`,
      data: {
        type: 'scheduled_failed',
        paymentId,
        recipient,
        amount,
        tokenSymbol,
      },
      channelId: 'scheduled',
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
    const { error } = await this.supabase
      .from('push_devices')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('push_token', pushToken);

    if (error) {
      this.logger.error(`Failed to mark device inactive: ${error.message}`);
    }
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
