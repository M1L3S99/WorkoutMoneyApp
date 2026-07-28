package com.m1l3s99.ironbound

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.Sensor
import android.hardware.SensorManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class StepDetectorModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  private var receiverRegistered = false
  private var batteryRequestPromise: Promise? = null
  private val activityEventListener = object : BaseActivityEventListener() {
    override fun onActivityResult(
      activity: Activity,
      requestCode: Int,
      resultCode: Int,
      data: Intent?
    ) {
      if (requestCode != BATTERY_REQUEST_CODE) return
      batteryRequestPromise?.resolve(isBatteryExempt())
      batteryRequestPromise = null
    }
  }
  private val stepReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      if (intent?.action != StepTrackingService.ACTION_STEP_UPDATE) return
      val payload = Arguments.createMap().apply {
        putDouble("today", intent.getLongExtra(StepTrackingService.EXTRA_TODAY, 0).toDouble())
        putDouble("delta", intent.getLongExtra(StepTrackingService.EXTRA_DELTA, 0).toDouble())
        putDouble(
          "lifetime",
          intent.getLongExtra(StepTrackingService.EXTRA_LIFETIME, 0).toDouble()
        )
        putString("date", intent.getStringExtra(StepTrackingService.EXTRA_DATE))
        putDouble("timestamp", System.currentTimeMillis().toDouble())
      }
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("IronboundStepDetected", payload)
    }
  }

  init {
    reactContext.addActivityEventListener(activityEventListener)
  }

  override fun getName() = "IronboundStepDetector"

  @ReactMethod
  fun isAvailable(promise: Promise) {
    val manager = reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    promise.resolve(
      manager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR) != null ||
        manager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null
    )
  }

  @ReactMethod
  fun start(initialToday: Double, promise: Promise) {
    registerReceiver()
    val snapshot = StepTrackingService.seedAndRead(
      reactContext,
      initialToday.toLong().coerceAtLeast(0)
    )
    val serviceIntent = Intent(reactContext, StepTrackingService::class.java)
      .putExtra(StepTrackingService.EXTRA_INITIAL_TODAY, snapshot.second)
    ContextCompat.startForegroundService(reactContext, serviceIntent)

    promise.resolve(Arguments.createMap().apply {
      putBoolean("started", true)
      putString("date", snapshot.first)
      putDouble("today", snapshot.second.toDouble())
      putDouble("lifetime", StepTrackingService.lifetimeSteps(reactContext).toDouble())
    })
  }

  // Disconnecting React must not stop background tracking.
  @ReactMethod
  fun stop(promise: Promise) {
    unregisterReceiver()
    promise.resolve(true)
  }

  @ReactMethod
  fun stopBackgroundTracking(promise: Promise) {
    unregisterReceiver()
    reactContext.stopService(Intent(reactContext, StepTrackingService::class.java))
    StepTrackingService.setEnabled(reactContext, false)
    promise.resolve(true)
  }

  @ReactMethod
  fun requestBatteryOptimizationExemption(promise: Promise) {
    if (isBatteryExempt()) {
      promise.resolve(true)
      return
    }
    val activity = reactContext.getCurrentActivity()
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "Open Ironbound before enabling background tracking.")
      return
    }
    batteryRequestPromise?.reject("REPLACED", "A newer battery permission request was started.")
    batteryRequestPromise = promise
    try {
      activity.startActivityForResult(
        Intent(
          Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
          Uri.parse("package:${reactContext.packageName}")
        ),
        BATTERY_REQUEST_CODE
      )
    } catch (error: Exception) {
      batteryRequestPromise = null
      promise.reject("BATTERY_REQUEST_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun addListener(eventName: String) = Unit

  @ReactMethod
  fun removeListeners(count: Int) = Unit

  override fun invalidate() {
    unregisterReceiver()
    reactContext.removeActivityEventListener(activityEventListener)
    batteryRequestPromise?.reject("MODULE_CLOSED", "Background setup was interrupted.")
    batteryRequestPromise = null
    super.invalidate()
  }

  private fun isBatteryExempt(): Boolean {
    val manager = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
    return manager.isIgnoringBatteryOptimizations(reactContext.packageName)
  }

  private fun registerReceiver() {
    if (receiverRegistered) return
    val filter = IntentFilter(StepTrackingService.ACTION_STEP_UPDATE)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      reactContext.registerReceiver(stepReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      @Suppress("DEPRECATION")
      reactContext.registerReceiver(stepReceiver, filter)
    }
    receiverRegistered = true
  }

  private fun unregisterReceiver() {
    if (!receiverRegistered) return
    runCatching { reactContext.unregisterReceiver(stepReceiver) }
    receiverRegistered = false
  }

  companion object {
    private const val BATTERY_REQUEST_CODE = 7322
  }
}
