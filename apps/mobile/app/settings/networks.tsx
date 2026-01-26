/**
 * Network Settings Screen
 * Allows user to configure default receiving network and token-specific overrides
 */

import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createLogger } from '@/src/utils/logger';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { NetworkBadge, NetworkDot } from '@/src/components/NetworkBadge';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import {
  selectDefaultNetwork,
  selectTokenOverrides,
  selectPreferencesLoaded,
  setDefaultNetwork,
  setTokenOverride,
  removeTokenOverride,
  loadPreferencesThunk,
  savePreferencesThunk,
} from '@/src/store/slices/network-preferences-slice';
import { POPULAR_TOKENS } from '@/src/services/preferences-service';
import {
  SUPPORTED_NETWORKS,
  type NetworkId,
} from '@/src/constants/networks';

const logger = createLogger('NetworkSettings');

/** Network option for radio selection */
interface NetworkOption {
  id: NetworkId | null;
  name: string;
  description?: string;
  recommended?: boolean;
}

/** Available network options for default selection */
const NETWORK_OPTIONS: NetworkOption[] = [
  {
    id: null,
    name: 'Any network',
    description: 'Sender chooses the network',
  },
  {
    id: 'base',
    name: 'Base',
    description: 'Lowest fees',
    recommended: true,
  },
  {
    id: 'polygon',
    name: 'Polygon',
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
  },
  {
    id: 'optimism',
    name: 'Optimism',
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    description: 'Highest fees',
  },
];

export default function NetworkSettingsScreen() {
  const dispatch = useAppDispatch();
  const { theme: dynamicTheme } = useTheme();

  // Redux state
  const defaultNetwork = useAppSelector(selectDefaultNetwork);
  const tokenOverrides = useAppSelector(selectTokenOverrides);
  const preferencesLoaded = useAppSelector(selectPreferencesLoaded);

  // Local state for modals
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);

  // Load preferences on mount
  useEffect(() => {
    if (!preferencesLoaded) {
      dispatch(loadPreferencesThunk());
    }
  }, [dispatch, preferencesLoaded]);

  // Handle default network change
  const handleDefaultNetworkChange = useCallback(
    async (networkId: NetworkId | null) => {
      try {
        dispatch(setDefaultNetwork(networkId));
        await dispatch(savePreferencesThunk()).unwrap();
        logger.info('Default network changed', { networkId });
      } catch (error) {
        logger.error('Failed to save default network', { error });
      }
    },
    [dispatch]
  );

  // Handle adding a token override
  const handleAddTokenOverride = useCallback(
    async (symbol: string, networkId: NetworkId) => {
      try {
        dispatch(setTokenOverride({ symbol, networkId }));
        await dispatch(savePreferencesThunk()).unwrap();
        logger.info('Token override added', { symbol, networkId });
      } catch (error) {
        logger.error('Failed to save token override', { error });
      }
    },
    [dispatch]
  );

  // Handle removing a token override
  const handleRemoveTokenOverride = useCallback(
    async (symbol: string) => {
      try {
        dispatch(removeTokenOverride(symbol));
        await dispatch(savePreferencesThunk()).unwrap();
        logger.info('Token override removed', { symbol });
      } catch (error) {
        logger.error('Failed to remove token override', { error });
      }
    },
    [dispatch]
  );

  // Token selection from modal
  const handleTokenSelect = useCallback((symbol: string) => {
    setSelectedToken(symbol);
    setShowTokenModal(false);
    setShowNetworkModal(true);
  }, []);

  // Network selection for token override
  const handleNetworkSelectForToken = useCallback(
    (networkId: NetworkId) => {
      if (selectedToken) {
        handleAddTokenOverride(selectedToken, networkId);
      }
      setShowNetworkModal(false);
      setSelectedToken(null);
    },
    [selectedToken, handleAddTokenOverride]
  );

  // Get tokens that don't have overrides yet
  const availableTokens = POPULAR_TOKENS.filter(
    (symbol) => !tokenOverrides[symbol.toUpperCase()]
  );

  // Convert overrides to array for display
  const overridesList = Object.entries(tokenOverrides).map(
    ([symbol, networkId]) => ({
      symbol,
      networkId,
      networkName: SUPPORTED_NETWORKS[networkId]?.name || networkId,
    })
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Network Preferences" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View style={[styles.infoBanner, { backgroundColor: dynamicTheme.colors.surface, borderColor: dynamicTheme.colors.accent + '30' }]}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={dynamicTheme.colors.accent}
          />
          <Text style={[styles.infoBannerText, { color: dynamicTheme.colors.textSecondary }]}>
            Choose your preferred network for receiving tokens. Senders will see
            your preference and can send on that network without conversion fees.
          </Text>
        </View>

        {/* Default Receiving Network Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: dynamicTheme.colors.textPrimary }]}>Default Receiving Network</Text>
          <Text style={[styles.sectionDesc, { color: dynamicTheme.colors.textSecondary }]}>
            This network will be used for all tokens unless you set specific
            exceptions below.
          </Text>

          <View style={styles.radioGroup}>
            {NETWORK_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id ?? 'any'}
                style={[
                  styles.radioOption,
                  { backgroundColor: dynamicTheme.colors.surface, borderColor: dynamicTheme.colors.border },
                  defaultNetwork === option.id && { borderColor: dynamicTheme.colors.accent, backgroundColor: dynamicTheme.colors.accent + '10' },
                ]}
                onPress={() => handleDefaultNetworkChange(option.id)}
                activeOpacity={0.7}
              >
                <View style={styles.radioLeft}>
                  <View
                    style={[
                      styles.radioCircle,
                      { borderColor: dynamicTheme.colors.textTertiary },
                      defaultNetwork === option.id && { borderColor: dynamicTheme.colors.accent },
                    ]}
                  >
                    {defaultNetwork === option.id && (
                      <View style={[styles.radioCircleInner, { backgroundColor: dynamicTheme.colors.accent }]} />
                    )}
                  </View>
                  <View style={styles.radioTextContainer}>
                    <View style={styles.radioNameRow}>
                      <Text style={[styles.radioName, { color: dynamicTheme.colors.textPrimary }]}>{option.name}</Text>
                      {option.recommended && (
                        <View style={[styles.recommendedBadge, { backgroundColor: dynamicTheme.colors.success + '20' }]}>
                          <Text style={[styles.recommendedText, { color: dynamicTheme.colors.success }]}>Recommended</Text>
                        </View>
                      )}
                    </View>
                    {option.description && (
                      <Text style={[styles.radioDesc, { color: dynamicTheme.colors.textSecondary }]}>{option.description}</Text>
                    )}
                  </View>
                </View>
                {option.id && (
                  <NetworkDot networkId={option.id} size={10} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Token Exceptions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: dynamicTheme.colors.textPrimary }]}>Token Exceptions</Text>
              <Text style={[styles.sectionDesc, { color: dynamicTheme.colors.textSecondary }]}>
                Override the default network for specific tokens.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: dynamicTheme.colors.accent + '15' }]}
              onPress={() => setShowTokenModal(true)}
              disabled={availableTokens.length === 0}
            >
              <Ionicons
                name="add"
                size={20}
                color={
                  availableTokens.length === 0
                    ? dynamicTheme.colors.textTertiary
                    : dynamicTheme.colors.accent
                }
              />
              <Text
                style={[
                  styles.addButtonText,
                  { color: dynamicTheme.colors.accent },
                  availableTokens.length === 0 && { color: dynamicTheme.colors.textTertiary },
                ]}
              >
                Add
              </Text>
            </TouchableOpacity>
          </View>

          {overridesList.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: dynamicTheme.colors.surface, borderColor: dynamicTheme.colors.border }]}>
              <Text style={[styles.emptyStateText, { color: dynamicTheme.colors.textSecondary }]}>
                No exceptions set. All tokens will use your default network
                preference.
              </Text>
            </View>
          ) : (
            <View style={styles.overridesList}>
              {overridesList.map(({ symbol, networkId, networkName }) => (
                <View key={symbol} style={[styles.overrideItem, { backgroundColor: dynamicTheme.colors.surface, borderColor: dynamicTheme.colors.border }]}>
                  <View style={styles.overrideInfo}>
                    <Text style={[styles.overrideToken, { color: dynamicTheme.colors.textPrimary }]}>{symbol}</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={14}
                      color={dynamicTheme.colors.textTertiary}
                      style={styles.overrideArrow}
                    />
                    <NetworkBadge networkId={networkId} size="small" />
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveTokenOverride(symbol)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name="close-circle"
                      size={22}
                      color={dynamicTheme.colors.textTertiary}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Token Selection Modal */}
      <Modal
        visible={showTokenModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTokenModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: dynamicTheme.colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: dynamicTheme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: dynamicTheme.colors.textPrimary }]}>Select Token</Text>
            <TouchableOpacity
              onPress={() => setShowTokenModal(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="close"
                size={24}
                color={dynamicTheme.colors.textPrimary}
              />
            </TouchableOpacity>
          </View>
          <FlatList
            data={availableTokens}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.modalList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.modalItem, { backgroundColor: dynamicTheme.colors.surface }]}
                onPress={() => handleTokenSelect(item)}
              >
                <Text style={[styles.modalItemText, { color: dynamicTheme.colors.textPrimary }]}>{item}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={dynamicTheme.colors.textTertiary}
                />
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Network Selection Modal */}
      <Modal
        visible={showNetworkModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowNetworkModal(false);
          setSelectedToken(null);
        }}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: dynamicTheme.colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: dynamicTheme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: dynamicTheme.colors.textPrimary }]}>
              Select Network for {selectedToken}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowNetworkModal(false);
                setSelectedToken(null);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="close"
                size={24}
                color={dynamicTheme.colors.textPrimary}
              />
            </TouchableOpacity>
          </View>
          <FlatList
            data={Object.values(SUPPORTED_NETWORKS)}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.modalList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.modalItem, { backgroundColor: dynamicTheme.colors.surface }]}
                onPress={() => handleNetworkSelectForToken(item.id)}
              >
                <View style={styles.modalNetworkInfo}>
                  <NetworkDot networkId={item.id} size={10} />
                  <Text style={[styles.modalItemText, { color: dynamicTheme.colors.textPrimary }]}>{item.name}</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={dynamicTheme.colors.textTertiary}
                />
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
  },

  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.accent + '30',
    gap: theme.spacing.md,
  },
  infoBannerText: {
    flex: 1,
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },

  // Section
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  sectionDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },

  // Radio Group
  radioGroup: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  radioOptionSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent + '10',
  },
  radioLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.textTertiary,
    marginRight: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: theme.colors.accent,
  },
  radioCircleInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.accent,
  },
  radioTextContainer: {
    flex: 1,
  },
  radioNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  radioName: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  radioDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  recommendedBadge: {
    backgroundColor: theme.colors.success + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  recommendedText: {
    ...theme.typography.label,
    color: theme.colors.success,
  },

  // Add Button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.accent + '15',
    borderRadius: theme.borderRadius.md,
  },
  addButtonText: {
    ...theme.typography.label,
    color: theme.colors.accent,
  },
  addButtonTextDisabled: {
    color: theme.colors.textTertiary,
  },

  // Empty State
  emptyState: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  emptyStateText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },

  // Overrides List
  overridesList: {
    gap: theme.spacing.sm,
  },
  overrideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  overrideInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overrideToken: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  overrideArrow: {
    marginHorizontal: theme.spacing.md,
  },
  removeButton: {
    padding: theme.spacing.xs,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
  },
  modalList: {
    padding: theme.spacing.lg,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  modalItemText: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  modalNetworkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
});
