package com.cafeqr.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;

import androidx.core.app.NotificationCompat;

public class MyForegroundService extends Service {
    private static final String CHANNEL_ID = "orders";
    private static final String CHANNEL_NAME = "Order Alerts";

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Create the notification channel and the notification itself
        createNotificationChannel();
        Notification notification = buildNotification(intent);

        // Start the service in the foreground with a persistent notification
        startForeground(1, notification);

        // Return START_STICKY to ensure the service is restarted if it's killed
        return START_STICKY;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Channel for new order notifications");
            Uri soundUri = Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.beep);
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
               .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
               .setUsage(AudioAttributes.USAGE_NOTIFICATION)
               .build();
            channel.setSound(soundUri, audioAttributes);
            channel.enableVibration(true);
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification(Intent intent) {
        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");
        String orderId = intent.getStringExtra("orderId");

        // Intent to launch the app when the notification is tapped
        Intent notificationIntent = new Intent(this, MainActivity.class);
        notificationIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        notificationIntent.putExtra("orderId", orderId);

        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, notificationIntent, PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE);

        // Build the notification
        NotificationCompat.Builder notificationBuilder = new NotificationCompat.Builder(this, CHANNEL_ID)
           .setSmallIcon(R.mipmap.push_icon) // Custom icon is essential here
           .setContentTitle(title)
           .setContentText(body)
           .setAutoCancel(true)
           .setPriority(NotificationCompat.PRIORITY_HIGH)
           .setContentIntent(pendingIntent)
           .setCategory(NotificationCompat.CATEGORY_SERVICE);

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            Uri soundUri = Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.beep);
            notificationBuilder.setSound(soundUri);
        }

        return notificationBuilder.build();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}