// src/App.tsx
import React, { useEffect } from 'react';
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
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Orders from './pages/Orders';
import Settings from './pages/Settings';
import { home, restaurant, receipt, settings } from 'ionicons/icons';
import { PushNotifications } from '@capacitor/push-notifications';

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
  useEffect(() => {
    let mounted = true;

    const initPush = async () => {
      try {
        // Create Android channel (safe to call repeatedly)
        await PushNotifications.createChannel({
          id: 'orders',
          name: 'Order Alerts',
          importance: 5,       // High => sound
          sound: 'default',    // or 'beep.wav' if added to res/raw
          vibration: true,
        });

        // 1) Add listeners FIRST so native callbacks are not missed
        PushNotifications.addListener('registration', (token) => {
          if (!mounted) return;
          console.log('FCM Token:', token.value);
          // TODO: send token.value to backend if needed
        });

        PushNotifications.addListener('registrationError', (err) => {
          console.log('FCM registration error:', JSON.stringify(err));
        });

        PushNotifications.addListener('pushNotificationReceived', (notif) => {
          console.log('Push received (foreground):', JSON.stringify(notif));
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

    initPush();
    return () => {
      mounted = false;
    };
  }, []);

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
