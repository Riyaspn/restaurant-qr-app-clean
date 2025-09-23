package com.cafeqr.app;

import android.app.ActivityManager;
import android.app.KeyguardManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.List;

public class MyFirebaseMessagingService extends FirebaseMessagingService {
    private static final String TAG = "FCM_Service";
    private static final String CHANNEL_ID = "orders";
    private static final String CHANNEL_NAME = "Order Alerts";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Log.d(TAG, "=== FCM MESSAGE RECEIVED ===");
        Log.d(TAG, "From: " + remoteMessage.getFrom());
        Log.d(TAG, "Message ID: " + remoteMessage.getMessageId());
        Log.d(TAG, "Data payload size: " + remoteMessage.getData().size());
        Log.d(TAG, "Has notification: " + (remoteMessage.getNotification() != null));
        Log.d(TAG, "App state: " + getAppState());
        Log.d(TAG, "Screen locked: " + isScreenLocked());
        Log.d(TAG, "Data payload: " + remoteMessage.getData());

        // Check notification channel status before processing
        checkNotificationChannelStatus();

        if (remoteMessage.getData().size() > 0) {
            // Extract title, body, and orderId from the payload
            String title = remoteMessage.getNotification() != null 
                ? remoteMessage.getNotification().getTitle() 
                : remoteMessage.getData().get("title");
            String body = remoteMessage.getNotification() != null 
                ? remoteMessage.getNotification().getBody() 
                : remoteMessage.getData().get("body");
            String orderId = remoteMessage.getData().get("orderId");

            Log.d(TAG, "Extracted - Title: " + title + ", Body: " + body + ", OrderId: " + orderId);

            if (title != null && body != null) {
                // Build and display notification
                sendNotification(title, body, orderId);
                
                // Start foreground service to maintain priority
                startNotificationService();
            } else {
                Log.e(TAG, "Notification title or body is missing from the payload");
            }
        } else {
            Log.w(TAG, "No data payload received");
        }
    }

    @Override
    public void onNewToken(String token) {
        Log.d(TAG, "New FCM token received: " + token);
        // TODO: Send token to your server
        super.onNewToken(token);
    }

    private void checkNotificationChannelStatus() {
        // Check if notifications are enabled
        if (!NotificationManagerCompat.from(this).areNotificationsEnabled()) {
            Log.w(TAG, "Notifications disabled for app");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            NotificationChannel channel = manager.getNotificationChannel(CHANNEL_ID);
            
            if (channel == null) {
                Log.w(TAG, "Notification channel not found, creating...");
                createNotificationChannel();
            } else {
                int importance = channel.getImportance();
                Log.d(TAG, "Channel importance: " + importance);
                
                if (importance == NotificationManager.IMPORTANCE_NONE) {
                    Log.w(TAG, "Notifications disabled for orders channel");
                } else if (importance < NotificationManager.IMPORTANCE_HIGH) {
                    Log.w(TAG, "Channel importance reduced, may not show heads-up");
                }

                Uri sound = channel.getSound();
                Log.d(TAG, "Channel sound: " + (sound != null ? sound.toString() : "none"));
            }
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Channel for new order notifications");
            
            // Set custom sound
            Uri soundUri = Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.beep);
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                  .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                  .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                  .build();
            channel.setSound(soundUri, audioAttributes);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{200, 100, 200, 100, 200});
            channel.setShowBadge(true);
            channel.setLightColor(0xFF3b82f6); // Blue light
            channel.enableLights(true);
            
            notificationManager.createNotificationChannel(channel);
            Log.d(TAG, "Notification channel created");
        }
    }

    private void sendNotification(String title, String body, String orderId) {
        Log.d(TAG, "Building notification - Title: " + title + ", Body: " + body);
        
        // Intent to open the app when notification is tapped
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("orderId", orderId);
        intent.putExtra("fromNotification", true);

        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 
            orderId != null ? orderId.hashCode() : 0, 
            intent, 
            PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationManager notificationManager = getSystemService(NotificationManager.class);
        
        // Build the notification
        NotificationCompat.Builder notificationBuilder = new NotificationCompat.Builder(this, CHANNEL_ID)
              .setSmallIcon(R.mipmap.push_icon)
              .setContentTitle(title)
              .setContentText(body)
              .setAutoCancel(true)
              .setPriority(NotificationCompat.PRIORITY_HIGH)
              .setContentIntent(pendingIntent)
              .setCategory(NotificationCompat.CATEGORY_CALL) // Higher priority category
              .setDefaults(NotificationCompat.DEFAULT_ALL)
              .setWhen(System.currentTimeMillis())
              .setShowWhen(true)
              .setVisibility(NotificationCompat.VISIBILITY_PUBLIC) // Show on lock screen
              .setFullScreenIntent(pendingIntent, true); // For heads-up on locked screen
        
        // For older Android versions, set sound on builder
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            Uri soundUri = Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.beep);
            notificationBuilder.setSound(soundUri);
            notificationBuilder.setVibrate(new long[]{200, 100, 200, 100, 200});
        }

        // Display the notification
        int notificationId = orderId != null ? orderId.hashCode() : (int) System.currentTimeMillis();
        
        try {
            notificationManager.notify(notificationId, notificationBuilder.build());
            Log.d(TAG, "Notification displayed with ID: " + notificationId);
        } catch (Exception e) {
            Log.e(TAG, "Failed to show notification", e);
        }
    }

    private void startNotificationService() {
        try {
            Intent serviceIntent = new Intent(this, MyForegroundService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
            Log.d(TAG, "Foreground service started");
        } catch (Exception e) {
            Log.e(TAG, "Failed to start foreground service", e);
        }
    }

    private String getAppState() {
        ActivityManager am = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        List<ActivityManager.RunningAppProcessInfo> processes = am.getRunningAppProcesses();
        if (processes != null) {
            for (ActivityManager.RunningAppProcessInfo process : processes) {
                if (process.processName.equals(getPackageName())) {
                    if (process.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND) {
                        return "FOREGROUND";
                    } else if (process.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_BACKGROUND) {
                        return "BACKGROUND";
                    } else {
                        return "CACHED";
                    }
                }
            }
        }
        return "NOT_RUNNING";
    }

    private boolean isScreenLocked() {
        KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
        return keyguardManager != null && keyguardManager.inKeyguardRestrictedInputMode();
    }
}
