(() => {
  const root = (window.Shooter = window.Shooter || {});
  const { clamp, norm, rand } = root.util;
  const WORLD = root.WORLD;
  const GAME_SCALE = Math.max(0.5, Math.min(3, Number(root.constants?.GAME_SCALE ?? 1) || 1));

  class Boss {
    constructor() {
      this.active = false;
      this.name = "灾厄核心";
      this.x = 0;
      this.y = 0;
      this.r = 44;
      this.hp = 0;
      this.maxHp = 0;
      this.phase = 1;
      this.hitFlash = 0;
      this.t = 0;
      this.contactCd = 0;
      this.nextSkill = 2.0;
      this.skill = null;
      this.skillT = 0;
      this.skillStep = 0;
      this.skillCd = {
        barrage: 6,
        dash: 7,
        summon: 10,
        nova: 9,
      };
      this.skillReady = {
        barrage: 0,
        dash: 0,
        summon: 0,
        nova: 0,
      };
      this.dashVec = { x: 0, y: 0 };
      this.dashSpeed = 0;
    }

    init(level = 1) {
      this.active = true;
      this.x = WORLD.w * 0.5;
      this.y = WORLD.h * 0.28;
      this.r = 46;
      this.maxHp = Math.floor(900 + level * 260);
      this.hp = this.maxHp;
      this.phase = 1;
      this.hitFlash = 0;
      this.t = 0;
      this.contactCd = 0;
      this.nextSkill = 2.0;
      this.skill = null;
      this.skillT = 0;
      this.skillStep = 0;
      this.skillReady = { barrage: 0, dash: 0, summon: 0, nova: 0 };
      this.dashVec = { x: 0, y: 0 };
      this.dashSpeed = 0;
    }

    hurt(dmg) {
      this.hp -= dmg;
      this.hitFlash = 0.1;
      if (this.hp <= 0) {
        this.hp = 0;
        this.active = false;
        return true;
      }
      return false;
    }

    pickSkill() {
      const pool = [];
      for (const k of Object.keys(this.skillReady)) {
        if (this.skillReady[k] <= 0) pool.push(k);
      }
      if (pool.length === 0) return "barrage";
      const w = [];
      for (const k of pool) {
        if (k === "summon") w.push(this.phase >= 2 ? 2 : 1);
        else if (k === "dash") w.push(2);
        else if (k === "nova") w.push(2);
        else w.push(3);
      }
      const sum = w.reduce((a, b) => a + b, 0);
      let r = Math.random() * sum;
      for (let i = 0; i < pool.length; i += 1) {
        r -= w[i];
        if (r <= 0) return pool[i];
      }
      return pool[0];
    }

    beginSkill(name, audio) {
      this.skill = name;
      this.skillT = 0;
      this.skillStep = 0;
      this.skillReady[name] = this.skillCd[name];
      if (audio) audio.ui();
      if (name === "dash") {
        this.dashSpeed = 0;
        this.dashVec = { x: 0, y: 0 };
      }
    }

    fireRing(bullets, count, speed, dmg, r, color) {
      const base = rand(-Math.PI, Math.PI);
      for (let i = 0; i < count; i += 1) {
        const a = base + (i / count) * Math.PI * 2;
        const b = bullets.acquire();
        b.init({
          x: this.x + Math.cos(a) * (this.r + 8 * GAME_SCALE),
          y: this.y + Math.sin(a) * (this.r + 8 * GAME_SCALE),
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          dmg,
          ttl: 2.2,
          fromPlayer: false,
          r,
          color,
        });
      }
    }

    fireAt(bullets, tx, ty, speed, dmg, r, color, spreadDeg = 0) {
      const to = norm(tx - this.x, ty - this.y);
      const base = Math.atan2(to.y, to.x);
      const spread = (spreadDeg * Math.PI) / 180;
      const a = base + rand(-spread, spread);
      const b = bullets.acquire();
      b.init({
        x: this.x + Math.cos(a) * (this.r + 8),
        y: this.y + Math.sin(a) * (this.r + 8),
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        dmg,
        ttl: 2.0,
        fromPlayer: false,
        r,
        color,
      });
    }

    update(dt, player, bullets, spawnMinions, emit, audio, difficulty, isNight) {
      if (!this.active) return;
      this.t += dt;
      this.hitFlash = Math.max(0, this.hitFlash - dt);
      this.contactCd = Math.max(0, this.contactCd - dt);
      const hpPct = this.hp / this.maxHp;
      this.phase = hpPct <= 0.5 ? 2 : 1;

      for (const k of Object.keys(this.skillReady)) this.skillReady[k] = Math.max(0, this.skillReady[k] - dt);

      const toP = { x: player.x - this.x, y: player.y - this.y };
      const dist = Math.hypot(toP.x, toP.y);
      const dir = dist > 1e-6 ? { x: toP.x / dist, y: toP.y / dist } : { x: 0, y: 0 };

      const baseSpeed = 54 + difficulty * 7;
      const nightBoost = isNight ? 1.1 : 1.0;
      if (!this.skill) {
        const keep = dist > 380 ? 1 : dist < 220 ? -1 : 0.2;
        this.x += dir.x * baseSpeed * keep * dt * nightBoost;
        this.y += dir.y * baseSpeed * keep * dt * nightBoost;
      }

      this.x = clamp(this.x, this.r, WORLD.w - this.r);
      this.y = clamp(this.y, this.r, WORLD.h - this.r);

      if (dist < this.r + player.r + 6 * GAME_SCALE && this.contactCd <= 0) {
        this.contactCd = 0.7;
        player.takeDamage(16 + difficulty * 2 + (this.phase >= 2 ? 6 : 0), { x: dir.x, y: dir.y }, audio);
        if (emit) emit.hurtPlayer(player.x, player.y);
      }

      if (!this.skill) {
        this.nextSkill -= dt;
        if (this.nextSkill <= 0) {
          this.beginSkill(this.pickSkill(), audio);
          this.nextSkill = 999;
        }
        return;
      }

      this.skillT += dt;

      const bossDmg = 10 + difficulty * 2 + (this.phase >= 2 ? 4 : 0);
      const bossBullet = isNight ? 740 : 680;
      const bulletColor = this.phase >= 2 ? "#ff6fb0" : "#7ad0ff";

      if (this.skill === "barrage") {
        if (this.skillT >= 0.35 && this.skillStep < 1) {
          if (audio) audio.bossSkill();
          this.skillStep = 1;
        }
        const waveInt = this.phase >= 2 ? 0.35 : 0.45;
        const waves = this.phase >= 2 ? 6 : 4;
        const start = 0.55;
        for (let i = 0; i < waves; i += 1) {
          const tHit = start + i * waveInt;
          if (this.skillT >= tHit && this.skillStep === 10 + i) {
            this.skillStep += 1;
          }
        }
        if (this.skillT >= start && this.skillStep < 10) this.skillStep = 10;
        if (this.skillStep >= 10 && this.skillStep < 10 + waves) {
          const i = this.skillStep - 10;
          const tHit = start + i * waveInt;
          if (this.skillT >= tHit) {
            const count = this.phase >= 2 ? 28 : 22;
            this.fireRing(bullets, count, bossBullet, bossDmg, 4, bulletColor);
            if (emit) emit.muzzle(this.x, this.y, 1, 0, "boss");
            this.skillStep += 1;
          }
        }
        if (this.skillT >= start + waves * waveInt + 0.2) {
          this.skill = null;
          this.nextSkill = 1.2;
        }
        return;
      }

      if (this.skill === "dash") {
        if (this.skillT < 0.55) {
          if (this.skillT >= 0.35 && this.skillStep === 0) {
            this.dashVec = dir;
            this.skillStep = 1;
            if (audio) audio.bossSkill();
          }
          return;
        }
        const maxSp = this.phase >= 2 ? 980 : 820;
        const accel = this.phase >= 2 ? 2200 : 1800;
        this.dashSpeed = clamp(this.dashSpeed + accel * dt, 0, maxSp);
        this.x += this.dashVec.x * this.dashSpeed * dt;
        this.y += this.dashVec.y * this.dashSpeed * dt;
        if (emit && Math.random() < 0.65) emit.hitEnemy(this.x + rand(-10, 10), this.y + rand(-10, 10));
        if (this.skillT >= (this.phase >= 2 ? 1.0 : 0.85)) {
          this.skill = null;
          this.nextSkill = 1.1;
        }
        return;
      }

      if (this.skill === "summon") {
        if (this.skillT >= 0.4 && this.skillStep === 0) {
          if (audio) audio.bossSkill();
          this.skillStep = 1;
          if (spawnMinions) spawnMinions(this.phase >= 2 ? 7 : 5);
          if (emit) emit.killEnemy(this.x, this.y, true);
        }
        if (this.skillT >= 1.1) {
          this.skill = null;
          this.nextSkill = 1.3;
        }
        return;
      }

      if (this.skill === "nova") {
        if (this.skillT >= 0.5 && this.skillStep === 0) {
          if (audio) audio.bossSkill();
          this.skillStep = 1;
          const count = this.phase >= 2 ? 38 : 30;
          this.fireRing(bullets, count, bossBullet * 0.86, bossDmg + 6, 5, bulletColor);
          for (let i = 0; i < 8; i += 1) this.fireAt(bullets, player.x, player.y, bossBullet * 1.05, bossDmg + 2, 4, bulletColor, 6);
          if (emit) emit.killEnemy(this.x, this.y, true);
        }
        if (this.skillT >= 1.2) {
          this.skill = null;
          this.nextSkill = 1.25;
        }
      }
    }
  }

  root.entities = root.entities || {};
  root.entities.Boss = Boss;
})();
