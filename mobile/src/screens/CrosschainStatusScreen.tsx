/**
 * CrosschainStatusScreen
 * 
 * Monitors the status of cross-chain transactions in real-time.
 * Shows progress through different stages:
 * 1. Submitted - Transaction sent to source chain
 * 2. Pending - Waiting for confirmation on source chain  
 * 3. Bridging - Assets being transferred across chains
 * 4. Completed - Transaction successful on destination chain
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { MainStackParamList } from '../navigation/MainNavigator';
import Card from '../components/common/Card';
import { getCrosschainTransactionStatus } from '../services/api/crosschainService';
import { getExplorerUrl } from '../constants/etherscanApi';
import type { Network } from '../config/env';

type Props = NativeStackScreenProps<MainStackParamList, 'CrosschainStatus'>;

type TransactionStatus = 
  | 'submitted' 
  | 'pending' 
  | 'bridging' 
  | 'completing' 
  | 'completed' 
  | 'failed';

interface StatusStep {
  id: TransactionStatus;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const STATUS_STEPS: StatusStep[] = [
  { id: 'submitted', label: 'Submitted', description: 'Transaction sent', icon: 'paper-plane' },
  { id: 'pending', label: 'Confirming', description: 'Waiting for source chain', icon: 'hourglass' },
  { id: 'bridging', label: 'Bridging', description: 'Transferring across chains', icon: 'git-branch' },
  { id: 'completing', label: 'Completing', description: 'Finalizing on destination', icon: 'checkmark-circle' },
  { id: 'completed', label: 'Completed', description: 'Transfer successful!', icon: 'checkmark-done-circle' },
];

// Polling interval in ms
const POLL_INTERVAL = 5000;
const MAX_POLL_COUNT = 360; // 30 minutes max polling

export default function CrosschainStatusScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const {
    txHash,
    router,
    fromChainId,
    toChainId,
    amount,
    fromToken,
    toToken,
    estimatedOutput,
    estimatedDuration,
  } = route.params;

  const [status, setStatus] = useState<TransactionStatus>('submitted');
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [pollCount, setPollCount] = useState(0);
  const [sourceTxHash, setSourceTxHash] = useState(txHash);
  const [destTxHash, setDestTxHash] = useState<string | null>(null);

  // Animation for pulsing effect
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Map API status to our status steps
  const mapApiStatus = useCallback((apiStatus: any): TransactionStatus => {
    const statusStr = (apiStatus?.status || apiStatus || '').toLowerCase();
    
    if (statusStr.includes('failed') || statusStr.includes('error')) {
      return 'failed';
    }
    if (statusStr.includes('complete') || statusStr.includes('done') || statusStr.includes('success')) {
      return 'completed';
    }
    if (statusStr.includes('completing') || statusStr.includes('finalizing')) {
      return 'completing';
    }
    if (statusStr.includes('bridge') || statusStr.includes('transfer')) {
      return 'bridging';
    }
    if (statusStr.includes('pending') || statusStr.includes('confirm')) {
      return 'pending';
    }
    return 'submitted';
  }, []);

  // Start pulse animation
  useEffect(() => {
    if (status !== 'completed' && status !== 'failed') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [status, pulseAnim]);

  // Update progress animation based on status
  useEffect(() => {
    const statusIndex = STATUS_STEPS.findIndex(s => s.id === status);
    const progress = status === 'failed' ? 0 : (statusIndex + 1) / STATUS_STEPS.length;
    
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [status, progressAnim]);

  // Poll for status updates
  useEffect(() => {
    if (status === 'completed' || status === 'failed' || pollCount >= MAX_POLL_COUNT) {
      return;
    }

    const pollStatus = async () => {
      try {
        console.log(`🔄 [CrosschainStatus] Polling status (${pollCount + 1}/${MAX_POLL_COUNT})...`);
        
        const result = await getCrosschainTransactionStatus(router, txHash);
        
        console.log('📊 [CrosschainStatus] Status result:', result);

        if (result.status) {
          const newStatus = mapApiStatus(result.status);
          setStatus(newStatus);
          setStatusMessage(result.statusMessage || result.message || '');
          
          if (result.destinationTxHash) {
            setDestTxHash(result.destinationTxHash);
          }
        }
      } catch (error: any) {
        console.warn('⚠️ [CrosschainStatus] Poll error:', error.message);
        // Don't set error state for network issues during polling
        // Just continue polling
      }
    };

    const timer = setTimeout(() => {
      pollStatus();
      setPollCount(c => c + 1);
    }, POLL_INTERVAL);

    return () => clearTimeout(timer);
  }, [status, pollCount, router, txHash, mapApiStatus]);

  // Initial status check
  useEffect(() => {
    const checkInitialStatus = async () => {
      try {
        const result = await getCrosschainTransactionStatus(router, txHash);
        if (result.status) {
          const newStatus = mapApiStatus(result.status);
          setStatus(newStatus);
          setStatusMessage(result.statusMessage || result.message || '');
        }
      } catch (error: any) {
        console.warn('Initial status check failed:', error.message);
        // Start from submitted status
        setStatus('submitted');
      }
    };
    checkInitialStatus();
  }, [router, txHash, mapApiStatus]);

  const getStatusColor = (stepStatus: TransactionStatus) => {
    if (status === 'failed') return theme.colors.error;
    
    const currentIndex = STATUS_STEPS.findIndex(s => s.id === status);
    const stepIndex = STATUS_STEPS.findIndex(s => s.id === stepStatus);
    
    if (stepIndex < currentIndex) return theme.colors.success;
    if (stepIndex === currentIndex) return theme.colors.primary;
    return theme.colors.border;
  };

  const openExplorer = (hash: string, chainId: string) => {
    const network = chainId.toLowerCase() as Network;
    const explorerUrl = getExplorerUrl(network);
    Linking.openURL(`${explorerUrl}/tx/${hash}`);
  };

  const getChainName = (chainId: string) => {
    const names: Record<string, string> = {
      mainnet: 'Ethereum',
      ethereum: 'Ethereum',
      sepolia: 'Sepolia',
      holesky: 'Holesky',
      polygon: 'Polygon',
      arbitrum: 'Arbitrum',
      optimism: 'Optimism',
      base: 'Base',
    };
    return names[chainId.toLowerCase()] || chainId;
  };

  const estimatedMinutes = Math.ceil(estimatedDuration / 60);
  const elapsedMinutes = Math.floor((pollCount * POLL_INTERVAL) / 60000);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backButton}>
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Transfer Status</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Status Icon */}
        <View style={styles.statusIconContainer}>
          <Animated.View
            style={[
              styles.statusIconCircle,
              {
                backgroundColor: status === 'failed' 
                  ? theme.colors.error + '20' 
                  : status === 'completed' 
                    ? theme.colors.success + '20' 
                    : theme.colors.primary + '20',
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <Ionicons
              name={
                status === 'failed' ? 'close-circle' :
                status === 'completed' ? 'checkmark-circle' :
                'swap-horizontal'
              }
              size={64}
              color={
                status === 'failed' ? theme.colors.error :
                status === 'completed' ? theme.colors.success :
                theme.colors.primary
              }
            />
          </Animated.View>
          
          <Text style={[styles.statusTitle, { 
            color: status === 'failed' ? theme.colors.error :
                   status === 'completed' ? theme.colors.success :
                   theme.colors.text 
          }]}>
            {status === 'failed' ? 'Transfer Failed' :
             status === 'completed' ? 'Transfer Complete!' :
             'Transfer in Progress'}
          </Text>
          
          {statusMessage && (
            <Text style={[styles.statusMessage, { color: theme.colors.textSecondary }]}>
              {statusMessage}
            </Text>
          )}
        </View>

        {/* Transfer Summary */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.chainInfo}>
              <Text style={[styles.chainLabel, { color: theme.colors.textSecondary }]}>From</Text>
              <Text style={[styles.chainName, { color: theme.colors.text }]}>
                {getChainName(fromChainId)}
              </Text>
              <Text style={[styles.amountText, { color: theme.colors.text }]}>
                {amount} {fromToken}
              </Text>
            </View>
            
            <View style={styles.arrowContainer}>
              <Ionicons name="arrow-forward" size={24} color={theme.colors.primary} />
            </View>
            
            <View style={[styles.chainInfo, { alignItems: 'flex-end' }]}>
              <Text style={[styles.chainLabel, { color: theme.colors.textSecondary }]}>To</Text>
              <Text style={[styles.chainName, { color: theme.colors.text }]}>
                {getChainName(toChainId)}
              </Text>
              <Text style={[styles.amountText, { color: theme.colors.success }]}>
                ~{estimatedOutput} {toToken}
              </Text>
            </View>
          </View>
          
          <View style={styles.routerInfo}>
            <Ionicons name="git-network" size={14} color={theme.colors.textSecondary} />
            <Text style={[styles.routerText, { color: theme.colors.textSecondary }]}>
              via {router}
            </Text>
          </View>
        </Card>

        {/* Progress Steps */}
        <View style={styles.progressContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Progress</Text>
          
          {/* Progress Bar */}
          <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: status === 'failed' ? theme.colors.error : theme.colors.success,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          {/* Steps */}
          {STATUS_STEPS.map((step, index) => {
            const isActive = step.id === status;
            const isPast = STATUS_STEPS.findIndex(s => s.id === status) > index;
            const stepColor = getStatusColor(step.id);

            return (
              <View key={step.id} style={styles.stepRow}>
                <View style={[styles.stepIcon, { backgroundColor: stepColor + '20' }]}>
                  <Ionicons
                    name={isPast ? 'checkmark' : step.icon}
                    size={18}
                    color={stepColor}
                  />
                </View>
                <View style={styles.stepContent}>
                  <Text style={[
                    styles.stepLabel,
                    { color: isActive ? stepColor : theme.colors.text }
                  ]}>
                    {step.label}
                  </Text>
                  <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
                    {step.description}
                  </Text>
                </View>
                {isActive && status !== 'completed' && status !== 'failed' && (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                )}
              </View>
            );
          })}
        </View>

        {/* Time Estimate */}
        {status !== 'completed' && status !== 'failed' && (
          <View style={[styles.timeBox, { backgroundColor: theme.colors.accent + '10' }]}>
            <Ionicons name="time-outline" size={20} color={theme.colors.accent} />
            <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>
              Estimated: ~{estimatedMinutes} min • Elapsed: {elapsedMinutes} min
            </Text>
          </View>
        )}

        {/* Transaction Links */}
        <View style={styles.linksContainer}>
          <TouchableOpacity
            style={[styles.linkButton, { backgroundColor: theme.colors.surface }]}
            onPress={() => openExplorer(sourceTxHash, fromChainId)}
          >
            <Ionicons name="open-outline" size={18} color={theme.colors.primary} />
            <Text style={[styles.linkText, { color: theme.colors.primary }]}>
              Source Transaction
            </Text>
          </TouchableOpacity>

          {destTxHash && (
            <TouchableOpacity
              style={[styles.linkButton, { backgroundColor: theme.colors.surface }]}
              onPress={() => openExplorer(destTxHash, toChainId)}
            >
              <Ionicons name="open-outline" size={18} color={theme.colors.success} />
              <Text style={[styles.linkText, { color: theme.colors.success }]}>
                Destination Transaction
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Error Message */}
        {error && (
          <View style={[styles.errorBox, { backgroundColor: theme.colors.error + '10' }]}>
            <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
          </View>
        )}

        <View style={styles.spacer} />
      </ScrollView>

      {/* Footer Button */}
      <View style={[styles.footer, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity
          style={[styles.homeButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.8}
        >
          <Text style={styles.homeButtonText}>
            {status === 'completed' ? 'Done' : 'Close'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  statusIconContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  statusIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
  },
  statusMessage: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  summaryCard: {
    padding: 20,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chainInfo: {
    flex: 1,
  },
  chainLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  chainName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
  },
  arrowContainer: {
    paddingHorizontal: 16,
  },
  routerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 6,
  },
  routerText: {
    fontSize: 13,
  },
  progressContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepContent: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  stepDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  timeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 6,
    marginBottom: 24,
  },
  timeText: {
    fontSize: 14,
  },
  linksContainer: {
    gap: 12,
    marginBottom: 24,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 6,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 6,
    marginBottom: 24,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
  },
  spacer: {
    height: 20,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  homeButton: {
    height: 48,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

