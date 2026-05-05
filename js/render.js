(() => {
  const root = (window.Shooter = window.Shooter || {});
  const { clamp, rand } = root.util;
  const { PICKUP } = root.constants;

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
      return isTouch ? 2 : 3;
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
    ctx.fillStyle = PICKUP[p.type].color;
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
    ctx.drawImage(spr, Math.round(sx - spr.width / 2), Math.round(sy - spr.height / 2));
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
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(Math.atan2(p.aimY, p.aimX));
    ctx.globalAlpha = p.invuln > 0 ? 0.6 : 1;
    ctx.drawImage(atlas.player, -atlas.player.width / 2, -atlas.player.height / 2);
    ctx.globalAlpha = 1;
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + p.aimX * 34, sy + p.aimY * 34);
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
