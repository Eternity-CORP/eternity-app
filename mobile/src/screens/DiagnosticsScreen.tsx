import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { networkDiagnostics, runQuickDiagnostics } from '../services/networkDiagnostics';
import { networkLogger } from '../services/networkLogger';
import { getSelectedNetwork } from '../services/networkService';
import type { Network } from '../config/env';

interface DiagnosticResult {
  service: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
  duration?: number;
}

export default function DiagnosticsScreen() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [currentNetwork, setCurrentNetwork] = useState<Network>('sepolia');

  useEffect(() => {
    getSelectedNetwork().then(setCurrentNetwork);
  }, []);

  const runDiagnostics = async () => {
    setIsRunning(true);
    try {
      const network = await getSelectedNetwork();
      setCurrentNetwork(network);
      const diagnosticResults = await networkDiagnostics.runFullDiagnostics(network);
      setResults(diagnosticResults);
      setLastRun(new Date());
    } catch (error) {
      console.error('Diagnostics failed:', error);
      Alert.alert('Ошибка', 'Не удалось выполнить диагностику');
    } finally {
      setIsRunning(false);
    }
  };

  const clearLogs = () => {
    networkLogger.clearLogs();
    Alert.alert('Готово', 'Логи сетевых запросов очищены');
  };

  const showFullReport = () => {
    const report = networkDiagnostics.generateReport();
    Alert.alert('Полный отчет', report, [{ text: 'OK' }], { 
      cancelable: true 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#4CAF50';
      case 'warning': return '#FF9800';
      case 'error': return '#F44336';
      default: return '#757575';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✓';
      case 'warning': return '⚠';
      case 'error': return '✗';
      default: return '?';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Диагностика сети</Text>
          <Text style={styles.subtitle}>
            Проверка подключения к RPC, API и интернету
          </Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={runDiagnostics}
            disabled={isRunning}
          >
            {isRunning ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Запустить диагностику</Text>
            )}
          </TouchableOpacity>

          <View style={styles.secondaryButtons}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={showFullReport}
              disabled={results.length === 0}
            >
              <Text style={styles.secondaryButtonText}>Полный отчет</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={clearLogs}
            >
              <Text style={styles.secondaryButtonText}>Очистить логи</Text>
            </TouchableOpacity>
          </View>
        </View>

        {lastRun && (
          <View style={styles.lastRun}>
            <Text style={styles.lastRunText}>
              Последняя проверка: {lastRun.toLocaleString('ru-RU')}
            </Text>
          </View>
        )}

        {results.length > 0 && (
          <View style={styles.results}>
            <Text style={styles.resultsTitle}>Результаты диагностики</Text>
            
            {results.map((result, index) => (
              <View key={index} style={styles.resultItem}>
                <View style={styles.resultHeader}>
                  <Text 
                    style={[
                      styles.resultIcon, 
                      { color: getStatusColor(result.status) }
                    ]}
                  >
                    {getStatusIcon(result.status)}
                  </Text>
                  <Text style={styles.resultService}>{result.service}</Text>
                  {result.duration && (
                    <Text style={styles.resultDuration}>
                      {result.duration}ms
                    </Text>
                  )}
                </View>
                
                <Text 
                  style={[
                    styles.resultMessage,
                    { color: getStatusColor(result.status) }
                  ]}
                >
                  {result.message}
                </Text>

                {result.details && (
                  <Text style={styles.resultDetails}>
                    {typeof result.details === 'string' 
                      ? result.details 
                      : JSON.stringify(result.details, null, 2)
                    }
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.info}>
          <Text style={styles.infoTitle}>Информация</Text>
          <Text style={styles.infoText}>
            • Диагностика проверяет подключение к блокчейн-сетям{'\n'}
            • Тестирует доступность API для получения цен{'\n'}
            • Проверяет общее интернет-соединение{'\n'}
            • Все запросы логируются для анализа проблем
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
  },
  controls: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  primaryButton: {
    backgroundColor: '#000',
    marginBottom: 15,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#000',
    flex: 1,
    marginHorizontal: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  secondaryButtonText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  secondaryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lastRun: {
    padding: 15,
    backgroundColor: '#fff',
    marginTop: 10,
    alignItems: 'center',
  },
  lastRunText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  results: {
    margin: 10,
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 15,
  },
  resultsTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultItem: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  resultIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
    width: 20,
  },
  resultService: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  resultDuration: {
    fontSize: 10,
    color: '#999',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  resultMessage: {
    fontSize: 14,
    marginLeft: 30,
    marginBottom: 5,
  },
  resultDetails: {
    fontSize: 12,
    color: '#666',
    marginLeft: 30,
    fontFamily: 'monospace',
    backgroundColor: '#f8f8f8',
    padding: 8,
    borderRadius: 4,
  },
  info: {
    margin: 10,
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 15,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});