(() => {
  const root = (window.Shooter = window.Shooter || {});
  const { clamp, rand } = root.util;
  const { PICKUP } = root.constants;
  const GAME_SCALE = Math.max(0.5, Math.min(3, Number(root.constants?.GAME_SCALE ?? 1) || 1));

  const mkCanvas = (w, h) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  };

  const pxRect = (ctx, x, y, w, h, fill) => {
    ctx.fillStyle = fill;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  class SpriteAtlas {
    constructor() {
      this.cache = new Map();
      this.player = this.makePlayer();
      this.enemy = {
        basic: this.makeEnemy("#c7d2fe", "#1a2230", false),
        fast: this.makeEnemy("#ff9b53", "#2a1c10", true),
        tank: this.makeEnemy("#b7ff6f", "#132014", false, true),
        ranged: this.makeEnemy("#a48bff", "#201437", true),
      };
      this.elite = {
        basic: this.makeElite(this.enemy.basic),
        fast: this.makeElite(this.enemy.fast),
        tank: this.makeElite(this.enemy.tank),
        ranged: this.makeElite(this.enemy.ranged),
      };
      this.boss = {
        idle: this.makeBoss("#7ad0ff", "#11222e"),
        enraged: this.makeBoss("#ff6fb0", "#2b1220"),
      };
    }
    makePlayer() {
      const c = mkCanvas(32, 32);
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, 32, 32);
      pxRect(ctx, 14, 5, 4, 5, "#d7fbe8");
      pxRect(ctx, 12, 10, 8, 10, "#59ffcd");
      pxRect(ctx, 11, 12, 10, 3, "#2a8b73");
      pxRect(ctx, 10, 16, 4, 8, "#2a8b73");
      pxRect(ctx, 18, 16, 4, 8, "#2a8b73");
      pxRect(ctx, 9, 13, 3, 4, "#59ffcd");
      pxRect(ctx, 20, 13, 3, 4, "#59ffcd");
      pxRect(ctx, 18, 14, 12, 2, "#2b3544");
      pxRect(ctx, 28, 13, 2, 4, "#49586e");
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 2;
      ctx.strokeRect(11, 9, 10, 15);
      return c;
    }
    makeEnemy(body, shadow, lean, bulky) {
      const c = mkCanvas(32, 32);
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, 32, 32);
      if (bulky) {
        pxRect(ctx, 9, 8, 14, 14, body);
        pxRect(ctx, 11, 5, 10, 4, body);
        pxRect(ctx, 8, 13, 3, 6, body);
        pxRect(ctx, 21, 13, 3, 6, body);
      } else {
        pxRect(ctx, 12, 7, 8, 7, body);
        pxRect(ctx, 11, 14, 10, 9, body);
        pxRect(ctx, 10, 16, 3, 6, body);
        pxRect(ctx, 19, 16, 3, 6, body);
        pxRect(ctx, 8, 14, 3, 4, body);
        pxRect(ctx, 21, 14, 3, 4, body);
      }
      pxRect(ctx, lean ? 12 : 11, 10, 2, 2, shadow);
      pxRect(ctx, lean ? 18 : 19, 10, 2, 2, shadow);
      pxRect(ctx, 14, 12, 4, 2, shadow);
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(12, 24, 8, 2);
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 6, 12, 18);
      return c;
    }
    makeElite(base) {
      const c = mkCanvas(base.width, base.height);
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(base, 0, 0);
      pxRect(ctx, 13, 3, 6, 2, "#ffd36f");
      pxRect(ctx, 12, 5, 8, 2, "#ffd36f");
      pxRect(ctx, 14, 1, 2, 2, "#ffd36f");
      pxRect(ctx, 16, 1, 2, 2, "#ffd36f");
      return c;
    }

    makeBoss(body, shadow) {
      const c = mkCanvas(64, 64);
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, 64, 64);
      pxRect(ctx, 18, 18, 28, 28, body);
      pxRect(ctx, 22, 12, 20, 8, body);
      pxRect(ctx, 14, 26, 8, 18, body);
      pxRect(ctx, 42, 26, 8, 18, body);
      pxRect(ctx, 24, 28, 6, 6, shadow);
      pxRect(ctx, 34, 28, 6, 6, shadow);
      pxRect(ctx, 28, 36, 10, 4, shadow);
      pxRect(ctx, 30, 6, 4, 6, "#ffd36f");
      pxRect(ctx, 24, 10, 16, 4, "#ffd36f");
      pxRect(ctx, 20, 14, 24, 4, "#ffd36f");
      pxRect(ctx, 12, 50, 40, 4, "rgba(0,0,0,0.3)");
      ctx.strokeStyle = "rgba(0,0,0,0.45)";
      ctx.lineWidth = 2;
      ctx.strokeRect(16, 14, 32, 36);
      return c;
    }
  }

  class PixelRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d", { alpha: false });
      this.hi = mkCanvas(1, 1);
      this.lo = mkCanvas(1, 1);
      this.hiCtx = this.hi.getContext("2d", { alpha: false });
      this.loCtx = this.lo.getContext("2d", { alpha: false });
      this.dpr = 1;
      this.cssW = 0;
      this.cssH = 0;
      this.pixelScale = 3;
      this.ctx.imageSmoothingEnabled = false;
      this.hiCtx.imageSmoothingEnabled = false;
      this.loCtx.imageSmoothingEnabled = false;
      this.atlas = new SpriteAtlas();
    }
    currentPixelScale(isTouch) {
      const cfg = window.Shooter?.config;
      const v = Number(cfg?.pixelScale || 0);
      if (Number.isFinite(v) && v >= 1) return Math.max(1, Math.min(6, Math.floor(v)));
      return isTouch ? 3 : 2;
    }
    resize(isTouch) {
      const rect = this.canvas.getBoundingClientRect();
      const w = Math.max(320, Math.floor(rect.width));
      const h = Math.max(240, Math.floor(rect.height));
      this.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      this.cssW = w;
      this.cssH = h;
      this.pixelScale = this.currentPixelScale(isTouch);
      this.canvas.width = Math.floor(w * this.dpr);
      this.canvas.height = Math.floor(h * this.dpr);
      this.hi.width = w;
      this.hi.height = h;
      this.lo.width = Math.max(1, Math.floor(w / this.pixelScale));
      this.lo.height = Math.max(1, Math.floor(h / this.pixelScale));
      this.ctx.imageSmoothingEnabled = false;
      this.hiCtx.imageSmoothingEnabled = false;
      this.loCtx.imageSmoothingEnabled = false;
    }
    render(drawHi) {
      const w = this.cssW || this.canvas.clientWidth;
      const h = this.cssH || this.canvas.clientHeight;
      this.hiCtx.setTransform(1, 0, 0, 1, 0, 0);
      drawHi(this.hiCtx, w, h);
      this.loCtx.setTransform(1, 0, 0, 1, 0, 0);
      this.loCtx.clearRect(0, 0, this.lo.width, this.lo.height);
      this.loCtx.drawImage(this.hi, 0, 0, this.lo.width, this.lo.height);
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(this.lo, 0, 0, this.canvas.width, this.canvas.height);
      return { viewW: w, viewH: h };
    }
  }

  const drawWorld = (ctx, world, cam, viewW, viewH) => {
    ctx.fillStyle = "#0a1118";
    ctx.fillRect(0, 0, viewW, viewH);
    const grid = 60;
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    const startX = Math.floor(cam.x / grid) * grid;
    const startY = Math.floor(cam.y / grid) * grid;
    for (let x = startX; x < cam.x + viewW + grid; x += grid) {
      const sx = x - cam.x;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, viewH);
      ctx.stroke();
    }
    for (let y = startY; y < cam.y + viewH + grid; y += grid) {
      const sy = y - cam.y;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(viewW, sy);
      ctx.stroke();
    }
    for (const ob of world.obstacles) {
      const sx = ob.x - cam.x;
      const sy = ob.y - cam.y;
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(sx, sy, ob.w, ob.h);
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, ob.w, ob.h);
    }
  };

  const drawBullet = (ctx, cam, b) => {
    if (!b.active) return;
    const sx = b.x - cam.x;
    const sy = b.y - cam.y;
    const r = Math.max(1, Math.round(b.r ?? 2));
    ctx.fillStyle = b.color || (b.fromPlayer ? "#e6edf3" : "#ff7b7b");
    ctx.fillRect(Math.round(sx - r), Math.round(sy - r), r * 2, r * 2);
  };

  const drawPickup = (ctx, cam, p) => {
    if (!p.active) return;
    const sx = p.x - cam.x;
    const sy = p.y - cam.y;
    const boxBase = Math.max(10, Math.round((32 * GAME_SCALE) / 3));
    if (p.type === "weapon") {
      const isEpic = typeof p.value === "string" && p.value.startsWith("epic_");
      const s = isEpic ? Math.round(boxBase * 1.15) : boxBase;
      const x = Math.round(sx - s / 2);
      const y = Math.round(sy - s / 2);
      if (isEpic) {
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = "rgba(255,111,176,0.12)";
        ctx.beginPath();
        ctx.arc(sx, sy, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = "#6b4a2f";
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = "#8a6240";
      ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(x + 2, y + Math.floor(s * 0.55), s - 4, 2);
      ctx.fillStyle = isEpic ? "#ff6fb0" : "#ffd36f";
      const strap = Math.max(2, Math.floor(s * 0.18));
      ctx.fillRect(x, y + Math.floor(s / 2) - Math.floor(strap / 2), s, strap);
      ctx.fillRect(x + Math.floor(s / 2) - Math.floor(strap / 2), y, strap, s);
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, s, s);
      if (isEpic) {
        ctx.fillStyle = "#ffffff";
        const cx = x + Math.floor(s / 2);
        const cy = y + 3;
        ctx.fillRect(cx - 1, cy, 3, 2);
        ctx.fillRect(cx, cy - 1, 1, 4);
      }
      return;
    }

    if (p.type === "buff") {
      const s = boxBase;
      const x = Math.round(sx - s / 2);
      const y = Math.round(sy - s / 2);
      const id = String(p.value || "");
      const scheme =
        id === "hp_up"
          ? { base: "#ff7b7b", mid: "#ffd1d1", icon: "#591c1c" }
          : id === "spd_up"
          ? { base: "#9bff53", mid: "#d7ffc0", icon: "#214a13" }
          : { base: "#a48bff", mid: "#d9d0ff", icon: "#24165c" };
      ctx.fillStyle = scheme.base;
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = scheme.mid;
      ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
      ctx.fillStyle = scheme.icon;
      if (id === "hp_up") {
        ctx.fillRect(x + 5, y + 3, 1, 5);
        ctx.fillRect(x + 3, y + 5, 5, 1);
      } else if (id === "spd_up") {
        ctx.fillRect(x + 3, y + 6, 5, 1);
        ctx.fillRect(x + 6, y + 4, 1, 5);
        ctx.fillRect(x + 5, y + 5, 1, 1);
        ctx.fillRect(x + 4, y + 6, 1, 1);
      } else {
        ctx.fillRect(x + 4, y + 4, 3, 3);
        ctx.fillRect(x + 5, y + 3, 1, 1);
        ctx.fillRect(x + 5, y + 7, 1, 1);
        ctx.fillRect(x + 3, y + 5, 1, 1);
        ctx.fillRect(x + 7, y + 5, 1, 1);
      }
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, s, s);
      return;
    }

    const def = PICKUP[p.type] || { color: "#ffffff" };
    ctx.fillStyle = def.color;
    const r = p.type === "gem" ? 4 : 3;
    ctx.fillRect(Math.round(sx - r), Math.round(sy - r), r * 2, r * 2);
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(sx - r), Math.round(sy - r), r * 2, r * 2);
  };

  const drawParticle = (ctx, cam, p) => {
    if (!p.active) return;
    const t = clamp(p.ttl / p.life, 0, 1);
    const a = (p.alpha ?? 1) * t;
    const sx = p.x - cam.x;
    const sy = p.y - cam.y;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    const s = Math.max(1, p.size * (0.6 + (1 - t) * 0.6));
    ctx.fillRect(Math.round(sx - s / 2), Math.round(sy - s / 2), Math.round(s), Math.round(s));
    ctx.globalAlpha = 1;
  };

  const drawSpecial = (ctx, cam, s) => {
    if (!s || !s.active) return;
    const sx = s.x - cam.x;
    const sy = s.y - cam.y;
    if (s.kind === "grenade") {
      ctx.fillStyle = "#9bff53";
      ctx.fillRect(Math.round(sx - 3), Math.round(sy - 3), 6, 6);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(Math.round(sx - 1), Math.round(sy - 1), 2, 2);
      return;
    }
    ctx.fillStyle = "#ff9b53";
    ctx.fillRect(Math.round(sx - 4), Math.round(sy - 2), 8, 4);
    ctx.fillStyle = "#ffd36f";
    ctx.fillRect(Math.round(sx + 2), Math.round(sy - 1), 3, 2);
  };

  const drawLightning = (ctx, cam, fx) => {
    if (!fx || !fx.active) return;
    const t = clamp(fx.ttl / fx.life, 0, 1);
    const a = 0.65 * t;
    const x0 = fx.x0 - cam.x;
    const y0 = fx.y0 - cam.y;
    const x1 = fx.x1 - cam.x;
    const y1 = fx.y1 - cam.y;
    ctx.globalAlpha = a;
    ctx.strokeStyle = fx.color || "#7ad0ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(Math.round(x0), Math.round(y0));
    const dx = x1 - x0;
    const dy = y1 - y0;
    const steps = 6;
    for (let i = 1; i < steps; i += 1) {
      const p = i / steps;
      const nx = x0 + dx * p + (Math.random() * 2 - 1) * 10;
      const ny = y0 + dy * p + (Math.random() * 2 - 1) * 10;
      ctx.lineTo(Math.round(nx), Math.round(ny));
    }
    ctx.lineTo(Math.round(x1), Math.round(y1));
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  const drawEnemy = (ctx, atlas, cam, e) => {
    if (!e.active) return;
    const sx = e.x - cam.x;
    const sy = e.y - cam.y;
    if (e.elite) {
      ctx.strokeStyle = "rgba(255,211,111,0.65)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, e.r + 10, 0, Math.PI * 2);
      ctx.stroke();
    }
    const spr = e.elite ? atlas.elite[e.type] : atlas.enemy[e.type];
    ctx.globalAlpha = e.hitFlash > 0 ? 0.35 : 1;
    ctx.fillStyle = "#ffffff";
    if (e.hitFlash > 0) ctx.globalAlpha = 0.55;
    const w = spr.width * GAME_SCALE;
    const h = spr.height * GAME_SCALE;
    ctx.drawImage(spr, Math.round(sx - w / 2), Math.round(sy - h / 2), Math.round(w), Math.round(h));
    ctx.globalAlpha = 1;
    const hpPct = clamp(e.hp / e.maxHp, 0, 1);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(sx - e.r, sy - e.r - 10, e.r * 2, 5);
    ctx.fillStyle = e.elite ? "#ffd36f" : "#ff5b6e";
    ctx.fillRect(sx - e.r, sy - e.r - 10, e.r * 2 * hpPct, 5);
  };

  const drawBoss = (ctx, atlas, cam, boss) => {
    if (!boss || !boss.active) return;
    const sx = boss.x - cam.x;
    const sy = boss.y - cam.y;
    const enraged = boss.phase >= 2;
    const spr = enraged ? atlas.boss.enraged : atlas.boss.idle;
    const pulse = 0.5 + 0.5 * Math.sin((boss.t ?? 0) * 3.2);
    const aura = enraged ? `rgba(255,111,176,${0.18 + pulse * 0.12})` : `rgba(122,208,255,${0.16 + pulse * 0.1})`;
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(sx, sy, boss.r + 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = enraged ? "rgba(255,111,176,0.55)" : "rgba(122,208,255,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, boss.r + 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = boss.hitFlash > 0 ? 0.6 : 1;
    ctx.drawImage(spr, Math.round(sx - spr.width / 2), Math.round(sy - spr.height / 2));
    ctx.globalAlpha = 1;
    const hpPct = clamp(boss.hp / boss.maxHp, 0, 1);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(sx - boss.r, sy - boss.r - 14, boss.r * 2, 6);
    ctx.fillStyle = enraged ? "#ff6fb0" : "#7ad0ff";
    ctx.fillRect(sx - boss.r, sy - boss.r - 14, boss.r * 2 * hpPct, 6);
  };

  const drawPlayer = (ctx, atlas, cam, p) => {
    const sx = p.x - cam.x;
    const sy = p.y - cam.y;
    if (window.Shooter?.config?.invincible === true) {
      const tt = (performance.now ? performance.now() : Date.now()) / 1000;
      const pulse = 0.5 + 0.5 * Math.sin(tt * 6.2);
      const r = (p.r ?? 16) + (12 + pulse * 6) * GAME_SCALE;
      const g = ctx.createRadialGradient(sx, sy, Math.max(1, r * 0.25), sx, sy, r);
      g.addColorStop(0, "rgba(255,211,111,0.0)");
      g.addColorStop(0.55, `rgba(255,211,111,${0.08 + pulse * 0.06})`);
      g.addColorStop(1, "rgba(255,211,111,0.0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,211,111,${0.3 + pulse * 0.25})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, r - 3 * GAME_SCALE, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(Math.atan2(p.aimY, p.aimX));
    ctx.globalAlpha = p.invuln > 0 ? 0.6 : 1;
    const w = atlas.player.width * GAME_SCALE;
    const h = atlas.player.height * GAME_SCALE;
    ctx.drawImage(atlas.player, -w / 2, -h / 2, w, h);
    ctx.globalAlpha = 1;
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + p.aimX * (34 * GAME_SCALE), sy + p.aimY * (34 * GAME_SCALE));
    ctx.stroke();
  };

  const nightOverlay = (ctx, viewW, viewH, darkness) => {
    if (darkness <= 0.18) return;
    ctx.fillStyle = `rgba(0,0,0,${darkness})`;
    ctx.fillRect(0, 0, viewW, viewH);
    const g = ctx.createRadialGradient(viewW / 2, viewH / 2, 90, viewW / 2, viewH / 2, Math.max(viewW, viewH) * 0.75);
    g.addColorStop(0, `rgba(0,0,0,0)`);
    g.addColorStop(1, `rgba(0,0,0,${Math.min(0.65, darkness + 0.2)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, viewW, viewH);
    if (Math.random() < 0.02) {
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.fillRect(rand(0, viewW), rand(0, viewH), 1, 1);
    }
  };

  root.render = { PixelRenderer, drawWorld, drawBullet, drawPickup, drawSpecial, drawLightning, drawEnemy, drawBoss, drawParticle, drawPlayer, nightOverlay };
})();
