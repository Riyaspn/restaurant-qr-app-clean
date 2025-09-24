package com.cafeqr.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

public class MyForegroundService extends Service {
    private static final String TAG = "ForegroundService";
    private static final String CHANNEL_ID = "orders";
    private static final String PERSISTENT_CHANNEL_ID = "persistent";
    private static final String PERSISTENT_CHANNEL_NAME = "App Status";

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "Starting foreground service");

        createNotificationChannels();

        startForeground(1, buildPersistentNotification());

        checkNotificationStatus();

        return START_STICKY;
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = getSystemService(NotificationManager.class);

            NotificationChannel ordersChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "Order Alerts",
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
            ordersChannel.enableLights(true);
            notificationManager.createNotificationChannel(ordersChannel);

            NotificationChannel persistentChannel = new NotificationChannel(
                    PERSISTENT_CHANNEL_ID,
                    PERSISTENT_CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_LOW
            );
            persistentChannel.setDescription("Keeps CafeQR running for order notifications");
            persistentChannel.setSound(null, null);
            persistentChannel.enableVibration(false);
            notificationManager.createNotificationChannel(persistentChannel);
        }
    }

    private Notification buildPersistentNotification() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE);

        return new NotificationCompat.Builder(this, PERSISTENT_CHANNEL_ID)
                .setContentTitle("CafeQR Active")
                .setContentText("Ready to receive order notifications")
                .setSmallIcon(R.mipmap.push_icon)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setContentIntent(pendingIntent)
                .setShowWhen(false)
                .build();
    }

    private void checkNotificationStatus() {
        if (!NotificationManagerCompat.from(this).areNotificationsEnabled()) {
            Log.w(TAG, "Notifications disabled for app");
            showEnableNotificationsPrompt();
            return;
        }

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
                    Log.w(TAG, "Orders channel importance reduced - may not show heads-up");
                }
                if (channel.getSound() == null) {
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
