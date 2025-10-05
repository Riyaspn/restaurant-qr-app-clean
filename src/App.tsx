//src/app.tsx

import React, { useEffect, useState } from 'react';
import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
  IonSpinner,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Orders from './pages/Orders';
import Settings from './pages/Settings';
import { home, restaurant, receipt, settings } from 'ionicons/icons';
import { PushNotifications } from '@capacitor/push-notifications';
import { restoreSession, saveSession, clearSession } from './lib/session';
import { supabase } from './services/supabase';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import './theme/variables.css';

setupIonicReact();

const App: React.FC = () => {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initializeApp = async () => {
      try {
        // 1. First restore any saved session
        await restoreSession();
        console.log('Session restoration attempted');

        // 2. Set up auth state listener to save/clear sessions
        const { data: listener } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Auth state changed:', event);
            if (session) {
              await saveSession();
              console.log('Session saved to storage');
            } else if (event === 'SIGNED_OUT') {
              await clearSession();
              console.log('Session cleared from storage');
            }
          }
        );

        // 3. Initialize push notifications
        await initPush();

        // 4. Mark app as ready
        if (mounted) setAppReady(true);

        // Cleanup function
        return () => {
          listener.subscription.unsubscribe();
        };
      } catch (error) {
        console.error('App initialization failed:', error);
        if (mounted) setAppReady(true); // Still allow app to load
      }
    };

    const initPush = async () => {
      try {
        // Create Android channel (safe to call repeatedly)
        await PushNotifications.createChannel({
          id: 'orders',
          name: 'Order Alerts',
          importance: 5,       // High => sound + heads-up
          sound: 'beep.wav',    // Ensure 'beep.wav' exists in Android res/raw
          vibration: true,
        });

        // 1) Add listeners FIRST so native callbacks are not missed
        PushNotifications.addListener('registration', (token) => {
          if (!mounted) return;
          console.log('FCM Token:', token.value);
          // TODO: Send token.value to backend if needed
        });

        PushNotifications.addListener('registrationError', (err) => {
          console.log('FCM registration error:', JSON.stringify(err));
        });

        // Foreground message handler - show explicit notification
        PushNotifications.addListener('pushNotificationReceived', (notif) => {
          console.log('Push received (foreground):', notif);
          // Show a local notification to force heads-up display
          new Notification(notif.title, {
            body: notif.body,
            icon: notif.data?.icon || '/favicon.ico',
          });
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('Notification tap (background):', JSON.stringify(action.notification));
        });

        // 2) Ask permission and register
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive === 'granted') {
          await PushNotifications.register();
        } else {
          console.log('Push permission not granted');
        }
      } catch (e) {
        console.log('Push init failed:', String(e));
      }
    };

    initializeApp();

    return () => {
      mounted = false;
    };
  }, []);

  if (!appReady) {
    return (
      <IonApp>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          flexDirection: 'column'
        }}>
          <IonSpinner name="crescent" />
          <p style={{ marginTop: '16px' }}>Loading CafeQR...</p>
        </div>
      </IonApp>
    );
  }

  return (
    <IonApp>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/home">
              <Home />
            </Route>
            <Route exact path="/menu">
              <Menu />
            </Route>
            <Route exact path="/orders">
              <Orders />
            </Route>
            <Route exact path="/settings">
              <Settings />
            </Route>
            <Route exact path="/">
              <Redirect to="/home" />
            </Route>
          </IonRouterOutlet>

          <IonTabBar slot="bottom">
            <IonTabButton tab="home" href="/home">
              <IonIcon icon={home} />
              <IonLabel>Home</IonLabel>
            </IonTabButton>
            <IonTabButton tab="menu" href="/menu">
              <IonIcon icon={restaurant} />
              <IonLabel>Menu</IonLabel>
            </IonTabButton>
            <IonTabButton tab="orders" href="/orders">
              <IonIcon icon={receipt} />
              <IonLabel>Orders</IonLabel>
            </IonTabButton>
            <IonTabButton tab="settings" href="/settings">
              <IonIcon icon={settings} />
              <IonLabel>Settings</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
