/**
 * Payment Request Screen
 * 
 * Shows payment requests for split bill participants:
 * - QR codes for each participant
 * - Share buttons
 * - Manual "Mark as Paid" option
 * - Network and token information
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  Linking,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { ethers } from 'ethers';
import { useSplitBills } from '../store/splitBillsSlice';
import {
  generateAllPaymentRequests,
  getExplorerAddressUrl,
  getExplorerTokenUrl,
} from '../utils/paymentRequest';
import { IncomingWatcher } from '../IncomingWatcher';
import type { PaymentRequest } from '../utils/paymentRequest';
import type { MatchResult } from '../IncomingWatcher';
import type { Network } from '../../../config/env';

// ============================================================================
// Types
// ============================================================================

interface Props {
  billId: string;
  recipientAddress: string;
  network?: Network;
}

// ============================================================================
// Component
// ============================================================================

export function PaymentRequestScreen({
  billId,
  recipientAddress,
  network = 'sepolia',
}: Props) {
  const bill = useSplitBills((state: any) => state.getBill(billId));
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [watcherStatus, setWatcherStatus] = useState<any>(null);

  // Generate payment requests
  useEffect(() => {
    if (bill) {
      const requests = generateAllPaymentRequests(bill, recipientAddress);
      setPaymentRequests(requests);
    }
  }, [bill, recipientAddress]);

  // Start incoming watcher
  useEffect(() => {
    const watcher = new IncomingWatcher({
      recipientAddress,
      network,
      pollIntervalMs: 15000,
      amountToleranceWei: '1000',
      onMatch: (match: MatchResult) => {
        console.log('✅ Payment matched:', match);
        Alert.alert(
          'Payment Received!',
          `${ethers.utils.formatEther(match.amountReceived)} ETH received from ${match.transaction.from.slice(0, 10)}...`
        );
      },
      onError: (error: Error) => {
        console.error('Watcher error:', error);
      },
    });

    watcher.start();

    // Update status periodically
    const statusInterval = setInterval(() => {
      setWatcherStatus(watcher.getStatus());
    }, 5000);

    return () => {
      watcher.stop();
      clearInterval(statusInterval);
    };
  }, [recipientAddress, network]);

  // Handle share
  const handleShare = async (request: PaymentRequest) => {
    try {
      await Share.share({
        message: request.shareText,
        title: 'Payment Request',
      });
    } catch (error: any) {
      console.error('Share error:', error);
    }
  };

  // Handle manual mark as paid
  const handleManualMarkPaid = (request: PaymentRequest) => {
    Alert.alert(
      'Mark as Paid',
      'Manually mark this participant as paid?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Paid',
          style: 'default',
          onPress: () => {
            IncomingWatcher.markAsPaid(billId, request.participantId);
            Alert.alert('Success', 'Participant marked as paid');
          },
        },
      ]
    );
  };

  // Handle copy URI
  const handleCopyUri = (uri: string) => {
    // In React Native, use Clipboard API
    Alert.alert('URI Copied', uri);
  };

  if (!bill) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Bill not found</Text>
      </View>
    );
  }

  const pendingRequests = paymentRequests.filter((r) => {
    const participant = bill.participants.find((p: any) => p.id === r.participantId);
    return participant?.payStatus === 'pending';
  });

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Payment Requests</Text>
        {bill.note && <Text style={styles.note}>{bill.note}</Text>}
      </View>

      {/* Network Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>⚠️ Important</Text>
        <Text style={styles.infoText}>
          • Network: <Text style={styles.infoBold}>{getNetworkName(bill.chainId)}</Text>
        </Text>
        <Text style={styles.infoText}>
          • Asset: <Text style={styles.infoBold}>{bill.asset.symbol || 'ETH'}</Text>
        </Text>
        {bill.asset.type === 'ERC20' && bill.asset.tokenAddress && (
          <TouchableOpacity
            onPress={() => Linking.openURL(getExplorerTokenUrl(bill.asset.tokenAddress!, bill.chainId))}
          >
            <Text style={styles.infoLink}>
              Token: {shortenAddress(bill.asset.tokenAddress)}
            </Text>
          </TouchableOpacity>
        )}
        <Text style={styles.infoText}>
          • Recipient: <Text style={styles.infoBold}>{shortenAddress(recipientAddress)}</Text>
        </Text>
      </View>

      {/* Watcher Status */}
      {watcherStatus && (
        <View style={styles.watcherStatus}>
          <Text style={styles.watcherStatusText}>
            👁️ Watching for incoming payments...
          </Text>
          <Text style={styles.watcherStatusSubtext}>
            Last checked block: {watcherStatus.lastCheckedBlock}
          </Text>
        </View>
      )}

      {/* Payment Requests */}
      {pendingRequests.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            ✅ All participants have paid!
          </Text>
        </View>
      ) : (
        pendingRequests.map((request) => (
          <PaymentRequestCard
            key={request.participantId}
            request={request}
            onShare={() => handleShare(request)}
            onCopyUri={() => handleCopyUri(request.uri)}
            onManualMarkPaid={() => handleManualMarkPaid(request)}
          />
        ))
      )}

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>📱 How to Pay</Text>
        <Text style={styles.instructionsText}>
          1. Scan the QR code with a compatible wallet
        </Text>
        <Text style={styles.instructionsText}>
          2. Or share the payment link
        </Text>
        <Text style={styles.instructionsText}>
          3. Payment will be detected automatically
        </Text>
        <Text style={styles.instructionsText}>
          4. Or mark as paid manually if needed
        </Text>
      </View>
    </ScrollView>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

interface PaymentRequestCardProps {
  request: PaymentRequest;
  onShare: () => void;
  onCopyUri: () => void;
  onManualMarkPaid: () => void;
}

function PaymentRequestCard({
  request,
  onShare,
  onCopyUri,
  onManualMarkPaid,
}: PaymentRequestCardProps) {
  return (
    <View style={styles.requestCard}>
      {/* Header */}
      <View style={styles.requestHeader}>
        <View>
          <Text style={styles.requestAddress}>
            {shortenAddress(request.participantAddress)}
          </Text>
          <Text style={styles.requestAmount}>
            {request.amountHuman} {request.asset.symbol || 'ETH'}
          </Text>
        </View>
      </View>

      {/* QR Code */}
      <View style={styles.qrContainer}>
        <QRCode
          value={request.qrData}
          size={200}
          backgroundColor="white"
          color="black"
        />
      </View>

      {/* URI */}
      <TouchableOpacity
        style={styles.uriContainer}
        onPress={onCopyUri}
      >
        <Text style={styles.uriText} numberOfLines={2}>
          {request.uri}
        </Text>
        <Text style={styles.uriCopy}>Tap to copy</Text>
      </TouchableOpacity>

      {/* Actions */}
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonPrimary]}
          onPress={onShare}
        >
          <Text style={styles.actionButtonText}>📤 Share</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonSecondary]}
          onPress={onManualMarkPaid}
        >
          <Text style={styles.actionButtonTextSecondary}>✓ Mark Paid</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getNetworkName(chainId: number): string {
  const networks: Record<number, string> = {
    1: 'Ethereum Mainnet',
    11155111: 'Sepolia Testnet',
    17000: 'Holesky Testnet',
  };
  return networks[chainId] || `Chain ID ${chainId}`;
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  note: {
    fontSize: 14,
    color: '#8E8E93',
  },
  infoBox: {
    margin: 16,
    padding: 14,
    backgroundColor: '#FFF3CD',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFE69C',
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#856404',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 4,
  },
  infoBold: {
    fontWeight: '600',
  },
  infoLink: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
    textDecorationLine: 'underline',
  },
  watcherStatus: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#E3F2FF',
    borderRadius: 6,
  },
  watcherStatusText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  watcherStatusSubtext: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 13,
    color: '#34C759',
    fontWeight: '500',
  },
  requestCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
  },
  requestHeader: {
    marginBottom: 16,
  },
  requestAddress: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  requestAmount: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  qrContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    marginBottom: 16,
  },
  uriContainer: {
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 6,
    marginBottom: 16,
  },
  uriText: {
    fontSize: 12,
    color: '#000000',
    fontFamily: 'monospace',
  },
  uriCopy: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonPrimary: {
    backgroundColor: '#007AFF',
  },
  actionButtonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#34C759',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionButtonTextSecondary: {
    fontSize: 12,
    fontWeight: '500',
    color: '#34C759',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  instructions: {
    margin: 16,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
  },
  instructionsTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
    padding: 16,
  },
});
