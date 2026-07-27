package com.m1l3s99.ironbound

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

class StepBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
    if (!StepTrackingService.isEnabled(context)) return
    ContextCompat.startForegroundService(
      context,
      Intent(context, StepTrackingService::class.java)
    )
  }
}
