(() => {
  const root = (window.Shooter = window.Shooter || {});
  const { clamp, norm, rand, randInt, fmtTime, nowISO } = root.util;
  const { Pool } = root;
  const { Bullet, Enemy, Pickup, Particle, Player, Boss, SpecialProjectile, LightningFx } = root.entities;
  const { drawWorld, drawBullet, drawPickup, drawSpecial, drawLightning, drawEnemy, drawBoss, drawParticle, drawPlayer, nightOverlay } =
    root.render;
  const WORLD = root.WORLD;

  class Game {
    constructor(audio, ui) {
      this.audio = audio;
      this.ui = ui;
      this.state = "menu";
      this.player = new Player();
      this.boss = new Boss();
      this.bullets = new Pool(() => new Bullet(), 180);
      this.specials = new Pool(() => new SpecialProjectile(), 40);
      this.fx = new Pool(() => new LightningFx(), 60);
      this.enemies = new Pool(() => new Enemy(), 70);
      this.pickups = new Pool(() => new Pickup(), 50);
      this.particles = new Pool(() => new Particle(), 320);
      this.kills = 0;
      this.coins = 0;
      this.gems = 0;
      this.t = 0;
      this.spawnT = 0;
      this.dayT = 0;
      this.dayLen = 180;
      this.difficulty = 0;
      this.mission = this.rollMission();
      this.upgrades = { hp: 0, speed: 0, damage: 0 };
      this.beforeShop = null;
      this.cam = { x: 0, y: 0 };
      this.wasNight = false;
      this.eliteAnnounceCd = 0;
      this.nextBossAt = 35;
      this.bossLevel = 1;
      this.special = {
        grenade: { cd: 0, cooldown: 4.0 },
        rocket: { cd: 0, cooldown: 7.0 },
        thunder: { cd: 0, cooldown: 12.0 },
      };
      this.thunder = null;
    }
    rollMission() {
      const r = Math.random();
      if (r < 0.58) return { type: "kill", target: 30, text: "击杀 30 个僵尸" };
      if (r < 0.82) return { type: "survive", target: 120, text: "生存 02:00" };
      return { type: "kill", target: 60, text: "击杀 60 个僵尸" };
    }
    start() {
      this.state = "playing";
      this.kills = 0;
      this.coins = root.config?.infiniteCoins ? 999999 : 0;
      this.gems = root.config?.infiniteGems ? 999999 : 0;
      this.t = 0;
      this.spawnT = 0.2;
      this.dayT = 0;
      this.difficulty = 0;
      this.mission = this.rollMission();
      this.upgrades = { hp: 0, speed: 0, damage: 0 };
      this.beforeShop = null;
      this.player = new Player();
      this.player.x = WORLD.w * 0.5;
      this.player.y = WORLD.h * 0.55;
      for (const it of this.bullets.items) it.active = false;
      for (const it of this.specials.items) it.active = false;
      for (const it of this.fx.items) it.active = false;
      for (const it of this.enemies.items) it.active = false;
      for (const it of this.pickups.items) it.active = false;
      for (const it of this.particles.items) it.active = false;
      this.boss.active = false;
      this.nextBossAt = 35;
      this.bossLevel = 1;
      this.special.grenade.cd = 0;
      this.special.rocket.cd = 0;
      this.special.thunder.cd = 0;
      this.thunder = null;
      this.spawnWave(6);
      this.audio.setAmbient(0.22);
    }
    pause() {
      if (this.state !== "playing") return;
      this.state = "paused";
    }
    resume() {
      if (this.state !== "paused") return;
      this.state = "playing";
    }
    openShop() {
      if (this.state !== "playing" && this.state !== "paused") return;
      this.beforeShop = this.state;
      this.state = "shop";
      this.audio.ui();
    }
    closeShop() {
      if (this.state !== "shop") return;
      this.state = this.beforeShop === "paused" ? "paused" : "playing";
      this.beforeShop = null;
      this.audio.ui();
    }
    useSpecial(kind, shake) {
      if (this.state !== "playing") return false;
      const sp = this.special[kind];
      if (!sp || sp.cd > 0) return false;
      const ax = this.player.aimX || 1;
      const ay = this.player.aimY || 0;
      if (kind === "grenade") {
        const speed = 520;
        const g = this.specials.acquire();
        g.init("grenade", this.player.x + ax * 26, this.player.y + ay * 26, ax * speed, ay * speed, 1.2);
        sp.cd = sp.cooldown;
        this.audio.grenade();
        if (shake) shake.kick(1.2);
        return true;
      }
      if (kind === "rocket") {
        const speed = 860;
        const r = this.specials.acquire();
        r.init("rocket", this.player.x + ax * 28, this.player.y + ay * 28, ax * speed, ay * speed, 1.6);
        sp.cd = sp.cooldown;
        this.audio.rocket();
        if (shake) shake.kick(1.8);
        return true;
      }
      if (kind === "thunder") {
        this.thunder = { t: 0, ttl: 1.6, next: 0, interval: 0.18 };
        sp.cd = sp.cooldown;
        this.audio.thunder();
        if (shake) shake.kick(2.2);
        return true;
      }
      return false;
    }
    backToMenu() {
      this.state = "menu";
      this.beforeShop = null;
    }
    die(reason) {
      if (this.state === "dead") return;
      this.state = "dead";
      this.beforeShop = null;
      const score = Math.floor(this.kills * 10 + this.coins + this.gems * 25 + this.t * 0.5);
      const entry = { score, kills: this.kills, time: Math.floor(this.t), at: nowISO() };
      const lb = this.ui.saveLeaderboard(entry);
      this.ui.renderLeaderboard();
      this.ui.setDeathSummary(
        `本局得分：<b>${score}</b><br/>击杀：<b>${this.kills}</b> / 金币：<b>${this.coins}</b> / 钻石：<b>${this.gems}</b><br/>存活：<b>${fmtTime(this.t)}</b><br/>原因：<b>${reason}</b><br/><div style="opacity:.8;margin-top:6px">已写入本地排行榜（当前第 ${lb.findIndex((x) => x.at === entry.at && x.score === entry.score) + 1} 名）</div>`
      );
    }
    onBossKilled() {
      this.audio.bossDie();
      this.killEnemy(this.boss.x, this.boss.y, true);
      this.coins += 180 + Math.floor(this.difficulty) * 40;
      this.gems += 4;
      this.tryDrop(this.boss.x, this.boss.y, true);
      this.tryDrop(this.boss.x + 18, this.boss.y - 10, true);
      this.tryDrop(this.boss.x - 18, this.boss.y + 10, true);
      this.nextBossAt += 45;
      this.bossLevel += 1;
    }
    explode(x, y, radius, dmg, big, shake) {
      this.audio.explosion(big);
      if (shake) shake.kick(big ? 7 : 4);
      this.spawnBurst(x, y, {
        count: big ? 56 : 34,
        speed: big ? 560 : 380,
        spread: 3.14,
        ttlA: 0.12,
        ttlB: 0.46,
        sizeA: 1,
        sizeB: 4,
        color: big ? "#ff9b53" : "#ffd36f",
        alpha: 0.9,
        drag: 3.2,
        gravity: 240,
      });
      this.spawnBurst(x, y, {
        count: big ? 22 : 14,
        speed: big ? 320 : 240,
        spread: 3.14,
        ttlA: 0.2,
        ttlB: 0.55,
        sizeA: 2,
        sizeB: 5,
        color: "rgba(255,255,255,0.55)",
        alpha: 0.5,
        drag: 2.2,
        gravity: 120,
      });

      if (this.boss.active) {
        const dBoss = Math.hypot(x - this.boss.x, y - this.boss.y);
        if (dBoss <= radius + this.boss.r) {
          const died = this.boss.hurt(dmg * 0.9);
          if (died) this.onBossKilled();
        }
      }
      for (const e of this.enemies.items) {
        if (!e.active) continue;
        const d = Math.hypot(x - e.x, y - e.y);
        if (d <= radius + e.r) {
          const scale = clamp(1 - d / (radius + e.r), 0.25, 1);
          const died = e.hurt(dmg * scale);
          if (died) {
            this.kills += 1;
            this.audio.enemyDie(e.elite);
            this.killEnemy(e.x, e.y, e.elite);
            this.tryDrop(e.x, e.y, e.elite);
          } else {
            this.hitEnemy(e.x, e.y);
          }
        }
      }
    }
    isNight() {
      const p = (this.dayT % this.dayLen) / this.dayLen;
      return p >= 0.55 && p <= 0.95;
    }
    nightFactor() {
      const p = (this.dayT % this.dayLen) / this.dayLen;
      const t = clamp((p - 0.55) / 0.4, 0, 1);
      const t2 = t < 0.5 ? t * 2 : (1 - t) * 2;
      return 0.15 + 0.55 * t2;
    }
    spawnWave(n) {
      for (let i = 0; i < n; i += 1) this.spawnEnemy();
    }
    eliteChance() {
      const base = 0.02 + this.difficulty * 0.012 + this.kills * 0.0005;
      return clamp(base, 0.02, 0.12);
    }
    spawnEnemy() {
      const night = this.isNight();
      const base = this.difficulty;
      const roll = Math.random();
      let type = "basic";
      if (roll < 0.12 + base * 0.02) type = "fast";
      else if (roll < 0.18 + base * 0.03) type = "tank";
      else if (roll < 0.18 + base * 0.06) type = "ranged";
      const elite = Math.random() < this.eliteChance() * (night ? 1.25 : 1);
      const edge = randInt(0, 3);
      let x = 0;
      let y = 0;
      if (edge === 0) {
        x = rand(40, WORLD.w - 40);
        y = -20;
      } else if (edge === 1) {
        x = WORLD.w + 20;
        y = rand(40, WORLD.h - 40);
      } else if (edge === 2) {
        x = rand(40, WORLD.w - 40);
        y = WORLD.h + 20;
      } else {
        x = -20;
        y = rand(40, WORLD.h - 40);
      }
      const e = this.enemies.acquire();
      e.init(type, x, y, base + (night ? 0.4 : 0), elite);
      if (elite) {
        this.spawnBurst(x, y, { count: 22, speed: 340, spread: 2.8, ttlA: 0.14, ttlB: 0.35, sizeA: 1, sizeB: 4, color: "#ffd36f", alpha: 0.9, drag: 3.4, gravity: 220 });
        if (this.eliteAnnounceCd <= 0) {
          this.audio.eliteSpawn();
          this.eliteAnnounceCd = 8;
        }
      }
    }
    spawnBurst(x, y, cfg) {
      const n = cfg.count ?? 10;
      const baseSpeed = cfg.speed ?? 260;
      const spread = cfg.spread ?? 1;
      const ttlA = cfg.ttlA ?? 0.12;
      const ttlB = cfg.ttlB ?? 0.35;
      const sizeA = cfg.sizeA ?? 1;
      const sizeB = cfg.sizeB ?? 3;
      const color = cfg.color ?? "#ffffff";
      const alpha = cfg.alpha ?? 1;
      const drag = cfg.drag ?? 4.2;
      const gravity = cfg.gravity ?? 0;
      const baseAng = cfg.baseAng ?? rand(-Math.PI, Math.PI);
      for (let i = 0; i < n; i += 1) {
        const ang = baseAng + rand(-spread, spread);
        const sp = baseSpeed * rand(0.45, 1.05);
        const p = this.particles.acquire();
        p.init({
          x: x + rand(-2, 2),
          y: y + rand(-2, 2),
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          ttl: rand(ttlA, ttlB),
          size: rand(sizeA, sizeB),
          color,
          alpha,
          drag,
          gravity,
        });
      }
    }
    muzzle(x, y, ax, ay, weaponKey) {
      const baseAng = Math.atan2(ay, ax);
      const hot = weaponKey === "shotgun" ? "#ffd36f" : "#e6edf3";
      this.spawnBurst(x, y, { count: weaponKey === "shotgun" ? 12 : 7, speed: 240, spread: 0.6, ttlA: 0.04, ttlB: 0.11, sizeA: 2, sizeB: 4, color: hot, alpha: 0.9, drag: 7, baseAng });
      this.spawnBurst(x, y, { count: 5, speed: 90, spread: 0.9, ttlA: 0.18, ttlB: 0.35, sizeA: 2, sizeB: 4, color: "rgba(255,255,255,0.65)", alpha: 0.45, drag: 2.6, baseAng });
    }
    hitEnemy(x, y) {
      this.spawnBurst(x, y, { count: 8, speed: 220, spread: 1.6, ttlA: 0.08, ttlB: 0.18, sizeA: 1, sizeB: 3, color: "#ff5b6e", alpha: 0.9, drag: 4.4 });
      this.spawnBurst(x, y, { count: 6, speed: 180, spread: 1.4, ttlA: 0.06, ttlB: 0.14, sizeA: 1, sizeB: 2, color: "#ffffff", alpha: 0.7, drag: 5.2 });
    }
    killEnemy(x, y, elite) {
      this.spawnBurst(x, y, { count: elite ? 26 : 18, speed: elite ? 360 : 300, spread: elite ? 2.8 : 2.4, ttlA: 0.12, ttlB: 0.35, sizeA: 1, sizeB: 4, color: elite ? "#ffd36f" : "#ff5b6e", alpha: 0.95, drag: 3.4, gravity: 220 });
      this.spawnBurst(x, y, { count: 10, speed: 240, spread: 2.2, ttlA: 0.1, ttlB: 0.24, sizeA: 1, sizeB: 3, color: "#c7d2fe", alpha: 0.65, drag: 3.9 });
    }
    hurtPlayer(x, y) {
      this.spawnBurst(x, y, { count: 14, speed: 220, spread: 2.4, ttlA: 0.12, ttlB: 0.28, sizeA: 1, sizeB: 3, color: "#ff7b7b", alpha: 0.75, drag: 3.6, gravity: 180 });
    }
    tryDrop(x, y, elite) {
      const coins = elite ? randInt(4, 9) : randInt(1, 4);
      this.pickups.acquire().init("coin", x + rand(-10, 10), y + rand(-10, 10), coins);
      const r = Math.random();
      if (r < 0.16) this.pickups.acquire().init("ammo", x + rand(-12, 12), y + rand(-12, 12), randInt(8, 22));
      if (r < 0.09) this.pickups.acquire().init("med", x + rand(-12, 12), y + rand(-12, 12), randInt(18, 30));
      if (r < 0.12) this.pickups.acquire().init("food", x + rand(-12, 12), y + rand(-12, 12), randInt(14, 26));
      if (r < 0.12) this.pickups.acquire().init("water", x + rand(-12, 12), y + rand(-12, 12), randInt(14, 26));
      if (elite || Math.random() < 0.028) this.pickups.acquire().init("gem", x + rand(-10, 10), y + rand(-10, 10), elite ? 2 : 1);
    }
    handlePickups(audio) {
      for (const p of this.pickups.items) {
        if (!p.active) continue;
        const d = Math.hypot(p.x - this.player.x, p.y - this.player.y);
        if (d <= p.r + this.player.r + 6) {
          p.active = false;
          if (p.type === "coin") this.coins += p.value;
          else if (p.type === "gem") this.gems += p.value;
          else if (p.type === "ammo") {
            for (const s of this.player.inv) s.reserve += p.value;
            if (this.player.inv.length >= 2) this.player.inv[1].reserve += Math.floor(p.value * 0.3);
          } else if (p.type === "med") this.player.hp = clamp(this.player.hp + p.value, 0, this.player.maxHp);
          else if (p.type === "food") this.player.hunger = clamp(this.player.hunger + p.value, 0, this.player.maxHunger);
          else if (p.type === "water") this.player.thirst = clamp(this.player.thirst + p.value, 0, this.player.maxThirst);
          audio.pickup(p.type);
        }
      }
    }
    update(dt, input, shake, audio, tNow) {
      if (this.state !== "playing") return;
      this.t += dt;
      this.dayT += dt;
      this.eliteAnnounceCd = Math.max(0, this.eliteAnnounceCd - dt);
      this.special.grenade.cd = Math.max(0, this.special.grenade.cd - dt);
      this.special.rocket.cd = Math.max(0, this.special.rocket.cd - dt);
      this.special.thunder.cd = Math.max(0, this.special.thunder.cd - dt);
      this.difficulty = clamp(this.t / 80 + this.kills / 45, 0, 7);
      const night = this.isNight();
      if (!this.boss.active && night && !this.wasNight) this.spawnWave(5 + Math.floor(this.difficulty));
      this.wasNight = night;
      if (!this.boss.active) {
        const spawnBase = 1.18 - this.difficulty * 0.12;
        const spawnInterval = clamp(spawnBase * (night ? 0.72 : 1.0), 0.3, 1.25);
        this.spawnT -= dt;
        if (this.spawnT <= 0) {
          const batch = night ? 2 : 1;
          for (let i = 0; i < batch; i += 1) this.spawnEnemy();
          this.spawnT = spawnInterval;
        }
      }
      audio.setAmbient(night ? 0.58 : 0.22);

      if (!this.boss.active && this.kills >= this.nextBossAt) {
        for (const e of this.enemies.items) e.active = false;
        this.boss.init(this.bossLevel + Math.floor(this.difficulty));
        audio.bossSpawn();
        this.spawnBurst(this.boss.x, this.boss.y, { count: 46, speed: 420, spread: 3.14, ttlA: 0.2, ttlB: 0.5, sizeA: 1, sizeB: 4, color: "#ffd36f", alpha: 0.9, drag: 3.2, gravity: 200 });
      }

      this.player.fireHeld = input.fireHeld;
      this.player.move(dt, input, WORLD, night);
      this.player.update(
        dt,
        this.bullets,
        WORLD,
        shake,
        input,
        { muzzle: (x, y, ax, ay, weaponKey) => this.muzzle(x, y, ax, ay, weaponKey) },
        audio,
        tNow
      );
      if (this.player.hp <= 0) this.die("生命耗尽");

      for (const b of this.bullets.items) b.update(dt, WORLD);
      for (const s of this.specials.items) {
        const ev = s.update(dt, WORLD);
        if (ev) {
          if (ev.kind === "grenade") this.explode(ev.x, ev.y, 110, 75 + this.difficulty * 6, false, shake);
          else this.explode(ev.x, ev.y, 170, 120 + this.difficulty * 9, true, shake);
          continue;
        }
        if (!s.active) continue;
        if (this.boss.active) {
          const dBoss = Math.hypot(s.x - this.boss.x, s.y - this.boss.y);
          if (dBoss <= s.r + this.boss.r) {
            s.active = false;
            if (s.kind === "grenade") this.explode(s.x, s.y, 110, 75 + this.difficulty * 6, false, shake);
            else this.explode(s.x, s.y, 170, 120 + this.difficulty * 9, true, shake);
            continue;
          }
        }
        for (const e of this.enemies.items) {
          if (!e.active) continue;
          const d = Math.hypot(s.x - e.x, s.y - e.y);
          if (d <= s.r + e.r) {
            s.active = false;
            if (s.kind === "grenade") this.explode(s.x, s.y, 110, 75 + this.difficulty * 6, false, shake);
            else this.explode(s.x, s.y, 170, 120 + this.difficulty * 9, true, shake);
            break;
          }
        }
      }
      for (const e of this.enemies.items) e.update(dt, WORLD, this.player, this.bullets, this.difficulty, night, audio);
      for (const p of this.pickups.items) p.update(dt);
      for (const p of this.particles.items) p.update(dt);
      for (const f of this.fx.items) f.update(dt);

      if (this.thunder) {
        this.thunder.t += dt;
        this.thunder.next -= dt;
        if (this.thunder.next <= 0) {
          this.thunder.next = this.thunder.interval;
          const target = (() => {
            if (this.boss.active) return { boss: true, x: this.boss.x, y: this.boss.y };
            const list = this.enemies.items.filter((e) => e.active);
            if (!list.length) return null;
            const e = list[Math.floor(Math.random() * list.length)];
            return { enemy: e, x: e.x, y: e.y };
          })();
          if (target) {
            const fx = this.fx.acquire();
            fx.init(this.player.x, this.player.y, target.x, target.y, 0.12, "#7ad0ff");
            this.spawnBurst(target.x, target.y, {
              count: 10,
              speed: 240,
              spread: 3.14,
              ttlA: 0.06,
              ttlB: 0.18,
              sizeA: 1,
              sizeB: 3,
              color: "#7ad0ff",
              alpha: 0.85,
              drag: 4.2,
              gravity: 160,
            });
            audio.thunder();
            shake.kick(1.8);
            if (target.boss) {
              const died = this.boss.hurt(34 + this.difficulty * 4);
              if (died) this.onBossKilled();
            } else if (target.enemy) {
              const died = target.enemy.hurt(40 + this.difficulty * 5);
              if (died) {
                this.kills += 1;
                audio.enemyDie(target.enemy.elite);
                this.killEnemy(target.enemy.x, target.enemy.y, target.enemy.elite);
                this.tryDrop(target.enemy.x, target.enemy.y, target.enemy.elite);
              }
            }
          }
        }
        if (this.thunder.t >= this.thunder.ttl) this.thunder = null;
      }

      if (this.boss.active) {
        this.boss.update(
          dt,
          this.player,
          this.bullets,
          (n) => {
            for (let i = 0; i < n; i += 1) {
              const a = rand(-Math.PI, Math.PI);
              const r = rand(70, 140);
              const x = clamp(this.boss.x + Math.cos(a) * r, 50, WORLD.w - 50);
              const y = clamp(this.boss.y + Math.sin(a) * r, 50, WORLD.h - 50);
              const roll = Math.random();
              let type = "basic";
              if (roll < 0.18) type = "fast";
              else if (roll < 0.3) type = "tank";
              else if (roll < 0.42) type = "ranged";
              const elite = Math.random() < 0.25;
              const e = this.enemies.acquire();
              e.init(type, x, y, this.difficulty + 0.8, elite);
            }
          },
          {
            muzzle: (x, y, ax, ay, weaponKey) => this.muzzle(x, y, ax, ay, weaponKey),
            hitEnemy: (x, y) => this.hitEnemy(x, y),
            killEnemy: (x, y, elite) => this.killEnemy(x, y, elite),
            hurtPlayer: (x, y) => this.hurtPlayer(x, y),
          },
          audio,
          this.difficulty,
          night
        );
      }

      for (const b of this.bullets.items) {
        if (!b.active || !b.fromPlayer) continue;
        if (this.boss.active) {
          const dBoss = Math.hypot(b.x - this.boss.x, b.y - this.boss.y);
          if (dBoss <= (b.r ?? 2.4) + this.boss.r) {
            b.active = false;
            audio.hit();
            this.hitEnemy(b.x, b.y);
            const died = this.boss.hurt(b.dmg);
            if (died) {
              this.onBossKilled();
            }
            continue;
          }
        }
        for (const e of this.enemies.items) {
          if (!e.active) continue;
          const d = Math.hypot(b.x - e.x, b.y - e.y);
          if (d <= b.r + e.r) {
            b.active = false;
            const died = e.hurt(b.dmg);
            audio.hit();
            shake.kick(1.4);
            this.hitEnemy(b.x, b.y);
            if (died) {
              this.kills += 1;
              audio.enemyDie(e.elite);
              this.killEnemy(e.x, e.y, e.elite);
              this.tryDrop(e.x, e.y, e.elite);
            }
            break;
          }
        }
      }

      for (const b of this.bullets.items) {
        if (!b.active || b.fromPlayer) continue;
        const d = Math.hypot(b.x - this.player.x, b.y - this.player.y);
        if (d <= b.r + this.player.r) {
          b.active = false;
          this.player.takeDamage(b.dmg, norm(b.vx, b.vy), audio);
          shake.kick(3.2);
          this.hurtPlayer(this.player.x, this.player.y);
        }
      }

      this.handlePickups(audio);

      if (this.mission.type === "kill") {
        if (this.kills >= this.mission.target) {
          this.coins += 30;
          this.gems += 1;
          this.mission = this.rollMission();
          audio.ui();
        }
      } else {
        if (this.t >= this.mission.target) {
          this.coins += 40;
          this.gems += 1;
          this.mission = this.rollMission();
          audio.ui();
        }
      }
    }
    updateAim(input, canvas, viewW, viewH) {
      if (!input.hasAim) return;
      const rect = canvas.getBoundingClientRect();
      const sx = input.aimScreenX - rect.left;
      const sy = input.aimScreenY - rect.top;
      const wx = this.cam.x + (sx / rect.width) * viewW;
      const wy = this.cam.y + (sy / rect.height) * viewH;
      this.player.setAim(wx - this.player.x, wy - this.player.y);
    }
    updateCamera(viewW, viewH, shake) {
      const off = shake.offset();
      const cx = clamp(this.player.x - viewW / 2, 0, WORLD.w - viewW);
      const cy = clamp(this.player.y - viewH / 2, 0, WORLD.h - viewH);
      this.cam.x = clamp(cx + off.x, 0, Math.max(0, WORLD.w - viewW));
      this.cam.y = clamp(cy + off.y, 0, Math.max(0, WORLD.h - viewH));
    }
    render(ctx, viewW, viewH, atlas) {
      drawWorld(ctx, WORLD, this.cam, viewW, viewH);
      for (const p of this.pickups.items) drawPickup(ctx, this.cam, p);
      for (const b of this.bullets.items) drawBullet(ctx, this.cam, b);
      for (const s of this.specials.items) drawSpecial(ctx, this.cam, s);
      for (const e of this.enemies.items) drawEnemy(ctx, atlas, this.cam, e);
      drawBoss(ctx, atlas, this.cam, this.boss);
      for (const f of this.fx.items) drawLightning(ctx, this.cam, f);
      for (const p of this.particles.items) drawParticle(ctx, this.cam, p);
      drawPlayer(ctx, atlas, this.cam, this.player);
      nightOverlay(ctx, viewW, viewH, this.nightFactor());
    }
  }

  root.Game = Game;
})();
