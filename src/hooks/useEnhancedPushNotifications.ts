// src/hooks/useEnhancedPushNotifications.ts
import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export function useEnhancedPushNotifications(
  restaurantId: string,
  userEmail: string,
  onToken?: (token: string) => void
) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let mounted = true;

    const initPushNotifications = async () => {
      try {
        console.log('Initializing enhanced push notifications...');

        // Create enhanced notification channels for Android
        await PushNotifications.createChannel({
          id: 'orders',
          name: 'Order Alerts',
          description: 'High priority notifications for new restaurant orders',
          importance: 5, // IMPORTANCE_HIGH
          visibility: 1, // VISIBILITY_PUBLIC
          sound: 'beep.wav', // Custom sound file in res/raw/
          vibration: true,
          lights: true,
          lightColor: '#FF0000',
          enableVibration: true,
          enableLights: true
        });

        await PushNotifications.createChannel({
          id: 'kitchen',
          name: 'Kitchen Alerts', 
          description: 'Notifications for kitchen order updates',
          importance: 4, // IMPORTANCE_DEFAULT
          sound: 'default',
          vibration: true
        });

        // Request permissions
        const permResult = await PushNotifications.requestPermissions();
        console.log('Permission result:', permResult);

        if (permResult.receive === 'granted') {
          // Register for push notifications
          await PushNotifications.register();
          console.log('Push notifications registered');
        } else {
          console.warn('Push notification permission not granted');
          return;
        }

        // Handle registration success
        PushNotifications.addListener('registration', async (token) => {
          if (!mounted) return;
          
          console.log('Push registration success, token:', token.value);
          
          try {
            // Send token to your server
            const response = await fetch('/api/push/subscribe', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                deviceToken: token.value,
                restaurantId,
                userEmail,
                platform: 'android', // or detect platform
                channelId: 'orders'
              })
            });

            if (response.ok) {
              console.log('Token successfully sent to server');
              onToken?.(token.value);
            } else {
              console.error('Failed to send token to server');
            }
          } catch (error) {
            console.error('Error sending token to server:', error);
          }
        });

        // Handle registration errors
        PushNotifications.addListener('registrationError', (err) => {
          console.error('Push registration failed:', err);
        });

        // Handle foreground notifications
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push notification received in foreground:', notification);
          
          // Show in-app notification or update UI
          if (notification.data?.type === 'new_order') {
            // Handle new order notification
            showInAppNotification({
              title: notification.title,
              body: notification.body,
              data: notification.data
            });
          }
        });

        // Handle notification tap when app is in background/closed
        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('Push notification action performed:', action);
          
          const data = action.notification.data;
          if (data?.orderId) {
            // Navigate to specific order
            window.location.href = `/owner/orders?highlight=${data.orderId}`;
          } else {
            // Navigate to orders page
            window.location.href = '/owner/orders';
          }
        });

      } catch (error) {
        console.error('Failed to initialize push notifications:', error);
      }
    };

    initPushNotifications();

    return () => {
      mounted = false;
      // Clean up listeners
      PushNotifications.removeAllListeners();
    };
  }, [restaurantId, userEmail, onToken]);

  // Helper function to show in-app notifications
  const showInAppNotification = (notification: any) => {
    // Create custom in-app notification UI
    const notificationElement = document.createElement('div');
    notificationElement.className = 'in-app-notification';
    notificationElement.innerHTML = `
      <div class="notification-content">
        <strong>${notification.title}</strong>
        <p>${notification.body}</p>
      </div>
    `;
    
    // Add styles
    notificationElement.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #2563eb;
      color: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      min-width: 300px;
      cursor: pointer;
    `;
    
    document.body.appendChild(notificationElement);
    
    // Remove after 5 seconds
    setTimeout(() => {
      notificationElement.remove();
    }, 5000);
    
    // Handle click
    notificationElement.onclick = () => {
      if (notification.data?.orderId) {
        window.location.href = `/owner/orders?highlight=${notification.data.orderId}`;
      }
      notificationElement.remove();
    };
  };
}
