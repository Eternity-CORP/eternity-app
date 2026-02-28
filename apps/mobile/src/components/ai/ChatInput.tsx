/**
 * ChatInput Component
 * Text input with unified action button for AI chat
 * Empty input -> mic, has text -> send, recording -> stop
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  Animated,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
// expo-speech-recognition requires a dev client build (native module).
// In Expo Go it's unavailable -- provide graceful fallback.
let ExpoSpeechRecognitionModule: {
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (opts: Record<string, unknown>) => void;
  stop: () => void;
} | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let useSpeechRecognitionEvent: (event: string, handler: (e: any) => void) => void = () => {};

try {
  const mod = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = mod.useSpeechRecognitionEvent;
} catch {
  // Native module not available (Expo Go) -- voice input disabled
}
import { getAiChatTheme } from '@/src/constants/ai-chat-theme';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';

const BAR_COUNT = 5;

function VoiceBars({ active }: { active: boolean }) {
  const anims = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(4)),
  ).current;

  useEffect(() => {
    if (!active) {
      anims.forEach((a) => a.setValue(4));
      return;
    }

    const animations = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 100),
          Animated.timing(anim, {
            toValue: 18,
            duration: 400,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 4,
            duration: 400,
            useNativeDriver: false,
          }),
        ]),
      ),
    );

    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [active, anims]);

  if (!active) return null;

  return (
    <View style={barStyles.container}>
      {anims.map((anim, i) => (
        <Animated.View key={i} style={[barStyles.bar, { height: anim }]} />
      ))}
    </View>
  );
}

const barStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 20,
    paddingHorizontal: 2,
  },
  bar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#EF4444',
  },
});

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Ask anything...',
}: ChatInputProps) {
  const { isDark } = useTheme();
  const aiChatTheme = useMemo(() => getAiChatTheme(isDark), [isDark]);

  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const isListeningRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening, pulseAnim]);

  const handleSend = useCallback(
    (message?: string) => {
      const trimmedText = (message ?? text).trim();
      if (!trimmedText || disabled) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSend(trimmedText);
      setText('');
      setInterimText('');
      Keyboard.dismiss();
    },
    [text, disabled, onSend],
  );

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript ?? '';
    if (event.isFinal) {
      setIsListening(false);
      isListeningRef.current = false;
      setInterimText('');
      if (transcript.trim()) {
        handleSend(transcript.trim());
      }
    } else {
      setInterimText(transcript);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
    isListeningRef.current = false;
    setInterimText('');
  });

  useSpeechRecognitionEvent('error', () => {
    setIsListening(false);
    isListeningRef.current = false;
    setInterimText('');
  });

  const speechAvailable = ExpoSpeechRecognitionModule != null;

  const startListening = useCallback(async () => {
    if (!ExpoSpeechRecognitionModule) return;

    const { granted } =
      await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setText('');
    setIsListening(true);
    isListeningRef.current = true;

    ExpoSpeechRecognitionModule.start({
      lang: 'ru-RU',
      interimResults: true,
      continuous: false,
    });
  }, []);

  const stopListening = useCallback(() => {
    ExpoSpeechRecognitionModule?.stop();
    setIsListening(false);
    isListeningRef.current = false;
    setInterimText('');
  }, []);

  const handleChangeText = useCallback(
    (newText: string) => {
      if (isListeningRef.current) {
        stopListening();
      }
      setText(newText);
    },
    [stopListening],
  );

  const displayText = isListening ? interimText : text;
  const hasText = text.trim().length > 0;
  const showSend = hasText && !isListening;

  const handleActionButton = useCallback(() => {
    if (disabled) return;
    if (isListeningRef.current) {
      const pending = interimText.trim();
      stopListening();
      if (pending) {
        handleSend(pending);
      }
    } else if (showSend) {
      handleSend();
    } else if (speechAvailable) {
      startListening();
    }
  }, [disabled, showSend, speechAvailable, interimText, handleSend, startListening, stopListening]);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: aiChatTheme.input.bg,
            borderColor: aiChatTheme.input.border,
          },
          isListening && styles.inputContainerRecording,
        ]}
      >
        {isListening && (
          <View style={styles.recordingIndicator}>
            <View style={styles.redDot} />
            <VoiceBars active={isListening} />
          </View>
        )}
        <TextInput
          style={[styles.input, { color: aiChatTheme.text.primary }]}
          value={displayText}
          onChangeText={handleChangeText}
          placeholder={isListening ? 'Listening...' : placeholder}
          placeholderTextColor={
            isListening ? 'rgba(239,68,68,0.5)' : aiChatTheme.input.placeholder
          }
          multiline
          maxLength={1000}
          editable={!disabled && !isListening}
          returnKeyType="send"
          blurOnSubmit
          onSubmitEditing={() => handleSend()}
        />
        <Animated.View
          style={{
            transform: [{ scale: isListening ? pulseAnim : 1 }],
          }}
        >
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: aiChatTheme.actionButtonBg },
              isListening && styles.actionButtonRecording,
              showSend && { backgroundColor: aiChatTheme.accentBlue },
            ]}
            onPress={handleActionButton}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <FontAwesome
              name={isListening ? 'stop' : showSend ? 'arrow-up' : speechAvailable ? 'microphone' : 'arrow-up'}
              size={isListening ? 14 : 18}
              color={
                isListening || showSend ? '#FFFFFF' : aiChatTheme.actionButtonIcon
              }
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 16,
    borderWidth: 1,
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  inputContainerRecording: {
    borderColor: 'rgba(239,68,68,0.3)',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  input: {
    flex: 1,
    fontSize: 14,
    maxHeight: 100,
    paddingVertical: theme.spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonRecording: {
    backgroundColor: '#EF4444',
  },
});
