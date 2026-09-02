package com.m1l3s99.ironbound

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.min

class StepTrackingService : Service(), SensorEventListener {
  private lateinit var sensorManager: SensorManager
  private var stepDetector: Sensor? = null
  private var stepCounter: Sensor? = null
  private var startedAt = 0L
  private var counterLeadCredits = 0L
  private var creditExpiresAt = 0L

  override fun onCreate() {
    super.onCreate()
    sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
    stepDetector = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR)
    stepCounter = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
    createNotificationChannel()
    val snapshot = seedAndRead(this, 0)
    startForeground(NOTIFICATION_ID, notification(snapshot.second))
    stepDetector?.let {
      sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_FASTEST)
    }
    stepCounter?.let {
      sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL)
    }
    startedAt = System.currentTimeMillis()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    setEnabled(this, true)
    val initial = intent?.getLongExtra(EXTRA_INITIAL_TODAY, 0) ?: 0
    val snapshot = seedAndRead(this, initial)
    updateNotification(snapshot.second)
    broadcast(snapshot.first, snapshot.second, 0)
    return START_STICKY
  }

  override fun onSensorChanged(event: SensorEvent) {
    when (event.sensor.type) {
      Sensor.TYPE_STEP_DETECTOR -> recordDetectorStep()
      Sensor.TYPE_STEP_COUNTER -> reconcileCounter(event.values.firstOrNull()?.toLong() ?: return)
    }
  }

  private fun recordDetectorStep() {
    val now = System.currentTimeMillis()
    if (counterLeadCredits > 0 && now <= creditExpiresAt) {
      counterLeadCredits -= 1
      return
    }
    if (now > creditExpiresAt) counterLeadCredits = 0

    val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val (date, current) = ensureToday(prefs)
    val next = current + 1
    val pending = prefs.getLong(KEY_PENDING_DETECTOR, 0) + 1
    val lifetime = prefs.getLong(KEY_LIFETIME_STEPS, 0) + 1
    prefs.edit()
      .putLong(KEY_STEPS, next)
      .putLong(KEY_PENDING_DETECTOR, pending)
      .putLong(KEY_LIFETIME_STEPS, lifetime)
      .apply()
    publish(date, next, 1)
  }

  private fun reconcileCounter(raw: Long) {
    val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val (date, current) = ensureToday(prefs)
    val previousRaw = prefs.getLong(KEY_LAST_RAW, -1)
    if (previousRaw < 0 || raw < previousRaw) {
      prefs.edit().putLong(KEY_LAST_RAW, raw).apply()
      return
    }

    val rawDelta = (raw - previousRaw).coerceAtLeast(0)
    var pending = prefs.getLong(KEY_PENDING_DETECTOR, 0)
    val matched = min(pending, rawDelta)
    pending -= matched
    val additional = rawDelta - matched
    val next = current + additional
    val lifetime = prefs.getLong(KEY_LIFETIME_STEPS, 0) + additional
    prefs.edit()
      .putLong(KEY_LAST_RAW, raw)
      .putLong(KEY_PENDING_DETECTOR, pending)
      .putLong(KEY_STEPS, next)
      .putLong(KEY_LIFETIME_STEPS, lifetime)
      .apply()

    if (additional in 1..2 && System.currentTimeMillis() - startedAt > 1500) {
      counterLeadCredits = additional
      creditExpiresAt = System.currentTimeMillis() + 1500
    }
    if (additional > 0) publish(date, next, additional)
  }

  private fun publish(date: String, today: Long, delta: Long) {
    updateNotification(today)
    broadcast(date, today, delta)
  }

  private fun broadcast(date: String, today: Long, delta: Long) {
    val lifetime = lifetimeSteps(this)
    sendBroadcast(
      Intent(ACTION_STEP_UPDATE)
        .setPackage(packageName)
        .putExtra(EXTRA_DATE, date)
        .putExtra(EXTRA_TODAY, today)
        .putExtra(EXTRA_DELTA, delta)
        .putExtra(EXTRA_LIFETIME, lifetime)
    )
  }

  private fun updateNotification(today: Long) {
    (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
      .notify(NOTIFICATION_ID, notification(today))
  }

  private fun notification(today: Long): Notification {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    val pendingIntent = launchIntent?.let {
      PendingIntent.getActivity(
        this,
        0,
        it,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("RepDrop is counting steps")
      .setContentText("$today steps today")
      .setSmallIcon(android.R.drawable.ic_menu_directions)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setCategory(Notification.CATEGORY_SERVICE)
      .setContentIntent(pendingIntent)
      .build()
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.createNotificationChannel(
      NotificationChannel(
        CHANNEL_ID,
        "Background step counting",
        NotificationManager.IMPORTANCE_LOW
      ).apply {
        description = "Keeps RepDrop's pedometer active when the app is closed."
      }
    )
  }

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onDestroy() {
    sensorManager.unregisterListener(this)
    super.onDestroy()
  }

  companion object {
    const val ACTION_STEP_UPDATE = "com.m1l3s99.ironbound.STEP_UPDATE"
    const val EXTRA_DATE = "date"
    const val EXTRA_TODAY = "today"
    const val EXTRA_DELTA = "delta"
    const val EXTRA_LIFETIME = "lifetime"
    const val EXTRA_INITIAL_TODAY = "initialToday"
    const val PREFS = "ironbound_background_steps"
    const val KEY_ENABLED = "enabled"
    const val KEY_DATE = "date"
    const val KEY_STEPS = "steps"
    const val KEY_LAST_RAW = "lastRaw"
    const val KEY_PENDING_DETECTOR = "pendingDetector"
    const val KEY_LIFETIME_STEPS = "lifetimeSteps"
    private const val CHANNEL_ID = "ironbound_step_tracking"
    private const val NOTIFICATION_ID = 7321

    fun seedAndRead(context: Context, initialToday: Long): Pair<String, Long> {
      val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      val (date, current) = ensureToday(prefs)
      val next = maxOf(current, initialToday)
      if (next != current) prefs.edit().putLong(KEY_STEPS, next).apply()
      return date to next
    }

    fun setEnabled(context: Context, enabled: Boolean) {
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .edit()
        .putBoolean(KEY_ENABLED, enabled)
        .apply()
    }

    fun isEnabled(context: Context): Boolean =
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .getBoolean(KEY_ENABLED, false)

    fun lifetimeSteps(context: Context): Long =
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .getLong(KEY_LIFETIME_STEPS, 0)

    private fun ensureToday(
      prefs: android.content.SharedPreferences
    ): Pair<String, Long> {
      val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
      if (prefs.getString(KEY_DATE, null) != today) {
        prefs.edit()
          .putString(KEY_DATE, today)
          .putLong(KEY_STEPS, 0)
          .putLong(KEY_PENDING_DETECTOR, 0)
          .apply()
        return today to 0L
      }
      return today to prefs.getLong(KEY_STEPS, 0)
    }
  }
}
