(() => {
  const root = (window.Shooter = window.Shooter || {});
  const { clamp, norm, rand, randInt, fmtTime, nowISO } = root.util;
  const { Pool } = root;
  const { Bullet, Enemy, Pickup, Particle, Player, Boss, CameraShake, SpecialProjectile, LightningFx, FloatingText } = root.entities;
  const { drawWorld, drawBullet, drawPickup, drawSpecial, drawLightning, drawEnemy, drawBoss, drawParticle, drawPlayer, nightOverlay, drawFloatingText } =
    root.render;
  const WORLD = root.WORLD;
  const GAME_SCALE = Math.max(0.5, Math.min(3, Number(root.constants?.GAME_SCALE ?? 1) || 1));
  const circleRectResolve = root.collision?.circleRectResolve;
  const BODY_PUSH_RATIO = 0.6;
  const ENEMY_BODY_PUSH_RATIO = 0.55;

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
      this.floatingTexts = new Pool(() => new FloatingText(), 40);
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
      this.dropCount = { normal: 0, elite: 0 };
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
      for (const it of this.floatingTexts.items) it.active = false;
      this.boss.active = false;
      this.nextBossAt = 35;
      this.bossLevel = 1;
      this.dropCount = { normal: 0, elite: 0 };
      this.special.grenade.cd = 0;
      this.special.rocket.cd = 0;
      this.special.thunder.cd = 0;
      this.thunder = null;
      this.firstSwordsmanSpawned = false;
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
    spawnBossNow(kind, audio) {
      if (this.state === "menu" || this.state === "dead") return false;
      const level = this.bossLevel + Math.floor(this.difficulty);
      this.boss.active = false;
      this.boss.init(level, kind);
      if (audio) audio.bossSpawn();
      this.spawnBurst(this.boss.x, this.boss.y, {
        count: 56,
        speed: 520,
        spread: 3.14,
        ttlA: 0.2,
        ttlB: 0.55,
        sizeA: 1,
        sizeB: 5,
        color: kind === "fire_giant" ? "#ff4400" : (kind === "gunslinger" ? "#ffd36f" : (kind === "void_mother" ? "#ff00ff" : "#7ad0ff")),
        alpha: 0.92,
        drag: 3.0,
        gravity: 200,
      });
      return true;
    }
    useSpecial(kind, shake) {
      if (this.state !== "playing") return false;
      const sp = this.special[kind];
      if (!sp || sp.cd > 0) return false;
      const ax = this.player.aimX || 1;
      const ay = this.player.aimY || 0;
      const spawnOff = (this.player?.r ?? 16) + 10 * GAME_SCALE;
      if (kind === "grenade") {
        const speed = 520;
        const g = this.specials.acquire();
        g.init("grenade", this.player.x + ax * spawnOff, this.player.y + ay * spawnOff, ax * speed, ay * speed, 1.2);
        sp.cd = sp.cooldown;
        this.audio.grenade();
        if (shake) shake.kick(1.2);
        return true;
      }
      if (kind === "rocket") {
        const speed = 860;
        const r = this.specials.acquire();
        r.init("rocket", this.player.x + ax * (spawnOff + 2 * GAME_SCALE), this.player.y + ay * (spawnOff + 2 * GAME_SCALE), ax * speed, ay * speed, 1.6);
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
      const epicKey = this.rollEpicWeaponDropKey();
      this.pickups.acquire().init("weapon", this.boss.x + rand(-12, 12), this.boss.y + rand(-12, 12), epicKey);
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

      // Add a scorch mark
      if (WORLD.details) {
        WORLD.details.push({
          x: x,
          y: y,
          type: 'tile', // We'll just use a dark tile as scorch or we can add a 'scorch' type in render.js
          size: radius * 1.5,
          rot: Math.random() * Math.PI * 2,
          opacity: 0.3,
          isScorch: true
        });
      }

      if (this.boss.active) {
        const dBoss = Math.hypot(x - this.boss.x, y - this.boss.y);
        if (dBoss <= radius + this.boss.r) {
          const actualDmg = Math.floor(dmg * 0.9);
          const died = this.boss.hurt(actualDmg);
          this.floatingTexts.acquire().init(`-${actualDmg}`, this.boss.x, this.boss.y - this.boss.r, "#ff0000", 0.5);
          if (died) this.onBossKilled();
        }
      }
      for (const e of this.enemies.items) {
        if (!e.active) continue;
        const d = Math.hypot(x - e.x, y - e.y);
        if (d <= radius + e.r) {
          const scale = clamp(1 - d / (radius + e.r), 0.25, 1);
          const actualDmg = Math.floor(dmg * scale);
          const died = e.hurt(actualDmg);
          this.floatingTexts.acquire().init(`-${actualDmg}`, e.x, e.y - e.r, "#ff0000", 0.5);
          if (died) {
            this.kills += 1;
            this.audio.enemyDie(e.elite);
            this.killEnemy(e.x, e.y, e.elite, e.type);
            this.tryDrop(e.x, e.y, e.elite);
            this.progressKillDrops(e.x, e.y, e.elite);
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
      
      if (this.kills === 0 && this.enemies.activeCount === 0 && !this.firstSwordsmanSpawned) {
        type = "swordsman";
        this.firstSwordsmanSpawned = true;
      } else {
        if (roll < 0.12 + base * 0.02) type = "fast";
        else if (roll < 0.18 + base * 0.03) type = "tank";
        else if (roll < 0.18 + base * 0.06) type = "ranged";
        else if (roll < 0.25 + base * 0.08) type = "swordsman";
      }

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
    killEnemy(x, y, elite, type) {
      this.spawnBurst(x, y, { count: elite ? 26 : 18, speed: elite ? 360 : 300, spread: elite ? 2.8 : 2.4, ttlA: 0.12, ttlB: 0.35, sizeA: 1, sizeB: 4, color: elite ? "#ffd36f" : "#ff5b6e", alpha: 0.95, drag: 3.4, gravity: 220 });
      this.spawnBurst(x, y, { count: 10, speed: 240, spread: 2.2, ttlA: 0.1, ttlB: 0.24, sizeA: 1, sizeB: 3, color: "#c7d2fe", alpha: 0.65, drag: 3.9 });
      if (WORLD.details) {
        WORLD.details.push({ x, y, type: "gore", color: root.render.ENEMY_COLORS ? (root.render.ENEMY_COLORS[type]?.shadow || "#8b2a2a") : "#8b2a2a", size: GAME_SCALE * (elite ? 12 : 7), ttl: 20 });
      }
    }
    explodeBarrel(x, y) {
      this.audio.explosion(true);
      
      // Need to find the shake object since it's passed into update() not stored on Game
      // Let's try to get it from the global entities if not available directly
      if (this.currentShake) {
        this.currentShake.kick(0.65);
      }

      this.spawnBurst(x, y, { count: 40, speed: 450, spread: Math.PI, ttlA: 0.2, ttlB: 0.45, sizeA: 2, sizeB: 6, color: "#ff8822", alpha: 1, drag: 4.0 });
      this.spawnBurst(x, y, { count: 30, speed: 300, spread: Math.PI, ttlA: 0.3, ttlB: 0.6, sizeA: 2, sizeB: 5, color: "#555555", alpha: 0.6, drag: 3.0 });
      
      const r = 240;
      const dmg = 80;
      
      // Damage enemies
      for (const e of this.enemies.items) {
        if (!e.active) continue;
        const dx = e.x - x;
        const dy = e.y - y;
        const dist = Math.hypot(dx, dy);
        if (dist < r) {
          const falloff = 1 - dist / r;
          e.hp -= dmg * falloff;
          e.hitFlash = 0.12;
          if (dist > 10) {
            e.x += (dx / dist) * 40 * falloff;
            e.y += (dy / dist) * 40 * falloff;
          }
          if (e.hp <= 0 && !e.dead) {
            e.dead = true;
            this.killEnemy(e.x, e.y, e.elite, e.type);
            this.progressKillDrops(e.elite);
            this.kills += 1;
            this.coins += e.elite ? 4 : 1;
          }
        }
      }
      
      // Damage Boss
      if (this.boss && this.boss.active) {
        const dx = this.boss.x - x;
        const dy = this.boss.y - y;
        const dist = Math.hypot(dx, dy);
        if (dist < r + this.boss.r) {
          const falloff = 1 - Math.max(0, dist - this.boss.r) / r;
          this.boss.hp -= dmg * 0.7 * falloff;
          this.boss.hitFlash = 0.15;
          if (this.boss.hp <= 0 && !this.boss.dead) {
            this.boss.dead = true;
            this.onBossKilled();
          }
        }
      }

      // Damage player
      const pdx = this.player.x - x;
      const pdy = this.player.y - y;
      const pdist = Math.hypot(pdx, pdy);
      if (pdist < r && window.Shooter?.config?.invincible !== true) {
        const falloff = 1 - pdist / r;
        this.player.takeDamage(dmg * 0.4 * falloff, { x: pdx / pdist, y: pdy / pdist }, this.audio);
        this.hurtPlayer(this.player.x, this.player.y);
      }
      
      // Chain reaction
      for (const b of WORLD.barrels) {
        if (!b.active || (b.x === x && b.y === y)) continue;
        const bdx = b.x - x;
        const bdy = b.y - y;
        if (Math.hypot(bdx, bdy) < r) {
          setTimeout(() => {
            if (b.active) {
              b.active = false;
              this.explodeBarrel(b.x, b.y);
            }
          }, randInt(100, 250));
        }
      }
    }
    hurtPlayer(x, y) {
      const isInvuln = this.player.invuln > 0 || (root.config && root.config.invincible);
      if (isInvuln) return;
      this.spawnBurst(x, y, { count: 14, speed: 220, spread: 2.4, ttlA: 0.12, ttlB: 0.28, sizeA: 1, sizeB: 3, color: "#ff7b7b", alpha: 0.75, drag: 3.6, gravity: 180 });
    }
    rollWeaponDropKey() {
      const pool = ["smg", "dmr", "sniper", "hmg"];
      const owned = new Set(this.player.inv.map((s) => s.weapon?.key).filter(Boolean));
      const avail = pool.filter((k) => !owned.has(k));
      const list = avail.length ? avail : pool;
      return list[Math.floor(Math.random() * list.length)];
    }
    rollEpicWeaponDropKey() {
      const pool = ["epic_smg", "epic_dmr", "epic_sniper", "epic_hmg"];
      return pool[Math.floor(Math.random() * pool.length)];
    }
    rollBuffDropId() {
      const pool = ["hp_up", "spd_up", "dmg_up"];
      return pool[Math.floor(Math.random() * pool.length)];
    }
    progressKillDrops(x, y, elite) {
      if (elite) this.dropCount.elite += 1;
      else this.dropCount.normal += 1;
      const need = elite ? 5 : 10;
      const cur = elite ? this.dropCount.elite : this.dropCount.normal;
      if (cur < need) return false;
      if (elite) this.dropCount.elite = 0;
      else this.dropCount.normal = 0;
      const roll = Math.random();
      if (roll < 0.5) this.pickups.acquire().init("weapon", x + rand(-12, 12), y + rand(-12, 12), this.rollWeaponDropKey());
      else this.pickups.acquire().init("buff", x + rand(-12, 12), y + rand(-12, 12), this.rollBuffDropId());
      return true;
    }
    giveWeapon(weaponKey) {
      const w = root.constants.WEAPONS[weaponKey];
      if (!w) return { ok: false, reason: "missing" };
      const inv = this.player.inv;
      const idx = inv.findIndex((s) => s.weapon && s.weapon.key === weaponKey);
      const reserveAdd = Math.max(40, Math.floor((w.magSize || 12) * 2.5));
      if (idx >= 0) {
        inv[idx].reserve += reserveAdd;
        return { ok: true, w, already: true, reserveAdd };
      }
      if (inv.length >= 5) {
        if (String(weaponKey).startsWith("epic_")) {
          const at = clamp(this.player.activeSlot, 0, inv.length - 1);
          inv[at] = { weapon: w, mag: w.magSize, reserve: Math.max(120, Math.floor((w.magSize || 12) * 5)), reloading: 0, cooldown: 0 };
          this.player.activeSlot = at;
          return { ok: true, w, replaced: true };
        }
        const s = inv[this.player.activeSlot] || inv[0];
        if (s) s.reserve += reserveAdd;
        return { ok: true, w, full: true, reserveAdd };
      }
      const reserve = Math.max(80, Math.floor((w.magSize || 12) * 4));
      inv.push({ weapon: w, mag: w.magSize, reserve, reloading: 0, cooldown: 0 });
      this.player.activeSlot = inv.length - 1;
      return { ok: true, w, added: true };
    }
    applyBuff(buffId) {
      const cap = 12;
      if (buffId === "hp_up") {
        this.upgrades.hp = Math.min(cap, (this.upgrades.hp ?? 0) + 1);
        this.player.maxHp += 10;
        this.player.hp = clamp(this.player.hp + 10, 0, this.player.maxHp);
        return { ok: true, text: "生命上限提升 +10" };
      }
      if (buffId === "spd_up") {
        this.upgrades.speed = Math.min(cap, (this.upgrades.speed ?? 0) + 1);
        this.player.speed *= 1.06;
        return { ok: true, text: "移速提升 +6%" };
      }
      if (buffId === "dmg_up") {
        this.upgrades.damage = Math.min(cap, (this.upgrades.damage ?? 0) + 1);
        this.player.damageMul *= 1.08;
        return { ok: true, text: "伤害提升 +8%" };
      }
      return { ok: false, text: "未知增益" };
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
      const toast = this.ui?.toast;
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
          else if (p.type === "weapon") {
            const res = this.giveWeapon(p.value);
            if (toast && res && res.ok && res.w) {
              if (res.added) toast(`获得武器：${res.w.name}`, "buff");
              else if (res.already) toast(`${res.w.name} 弹药 +${res.reserveAdd}`, "good");
              else if (res.replaced) toast(`史诗掉落已装备：${res.w.name}`, "buff");
              else if (res.full) toast(`武器槽已满 → ${res.w.name} 弹药 +${res.reserveAdd}`, "good");
            }
          } else if (p.type === "buff") {
            const res = this.applyBuff(p.value);
            if (toast && res && res.text) toast(res.text, "buff");
          }
          audio.pickup(p.type);
        }
      }
    }
    resolveBodyPushes() {
      const p = this.player;
      if (!p) return;
      const enemies = this.enemies.items;
      const pushFrom = (x, y, r) => {
        const dx = p.x - x;
        const dy = p.y - y;
        const dist = Math.hypot(dx, dy);
        const min = (p.r ?? 16) + r;
        if (dist >= min) return;
        const nx = dist > 1e-6 ? dx / dist : 1;
        const ny = dist > 1e-6 ? dy / dist : 0;
        const push = (min - dist) * BODY_PUSH_RATIO;
        p.x += nx * push;
        p.y += ny * push;
      };

      for (const e of enemies) {
        if (!e.active) continue;
        pushFrom(e.x, e.y, e.r ?? 18);
      }
      if (this.boss && this.boss.active) pushFrom(this.boss.x, this.boss.y, this.boss.r ?? 46);

      p.x = clamp(p.x, p.r, WORLD.w - p.r);
      p.y = clamp(p.y, p.r, WORLD.h - p.r);
      if (circleRectResolve) {
        for (const ob of WORLD.obstacles) {
          const res = circleRectResolve(p.x, p.y, p.r, ob);
          if (res.hit) {
            p.x = res.x;
            p.y = res.y;
          }
        }
      }

      const resolveEnemyObstacles = (e) => {
        e.x = clamp(e.x, e.r, WORLD.w - e.r);
        e.y = clamp(e.y, e.r, WORLD.h - e.r);
        if (!circleRectResolve) return;
        for (const ob of WORLD.obstacles) {
          const res = circleRectResolve(e.x, e.y, e.r, ob);
          if (res.hit) {
            e.x = res.x;
            e.y = res.y;
          }
        }
      };

      for (let i = 0; i < enemies.length; i += 1) {
        const a = enemies[i];
        if (!a.active) continue;
        for (let j = i + 1; j < enemies.length; j += 1) {
          const b = enemies[j];
          if (!b.active) continue;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          const min = (a.r ?? 18) + (b.r ?? 18);
          if (dist >= min) continue;
          const nx = dist > 1e-6 ? dx / dist : 1;
          const ny = dist > 1e-6 ? dy / dist : 0;
          const push = (min - dist) * ENEMY_BODY_PUSH_RATIO * 0.5;
          a.x += nx * push;
          a.y += ny * push;
          b.x -= nx * push;
          b.y -= ny * push;
        }
      }
      for (const e of enemies) {
        if (!e.active) continue;
        resolveEnemyObstacles(e);
      }
    }
    update(dt, input, shake, audio, tNow) {
      // Cleanup old gore details
      if (WORLD.details) {
        for (let i = WORLD.details.length - 1; i >= 0; i--) {
          const d = WORLD.details[i];
          if (d.ttl !== undefined) {
            d.ttl -= dt;
            d.opacity = Math.min(1, d.ttl / 2); // Fade out in the last 2 seconds
            if (d.ttl <= 0) {
              WORLD.details.splice(i, 1);
            }
          }
        }
      }

      if (this.state !== "playing") return;
      this.currentShake = shake;
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
        const randKind = Math.random();
        let kind = "core";
        if (randKind < 0.33) kind = "gunslinger";
        else if (randKind < 0.66) kind = "fire_giant";
        this.boss.init(this.bossLevel + Math.floor(this.difficulty), kind);
        audio.bossSpawn();
        this.spawnBurst(this.boss.x, this.boss.y, { count: 46, speed: 420, spread: 3.14, ttlA: 0.2, ttlB: 0.5, sizeA: 1, sizeB: 4, color: "#ffd36f", alpha: 0.9, drag: 3.2, gravity: 200 });
      }

      this.player.fireHeld = input.fireHeld;
      const emit = {
        muzzle: (x, y, ax, ay, weaponKey) => this.muzzle(x, y, ax, ay, weaponKey),
        spawnBurst: (x, y, cfg) => this.spawnBurst(x, y, cfg),
        specialShoot: (kind) => {
          // If kind is grenade or thunder_gun
          if (kind === "grenade") {
            const ax = this.player.aimX || 1;
            const ay = this.player.aimY || 0;
            const spawnOff = (this.player?.r ?? 16) + 10 * GAME_SCALE;
            const speed = 520;
            const g = this.specials.acquire();
            g.init("grenade", this.player.x + ax * spawnOff, this.player.y + ay * spawnOff, ax * speed, ay * speed, 1.2);
            this.audio.grenade();
          } else if (kind === "thunder_gun") {
            this.thunder = { t: 0, ttl: 1.6, next: 0, interval: 0.18 };
            this.audio.thunder();
          }
        }
      };
      this.player.move(dt, input, WORLD, night, emit);
      this.player.update(
        dt,
        this.bullets,
        WORLD,
        shake,
        input,
        emit,
        audio,
        tNow
      );
      if (this.player.hp <= 0) this.die("生命耗尽");

      for (const b of this.bullets.items) {
        if (!b.active) continue;
        const ev = b.update(dt, WORLD);
        if (ev && ev.reason === "hit_wall" && b.isRocket) {
           this.explode(b.x, b.y, b.explosionRadius * GAME_SCALE, b.dmg, b.fromPlayer, shake);
        }
        
        if (b.active && b.isRocket) {
          b.tailT += dt;
          if (b.tailT > 0.02) {
            b.tailT = 0;
            this.spawnBurst(b.x - b.vx * 0.05, b.y - b.vy * 0.05, {
              count: 3,
              speed: 10 * GAME_SCALE,
              spread: 0.5,
              ttlA: 0.2,
              ttlB: 0.4,
              sizeA: 2 * GAME_SCALE,
              sizeB: 4 * GAME_SCALE,
              color: "#ff6600",
              alpha: 0.8,
              drag: 2
            });
            this.spawnBurst(b.x - b.vx * 0.08, b.y - b.vy * 0.08, {
              count: 2,
              speed: 5 * GAME_SCALE,
              spread: 0.2,
              ttlA: 0.3,
              ttlB: 0.6,
              sizeA: 3 * GAME_SCALE,
              sizeB: 5 * GAME_SCALE,
              color: "rgba(100,100,100,0.5)",
              alpha: 0.5,
              drag: 4
            });
          }
        }
      }
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
      for (const t of this.floatingTexts.items) t.update(dt);
      for (const f of this.fx.items) f.update(dt);
      for (const b of WORLD.barrels) {
        if (!b.active) continue;
        for (const bul of this.bullets.items) {
          if (!bul.active) continue;
          const dist = Math.hypot(b.x - bul.x, b.y - bul.y);
          if (dist < 22) { // barrel radius + bullet radius
            bul.active = false;
            b.hp -= bul.dmg;
            if (b.hp <= 0) {
              b.active = false;
              this.explodeBarrel(b.x, b.y);
            } else if (!bul.isRocket) {
              this.hitEnemy(bul.x, bul.y);
            }
            if (bul.isRocket) {
              this.explode(bul.x, bul.y, bul.explosionRadius * GAME_SCALE, bul.dmg, true, shake);
            }
          }
        }
      }

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
                this.killEnemy(target.enemy.x, target.enemy.y, target.enemy.elite, target.enemy.type);
                this.tryDrop(target.enemy.x, target.enemy.y, target.enemy.elite);
                this.progressKillDrops(target.enemy.x, target.enemy.y, target.enemy.elite);
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
            killEnemy: (x, y, elite, type) => this.killEnemy(x, y, elite, type),
            hurtPlayer: (x, y) => this.hurtPlayer(x, y),
          },
          audio,
          this.difficulty,
          night,
          shake
        );

        if (this.boss.kind === "fire_giant" && this.boss.fg && this.boss.fg.readyToDie) {
          this.boss.fg.readyToDie = false;
          this.boss.active = false;
          this.kills += 1;
          this.killEnemy(this.boss.x, this.boss.y, true);
          this.onBossKilled();
        }
      }

      this.resolveBodyPushes();

      for (const b of this.bullets.items) {
        if (!b.active || !b.fromPlayer) continue;
        if (this.boss.active) {
          const dBoss = Math.hypot(b.x - this.boss.x, b.y - this.boss.y);
          if (dBoss <= (b.r ?? 2.4) + this.boss.r) {
            b.active = false;
            if (b.isRocket) {
              this.explode(b.x, b.y, b.explosionRadius * GAME_SCALE, b.dmg, true, shake);
            } else {
              audio.hit();
              this.hitEnemy(b.x, b.y);
              const died = this.boss.hurt(b.dmg);
              if (died) {
                this.onBossKilled();
              }
            }
            continue;
          }
        }
        for (const e of this.enemies.items) {
          if (!e.active) continue;
          const d = Math.hypot(b.x - e.x, b.y - e.y);
          if (d <= b.r + e.r) {
            b.active = false;
            if (b.isRocket) {
              this.explode(b.x, b.y, b.explosionRadius * GAME_SCALE, b.dmg, true, shake);
            } else {
              const died = e.hurt(b.dmg);
              audio.hit();
              shake.kick(1.4);
              this.hitEnemy(b.x, b.y);
              if (died) {
                this.kills += 1;
                audio.enemyDie(e.elite);
                this.killEnemy(e.x, e.y, e.elite, e.type);
                this.tryDrop(e.x, e.y, e.elite);
                this.progressKillDrops(e.x, e.y, e.elite);
              }
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
          const isInvuln = this.player.invuln > 0 || (root.config && root.config.invincible);
          if (!isInvuln) {
            this.player.takeDamage(b.dmg, norm(b.vx, b.vy), audio);
            if (b.morphilaBarrage && this.boss && this.boss.kind === "morphila") {
               this.boss.mp.marks++;
               this.boss.mp.markTimer = 2.0;
               if (this.boss.mp.marks >= 3) {
                  this.boss.mp.marks = 0;
                  this.player.takeDamage(35, {x:0, y:0}, audio);
                  this.player.speedMod = 0.7;
                  this.player.speedModTimer = 3.0;
               }
            }
            shake.kick(3.2);
            this.hurtPlayer(this.player.x, this.player.y);
          }
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
      drawWorld(ctx, WORLD, this.cam, viewW, viewH, atlas);
      for (const p of this.pickups.items) drawPickup(ctx, this.cam, p);
      for (const b of this.bullets.items) drawBullet(ctx, this.cam, b);
      for (const s of this.specials.items) drawSpecial(ctx, this.cam, s);
      for (const e of this.enemies.items) drawEnemy(ctx, atlas, this.cam, e);
      drawBoss(ctx, atlas, this.cam, this.boss);
      for (const f of this.fx.items) drawLightning(ctx, this.cam, f);
      for (const p of this.particles.items) drawParticle(ctx, this.cam, p);
      drawPlayer(ctx, atlas, this.cam, this.player);
      for (const t of this.floatingTexts.items) drawFloatingText(ctx, this.cam, t);
      nightOverlay(ctx, viewW, viewH, this.nightFactor());
    }
  }

  root.Game = Game;
})();
