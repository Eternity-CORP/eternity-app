import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { runQuickDiagnostics } from '../services/networkDiagnostics';
import { networkLogger } from '../services/networkLogger';

interface NetworkStatusProps {
  onPress?: () => void;
}

export default function NetworkStatus({ onPress }: NetworkStatusProps) {
  const [status, setStatus] = useState<'checking' | 'good' | 'warning' | 'error'>('checking');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    checkNetworkStatus();
    
    // Проверяем статус каждые 30 секунд
    const interval = setInterval(checkNetworkStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const checkNetworkStatus = async () => {
    try {
      setStatus('checking');
      
      const results = await runQuickDiagnostics();
      const errors = results.filter(r => r.status === 'error');
      const warnings = results.filter(r => r.status === 'warning');
      
      setErrorCount(errors.length);
      
      if (errors.length > 0) {
        setStatus('error');
      } else if (warnings.length > 0) {
        setStatus('warning');
      } else {
        setStatus('good');
      }
      
      setLastCheck(new Date());
    } catch (error) {
      console.error('Network status check failed:', error);
      setStatus('error');
      setErrorCount(1);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'good': return '#4CAF50';
      case 'warning': return '#FF9800';
      case 'error': return '#F44336';
      case 'checking': return '#2196F3';
      default: return '#757575';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'good': return '●';
      case 'warning': return '●';
      case 'error': return '●';
      case 'checking': return '●';
      default: return '●';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'good': return 'Сеть в норме';
      case 'warning': return 'Есть предупреждения';
      case 'error': return `Ошибки сети (${errorCount})`;
      case 'checking': return 'Проверка...';
      default: return 'Неизвестно';
    }
  };

  const recentErrors = networkLogger.getRecentErrors(5);

  return (
    <TouchableOpacity 
      style={[styles.container, { borderLeftColor: getStatusColor() }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.statusIndicator}>
          {status === 'checking' ? (
            <ActivityIndicator size="small" color={getStatusColor()} />
          ) : (
            <Text style={[styles.statusIcon, { color: getStatusColor() }]}>
              {getStatusIcon()}
            </Text>
          )}
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
        
        {lastCheck && (
          <Text style={styles.lastCheck}>
            {lastCheck.toLocaleTimeString('ru-RU', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        )}
      </View>

      {recentErrors.length > 0 && (
        <View style={styles.errorPreview}>
          <Text style={styles.errorPreviewTitle}>Последние ошибки:</Text>
          {recentErrors.slice(0, 2).map((error, index) => (
            <Text key={index} style={styles.errorPreviewText} numberOfLines={1}>
              • {error.type}: {error.error || error.url}
            </Text>
          ))}
          {recentErrors.length > 2 && (
            <Text style={styles.moreErrors}>
              и еще {recentErrors.length - 2} ошибок...
            </Text>
          )}
        </View>
      )}

      <Text style={styles.tapHint}>Нажмите для подробной диагностики</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  lastCheck: {
    fontSize: 12,
    color: '#999',
  },
  errorPreview: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  errorPreviewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  errorPreviewText: {
    fontSize: 11,
    color: '#F44336',
    marginBottom: 2,
  },
  moreErrors: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  tapHint: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});