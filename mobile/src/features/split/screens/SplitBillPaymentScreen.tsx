/**
 * Split Bill Payment Screen
 * 
 * UI for paying split bill participants with:
 * - Pay all / Pay selected buttons
 * - Real-time progress tracking
 * - Transaction links to explorer
 * - Pause/Resume/Cancel controls
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { ethers } from 'ethers';
import { useSplitBills } from '../store/splitBillsSlice';
import { payAllParticipants, paySelectedParticipants } from '../SplitPayer';
import type { PaymentProgress, PaymentQueueItem } from '../SplitPayer';
import type { Network } from '../../../config/env';

// ============================================================================
// Types
// ============================================================================

interface Props {
  billId: string;
  network?: Network;
  onComplete?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function SplitBillPaymentScreen({ billId, network, onComplete }: Props) {
  const bill = useSplitBills((state) => state.getBill(billId));
  const [progress, setProgress] = useState<PaymentProgress | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(
    new Set()
  );

  // Handle pay all
  const handlePayAll = useCallback(async () => {
    if (!bill) return;

    Alert.alert(
      'Pay All Participants',
      `Send ${bill.participants.filter((p) => p.payStatus === 'pending').length} payments?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay All',
          style: 'default',
          onPress: async () => {
            try {
              const result = await payAllParticipants({
                billId,
                network,
                minConfirmations: 2,
                maxRetries: 3,
                onProgress: setProgress,
              });

              if (result.completed === result.total) {
                Alert.alert('Success', 'All payments completed!');
                onComplete?.();
              } else if (result.failed > 0) {
                Alert.alert(
                  'Partial Success',
                  `${result.completed} succeeded, ${result.failed} failed`
                );
              }
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  }, [bill, billId, network, onComplete]);

  // Handle pay selected
  const handlePaySelected = useCallback(async () => {
    if (!bill || selectedParticipants.size === 0) return;

    Alert.alert(
      'Pay Selected',
      `Send ${selectedParticipants.size} payments?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay',
          style: 'default',
          onPress: async () => {
            try {
              const result = await paySelectedParticipants({
                billId,
                participantIds: Array.from(selectedParticipants),
                network,
                minConfirmations: 2,
                maxRetries: 3,
                onProgress: setProgress,
              });

              if (result.completed === result.total) {
                Alert.alert('Success', 'All payments completed!');
                setSelectedParticipants(new Set());
                onComplete?.();
              } else if (result.failed > 0) {
                Alert.alert(
                  'Partial Success',
                  `${result.completed} succeeded, ${result.failed} failed`
                );
              }
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  }, [bill, billId, selectedParticipants, network, onComplete]);

  // Toggle participant selection
  const toggleParticipant = useCallback((participantId: string) => {
    setSelectedParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(participantId)) {
        next.delete(participantId);
      } else {
        next.add(participantId);
      }
      return next;
    });
  }, []);

  // Open explorer
  const openExplorer = useCallback((txHash: string) => {
    const explorerUrl = getExplorerUrl(txHash, network);
    Linking.openURL(explorerUrl);
  }, [network]);

  if (!bill) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Bill not found</Text>
      </View>
    );
  }

  const pendingParticipants = bill.participants.filter(
    (p) => p.payStatus === 'pending'
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Split Bill Payment</Text>
        {bill.note && <Text style={styles.note}>{bill.note}</Text>}
      </View>

      {/* Bill Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total:</Text>
          <Text style={styles.summaryValue}>
            {bill.totalHuman} {bill.asset.symbol || 'ETH'}
          </Text>
        </View>
        {bill.tipPercent && bill.tipPercent > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tip ({bill.tipPercent}%):</Text>
            <Text style={styles.summaryValue}>
              {calculateTip(bill.totalHuman, bill.tipPercent)}{' '}
              {bill.asset.symbol || 'ETH'}
            </Text>
          </View>
        )}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total with Tip:</Text>
          <Text style={styles.summaryValueBold}>
            {ethers.utils.formatEther(bill.totalWithTipSmallestUnit || '0')}{' '}
            {bill.asset.symbol || 'ETH'}
          </Text>
        </View>
      </View>

      {/* Progress */}
      {progress && progress.isRunning && (
        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>Progress</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(progress.completed / progress.total) * 100}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {progress.completed} / {progress.total} completed
            {progress.failed > 0 && ` (${progress.failed} failed)`}
          </Text>

          {progress.current && (
            <View style={styles.currentPayment}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.currentPaymentText}>
                Sending to {shortenAddress(progress.current.address)}...
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Action Buttons */}
      {!progress?.isRunning && pendingParticipants.length > 0 && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={handlePayAll}
          >
            <Text style={styles.buttonText}>
              Pay All ({pendingParticipants.length})
            </Text>
          </TouchableOpacity>

          {selectedParticipants.size > 0 && (
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={handlePaySelected}
            >
              <Text style={styles.buttonTextSecondary}>
                Pay Selected ({selectedParticipants.size})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Participants List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Participants</Text>
        {bill.participants.map((participant) => (
          <ParticipantCard
            key={participant.id}
            participant={participant}
            isSelected={selectedParticipants.has(participant.id)}
            onToggle={() => toggleParticipant(participant.id)}
            onOpenExplorer={openExplorer}
            queueItem={progress?.queue.find(
              (item) => item.participantId === participant.id
            )}
          />
        ))}
      </View>

      {/* Queue Status */}
      {progress && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Queue</Text>
          {progress.queue.map((item) => (
            <QueueItemCard
              key={item.participantId}
              item={item}
              onOpenExplorer={openExplorer}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

interface ParticipantCardProps {
  participant: any;
  isSelected: boolean;
  onToggle: () => void;
  onOpenExplorer: (txHash: string) => void;
  queueItem?: PaymentQueueItem;
}

function ParticipantCard({
  participant,
  isSelected,
  onToggle,
  onOpenExplorer,
  queueItem,
}: ParticipantCardProps) {
  const statusColor = getStatusColor(participant.payStatus);
  const statusIcon = getStatusIcon(participant.payStatus);

  return (
    <TouchableOpacity
      style={[
        styles.participantCard,
        isSelected && styles.participantCardSelected,
      ]}
      onPress={participant.payStatus === 'pending' ? onToggle : undefined}
      disabled={participant.payStatus !== 'pending'}
    >
      <View style={styles.participantHeader}>
        <View style={styles.participantInfo}>
          <Text style={styles.participantAddress}>
            {shortenAddress(participant.address)}
          </Text>
          {participant.note && (
            <Text style={styles.participantNote}>{participant.note}</Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>
            {statusIcon} {participant.payStatus}
          </Text>
        </View>
      </View>

      <View style={styles.participantAmount}>
        <Text style={styles.amountLabel}>Amount:</Text>
        <Text style={styles.amountValue}>
          {ethers.utils.formatEther(participant.amountSmallestUnit || '0')} ETH
        </Text>
      </View>

      {participant.txHash && (
        <TouchableOpacity
          style={styles.explorerLink}
          onPress={() => onOpenExplorer(participant.txHash!)}
        >
          <Text style={styles.explorerLinkText}>
            View on Explorer: {shortenHash(participant.txHash)}
          </Text>
        </TouchableOpacity>
      )}

      {queueItem && (
        <View style={styles.queueStatus}>
          <Text style={styles.queueStatusText}>
            Attempts: {queueItem.attempts}
          </Text>
          {queueItem.error && (
            <Text style={styles.errorText}>{queueItem.error}</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

interface QueueItemCardProps {
  item: PaymentQueueItem;
  onOpenExplorer: (txHash: string) => void;
}

function QueueItemCard({ item, onOpenExplorer }: QueueItemCardProps) {
  const statusColor = getQueueStatusColor(item.status);

  return (
    <View style={styles.queueItemCard}>
      <View style={styles.queueItemHeader}>
        <Text style={styles.queueItemAddress}>
          {shortenAddress(item.address)}
        </Text>
        <View style={[styles.queueStatusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.queueStatusText}>{item.status}</Text>
        </View>
      </View>

      <Text style={styles.queueItemAmount}>
        {item.amountHuman} ETH
      </Text>

      {item.txHash && (
        <TouchableOpacity
          style={styles.explorerLink}
          onPress={() => onOpenExplorer(item.txHash!)}
        >
          <Text style={styles.explorerLinkText}>
            {shortenHash(item.txHash)}
          </Text>
        </TouchableOpacity>
      )}

      {item.error && (
        <Text style={styles.queueItemError}>{item.error}</Text>
      )}
    </View>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function shortenHash(hash: string): string {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'paid':
      return '#34C759';
    case 'failed':
      return '#FF3B30';
    case 'pending':
      return '#FF9500';
    default:
      return '#8E8E93';
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'paid':
      return '✅';
    case 'failed':
      return '❌';
    case 'pending':
      return '⏳';
    default:
      return '⚪';
  }
}

function getQueueStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return '#34C759';
    case 'failed':
      return '#FF3B30';
    case 'processing':
      return '#007AFF';
    case 'confirming':
      return '#5856D6';
    case 'pending':
      return '#8E8E93';
    default:
      return '#8E8E93';
  }
}

function getExplorerUrl(txHash: string, network?: Network): string {
  const baseUrls: Record<string, string> = {
    mainnet: 'https://etherscan.io/tx/',
    sepolia: 'https://sepolia.etherscan.io/tx/',
    holesky: 'https://holesky.etherscan.io/tx/',
  };

  const baseUrl = baseUrls[network || 'sepolia'] || baseUrls.sepolia;
  return `${baseUrl}${txHash}`;
}

function calculateTip(totalHuman: string, tipPercent: number): string {
  const total = parseFloat(totalHuman);
  const tip = total * (tipPercent / 100);
  return tip.toFixed(6);
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  note: {
    fontSize: 14,
    color: '#8E8E93',
  },
  section: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  summaryValue: {
    fontSize: 14,
    color: '#000000',
  },
  summaryValueBold: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  progressSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34C759',
  },
  progressText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  currentPayment: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 6,
  },
  currentPaymentText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#007AFF',
  },
  actionButtons: {
    padding: 16,
    gap: 12,
  },
  button: {
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  buttonTextSecondary: {
    fontSize: 12,
    fontWeight: '500',
    color: '#007AFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  participantCard: {
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#F2F2F7',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  participantCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FF',
  },
  participantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  participantInfo: {
    flex: 1,
  },
  participantAddress: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  participantNote: {
    fontSize: 14,
    color: '#8E8E93',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  participantAmount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  amountLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  explorerLink: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#E3F2FF',
    borderRadius: 6,
  },
  explorerLinkText: {
    fontSize: 12,
    color: '#007AFF',
    textAlign: 'center',
  },
  queueStatus: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FFF3CD',
    borderRadius: 6,
  },
  queueStatusText: {
    fontSize: 12,
    color: '#856404',
  },
  queueItemCard: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 6,
  },
  queueItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  queueItemAddress: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  queueStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  queueItemAmount: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  queueItemError: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
    padding: 16,
  },
});
