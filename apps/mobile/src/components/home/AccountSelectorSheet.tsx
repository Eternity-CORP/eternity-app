import { View, TouchableOpacity, Text, TextInput, StyleSheet, Animated, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { AccountTypeBadge } from '@/src/components/AccountTypeBadge';
import { generateAvatarColors } from '@/src/utils/avatar';
import { formatUsdValue } from '@/src/services/balance-service';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import type { Account, AccountType } from '@/src/store/slices/wallet-slice';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AccountSelectorSheetProps {
  visible: boolean;
  accounts: Account[];
  currentAccountIndex: number;
  accountBalances: Record<string, number>;
  accountUsernames: Record<string, string | null>;
  isEditMode: boolean;
  editingAccountIndex: number | null;
  editLabel: string;
  isAddingAccount: boolean;
  showAddWalletMenu: boolean;
  showImportSheet: boolean;
  seedPhraseInput: string;
  newAccountName: string;
  slideAnim: Animated.Value;
  fadeAnim: Animated.Value;
  onClose: () => void;
  onToggleEditMode: () => void;
  onSwitchAccount: (address: string) => void;
  onReorderAccounts: (data: Account[]) => void;
  onStartEditing: (accountIndex: number, currentLabel: string) => void;
  onEditLabelChange: (text: string) => void;
  onSaveLabel: (accountIndex: number) => void;
  onCancelEdit: () => void;
  onShowAddWalletMenu: () => void;
  onHideAddWalletMenu: () => void;
  onNewAccountNameChange: (text: string) => void;
  onAddAccount: (type: AccountType) => void;
  onShowImportSheet: () => void;
  onHideImportSheet: () => void;
  onSeedPhraseChange: (text: string) => void;
  onImportWallet: () => void;
}

export function AccountSelectorSheet({
  visible,
  accounts,
  currentAccountIndex,
  accountBalances,
  accountUsernames,
  isEditMode,
  editingAccountIndex,
  editLabel,
  isAddingAccount,
  showAddWalletMenu,
  showImportSheet,
  seedPhraseInput,
  newAccountName,
  slideAnim,
  fadeAnim,
  onClose,
  onToggleEditMode,
  onSwitchAccount,
  onReorderAccounts,
  onStartEditing,
  onEditLabelChange,
  onSaveLabel,
  onCancelEdit,
  onShowAddWalletMenu,
  onHideAddWalletMenu,
  onNewAccountNameChange,
  onAddAccount,
  onShowImportSheet,
  onHideImportSheet,
  onSeedPhraseChange,
  onImportWallet,
}: AccountSelectorSheetProps) {
  const { theme: dynamicTheme, isDark } = useTheme();

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.blurOverlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose}>
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint={isDark ? 'dark' : 'light'} />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        style={[
          styles.accountSheet,
          { backgroundColor: dynamicTheme.colors.surface, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={[styles.sheetHandle, { backgroundColor: dynamicTheme.colors.borderLight }]} />

        {/* Header */}
        <View style={[styles.accountSheetHeader, { borderBottomColor: dynamicTheme.colors.border }]}>
          <TouchableOpacity
            style={[styles.editModeButton, { backgroundColor: dynamicTheme.colors.background }]}
            onPress={onToggleEditMode}
          >
            <Text style={[styles.editModeText, { color: dynamicTheme.colors.textPrimary }, isEditMode && { color: dynamicTheme.colors.accent }]}>
              {isEditMode ? 'Done' : 'Edit'}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.accountSheetTitle, { color: dynamicTheme.colors.textPrimary }]}>Wallets list</Text>

          <TouchableOpacity
            style={[styles.closeSheetButton, { backgroundColor: dynamicTheme.colors.background }]}
            onPress={onClose}
          >
            <FontAwesome name="times" size={18} color={dynamicTheme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Import Sheet */}
        {showImportSheet ? (
          <View style={styles.importSheet}>
            <Text style={[styles.importTitle, { color: dynamicTheme.colors.textPrimary }]}>Import Wallet</Text>
            <Text style={[styles.importSubtitle, { color: dynamicTheme.colors.textSecondary }]}>
              Enter your 12 or 24 word recovery phrase
            </Text>
            <TextInput
              style={[styles.seedInput, { backgroundColor: dynamicTheme.colors.background, color: dynamicTheme.colors.textPrimary, borderColor: dynamicTheme.colors.border }]}
              value={seedPhraseInput}
              onChangeText={onSeedPhraseChange}
              placeholder="Enter seed phrase..."
              placeholderTextColor={dynamicTheme.colors.textTertiary}
              multiline
              numberOfLines={4}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.importActions}>
              <TouchableOpacity
                style={[styles.importCancelButton, { backgroundColor: dynamicTheme.colors.background }]}
                onPress={onHideImportSheet}
              >
                <Text style={[styles.importCancelText, { color: dynamicTheme.colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.importConfirmButton, { backgroundColor: dynamicTheme.colors.buttonPrimary }, isAddingAccount && { opacity: 0.5 }]}
                onPress={onImportWallet}
                disabled={isAddingAccount}
              >
                <Text style={[styles.importConfirmText, { color: dynamicTheme.colors.buttonPrimaryText }]}>
                  {isAddingAccount ? 'Importing...' : 'Import'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : showAddWalletMenu ? (
          /* Add Wallet Menu */
          <View style={styles.addWalletMenu}>
            <Text style={[styles.addWalletTitle, { color: dynamicTheme.colors.textPrimary }]}>Add Wallet</Text>

            <TextInput
              style={[styles.newAccountInput, { backgroundColor: dynamicTheme.colors.background, color: dynamicTheme.colors.textPrimary, borderColor: dynamicTheme.colors.border }]}
              value={newAccountName}
              onChangeText={onNewAccountNameChange}
              placeholder="Wallet name (optional)"
              placeholderTextColor={dynamicTheme.colors.textTertiary}
            />

            <TouchableOpacity
              style={[styles.addWalletOption, { backgroundColor: dynamicTheme.colors.background, borderColor: '#10B981', borderWidth: 1 }]}
              onPress={() => onAddAccount('real')}
              disabled={isAddingAccount}
            >
              <View style={[styles.addWalletIcon, { backgroundColor: '#10B981' + '20' }]}>
                <FontAwesome name="diamond" size={18} color="#10B981" />
              </View>
              <View style={styles.addWalletOptionInfo}>
                <Text style={[styles.addWalletOptionTitle, { color: dynamicTheme.colors.textPrimary }]}>New Wallet</Text>
                <Text style={[styles.addWalletOptionDesc, { color: dynamicTheme.colors.textTertiary }]}>Create a real mainnet wallet</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addWalletOption, { backgroundColor: dynamicTheme.colors.background, borderColor: '#F59E0B', borderWidth: 1 }]}
              onPress={() => onAddAccount('test')}
              disabled={isAddingAccount}
            >
              <View style={[styles.addWalletIcon, { backgroundColor: '#F59E0B' + '20' }]}>
                <FontAwesome name="flask" size={18} color="#F59E0B" />
              </View>
              <View style={styles.addWalletOptionInfo}>
                <Text style={[styles.addWalletOptionTitle, { color: dynamicTheme.colors.textPrimary }]}>New Test Wallet</Text>
                <Text style={[styles.addWalletOptionDesc, { color: dynamicTheme.colors.textTertiary }]}>For testing with free tokens</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addWalletOption, { backgroundColor: dynamicTheme.colors.background, borderColor: '#3388FF', borderWidth: 1 }]}
              onPress={() => {
                onHideAddWalletMenu();
                onClose();
                router.push('/business/create');
              }}
            >
              <View style={[styles.addWalletIcon, { backgroundColor: '#3388FF' + '20' }]}>
                <FontAwesome name="building" size={18} color="#3388FF" />
              </View>
              <View style={styles.addWalletOptionInfo}>
                <Text style={[styles.addWalletOptionTitle, { color: dynamicTheme.colors.textPrimary }]}>New Business Wallet</Text>
                <Text style={[styles.addWalletOptionDesc, { color: dynamicTheme.colors.textTertiary }]}>Tokenized equity shares</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addWalletOption, { backgroundColor: dynamicTheme.colors.background }]}
              onPress={onShowImportSheet}
            >
              <View style={[styles.addWalletIcon, { backgroundColor: '#8B5CF6' + '20' }]}>
                <FontAwesome name="download" size={18} color="#8B5CF6" />
              </View>
              <View style={styles.addWalletOptionInfo}>
                <Text style={[styles.addWalletOptionTitle, { color: dynamicTheme.colors.textPrimary }]}>Existing Wallet</Text>
                <Text style={[styles.addWalletOptionDesc, { color: dynamicTheme.colors.textTertiary }]}>Import using recovery phrase</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addWalletCancelButton}
              onPress={onHideAddWalletMenu}
            >
              <Text style={[styles.addWalletCancelText, { color: dynamicTheme.colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Accounts List */
          <>
            <View style={styles.accountsListContainer}>
              <DraggableFlatList
                data={accounts}
                keyExtractor={(item) => item.id}
                onDragEnd={({ data }) => onReorderAccounts(data)}
                contentContainerStyle={styles.accountsScrollContent}
                renderItem={({ item: account, drag, isActive }: RenderItemParams<Account>) => {
                  const [color1, color2] = generateAvatarColors(account.address);
                  const accountIndex = accounts.findIndex(a => a.id === account.id);
                  const isSelected = accountIndex === currentAccountIndex;
                  const isBusiness = account.type === 'business';
                  const accountBalance = formatUsdValue(accountBalances[account.address] ?? 0);

                  if (editingAccountIndex === account.accountIndex) {
                    return (
                      <View style={[styles.editAccountContainer, { backgroundColor: dynamicTheme.colors.background }]}>
                        <TextInput
                          style={[styles.editAccountInput, { backgroundColor: dynamicTheme.colors.surface, color: dynamicTheme.colors.textPrimary, borderColor: dynamicTheme.colors.border }]}
                          value={editLabel}
                          onChangeText={onEditLabelChange}
                          placeholder="Account name"
                          placeholderTextColor={dynamicTheme.colors.textTertiary}
                          autoFocus
                        />
                        <View style={styles.editAccountActions}>
                          <TouchableOpacity style={styles.editAccountCancel} onPress={onCancelEdit}>
                            <Text style={[styles.editAccountCancelText, { color: dynamicTheme.colors.textSecondary }]}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.editAccountSave, { backgroundColor: dynamicTheme.colors.buttonPrimary }]}
                            onPress={() => onSaveLabel(account.accountIndex)}
                          >
                            <Text style={[styles.editAccountSaveText, { color: dynamicTheme.colors.buttonPrimaryText }]}>Save</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  }

                  return (
                    <ScaleDecorator>
                      <TouchableOpacity
                        style={[
                          styles.accountListItem,
                          { backgroundColor: dynamicTheme.colors.background },
                          isActive && [styles.accountListItemDragging, { backgroundColor: dynamicTheme.colors.surfaceElevated }],
                        ]}
                        onPress={() => {
                          if (isEditMode) {
                            onStartEditing(account.accountIndex, account.label || '');
                          } else if (isBusiness && account.businessId) {
                            onClose();
                            router.push(`/business/${account.businessId}`);
                          } else {
                            onSwitchAccount(account.address);
                          }
                        }}
                        activeOpacity={0.7}
                        disabled={isActive}
                      >
                        {isEditMode && (
                          <TouchableOpacity
                            onLongPress={drag}
                            delayLongPress={100}
                            style={styles.dragHandle}
                          >
                            <FontAwesome name="bars" size={16} color={dynamicTheme.colors.textTertiary} />
                          </TouchableOpacity>
                        )}

                        <LinearGradient
                          colors={[color1, color2]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.accountAvatar}
                        />

                        <View style={styles.accountListInfo}>
                          <View style={styles.accountNameRow}>
                            <Text style={[styles.accountListName, { color: dynamicTheme.colors.textPrimary }]}>
                              {account.label || `Account ${account.accountIndex + 1}`}
                            </Text>
                            <AccountTypeBadge type={account.type} size="small" />
                          </View>
                          {accountUsernames[account.address] && (
                            <Text style={[theme.typography.caption, { color: dynamicTheme.colors.success, marginTop: 2 }]}>
                              @{accountUsernames[account.address]}
                            </Text>
                          )}
                          <Text style={[styles.accountListBalance, { color: dynamicTheme.colors.textTertiary }]}>{accountBalance}</Text>
                        </View>

                        {isEditMode ? (
                          <FontAwesome name="pencil" size={16} color={dynamicTheme.colors.textTertiary} />
                        ) : isSelected ? (
                          <FontAwesome name="check" size={18} color={dynamicTheme.colors.accent} />
                        ) : null}
                      </TouchableOpacity>
                    </ScaleDecorator>
                  );
                }}
              />
            </View>

            <TouchableOpacity
              style={[styles.addWalletButton, { backgroundColor: dynamicTheme.colors.background, borderColor: dynamicTheme.colors.borderLight }]}
              onPress={onShowAddWalletMenu}
            >
              <Text style={[styles.addWalletButtonText, { color: dynamicTheme.colors.textPrimary }]}>Add Wallet</Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  accountSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl + 20,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: theme.spacing.lg,
  },
  accountSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  editModeButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },
  editModeText: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  accountSheetTitle: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    fontSize: 18,
  },
  closeSheetButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountsListContainer: {
    maxHeight: SCREEN_HEIGHT * 0.4,
  },
  accountsScrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  accountListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  accountListItemDragging: {
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dragHandle: {
    padding: theme.spacing.sm,
    marginLeft: -theme.spacing.xs,
  },
  accountAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountListInfo: {
    flex: 1,
    gap: 2,
  },
  accountNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  accountListName: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  accountListBalance: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
  editAccountContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  editAccountInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  editAccountActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.md,
  },
  editAccountCancel: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  editAccountCancelText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  editAccountSave: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
  },
  editAccountSaveText: {
    ...theme.typography.body,
    color: theme.colors.buttonPrimaryText,
    fontWeight: '600',
  },
  addWalletButton: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  addWalletButtonText: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  addWalletMenu: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  addWalletTitle: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  newAccountInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  addWalletOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  addWalletIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addWalletOptionInfo: {
    flex: 1,
  },
  addWalletOptionTitle: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  addWalletOptionDesc: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
  addWalletCancelButton: {
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  addWalletCancelText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  importSheet: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  importTitle: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  importSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  seedInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  importActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  importCancelButton: {
    flex: 1,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },
  importCancelText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  importConfirmButton: {
    flex: 1,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
  },
  importConfirmText: {
    ...theme.typography.body,
    color: theme.colors.buttonPrimaryText,
    fontWeight: '600',
  },
});
