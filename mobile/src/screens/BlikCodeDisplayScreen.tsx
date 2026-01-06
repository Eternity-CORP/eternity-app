import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  Clipboard,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { MainStackParamList } from '../navigation/MainNavigator';
import Card from '../components/common/Card';
import { cancelBlikCode } from '../services/api/blikService';

type Props = NativeStackScreenProps<MainStackParamList, 'BlikCodeDisplay'>;

export default function BlikCodeDisplayScreen({ route, navigation }: Props) {
  const { code, amount, tokenSymbol, preferredChainId, expiresAt } = route.params;
  
  const [timeRemaining, setTimeRemaining] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setExpired(true);
        setTimeRemaining('Expired');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleCopyCode = () => {
    Clipboard.setString(code);
    Alert.alert('Copied', 'Payment code copied to clipboard');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Pay me ${amount} ${tokenSymbol} using code: ${code}`,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Payment Code',
      'Are you sure you want to cancel this payment code?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = 'dummy-token';
              await cancelBlikCode(token, code);
              Alert.alert('Cancelled', 'Payment code has been cancelled');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel payment code');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Code</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Code Display */}
      <Card style={styles.codeCard}>
        <Text style={styles.codeLabel}>Your Payment Code</Text>
        
        <View style={styles.codeContainer}>
          <Text style={styles.code}>{code}</Text>
        </View>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          <QRCode
            value={JSON.stringify({
              type: 'BLIK_PAYMENT',
              code,
              amount,
              token: tokenSymbol,
            })}
            size={200}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCopyCode}>
            <Ionicons name="copy-outline" size={24} color="#007AFF" />
            <Text style={styles.actionText}>Copy Code</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color="#007AFF" />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Details */}
      <Card style={styles.detailsCard}>
        <Text style={styles.detailsTitle}>Details</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount</Text>
          <Text style={styles.detailValue}>{amount} {tokenSymbol}</Text>
        </View>

        {preferredChainId && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Network</Text>
            <Text style={[styles.detailValue, styles.chainValue]}>
              {preferredChainId}
            </Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Status</Text>
          <View style={[styles.statusBadge, expired && styles.statusExpired]}>
            <Text style={[styles.statusText, expired && styles.statusTextExpired]}>
              {expired ? 'Expired' : 'Pending'}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Expires</Text>
          <Text style={[styles.detailValue, expired && styles.expiredText]}>
            {expired ? 'Expired' : `${timeRemaining} remaining`}
          </Text>
        </View>
      </Card>

      {/* Timer Warning */}
      {!expired && (
        <View style={styles.timerBox}>
          <Ionicons name="time-outline" size={20} color="#FF9500" />
          <Text style={styles.timerText}>
            Code expires in {timeRemaining}
          </Text>
        </View>
      )}

      {/* Expired Warning */}
      {expired && (
        <View style={styles.expiredBox}>
          <Ionicons name="alert-circle" size={20} color="#FF3B30" />
          <Text style={styles.expiredBoxText}>
            This code has expired. Create a new one to receive payment.
          </Text>
        </View>
      )}

      {/* Cancel Button */}
      {!expired && (
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel Request</Text>
        </TouchableOpacity>
      )}

      {/* Info */}
      <Text style={styles.infoText}>
        💡 Share this code with someone who wants to pay you. They can pay from any supported network.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  codeCard: {
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 16,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  codeContainer: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 6,
    marginBottom: 24,
  },
  code: {
    fontSize: 28,
    fontWeight: '500',
    letterSpacing: 4,
    fontFamily: 'monospace',
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 6,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 24,
  },
  actionButton: {
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 11,
    color: '#000',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailsCard: {
    padding: 16,
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  chainValue: {
    textTransform: 'capitalize',
    color: '#007AFF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFF3E0',
    borderRadius: 4,
  },
  statusExpired: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#FF9500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusTextExpired: {
    color: '#FF3B30',
  },
  expiredText: {
    color: '#FF3B30',
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: '#FFF3E0',
    borderRadius: 6,
    marginBottom: 16,
  },
  timerText: {
    flex: 1,
    fontSize: 14,
    color: '#E65100',
    fontWeight: '500',
  },
  expiredBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: '#FFEBEE',
    borderRadius: 6,
    marginBottom: 16,
  },
  expiredBoxText: {
    flex: 1,
    fontSize: 14,
    color: '#C62828',
    lineHeight: 20,
  },
  cancelButton: {
    padding: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF3B30',
    alignItems: 'center',
    marginBottom: 16,
  },
  cancelButtonText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});
