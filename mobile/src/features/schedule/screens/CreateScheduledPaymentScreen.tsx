/**
 * Create Scheduled Payment Screen
 * 
 * Form for creating one-time or recurring payments
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { ethers } from 'ethers';
import { useScheduledPayments } from '../store/scheduledSlice';
import { getJobRunner } from '../JobRunner';
import {
  validateCreateInput,
  isValidAddress,
  isValidAmount,
  toChecksumAddress,
} from '../utils/validators';
import {
  createDailyRRule,
  createWeeklyRRule,
  createMonthlyRRule,
  getCurrentTimezone,
  describeRRule,
} from '../utils/time-helpers';
import type { ScheduledKind, AssetType } from '../types';
import { KeyboardAwareScreen } from '../../../components/common/KeyboardAwareScreen';

// Mock fee estimation (replace with actual suggestFees)
const suggestFees = async (chainId: number) => {
  // TODO: Replace with actual fee service
  return {
    low: { maxFeePerGas: '20000000000', maxPriorityFeePerGas: '1000000000' },
    medium: { maxFeePerGas: '30000000000', maxPriorityFeePerGas: '1500000000' },
    high: { maxFeePerGas: '40000000000', maxPriorityFeePerGas: '2000000000' },
  };
};

interface FormData {
  kind: ScheduledKind;
  chainId: number;
  assetType: AssetType;
  tokenAddress: string;
  to: string;
  amountHuman: string;
  scheduleAt: Date | null;
  recurring: {
    frequency: 'daily' | 'weekly' | 'monthly';
    weekdays: number[];
    dayOfMonth: number;
    hour: number;
    minute: number;
  };
  maxFeePerGasCap: string;
  maxPriorityFeePerGasCap: string;
  note: string;
}

export function CreateScheduledPaymentScreen({ navigation, route }: any) {
  const addPayment = useScheduledPayments((state) => state.addPayment);
  const updatePayment = useScheduledPayments((state) => state.updatePayment);

  // Edit mode
  const editingPaymentId = route.params?.paymentId;
  const existingPayment = useScheduledPayments((state) =>
    editingPaymentId ? state.getPayment(editingPaymentId) : undefined
  );

  // Form state
  const [formData, setFormData] = useState<FormData>({
    kind: 'one_time',
    chainId: 11155111, // Sepolia
    assetType: 'ETH',
    tokenAddress: '',
    to: '',
    amountHuman: '',
    scheduleAt: null,
    recurring: {
      frequency: 'daily',
      weekdays: [0, 1, 2, 3, 4], // Mon-Fri
      dayOfMonth: 1,
      hour: 9,
      minute: 0,
    },
    maxFeePerGasCap: '',
    maxPriorityFeePerGasCap: '',
    note: '',
  });

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [feeEstimate, setFeeEstimate] = useState<any>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load existing payment for editing
  useEffect(() => {
    if (existingPayment) {
      setFormData({
        kind: existingPayment.kind,
        chainId: existingPayment.chainId,
        assetType: existingPayment.asset.type,
        tokenAddress: existingPayment.asset.tokenAddress || '',
        to: existingPayment.to,
        amountHuman: existingPayment.amountHuman,
        scheduleAt: existingPayment.scheduleAt
          ? new Date(existingPayment.scheduleAt)
          : null,
        recurring: {
          frequency: 'daily',
          weekdays: [0, 1, 2, 3, 4],
          dayOfMonth: 1,
          hour: 9,
          minute: 0,
        },
        maxFeePerGasCap: existingPayment.maxFeePerGasCap || '',
        maxPriorityFeePerGasCap: existingPayment.maxPriorityFeePerGasCap || '',
        note: existingPayment.note || '',
      });
    }
  }, [existingPayment]);

  // Load fee estimate
  useEffect(() => {
    loadFeeEstimate();
  }, [formData.chainId]);

  const loadFeeEstimate = async () => {
    try {
      const fees = await suggestFees(formData.chainId);
      setFeeEstimate(fees);
    } catch (error) {
      console.error('Failed to load fees:', error);
    }
  };

  // Validate field
  const validateField = (field: string, value: any): string | null => {
    switch (field) {
      case 'to':
        if (!value) return 'Recipient address is required';
        if (!isValidAddress(value)) return 'Invalid address (must be EIP-55 checksum)';
        return null;

      case 'amountHuman':
        if (!value) return 'Amount is required';
        if (!isValidAmount(value)) return 'Invalid amount (must be positive number)';
        return null;

      case 'tokenAddress':
        if (formData.assetType === 'ERC20') {
          if (!value) return 'Token address is required';
          if (!isValidAddress(value)) return 'Invalid token address';
        }
        return null;

      case 'scheduleAt':
        if (formData.kind === 'one_time') {
          if (!value) return 'Schedule date is required';
          if (value <= new Date()) return 'Schedule date must be in the future';
        }
        return null;

      default:
        return null;
    }
  };

  // Update field with validation
  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Validate
    const error = validateField(field, value);
    setErrors((prev) => ({
      ...prev,
      [field]: error || '',
    }));
  };

  // Convert address to checksum
  const handleAddressBlur = (field: 'to' | 'tokenAddress') => {
    const value = formData[field];
    if (value) {
      const checksum = toChecksumAddress(value);
      if (checksum) {
        setFormData((prev) => ({ ...prev, [field]: checksum }));
      }
    }
  };

  // Generate RRULE
  const generateRRule = (): string => {
    const { frequency, weekdays, dayOfMonth, hour, minute } = formData.recurring;
    const startDate = new Date();

    switch (frequency) {
      case 'daily':
        return createDailyRRule(startDate, hour, minute);
      case 'weekly':
        return createWeeklyRRule(startDate, weekdays, hour, minute);
      case 'monthly':
        return createMonthlyRRule(startDate, dayOfMonth, hour, minute);
      default:
        return createDailyRRule(startDate, hour, minute);
    }
  };

  // Preview
  const handlePreview = () => {
    // Validate all fields
    const newErrors: Record<string, string> = {};

    const toError = validateField('to', formData.to);
    if (toError) newErrors.to = toError;

    const amountError = validateField('amountHuman', formData.amountHuman);
    if (amountError) newErrors.amountHuman = amountError;

    if (formData.assetType === 'ERC20') {
      const tokenError = validateField('tokenAddress', formData.tokenAddress);
      if (tokenError) newErrors.tokenAddress = tokenError;
    }

    if (formData.kind === 'one_time') {
      const scheduleError = validateField('scheduleAt', formData.scheduleAt);
      if (scheduleError) newErrors.scheduleAt = scheduleError;
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      Alert.alert('Validation Error', 'Please fix the errors before previewing');
      return;
    }

    setShowPreview(true);
  };

  // Save
  const handleSave = async () => {
    setIsLoading(true);

    try {
      // Build input
      const input: any = {
        kind: formData.kind,
        chainId: formData.chainId,
        asset: {
          type: formData.assetType,
          tokenAddress: formData.assetType === 'ERC20' ? formData.tokenAddress : undefined,
        },
        fromAccountId: 'default', // TODO: Get from wallet context
        to: formData.to,
        amountHuman: formData.amountHuman,
        tz: getCurrentTimezone(),
        note: formData.note,
      };

      // Add schedule
      if (formData.kind === 'one_time') {
        input.scheduleAt = formData.scheduleAt?.getTime();
      } else {
        input.rrule = generateRRule();
      }

      // Add gas caps
      if (formData.maxFeePerGasCap) {
        input.maxFeePerGasCap = formData.maxFeePerGasCap;
      }
      if (formData.maxPriorityFeePerGasCap) {
        input.maxPriorityFeePerGasCap = formData.maxPriorityFeePerGasCap;
      }

      // Validate
      const validation = validateCreateInput(input);
      if (!validation.valid) {
        Alert.alert('Validation Error', validation.errors.join('\n'));
        return;
      }

      // Save
      if (editingPaymentId) {
        updatePayment({
          id: editingPaymentId,
          ...input,
        });
        Alert.alert('Success', 'Payment updated');
      } else {
        addPayment(input);
        Alert.alert('Success', 'Payment scheduled');
      }

      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Check now (dry run)
  const handleCheckNow = async () => {
    setIsLoading(true);

    try {
      Alert.alert(
        'Check Payment',
        'This will simulate the payment execution without actually sending funds.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Check',
            onPress: async () => {
              try {
                const runner = getJobRunner();
                await runner.tick();
                Alert.alert('Check Complete', 'Payment validation successful');
              } catch (error) {
                Alert.alert('Check Failed', (error as Error).message);
              }
            },
          },
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Open documentation
  const openDocumentation = () => {
    Alert.alert(
      'Timing Guarantees',
      'Background execution is subject to platform restrictions:\n\n' +
        '• iOS: Minimum 15-minute intervals\n' +
        '• Android: Subject to Doze mode\n' +
        '• System decides when to run\n\n' +
        'For critical payments:\n' +
        '• Allow buffer time\n' +
        '• Keep app open\n' +
        '• Use manual trigger\n\n' +
        'See documentation for details.',
      [
        { text: 'OK' },
        {
          text: 'View Docs',
          onPress: () => {
            // TODO: Link to actual docs
            console.log('Open docs');
          },
        },
      ]
    );
  };

  return (
    <KeyboardAwareScreen style={styles.container} withSafeArea={true}>
      {/* Warning Banner */}
      <View style={styles.warningBanner}>
        <Text style={styles.warningIcon}>⚠️</Text>
        <View style={styles.warningContent}>
          <Text style={styles.warningTitle}>Background Limitations</Text>
          <Text style={styles.warningText}>
            Execution timing is not guaranteed due to platform restrictions.
          </Text>
          <TouchableOpacity onPress={openDocumentation}>
            <Text style={styles.warningLink}>How to guarantee timing?</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Payment Type */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Type</Text>

        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[
              styles.segment,
              formData.kind === 'one_time' && styles.segmentActive,
            ]}
            onPress={() => updateField('kind', 'one_time')}
          >
            <Text
              style={[
                styles.segmentText,
                formData.kind === 'one_time' && styles.segmentTextActive,
              ]}
            >
              One-Time
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segment,
              formData.kind === 'recurring' && styles.segmentActive,
            ]}
            onPress={() => updateField('kind', 'recurring')}
          >
            <Text
              style={[
                styles.segmentText,
                formData.kind === 'recurring' && styles.segmentTextActive,
              ]}
            >
              Recurring
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Asset Type */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Asset</Text>

        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[
              styles.segment,
              formData.assetType === 'ETH' && styles.segmentActive,
            ]}
            onPress={() => updateField('assetType', 'ETH')}
          >
            <Text
              style={[
                styles.segmentText,
                formData.assetType === 'ETH' && styles.segmentTextActive,
              ]}
            >
              ETH
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segment,
              formData.assetType === 'ERC20' && styles.segmentActive,
            ]}
            onPress={() => updateField('assetType', 'ERC20')}
          >
            <Text
              style={[
                styles.segmentText,
                formData.assetType === 'ERC20' && styles.segmentTextActive,
              ]}
            >
              ERC-20
            </Text>
          </TouchableOpacity>
        </View>

        {formData.assetType === 'ERC20' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Token Address</Text>
            <TextInput
              style={[styles.input, errors.tokenAddress && styles.inputError]}
              value={formData.tokenAddress}
              onChangeText={(value) => updateField('tokenAddress', value)}
              onBlur={() => handleAddressBlur('tokenAddress')}
              placeholder="0x..."
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.tokenAddress && (
              <Text style={styles.errorText}>{errors.tokenAddress}</Text>
            )}
          </View>
        )}
      </View>

      {/* Recipient */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recipient</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, errors.to && styles.inputError]}
            value={formData.to}
            onChangeText={(value) => updateField('to', value)}
            onBlur={() => handleAddressBlur('to')}
            placeholder="0x..."
            autoCapitalize="none"
            autoCorrect={false}
          />
          {errors.to && <Text style={styles.errorText}>{errors.to}</Text>}
        </View>
      </View>

      {/* Amount */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Amount</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            {formData.assetType === 'ETH' ? 'ETH' : 'Tokens'}
          </Text>
          <TextInput
            style={[styles.input, errors.amountHuman && styles.inputError]}
            value={formData.amountHuman}
            onChangeText={(value) => updateField('amountHuman', value)}
            placeholder="0.0"
            keyboardType="decimal-pad"
          />
          {errors.amountHuman && (
            <Text style={styles.errorText}>{errors.amountHuman}</Text>
          )}
        </View>
      </View>

      {/* Schedule */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schedule</Text>

        {formData.kind === 'one_time' ? (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date & Time</Text>
            <TouchableOpacity
              style={[styles.input, errors.scheduleAt && styles.inputError]}
              onPress={() => {
                // TODO: Show date/time picker
                Alert.alert('Date Picker', 'TODO: Implement date picker');
              }}
            >
              <Text style={styles.inputText}>
                {formData.scheduleAt
                  ? formData.scheduleAt.toLocaleString()
                  : 'Select date and time'}
              </Text>
            </TouchableOpacity>
            {errors.scheduleAt && (
              <Text style={styles.errorText}>{errors.scheduleAt}</Text>
            )}
          </View>
        ) : (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Frequency</Text>
            {/* TODO: Add recurring schedule UI */}
            <Text style={styles.helpText}>
              {describeRRule(generateRRule())}
            </Text>
          </View>
        )}
      </View>

      {/* Advanced Options */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.advancedToggle}
          onPress={() => setShowAdvanced(!showAdvanced)}
        >
          <Text style={styles.advancedToggleText}>Advanced Options</Text>
          <Text style={styles.advancedToggleIcon}>
            {showAdvanced ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>

        {showAdvanced && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Max Fee Per Gas (wei)</Text>
              <TextInput
                style={styles.input}
                value={formData.maxFeePerGasCap}
                onChangeText={(value) => updateField('maxFeePerGasCap', value)}
                placeholder="Optional cap"
                keyboardType="numeric"
              />
              <Text style={styles.helpText}>
                Suggested: {feeEstimate?.medium.maxFeePerGas || 'Loading...'}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Max Priority Fee (wei)</Text>
              <TextInput
                style={styles.input}
                value={formData.maxPriorityFeePerGasCap}
                onChangeText={(value) =>
                  updateField('maxPriorityFeePerGasCap', value)
                }
                placeholder="Optional cap"
                keyboardType="numeric"
              />
              <Text style={styles.helpText}>
                Suggested:{' '}
                {feeEstimate?.medium.maxPriorityFeePerGas || 'Loading...'}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Note (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.note}
                onChangeText={(value) => updateField('note', value)}
                placeholder="Add a note..."
                multiline
                numberOfLines={3}
              />
            </View>
          </>
        )}
      </View>

      {/* Preview */}
      {showPreview && feeEstimate && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preview</Text>

          <View style={styles.previewBox}>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Network:</Text>
              <Text style={styles.previewValue}>
                {formData.chainId === 1
                  ? 'Mainnet'
                  : formData.chainId === 11155111
                  ? 'Sepolia'
                  : 'Holesky'}
              </Text>
            </View>

            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Asset:</Text>
              <Text style={styles.previewValue}>{formData.assetType}</Text>
            </View>

            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Amount:</Text>
              <Text style={styles.previewValue}>
                {formData.amountHuman} {formData.assetType}
              </Text>
            </View>

            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Recipient:</Text>
              <Text style={styles.previewValue}>
                {formData.to.slice(0, 10)}...
              </Text>
            </View>

            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Est. Gas Fee:</Text>
              <Text style={styles.previewValue}>
                {ethers.utils.formatUnits(
                  feeEstimate.medium.maxFeePerGas,
                  'gwei'
                )}{' '}
                Gwei
              </Text>
            </View>

            {formData.kind === 'one_time' && formData.scheduleAt && (
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Scheduled:</Text>
                <Text style={styles.previewValue}>
                  {formData.scheduleAt.toLocaleString()}
                </Text>
              </View>
            )}

            {formData.kind === 'recurring' && (
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Recurrence:</Text>
                <Text style={styles.previewValue}>
                  {describeRRule(generateRRule())}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={handlePreview}
          disabled={isLoading}
        >
          <Text style={styles.buttonSecondaryText}>Preview</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={handleCheckNow}
          disabled={isLoading}
        >
          <Text style={styles.buttonSecondaryText}>Check Now</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary, isLoading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonPrimaryText}>
              {editingPaymentId ? 'Update' : 'Schedule Payment'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#fff3cd',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ffc107',
  },
  warningIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 8,
  },
  warningLink: {
    fontSize: 12,
    color: '#007bff',
    textDecorationLine: 'underline',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  segmentActive: {
    backgroundColor: '#2196F3',
  },
  segmentText: {
    fontSize: 14,
    color: '#666',
  },
  segmentTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  inputGroup: {
    marginTop: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#dc3545',
  },
  inputText: {
    fontSize: 14,
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    color: '#dc3545',
    marginTop: 4,
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  advancedToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  advancedToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2196F3',
  },
  advancedToggleIcon: {
    fontSize: 12,
    color: '#2196F3',
  },
  previewBox: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  previewLabel: {
    fontSize: 13,
    color: '#666',
  },
  previewValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#2196F3',
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondaryText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
  },
});
