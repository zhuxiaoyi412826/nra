(() => {
  const root = (window.Shooter = window.Shooter || {});

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const norm = (x, y) => {
    const l = Math.hypot(x, y);
    if (l < 1e-6) return { x: 0, y: 0 };
    return { x: x / l, y: y / l };
  };
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const fmtTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };
  const nowISO = () => new Date().toISOString().slice(0, 19).replace("T", " ");

  root.util = { clamp, norm, rand, randInt, fmtTime, nowISO };

  class Pool {
    constructor(factory, initial = 0) {
      this.factory = factory;
      this.items = [];
      for (let i = 0; i < initial; i += 1) this.items.push(factory());
    }
    acquire() {
      for (const it of this.items) {
        if (!it.active) return it;
      }
      const it = this.factory();
      this.items.push(it);
      return it;
    }
  }

  const circleRectResolve = (cx, cy, cr, r) => {
    const nearestX = clamp(cx, r.x, r.x + r.w);
    const nearestY = clamp(cy, r.y, r.y + r.h);
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    const d = Math.hypot(dx, dy);
    if (d <= 1e-6) {
      const left = Math.abs(cx - r.x);
      const right = Math.abs(cx - (r.x + r.w));
      const top = Math.abs(cy - r.y);
      const bottom = Math.abs(cy - (r.y + r.h));
      const m = Math.min(left, right, top, bottom);
      if (m === left) return { hit: true, x: r.x - cr, y: cy };
      if (m === right) return { hit: true, x: r.x + r.w + cr, y: cy };
      if (m === top) return { hit: true, x: cx, y: r.y - cr };
      return { hit: true, x: cx, y: r.y + r.h + cr };
    }
    if (d < cr) {
      const push = (cr - d) / d;
      return { hit: true, x: cx + dx * push, y: cy + dy * push };
    }
    return { hit: false, x: cx, y: cy };
  };

  const circleRectHit = (cx, cy, cr, r) => {
    const nearestX = clamp(cx, r.x, r.x + r.w);
    const nearestY = clamp(cy, r.y, r.y + r.h);
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    return dx * dx + dy * dy <= cr * cr;
  };

  root.Pool = Pool;
  root.collision = { circleRectResolve, circleRectHit };

  root.constants = {
    WEAPONS: {},
    PICKUP: {
      coin: { name: "金币", color: "#f7d154" },
      gem: { name: "钻石", color: "#7ad0ff" },
      ammo: { name: "弹药", color: "#c7d2fe" },
      med: { name: "急救包", color: "#ff7b7b" },
      food: { name: "食物", color: "#9bff53" },
      water: { name: "清水", color: "#53a9ff" },
      weapon: { name: "武器箱", color: "#ff6fb0" },
      buff: { name: "增益", color: "#ffd36f" },
    },
    GAME_SCALE: 2, // 游戏缩放比例
  };

  root.config = {
    infiniteCoins: true,
    infiniteGems: true,
    infiniteAmmo: true,
    pixelScale: 0,
    screenShake: true,
    showFps: false,
    masterVolume: 0.5,
    ambientMul: 1,
    invincible: false,
  };

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.unlocked = false;
      this.ambient = null;
      this.ambientGain = null;
      this.lastStepAt = 0;
    }
    ensure() {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (!this.master) {
        this.master = this.ctx.createGain();
        this.master.gain.value = clamp(root.config?.masterVolume ?? 0.5, 0, 1);
        this.master.connect(this.ctx.destination);
      }
      return this.ctx;
    }
    unlock() {
      if (this.unlocked) return;
      const c = this.ensure();
      if (c.state === "suspended") c.resume();
      this.unlocked = true;
      this.startAmbient();
    }
    setMaster(v) {
      if (!this.ctx || !this.master) return;
      this.master.gain.value = clamp(v, 0, 1);
    }
    noiseBuffer() {
      const c = this.ensure();
      const len = Math.floor(c.sampleRate * 0.25);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      return buf;
    }
    envGain(g, t0, a, d, s, r) {
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(a, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, s), t0 + d);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + r);
    }
    osc(type, freq, dur, gain, detune = 0) {
      if (!this.unlocked) return;
      const c = this.ensure();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = detune;
      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(this.master);
      const t0 = c.currentTime;
      this.envGain(g, t0, gain, dur * 0.55, gain * 0.35, dur * 0.25);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    }
    burstNoise(dur, gain, cutoffHz = 1400) {
      if (!this.unlocked) return;
      const c = this.ensure();
      const s = c.createBufferSource();
      s.buffer = this.noiseBuffer();
      const f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = cutoffHz;
      const g = c.createGain();
      g.gain.value = 0.0001;
      s.connect(f);
      f.connect(g);
      g.connect(this.master);
      const t0 = c.currentTime;
      this.envGain(g, t0, gain, dur * 0.5, gain * 0.25, dur * 0.35);
      s.start(t0);
      s.stop(t0 + dur + 0.05);
    }
    ui() {
      this.osc("square", 820, 0.05, 0.06, randInt(-20, 20));
    }
    shot(weaponKey) {
      if (weaponKey === "shotgun") {
        this.burstNoise(0.14, 0.14, 2200);
        this.osc("square", 120, 0.08, 0.08, randInt(-60, 60));
        return;
      }
      if (weaponKey === "hmg") {
        this.burstNoise(0.06, 0.1, 2400);
        this.osc("square", 150 + rand(-8, 10), 0.055, 0.07, randInt(-50, 50));
        this.osc("sine", 70 + rand(-6, 6), 0.06, 0.03, randInt(-30, 30));
        return;
      }
      if (weaponKey === "smg") {
        this.burstNoise(0.045, 0.07, 2600);
        this.osc("square", 230 + rand(-10, 15), 0.045, 0.05, randInt(-50, 50));
        return;
      }
      if (weaponKey === "rifle") {
        this.burstNoise(0.05, 0.08, 2600);
        this.osc("square", 210 + rand(-10, 15), 0.05, 0.06, randInt(-50, 50));
        return;
      }
      this.burstNoise(0.06, 0.08, 1800);
      this.osc("square", 240 + rand(-12, 12), 0.06, 0.06, randInt(-40, 40));
    }
    reload() {
      this.osc("triangle", 340, 0.08, 0.05, randInt(-30, 30));
      this.osc("triangle", 520, 0.06, 0.03, randInt(-40, 40));
    }
    empty() {
      this.osc("square", 70, 0.08, 0.05, randInt(-20, 20));
    }
    hit() {
      this.burstNoise(0.04, 0.06, 3200);
      this.osc("triangle", 560, 0.04, 0.04, randInt(-30, 30));
    }
    hurt() {
      this.osc("square", 110, 0.12, 0.08, randInt(-30, 30));
      this.burstNoise(0.08, 0.05, 900);
    }
    pickup(type) {
      if (type === "gem") {
        this.osc("sine", 880, 0.08, 0.06, randInt(-20, 20));
        this.osc("sine", 1320, 0.06, 0.04, randInt(-20, 20));
        return;
      }
      this.osc("triangle", 660, 0.06, 0.05, randInt(-20, 20));
    }
    eliteSpawn() {
      this.osc("sawtooth", 160, 0.22, 0.08, randInt(-30, 30));
      this.osc("square", 80, 0.28, 0.07, randInt(-30, 30));
      this.burstNoise(0.16, 0.08, 1200);
    }
    enemyDie(elite) {
      this.burstNoise(0.12, elite ? 0.14 : 0.1, 1600);
      this.osc("triangle", elite ? 140 : 180, 0.14, elite ? 0.08 : 0.06, randInt(-40, 40));
    }
    bossSpawn() {
      this.burstNoise(0.22, 0.12, 900);
      this.osc("sawtooth", 90, 0.35, 0.1, randInt(-20, 20));
      this.osc("square", 55, 0.45, 0.08, randInt(-20, 20));
      this.osc("triangle", 220, 0.18, 0.06, randInt(-30, 30));
    }
    bossSkill() {
      this.burstNoise(0.12, 0.1, 1400);
      this.osc("triangle", 420, 0.12, 0.06, randInt(-30, 30));
      this.osc("square", 140, 0.18, 0.05, randInt(-30, 30));
    }
    bossDie() {
      this.burstNoise(0.35, 0.16, 800);
      this.osc("sawtooth", 120, 0.4, 0.12, randInt(-20, 20));
      this.osc("triangle", 60, 0.55, 0.1, randInt(-20, 20));
    }
    grenade() {
      this.burstNoise(0.08, 0.07, 1400);
      this.osc("triangle", 420, 0.09, 0.05, randInt(-20, 20));
    }
    rocket() {
      this.burstNoise(0.12, 0.1, 900);
      this.osc("sawtooth", 180, 0.12, 0.07, randInt(-30, 30));
    }
    thunder() {
      this.burstNoise(0.08, 0.1, 2600);
      this.osc("square", 520, 0.08, 0.06, randInt(-20, 20));
      this.osc("sine", 120, 0.1, 0.03, randInt(-20, 20));
    }
    explosion(big) {
      this.burstNoise(big ? 0.26 : 0.18, big ? 0.16 : 0.12, 1200);
      this.osc("square", big ? 70 : 90, big ? 0.25 : 0.18, big ? 0.1 : 0.08, randInt(-30, 30));
    }
    step(t) {
      if (!this.unlocked) return;
      if (t - this.lastStepAt < 0.16) return;
      this.lastStepAt = t;
      this.burstNoise(0.03, 0.02, 800);
      this.osc("sine", 120 + rand(-8, 8), 0.03, 0.02, randInt(-20, 20));
    }
    startAmbient() {
      if (!this.unlocked) return;
      if (this.ambient) return;
      const c = this.ensure();
      const n = c.createBufferSource();
      n.buffer = this.noiseBuffer();
      n.loop = true;
      const f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 520;
      const g = c.createGain();
      g.gain.value = 0.0001;
      n.connect(f);
      f.connect(g);
      g.connect(this.master);
      n.start(c.currentTime);
      this.ambient = n;
      this.ambientGain = g;
      this.setAmbient(0.2);
    }
    setAmbient(level) {
      if (!this.unlocked || !this.ambientGain) return;
      const c = this.ensure();
      const t0 = c.currentTime;
      const mul = clamp(root.config?.ambientMul ?? 1, 0, 1);
      const v = clamp(level, 0, 1) * 0.18 * mul;
      this.ambientGain.gain.cancelScheduledValues(t0);
      this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value, t0);
      this.ambientGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, v), t0 + 0.12);
    }
  }

  root.AudioEngine = AudioEngine;
})();
