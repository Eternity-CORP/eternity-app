/**
 * Services Index
 * Centralized exports for all services
 */

// API Client
export { apiClient, ApiError, NetworkError, getErrorMessage } from './api-client';

// Balance Service
export {
  getProvider,
  fetchEthBalance,
  fetchAllTokenBalances,
  fetchEthUsdPrice,
  fetchTokenMetadata,
  fetchTokenPrices,
  fetchAllBalances,
  getTokenIconUrl,
  formatTokenBalance,
  calculateTotalUsdValue,
  formatUsdValue,
  type TokenBalance,
} from './balance-service';

// BLIK Service
export { blikSocket, type BlikCallbacks } from './blik-service';

// Contacts Service (account-isolated)
export {
  loadContacts,
  saveContact,
  updateContact,
  touchContact,
  deleteContact,
  findContactByAddress,
  searchContacts,
  clearContacts,
  clearAllContacts,
  type Contact,
} from './contacts-service';

// Notification Service
export {
  isNotificationsAvailable,
  requestNotificationPermissions,
  scheduleLocalNotification,
  sendImmediateNotification,
  cancelNotification,
  cancelAllNotifications,
  getScheduledNotifications,
  getExpoPushToken,
  registerPushToken,
  unregisterPushToken,
  getLastNotificationResponse,
  setBadgeCount,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  sendBlikMatchedNotification,
  sendBlikConfirmedNotification,
  sendSplitRequestNotification,
  sendSplitPaidNotification,
  sendSplitCompleteNotification,
  sendPaymentReminderNotification,
  sendTransactionReceivedNotification,
  type NotificationData,
} from './notification-service';

// Price Chart Service
export {
  fetchPriceChartData,
  fetchPriceChartByContract,
  getCoinGeckoId,
  type PricePoint,
  type PriceChartData,
} from './price-chart-service';

// Scheduled Payment Service
export {
  loadScheduledPayments,
  createScheduledPayment,
  getScheduledPayment,
  updateScheduledPayment,
  cancelScheduledPayment,
  deleteScheduledPayment,
  markPaymentExecuted,
  getPendingPayments,
  getUpcomingPayments,
  getOverduePayments,
  syncScheduledPayments,
  configureNotifications,
  type ScheduledPayment,
  type ScheduledPaymentStatus,
  type RecurringInterval,
  type CreateScheduledPaymentRequest,
  type UpdateScheduledPaymentRequest,
} from './scheduled-payment-service';

// Send Service
export { sendTransaction, type SendTransactionParams } from './send-service';

// Split Bill Service
export {
  createSplitBill,
  getSplitBill,
  getCreatedSplitBills,
  getPendingSplitBills,
  cancelSplitBill,
  markParticipantPaid,
  calculateEqualSplit,
  validateSplitAmounts,
  syncSplitBills,
  type SplitBill,
  type SplitBillStatus,
  type SplitParticipant,
  type ParticipantStatus,
  type CreateSplitBillRequest,
} from './split-bill-service';

// Transaction Service
export {
  fetchTransactionHistory,
  fetchTransactionDetails,
  type Transaction,
  type TransactionDetails,
  type TransactionDirection,
  type TransactionStatus,
} from './transaction-service';

// Transaction Socket Service
export {
  transactionSocket,
  type TransactionStatusUpdate,
} from './transaction-socket';

// Username Service
export {
  lookupUsername,
  getUsernameByAddress,
  checkUsernameAvailable,
  registerUsername,
  updateUsername,
  deleteUsername,
  isValidUsernameFormat,
} from './username-service';

// Wallet Service
export {
  generateWallet,
  importWallet,
  getWalletFromMnemonic,
  saveWallet,
  loadWallet,
  loadAccounts,
  saveAccounts,
  createNewAccount,
  hasWallet,
  clearWallet,
  type WalletData,
} from './wallet-service';

// Network Service (Multi-network support)
export {
  getProvider as getNetworkProvider,
  getTestnetProvider,
  fetchAllNetworkBalances,
  fetchSingleNetworkBalances,
  getTokenBalanceOnNetwork,
  getBestNetworkForToken,
  hasSufficientBalance,
  findNetworksWithSufficientBalance,
  type NetworkTokenBalance,
  type AggregatedTokenBalance,
  type MultiNetworkBalanceResult,
  type AnyNetworkId,
} from './network-service';

// Smart Scanning Service (Tier 2 network detection)
export {
  scanTier2Networks,
  shouldScan,
  getLastScanTimestamp,
  isAlertDismissed,
  isAlertSnoozed,
  dismissAlert,
  snoozeAlert,
  clearAlertStates,
  getSuggestedBridgeDestination,
  getBridgeDestinationInfo,
  type Tier2TokenBalance,
  type ScanResult,
  type AlertState,
} from './smart-scanning-service';

// Error Tracking Service (Sentry)
export {
  initErrorTracking,
  setUserContext,
  clearUserContext,
  captureException,
  captureMessage,
  addBreadcrumb,
  setTag,
  setExtra,
  startTransaction,
  ErrorBoundary,
  withSentry,
  BreadcrumbCategory,
  Sentry,
} from './error-tracking-service';

// Swap Service (DEX Aggregator)
export {
  getTokens,
  getPopularTokens,
  getNativeToken,
  getSwapQuote,
  checkAllowance,
  getApprovalData,
  getLiFiContractAddress,
  executeSwap,
  formatTokenAmount,
  parseTokenAmount,
  isCrossChainSwap,
  getChainName,
  NATIVE_TOKEN_ADDRESS,
  type SwapToken,
  type SwapQuote,
  type SwapRoute,
  type SwapStep,
  type SwapParams,
  type TransactionRequest,
} from './swap-service';

// AI Service (Chat with streaming)
export {
  aiSocket,
  AI_EVENTS,
  type ChatMessage,
  type ToolCall,
  type ToolResult,
  type TransactionPreview,
  type AiSuggestion,
  type AiCallbacks,
  type AiErrorPayload,
  type ChunkPayload,
  type DonePayload,
} from './ai-service';

// Bridge Service (Cross-network bridging)
export {
  getBridgeQuote,
  checkBridgeNeeded,
  checkBridgeCostLevel,
  formatBridgeTime,
  getBridgeNetworkName,
  isBridgeNetworkSupported,
  type BridgeQuote,
  type BridgeRoute,
  type BridgeStep,
  type BridgeCheckResult,
  type BridgeCostLevel,
} from './bridge-service';

// Routing Service (Smart transfer routing)
export {
  calculateTransferRoute,
  getRouteTotalFees,
  getRouteEstimatedTime,
  formatRouteDescription,
  routeRequiresConfirmation,
  type TransferRoute,
  type RoutingResult,
} from './routing-service';

// Preferences Service (Network preferences by address)
export {
  getAddressPreferences,
  getAddressPreferencesWithRetry,
  savePreferences,
  resolvePreferredNetwork,
  POPULAR_TOKENS,
  type NetworkPreferences,
} from './preferences-service';

// Scheduled Transaction Signing Service
export {
  signScheduledTransaction,
  verifySignedTransaction,
  type SignedScheduledPayment,
  type SignScheduledParams,
} from './scheduled-signing';
