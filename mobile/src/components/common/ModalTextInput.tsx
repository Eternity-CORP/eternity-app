import React, { useState } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  TextInputProps,
  ViewStyle,
  StyleSheet,
} from 'react-native';
import ModalInput from './ModalInput';

interface ModalTextInputProps extends TextInputProps {
  title?: string;
  helperText?: string;
  errorText?: string;
  containerStyle?: ViewStyle;
  displayStyle?: ViewStyle;
}

/**
 * Drop-in replacement for TextInput that opens in a modal
 * Prevents keyboard from covering the input field
 */
export default function ModalTextInput({
  value,
  onChangeText,
  placeholder,
  title,
  helperText,
  errorText,
  keyboardType,
  autoCapitalize,
  multiline,
  maxLength,
  secureTextEntry,
  editable = true,
  style,
  containerStyle,
  displayStyle,
  placeholderTextColor,
  ...otherProps
}: ModalTextInputProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const handlePress = () => {
    if (editable) {
      setModalVisible(true);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[containerStyle]}
        onPress={handlePress}
        activeOpacity={0.7}
        disabled={!editable}
      >
        <View style={[styles.displayContainer, displayStyle, style]}>
          <Text
            style={[
              styles.displayText,
              {
                color: value
                  ? (style as any)?.color || '#000000'
                  : placeholderTextColor || '#999999',
              },
            ]}
            numberOfLines={multiline ? undefined : 1}
          >
            {(value as string) || placeholder || ''}
          </Text>
        </View>
      </TouchableOpacity>

      <ModalInput
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        value={(value as string) || ''}
        onChangeText={onChangeText || (() => {})}
        title={title || placeholder || 'Enter value'}
        placeholder={placeholder}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        maxLength={maxLength}
        secureTextEntry={secureTextEntry}
        helperText={helperText}
        errorText={errorText}
        editable={editable}
      />
    </>
  );
}

const styles = StyleSheet.create({
  displayContainer: {
    justifyContent: 'center',
  },
  displayText: {
    fontSize: 16,
  },
});
