// In: android/app/src/main/java/com/cafeqr/app/SupabaseManager.java

package com.cafeqr.app;

import android.content.Context;
import android.content.SharedPreferences;

import io.supabase.gotrue.GoTrue;
import io.supabase.gotrue.GoTrueConfig;
import io.supabase.gotrue.storage.GoTrueLocalStorage;
import io.supabase.gotrue.storage.GoTrueStorage;

import java.util.HashMap;
import java.util.Map;

public class SupabaseManager {

    private static final String SUPABASE_URL = "https://tqdaqjvvssqaplregzvv.supabase.co";
    private static final String SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxZGFxanZ2c3NxYXBscmVnenZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NDU0MDksImV4cCI6MjA3MDUyMTQwOX0.qzVhY6W1evsuPIFKxmi_jve5YdkWv3r0KctMOa1HTBc";

    private static GoTrue goTrueInstance;

    // This is the key: we initialize this only once.
    public static synchronized GoTrue getGoTrueInstance(Context context) {
        if (goTrueInstance == null) {
            Map<String, String> headers = new HashMap<>();
            headers.put("apikey", SUPABASE_KEY);

            // This tells Supabase to use Android's SharedPreferences for storage.
            // This is what makes the session persist after the app is killed.
            GoTrueLocalStorage localStorage = new GoTrueLocalStorage(context.getApplicationContext());

            GoTrueConfig config = new GoTrueConfig();
            config.setUrl(SUPABASE_URL);
            config.setHeaders(headers);
            config.setStorage(localStorage);
            config.setAutoRefreshToken(true); // Automatically handle token refreshes

            goTrueInstance = new GoTrue(config);
        }
        return goTrueInstance;
    }
}
