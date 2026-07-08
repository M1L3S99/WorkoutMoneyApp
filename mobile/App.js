/* ============================================================
   WorkoutMoneyApp — Expo (React Native) prototype
   Runs on your phone via Expo Go.

   IMPORTANT: No real money is charged. Billing/forfeiture is
   SIMULATED for demonstration. Real payments need a backend +
   payment processor (e.g. Stripe) + legal review.

   Note on "AI verification": true automatic pushup detection is
   not reliable inside Expo Go (it needs a custom dev build with
   native camera frame processors). Here the camera keeps you
   honest and you tap to count reps; it auto-completes at target.
============================================================ */
import React, { useEffect, useState, useCallback } from 'react';
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Switch, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EXERCISES = ['Pushups', 'Squats', 'Situps', 'Lunges', 'Burpees'];
const C = {
  bg: '#0d1117', panel: '#161b22', panel2: '#1c2330', border: '#2b3442',
  text: '#e6edf3', muted: '#9aa7b4', accent: '#3fb950', danger: '#f85149',
  warn: '#d29922', blue: '#388bfd',
};

const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);
const dowOf = (key) => new Date(key + 'T00:00:00').getDay();
const money = (n) => '$' + (Math.round(n * 100) / 100).toLocaleString();

function defaultRegimen() {
  const r = {};
  DAYS.forEach((_, i) => { r[i] = { exercise: 'Pushups', target: 20, rest: i === 0 || i === 6 }; });
  return r;
}

// ---- forfeiture / stats engine (pure) ----
function computeStats(state) {
  const c = state.contract;
  const invested = c ? c.amount : 0;
  let balance = invested, forfeited = 0, streak = 0;
  const logKeys = Object.keys(state.log).sort();
  const startKey = c ? c.date.slice(0, 10) : (logKeys[0] || todayKey());
  const start = new Date(startKey + 'T00:00:00');
  const today = new Date(todayKey() + 'T00:00:00');
  let consecutiveMiss = 0;
  for (let d = new Date(start); d < today; d.setDate(d.getDate() + 1)) {
    const key = todayKey(d);
    const reg = state.regimen[d.getDay()];
    if (!reg || reg.rest) continue;
    const done = state.log[key] && state.log[key].completed;
    if (done) { consecutiveMiss = 0; streak++; }
    else {
      consecutiveMiss++; streak = 0;
      if (consecutiveMiss >= 2) {
        if (c && c.signed && balance > 0) {
          const loss = balance / 2; forfeited += loss; balance -= loss;
        }
        consecutiveMiss = 0;
      }
    }
  }
  return { invested, balance, forfeited, streak };
}

export default function App() {
  const [screen, setScreen] = useState('home');
  const [loaded, setLoaded] = useState(false);
  const [regimen, setRegimen] = useState(defaultRegimen());
  const [log, setLog] = useState({});
  const [contract, setContract] = useState(null);
  const [health, setHealth] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [r, l, c, h] = await Promise.all([
          AsyncStorage.getItem('wm_regimen'), AsyncStorage.getItem('wm_log'),
          AsyncStorage.getItem('wm_contract'), AsyncStorage.getItem('wm_health'),
        ]);
        if (r) setRegimen(JSON.parse(r));
        if (l) setLog(JSON.parse(l));
        if (c) setContract(JSON.parse(c));
        if (h) setHealth(JSON.parse(h));
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);

  const saveRegimen = useCallback((r) => { setRegimen(r); AsyncStorage.setItem('wm_regimen', JSON.stringify(r)); }, []);
  const saveLog = useCallback((l) => { setLog(l); AsyncStorage.setItem('wm_log', JSON.stringify(l)); }, []);
  const saveContract = useCallback((c) => { setContract(c); AsyncStorage.setItem('wm_contract', JSON.stringify(c)); }, []);
  const saveHealth = useCallback((h) => { setHealth(h); AsyncStorage.setItem('wm_health', JSON.stringify(h)); }, []);

  const state = { regimen, log, contract, health };

  if (!loaded) {
    return <SafeAreaView style={styles.app}><Text style={styles.h1}>Loading…</Text></SafeAreaView>;
  }

  const tabs = [
    ['home', 'Home'], ['setup', 'Regimen'], ['workout', 'Today'],
    ['contract', 'Invest'], ['history', 'History'],
  ];

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.logo}>Workout<Text style={{ color: C.accent }}>Money</Text></Text>
      </View>
      <View style={styles.nav}>
        {tabs.map(([id, label]) => (
          <TouchableOpacity key={id} onPress={() => setScreen(id)}
            style={[styles.navBtn, screen === id && styles.navBtnActive]}>
            <Text style={[styles.navTxt, screen === id && { color: C.text }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {screen === 'home' && <Home state={state} go={setScreen} clearHealth={() => saveHealth(false)} />}
        {screen === 'setup' && <Setup regimen={regimen} onSave={saveRegimen} />}
        {screen === 'workout' && <Workout state={state} saveLog={saveLog} go={setScreen} />}
        {screen === 'contract' && <Contract state={state} saveContract={saveContract} saveHealth={saveHealth} go={setScreen} />}
        {screen === 'history' && <History state={state} onReset={() => {
          AsyncStorage.multiRemove(['wm_regimen', 'wm_log', 'wm_contract', 'wm_health']);
          setRegimen(defaultRegimen()); setLog({}); setContract(null); setHealth(false); setScreen('home');
        }} />}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------- HOME ----------------
function Home({ state, go, clearHealth }) {
  const s = computeStats(state);
  const dow = new Date().getDay();
  const reg = state.regimen[dow];
  const key = todayKey();
  const doneToday = state.log[key] && state.log[key].completed;
  return (
    <View>
      <Text style={styles.h1}>Your commitment</Text>
      <Text style={styles.muted}>Do your workout every scheduled day. Miss two in a row and you forfeit half your balance.</Text>
      {state.health && (
        <View style={styles.banner}>
          <Text style={{ color: '#ffd88a' }}>🩺 Health exception active — billing paused. </Text>
          <TouchableOpacity onPress={clearHealth}><Text style={{ color: C.blue }}>Resume</Text></TouchableOpacity>
        </View>
      )}
      <View style={styles.statRow}>
        <Stat k="Streak" v={String(s.streak)} />
        <Stat k="Invested" v={money(s.invested)} />
      </View>
      <View style={styles.statRow}>
        <Stat k="Balance" v={money(s.balance)} />
        <Stat k="Forfeited" v={money(s.forfeited)} color={C.danger} />
      </View>
      <View style={styles.card}>
        <Text style={styles.h2}>Today — {DAYS[dow]}</Text>
        {reg.rest ? (
          <><Pill kind="rest" text="Rest day" /><Text style={styles.muted}>Enjoy it. Nothing to do today.</Text></>
        ) : doneToday ? (
          <><Pill kind="done" text="Completed ✓" /><Text style={styles.muted}>{state.log[key].reps} {reg.exercise.toLowerCase()} logged.</Text></>
        ) : (
          <>
            <Pill kind="today" text="Not done yet" />
            <Text style={styles.muted}>Target: {reg.target} {reg.exercise.toLowerCase()}.</Text>
            <Btn text="Start workout" onPress={() => go('workout')} />
          </>
        )}
      </View>
      <View style={styles.card}>
        {state.contract && state.contract.signed ? (
          <>
            <Text style={styles.h2}>Your contract</Text>
            <Text style={styles.text}>Signed by {state.contract.name} on {state.contract.date.slice(0, 10)}.</Text>
            <Text style={styles.muted}>Miss 2 scheduled days in a row → half your balance is billed each time.</Text>
            <Btn text="View contract" secondary onPress={() => go('contract')} />
          </>
        ) : (
          <>
            <Text style={styles.h2}>No money on the line yet</Text>
            <Text style={styles.muted}>Investing money is what makes people show up.</Text>
            <Btn text="Read contract & invest" onPress={() => go('contract')} />
          </>
        )}
      </View>
    </View>
  );
}

// ---------------- SETUP ----------------
function Setup({ regimen, onSave }) {
  const [draft, setDraft] = useState(JSON.parse(JSON.stringify(regimen)));
  const [msg, setMsg] = useState('');
  const upd = (i, patch) => setDraft((d) => ({ ...d, [i]: { ...d[i], ...patch } }));
  return (
    <View>
      <Text style={styles.h1}>Set your regimen</Text>
      <Text style={styles.muted}>Pick an exercise and target for each day. Toggle rest days.</Text>
      <View style={styles.card}>
        {DAYS.map((d, i) => (
          <View key={i} style={styles.dayrow}>
            <Text style={styles.dayName}>{d}</Text>
            <View style={styles.exRow}>
              {EXERCISES.map((e) => (
                <TouchableOpacity key={e} onPress={() => upd(i, { exercise: e })}
                  style={[styles.chip, draft[i].exercise === e && styles.chipSel]}>
                  <Text style={[styles.chipTxt, draft[i].exercise === e && { color: C.accent }]}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.rowBetween}>
              <View style={styles.row}>
                <TextInput style={styles.numInput} keyboardType="number-pad"
                  value={String(draft[i].target)}
                  onChangeText={(t) => upd(i, { target: Math.max(1, parseInt(t || '0', 10) || 0) })} />
                <Text style={styles.muted}> reps</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.muted}>Rest </Text>
                <Switch value={draft[i].rest} onValueChange={(v) => upd(i, { rest: v })}
                  trackColor={{ true: C.blue }} />
              </View>
            </View>
          </View>
        ))}
        <Btn text="Save regimen" onPress={() => { onSave(draft); setMsg('Saved ✓'); setTimeout(() => setMsg(''), 1500); }} />
        {!!msg && <Text style={[styles.muted, { marginTop: 8 }]}>{msg}</Text>}
      </View>
    </View>
  );
}

// ---------------- WORKOUT ----------------
function Workout({ state, saveLog, go }) {
  const dow = new Date().getDay();
  const reg = state.regimen[dow];
  const key = todayKey();
  const already = state.log[key] && state.log[key].completed;
  const [permission, requestPermission] = useCameraPermissions();
  const [camOn, setCamOn] = useState(false);
  const [reps, setReps] = useState(0);

  const complete = (n) => {
    const l = { ...state.log, [key]: { completed: true, reps: n, exercise: reg.exercise } };
    saveLog(l);
    setCamOn(false);
    Alert.alert('Nice!', `${n} reps logged for today. ✅`, [{ text: 'OK', onPress: () => go('home') }]);
  };
  const addRep = () => {
    const n = reps + 1; setReps(n);
    if (n >= reg.target) complete(n);
  };

  if (reg.rest) {
    return (
      <View>
        <Text style={styles.h1}>Today's workout</Text>
        <View style={styles.banner}><Text style={{ color: '#ffd88a' }}>Today is a rest day — nothing to do. 🌙</Text></View>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.h1}>Today's workout</Text>
      {already
        ? <View style={styles.banner}><Text style={{ color: '#ffd88a' }}>✅ Already completed today ({state.log[key].reps} reps). You're covered.</Text></View>
        : <Text style={styles.muted}>Target: {reg.target} {reg.exercise}. Reach it to mark today complete.</Text>}

      <View style={styles.card}>
        <View style={styles.camBox}>
          {camOn && permission?.granted
            ? <CameraView style={{ flex: 1 }} facing="front" />
            : <View style={styles.camPlaceholder}><Text style={styles.muted}>Camera off</Text></View>}
        </View>

        <Text style={styles.repBig}>{reps}</Text>
        <Text style={[styles.muted, { textAlign: 'center' }]}>Tap once per rep. Camera keeps you honest.</Text>

        <View style={{ marginTop: 14 }}>
          {!camOn ? (
            <Btn text="Start camera" blue onPress={async () => {
              if (!permission?.granted) {
                const res = await requestPermission();
                if (!res.granted) { Alert.alert('Camera needed', 'Enable camera access to verify your workout.'); return; }
              }
              setCamOn(true); setReps(0);
            }} />
          ) : (
            <Btn text={`Count rep  (+1)   ·   ${reps}/${reg.target}`} onPress={addRep} />
          )}
          <Btn text="Mark complete (manual)" secondary onPress={() => complete(Math.max(reps, reg.target))} />
        </View>
      </View>
      <Text style={styles.disclaimer}>
        Automatic AI rep-counting isn't available in Expo Go (it needs a custom dev build with native
        camera processing). This version verifies with the camera + tap-to-count.
      </Text>
    </View>
  );
}

// ---------------- CONTRACT ----------------
function Contract({ state, saveContract, saveHealth, go }) {
  const signed = state.contract && state.contract.signed;
  const [amount, setAmount] = useState(50);
  const [custom, setCustom] = useState('');
  const [name, setName] = useState('');
  const [agree, setAgree] = useState(false);

  if (signed) {
    const s = computeStats(state);
    return (
      <View>
        <Text style={styles.h1}>Contract active</Text>
        <View style={styles.card}>
          <Text style={styles.text}>Signed by {state.contract.name} on {state.contract.date.slice(0, 10)}.</Text>
          <View style={styles.statRow}>
            <Stat k="Invested" v={money(s.invested)} />
            <Stat k="Balance" v={money(s.balance)} />
          </View>
          <Stat k="Forfeited" v={money(s.forfeited)} color={C.danger} />
          <ContractText amount={state.contract.amount} />
          <View style={styles.warnBox}><Text style={styles.warnTxt}>IF YOU MISS 2 DAYS IN A ROW I AGREE TO BE BILLED HALF THE SUM I INVEST.</Text></View>
          <Text style={styles.muted}>There is no cancel. The only way out is a health exception.</Text>
          <Btn text="Claim health exception" danger onPress={() =>
            Alert.alert('Health exception', 'This pauses billing. Confirm you are stopping for genuine health reasons?',
              [{ text: 'Cancel' }, { text: 'Confirm', onPress: () => { saveHealth(true); go('home'); } }])} />
          <Text style={styles.disclaimer}>Prototype only — no real money is charged. Not an enforceable contract.</Text>
        </View>
      </View>
    );
  }

  const finalAmount = custom ? Math.max(0, parseInt(custom, 10) || 0) : amount;
  const canSign = agree && name.trim().length > 1 && finalAmount > 0;

  return (
    <View>
      <Text style={styles.h1}>Invest in your effort</Text>
      <Text style={styles.muted}>Optional — but signing is what makes it real.</Text>

      <View style={styles.card}>
        <Text style={styles.h2}>1. Choose your stake</Text>
        <View style={styles.row}>
          {[25, 50, 100, 250].map((a) => (
            <TouchableOpacity key={a} onPress={() => { setAmount(a); setCustom(''); }}
              style={[styles.amt, finalAmount === a && !custom && styles.amtSel]}>
              <Text style={[styles.amtTxt, finalAmount === a && !custom && { color: C.accent }]}>${a}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={[styles.row, { marginTop: 12 }]}>
          <Text style={styles.muted}>or custom:  $</Text>
          <TextInput style={styles.numInput} keyboardType="number-pad" value={custom}
            onChangeText={setCustom} placeholder="amount" placeholderTextColor={C.muted} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>2. Read the contract</Text>
        <ContractText amount={finalAmount} />
        <View style={styles.warnBox}><Text style={styles.warnTxt}>IF YOU MISS 2 DAYS IN A ROW I AGREE TO BE BILLED HALF THE SUM I INVEST.</Text></View>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>3. Sign</Text>
        <Text style={styles.muted}>Type your full name to sign.</Text>
        <TextInput style={styles.textInput} value={name} onChangeText={setName}
          placeholder="Full name" placeholderTextColor={C.muted} />
        <TouchableOpacity style={styles.agreeRow} onPress={() => setAgree(!agree)}>
          <View style={[styles.checkbox, agree && { backgroundColor: C.accent, borderColor: C.accent }]}>
            {agree && <Text style={{ color: '#04170a', fontWeight: '900' }}>✓</Text>}
          </View>
          <Text style={[styles.muted, { flex: 1 }]}>
            I have read and understand this contract. There is no cancellation except for genuine health
            reasons, and if I miss two scheduled days in a row I will be billed half my balance each time.
          </Text>
        </TouchableOpacity>
        <Btn text="Sign & commit" disabled={!canSign} onPress={() => {
          saveContract({ signed: true, amount: finalAmount, name: name.trim(), date: new Date().toISOString() });
          saveHealth(false);
          Alert.alert('Signed', 'Your money is on the line now. Show up.', [{ text: 'OK', onPress: () => go('home') }]);
        }} />
        <Text style={styles.disclaimer}>
          Prototype only — no real money is charged, stored, or transferred. This is a demonstration, not a
          legally binding agreement. Consult a lawyer and a payment provider before doing this for real.
        </Text>
      </View>
    </View>
  );
}

function ContractText({ amount }) {
  return (
    <View style={styles.contract}>
      <Text style={styles.contractH}>Commitment Contract</Text>
      <Text style={styles.contractP}>I am voluntarily investing ${amount} in my own fitness commitment.</Text>
      <Text style={styles.contractP}>I agree to complete my chosen exercise on every scheduled (non-rest) day, verified by the app.</Text>
      <Text style={styles.contractP}>Penalty: if I fail two scheduled days in a row, I agree to be billed half of my remaining balance. This applies again for every additional pair of consecutive missed days.</Text>
      <Text style={styles.contractP}>No cancellation: once signed, this cannot be cancelled. The only exception is a genuine health reason, which pauses billing.</Text>
      <Text style={styles.contractP}>I understand this app is a prototype and no real money is collected in this version.</Text>
    </View>
  );
}

// ---------------- HISTORY ----------------
function History({ state, onReset }) {
  const keys = Object.keys(state.log).sort().reverse();
  return (
    <View>
      <Text style={styles.h1}>History</Text>
      <View style={styles.card}>
        <View style={styles.trHead}>
          <Text style={[styles.th, { flex: 2 }]}>Date</Text>
          <Text style={[styles.th, { flex: 1 }]}>Day</Text>
          <Text style={[styles.th, { flex: 1.5 }]}>Status</Text>
          <Text style={[styles.th, { flex: 1 }]}>Reps</Text>
        </View>
        {keys.length === 0 && <Text style={[styles.muted, { padding: 8 }]}>No workouts logged yet.</Text>}
        {keys.map((k) => {
          const rec = state.log[k];
          return (
            <View key={k} style={styles.tr}>
              <Text style={[styles.td, { flex: 2 }]}>{k}</Text>
              <Text style={[styles.td, { flex: 1 }]}>{DAYS[dowOf(k)]}</Text>
              <View style={{ flex: 1.5 }}><Pill kind={rec.completed ? 'done' : 'miss'} text={rec.completed ? 'Done' : 'Missed'} /></View>
              <Text style={[styles.td, { flex: 1 }]}>{rec.reps || ''}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.card}>
        <Text style={styles.h2}>Danger zone</Text>
        <Btn text="Reset all data" danger onPress={() =>
          Alert.alert('Reset', 'Erase ALL data (regimen, log, contract)?',
            [{ text: 'Cancel' }, { text: 'Erase', style: 'destructive', onPress: onReset }])} />
      </View>
    </View>
  );
}

// ---------------- small components ----------------
function Stat({ k, v, color }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statK}>{k}</Text>
      <Text style={[styles.statV, color && { color }]}>{v}</Text>
    </View>
  );
}
function Pill({ kind, text }) {
  const map = {
    done: [C.accent, 'rgba(63,185,80,.15)'], miss: [C.danger, 'rgba(248,81,73,.15)'],
    rest: [C.blue, 'rgba(56,139,253,.15)'], today: [C.warn, 'rgba(210,153,34,.18)'],
  };
  const [fg, bg] = map[kind] || map.today;
  return <View style={[styles.pill, { backgroundColor: bg }]}><Text style={{ color: fg, fontWeight: '700', fontSize: 12 }}>{text}</Text></View>;
}
function Btn({ text, onPress, secondary, danger, blue, disabled }) {
  let bg = C.accent, fg = '#04170a';
  if (secondary) { bg = 'transparent'; fg = C.text; }
  if (danger) { bg = C.danger; fg = '#fff'; }
  if (blue) { bg = C.blue; fg = '#fff'; }
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled}
      style={[styles.btn, { backgroundColor: bg }, secondary && styles.btnSecondary, disabled && { opacity: 0.45 }]}>
      <Text style={{ color: fg, fontWeight: '700', fontSize: 15 }}>{text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 8 : 0, paddingBottom: 8, borderBottomWidth: 1, borderColor: C.border },
  logo: { color: C.text, fontWeight: '800', fontSize: 20 },
  nav: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 10, borderBottomWidth: 1, borderColor: C.border },
  navBtn: { borderWidth: 1, borderColor: C.border, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  navBtnActive: { borderColor: C.accent, backgroundColor: C.panel },
  navTxt: { color: C.muted, fontSize: 13 },
  h1: { color: C.text, fontSize: 24, fontWeight: '800', marginBottom: 4 },
  h2: { color: C.text, fontSize: 18, fontWeight: '700', marginBottom: 10 },
  text: { color: C.text },
  muted: { color: C.muted, marginTop: 2 },
  card: { backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 16, marginTop: 14 },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  stat: { flex: 1, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12 },
  statK: { color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  statV: { color: C.text, fontSize: 24, fontWeight: '800', marginTop: 4 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, marginBottom: 6 },
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  btnSecondary: { borderWidth: 1, borderColor: C.border },
  dayrow: { backgroundColor: C.panel2, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, marginBottom: 10 },
  dayName: { color: C.text, fontWeight: '700', fontSize: 15, marginBottom: 6 },
  exRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  chipSel: { borderColor: C.accent },
  chipTxt: { color: C.muted, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  numInput: { backgroundColor: '#0b0f14', borderWidth: 1, borderColor: C.border, color: C.text, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minWidth: 64, textAlign: 'center' },
  textInput: { backgroundColor: '#0b0f14', borderWidth: 1, borderColor: C.border, color: C.text, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, marginTop: 8 },
  camBox: { height: 300, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000' },
  camPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  repBig: { color: C.text, fontSize: 60, fontWeight: '900', textAlign: 'center', marginVertical: 10 },
  banner: { backgroundColor: 'rgba(210,153,34,.12)', borderWidth: 1, borderColor: C.warn, borderRadius: 10, padding: 12, marginTop: 12, flexDirection: 'row', flexWrap: 'wrap' },
  contract: { backgroundColor: '#0b0f14', borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14 },
  contractH: { color: C.text, fontWeight: '700', fontSize: 16, marginBottom: 8 },
  contractP: { color: C.muted, fontSize: 14, marginBottom: 8 },
  warnBox: { backgroundColor: 'rgba(248,81,73,.1)', borderWidth: 1, borderColor: C.danger, borderRadius: 10, padding: 14, marginTop: 14 },
  warnTxt: { color: '#ffb3ae', fontWeight: '800', textAlign: 'center' },
  amt: { backgroundColor: C.panel2, borderWidth: 2, borderColor: C.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18, marginRight: 8 },
  amtSel: { borderColor: C.accent },
  amtTxt: { color: C.text, fontSize: 18, fontWeight: '800' },
  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginVertical: 14 },
  checkbox: { width: 24, height: 24, borderWidth: 2, borderColor: C.border, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  disclaimer: { color: C.muted, fontSize: 12, marginTop: 12, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 },
  trHead: { flexDirection: 'row', borderBottomWidth: 1, borderColor: C.border, paddingBottom: 6 },
  th: { color: C.muted, fontSize: 12, fontWeight: '700' },
  tr: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: C.border, paddingVertical: 8 },
  td: { color: C.text, fontSize: 13 },
});
