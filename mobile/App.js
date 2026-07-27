import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pedometer } from 'expo-sensors';
import { WebView } from 'react-native-webview';

const GAME_URL = 'https://m1l3s99.github.io/WorkoutMoneyApp/';
const STEP_STORAGE_KEY = 'ironbound-native-daily-steps-v1';
const PERMISSION_ASKED_KEY = 'ironbound-native-pedometer-permission-asked-v1';
const BACKGROUND_SETUP_KEY = 'ironbound-background-tracking-setup-v1';
const immediateStepDetector =
  Platform.OS === 'android' ? NativeModules.IronboundStepDetector : null;
const colours = {
  bg: '#020b19',
  panel: '#071a34',
  line: '#208de0',
  text: '#f5f9ff',
  muted: '#9db8d6',
  accent: '#45b5ff',
};

const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function App() {
  const webRef = useRef(null);
  const subscriptionRef = useRef(null);
  const detectorSubscriptionRef = useRef(null);
  const detectorActiveRef = useRef(false);
  const detectorStartedAtRef = useRef(0);
  const pendingDetectorStepsRef = useRef(0);
  const counterLeadCreditRef = useRef({ count: 0, expiresAt: 0 });
  const sensorCountRef = useRef(0);
  const sensorPrimedRef = useRef(false);
  const dailyRef = useRef({ date: localDateKey(), steps: 0, lastRaw: null });
  const permissionRef = useRef({ status: 'undetermined', canAskAgain: true });
  const [webReady, setWebReady] = useState(false);
  const [permissionCard, setPermissionCard] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('checking');

  const emitToGame = useCallback((payload) => {
    const message = {
      source: 'native',
      date: localDateKey(),
      today: dailyRef.current.steps,
      ...payload,
    };
    const detail = JSON.stringify(message).replace(/</g, '\\u003c');
    webRef.current?.injectJavaScript(
      `if(window.IronboundSteps&&typeof window.IronboundSteps.receive==='function'){window.IronboundSteps.receive(${detail})}else{window.dispatchEvent(new CustomEvent('ironbound-native-pedometer',{detail:${detail}}))}true;`
    );
  }, []);

  const saveDaily = useCallback(async () => {
    await AsyncStorage.setItem(STEP_STORAGE_KEY, JSON.stringify(dailyRef.current));
  }, []);

  const resetForNewDay = useCallback(() => {
    const today = localDateKey();
    if (dailyRef.current.date === today) return false;
    dailyRef.current = { date: today, steps: 0, lastRaw: dailyRef.current.lastRaw ?? null };
    sensorCountRef.current = 0;
    sensorPrimedRef.current = false;
    pendingDetectorStepsRef.current = 0;
    counterLeadCreditRef.current = { count: 0, expiresAt: 0 };
    saveDaily().catch(() => {});
    return true;
  }, [saveDaily]);

  const handleImmediateStep = useCallback((event = {}) => {
    resetForNewDay();
    const now = Date.now();
    const nativeToday = Number(event.today);
    if (Number.isFinite(nativeToday) && nativeToday >= 0) {
      dailyRef.current.steps = Math.floor(nativeToday);
      saveDaily().catch(() => {});
      emitToGame({
        status: 'granted',
        source: 'background-step-service',
        delta: Math.max(0, Math.floor(Number(event.delta || 0))),
        sampleAt: now,
      });
      return;
    }
    const counterCredit = counterLeadCreditRef.current;
    if (counterCredit.count > 0 && now <= counterCredit.expiresAt) {
      counterCredit.count -= 1;
      emitToGame({
        status: 'granted',
        source: 'step-detector',
        delta: 0,
        sampleAt: now,
      });
      return;
    }
    if (now > counterCredit.expiresAt) {
      counterLeadCreditRef.current = { count: 0, expiresAt: 0 };
    }
    pendingDetectorStepsRef.current += 1;
    dailyRef.current.steps += 1;
    saveDaily().catch(() => {});
    emitToGame({
      status: 'granted',
      source: 'step-detector',
      delta: 1,
      sampleAt: now,
    });
  }, [emitToGame, resetForNewDay, saveDaily]);

  const startImmediateDetector = useCallback(async () => {
    if (!immediateStepDetector) return false;
    const available = await immediateStepDetector.isAvailable();
    if (!available) return false;
    detectorSubscriptionRef.current?.remove?.();
    detectorSubscriptionRef.current = new NativeEventEmitter(immediateStepDetector).addListener(
      'IronboundStepDetected',
      handleImmediateStep
    );
    const result = await immediateStepDetector.start(dailyRef.current.steps);
    const started = result?.started ?? result === true;
    if (!started) {
      detectorSubscriptionRef.current?.remove?.();
      detectorSubscriptionRef.current = null;
      return false;
    }
    const nativeToday = Number(result?.today);
    if (Number.isFinite(nativeToday) && nativeToday >= 0) {
      dailyRef.current.steps = Math.floor(nativeToday);
      saveDaily().catch(() => {});
    }
    detectorActiveRef.current = true;
    detectorStartedAtRef.current = Date.now();
    return true;
  }, [handleImmediateStep]);

  const stopTracking = useCallback(() => {
    subscriptionRef.current?.remove?.();
    subscriptionRef.current = null;
    detectorSubscriptionRef.current?.remove?.();
    detectorSubscriptionRef.current = null;
    detectorActiveRef.current = false;
    detectorStartedAtRef.current = 0;
    immediateStepDetector?.stop?.().catch?.(() => {});
    sensorCountRef.current = 0;
    sensorPrimedRef.current = false;
  }, []);

  const startTracking = useCallback(async () => {
    stopTracking();
    resetForNewDay();
    const counterAvailable = await Pedometer.isAvailableAsync();
    const detectorAvailable = await startImmediateDetector();
    if (!counterAvailable && !detectorAvailable) {
      setPermissionStatus('unavailable');
      emitToGame({
        status: 'unavailable',
        message: 'This phone does not report a hardware step sensor.',
      });
      return;
    }
    setPermissionStatus('granted');
    emitToGame({
      status: 'granted',
      source: detectorAvailable ? 'step-detector' : 'hardware',
      delta: 0,
    });
    if (Platform.OS === 'android' && detectorAvailable) return;
    if (!counterAvailable) return;

    const applyCounterDelta = (rawDelta) => {
      const delta = Math.max(0, Math.floor(Number(rawDelta || 0)));
      let additional = delta;
      if (detectorActiveRef.current && additional) {
        const matched = Math.min(pendingDetectorStepsRef.current, additional);
        pendingDetectorStepsRef.current -= matched;
        additional -= matched;

        // Sensor callbacks can arrive in either order. If the cumulative counter
        // narrowly wins the race, suppress the matching detector event.
        const runningFor = Date.now() - detectorStartedAtRef.current;
        if (additional > 0 && additional <= 2 && runningFor > 1500) {
          counterLeadCreditRef.current = {
            count: additional,
            expiresAt: Date.now() + 1500,
          };
        }
      }
      if (additional) dailyRef.current.steps += additional;
      saveDaily().catch(() => {});
      emitToGame({
        status: 'granted',
        source: detectorActiveRef.current ? 'hybrid-hardware' : 'hardware',
        delta: additional,
        sampleAt: Date.now(),
      });
    };

    subscriptionRef.current = Pedometer.watchStepCount(({ steps, rawSteps }) => {
      resetForNewDay();
      const rawReading = Number(rawSteps);
      if (Number.isFinite(rawReading) && rawReading >= 0) {
        const previousRaw = dailyRef.current.lastRaw;
        const sessionReading = Math.max(0, Math.floor(Number(steps || 0)));
        const delta = Number.isFinite(previousRaw)
          ? rawReading >= previousRaw
            ? Math.max(0, Math.floor(rawReading - previousRaw))
            : sessionReading
          : sessionReading;
        dailyRef.current.lastRaw = rawReading;
        sensorPrimedRef.current = true;
        applyCounterDelta(delta);
        return;
      }
      const reading = Math.max(0, Math.floor(Number(steps || 0)));
      const delta = reading >= sensorCountRef.current ? reading - sensorCountRef.current : reading;
      sensorPrimedRef.current = true;
      sensorCountRef.current = reading;
      applyCounterDelta(delta);
    });
  }, [emitToGame, resetForNewDay, saveDaily, startImmediateDetector, stopTracking]);

  const requestPedometer = useCallback(async () => {
    try {
      setPermissionStatus('requesting');
      const result = await Pedometer.requestPermissionsAsync();
      permissionRef.current = result;
      if (!result.granted) {
        setPermissionStatus('denied');
        setPermissionCard(true);
        emitToGame({
          status: 'denied',
          canAskAgain: result.canAskAgain,
          message: result.canAskAgain
            ? 'Physical activity permission was not granted.'
            : 'Open Android settings and allow Physical activity for Ironbound.',
        });
        if (!result.canAskAgain) {
          Alert.alert(
            'Physical activity permission',
            'Allow Physical activity for Ironbound in Android settings.',
            [
              { text: 'Not now', style: 'cancel' },
              { text: 'Open settings', onPress: () => Linking.openSettings() },
            ]
          );
        }
        return;
      }
      if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
        const notificationResult = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (notificationResult !== PermissionsAndroid.RESULTS.GRANTED) {
          await startTracking();
          setPermissionStatus('notification-denied');
          setPermissionCard(true);
          emitToGame({
            status: 'notification-denied',
            message: 'Allow notifications so Android can keep the background step counter visible.',
          });
          return;
        }
      }
      if (Platform.OS === 'android' && immediateStepDetector) {
        const batteryAllowed =
          await immediateStepDetector.requestBatteryOptimizationExemption();
        if (!batteryAllowed) {
          await startTracking();
          setPermissionStatus('battery-denied');
          setPermissionCard(true);
          emitToGame({
            status: 'battery-denied',
            message: 'Allow background operation when Android asks so tracking can continue reliably.',
          });
          return;
        }
      }
      await startTracking();
      await AsyncStorage.setItem(BACKGROUND_SETUP_KEY, '1');
      setPermissionCard(false);
      if (Platform.OS === 'android') {
        Alert.alert(
          'Background tracking enabled',
          'Physical Activity, notifications, and background operation are enabled. Ironbound will keep counting with the app closed.',
          [{ text: 'Done' }]
        );
      }
    } catch (error) {
      setPermissionStatus('error');
      setPermissionCard(true);
      emitToGame({
        status: 'error',
        message: error?.message || 'The native pedometer could not start.',
      });
    }
  }, [emitToGame, startTracking]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const saved = JSON.parse((await AsyncStorage.getItem(STEP_STORAGE_KEY)) || '{}');
        dailyRef.current =
          saved.date === localDateKey()
            ? {
                date: saved.date,
                steps: Math.max(0, Math.floor(Number(saved.steps || 0))),
                lastRaw:
                  saved.lastRaw !== null && saved.lastRaw !== undefined && Number.isFinite(Number(saved.lastRaw))
                    ? Number(saved.lastRaw)
                    : null,
              }
            : {
                date: localDateKey(),
                steps: 0,
                lastRaw:
                  saved.lastRaw !== null && saved.lastRaw !== undefined && Number.isFinite(Number(saved.lastRaw))
                    ? Number(saved.lastRaw)
                    : null,
              };
      } catch {
        dailyRef.current = { date: localDateKey(), steps: 0, lastRaw: null };
      }
      try {
        const permission = await Pedometer.getPermissionsAsync();
        if (!mounted) return;
        permissionRef.current = permission;
        if (permission.granted) {
          await startTracking();
          if (
            Platform.OS === 'android' &&
            (await AsyncStorage.getItem(BACKGROUND_SETUP_KEY)) !== '1'
          ) {
            setPermissionCard(true);
          }
        } else {
          setPermissionStatus(permission.status || 'undetermined');
          const alreadyAsked = (await AsyncStorage.getItem(PERMISSION_ASKED_KEY)) === '1';
          if (!alreadyAsked && permission.canAskAgain !== false) {
            await AsyncStorage.setItem(PERMISSION_ASKED_KEY, '1');
            await requestPedometer();
          } else {
            setPermissionCard(true);
          }
        }
      } catch {
        if (mounted) {
          setPermissionStatus('undetermined');
          setPermissionCard(true);
        }
      }
    })();
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && permissionRef.current.granted) startTracking().catch(() => {});
    });
    return () => {
      mounted = false;
      appStateSubscription.remove();
      stopTracking();
    };
  }, [requestPedometer, startTracking, stopTracking]);

  const handleGameMessage = useCallback(
    ({ nativeEvent }) => {
      try {
        const message = JSON.parse(nativeEvent.data || '{}');
        if (message.type === 'requestPedometer') requestPedometer();
        if (message.type === 'pedometerReady') {
          emitToGame({
            status: permissionRef.current.granted ? 'granted' : permissionRef.current.status,
            canAskAgain: permissionRef.current.canAskAgain,
            delta: 0,
          });
        }
      } catch {
        // Ignore unrelated messages from the web game.
      }
    },
    [emitToGame, requestPedometer]
  );

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar barStyle="light-content" backgroundColor={colours.bg} />
      <WebView
        ref={webRef}
        source={{ uri: GAME_URL }}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        setSupportMultipleWindows={false}
        onMessage={handleGameMessage}
        onLoadEnd={() => {
          setWebReady(true);
          emitToGame({
            status: permissionRef.current.granted ? 'granted' : permissionRef.current.status,
            canAskAgain: permissionRef.current.canAskAgain,
            delta: 0,
          });
        }}
        renderError={() => (
          <View style={styles.center}>
            <Text style={styles.title}>Could not load Ironbound</Text>
            <Text style={styles.copy}>Connect to the internet and reopen the app.</Text>
          </View>
        )}
      />

      {!webReady && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colours.accent} />
          <Text style={styles.loadingText}>Loading Ironbound…</Text>
        </View>
      )}

      {permissionCard && (
        <View style={styles.scrim}>
          <View style={styles.permissionCard}>
            <View style={styles.icon}><Text style={styles.iconText}>◆</Text></View>
            <Text style={styles.title}>Enable background tracking</Text>
            <Text style={styles.copy}>
              Android will ask for Physical Activity, notifications, and background operation. Approve all three so Ironbound can keep counting after you close it.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              onPress={
                permissionStatus === 'denied' && permissionRef.current.canAskAgain === false
                  ? () => Linking.openSettings()
                  : requestPedometer
              }
            >
              <Text style={styles.primaryButtonText}>
                {permissionStatus === 'requesting'
                  ? 'Requesting…'
                  : permissionStatus === 'notification-denied'
                    ? 'Try notification permission'
                  : permissionStatus === 'battery-denied'
                    ? 'Allow background operation'
                  : permissionStatus === 'denied' && permissionRef.current.canAskAgain === false
                    ? 'Open Android settings'
                    : 'Enable background tracking'}
              </Text>
            </Pressable>
            <Pressable style={styles.laterButton} onPress={() => setPermissionCard(false)}>
              <Text style={styles.laterText}>Not now</Text>
            </Pressable>
            <Text style={styles.privacy}>Step totals stay on your phone and in your Ironbound save.</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colours.bg },
  web: { flex: 1, backgroundColor: colours.bg },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: colours.bg,
  },
  loadingText: { color: colours.text, fontSize: 14, fontWeight: '700' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: colours.bg,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    backgroundColor: 'rgba(0,6,16,.86)',
  },
  permissionCard: {
    width: '100%',
    maxWidth: 390,
    alignItems: 'center',
    padding: 24,
    borderWidth: 1,
    borderColor: colours.line,
    borderRadius: 24,
    backgroundColor: colours.panel,
  },
  icon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#0a4f87',
  },
  iconText: { color: '#8bd5ff', fontSize: 21 },
  title: { color: colours.text, fontSize: 20, fontWeight: '900', textAlign: 'center' },
  copy: {
    marginTop: 10,
    color: colours.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  primaryButton: {
    width: '100%',
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderRadius: 15,
    backgroundColor: '#208de0',
  },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  pressed: { opacity: 0.72 },
  laterButton: { paddingHorizontal: 20, paddingVertical: 13 },
  laterText: { color: colours.muted, fontSize: 13, fontWeight: '700' },
  privacy: { color: '#6885a5', fontSize: 10, lineHeight: 15, textAlign: 'center' },
});
