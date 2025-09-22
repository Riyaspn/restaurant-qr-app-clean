package com.cafeqr.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class MyFirebaseMessagingService extends FirebaseMessagingService {
    private static final String TAG = "FCM_Service";
    private static final String CHANNEL_ID = "orders";
    private static final String CHANNEL_NAME = "Order Alerts";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Log.d(TAG, "Message received from: " + remoteMessage.getFrom());

        if (remoteMessage.getData().size() > 0) {
            Log.d(TAG, "Data payload: " + remoteMessage.getData());

            // Extract title, body, and orderId from the payload.
            String title = remoteMessage.getNotification() != null
                    ? remoteMessage.getNotification().getTitle()
                    : remoteMessage.getData().get("title");
            String body = remoteMessage.getNotification() != null
                    ? remoteMessage.getNotification().getBody()
                    : remoteMessage.getData().get("body");
            String orderId = remoteMessage.getData().get("orderId");

            if (title != null && body != null) {
                sendNotification(title, body, orderId);
            } else {
                Log.e(TAG, "Notification title or body is missing from the payload.");
            }
        }
    }

    private void sendNotification(String title, String body, String orderId) {
        // Intent to open the app when the notification is tapped.
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra("orderId", orderId);

        // PendingIntent to be used by the notification builder.
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                intent,
                PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationManager notificationManager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        // This URI correctly references your beep.wav file in the res/raw directory
        Uri soundUri = Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.beep);

        // Create a notification channel for Android 8.0+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Channel for new order notifications");

            // Set sound on the channel
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .build();
            channel.setSound(soundUri, audioAttributes);
            channel.enableVibration(true);
            notificationManager.createNotificationChannel(channel);
        }

        // Build the notification
        NotificationCompat.Builder notificationBuilder =
                new NotificationCompat.Builder(this, CHANNEL_ID)
                        .setSmallIcon(R.mipmap.push_icon) // Your custom icon
                        .setContentTitle(title)
                        .setContentText(body)
                        .setAutoCancel(true)
                        .setPriority(NotificationCompat.PRIORITY_HIGH)
                        .setContentIntent(pendingIntent)
                        .setCategory(NotificationCompat.CATEGORY_SERVICE);

        // For Android versions below O, set sound on the builder
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            notificationBuilder.setSound(soundUri);
        }

        // Display the notification
        if (notificationManager != null && orderId != null) {
            notificationManager.notify(orderId.hashCode(), notificationBuilder.build());
        }
    }
}
