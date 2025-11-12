import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';

type Props = NativeStackScreenProps<any, 'TransakWidget'>;

// ВАЖНО: Замените на ваш реальный API Key от Transak
// Получите его на: https://transak.com/
const TRANSAK_API_KEY = 'YOUR_TRANSAK_API_KEY'; // TODO: Replace with real key
const TRANSAK_ENVIRONMENT = 'STAGING'; // Use 'PRODUCTION' for live

export default function TransakWidgetScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const webViewRef = useRef<WebView>(null);

  const { amount, walletAddress } = route.params as {
    amount: string;
    walletAddress: string;
  };

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Build Transak URL with parameters
  const getTransakUrl = () => {
    const params = new URLSearchParams({
      apiKey: TRANSAK_API_KEY,
      environment: TRANSAK_ENVIRONMENT,
      defaultCryptoCurrency: 'USDC',
      cryptoCurrencyList: 'USDC,ETH,USDT',
      defaultFiatAmount: amount,
      fiatAmount: amount,
      defaultFiatCurrency: 'USD',
      walletAddress: walletAddress,
      disableWalletAddressForm: 'true',
      themeColor: theme.colors.primary,
      hideMenu: 'true',
      // Networks - depends on your network (mainnet/testnet)
      networks: 'ethereum,polygon',
    });

    return `https://global.transak.com/?${params.toString()}`;
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('Transak event:', data);

      // Handle Transak events
      switch (data.event_id) {
        case 'TRANSAK_ORDER_SUCCESSFUL':
          Alert.alert(
            'Успех!',
            'Ваш заказ выполнен! Средства поступят на ваш кошелёк в течение 2-5 минут.',
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('Home'),
              },
            ]
          );
          break;

        case 'TRANSAK_ORDER_FAILED':
          Alert.alert('Ошибка', 'Не удалось выполнить заказ. Попробуйте ещё раз.');
          break;

        case 'TRANSAK_WIDGET_CLOSE':
          navigation.goBack();
          break;

        default:
          break;
      }
    } catch (error) {
      console.log('Could not parse Transak message:', event.nativeEvent.data);
    }
  };

  const handleLoadEnd = () => {
    setLoading(false);
    setLoadError(false);
  };

  const handleError = () => {
    setLoading(false);
    setLoadError(true);
  };

  const handleClose = () => {
    Alert.alert('Закрыть?', 'Вы уверены, что хотите отменить покупку?', [
      { text: 'Нет', style: 'cancel' },
      { text: 'Да', onPress: () => navigation.goBack() },
    ]);
  };

  if (TRANSAK_API_KEY === 'YOUR_TRANSAK_API_KEY') {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Transak</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={64} color={theme.colors.warning} />
          <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
            Transak API Key не настроен
          </Text>
          <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
            Чтобы использовать функцию покупки криптовалюты:{'\n\n'}
            1. Зарегистрируйтесь на transak.com{'\n'}
            2. Получите API Key{'\n'}
            3. Замените YOUR_TRANSAK_API_KEY в коде{'\n\n'}
            После этого вы сможете покупать USDC, ETH и другую крипту через карты и Apple/Google Pay.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Купить крипту</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Загрузка Transak...
          </Text>
        </View>
      )}

      {loadError && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={theme.colors.error} />
          <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
            Не удалось загрузить Transak
          </Text>
          <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
            Проверьте подключение к интернету и попробуйте снова
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => {
              setLoadError(false);
              setLoading(true);
              webViewRef.current?.reload();
            }}
          >
            <Text style={styles.retryButtonText}>Попробовать снова</Text>
          </TouchableOpacity>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: getTransakUrl() }}
        style={styles.webview}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
      />
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
