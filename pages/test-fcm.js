// pages/test-fcm.js
import React, { useEffect, useState } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';

export default function TestFCMPage() {
  const [token, setToken] = useState('');
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    const getFCMToken = async () => {
      try {
        addLog('🚀 Starting FCM token request...');

        // Request permissions
        const perm = await PushNotifications.requestPermissions();
        addLog(`📋 Permissions: ${JSON.stringify(perm)}`);

        if (perm.receive === 'granted') {
          addLog('✅ Permission granted, registering...');
          
          // Add listeners
          PushNotifications.addListener('registration', (token) => {
            addLog(`🎯 FCM Token: ${token.value}`);
            setToken(token.value);
          });

          PushNotifications.addListener('registrationError', (err) => {
            addLog(`❌ Registration Error: ${err.error}`);
          });

          // Register
          await PushNotifications.register();
          addLog('📞 Register called');
          
        } else {
          addLog('❌ Permission denied');
        }
      } catch (error) {
        addLog(`💥 Error: ${error.message}`);
      }
    };

    getFCMToken();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>FCM Token Test</h1>
      
      {token && (
        <div style={{ backgroundColor: '#e8f5e8', padding: 15, marginBottom: 20 }}>
          <h3>🎉 FCM Token Found:</h3>
          <textarea 
            value={token} 
            readOnly 
            rows={4} 
            style={{ width: '100%', fontFamily: 'monospace' }}
          />
          <button onClick={() => navigator.clipboard.writeText(token)}>
            Copy Token
          </button>
        </div>
      )}

      <div>
        <h3>Debug Logs:</h3>
        <div style={{ backgroundColor: '#f5f5f5', padding: 10, maxHeight: 300, overflow: 'auto' }}>
          {logs.map((log, i) => (
            <div key={i} style={{ marginBottom: 5, fontSize: 12, fontFamily: 'monospace' }}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
