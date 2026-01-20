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
  fetchAllNetworkBalances,
  fetchSingleNetworkBalances,
  getTokenBalanceOnNetwork,
  getBestNetworkForToken,
  hasSufficientBalance,
  findNetworksWithSufficientBalance,
  type NetworkTokenBalance,
  type AggregatedTokenBalance,
  type MultiNetworkBalanceResult,
} from './network-service';

// Preferences Service
export {
  loadNetworkPreferences,
  saveNetworkPreferences,
  clearNetworkPreferences,
  getTokenPreference,
  setTokenPreference,
} from './preferences-service';
