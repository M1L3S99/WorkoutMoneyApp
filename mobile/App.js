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
    if (!reg || reg.rest) continue;                 // rest day: never a requirement, never a miss
    const done = state.log[key] && state.log[key].completed;
    if (done) { consecutiveMiss = 0; streak++; }
    else {
      consecutiveMiss++; streak = 0;
      if (consecutiveMiss >= 2) {
        if (c && c.signed && balance > 0) { const loss = balance / 2; forfeited += loss; balance -= loss; }
        consecutiveMiss = 0;
      }
    }
  }
  return { invested, balance, forfeited, streak };
}

const TABS = [
  ['home', 'Home', '🏠'],
  ['workout', 'Today', '💪'],
  ['setup', 'Plan', '📋'],
  ['contract', 'Invest', '💰'],
  ['settings', 'Settings', '⚙️'],
];

export default function App() {
  const [screen, setScreen] = useState('home');
  const [loaded, setLoaded] = useState(false);
  const [regimen, setRegimen] = useState(defaultRegimen());
  const [log, setLog] = useState({});
  const [contract, setContract] = useState(null);
  const [health, setHealth] = useState(false);
  const [regimenSaved, setRegimenSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [r, l, c, h, rs] = await Promise.all([
          AsyncStorage.getItem('wm_regimen'), AsyncStorage.getItem('wm_log'),
          AsyncStorage.getItem('wm_contract'), AsyncStorage.getItem('wm_health'),
          AsyncStorage.getItem('wm_regimenSaved'),
        ]);
        if (r) setRegimen(JSON.parse(r));
        if (l) setLog(JSON.parse(l));
        if (c) setContract(JSON.parse(c));
        if (h) setHealth(JSON.parse(h));
        if (rs) setRegimenSaved(JSON.parse(rs));
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);

  const saveRegimen = useCallback((r) => { setRegimen(r); AsyncStorage.setItem('wm_regimen', JSON.stringify(r)); }, []);
  const saveLog = useCallback((l) => { setLog(l); AsyncStorage.setItem('wm_log', JSON.stringify(l)); }, []);
  const saveContract = useCallback((c) => { setContract(c); AsyncStorage.setItem('wm_contract', JSON.stringify(c)); }, []);
  const saveHealth = useCallback((h) => { setHealth(h); AsyncStorage.setItem('wm_health', JSON.stringify(h)); }, []);
  const saveRegimenSaved = useCallback((v) => { setRegimenSaved(v); AsyncStorage.setItem('wm_regimenSaved', JSON.stringify(v)); }, []);

  const resetAll = () => {
    AsyncStorage.multiRemove(['wm_regimen', 'wm_log', 'wm_contract', 'wm_health', 'wm_regimenSaved']);
    setRegimen(defaultRegimen()); setLog({}); setContract(null); setHealth(false); setRegimenSaved(false); setScreen('home');
  };

  const state = { regimen, log, contract, health, regimenSaved };

  if (!loaded) {
    return <SafeAreaView style={styles.app}><Text style={[styles.h1, { padding: 20 }]}>Loading…</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.logo}>Workout<Text style={{ color: C.accent }}>Money</Text></Text>
        <Text style={styles.headerSub}>Commit. Show up. Or pay up.</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {screen === 'home' && <Home state={state} go={setScreen} clearHealth={() => saveHealth(false)} />}
        {screen === 'setup' && <Setup regimen={regimen} onSave={saveRegimen} onSavedFlag={saveRegimenSaved} locked={!!(contract && contract.signed)} />}
        {screen === 'workout' && <Workout state={state} saveLog={saveLog} go={setScreen} />}
        {screen === 'contract' && <Contract state={state} saveContract={saveContract} saveHealth={saveHealth} go={setScreen} />}
        {screen === 'settings' && <Settings state={state} saveHealth={saveHealth} onReset={resetAll} go={setScreen} />}
        {screen === 'history' && <History state={state} go={setScreen} />}
      </ScrollView>

      <View style={styles.tabbar}>
        {TABS.map(([id, label, icon]) => {
          const active = screen === id || (id === 'settings' && screen === 'history');
          return (
            <TouchableOpacity key={id} style={styles.tabItem} onPress={() => setScreen(id)}>
              <View style={[styles.tabDot, active ? { backgroundColor: C.accent } : { backgroundColor: 'transparent' }]} />
              <Text style={[styles.tabIcon, !active && { opacity: 0.55 }]}>{icon}</Text>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
  const recent = Object.keys(state.log).sort().reverse().slice(0, 4);

  return (
    <View>
      <Text style={styles.h1}>Your commitment</Text>
      <Text style={styles.muted}>Do your workout every scheduled day. Miss two in a row and you forfeit half your balance.</Text>

      {state.health && (
        <View style={styles.banner}>
          <Text style={styles.bannerTxt}>🩺 Health exception active — billing paused. </Text>
          <TouchableOpacity onPress={clearHealth}><Text style={styles.link}>Resume</Text></TouchableOpacity>
        </View>
      )}

      <View style={styles.statGrid}>
        <Stat k="Streak" v={String(s.streak)} />
        <Stat k="Invested" v={money(s.invested)} />
        <Stat k="Balance" v={money(s.balance)} />
        <Stat k="Forfeited" v={money(s.forfeited)} color={C.danger} />
      </View>

      <Card>
        <View style={styles.cardHead}>
          <Text style={styles.h2}>Today · {DAYS[dow]}</Text>
          {reg.rest
            ? <Pill kind="rest" text="Rest day" />
            : doneToday ? <Pill kind="done" text="Done ✓" /> : <Pill kind="today" text="To do" />}
        </View>
        {reg.rest ? (
          <Text style={styles.muted}>🌙 It's a rest day — no workout required. Enjoy it.</Text>
        ) : doneToday ? (
          <Text style={styles.muted}>{state.log[key].reps} {reg.exercise.toLowerCase()} logged. See you tomorrow.</Text>
        ) : (
          <>
            <Text style={styles.muted}>Target: {reg.target} {reg.exercise.toLowerCase()}.</Text>
            <Btn text="Start workout" onPress={() => go('workout')} />
          </>
        )}
      </Card>

      <Card>
        {state.contract && state.contract.signed ? (
          <>
            <Text style={styles.h2}>Your contract</Text>
            <Text style={styles.text}>Signed by {state.contract.name} on {state.contract.date.slice(0, 10)}.</Text>
            <Text style={styles.muted}>Miss 2 scheduled days in a row → half your balance is billed each time.</Text>
          </>
        ) : (
          <>
            <Text style={styles.h2}>No money on the line yet</Text>
            <Text style={styles.muted}>Investing money is what makes people show up.</Text>
            <Btn text="Read contract & invest" onPress={() => go('contract')} />
          </>
        )}
      </Card>

      <Card>
        <View style={styles.cardHead}>
          <Text style={styles.h2}>Recent activity</Text>
          {recent.length > 0 && <TouchableOpacity onPress={() => go('history')}><Text style={styles.link}>View all</Text></TouchableOpacity>}
        </View>
        {recent.length === 0
          ? <Text style={styles.muted}>No workouts logged yet.</Text>
          : recent.map((k) => (
            <View key={k} style={styles.recentRow}>
              <Text style={styles.text}>{DAYS[dowOf(k)]} · {k}</Text>
              <Pill kind={state.log[k].completed ? 'done' : 'miss'} text={state.log[k].completed ? `${state.log[k].reps} reps` : 'Missed'} />
            </View>
          ))}
      </Card>
    </View>
  );
}

// ---------------- SETUP (Plan) ----------------
function Setup({ regimen, onSave, onSavedFlag, locked }) {
  const [draft, setDraft] = useState(JSON.parse(JSON.stringify(regimen)));
  const [msg, setMsg] = useState('');
  const upd = (i, patch) => { if (locked) return; setDraft((d) => ({ ...d, [i]: { ...d[i], ...patch } })); };
  return (
    <View>
      <Text style={styles.h1}>Your plan</Text>
      <Text style={styles.muted}>Pick an exercise and target for each day. Toggle rest days off if you train that day.</Text>
      {locked && (
        <View style={styles.lockBanner}>
          <Text style={styles.lockTxt}>🔒 Your plan is locked. You signed a contract, so it can no longer be changed.</Text>
        </View>
      )}
      {DAYS.map((d, i) => (
        <Card key={i} style={[locked && { opacity: 0.6 }]}>
          <View style={styles.cardHead}>
            <Text style={styles.dayName}>{d}</Text>
            <View style={styles.row}>
              <Text style={styles.muted}>Rest  </Text>
              <Switch value={draft[i].rest} disabled={locked} onValueChange={(v) => upd(i, { rest: v })}
                trackColor={{ true: C.blue, false: C.border }} thumbColor="#fff" />
            </View>
          </View>
          {draft[i].rest ? (
            <Text style={styles.muted}>Rest day — no workout required.</Text>
          ) : (
            <>
              <View style={styles.exRow}>
                {EXERCISES.map((e) => (
                  <TouchableOpacity key={e} disabled={locked} onPress={() => upd(i, { exercise: e })}
                    style={[styles.chip, draft[i].exercise === e && styles.chipSel]}>
                    <Text style={[styles.chipTxt, draft[i].exercise === e && { color: C.accent }]}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.row}>
                <TextInput style={styles.numInput} keyboardType="number-pad" editable={!locked}
                  value={String(draft[i].target)}
                  onChangeText={(t) => upd(i, { target: Math.max(1, parseInt(t || '0', 10) || 0) })} />
                <Text style={styles.muted}> reps target</Text>
              </View>
            </>
          )}
        </Card>
      ))}
      {!locked && (
        <>
          <Btn text="Save plan" onPress={() => {
            onSave(draft); onSavedFlag(true);
            setMsg('Saved ✓ — you can now invest'); setTimeout(() => setMsg(''), 2500);
          }} />
          {!!msg && <Text style={[styles.muted, { marginTop: 8, textAlign: 'center' }]}>{msg}</Text>}
        </>
      )}
    </View>
  );
}

// ---------------- WORKOUT (Today) ----------------
function Workout({ state, saveLog, go }) {
  const dow = new Date().getDay();
  const reg = state.regimen[dow];
  const key = todayKey();
  const already = state.log[key] && state.log[key].completed;
  const [permission, requestPermission] = useCameraPermissions();
  const [camOn, setCamOn] = useState(false);
  const [reps, setReps] = useState(0);

  // Rest day: no requirements at all.
  if (reg.rest) {
    return (
      <View>
        <Text style={styles.h1}>Today</Text>
        <Card>
          <Text style={{ fontSize: 40, textAlign: 'center' }}>🌙</Text>
          <Text style={[styles.h2, { textAlign: 'center', marginTop: 8 }]}>Rest day</Text>
          <Text style={[styles.muted, { textAlign: 'center' }]}>Nothing to do today. Rest days never count against you.</Text>
        </Card>
      </View>
    );
  }

  const complete = (n) => {
    saveLog({ ...state.log, [key]: { completed: true, reps: n, exercise: reg.exercise } });
    setCamOn(false);
    Alert.alert('Nice!', `${n} reps logged for today. ✅`, [{ text: 'OK', onPress: () => go('home') }]);
  };
  const addRep = () => { const n = reps + 1; setReps(n); if (n >= reg.target) complete(n); };

  return (
    <View>
      <Text style={styles.h1}>Today · {reg.exercise}</Text>
      {already
        ? <View style={styles.banner}><Text style={styles.bannerTxt}>✅ Completed today ({state.log[key].reps} reps). You're covered.</Text></View>
        : <Text style={styles.muted}>Target: {reg.target} {reg.exercise.toLowerCase()}. Reach it to mark today complete.</Text>}

      <Card>
        <View style={styles.camBox}>
          {camOn && permission?.granted
            ? <CameraView style={{ flex: 1 }} facing="front" />
            : <View style={styles.camPlaceholder}><Text style={{ fontSize: 34 }}>📷</Text><Text style={styles.muted}>Camera off</Text></View>}
        </View>

        <Text style={styles.repBig}>{reps}<Text style={styles.repTarget}> / {reg.target}</Text></Text>

        {!camOn ? (
          <>
            <Btn text="Start camera" blue onPress={async () => {
              if (!permission?.granted) {
                const res = await requestPermission();
                if (!res.granted) { Alert.alert('Camera needed', 'Enable camera access to verify your workout.'); return; }
              }
              setCamOn(true); setReps(0);
            }} />
            <Text style={[styles.muted, { textAlign: 'center', marginTop: 8 }]}>Turn on the camera to start counting.</Text>
          </>
        ) : (
          <>
            <BigTapBtn text={`Count rep  ·  +1`} onPress={addRep} />
            <Text style={[styles.muted, { textAlign: 'center', marginTop: 8 }]}>Tap once per rep. Auto-completes at {reg.target}.</Text>
          </>
        )}
      </Card>

      <Text style={styles.disclaimer}>
        Automatic AI rep-counting isn't available in Expo Go (it needs a custom dev build with native camera
        processing). This version verifies with the camera and you tap to count.
      </Text>
    </View>
  );
}

// ---------------- CONTRACT (Invest) ----------------
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
        <Card>
          <Text style={styles.text}>Signed by {state.contract.name} on {state.contract.date.slice(0, 10)}.</Text>
          <View style={styles.statGrid}>
            <Stat k="Invested" v={money(s.invested)} />
            <Stat k="Balance" v={money(s.balance)} />
          </View>
          <ContractText amount={state.contract.amount} />
          <WarnBox />
          <Text style={styles.muted}>There is no cancel. The only way out is a health exception — find it in Settings.</Text>
          <Btn text="Go to Settings" secondary onPress={() => go('settings')} />
          <Text style={styles.disclaimer}>Prototype only — no real money is charged. Not an enforceable contract.</Text>
        </Card>
      </View>
    );
  }

  const finalAmount = custom ? Math.max(0, parseInt(custom, 10) || 0) : amount;
  const regimenSet = state.regimenSaved;
  const canSign = regimenSet && agree && name.trim().length > 1 && finalAmount > 0;

  return (
    <View>
      <Text style={styles.h1}>Invest in your effort</Text>
      <Text style={styles.muted}>Optional — but signing is what makes it real.</Text>

      <Card>
        <Text style={styles.step}>1 · Choose your stake</Text>
        <View style={styles.amtRow}>
          {[25, 50, 100, 250].map((a) => (
            <TouchableOpacity key={a} onPress={() => { setAmount(a); setCustom(''); }}
              style={[styles.amt, finalAmount === a && !custom && styles.amtSel]}>
              <Text style={[styles.amtTxt, finalAmount === a && !custom && { color: C.accent }]}>${a}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={[styles.row, { marginTop: 12 }]}>
          <Text style={styles.muted}>or custom  $</Text>
          <TextInput style={styles.numInput} keyboardType="number-pad" value={custom}
            onChangeText={setCustom} placeholder="amount" placeholderTextColor={C.muted} />
        </View>
      </Card>

      <Card>
        <Text style={styles.step}>2 · Read the contract</Text>
        <ContractText amount={finalAmount} />
        <WarnBox />
      </Card>

      <Card>
        <Text style={styles.step}>3 · Sign</Text>
        <View style={styles.warnBox}><Text style={styles.warnTxt}>Once you sign, your plan is LOCKED and cannot be changed. Set it exactly how you want it before signing.</Text></View>
        {!regimenSet && (
          <View style={styles.banner}>
            <Text style={styles.bannerTxt}>⚠️ You must set your plan first. </Text>
            <TouchableOpacity onPress={() => go('setup')}><Text style={styles.link}>Go to Plan</Text></TouchableOpacity>
            <Text style={styles.bannerTxt}> and press Save, then you can invest.</Text>
          </View>
        )}
        <Text style={styles.muted}>Type your full name to sign.</Text>
        <TextInput style={styles.textInput} value={name} onChangeText={setName} editable={regimenSet}
          placeholder="Full name" placeholderTextColor={C.muted} />
        <TouchableOpacity style={styles.agreeRow} disabled={!regimenSet} onPress={() => setAgree(!agree)}>
          <View style={[styles.checkbox, agree && { backgroundColor: C.accent, borderColor: C.accent }]}>
            {agree && <Text style={{ color: '#04170a', fontWeight: '900' }}>✓</Text>}
          </View>
          <Text style={[styles.muted, { flex: 1 }]}>
            I have read and understand this contract. There is no cancellation except for genuine health
            reasons, my plan is now locked and cannot be changed, and if I miss two days in a row I will be
            billed half the sum I agreed on.
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
      </Card>
    </View>
  );
}

function ContractText({ amount }) {
  return (
    <View style={styles.contract}>
      <Text style={styles.contractH}>Commitment Contract</Text>
      <Text style={styles.contractP}>I am voluntarily investing ${amount} in my own fitness commitment.</Text>
      <Text style={styles.contractP}>I agree to complete my chosen exercise on every scheduled (non-rest) day, verified by the app.</Text>
      <Text style={styles.contractP}>Locked plan: my plan is fixed at the moment of signing and cannot be changed afterward.</Text>
      <Text style={styles.contractP}>Penalty: if I fail two scheduled days in a row, I agree to be billed half of my remaining balance. This applies again for every additional pair of consecutive missed days.</Text>
      <Text style={styles.contractP}>No cancellation: once signed, this cannot be cancelled. The only exception is a genuine health reason, which pauses billing.</Text>
      <Text style={styles.contractP}>I understand this app is a prototype and no real money is collected in this version.</Text>
    </View>
  );
}
function WarnBox() {
  return <View style={styles.warnBox}><Text style={styles.warnTxt}>If you miss two days in a row you will be billed half the sum you agreed on.</Text></View>;
}

// ---------------- SETTINGS ----------------
function Settings({ state, saveHealth, onReset, go }) {
  const signed = state.contract && state.contract.signed;
  return (
    <View>
      <Text style={styles.h1}>Settings</Text>

      <Card>
        <Text style={styles.h2}>Health exception</Text>
        {!signed ? (
          <Text style={styles.muted}>No active contract — there's nothing to pause. The health exception appears here once you've signed.</Text>
        ) : state.health ? (
          <>
            <View style={styles.banner}><Text style={styles.bannerTxt}>🩺 Health exception is active — billing is paused.</Text></View>
            <Btn text="Resume commitment" onPress={() => saveHealth(false)} />
          </>
        ) : (
          <>
            <Text style={styles.muted}>Stopping for a genuine health reason? This is the only way out of a signed contract. It pauses all billing.</Text>
            <Btn text="Claim health exception" danger onPress={() =>
              Alert.alert('Health exception', 'This pauses billing. Confirm you are stopping for genuine health reasons?',
                [{ text: 'Cancel' }, { text: 'Confirm', onPress: () => saveHealth(true) }])} />
          </>
        )}
      </Card>

      <Card>
        <Text style={styles.h2}>History</Text>
        <Text style={styles.muted}>See every day you've logged.</Text>
        <Btn text="View full history" secondary onPress={() => go('history')} />
      </Card>

      <Card>
        <Text style={styles.h2}>Danger zone</Text>
        <Text style={styles.muted}>Erase your plan, log, and contract from this device.</Text>
        <Btn text="Reset all data" danger onPress={() =>
          Alert.alert('Reset', 'Erase ALL data (plan, log, contract)?',
            [{ text: 'Cancel' }, { text: 'Erase', style: 'destructive', onPress: onReset }])} />
      </Card>

      <Text style={styles.disclaimer}>
        WorkoutMoneyApp prototype. No real money is charged and the contract is not legally binding.
        All data is stored only on this device.
      </Text>
    </View>
  );
}

// ---------------- HISTORY ----------------
function History({ state, go }) {
  const keys = Object.keys(state.log).sort().reverse();
  return (
    <View>
      <View style={styles.cardHead}>
        <Text style={styles.h1}>History</Text>
        <TouchableOpacity onPress={() => go('settings')}><Text style={styles.link}>Back</Text></TouchableOpacity>
      </View>
      <Card>
        <View style={styles.trHead}>
          <Text style={[styles.th, { flex: 2 }]}>Date</Text>
          <Text style={[styles.th, { flex: 1 }]}>Day</Text>
          <Text style={[styles.th, { flex: 1.6 }]}>Status</Text>
          <Text style={[styles.th, { flex: 0.8, textAlign: 'right' }]}>Reps</Text>
        </View>
        {keys.length === 0 && <Text style={[styles.muted, { paddingVertical: 10 }]}>No workouts logged yet.</Text>}
        {keys.map((k) => {
          const rec = state.log[k];
          return (
            <View key={k} style={styles.tr}>
              <Text style={[styles.td, { flex: 2 }]}>{k}</Text>
              <Text style={[styles.td, { flex: 1 }]}>{DAYS[dowOf(k)]}</Text>
              <View style={{ flex: 1.6 }}><Pill kind={rec.completed ? 'done' : 'miss'} text={rec.completed ? 'Done' : 'Missed'} /></View>
              <Text style={[styles.td, { flex: 0.8, textAlign: 'right' }]}>{rec.reps || '—'}</Text>
            </View>
          );
        })}
      </Card>
    </View>
  );
}

// ---------------- shared components ----------------
function Card({ children, style }) { return <View style={[styles.card, style]}>{children}</View>; }
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
      style={[styles.btn, { backgroundColor: bg }, secondary && styles.btnSecondary, disabled && { opacity: 0.4 }]}>
      <Text style={{ color: fg, fontWeight: '700', fontSize: 15 }}>{text}</Text>
    </TouchableOpacity>
  );
}
function BigTapBtn({ text, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.bigTap}>
      <Text style={{ color: '#04170a', fontWeight: '900', fontSize: 20 }}>{text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 10 : 4, paddingBottom: 10, borderBottomWidth: 1, borderColor: C.border },
  logo: { color: C.text, fontWeight: '800', fontSize: 22 },
  headerSub: { color: C.muted, fontSize: 12, marginTop: 2 },

  h1: { color: C.text, fontSize: 26, fontWeight: '800', marginBottom: 4 },
  h2: { color: C.text, fontSize: 17, fontWeight: '700' },
  step: { color: C.accent, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  text: { color: C.text, fontSize: 14 },
  muted: { color: C.muted, marginTop: 2, fontSize: 14, lineHeight: 20 },
  link: { color: C.blue, fontWeight: '700' },

  card: { backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16, marginTop: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  stat: { flexGrow: 1, flexBasis: '46%', backgroundColor: C.panel2, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14 },
  statK: { color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 },
  statV: { color: C.text, fontSize: 24, fontWeight: '800', marginTop: 4 },

  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  recentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderColor: C.border },

  btn: { paddingVertical: 13, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  btnSecondary: { borderWidth: 1, borderColor: C.border },
  bigTap: { backgroundColor: C.accent, paddingVertical: 22, borderRadius: 16, alignItems: 'center', marginTop: 6 },

  dayName: { color: C.text, fontWeight: '800', fontSize: 16 },
  exRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipSel: { borderColor: C.accent, backgroundColor: 'rgba(63,185,80,.1)' },
  chipTxt: { color: C.muted, fontSize: 13 },

  row: { flexDirection: 'row', alignItems: 'center' },
  numInput: { backgroundColor: '#0b0f14', borderWidth: 1, borderColor: C.border, color: C.text, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minWidth: 70, textAlign: 'center', fontSize: 15 },
  textInput: { backgroundColor: '#0b0f14', borderWidth: 1, borderColor: C.border, color: C.text, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, marginTop: 8, fontSize: 15 },

  camBox: { height: 320, borderRadius: 14, overflow: 'hidden', backgroundColor: '#000' },
  camPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  repBig: { color: C.text, fontSize: 56, fontWeight: '900', textAlign: 'center', marginVertical: 10 },
  repTarget: { color: C.muted, fontSize: 26, fontWeight: '700' },

  banner: { backgroundColor: 'rgba(210,153,34,.12)', borderWidth: 1, borderColor: C.warn, borderRadius: 12, padding: 12, marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  bannerTxt: { color: '#ffd88a', fontSize: 14 },
  lockBanner: { backgroundColor: 'rgba(56,139,253,.12)', borderWidth: 1, borderColor: C.blue, borderRadius: 12, padding: 12, marginTop: 12 },
  lockTxt: { color: '#bcd6ff', fontSize: 14, fontWeight: '600' },

  contract: { backgroundColor: '#0b0f14', borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, marginTop: 4 },
  contractH: { color: C.text, fontWeight: '700', fontSize: 16, marginBottom: 8 },
  contractP: { color: C.muted, fontSize: 14, marginBottom: 8, lineHeight: 20 },
  warnBox: { backgroundColor: 'rgba(248,81,73,.1)', borderWidth: 1, borderColor: C.danger, borderRadius: 12, padding: 14, marginTop: 14 },
  warnTxt: { color: '#ffb3ae', fontWeight: '800', textAlign: 'center', lineHeight: 20 },

  amtRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  amt: { backgroundColor: C.panel2, borderWidth: 2, borderColor: C.border, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 22 },
  amtSel: { borderColor: C.accent },
  amtTxt: { color: C.text, fontSize: 18, fontWeight: '800' },

  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginVertical: 14 },
  checkbox: { width: 26, height: 26, borderWidth: 2, borderColor: C.border, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },

  disclaimer: { color: C.muted, fontSize: 12, marginTop: 14, lineHeight: 18 },

  trHead: { flexDirection: 'row', borderBottomWidth: 1, borderColor: C.border, paddingBottom: 6 },
  th: { color: C.muted, fontSize: 12, fontWeight: '700' },
  tr: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: C.border, paddingVertical: 9 },
  td: { color: C.text, fontSize: 13 },

  tabbar: { flexDirection: 'row', borderTopWidth: 1, borderColor: C.border, backgroundColor: C.panel, paddingTop: 6, paddingBottom: Platform.OS === 'ios' ? 8 : 6 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  tabDot: { width: 22, height: 3, borderRadius: 2, marginBottom: 5 },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 11, marginTop: 2, color: C.muted },
  tabLabelActive: { color: C.accent, fontWeight: '700' },
});
