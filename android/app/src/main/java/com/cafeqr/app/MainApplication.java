package com.cafeqr.app;

import android.app.Application;
import com.google.firebase.FirebaseApp;

public class MainApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        // Manually initialize Firebase
        FirebaseApp.initializeApp(this);
    }
}
