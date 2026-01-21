/**
 * Token Selector Modal
 * Allows user to select a token for swap
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/src/constants/theme';
import { SwapToken } from '@/src/services/swap-service';

interface TokenSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (token: SwapToken) => void;
  tokens: SwapToken[];
  loading: boolean;
  selectedToken?: SwapToken | null;
  title?: string;
}

export default function TokenSelector({
  visible,
  onClose,
  onSelect,
  tokens,
  loading,
  selectedToken,
  title = 'Select Token',
}: TokenSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) return tokens;

    const query = searchQuery.toLowerCase();
    return tokens.filter(
      (token) =>
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query)
    );
  }, [tokens, searchQuery]);

  const handleSelect = (token: SwapToken) => {
    onSelect(token);
    setSearchQuery('');
    onClose();
  };

  const renderToken = ({ item }: { item: SwapToken }) => {
    const isSelected = selectedToken?.address === item.address;

    return (
      <TouchableOpacity
        style={[styles.tokenItem, isSelected && styles.tokenItemSelected]}
        onPress={() => handleSelect(item)}
      >
        <View style={styles.tokenIcon}>
          {item.logoURI ? (
            <Image source={{ uri: item.logoURI }} style={styles.tokenImage} />
          ) : (
            <View style={styles.tokenPlaceholder}>
              <Text style={styles.tokenPlaceholderText}>
                {item.symbol.charAt(0)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.tokenInfo}>
          <Text style={styles.tokenSymbol}>{item.symbol}</Text>
          <Text style={styles.tokenName} numberOfLines={1}>
            {item.name}
          </Text>
        </View>

        {item.priceUSD && (
          <Text style={styles.tokenPrice}>
            ${parseFloat(item.priceUSD).toFixed(2)}
          </Text>
        )}

        {isSelected && (
          <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or address"
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text style={styles.loadingText}>Loading tokens...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredTokens}
            renderItem={renderToken}
            keyExtractor={(item) => item.address}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No tokens found</Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  tokenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tokenItemSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: `${theme.colors.accent}10`,
  },
  tokenIcon: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  tokenImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  tokenPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  tokenName: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  tokenPrice: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginRight: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
});
