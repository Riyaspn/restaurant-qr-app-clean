// In: android/app/src/main/java/com/cafeqr/app/MainApplication.java

package com.cafeqr.app;

import android.app.Application;

public class MainApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        // Initialize the Supabase client as soon as the app starts.
        SupabaseManager.getGoTrueInstance(this);
    }
}
