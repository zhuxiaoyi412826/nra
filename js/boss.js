(() => {
  const root = (window.Shooter = window.Shooter || {});
  const { clamp, norm, rand } = root.util;
  const WORLD = root.WORLD;
  const GAME_SCALE = Math.max(0.5, Math.min(3, Number(root.constants?.GAME_SCALE ?? 1) || 1));

  class Boss {
    constructor() {
      this.active = false;
      this.kind = "core";
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
      this.walkAnim = 0;
    }

    init(level = 1, kind = "core") {
      this.active = true;
      this.kind = kind || "core";
      this.x = WORLD.w * 0.5;
      this.y = WORLD.h * 0.28;
      if (this.kind === "gunslinger") {
        this.name = "亡命枪手";
        this.r = 44 * GAME_SCALE;
        this.skillCd = { spray: 5.5, snipe: 7.2, dash: 7.8, summon: 10.5 };
        this.skillReady = { spray: 0, snipe: 0, dash: 0, summon: 0 };
        this.maxHp = Math.floor(820 + level * 240);
      } else if (this.kind === "fire_giant") {
        this.name = "火焰巨人";
        this.r = 48 * GAME_SCALE;
        this.skillCd = { sword: 6.0, breath: 8.5, ball: 5.0, aoe: 12.0 };
        this.skillReady = { sword: 0, breath: 0, ball: 0, aoe: 0 };
        this.maxHp = Math.floor(1000 + level * 300);
        this.fg = {
          breathOffset: 0,
          effects: [],
          flameSword: { state: 'IDLE', skillTimer: 0, phase: 0, particles: [], slashTrails: [], hitTargets: new Set() },
          flameBreath: { state: 'IDLE', skillTimer: 0, particles: [], trails: [], hitTarget: false },
          groundSlam: { state: 'IDLE', cracks: [], rocks: [], dust: [], shockwaves: [], groundDarken: 0, impactCenter: {x:0, y:0}, skillTimer: 0 },
          fireballs: [],
          death: { state: 'IDLE', timer: 0, phase: 0, particles: [], ashParticles: [], burnMark: null, swordDropped: false, droppedSword: null },
          readyToDie: false
        };
      } else {
        this.name = "灾厄核心";
        this.r = 46 * GAME_SCALE;
        this.skillCd = { barrage: 6, dash: 7, summon: 10, nova: 9 };
        this.skillReady = { barrage: 0, dash: 0, summon: 0, nova: 0 };
        this.maxHp = Math.floor(900 + level * 260);
      }
      this.hp = this.maxHp;
      this.phase = 1;
      this.hitFlash = 0;
      this.t = 0;
      this.contactCd = 0;
      this.nextSkill = 2.0;
      this.skill = null;
      this.skillT = 0;
      this.skillStep = 0;
      this.dashVec = { x: 0, y: 0 };
      this.dashSpeed = 0;
      this.walkAnim = 0;
    }

    hurt(dmg) {
      if (this.kind === "fire_giant" && this.fg && this.fg.death.state !== 'IDLE') return false;
      this.hp -= dmg;
      this.hitFlash = 0.1;
      if (this.hp <= 0) {
        this.hp = 0;
        if (this.kind === "fire_giant" && this.fg) {
          if (this.fg.death.state === 'IDLE') {
            this.fg.death.state = 'DYING';
            this.fg.death.phase = 0;
            this.fg.death.timer = 0;
            this.fg.flameSword.state = 'IDLE';
            this.fg.flameBreath.state = 'IDLE';
            this.fg.groundSlam.state = 'IDLE';
            this.skill = null;
          }
          return false;
        }
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
      if (pool.length === 0) {
        if (this.kind === "gunslinger") return "spray";
        if (this.kind === "fire_giant") return "sword";
        return "barrage";
      }
      const w = [];
      for (const k of pool) {
        if (this.kind === "gunslinger") {
          if (k === "summon") w.push(this.phase >= 2 ? 2 : 1);
          else if (k === "dash") w.push(2);
          else if (k === "snipe") w.push(2);
          else w.push(3);
        } else if (this.kind === "fire_giant") {
          if (k === "aoe") w.push(this.phase >= 2 ? 2 : 1);
          else if (k === "breath") w.push(2);
          else if (k === "ball") w.push(2);
          else w.push(3);
        } else {
          if (k === "summon") w.push(this.phase >= 2 ? 2 : 1);
          else if (k === "dash") w.push(2);
          else if (k === "nova") w.push(2);
          else w.push(3);
        }
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

    update(dt, player, bullets, spawnMinions, emit, audio, difficulty, isNight, shake) {
      if (this.kind === "gunslinger") {
        this.updateGunslinger(dt, player, bullets, spawnMinions, emit, audio, difficulty, isNight, shake);
        return;
      }
      if (this.kind === "fire_giant") {
        this.updateFireGiant(dt, player, bullets, spawnMinions, emit, audio, difficulty, isNight, shake);
        return;
      }
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
      let vx = 0, vy = 0;
      if (!this.skill) {
        const keep = dist > 380 ? 1 : dist < 220 ? -1 : 0.2;
        vx = dir.x * baseSpeed * keep * nightBoost;
        vy = dir.y * baseSpeed * keep * nightBoost;
        this.x += vx * dt;
        this.y += vy * dt;
      } else if (this.skill === "dash" && this.skillStep >= 1) {
        vx = this.dashVec.x * this.dashSpeed;
        vy = this.dashVec.y * this.dashSpeed;
      }
      
      if (Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1) {
        this.walkAnim += dt * 10;
      } else {
        this.walkAnim = 0;
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

    updateFireGiant(dt, player, bullets, spawnMinions, emit, audio, difficulty, isNight, shake) {
      if (!this.active) return;
      const fg = this.fg;
      const ms = dt * 1000;

      if (fg.death.state !== 'IDLE') {
        fg.death.timer += ms;
        switch (fg.death.phase) {
          case 0:
            if (fg.death.timer < 200) {
              if (shake) shake.kick(1);
              this.hitFlash = 0.1;
            }
            if (fg.death.timer > 300 && !fg.death.swordDropped) {
              fg.death.swordDropped = true;
              fg.death.droppedSword = { x: this.x + 30 * GAME_SCALE, y: this.y, rotation: 45, vy: 2 * GAME_SCALE, life: 1500, maxLife: 1500 };
            }
            if (fg.death.timer >= 500) { fg.death.phase = 1; fg.death.timer = 0; }
            break;
          case 1:
            if (fg.death.timer < 1000 && Math.random() < 0.5) {
              fg.death.particles.push({
                x: this.x + (Math.random() - 0.5) * 60 * GAME_SCALE, y: this.y + (Math.random() - 0.5) * 100 * GAME_SCALE,
                vx: (Math.random() - 0.5) * 4 * GAME_SCALE, vy: (-1 - Math.random() * 3) * GAME_SCALE,
                size: (8 + Math.random() * 12) * GAME_SCALE, life: 800, maxLife: 800, colorIndex: Math.floor(Math.random() * 4)
              });
            }
            for (let i = fg.death.particles.length - 1; i >= 0; i--) {
              const p = fg.death.particles[i];
              p.x += p.vx; p.y += p.vy; p.vy -= 0.02 * GAME_SCALE * (ms/16); p.size *= 0.995; p.life -= ms;
              if (p.life <= 0) fg.death.particles.splice(i, 1);
            }
            if (fg.death.timer > 1400 && fg.death.particles.length < 50) {
              for (let i = 0; i < 30; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = (2 + Math.random() * 5) * GAME_SCALE;
                fg.death.particles.push({
                  x: this.x, y: this.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2 * GAME_SCALE,
                  size: (10 + Math.random() * 15) * GAME_SCALE, life: 600, maxLife: 600, colorIndex: Math.floor(Math.random() * 4)
                });
              }
              if (shake) shake.kick(5);
            }
            if (fg.death.timer >= 1500) { fg.death.phase = 2; fg.death.timer = 0; }
            break;
          case 2:
            if (!fg.death.burnMark) fg.death.burnMark = { x: this.x, y: this.y + 30 * GAME_SCALE, life: 5000, maxLife: 5000 };
            for (let i = fg.death.ashParticles.length - 1; i >= 0; i--) {
              const p = fg.death.ashParticles[i];
              p.x += p.vx; p.y += p.vy; p.vy -= 0.01 * GAME_SCALE * (ms/16); p.life -= ms;
              if (p.life <= 0) fg.death.ashParticles.splice(i, 1);
            }
            if (fg.death.burnMark && Math.random() < 0.3) {
              fg.death.ashParticles.push({
                x: fg.death.burnMark.x + (Math.random() - 0.5) * 60 * GAME_SCALE, y: fg.death.burnMark.y,
                vx: (Math.random() - 0.5) * 0.5 * GAME_SCALE, vy: (-0.5 - Math.random() * 0.5) * GAME_SCALE,
                size: (3 + Math.random() * 4) * GAME_SCALE, life: 2000, maxLife: 2000
              });
            }
            if (fg.death.burnMark) {
              fg.death.burnMark.life -= ms;
              if (fg.death.burnMark.life <= 0) fg.death.burnMark = null;
            }
            if (fg.death.timer >= 500) fg.readyToDie = true;
            break;
        }
        return;
      }

      this.t += dt;
      fg.breathOffset += dt * 3;
      this.hitFlash = Math.max(0, this.hitFlash - dt);
      this.contactCd = Math.max(0, this.contactCd - dt);
      const hpPct = this.hp / this.maxHp;
      this.phase = hpPct <= 0.5 ? 2 : 1;

      for (const k of Object.keys(this.skillReady)) this.skillReady[k] = Math.max(0, this.skillReady[k] - dt);

      const toP = { x: player.x - this.x, y: player.y - this.y };
      const dist = Math.hypot(toP.x, toP.y);
      const dir = dist > 1e-6 ? { x: toP.x / dist, y: toP.y / dist } : { x: 0, y: 0 };

      const baseSpeed = 48 + difficulty * 6;
      const nightBoost = isNight ? 1.15 : 1.0;
      
      const fs = fg.flameSword;
      const gs = fg.groundSlam;
      const fb = fg.flameBreath;

      if (fs.state === 'IDLE' && gs.state === 'IDLE' && fb.state === 'IDLE') {
        const keep = dist > 260 ? 1 : dist < 120 ? -0.5 : 0.8;
        const vx = dir.x * baseSpeed * keep * nightBoost;
        const vy = dir.y * baseSpeed * keep * nightBoost;
        this.x += vx * dt;
        this.y += vy * dt;
        
        if (Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1) {
          this.walkAnim += dt * 8;
        } else {
          this.walkAnim = 0;
        }
        
        this.nextSkill -= dt;
        if (this.nextSkill <= 0) {
          const next = this.pickSkill();
          if (next === "sword") { fs.state = 'CHARGE'; fs.skillTimer = 500; fs.phase = 0; fs.particles = []; fs.slashTrails = []; fs.hitTargets.clear(); this.skillReady.sword = this.skillCd.sword; }
          else if (next === "ball") {
            const startX = this.x + 30 * GAME_SCALE; const startY = this.y - 30 * GAME_SCALE;
            const bDir = dist > 1e-6 ? { x: toP.x / dist, y: toP.y / dist } : { x: 1, y: 0 };
            const speed = 6 * GAME_SCALE;
            fg.fireballs.push({ x: startX, y: startY, vx: bDir.x * speed, vy: bDir.y * speed, radius: 20 * GAME_SCALE, life: 3000, trail: [], exploded: false, explosionParticles: [], explosionLife: 0, maxExplosionRadius: 100 * GAME_SCALE });
            if (shake) shake.kick(1);
            this.skillReady.ball = this.skillCd.ball;
            this.nextSkill = 1.5;
          }
          else if (next === "breath") { fb.state = 'PREPARE'; fb.skillTimer = 600; fb.particles = []; fb.trails = []; fb.hitTarget = false; this.skillReady.breath = this.skillCd.breath; }
          else if (next === "aoe") { gs.state = 'CHARGE'; gs.impactCenter = { x: this.x, y: this.y + 30 * GAME_SCALE }; gs.skillTimer = 1000; this.skillReady.aoe = this.skillCd.aoe; }
          if (audio) audio.bossSkill();
        }
      }

      this.x = clamp(this.x, this.r, root.WORLD.w - this.r);
      this.y = clamp(this.y, this.r, root.WORLD.h - this.r);

      for (let i = fg.fireballs.length - 1; i >= 0; i--) {
        const ball = fg.fireballs[i];
        if (ball.exploded) {
          ball.explosionLife -= ms;
          ball.explosionParticles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.1 * GAME_SCALE * (ms/16); p.life -= ms; p.size *= 0.97; });
          ball.explosionParticles = ball.explosionParticles.filter(p => p.life > 0);
          if (ball.explosionLife <= 0) fg.fireballs.splice(i, 1);
          continue;
        }
        ball.x += ball.vx * (ms/16);
        ball.y += ball.vy * (ms/16);
        if (Math.random() < 0.5) {
          ball.trail.push({ x: ball.x + (Math.random()-0.5)*10*GAME_SCALE, y: ball.y + (Math.random()-0.5)*10*GAME_SCALE, size: (8+Math.random()*6)*GAME_SCALE, life: 200, maxLife: 200 });
        }
        for (let j = ball.trail.length - 1; j >= 0; j--) {
          ball.trail[j].life -= ms;
          if (ball.trail[j].life <= 0) ball.trail.splice(j, 1);
        }
        ball.life -= ms;
        const distToPlayer = Math.hypot(player.x - ball.x, player.y - ball.y);
        if (distToPlayer < 40 * GAME_SCALE || ball.x < 0 || ball.x > root.WORLD.w || ball.y < 0 || ball.y > root.WORLD.h || ball.life <= 0) {
          ball.exploded = true; ball.explosionLife = 500;
          if (shake) shake.kick(3);
          if (distToPlayer < 100 * GAME_SCALE && emit) emit.hurtPlayer(player.x, player.y);
          for (let k = 0; k < 30; k++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (2 + Math.random() * 4) * GAME_SCALE;
            ball.explosionParticles.push({
              x: ball.x, y: ball.y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed - 2*GAME_SCALE,
              size: (6+Math.random()*10)*GAME_SCALE, life: 400+Math.random()*200, maxLife: 600, colorIndex: Math.floor(Math.random()*4)
            });
          }
        }
      }

      if (fs.state !== 'IDLE') {
        fs.skillTimer -= ms;
        if (fs.phase === 0) {
          const swordX = this.x + 22 * GAME_SCALE; const swordY = this.y - 110 * GAME_SCALE;
          for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2; const dist = (30 + Math.random() * 20) * GAME_SCALE;
            fs.particles.push({ x: swordX + Math.cos(angle)*dist, y: swordY + Math.sin(angle)*dist, targetX: swordX, targetY: swordY, size: (6+Math.random()*4)*GAME_SCALE, life: 300, maxLife: 300, colorIndex: 0 });
          }
          if (fs.skillTimer <= 0) { fs.phase = 1; fs.skillTimer = 300; if (shake) shake.kick(2); }
        } else if (fs.phase === 1) {
          const slashProgress = 1 - fs.skillTimer / 300;
          const slashX = this.x + (22 + slashProgress * 70) * GAME_SCALE;
          const slashY = this.y + (-110 + slashProgress * 100) * GAME_SCALE;
          fs.slashTrails.push({ x: slashX, y: slashY, angle: -90 + slashProgress * 150, life: 200, maxLife: 200, size: (15 + slashProgress * 10)*GAME_SCALE });
          for (let i = 0; i < 4; i++) {
            const angle = (Math.PI / 4) + Math.random() * (Math.PI / 2);
            fs.particles.push({ x: slashX, y: slashY, vx: Math.cos(angle)*(2+Math.random()*3)*GAME_SCALE, vy: -Math.sin(angle)*(2+Math.random()*3)*GAME_SCALE, size: (8+Math.random()*6)*GAME_SCALE, life: 400, maxLife: 400, colorIndex: Math.floor(Math.random()*4) });
          }
          if (fs.skillTimer > 150 && fs.skillTimer < 200) {
            const distToP = Math.hypot(player.x - slashX, player.y - slashY);
            if (distToP < 120 * GAME_SCALE && !fs.hitTargets.has('target')) {
              fs.hitTargets.add('target');
              if (emit) emit.hurtPlayer(player.x, player.y);
              if (shake) shake.kick(4);
            }
          }
          if (fs.skillTimer <= 0) { fs.phase = 2; fs.skillTimer = 300; }
        } else if (fs.phase === 2) {
          if (fs.skillTimer <= 0) { fs.state = 'IDLE'; fs.particles = []; fs.slashTrails = []; this.nextSkill = 1.0; }
        }
        for (let i = fs.particles.length - 1; i >= 0; i--) {
          const p = fs.particles[i];
          if (p.targetX !== undefined) { p.x += (p.targetX - p.x)*0.1; p.y += (p.targetY - p.y)*0.1; }
          else { p.x += p.vx; p.y += p.vy; p.vy += 0.1; }
          p.life -= ms; p.size *= 0.97;
          if (p.life <= 0) fs.particles.splice(i, 1);
        }
        for (let i = fs.slashTrails.length - 1; i >= 0; i--) {
          fs.slashTrails[i].life -= ms; fs.slashTrails[i].size *= 0.95;
          if (fs.slashTrails[i].life <= 0) fs.slashTrails.splice(i, 1);
        }
      }

      if (fb.state !== 'IDLE') {
        if (fb.state === 'PREPARE') {
          fb.skillTimer -= ms;
          if (fb.skillTimer <= 0) { fb.state = 'CASTING'; fb.skillTimer = 2500; if (shake) shake.kick(2); }
        } else if (fb.state === 'CASTING') {
          fb.skillTimer -= ms;
          const emitX = this.x - 50 * GAME_SCALE; const emitY = this.y - 30 * GAME_SCALE;
          const baseAngle = Math.atan2(player.y - emitY, player.x - emitX);
          const spreadAngle = 0.3;
          for (let i = 0; i < 6; i++) {
            const angle = baseAngle + (Math.random() - 0.5) * spreadAngle;
            const power = 1.2 + Math.random() * 0.5;
            const speed = (3 + Math.random() * 3) * power * GAME_SCALE;
            fb.particles.push({ x: emitX, y: emitY, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, life: 1, maxLife: 1, size: (12+Math.random()*8)*GAME_SCALE, colorIndex: 0, alpha: 1, flicker: Math.random()*Math.PI*2 });
          }
          const distToP = Math.hypot(player.x - emitX, player.y - emitY);
          const toPlayerAngle = Math.atan2(player.y - emitY, player.x - emitX);
          const angleDiff = Math.abs(baseAngle - toPlayerAngle);
          if (distToP < 250 * GAME_SCALE && angleDiff < 0.4 && fb.skillTimer < 2000) {
            if (!fb.hitTarget) { fb.hitTarget = true; if (emit) emit.hurtPlayer(player.x, player.y); }
          } else {
            fb.hitTarget = false;
          }
          if (fb.skillTimer <= 0) { fb.state = 'COOLDOWN'; fb.skillTimer = 1000; fb.hitTarget = false; }
        } else if (fb.state === 'COOLDOWN') {
          fb.skillTimer -= ms;
          if (fb.skillTimer <= 0) { fb.state = 'IDLE'; fb.particles = []; fb.trails = []; this.nextSkill = 1.5; }
        }
        
        const delta = dt * 60;
        for (let i = fb.particles.length - 1; i >= 0; i--) {
          const p = fb.particles[i];
          p.x += p.vx * delta; p.y += p.vy * delta; p.vx *= 0.98; p.vy *= 0.98; p.vy -= 0.02 * GAME_SCALE * delta;
          p.life -= 0.02 * delta; p.alpha = Math.max(0, p.life); p.flicker += 0.3 * delta; p.size = (12+Math.random()*8)*GAME_SCALE*p.life;
          if (p.life < 0.7) p.colorIndex = 2; if (p.life < 0.4) p.colorIndex = 4; if (p.life < 0.2) p.colorIndex = 5;
          if (Math.random() < 0.3) fb.trails.push({ x: p.x, y: p.y, size: p.size*0.6, alpha: p.alpha*0.3, colorIndex: Math.min(p.colorIndex+1, 5), life: 200, maxLife: 200 });
          if (p.life <= 0) fb.particles.splice(i, 1);
        }
        for (let i = fb.trails.length - 1; i >= 0; i--) {
          fb.trails[i].life -= ms; fb.trails[i].alpha = (fb.trails[i].life/fb.trails[i].maxLife)*0.3;
          if (fb.trails[i].life <= 0) fb.trails.splice(i, 1);
        }
      }

      if (gs.state !== 'IDLE') {
        if (gs.state === 'CHARGE') {
          gs.skillTimer -= ms;
          if (gs.skillTimer <= 0) {
            gs.state = 'IMPACT'; gs.skillTimer = 100; gs.groundDarken = 1;
            if (shake) shake.kick(4);
            gs.shockwaves.push({ x: gs.impactCenter.x, y: gs.impactCenter.y, radius: 20 * GAME_SCALE, maxRadius: 200 * GAME_SCALE, life: 600, maxLife: 600, lineWidth: 8 * GAME_SCALE });
            const numCracks = 6 + Math.floor(Math.random()*3);
            for (let i=0; i<numCracks; i++) gs.cracks.push({ x: gs.impactCenter.x, y: gs.impactCenter.y, angle: (i/numCracks)*Math.PI*2 + (Math.random()-0.5)*0.5, length: (60+Math.random()*80)*GAME_SCALE, width: (3+Math.random()*3)*GAME_SCALE, progress: 0, alpha: 1, jitter: Math.random()*3*GAME_SCALE });
            const ROCK_COLORS = ['#4a4a4a', '#5d5d5d', '#8B7355', '#a0522d', '#6b5344'];
            for (let i=0; i<25; i++) {
              const angle = Math.random()*Math.PI*2; const speed = (3+Math.random()*5)*GAME_SCALE;
              gs.rocks.push({ x: gs.impactCenter.x+(Math.random()-0.5)*60*GAME_SCALE, y: gs.impactCenter.y+(Math.random()-0.5)*30*GAME_SCALE, vx: Math.cos(angle)*speed, vy: -Math.abs(Math.sin(angle))*speed-2*GAME_SCALE, size: (4+Math.random()*8)*GAME_SCALE, color: ROCK_COLORS[Math.floor(Math.random()*5)], rotation: Math.random()*Math.PI*2, rotationSpeed: (Math.random()-0.5)*0.3, life: 800+Math.random()*400, maxLife: 1200, alpha: 1 });
            }
            for (let i=0; i<40; i++) {
              const angle = Math.random()*Math.PI*2; const speed = (1+Math.random()*2)*GAME_SCALE;
              gs.dust.push({ x: gs.impactCenter.x+(Math.random()-0.5)*100*GAME_SCALE, y: gs.impactCenter.y+(Math.random()-0.5)*50*GAME_SCALE, vx: Math.cos(angle)*speed, vy: (-0.5-Math.random()*0.5)*GAME_SCALE, size: (8+Math.random()*12)*GAME_SCALE, color: Math.random()>0.5?'#8B7355':'#a09070', life: 600+Math.random()*400, maxLife: 1000, alpha: 0.6 });
            }
            const distToP = Math.hypot(player.x - gs.impactCenter.x, player.y - gs.impactCenter.y);
            if (distToP < 150 * GAME_SCALE && emit) emit.hurtPlayer(player.x, player.y);
          }
        } else if (gs.state === 'IMPACT') {
          gs.skillTimer -= ms; gs.groundDarken = Math.max(0, gs.groundDarken - dt*5);
          if (gs.skillTimer <= 0) { gs.state = 'AFTERSHOCK'; gs.skillTimer = 800; }
        } else if (gs.state === 'AFTERSHOCK') {
          gs.skillTimer -= ms;
          if (gs.skillTimer <= 0) { gs.state = 'COOLDOWN'; gs.skillTimer = 1000; }
        } else if (gs.state === 'COOLDOWN') {
          gs.skillTimer -= ms;
          if (gs.skillTimer <= 0) { gs.state = 'IDLE'; gs.cracks=[]; gs.rocks=[]; gs.dust=[]; gs.shockwaves=[]; gs.groundDarken=0; this.nextSkill = 1.0; }
        }

        gs.cracks.forEach(c => { c.progress = Math.min(1, c.progress + dt/0.8); c.alpha = 1 - c.progress*0.7; });
        for (let i = gs.rocks.length - 1; i >= 0; i--) {
          const r = gs.rocks[i]; r.x+=r.vx; r.y+=r.vy; r.vy+=0.3; r.rotation+=r.rotationSpeed; r.life-=ms; r.alpha = r.life/r.maxLife;
          if (r.life <= 0) gs.rocks.splice(i, 1);
        }
        for (let i = gs.dust.length - 1; i >= 0; i--) {
          const d = gs.dust[i]; d.x+=d.vx; d.y+=d.vy; d.vx*=0.98; d.vy-=0.02; d.life-=ms; d.alpha = (d.life/d.maxLife)*0.6; d.size*=0.995;
          if (d.life <= 0) gs.dust.splice(i, 1);
        }
        for (let i = gs.shockwaves.length - 1; i >= 0; i--) {
          const sw = gs.shockwaves[i]; sw.life-=ms; sw.progress = 1 - sw.life/sw.maxLife; sw.radius = 20*GAME_SCALE + (sw.maxRadius-20*GAME_SCALE)*sw.progress; sw.lineWidth = 8*GAME_SCALE*(1-sw.progress*0.7);
          if (sw.life <= 0) gs.shockwaves.splice(i, 1);
        }
      }
    }

    updateGunslinger(dt, player, bullets, spawnMinions, emit, audio, difficulty, isNight, shake) {
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

      const baseSpeed = 64 + difficulty * 8;
      const nightBoost = isNight ? 1.08 : 1.0;
      
      // Moving Logic (Cover movement if not casting, normal moving otherwise)
      let vx = 0, vy = 0;
      if (!this.skill) {
        // Simple evasive cover movement: strafe sideways
        const strafe = Math.sin(this.t * 1.5) * 1.2;
        const targetDir = { x: dir.x * -0.2 + dir.y * strafe, y: dir.y * -0.2 - dir.x * strafe };
        const keep = dist > 520 ? 1 : dist < 330 ? -1 : 0.4;
        
        vx = (dir.x * keep + targetDir.x) * baseSpeed * nightBoost;
        vy = (dir.y * keep + targetDir.y) * baseSpeed * nightBoost;
        this.x += vx * dt;
        this.y += vy * dt;
      } else if (this.skill === "dash") {
        const speed = baseSpeed * (this.phase >= 2 ? 6.5 : 5);
        // Ensure dashDir exists before applying movement
        if (this.dashDir) {
          vx = this.dashDir.x * speed;
          vy = this.dashDir.y * speed;
          this.x += vx * dt;
          this.y += vy * dt;
          if (emit && Math.random() < 0.4) emit.muzzle(this.x, this.y, -this.dashDir.x, -this.dashDir.y, "player");
        }
      }

      if (Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1) {
        this.walkAnim += dt * 10;
      } else {
        this.walkAnim = 0;
      }

      this.x = clamp(this.x, this.r, WORLD.w - this.r);
      this.y = clamp(this.y, this.r, WORLD.h - this.r);

      if (dist < this.r + player.r + 6 * GAME_SCALE && this.contactCd <= 0) {
        this.contactCd = 0.65;
        player.takeDamage(14 + difficulty * 2 + (this.phase >= 2 ? 6 : 0), { x: dir.x, y: dir.y }, audio);
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
      const bossDmg = 10 + difficulty * 2 + (this.phase >= 2 ? 5 : 0);
      const bossBullet = isNight ? 820 : 760;
      const bulletColor = this.phase >= 2 ? "#ff6fb0" : "#ffd36f";

      if (this.skill === "spray") { // Shotgun Spread
        if (this.skillT >= 0.25 && this.skillStep === 0) {
          if (audio) audio.bossSkill();
          this.skillStep = 1;
        }
        const start = 0.35;
        const intv = this.phase >= 2 ? 0.4 : 0.6;
        const shots = this.phase >= 2 ? 4 : 3;
        const idx = this.skillStep - 1;
        if (this.skillT >= start + idx * intv && idx < shots) {
          // Shotgun blast: multiple bullets in a cone
          const pellets = this.phase >= 2 ? 9 : 6;
          for (let i = 0; i < pellets; i++) {
             this.fireAt(bullets, player.x, player.y, bossBullet * (0.8 + Math.random()*0.3), bossDmg, 3.5, bulletColor, 25);
          }
          if (emit) emit.muzzle(this.x, this.y, dir.x, dir.y, "boss");
          this.skillStep += 1;
        }
        if (this.skillT >= start + shots * intv + 0.25) {
          this.skill = null;
          this.nextSkill = 1.15;
        }
        return;
      }

      if (this.skill === "snipe") { // Grenade throw
        if (this.skillT < 0.7) {
          if (this.skillT >= 0.35 && this.skillStep === 0) {
            if (audio) audio.bossSkill();
            this.skillStep = 1;
          }
          return;
        }
        if (this.skillStep === 1) {
          // Toss a grenade/rocket towards player instead of direct bullet
          if (window.Shooter && window.Shooter.gameplay && window.Shooter.gameplay.specials) {
            const spec = window.Shooter.gameplay.specials.get();
            spec.init(this.x, this.y, player.x, player.y, "grenade", true); // true = enemy projectile
            spec.dmg = bossDmg + 10;
          } else {
            // Fallback
            this.fireAt(bullets, player.x, player.y, bossBullet * 1.35, bossDmg + 8, 6, bulletColor, 1.5);
          }
          if (emit) emit.muzzle(this.x, this.y, dir.x, dir.y, "boss");
          this.skillStep = 2;
        }
        if (this.skillT >= 1.25) {
          this.skill = null;
          this.nextSkill = 1.25;
        }
        return;
      }

      if (this.skill === "dash") {
        if (this.skillT < 0.3) {
          if (this.skillStep === 0) {
            // Pick a dash direction (usually flanking)
            const angle = Math.atan2(dir.y, dir.x) + (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2 + Math.random()*0.5);
            this.dashDir = { x: Math.cos(angle), y: Math.sin(angle) };
            this.skillStep = 1;
            if (audio) audio.bossSkill();
          }
          return;
        }
        if (this.skillT >= (this.phase >= 2 ? 0.7 : 0.6)) {
          this.skill = null;
          this.nextSkill = 0.8;
        }
        return;
      }

      if (this.skill === "summon") {
        if (this.skillT >= 0.4 && this.skillStep === 0) {
          if (audio) audio.bossSkill();
          this.skillStep = 1;
          if (spawnMinions) spawnMinions(this.phase >= 2 ? 8 : 6);
          if (emit) emit.killEnemy(this.x, this.y, true);
        }
        if (this.skillT >= 1.1) {
          this.skill = null;
          this.nextSkill = 1.35;
        }
      }
    }
  }

  root.entities = root.entities || {};
  root.entities.Boss = Boss;
})();
