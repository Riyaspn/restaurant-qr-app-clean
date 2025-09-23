package com.cafeqr.app;

import android.app.ActivityManager;
import android.app.KeyguardManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import java.util.List;

public class MyForegroundService extends Service {
    private static final String TAG = "ForegroundService";
    private static final String CHANNEL_ID = "orders";
    private static final String CHANNEL_NAME = "Order Alerts";
    private static final String PERSISTENT_CHANNEL_ID = "persistent";
    private static final String PERSISTENT_CHANNEL_NAME = "App Status";

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "Starting foreground service");
        
        // Create both channels
        createNotificationChannels();
        
        // Build persistent notification
        Notification notification = buildPersistentNotification();
        
        // Start foreground service
        startForeground(1, notification);
        
        // Check notification permissions and channel status
        checkNotificationStatus();
        
        // Return START_STICKY to restart if killed
        return START_STICKY;
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            
            // Orders channel (high priority for alerts)
            NotificationChannel ordersChannel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            );
            ordersChannel.setDescription("Channel for new order notifications");
            Uri soundUri = Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.beep);
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
               .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
               .setUsage(AudioAttributes.USAGE_NOTIFICATION)
               .build();
            ordersChannel.setSound(soundUri, audioAttributes);
            ordersChannel.enableVibration(true);
            ordersChannel.setVibrationPattern(new long[]{200, 100, 200, 100, 200});
            ordersChannel.setShowBadge(true);
            notificationManager.createNotificationChannel(ordersChannel);
            
            // Persistent channel (low priority for service status)
            NotificationChannel persistentChannel = new NotificationChannel(
                PERSISTENT_CHANNEL_ID,
                PERSISTENT_CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            );
            persistentChannel.setDescription("Keeps CafeQR running for order notifications");
            persistentChannel.setSound(null, null);
            persistentChannel.enableVibration(false);
            persistentChannel.setShowBadge(false);
            notificationManager.createNotificationChannel(persistentChannel);
        }
    }

    private Notification buildPersistentNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        notificationIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 
            0, 
            notificationIntent, 
            PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, PERSISTENT_CHANNEL_ID)
                .setSmallIcon(R.mipmap.push_icon)
                .setContentTitle("CafeQR Active")
                .setContentText("Ready to receive order notifications")
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setContentIntent(pendingIntent)
                .setOngoing(true) // Cannot be dismissed
                .setShowWhen(false)
                .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
                .build();
    }

    private void checkNotificationStatus() {
        // Check if notifications are enabled for the app
        if (!NotificationManagerCompat.from(this).areNotificationsEnabled()) {
            Log.w(TAG, "Notifications disabled for app");
            showEnableNotificationsPrompt();
            return;
        }

        // Check orders channel status
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            NotificationChannel channel = manager.getNotificationChannel(CHANNEL_ID);
            
            if (channel == null) {
                Log.w(TAG, "Orders channel not found, recreating...");
                createNotificationChannels();
            } else {
                int importance = channel.getImportance();
                Log.d(TAG, "Orders channel importance: " + importance);
                
                if (importance == NotificationManager.IMPORTANCE_NONE) {
                    Log.w(TAG, "Orders channel disabled by user");
                    showChannelDisabledAlert();
                } else if (importance < NotificationManager.IMPORTANCE_HIGH) {
                    Log.w(TAG, "Orders channel importance reduced - may not show heads-up notifications");
                }
                
                Uri channelSound = channel.getSound();
                if (channelSound == null) {
                    Log.w(TAG, "Orders channel sound disabled");
                }
            }
        }
    }

    private void showEnableNotificationsPrompt() {
        Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
        intent.putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName());
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, PERSISTENT_CHANNEL_ID)
                .setSmallIcon(R.mipmap.push_icon)
                .setContentTitle("Enable CafeQR Notifications")
                .setContentText("Tap to enable order notifications")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(PendingIntent.getActivity(this, 100, intent, PendingIntent.FLAG_IMMUTABLE))
                .setAutoCancel(true);
                
        NotificationManagerCompat.from(this).notify(100, builder.build());
    }

    private void showChannelDisabledAlert() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent intent = new Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS);
            intent.putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName());
            intent.putExtra(Settings.EXTRA_CHANNEL_ID, CHANNEL_ID);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            
            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, PERSISTENT_CHANNEL_ID)
                    .setSmallIcon(R.mipmap.push_icon)
                    .setContentTitle("Enable Order Sound Alerts")
                    .setContentText("Tap to enable sound alerts for new orders")
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setContentIntent(PendingIntent.getActivity(this, 101, intent, PendingIntent.FLAG_IMMUTABLE))
                    .setAutoCancel(true);
                    
            NotificationManagerCompat.from(this).notify(101, builder.build());
        }
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "Service destroyed");
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
