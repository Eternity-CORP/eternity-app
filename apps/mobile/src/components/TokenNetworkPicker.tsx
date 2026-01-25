/**
 * TokenNetworkPicker Component
 * Allows user to select preferred network for a specific token
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { theme } from '@/src/constants/theme';
import { NetworkId, SUPPORTED_NETWORKS, getNetworkConfig } from '@/src/constants/networks';
import { TokenIcon } from './TokenIcon';
import { NetworkDot } from './NetworkBadge';

export interface TokenNetworkPickerProps {
  /** Token symbol (e.g., "USDC") */
  symbol: string;
  /** Token name (e.g., "USD Coin") */
  name: string;
  /** Token icon URL */
  iconUrl?: string;
  /** Currently selected network, null means "Any network" */
  selectedNetwork: NetworkId | null;
  /** Networks where user has this token */
  availableNetworks: NetworkId[];
  /** Callback when network is selected */
  onSelect: (networkId: NetworkId | null) => void;
}

export function TokenNetworkPicker({
  symbol,
  name,
  iconUrl,
  selectedNetwork,
  availableNetworks,
  onSelect,
}: TokenNetworkPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const handleOpen = useCallback(() => {
    setModalVisible(true);
  }, []);

  const handleClose = useCallback(() => {
    setModalVisible(false);
  }, []);

  const handleSelect = useCallback(
    (networkId: NetworkId | null) => {
      onSelect(networkId);
      setModalVisible(false);
    },
    [onSelect]
  );

  // Get display text for current selection
  const getSelectionText = (): string => {
    if (selectedNetwork === null) {
      return 'Any network';
    }
    const network = SUPPORTED_NETWORKS[selectedNetwork];
    return network?.name || selectedNetwork;
  };

  return (
    <>
      {/* Main Picker Row */}
      <TouchableOpacity
        style={styles.container}
        onPress={handleOpen}
        activeOpacity={0.7}
      >
        {/* Token Info */}
        <View style={styles.tokenInfo}>
          <TokenIcon symbol={symbol} iconUrl={iconUrl} size={40} />
          <View style={styles.tokenText}>
            <Text style={styles.tokenSymbol}>{symbol}</Text>
            <Text style={styles.tokenName} numberOfLines={1}>
              {name}
            </Text>
          </View>
        </View>

        {/* Current Selection */}
        <View style={styles.selectionContainer}>
          {selectedNetwork ? (
            <NetworkDot networkId={selectedNetwork} size={8} style={styles.networkDot} />
          ) : (
            <FontAwesome
              name="globe"
              size={14}
              color={theme.colors.textSecondary}
              style={styles.globeIcon}
            />
          )}
          <Text style={styles.selectionText}>{getSelectionText()}</Text>
          <FontAwesome
            name="chevron-right"
            size={12}
            color={theme.colors.textTertiary}
          />
        </View>
      </TouchableOpacity>

      {/* Network Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
      >
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.handle} />
              <Text style={styles.modalTitle}>Select Network for {symbol}</Text>
              <Text style={styles.modalSubtitle}>
                Choose where you prefer to receive this token
              </Text>
            </View>

            {/* Network Options */}
            <ScrollView
              style={styles.optionsList}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* Any Network Option */}
              <TouchableOpacity
                style={[
                  styles.optionItem,
                  selectedNetwork === null && styles.optionItemSelected,
                ]}
                onPress={() => handleSelect(null)}
                activeOpacity={0.7}
              >
                <View style={styles.optionIcon}>
                  <FontAwesome
                    name="globe"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionName}>Any network</Text>
                  <Text style={styles.optionDescription}>
                    Receive on sender's network (no conversion fees)
                  </Text>
                </View>
                {selectedNetwork === null && (
                  <FontAwesome
                    name="check"
                    size={18}
                    color={theme.colors.accent}
                  />
                )}
              </TouchableOpacity>

              {/* Available Networks */}
              {availableNetworks.map((networkId) => {
                const network = SUPPORTED_NETWORKS[networkId];
                if (!network) return null;

                const isSelected = selectedNetwork === networkId;

                return (
                  <TouchableOpacity
                    key={networkId}
                    style={[
                      styles.optionItem,
                      isSelected && styles.optionItemSelected,
                    ]}
                    onPress={() => handleSelect(networkId)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.optionIcon,
                        { backgroundColor: network.color + '20' },
                      ]}
                    >
                      <NetworkDot networkId={networkId} size={12} />
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={styles.optionName}>{network.name}</Text>
                    </View>
                    {isSelected && (
                      <FontAwesome
                        name="check"
                        size={18}
                        color={theme.colors.accent}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Main Picker Row
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  tokenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.md,
  },
  tokenText: {
    flex: 1,
  },
  tokenSymbol: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  tokenName: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  selectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  networkDot: {
    marginRight: 2,
  },
  globeIcon: {
    marginRight: 2,
  },
  selectionText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: theme.colors.surfaceElevated,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingBottom: theme.spacing.xxl,
    maxHeight: '70%',
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderLight,
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  modalSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },

  // Options List
  optionsList: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  optionItemSelected: {
    borderWidth: 1,
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent + '10',
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionName: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  optionDescription: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },

  // Cancel Button
  cancelButton: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});
