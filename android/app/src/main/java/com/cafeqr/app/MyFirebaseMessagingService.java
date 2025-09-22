// File: android/app/src/main/java/com/cafeqr/app/MyFirebaseMessagingService.java

package com.cafeqr.app; // This package name should match your app's package ID

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

        // Process the data payload here. This is where your new order info lives.
        if (remoteMessage.getData().size() > 0) {
            Log.d(TAG, "Data payload: " + remoteMessage.getData());

            // Extract data from the payload
            // Use the default notification payload if present, otherwise fall back to data
            String title = remoteMessage.getNotification()!= null? remoteMessage.getNotification().getTitle() : remoteMessage.getData().get("title");
            String body = remoteMessage.getNotification()!= null? remoteMessage.getNotification().getBody() : remoteMessage.getData().get("body");
            String orderId = remoteMessage.getData().get("orderId");
            
            if (title!= null && body!= null) {
                // Manually build and display the notification
                sendNotification(title, body, orderId);
            } else {
                Log.e(TAG, "Notification title or body is missing from the payload.");
            }
        }
    }

    private void sendNotification(String title, String body, String orderId) {
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra("orderId", orderId);
        
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE);
        
        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        Uri soundUri = Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.beep);

        // Create a notification channel for Android 8.0+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Channel for new order notifications");
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
               .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
               .setUsage(AudioAttributes.USAGE_NOTIFICATION)
               .build();
            channel.setSound(soundUri, audioAttributes);
            channel.enableVibration(true);
            notificationManager.createNotificationChannel(channel);
        }

        // Build the notification
        NotificationCompat.Builder notificationBuilder = new NotificationCompat.Builder(this, CHANNEL_ID)
           .setSmallIcon(R.mipmap.push_icon) // This is your custom icon
           .setContentTitle(title)
           .setContentText(body)
           .setAutoCancel(true)
           .setPriority(NotificationCompat.PRIORITY_HIGH)
           .setContentIntent(pendingIntent)
           .setCategory(NotificationCompat.CATEGORY_SERVICE);

        // On older Android versions, we set the sound directly on the builder
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            notificationBuilder.setSound(soundUri);
        }

        notificationManager.notify(orderId.hashCode(), notificationBuilder.build());
    }
}