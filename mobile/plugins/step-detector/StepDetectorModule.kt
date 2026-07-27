package com.m1l3s99.ironbound

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class StepDetectorModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext), SensorEventListener {
  private val sensorManager =
    reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
  private val stepDetector = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR)
  private var listening = false

  override fun getName() = "IronboundStepDetector"

  @ReactMethod
  fun isAvailable(promise: Promise) {
    promise.resolve(stepDetector != null)
  }

  @ReactMethod
  fun start(promise: Promise) {
    val sensor = stepDetector
    if (sensor == null) {
      promise.resolve(false)
      return
    }
    if (!listening) {
      listening = sensorManager.registerListener(
        this,
        sensor,
        SensorManager.SENSOR_DELAY_FASTEST
      )
    }
    promise.resolve(listening)
  }

  @ReactMethod
  fun stop(promise: Promise) {
    stopListening()
    promise.resolve(true)
  }

  @ReactMethod
  fun addListener(eventName: String) = Unit

  @ReactMethod
  fun removeListeners(count: Int) = Unit

  override fun onSensorChanged(event: SensorEvent) {
    if (event.sensor.type != Sensor.TYPE_STEP_DETECTOR) return
    if ((event.values.firstOrNull() ?: 0f) < 1f) return

    val payload = Arguments.createMap().apply {
      putDouble("timestamp", System.currentTimeMillis().toDouble())
    }
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("IronboundStepDetected", payload)
  }

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit

  override fun invalidate() {
    stopListening()
    super.invalidate()
  }

  private fun stopListening() {
    if (listening) sensorManager.unregisterListener(this)
    listening = false
  }
}
