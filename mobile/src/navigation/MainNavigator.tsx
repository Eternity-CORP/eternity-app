import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import SendScreen from '../screens/SendScreen';
import UnifiedSendScreen from '../screens/UnifiedSendScreen';
import UnifiedReceiveScreen from '../screens/UnifiedReceiveScreen';
import SendEthScreen from '../features/send/SendEthScreen';
import SendTokenScreen from '../features/send/SendTokenScreen';
import ReceiveScreen from '../screens/ReceiveScreen';
import IncomingTransactionsScreen from '../screens/IncomingTransactionsScreen';
import HistoryScreen from '../features/history/HistoryScreen';
import TransactionHistoryScreen from '../screens/wallet/TransactionHistoryScreen';
import ManageAccountsScreen from '../screens/wallet/ManageAccountsScreen';
import TransactionDetailsScreen from '../screens/TransactionDetailsScreen';
import { Transaction } from '../services/blockchain/etherscanService';
import SettingsScreen from '../screens/SettingsScreen';
import SecuritySettingsScreen from '../screens/SecuritySettingsScreen';
import DevSettingsScreen from '../screens/DevSettingsScreen';
import PrivacyCenterScreen from '../screens/PrivacyCenterScreen';
import SplitBillScreen from '../screens/SplitBillScreen';
import SplitBillHistoryScreen from '../screens/SplitBillHistoryScreen';
import PaySplitBillScreen from '../screens/PaySplitBillScreen';
import PendingPaymentsScreen from '../screens/PendingPaymentsScreen';
import AddMoneyScreen from '../screens/AddMoneyScreen';
import TransakWidgetScreen from '../screens/TransakWidgetScreen';
import SchedulePaymentScreen from '../screens/SchedulePaymentScreen';
import ScheduledPaymentsListScreen from '../screens/ScheduledPaymentsListScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import LanguageSettingsScreen from '../screens/LanguageSettingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProfileManagementScreen from '../screens/ProfileManagementScreen';
import AccountAndProfileScreen from '../screens/AccountAndProfileScreen';
import SendByIdentifierScreen from '../screens/SendByIdentifierScreen';
import CreateBlikCodeScreen from '../screens/CreateBlikCodeScreen';
import BlikCodeDisplayScreen from '../screens/BlikCodeDisplayScreen';
import PayBlikCodeScreen from '../screens/PayBlikCodeScreen';
import CrosschainQuoteScreen from '../screens/CrosschainQuoteScreen';
import CrosschainStatusScreen from '../screens/CrosschainStatusScreen';
import SwapScreen from '../screens/SwapScreen';
import ChatScreen from '../screens/ChatScreen';

export type MainStackParamList = {
  Home: undefined;
  Send: { recipient?: string; amount?: string; token?: string } | undefined;
  SendToken: { tokenAddress?: string } | undefined;
  Receive: undefined;
  IncomingTransactions: undefined;
  ManageAccounts: undefined;
  ManageTokens: undefined;
  ManageNetworks: undefined;
  ManageTokenPreferences: undefined;
  TransactionDetails: { transaction: Transaction };
  TransactionHistory: { address: string };
  Settings: undefined;
  PrivacyCenter: undefined;
  SecuritySettings: undefined;
  DevSettings: undefined;
  NotificationSettings: undefined;
  LanguageSettings: undefined;
  SplitBill: undefined;
  SplitBillHistory: undefined;
  PaySplitBill: { to: string; amount: string; total?: string; participants?: string };
  PendingPayments: undefined;
  AddMoney: undefined;
  TransakWidget: { amount: string; walletAddress: string };
  SchedulePayment: undefined;
  ScheduledPaymentsList: undefined;
  Profile: undefined;
  SendByIdentifier: undefined;
  CreateBlikCode: undefined;
  BlikCodeDisplay: { 
    code: string; 
    amount: string;
    tokenSymbol: string;
    preferredChainId?: string;
    expiresAt: string;
  };
  PayBlikCode: undefined;
  CrosschainQuote: {
    params: {
      fromChainId: string;
      toChainId: string;
      fromToken: string;
      toToken: string;
      amount: string;
      fromAddress: string;
      toAddress: string;
    };
  };
  CrosschainStatus: {
    txHash: string;
    router: string;
    fromChainId: string;
    toChainId: string;
    amount: string;
    fromToken: string;
    toToken: string;
    estimatedOutput: string;
    estimatedDuration: number;
  };
  Swap: { fromToken?: string; toToken?: string; amount?: string } | undefined;
  Chat: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Swap" component={SwapScreen} />
      <Stack.Screen name="Send" component={UnifiedSendScreen} />
      <Stack.Screen name="SendToken" component={SendTokenScreen} />
      <Stack.Screen name="Receive" component={UnifiedReceiveScreen} />
      <Stack.Screen name="IncomingTransactions" component={IncomingTransactionsScreen} />
      <Stack.Screen name="ManageAccounts" component={ManageAccountsScreen} />
      <Stack.Screen name="ManageTokens" component={require('../screens/wallet/ManageTokensScreen').default} />
      <Stack.Screen name="ManageNetworks" component={require('../screens/wallet/ManageNetworksScreen').default} />
      <Stack.Screen name="ManageTokenPreferences" component={require('../screens/wallet/ManageTokenPreferencesScreen').default} />
      <Stack.Screen name="TransactionDetails" component={TransactionDetailsScreen} />
      <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="PrivacyCenter" component={PrivacyCenterScreen} />
      <Stack.Screen name="SecuritySettings" component={SecuritySettingsScreen} />
      <Stack.Screen name="DevSettings" component={DevSettingsScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <Stack.Screen name="LanguageSettings" component={LanguageSettingsScreen} />
      <Stack.Screen name="SplitBill" component={SplitBillScreen} />
      <Stack.Screen name="SplitBillHistory" component={SplitBillHistoryScreen} />
      <Stack.Screen name="PaySplitBill" component={PaySplitBillScreen} />
      <Stack.Screen name="PendingPayments" component={PendingPaymentsScreen} />
      <Stack.Screen name="AddMoney" component={AddMoneyScreen} />
      <Stack.Screen name="TransakWidget" component={TransakWidgetScreen} />
      <Stack.Screen name="SchedulePayment" component={SchedulePaymentScreen} />
      <Stack.Screen name="ScheduledPaymentsList" component={ScheduledPaymentsListScreen} />
      <Stack.Screen name="Profile" component={ProfileManagementScreen} />
      <Stack.Screen name="SendByIdentifier" component={SendByIdentifierScreen} />
      <Stack.Screen name="CreateBlikCode" component={CreateBlikCodeScreen} />
      <Stack.Screen name="BlikCodeDisplay" component={BlikCodeDisplayScreen} />
      <Stack.Screen name="PayBlikCode" component={PayBlikCodeScreen} />
      <Stack.Screen name="CrosschainQuote" component={CrosschainQuoteScreen} />
      <Stack.Screen name="CrosschainStatus" component={CrosschainStatusScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}
