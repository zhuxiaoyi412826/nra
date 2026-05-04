(() => {
  const root = (window.Shooter = window.Shooter || {});
  const { clamp, norm, rand, randInt } = root.util;
  const { circleRectHit, circleRectResolve } = root.collision;
  const { WEAPONS, PICKUP } = root.constants;

  class Bullet {
    constructor() {
      this.active = false;
      this.x = 0;
      this.y = 0;
      this.vx = 0;
      this.vy = 0;
      this.r = 2.4;
      this.dmg = 0;
      this.ttl = 0;
      this.fromPlayer = true;
      this.color = null;
    }
    init({ x, y, vx, vy, dmg, ttl, fromPlayer, r, color }) {
      this.active = true;
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.dmg = dmg;
      this.ttl = ttl;
      this.fromPlayer = fromPlayer;
      this.r = r ?? 2.4;
      this.color = color ?? null;
    }
    update(dt, world) {
      if (!this.active) return;
      this.ttl -= dt;
      if (this.ttl <= 0) {
        this.active = false;
        return;
      }
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.x < 0 || this.y < 0 || this.x > world.w || this.y > world.h) {
        this.active = false;
        return;
      }
      for (const ob of world.obstacles) {
        if (circleRectHit(this.x, this.y, this.r, ob)) {
          this.active = false;
          return;
        }
      }
    }
  }

  class Enemy {
    constructor() {
      this.active = false;
      this.type = "basic";
      this.elite = false;
      this.x = 0;
      this.y = 0;
      this.r = 18;
      this.hp = 30;
      this.maxHp = 30;
      this.speed = 120;
      this.touchDmg = 9;
      this.touchCd = 0;
      this.hitFlash = 0;
      this.shootCd = 0;
    }
    init(t, x, y, difficulty, elite) {
      this.active = true;
      this.type = t;
      this.elite = Boolean(elite);
      this.x = x;
      this.y = y;
      const base = difficulty;
      if (t === "basic") {
        this.r = 18;
        this.maxHp = 32 + base * 8;
        this.speed = 118 + base * 12;
        this.touchDmg = 9 + base * 2;
        this.shootCd = 0;
      } else if (t === "fast") {
        this.r = 16;
        this.maxHp = 26 + base * 7;
        this.speed = 168 + base * 16;
        this.touchDmg = 8 + base * 2;
        this.shootCd = 0;
      } else if (t === "tank") {
        this.r = 22;
        this.maxHp = 70 + base * 20;
        this.speed = 88 + base * 10;
        this.touchDmg = 14 + base * 3;
        this.shootCd = 0;
      } else {
        this.r = 17;
        this.maxHp = 30 + base * 10;
        this.speed = 110 + base * 10;
        this.touchDmg = 7 + base * 2;
        this.shootCd = rand(0.6, 1.2);
      }
      if (this.elite) {
        this.r += 3;
        this.maxHp = Math.floor(this.maxHp * 1.85 + 10);
        this.speed *= 1.14;
        this.touchDmg = Math.floor(this.touchDmg * 1.25);
        this.shootCd *= 0.85;
      }
      this.hp = this.maxHp;
      this.touchCd = 0;
      this.hitFlash = 0;
    }
    hurt(dmg) {
      this.hp -= dmg;
      this.hitFlash = 0.08;
      if (this.hp <= 0) {
        this.active = false;
        return true;
      }
      return false;
    }
    update(dt, world, player, bullets, difficulty, isNight, audio) {
      if (!this.active) return;
      this.hitFlash = Math.max(0, this.hitFlash - dt);
      this.touchCd = Math.max(0, this.touchCd - dt);
      const toP = { x: player.x - this.x, y: player.y - this.y };
      const dist = Math.hypot(toP.x, toP.y);
      const n = dist > 1e-6 ? { x: toP.x / dist, y: toP.y / dist } : { x: 0, y: 0 };
      const nightBoost = isNight ? 1.15 : 1.0;
      const eliteBoost = this.elite ? 1.08 : 1.0;
      const desiredSpeed = this.type === "ranged" && dist < 280 ? this.speed * 0.35 : this.speed;
      this.x += n.x * desiredSpeed * nightBoost * eliteBoost * dt;
      this.y += n.y * desiredSpeed * nightBoost * eliteBoost * dt;
      this.x = clamp(this.x, this.r, world.w - this.r);
      this.y = clamp(this.y, this.r, world.h - this.r);
      for (const ob of world.obstacles) {
        const res = circleRectResolve(this.x, this.y, this.r, ob);
        if (res.hit) {
          this.x = res.x;
          this.y = res.y;
        }
      }
      if (dist < this.r + player.r + 2 && this.touchCd <= 0) {
        this.touchCd = this.elite ? 0.45 : 0.55;
        player.takeDamage(this.touchDmg, { x: n.x, y: n.y }, audio);
      }
      if (this.type === "ranged") {
        this.shootCd = Math.max(0, this.shootCd - dt);
        if (this.shootCd <= 0 && dist < 560 && dist > 140) {
          const rate = (this.elite ? 0.82 : 1.0) / nightBoost;
          this.shootCd = rand(0.85, 1.25) * rate;
          const aim = norm(toP.x, toP.y);
          const sp = 580 + difficulty * 70 + (this.elite ? 120 : 0);
          const b = bullets.acquire();
          b.init({
            x: this.x + aim.x * (this.r + 6),
            y: this.y + aim.y * (this.r + 6),
            vx: aim.x * sp,
            vy: aim.y * sp,
            dmg: (8 + difficulty * 2) * (this.elite ? 1.25 : 1),
            ttl: 1.8,
            fromPlayer: false,
          });
        }
      }
    }
  }

  class Pickup {
    constructor() {
      this.active = false;
      this.type = "coin";
      this.x = 0;
      this.y = 0;
      this.r = 10;
      this.value = 1;
      this.ttl = 18;
    }
    init(type, x, y, value) {
      this.active = true;
      this.type = type;
      this.x = x;
      this.y = y;
      this.value = value;
      this.r = type === "gem" ? 11 : 10;
      this.ttl = 18;
    }
    update(dt) {
      if (!this.active) return;
      this.ttl -= dt;
      if (this.ttl <= 0) this.active = false;
    }
  }

  class Particle {
    constructor() {
      this.active = false;
      this.x = 0;
      this.y = 0;
      this.vx = 0;
      this.vy = 0;
      this.life = 0;
      this.ttl = 0;
      this.size = 2;
      this.color = "#ffffff";
      this.alpha = 1;
      this.drag = 3.5;
      this.gravity = 0;
    }
    init({ x, y, vx, vy, ttl, size, color, alpha, drag, gravity }) {
      this.active = true;
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.ttl = ttl;
      this.life = ttl;
      this.size = size;
      this.color = color;
      this.alpha = alpha ?? 1;
      this.drag = drag ?? 3.5;
      this.gravity = gravity ?? 0;
    }
    update(dt) {
      if (!this.active) return;
      this.ttl -= dt;
      if (this.ttl <= 0) {
        this.active = false;
        return;
      }
      const d = Math.max(0, 1 - this.drag * dt);
      this.vx *= d;
      this.vy = this.vy * d + this.gravity * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }
  }

  class Player {
    constructor() {
      this.x = 0;
      this.y = 0;
      this.r = 16;
      this.speed = 230;
      this.hp = 100;
      this.maxHp = 100;
      this.hunger = 100;
      this.maxHunger = 100;
      this.thirst = 100;
      this.maxThirst = 100;
      this.damageMul = 1;
      this.inv = [
        { weapon: WEAPONS.pistol, mag: WEAPONS.pistol.magSize, reserve: 48, reloading: 0, cooldown: 0 },
        { weapon: WEAPONS.rifle, mag: WEAPONS.rifle.magSize, reserve: 90, reloading: 0, cooldown: 0 },
        { weapon: WEAPONS.shotgun, mag: WEAPONS.shotgun.magSize, reserve: 36, reloading: 0, cooldown: 0 },
      ];
      this.activeSlot = 0;
      this.aimX = 1;
      this.aimY = 0;
      this.fireHeld = false;
      this.invuln = 0;
    }
    get slot() {
      return this.inv[this.activeSlot];
    }
    setAim(x, y) {
      const n = norm(x, y);
      if (n.x === 0 && n.y === 0) return;
      this.aimX = n.x;
      this.aimY = n.y;
    }
    move(dt, input, world, isNight) {
      const mv = norm(input.moveX, input.moveY);
      const slow = isNight ? 0.98 : 1.0;
      this.x += mv.x * this.speed * slow * dt;
      this.y += mv.y * this.speed * slow * dt;
      this.x = clamp(this.x, this.r, world.w - this.r);
      this.y = clamp(this.y, this.r, world.h - this.r);
      for (const ob of world.obstacles) {
        const res = circleRectResolve(this.x, this.y, this.r, ob);
        if (res.hit) {
          this.x = res.x;
          this.y = res.y;
        }
      }
    }
    update(dt, bullets, world, shake, input, emit, audio, tNow) {
      const s = this.slot;
      s.cooldown = Math.max(0, s.cooldown - dt);
      s.reloading = Math.max(0, s.reloading - dt);
      this.invuln = Math.max(0, this.invuln - dt);
      const hungerDrain = 2.3;
      const thirstDrain = 3.0;
      this.hunger = clamp(this.hunger - hungerDrain * dt, 0, this.maxHunger);
      this.thirst = clamp(this.thirst - thirstDrain * dt, 0, this.maxThirst);
      const starving = this.hunger <= 8 || this.thirst <= 8;
      if (starving) {
        this.hp = clamp(this.hp - 4.5 * dt, 0, this.maxHp);
      }
      if (s.reloading === 0 && s.mag < s.weapon.magSize && s.reserve > 0 && input.reloadPressed) {
        this.startReload(audio);
      }
      if (s.reloading === 0 && s.mag === 0 && s.reserve > 0 && this.fireHeld) {
        this.startReload(audio);
      }
      if (s.reloading > 0) {
        if (s.reloading - dt <= 0.0001) {
          const need = s.weapon.magSize - s.mag;
          const take = Math.min(need, s.reserve);
          s.reserve -= take;
          s.mag += take;
        }
      }
      if (this.fireHeld && s.reloading === 0 && s.cooldown === 0) {
        if (s.mag <= 0) {
          audio.empty();
          s.cooldown = 0.18;
        } else {
          this.shoot(bullets, shake, emit, audio);
        }
      }
      const moving = Math.abs(input.moveX) + Math.abs(input.moveY) > 0.2;
      if (moving && tNow != null) audio.step(tNow);
    }
    startReload(audio) {
      const s = this.slot;
      if (s.reloading > 0) return;
      if (s.reserve <= 0) return;
      if (s.mag >= s.weapon.magSize) return;
      audio.reload();
      s.reloading = s.weapon.reloadTime;
    }
    swapWeapon() {
      if (this.inv.length <= 1) return;
      this.activeSlot = (this.activeSlot + 1) % this.inv.length;
    }
    selectWeapon(slot) {
      if (slot < 0 || slot >= this.inv.length) return;
      this.activeSlot = slot;
    }
    shoot(bullets, shake, emit, audio) {
      const s = this.slot;
      if (!root.config?.infiniteAmmo) s.mag -= 1;
      s.cooldown = s.weapon.fireInterval;
      const baseAng = Math.atan2(this.aimY, this.aimX);
      for (let i = 0; i < s.weapon.bulletsPerShot; i += 1) {
        const spread = ((Math.random() * 2 - 1) * s.weapon.spreadDeg * Math.PI) / 180;
        const ang = baseAng + spread;
        const vx = Math.cos(ang) * s.weapon.bulletSpeed;
        const vy = Math.sin(ang) * s.weapon.bulletSpeed;
        const b = bullets.acquire();
        b.init({
          x: this.x + Math.cos(ang) * (this.r + 6),
          y: this.y + Math.sin(ang) * (this.r + 6),
          vx,
          vy,
          dmg: s.weapon.damage * this.damageMul,
          ttl: 1.2,
          fromPlayer: true,
          r: s.weapon.bulletR,
          color: s.weapon.bulletColor,
        });
      }
      emit.muzzle(this.x + this.aimX * (this.r + 7), this.y + this.aimY * (this.r + 7), this.aimX, this.aimY, s.weapon.key);
      audio.shot(s.weapon.key);
      shake.kick(s.weapon.kick);
    }
    takeDamage(dmg, push, audio) {
      if (this.invuln > 0) return;
      this.hp = clamp(this.hp - dmg, 0, this.maxHp);
      this.invuln = 0.25;
      if (audio) audio.hurt();
      this.x = clamp(this.x - push.x * 10, this.r, root.WORLD.w - this.r);
      this.y = clamp(this.y - push.y * 10, this.r, root.WORLD.h - this.r);
    }
  }

  class CameraShake {
    constructor() {
      this.t = 0;
      this.mag = 0;
    }
    kick(mag) {
      this.t = Math.min(0.22, this.t + 0.08);
      this.mag = Math.min(8, this.mag + mag);
    }
    update(dt) {
      this.t = Math.max(0, this.t - dt);
      this.mag = Math.max(0, this.mag - dt * 26);
    }
    offset() {
      if (this.t <= 0 || this.mag <= 0) return { x: 0, y: 0 };
      const a = this.mag * (this.t / 0.22);
      return { x: (Math.random() * 2 - 1) * a, y: (Math.random() * 2 - 1) * a };
    }
  }

  class SpecialProjectile {
    constructor() {
      this.active = false;
      this.kind = "grenade";
      this.x = 0;
      this.y = 0;
      this.vx = 0;
      this.vy = 0;
      this.r = 6;
      this.ttl = 0;
      this.hit = false;
    }
    init(kind, x, y, vx, vy, ttl) {
      this.active = true;
      this.kind = kind;
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.ttl = ttl;
      this.hit = false;
      this.r = kind === "rocket" ? 7 : 6;
    }
    update(dt, world) {
      if (!this.active) return null;
      this.ttl -= dt;
      if (this.ttl <= 0) {
        this.active = false;
        return { kind: this.kind, x: this.x, y: this.y, reason: "timeout" };
      }
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.x = clamp(this.x, this.r, world.w - this.r);
      this.y = clamp(this.y, this.r, world.h - this.r);
      if (this.kind === "rocket") {
        for (const ob of world.obstacles) {
          if (circleRectHit(this.x, this.y, this.r, ob)) {
            this.active = false;
            return { kind: this.kind, x: this.x, y: this.y, reason: "hit_wall" };
          }
        }
      } else {
        for (const ob of world.obstacles) {
          if (circleRectHit(this.x, this.y, this.r, ob)) {
            this.vx = 0;
            this.vy = 0;
            break;
          }
        }
      }
      return null;
    }
  }

  class LightningFx {
    constructor() {
      this.active = false;
      this.x0 = 0;
      this.y0 = 0;
      this.x1 = 0;
      this.y1 = 0;
      this.ttl = 0;
      this.life = 0;
      this.color = "#7ad0ff";
    }
    init(x0, y0, x1, y1, ttl, color) {
      this.active = true;
      this.x0 = x0;
      this.y0 = y0;
      this.x1 = x1;
      this.y1 = y1;
      this.ttl = ttl;
      this.life = ttl;
      this.color = color || "#7ad0ff";
    }
    update(dt) {
      if (!this.active) return;
      this.ttl -= dt;
      if (this.ttl <= 0) this.active = false;
    }
  }

  root.entities = { Bullet, Enemy, Pickup, Particle, Player, CameraShake, SpecialProjectile, LightningFx, PICKUP, WEAPONS };
})();
