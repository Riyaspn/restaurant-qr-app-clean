// android/app/src/main/java/com/cafeqr/app/MainActivity.java
package com.cafeqr.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;

public class MainActivity extends BridgeActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Optional: define a stable channel for order alerts using default system sound
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      NotificationManager manager = getSystemService(NotificationManager.class);
      NotificationChannel channel = new NotificationChannel(
        "orders_default",                 // Channel ID you will target from FCM
        "New Orders",
        NotificationManager.IMPORTANCE_HIGH // plays sound by default per OS settings
      );
      // Do NOT call setSound -> inherits the system’s default alert
      manager.createNotificationChannel(channel);
    }
  }
}
