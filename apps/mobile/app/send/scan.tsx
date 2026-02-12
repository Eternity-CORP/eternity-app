/**
 * QR Code Scanner Screen
 * Scans QR codes and extracts wallet addresses or EIP-681 payment URIs
 */

import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAppDispatch } from '@/src/store/hooks';
import { setRecipient, setStep } from '@/src/store/slices/send-slice';
import { validateAddress } from '@/src/services/send-service';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

/**
 * Parse EIP-681 payment URI
 * Format: ethereum:0x...[@chainId][/function]?[value=...][&...]
 * Example: ethereum:0x1234...?value=1000000000000000000
 */
function parseEIP681(uri: string): { address: string; amount?: string; chainId?: number } | null {
  try {
    // Check if it's an EIP-681 URI
    if (!uri.startsWith('ethereum:')) {
      return null;
    }

    const withoutPrefix = uri.slice('ethereum:'.length);

    // Split by ? to get address part and query params
    const [addressPart, queryString] = withoutPrefix.split('?');

    // Extract address (may have @chainId suffix)
    let address = addressPart;
    let chainId: number | undefined;

    if (addressPart.includes('@')) {
      const [addr, chain] = addressPart.split('@');
      address = addr;
      chainId = parseInt(chain, 10);
    }

    // Remove any function call part (e.g., /transfer)
    if (address.includes('/')) {
      address = address.split('/')[0];
    }

    // Validate address
    if (!validateAddress(address)) {
      return null;
    }

    // Parse query params for value
    let amount: string | undefined;
    if (queryString) {
      const params = new URLSearchParams(queryString);
      const value = params.get('value');
      if (value) {
        // Convert from wei to ETH (for display purposes)
        // The actual amount handling will be done in the send flow
        amount = value;
      }
    }

    return { address, amount, chainId };
  } catch {
    return null;
  }
}

/**
 * Parse scanned QR code data
 * Supports: plain address, EIP-681 URI
 */
function parseQRData(data: string): { address: string; amount?: string; chainId?: number } | null {
  const trimmed = data.trim();

  // Try EIP-681 format first
  if (trimmed.startsWith('ethereum:')) {
    return parseEIP681(trimmed);
  }

  // Try plain address
  if (validateAddress(trimmed)) {
    return { address: trimmed };
  }

  // Check if it's an address without 0x prefix
  if (trimmed.length === 40 && /^[0-9a-fA-F]+$/.test(trimmed)) {
    const withPrefix = `0x${trimmed}`;
    if (validateAddress(withPrefix)) {
      return { address: withPrefix };
    }
  }

  return null;
}

export default function ScanScreen() {
  const { theme: dynamicTheme } = useTheme();
  const dispatch = useAppDispatch();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    const parsed = parseQRData(data);

    if (parsed) {
      // Set recipient in store
      dispatch(setRecipient(parsed.address));
      dispatch(setStep('amount'));

      // Navigate to amount screen
      router.replace('/send/amount');
    } else {
      Alert.alert(
        'Invalid QR Code',
        'This QR code does not contain a valid Ethereum address.',
        [
          { text: 'Try Again', onPress: () => setScanned(false) }
        ]
      );
    }
  };

  const toggleFlash = () => {
    setFlashOn(!flashOn);
  };

  if (!permission) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
        <View style={styles.centerContainer}>
          <Text style={[styles.permissionText, theme.typography.body, { color: dynamicTheme.colors.textSecondary }]}>
            Requesting camera permission...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
        <View style={styles.centerContainer}>
          <FontAwesome name="camera" size={48} color={dynamicTheme.colors.textTertiary} />
          <Text style={[styles.permissionText, theme.typography.body, { color: dynamicTheme.colors.textSecondary, marginTop: theme.spacing.lg }]}>
            Camera access is required to scan QR codes
          </Text>
          <TouchableOpacity style={[styles.permissionButton, { backgroundColor: dynamicTheme.colors.buttonPrimary }]} onPress={requestPermission}>
            <Text style={[styles.permissionButtonText, theme.typography.heading, { color: dynamicTheme.colors.buttonPrimaryText }]}>
              Grant Permission
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={[styles.backButtonText, theme.typography.body, { color: dynamicTheme.colors.textTertiary }]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={flashOn}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        {/* Header overlay */}
        <SafeAreaView style={styles.overlay} edges={['top']} pointerEvents="box-none">
          <View style={styles.header} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <FontAwesome name="arrow-left" size={20} color="white" />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, theme.typography.heading]}>
              Scan QR Code
            </Text>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={toggleFlash}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <FontAwesome
                name={flashOn ? 'flash' : 'bolt'}
                size={20}
                color={flashOn ? '#FBBF24' : 'white'}
              />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Scanner frame */}
        <View style={styles.scannerFrame} pointerEvents="none">
          <View style={styles.scannerBox}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
        </View>

        {/* Bottom instructions */}
        <View style={styles.bottomOverlay}>
          <Text style={[styles.instruction, theme.typography.body]}>
            Position the QR code within the frame
          </Text>
          <Text style={[styles.hint, theme.typography.caption]}>
            Supports wallet addresses and payment requests
          </Text>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  permissionText: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: theme.colors.buttonPrimary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.xl,
  },
  permissionButtonText: {
    color: theme.colors.buttonPrimaryText,
  },
  backButton: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  backButtonText: {
    color: theme.colors.textTertiary,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
  },
  scannerFrame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerBox: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: theme.colors.buttonPrimary,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  instruction: {
    color: 'white',
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  hint: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
});
