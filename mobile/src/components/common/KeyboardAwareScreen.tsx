import React, { forwardRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ViewStyle,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollViewProps,
  StyleProp,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface KeyboardAwareScreenProps extends ScrollViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollEnabled?: boolean;
  withSafeArea?: boolean;
  dismissKeyboardOnTap?: boolean;
  extraScrollHeight?: number;
}

/**
 * A reusable container component that handles keyboard interactions.
 * It wraps the content in a KeyboardAvoidingView and a ScrollView.
 * 
 * Usage:
 * <KeyboardAwareScreen>
 *   <TextInput ... />
 * </KeyboardAwareScreen>
 */
export const KeyboardAwareScreen = forwardRef<ScrollView, KeyboardAwareScreenProps>(
  (
    {
      children,
      style,
      contentContainerStyle,
      scrollEnabled = true,
      withSafeArea = true,
      dismissKeyboardOnTap = true,
      extraScrollHeight = 0,
      ...props
    },
    ref
  ) => {
    const Wrapper = withSafeArea ? SafeAreaView : React.Fragment;
    
    const content = (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.container, !withSafeArea && style]}
        keyboardVerticalOffset={Platform.OS === 'ios' ? extraScrollHeight : 0}
      >
        <ScrollView
          ref={ref}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          scrollEnabled={scrollEnabled}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          {...props}
        >
          {dismissKeyboardOnTap ? (
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={{ flex: 1 }}>
                {children}
              </View>
            </TouchableWithoutFeedback>
          ) : (
            children
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );

    if (withSafeArea) {
      return (
        <SafeAreaView style={[styles.safeArea, style]} edges={['top', 'left', 'right']}>
          {content}
        </SafeAreaView>
      );
    }

    return content;
  }
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
