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
      this.barrel = this.makeBarrel();
      
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
        core: {
          idle: this.makeBoss("#7ad0ff", "#11222e"),
          enraged: this.makeBoss("#ff6fb0", "#2b1220"),
        },
        gunslinger: {
          idle: this.makeGunnerBoss({ coat: "#3c404a", skin: "#ffd9c2", hair: "#555a65", belt: "#965420", gun: "#222222", fire: "#ff8822" }),
          enraged: this.makeGunnerBoss({ coat: "#2b1220", skin: "#ffd9c2", hair: "#3a2a35", belt: "#ff6fb0", gun: "#1a1116", fire: "#ffd36f" }),
        },
        fire_giant: {
          idle: this.makeFireGiantBoss(),
          enraged: this.makeFireGiantBoss()
        },
        morphila: {
          idle: this.makeMorphilaKonva(false),
          enraged: this.makeMorphilaKonva(true)
        }
      };
    }
    makePlayer() {
      const c = mkCanvas(48, 48);
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, 48, 48);

      const hair = "#9aa5b1";
      const skin = "#f2ccb0";
      const shirt = "#3a3c40";
      const shorts = "#222222";
      const belt = "#8B4513";
      const shoes = "#2a2a2a";

      // Draw from back to front (Layering)

      // Back Arm (Right arm, left side of canvas)
      pxRect(ctx, 12, 22, 6, 14, skin);
      pxRect(ctx, 12, 22, 6, 6, shirt); // Sleeve

      // Back Leg (Right leg)
      pxRect(ctx, 16, 32, 6, 12, skin);
      pxRect(ctx, 16, 32, 6, 6, shorts);
      pxRect(ctx, 16, 40, 6, 4, shoes);

      // Body
      pxRect(ctx, 16, 18, 16, 14, shirt);
      // Logo on shirt (White "II" or "M")
      pxRect(ctx, 20, 22, 2, 6, "#ffffff");
      pxRect(ctx, 22, 22, 4, 2, "#ffffff");
      pxRect(ctx, 26, 22, 2, 6, "#ffffff");

      // Belt
      pxRect(ctx, 16, 30, 16, 3, belt);
      pxRect(ctx, 22, 30, 4, 3, "#ddaa00"); // Buckle

      // Front Leg (Left leg)
      pxRect(ctx, 24, 32, 6, 12, skin);
      pxRect(ctx, 24, 32, 6, 6, shorts);
      pxRect(ctx, 24, 40, 6, 4, shoes);

      // Head
      pxRect(ctx, 14, 4, 20, 14, skin);
      // Hair
      pxRect(ctx, 12, 2, 24, 6, hair); // Top
      pxRect(ctx, 12, 6, 4, 8, hair); // Side
      pxRect(ctx, 14, 8, 2, 2, hair); // Detail
      // Eyes
      pxRect(ctx, 18, 10, 4, 4, "#111111");
      pxRect(ctx, 28, 10, 4, 4, "#111111");

      // Front Arm (Left arm)
      pxRect(ctx, 30, 22, 6, 14, skin);
      pxRect(ctx, 30, 22, 6, 6, shirt); // Sleeve

      // Book/Shield in Front Hand
      pxRect(ctx, 32, 24, 10, 12, "#f1c40f");
      pxRect(ctx, 34, 26, 6, 8, "#d35400");
      pxRect(ctx, 32, 22, 10, 2, "#e67e22");

      return c;
    }
    makeBarrel() {
      const c = mkCanvas(32, 32);
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, 32, 32);
      pxRect(ctx, 8, 4, 16, 24, "#8a2424"); // Main red body
      pxRect(ctx, 6, 8, 20, 4, "#333333"); // Top metal band
      pxRect(ctx, 6, 20, 20, 4, "#333333"); // Bottom metal band
      pxRect(ctx, 14, 14, 4, 4, "#dd9922"); // Warning label
      pxRect(ctx, 12, 4, 8, 2, "#555555"); // Lid
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 2;
      ctx.strokeRect(6, 2, 20, 28);
      return c;
    }
    makeEnemy(body, shadow, lean, bulky) {
      const c = mkCanvas(32, 32);
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, 32, 32);
      if (bulky) {
        pxRect(ctx, 9, 8, 14, 14, body); // Body
        pxRect(ctx, 11, 5, 10, 4, body); // Head
        // Removed static legs and arms for dynamic animation
      } else {
        pxRect(ctx, 12, 7, 8, 7, body); // Head
        pxRect(ctx, 11, 14, 10, 9, body); // Body
        // Removed static legs and arms for dynamic animation
      }
      pxRect(ctx, lean ? 12 : 11, 10, 2, 2, shadow);
      pxRect(ctx, lean ? 18 : 19, 10, 2, 2, shadow);
      pxRect(ctx, 14, 12, 4, 2, shadow);
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(12, 24, 8, 2); // Shadow under body
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

    makeGunnerBoss(pal) {
      const c = mkCanvas(64, 64);
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, 64, 64);
      
      const hat = pal.coat || "#2a2826";
      const skin = pal.skin || "#ffd9c2";
      const coat = pal.coat || "#3c404a";
      const shirt = "#8a1a1a";
      const belt = pal.belt || "#422810";
      const gun = pal.gun || "#181818";
      const metal = "#888888";
      const fire = pal.fire || "#ffaa00";

      // Shadow
      pxRect(ctx, 16, 52, 32, 8, "rgba(0,0,0,0.3)");

      // Legs
      pxRect(ctx, 22, 42, 8, 14, "#222");
      pxRect(ctx, 34, 42, 8, 14, "#222");
      // Boots
      pxRect(ctx, 20, 52, 10, 6, "#111");
      pxRect(ctx, 34, 52, 10, 6, "#111");

      // Coat & Shirt
      pxRect(ctx, 18, 22, 28, 20, coat);
      pxRect(ctx, 24, 22, 16, 20, shirt);
      pxRect(ctx, 18, 40, 6, 8, coat);
      pxRect(ctx, 40, 40, 6, 8, coat);
      
      // Belt & Buckle
      pxRect(ctx, 22, 38, 20, 4, belt);
      pxRect(ctx, 30, 37, 4, 6, "#ddaa00");

      // Left Arm & Gun (Holding a big shotgun/rifle)
      pxRect(ctx, 12, 24, 6, 14, coat);
      pxRect(ctx, 12, 38, 6, 4, skin);
      pxRect(ctx, 4, 34, 18, 6, gun); // Gun barrel
      pxRect(ctx, 2, 35, 4, 4, metal);
      pxRect(ctx, 18, 36, 6, 8, gun); // Gun stock
      if (pal.fire) {
        pxRect(ctx, -6, 32, 10, 10, fire); // Muzzle flash
        pxRect(ctx, -2, 34, 6, 6, "#ffffff");
      }

      // Right Arm & Gun (Holding a revolver/grenade)
      pxRect(ctx, 46, 24, 6, 14, coat);
      pxRect(ctx, 46, 38, 6, 4, skin);
      pxRect(ctx, 48, 40, 4, 8, gun);

      // Head
      pxRect(ctx, 24, 12, 16, 12, skin);
      
      // Eyes/Bandana
      pxRect(ctx, 24, 18, 16, 6, "#111111"); // Bandana covering mouth
      pxRect(ctx, 26, 14, 4, 2, "#fff"); // Eye L
      pxRect(ctx, 34, 14, 4, 2, "#fff"); // Eye R
      pxRect(ctx, 27, 14, 2, 2, "#d22"); // Pupil L
      pxRect(ctx, 35, 14, 2, 2, "#d22"); // Pupil R

      // Cowboy Hat
      pxRect(ctx, 16, 10, 32, 4, hat);
      pxRect(ctx, 20, 4, 24, 6, hat);
      pxRect(ctx, 20, 8, 24, 2, "#8a1a1a"); // Hat band

      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 2;
      ctx.strokeRect(16, 8, 32, 50);

      return c;
    }

    makeMorphilaKonva(enraged) {
      const c = mkCanvas(128, 128);
      const ctx = c.getContext("2d");
      
      if (typeof Konva === 'undefined') {
        // Fallback if Konva fails to load
        ctx.fillStyle = enraged ? '#ff0000' : '#800080';
        ctx.fillRect(32, 32, 64, 64);
        return c;
      }
      
      const container = document.createElement('div');
      const stage = new Konva.Stage({ container, width: 128, height: 128 });
      const layer = new Konva.Layer();
      
      const crystalColor = enraged ? '#ff2a2a' : '#9b59b6';
      const bodyColor = '#1a1124';
      const robeColor = '#2b1a3a';
      
      // Aura/Fog background
      const fog = new Konva.Circle({
        x: 64, y: 64, radius: 45,
        fillRadialGradientStartPoint: { x: 0, y: 0 },
        fillRadialGradientStartRadius: 0,
        fillRadialGradientEndPoint: { x: 0, y: 0 },
        fillRadialGradientEndRadius: 45,
        fillRadialGradientColorStops: [0, enraged ? 'rgba(255,0,0,0.3)' : 'rgba(128,0,128,0.3)', 1, 'rgba(0,0,0,0)']
      });
      layer.add(fog);
      
      // Robe body
      layer.add(new Konva.Rect({ x: 44, y: 40, width: 40, height: 60, fill: robeColor, cornerRadius: 5 }));
      // Runes on robe
      layer.add(new Konva.Rect({ x: 50, y: 50, width: 28, height: 4, fill: '#000' }));
      layer.add(new Konva.Rect({ x: 50, y: 65, width: 28, height: 4, fill: '#000' }));
      layer.add(new Konva.Rect({ x: 50, y: 80, width: 28, height: 4, fill: '#000' }));
      
      // Head
      layer.add(new Konva.Circle({ x: 64, y: 25, radius: 15, fill: bodyColor }));
      
      // Crown
      layer.add(new Konva.Line({
        points: [50, 20, 55, 5, 64, 15, 73, 5, 78, 20],
        fill: '#8b6508',
        closed: true
      }));
      layer.add(new Konva.Circle({ x: 64, y: 12, radius: 5, fill: crystalColor }));
      
      // Eyes
      layer.add(new Konva.Rect({ x: 56, y: 22, width: 6, height: 4, fill: crystalColor }));
      layer.add(new Konva.Rect({ x: 66, y: 22, width: 6, height: 4, fill: crystalColor }));
      
      // Staff (Left hand)
      layer.add(new Konva.Rect({ x: 30, y: 10, width: 6, height: 90, fill: '#111' })); // pole
      layer.add(new Konva.Circle({ x: 33, y: 8, radius: 10, fill: crystalColor })); // crystal
      layer.add(new Konva.Line({ points: [28, 30, 20, 40, 38, 50, 28, 60], stroke: '#333', strokeWidth: 2 })); // vines
      layer.add(new Konva.Rect({ x: 34, y: 45, width: 12, height: 10, fill: bodyColor })); // arm
      
      // Right hand
      layer.add(new Konva.Rect({ x: 82, y: 45, width: 12, height: 10, fill: bodyColor })); // arm
      
      stage.add(layer);
      
      // Convert Konva to native canvas
      ctx.drawImage(layer.getNativeCanvasElement(), 0, 0);
      return c;
    }

    makeFireGiantBoss() {
      const c = mkCanvas(128, 128);
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, 128, 128);
      
      ctx.save();
      ctx.translate(64, 64);

      // Legs
      pxRect(ctx, -20, 20, 14, 30, '#2d3436');
      pxRect(ctx, -22, 45, 18, 10, '#1e272e');
      pxRect(ctx, 6, 20, 14, 30, '#2d3436');
      pxRect(ctx, 4, 45, 18, 10, '#1e272e');

      // Body
      pxRect(ctx, -24, -30, 48, 55, '#3d3d3d');
      pxRect(ctx, -22, -28, 44, 8, '#4a4a4a');
      pxRect(ctx, -22, 10, 44, 12, '#2d2d2d');

      // Roman II
      pxRect(ctx, -4, -12, 4, 16, '#7f8c8d');
      pxRect(ctx, 0, -12, 4, 16, '#7f8c8d');
      pxRect(ctx, -4, -6, 8, 3, '#7f8c8d');

      // Belt
      pxRect(ctx, -26, 20, 52, 8, '#8B4513');
      pxRect(ctx, -4, 18, 8, 12, '#CD853F');

      // Left Arm
      pxRect(ctx, -38, -20, 14, 35, '#f5d0c5');
      pxRect(ctx, -40, -30, 18, 14, '#ff9f43');
      pxRect(ctx, -38, -28, 14, 4, '#ffc048');

      // Right Arm (idle)
      let rightArmY = -20;
      let rightArmX = 24;
      pxRect(ctx, rightArmX, rightArmY, 14, 35, '#f5d0c5');
      pxRect(ctx, rightArmX - 2, rightArmY - 10, 18, 14, '#ff9f43');
      pxRect(ctx, rightArmX, rightArmY - 8, 14, 4, '#ffc048');

      // Sword
      let swordX = rightArmX + 12;
      let swordY = rightArmY - 45;
      let swordRotation = -30;

      ctx.save();
      ctx.translate(swordX, swordY);
      ctx.rotate(swordRotation * Math.PI / 180);
      pxRect(ctx, 0, 45, 10, 16, '#5d4037');
      pxRect(ctx, 1, 42, 8, 6, '#c0392b');

      // Flame blade
      for (let i = 0; i < 7; i++) {
        const color = i < 2 ? '#ff6b35' : (i < 4 ? '#ff9f43' : (i < 6 ? '#feca57' : '#fff5cc'));
        const size = 10 + (i % 2) * 4;
        pxRect(ctx, - size/2, 38 - i * 7, size, 6, color);
      }
      ctx.restore();

      // Head
      pxRect(ctx, -18, -65, 36, 16, '#4a5568');
      pxRect(ctx, -14, -72, 28, 10, '#4a5568');
      pxRect(ctx, -18, -52, 36, 24, '#f5d0c5');

      // Eyebrows
      pxRect(ctx, -15, -46, 12, 4, '#2d3436');
      pxRect(ctx, 3, -46, 12, 4, '#2d3436');

      // Eyes
      pxRect(ctx, -13, -38, 8, 6, '#2d3436');
      pxRect(ctx, 5, -38, 8, 6, '#2d3436');
      pxRect(ctx, -12, -37, 4, 3, '#c0392b');
      pxRect(ctx, 6, -37, 4, 3, '#c0392b');

      // Mouth
      pxRect(ctx, -5, -30, 10, 3, '#d35400');

      ctx.restore();

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

  const drawWorld = (ctx, world, cam, viewW, viewH, atlas) => {
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

    if (world.details) {
      for (const d of world.details) {
        const sx = d.x - cam.x;
        const sy = d.y - cam.y;
        if (sx < -100 || sy < -100 || sx > viewW + 100 || sy > viewH + 100) continue;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(d.rot);
        
        if (d.isScorch) {
          ctx.fillStyle = `rgba(20, 20, 20, ${d.opacity})`;
          ctx.beginPath();
          ctx.arc(0, 0, d.size/2, 0, Math.PI * 2);
          ctx.fill();
        } else if (d.type === 'gore') {
          ctx.fillStyle = d.color || '#8b2a2a';
          ctx.globalAlpha = d.opacity * 0.8;
          ctx.beginPath();
          ctx.arc(0, 0, d.size/2, 0, Math.PI * 2);
          ctx.fill();
          // splatter sub-particles
          ctx.beginPath();
          ctx.arc(-d.size/3, d.size/3, d.size/4, 0, Math.PI * 2);
          ctx.arc(d.size/2, -d.size/4, d.size/3, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = d.type === 'grass' ? `rgba(40,200,80,${d.opacity})` : `rgba(255,255,255,${d.opacity})`;
          if (d.type === 'tile') {
            ctx.fillRect(-d.size/2, -d.size/2, d.size, d.size);
            ctx.strokeStyle = `rgba(0,0,0,${d.opacity*2})`;
            ctx.lineWidth = 1;
            ctx.strokeRect(-d.size/2, -d.size/2, d.size, d.size);
          } else if (d.type === 'grass') {
            ctx.fillRect(-2, -d.size, 4, d.size);
          } else if (d.type === 'crack') {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(d.size/2, d.size/3);
            ctx.lineTo(d.size, -d.size/4);
            ctx.strokeStyle = `rgba(0,0,0,${d.opacity*4})`;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
        ctx.restore();
      }
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

    if (world.barrels) {
      for (const b of world.barrels) {
        if (!b.active) continue;
        const sx = b.x - cam.x;
        const sy = b.y - cam.y;
        if (sx < -50 || sy < -50 || sx > viewW + 50 || sy > viewH + 50) continue;
        ctx.drawImage(atlas.barrel, Math.round(sx - 16*GAME_SCALE), Math.round(sy - 16*GAME_SCALE), 32*GAME_SCALE, 32*GAME_SCALE);
      }
    }
  };

  const drawBullet = (ctx, cam, b) => {
    if (!b.active) return;
    const sx = b.x - cam.x;
    const sy = b.y - cam.y;
    
    if (b.isRocket) {
      ctx.save();
      ctx.translate(sx, sy);
      // Determine angle from velocity
      let angle = Math.atan2(b.vy, b.vx);
      
      // The prompt asks for slight clockwise rotation per frame, but since it has a velocity, 
      // we can just align it with velocity and add a slight wobble or spin if desired.
      // We will just point it towards velocity, and add a slow spin.
      // Use life / ttl to animate the spin.
      const spin = (b.ttl * 300) % 360 * Math.PI / 180; 
      ctx.rotate(angle + spin * 0.1); 
      
      ctx.scale(GAME_SCALE, GAME_SCALE);
      
      // Rocket Body
      ctx.fillStyle = "#555";
      ctx.fillRect(-10, -4, 15, 8);
      // Rocket Head
      ctx.fillStyle = "#ff3300";
      ctx.beginPath();
      ctx.moveTo(5, -4);
      ctx.lineTo(10, 0);
      ctx.lineTo(5, 4);
      ctx.fill();
      // Tail fins
      ctx.fillStyle = "#222";
      ctx.fillRect(-12, -6, 4, 4);
      ctx.fillRect(-12, 2, 4, 4);
      
      ctx.restore();
      return;
    }

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

  const drawFloatingText = (ctx, cam, t) => {
    if (!t.active) return;
    const sx = t.x - cam.x;
    const sy = t.y - cam.y;
    ctx.globalAlpha = Math.max(0, t.ttl / t.maxTtl);
    ctx.fillStyle = t.color;
    ctx.font = `bold ${14 * GAME_SCALE}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(t.text, sx, sy);
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 2;
    ctx.strokeText(t.text, sx, sy);
    ctx.globalAlpha = 1;
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

  const ENEMY_COLORS = {
    basic: { body: "#59ffcd", shadow: "#2a8b73", bulky: false },
    fast: { body: "#ff5959", shadow: "#8b2a2a", bulky: false, lean: true },
    tank: { body: "#ffcd59", shadow: "#8b732a", bulky: true },
    swordsman: { body: "#cd59ff", shadow: "#732a8b", bulky: false },
    ranged: { body: "#59cdff", shadow: "#2a738b", bulky: false }
  };

  const drawEnemy = (ctx, atlas, cam, e) => {
    if (!e.active) return;
    const sx = e.x - cam.x;
    const sy = e.y - cam.y;
    
    if (e.elite) {
      ctx.strokeStyle = "rgba(255,211,111,0.65)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, e.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    ctx.globalAlpha = e.hitFlash > 0 ? 0.35 : 1;
    ctx.fillStyle = "#ffffff";
    if (e.hitFlash > 0) ctx.globalAlpha = 0.55;

    const colors = ENEMY_COLORS[e.type] || ENEMY_COLORS.basic;
    const bodyColor = e.elite ? "#ffd36f" : colors.body;
    const shadowColor = e.elite ? "#cc9922" : colors.shadow;
    
    // Animation angles
    const walkAngle = Math.sin(e.walkAnim || 0);
    const legSwing = walkAngle * 30 * Math.PI / 180;
    const armSwing = -walkAngle * 30 * Math.PI / 180;
    const bob = Math.abs(Math.sin(e.walkAnim || 0)) * 2;

    ctx.save();
    ctx.translate(sx, sy);
    
    // Flip if facing left
    if (e.facingLeft || (e.aimX && e.aimX < 0)) {
      ctx.scale(-1, 1);
    }
    
    // Scale according to elite / bulky
    let sScale = GAME_SCALE * (e.elite ? 1.666 : 1.0); // 精英怪体型比普通大2/3
    ctx.scale(sScale, sScale);
    ctx.translate(-16, -16 + bob); // Center the 32x32 logic

    // Back Arm
    ctx.save();
    ctx.translate(12, 13);
    ctx.rotate(armSwing);
    pxRect(ctx, -2, 0, 4, 8, bodyColor);
    ctx.restore();

    // Back Leg
    ctx.save();
    ctx.translate(13, 22);
    ctx.rotate(-legSwing);
    pxRect(ctx, -2, 0, 4, 8, shadowColor);
    ctx.restore();

    // Body & Head
    if (colors.bulky) {
      pxRect(ctx, 9, 8, 14, 14, bodyColor); // Body
      pxRect(ctx, 11, 5, 10, 4, bodyColor); // Head
    } else {
      pxRect(ctx, 12, 7, 8, 7, bodyColor); // Head
      pxRect(ctx, 11, 14, 10, 9, bodyColor); // Body
    }
    
    // Face (Eyes)
    pxRect(ctx, colors.lean ? 12 : 11, 10, 2, 2, shadowColor);
    pxRect(ctx, colors.lean ? 18 : 19, 10, 2, 2, shadowColor);
    pxRect(ctx, 14, 12, 4, 2, shadowColor);

    // Front Leg
    ctx.save();
    ctx.translate(19, 22);
    ctx.rotate(legSwing);
    pxRect(ctx, -2, 0, 4, 8, shadowColor);
    ctx.restore();

    // Front Arm
    ctx.save();
    ctx.translate(20, 13);
    
    let armRot = -armSwing;
    if (e.isAttacking) {
      // Attack animation: wind up then strike
      const p = e.attackAnim; // 0 to 1
      if (p < 0.3) {
        armRot -= p * Math.PI; // Wind up back
      } else {
        const strike = (p - 0.3) / 0.7;
        armRot -= 0.3 * Math.PI - strike * Math.PI * 1.5; // Strike forward
      }
    }
    ctx.rotate(armRot);
    
    pxRect(ctx, -2, 0, 4, 8, bodyColor);
    
    // Ranged gun
    if (e.type === "ranged") {
      pxRect(ctx, -1, 5, 8, 3, "#333");
      pxRect(ctx, 7, 5, 2, 2, "#ff3300");
    } else if (e.weaponType) {
      // Draw melee weapon in hand
      const wx = -1;
      const wy = 6;
      if (e.weaponType === 'sword' || e.type === "swordsman") {
        pxRect(ctx, wx, wy, 12, 3, "#a0aec0"); // Blade
        pxRect(ctx, wx-1, wy-1, 3, 5, "#4a5568"); // Hilt
        if (e.elite) {
          ctx.globalCompositeOperation = 'lighter';
          pxRect(ctx, wx+2, wy, 10, 1, 'rgba(255, 200, 100, 0.6)'); // Glowing edge
          ctx.globalCompositeOperation = 'source-over';
        }
      } else if (e.weaponType === 'stick') {
        pxRect(ctx, wx-2, wy, 14, 2, "#8b5a2b"); // Wooden stick
        pxRect(ctx, wx+10, wy-1, 2, 4, "#5c3a21"); // Stick knot
      } else if (e.weaponType === 'hammer') {
        pxRect(ctx, wx-2, wy, 10, 2, "#8b5a2b"); // Handle
        pxRect(ctx, wx+8, wy-4, 6, 10, "#718096"); // Hammer head
        pxRect(ctx, wx+9, wy-2, 4, 6, "#4a5568"); // Hammer core
      }
    }
    ctx.restore();

    ctx.restore();
    
    ctx.globalAlpha = 1;
    const hpPct = clamp(e.hp / e.maxHp, 0, 1);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(sx - e.r, sy - e.r - 10, e.r * 2, 5);
    ctx.fillStyle = e.elite ? "#ffd36f" : "#ff5b6e";
    ctx.fillRect(sx - e.r, sy - e.r - 10, e.r * 2 * hpPct, 5);
  };

  const drawFireGiant = (ctx, cam, boss) => {
    const sx = boss.x - cam.x;
    const sy = boss.y - cam.y;
    const fg = boss.fg;
    const fs = fg.flameSword;
    const gs = fg.groundSlam;
    const fb = fg.flameBreath;
    const death = fg.death;

    const FIRE_COLORS = ['#ffff00', '#ffcc00', '#ff9900', '#ff6600', '#ff3300', '#cc0000'];

    // 1. Bottom Effects (Ground Slam)
    ctx.save();
    if (gs.groundDarken > 0) {
      ctx.fillStyle = `rgba(20, 10, 5, ${gs.groundDarken * 0.4})`;
      ctx.beginPath();
      ctx.ellipse(gs.impactCenter.x - cam.x, gs.impactCenter.y - cam.y, 150 * GAME_SCALE, 40 * GAME_SCALE, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    gs.shockwaves.forEach(sw => {
      ctx.strokeStyle = `rgba(255, 150, 50, ${sw.life / sw.maxLife})`;
      ctx.lineWidth = sw.lineWidth;
      ctx.beginPath();
      ctx.ellipse(sw.x - cam.x, sw.y - cam.y, sw.radius, sw.radius * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 200, 100, ${sw.life / sw.maxLife * 0.5})`;
      ctx.lineWidth = sw.lineWidth * 0.5;
      ctx.beginPath();
      ctx.ellipse(sw.x - cam.x, sw.y - cam.y, sw.radius * 0.7, sw.radius * 0.28, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
    gs.cracks.forEach(c => {
      ctx.strokeStyle = `rgba(30, 20, 10, ${c.alpha})`;
      ctx.lineWidth = c.width * (1 - c.progress * 0.5);
      ctx.lineCap = 'round';
      ctx.beginPath();
      const len = c.length * c.progress;
      ctx.moveTo(c.x - cam.x, c.y - cam.y);
      for (let i = 1; i <= 5; i++) {
        const t = i / 5;
        const jitter = Math.sin(t * 10 + (boss.t*1000) / 100) * c.jitter * (1 - t);
        ctx.lineTo(
          c.x - cam.x + Math.cos(c.angle) * len * t + Math.cos(c.angle + Math.PI/2) * jitter,
          c.y - cam.y + Math.sin(c.angle) * len * t + Math.sin(c.angle + Math.PI/2) * jitter
        );
      }
      ctx.stroke();
    });
    ctx.globalCompositeOperation = 'lighter';
    gs.dust.forEach(d => {
      ctx.globalAlpha = d.alpha;
      ctx.fillStyle = d.color;
      ctx.fillRect(Math.floor(d.x - cam.x - d.size/2), Math.floor(d.y - cam.y - d.size/2), Math.floor(d.size), Math.floor(d.size));
    });
    ctx.globalCompositeOperation = 'source-over';
    gs.rocks.forEach(r => {
      ctx.save();
      ctx.translate(r.x - cam.x, r.y - cam.y);
      ctx.rotate(r.rotation);
      ctx.globalAlpha = r.alpha;
      ctx.fillStyle = r.color;
      ctx.fillRect(-r.size/2, -r.size/2, r.size, r.size);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(-r.size/2 + 2, -r.size/2 + 2, r.size, r.size);
      ctx.restore();
    });
    ctx.restore();

    // 2. Death Burn Mark & Ash
    if (death.burnMark) {
      const alpha = (death.burnMark.life / death.burnMark.maxLife) * 0.6;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.ellipse(death.burnMark.x - cam.x, death.burnMark.y - cam.y, 50 * GAME_SCALE, 15 * GAME_SCALE, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2d2d2d';
      ctx.beginPath();
      ctx.ellipse(death.burnMark.x - cam.x, death.burnMark.y - cam.y, 35 * GAME_SCALE, 10 * GAME_SCALE, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    death.ashParticles.forEach(p => {
      ctx.globalAlpha = (p.life / p.maxLife) * 0.5;
      ctx.fillStyle = '#555';
      ctx.fillRect(p.x - cam.x - p.size/2, p.y - cam.y - p.size/2, p.size, p.size);
    });

    // 3. Boss Body
    let alpha = 1;
    if (death.state === 'DYING') {
      if (death.phase === 1) alpha = Math.max(0, 1 - (death.timer / 1000) * 0.8);
      else if (death.phase === 2) alpha = 0;
    }

    if (alpha > 0) {
      const walkAngle = Math.sin(boss.walkAnim || 0);
      const legSwing = walkAngle * 30 * Math.PI / 180;
      const armSwing = -walkAngle * 30 * Math.PI / 180;
      
      let bob = (boss.skill === null && fs.state === 'IDLE' && gs.state === 'IDLE' && fb.state === 'IDLE') ? Math.sin(fg.breathOffset) * 2 * GAME_SCALE + Math.abs(Math.sin(boss.walkAnim || 0)) * 3 * GAME_SCALE : 0;
      let shakeX = 0, shakeY = 0;
      let tilt = 0;

      if (boss.hitFlash > 0) { shakeX = (Math.random() - 0.5) * 8 * GAME_SCALE; shakeY = (Math.random() - 0.5) * 8 * GAME_SCALE; }
      if (fs.state === 'CHARGE') { bob = Math.sin((boss.t*1000)/50)*5 * GAME_SCALE; shakeX = (Math.random()-0.5)*4 * GAME_SCALE; }
      if (gs.state === 'CHARGE') { bob = Math.sin((boss.t*1000)/80)*4 * GAME_SCALE; shakeX = (Math.random()-0.5)*3 * GAME_SCALE; }
      if (fb.state === 'PREPARE') { bob = Math.sin((boss.t*1000)/60)*3 * GAME_SCALE; shakeX = (Math.random()-0.5)*2 * GAME_SCALE; }
      if (death.state === 'DYING') tilt = Math.sin(death.timer/100)*0.1;

      ctx.save();
      ctx.globalAlpha = alpha;
      if (boss.hitFlash > 0 && Math.floor((boss.t*1000)/60)%2===0) ctx.globalAlpha = alpha * 0.5;
      ctx.translate(sx + shakeX, sy + bob + shakeY);
      ctx.rotate(tilt);
      ctx.scale(GAME_SCALE, GAME_SCALE);

      // Back Leg
      ctx.save();
      ctx.translate(13, 20);
      ctx.rotate(-legSwing);
      pxRect(ctx, -7, 0, 14, 30, '#2d3436');
      pxRect(ctx, -9, 25, 18, 10, '#1e272e');
      ctx.restore();

      // Front Leg
      ctx.save();
      ctx.translate(-13, 20);
      ctx.rotate(legSwing);
      pxRect(ctx, -7, 0, 14, 30, '#2d3436');
      pxRect(ctx, -9, 25, 18, 10, '#1e272e');
      ctx.restore();

      // Body
      pxRect(ctx, -24, -30, 48, 55, '#3d3d3d');
      pxRect(ctx, -22, -28, 44, 8, '#4a4a4a');
      pxRect(ctx, -22, 10, 44, 12, '#2d2d2d');
      pxRect(ctx, -4, -12, 4, 16, '#7f8c8d');
      pxRect(ctx, 0, -12, 4, 16, '#7f8c8d');
      pxRect(ctx, -4, -6, 8, 3, '#7f8c8d');
      // Belt
      pxRect(ctx, -26, 20, 52, 8, '#8B4513');
      pxRect(ctx, -4, 18, 8, 12, '#CD853F');
      
      // Left Arm
      ctx.save();
      ctx.translate(-31, -20);
      ctx.rotate(armSwing);
      pxRect(ctx, -7, 0, 14, 35, '#f5d0c5');
      pxRect(ctx, -9, -10, 18, 14, '#ff9f43');
      pxRect(ctx, -7, -8, 14, 4, '#ffc048');
      ctx.restore();

      // Right Arm & Sword
      let rightArmY = -20, rightArmX = 24;
      let rightArmRot = -armSwing;
      if (fs.state === 'CHARGE') { rightArmY = -60; rightArmX = 10; rightArmRot = 0; }
      else if (fs.phase === 1) { const p = 1 - fs.skillTimer/300; rightArmY = -60 + p*80; rightArmX = 10 + p*40; rightArmRot = 0; }
      else if (fs.phase === 2) { const p = 1 - fs.skillTimer/300; rightArmY = 20 - p*40; rightArmX = 50 - p*26; rightArmRot = 0; }
      if (gs.state === 'CHARGE') { rightArmY = -50; rightArmRot = 0; }
      if (fb.state === 'CASTING') { rightArmY = -35; rightArmX = 40; rightArmRot = 0; }

      ctx.save();
      ctx.translate(rightArmX + 7, rightArmY);
      ctx.rotate(rightArmRot);
      
      pxRect(ctx, -7, 0, 14, 35, '#f5d0c5');
      pxRect(ctx, -9, -10, 18, 14, '#ff9f43');
      pxRect(ctx, -7, -8, 14, 4, '#ffc048');

      if (death.state === 'IDLE' || !death.swordDropped) {
        let swordX = 5, swordY = -25, swordRot = -30;
        if (fs.state === 'CHARGE') { swordY = -50; swordRot = -90; }
        else if (fs.phase === 1) { const p = 1 - fs.skillTimer/300; swordY = -50 + p*100; swordX = 5 + p*30; swordRot = -90 + p*150; }
        else if (fs.phase === 2) { const p = 1 - fs.skillTimer/300; swordY = 50 - p*95; swordX = 35 - p*26; swordRot = 60 - p*90; }
        if (gs.state === 'CHARGE') { swordY = -60; swordRot = -60; }
        if (fb.state === 'CASTING') { swordY = -10; swordRot = -20; }

        const flameInt = (fs.state === 'CHARGE' || fs.phase === 1) ? 1.2 : (0.6 + Math.sin(fg.breathOffset*2)*0.3);
        ctx.save();
        ctx.translate(swordX, swordY);
        ctx.rotate(swordRot * Math.PI / 180);
        pxRect(ctx, 0, 45, 10, 16, '#5d4037');
        pxRect(ctx, 1, 42, 8, 6, '#c0392b');
        for (let i=0; i<7; i++) {
          const off = Math.sin(fg.breathOffset*3 + i*0.8) * (3 + (fs.phase===1?2:0));
          const col = i<2 ? '#ff6b35' : (i<4 ? '#ff9f43' : (i<6 ? '#feca57' : '#fff5cc'));
          const sz = 10 + (i%2)*4 + (fs.phase===1?4:0);
          pxRect(ctx, off - sz/2, 38 - i*7, sz, 6, col);
        }
        ctx.globalAlpha = flameInt * 0.4;
        ctx.fillStyle = '#ff6b35';
        ctx.beginPath();
        ctx.ellipse(5, 15, 25*flameInt, 45*flameInt, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();

      // Head
      pxRect(ctx, -18, -65, 36, 16, '#4a5568');
      pxRect(ctx, -14, -72, 28, 10, '#4a5568');
      pxRect(ctx, -18, -52, 36, 24, '#f5d0c5');
      pxRect(ctx, -15, -46, 12, 4, '#2d3436');
      pxRect(ctx, 3, -46, 12, 4, '#2d3436');
      pxRect(ctx, -13, -38, 8, 6, '#2d3436');
      pxRect(ctx, 5, -38, 8, 6, '#2d3436');
      pxRect(ctx, -12, -37, 4, 3, '#c0392b');
      pxRect(ctx, 6, -37, 4, 3, '#c0392b');
      pxRect(ctx, -5, -30, 10, 3, '#d35400');

      if (fs.state === 'CHARGE' || fb.state === 'PREPARE') {
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = '#8B0000';
        ctx.fillRect(-8, -28, 16, 8);
      }
      ctx.restore();
    }

    // 4. Top Effects (Sword Slash, Breath, Fireballs, Death Ash/Sword)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    fs.slashTrails.forEach(tr => {
      ctx.globalAlpha = (tr.life / tr.maxLife) * 0.6;
      ctx.save();
      ctx.translate(tr.x - cam.x, tr.y - cam.y);
      ctx.rotate(tr.angle * Math.PI / 180);
      ctx.fillStyle = '#ff9900'; ctx.fillRect(-tr.size*2, -4*GAME_SCALE, tr.size*4, 8*GAME_SCALE);
      ctx.fillStyle = '#ffcc00'; ctx.fillRect(-tr.size*1.5, -2*GAME_SCALE, tr.size*3, 4*GAME_SCALE);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-tr.size, -1*GAME_SCALE, tr.size*2, 2*GAME_SCALE);
      ctx.restore();
    });
    fs.particles.forEach(p => {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = FIRE_COLORS[p.colorIndex] || '#ff9900';
      ctx.fillRect(p.x - cam.x - p.size/2, p.y - cam.y - p.size/2, p.size, p.size);
    });

    fg.fireballs.forEach(ball => {
      if (ball.exploded) {
        const p = 1 - ball.explosionLife / 500;
        ctx.globalAlpha = (1 - p) * 0.5;
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(ball.x - cam.x, ball.y - cam.y, ball.maxExplosionRadius * p, 0, Math.PI * 2);
        ctx.fill();
        ball.explosionParticles.forEach(p => {
          ctx.globalAlpha = (p.life / p.maxLife) * 0.8;
          ctx.fillStyle = FIRE_COLORS[p.colorIndex];
          ctx.fillRect(p.x - cam.x - p.size/2, p.y - cam.y - p.size/2, p.size, p.size);
        });
      } else {
        ball.trail.forEach(t => {
          ctx.globalAlpha = (t.life / t.maxLife) * 0.4;
          ctx.fillStyle = '#ff6600';
          ctx.fillRect(t.x - cam.x - t.size/2, t.y - cam.y - t.size/2, t.size, t.size);
        });
        ctx.globalAlpha = 0.3; ctx.fillStyle = '#ff9900';
        ctx.beginPath(); ctx.arc(ball.x - cam.x, ball.y - cam.y, ball.radius * 1.8, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 0.6; ctx.fillStyle = '#ff6600';
        ctx.beginPath(); ctx.arc(ball.x - cam.x, ball.y - cam.y, ball.radius * 1.2, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 0.9; ctx.fillStyle = '#ffcc00';
        ctx.beginPath(); ctx.arc(ball.x - cam.x, ball.y - cam.y, ball.radius * 0.6, 0, Math.PI*2); ctx.fill();
      }
    });

    ctx.globalCompositeOperation = 'source-over';
    fb.trails.forEach(t => {
      ctx.globalAlpha = t.alpha;
      ctx.fillStyle = FIRE_COLORS[Math.min(t.colorIndex, 5)];
      ctx.fillRect(Math.floor(t.x - cam.x - t.size/2), Math.floor(t.y - cam.y - t.size/2), Math.floor(t.size), Math.floor(t.size));
    });
    ctx.globalCompositeOperation = 'lighter';
    fb.particles.forEach(p => {
      ctx.globalAlpha = p.alpha * 0.3;
      ctx.fillStyle = FIRE_COLORS[p.colorIndex];
      ctx.fillRect(Math.floor(p.x - cam.x - p.size*1.2), Math.floor(p.y - cam.y - p.size*1.2), Math.floor(p.size*2.4), Math.floor(p.size*2.4));
      ctx.globalAlpha = p.alpha * (0.8 + Math.sin(p.flicker)*0.2);
      ctx.fillStyle = FIRE_COLORS[p.colorIndex];
      ctx.fillRect(Math.floor(p.x - cam.x - p.size/2), Math.floor(p.y - cam.y - p.size/2), Math.floor(p.size), Math.floor(p.size));
      if (p.colorIndex < 3) {
        ctx.globalAlpha = p.alpha * 0.5;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.floor(p.x - cam.x - p.size/4), Math.floor(p.y - cam.y - p.size/4), Math.floor(p.size/2), Math.floor(p.size/2));
      }
    });

    death.particles.forEach(p => {
      ctx.globalAlpha = (p.life / p.maxLife) * 0.8;
      ctx.fillStyle = FIRE_COLORS[p.colorIndex];
      ctx.fillRect(p.x - cam.x - p.size/2, p.y - cam.y - p.size/2, p.size, p.size);
    });

    if (death.droppedSword) {
      const sword = death.droppedSword;
      ctx.globalAlpha = sword.life / sword.maxLife;
      ctx.fillStyle = '#ff6b35';
      ctx.beginPath();
      ctx.ellipse(sword.x - cam.x, sword.y - cam.y, 20*GAME_SCALE, 30*GAME_SCALE, sword.rotation * Math.PI / 180, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.save();
      ctx.translate(sword.x - cam.x, sword.y - cam.y);
      ctx.rotate(sword.rotation * Math.PI / 180);
      ctx.scale(GAME_SCALE, GAME_SCALE);
      pxRect(ctx, 0, -20, 8, 30, '#5d4037');
      for (let i=0; i<5; i++) {
        pxRect(ctx, -3, -50 + i*6, 6 + (i%2)*2, 5, i<2 ? '#ff6b35' : '#ff9f43');
      }
      ctx.restore();
    }
    ctx.restore();

    // HP Bar
    ctx.globalAlpha = 1;
    const hpPct = clamp(boss.hp / boss.maxHp, 0, 1);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    const hpY = sy - 85 * GAME_SCALE - 14;
    ctx.fillRect(sx - boss.r, hpY, boss.r * 2, 6);
    ctx.fillStyle = (boss.phase >= 2) ? "#ff6fb0" : "#7ad0ff";
    ctx.fillRect(sx - boss.r, hpY, boss.r * 2 * hpPct, 6);
  };

  const drawCoreBoss = (ctx, cam, boss) => {
    const sx = boss.x - cam.x;
    const sy = boss.y - cam.y;
    const enraged = boss.phase >= 2;
    const body = enraged ? "#ff6fb0" : "#7ad0ff";
    const shadow = enraged ? "#cc3377" : "#3388cc";

    // Aura
    const pulse = 0.5 + 0.5 * Math.sin((boss.t ?? 0) * 3.2);
    const auraCore = [122, 208, 255];
    const auraEnr = [255, 111, 176];
    const auraRGB = enraged ? auraEnr : auraCore;
    const aura = `rgba(${auraRGB[0]},${auraRGB[1]},${auraRGB[2]},${(enraged ? 0.18 : 0.16) + pulse * (enraged ? 0.12 : 0.1)})`;
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(sx, sy, boss.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = enraged ? "rgba(255,111,176,0.55)" : "rgba(122,208,255,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, boss.r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.globalAlpha = boss.hitFlash > 0 ? 0.6 : 1;
    ctx.translate(sx, sy);
    ctx.scale(GAME_SCALE, GAME_SCALE);

    const walkAngle = Math.sin(boss.walkAnim || 0);
    const legSwing = walkAngle * 30 * Math.PI / 180;
    const armSwing = -walkAngle * 30 * Math.PI / 180;
    const bob = Math.abs(Math.sin(boss.walkAnim || 0)) * 2;

    ctx.translate(-32, -32 + bob);

    // Back Arm
    ctx.save();
    ctx.translate(18, 26);
    ctx.rotate(armSwing);
    pxRect(ctx, -4, 0, 8, 18, body);
    ctx.restore();

    // Back Leg
    ctx.save();
    ctx.translate(24, 44);
    ctx.rotate(-legSwing);
    pxRect(ctx, -4, 0, 8, 12, shadow);
    ctx.restore();

    // Body
    pxRect(ctx, 18, 18, 28, 28, body);
    pxRect(ctx, 22, 12, 20, 8, body);
    pxRect(ctx, 24, 28, 6, 6, shadow);
    pxRect(ctx, 34, 28, 6, 6, shadow);
    pxRect(ctx, 28, 36, 10, 4, shadow);
    pxRect(ctx, 30, 6, 4, 6, "#ffd36f");
    pxRect(ctx, 24, 10, 16, 4, "#ffd36f");
    pxRect(ctx, 20, 14, 24, 4, "#ffd36f");

    // Front Leg
    ctx.save();
    ctx.translate(40, 44);
    ctx.rotate(legSwing);
    pxRect(ctx, -4, 0, 8, 12, shadow);
    ctx.restore();

    // Front Arm
    ctx.save();
    ctx.translate(46, 26);
    ctx.rotate(-armSwing);
    pxRect(ctx, -4, 0, 8, 18, body);
    ctx.restore();

    ctx.restore();
    
    ctx.globalAlpha = 1;
    const hpPct = clamp(boss.hp / boss.maxHp, 0, 1);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(sx - boss.r, sy - boss.r - 14, boss.r * 2, 6);
    ctx.fillStyle = body;
    ctx.fillRect(sx - boss.r, sy - boss.r - 14, boss.r * 2 * hpPct, 6);
  };

  const drawGunslingerBoss = (ctx, cam, boss) => {
    const sx = boss.x - cam.x;
    const sy = boss.y - cam.y;
    const enraged = boss.phase >= 2;
    
    const skin = "#ffd9c2";
    const coat = "#3c404a";
    const shirt = enraged ? "#ff0000" : "#8a1a1a";
    const belt = "#422810";
    const gun = "#181818";
    const metal = "#888888";

    ctx.save();
    ctx.globalAlpha = boss.hitFlash > 0 ? 0.6 : 1;
    ctx.translate(sx, sy);
    
    // Flip depending on movement / player pos? We don't have aimX here easily.
    // If not, we just draw him.
    
    ctx.scale(GAME_SCALE, GAME_SCALE);

    const walkAngle = Math.sin(boss.walkAnim || 0);
    const legSwing = walkAngle * 30 * Math.PI / 180;
    const armSwing = -walkAngle * 30 * Math.PI / 180;
    const bob = Math.abs(Math.sin(boss.walkAnim || 0)) * 2;

    ctx.translate(-32, -32 + bob);

    // Back Arm (Right Arm)
    ctx.save();
    ctx.translate(49, 24);
    ctx.rotate(armSwing);
    pxRect(ctx, -3, 0, 6, 14, coat);
    pxRect(ctx, -3, 14, 6, 4, skin);
    pxRect(ctx, -1, 16, 4, 8, gun); // Small gun
    ctx.restore();

    // Back Leg
    ctx.save();
    ctx.translate(38, 42);
    ctx.rotate(-legSwing);
    pxRect(ctx, -4, 0, 8, 14, "#222");
    pxRect(ctx, -5, 10, 10, 6, "#111"); // Boot
    ctx.restore();

    // Body
    pxRect(ctx, 18, 22, 28, 20, coat);
    pxRect(ctx, 24, 22, 16, 20, shirt);
    pxRect(ctx, 18, 40, 6, 8, coat);
    pxRect(ctx, 40, 40, 6, 8, coat);
    pxRect(ctx, 22, 38, 20, 4, belt);
    pxRect(ctx, 30, 37, 4, 6, "#ddaa00");

    // Front Leg
    ctx.save();
    ctx.translate(26, 42);
    ctx.rotate(legSwing);
    pxRect(ctx, -4, 0, 8, 14, "#222");
    pxRect(ctx, -5, 10, 10, 6, "#111"); // Boot
    ctx.restore();

    // Head
    pxRect(ctx, 24, 12, 16, 12, skin);
    pxRect(ctx, 24, 16, 16, 4, enraged ? "#ff0000" : "#111111"); // Bandana
    pxRect(ctx, 28, 16, 2, 2, "#ffffff");
    pxRect(ctx, 34, 16, 2, 2, "#ffffff");
    pxRect(ctx, 20, 10, 24, 4, "#2a2826"); // Hat brim
    pxRect(ctx, 24, 4, 16, 6, "#2a2826"); // Hat top

    // Front Arm & Shotgun
    ctx.save();
    ctx.translate(15, 24);
    // If casting spray, lift arm? We can just keep it bobbing slightly
    ctx.rotate(-armSwing * 0.5); 
    pxRect(ctx, -3, 0, 6, 14, coat);
    pxRect(ctx, -3, 14, 6, 4, skin);
    // Big Shotgun
    pxRect(ctx, -11, 10, 18, 6, gun); // Gun barrel
    pxRect(ctx, -13, 11, 4, 4, metal);
    pxRect(ctx, 3, 12, 6, 8, gun); // Gun stock
    if (boss.skill === "spray" && boss.skillStep > 0 && Math.random() < 0.3) {
      pxRect(ctx, -21, 8, 10, 10, "#ffaa00"); // Muzzle flash
      pxRect(ctx, -17, 10, 6, 6, "#ffffff");
    }
    ctx.restore();

    ctx.restore();

    ctx.globalAlpha = 1;
    const hpPct = clamp(boss.hp / boss.maxHp, 0, 1);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(sx - boss.r, sy - boss.r - 14, boss.r * 2, 6);
    ctx.fillStyle = enraged ? "#ff6fb0" : "#7ad0ff";
    ctx.fillRect(sx - boss.r, sy - boss.r - 14, boss.r * 2 * hpPct, 6);
  };

  const drawVoidMotherBoss = (ctx, atlas, cam, b) => {
    if (!b || !b.active) return;
    const sx = b.x - cam.x;
    const sy = b.y - cam.y;
    const vm = b.vm;
    const time = b.t;

    // 绘制雾气背景
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    if (vm.fogLevel > 0) {
      ctx.fillStyle = `rgba(15, 5, 20, ${vm.fogLevel * 0.7})`;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight); // Use window size for fog to cover screen
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    // 绘制拖尾和特效 (Particles)
    ctx.globalCompositeOperation = 'screen';
    if (vm.particles) {
      vm.particles.forEach(p => {
        if (p.history && p.history.length > 1) {
          ctx.beginPath();
          ctx.moveTo(p.history[0].x - cam.x, p.history[0].y - cam.y);
          for(let j=1; j<p.history.length; j++) ctx.lineTo(p.history[j].x - cam.x, p.history[j].y - cam.y);
          ctx.strokeStyle = p.type === 'acid' ? '#44ff44' : (p.type === 'egg' ? '#2b442b' : '#aa44ff');
          ctx.lineWidth = p.type === 'egg' ? 16 * GAME_SCALE : 8 * GAME_SCALE;
          ctx.lineCap = 'square';
          ctx.globalAlpha = 0.4;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        const px = p.x - cam.x;
        const py = p.y - cam.y;

        if (p.type === 'acid' || p.type === 'acid_splash') {
          ctx.shadowBlur = 10; ctx.shadowColor = '#00ff00';
          ctx.fillStyle = '#44ff44';
          ctx.globalAlpha = Math.min(1, p.life);
          let size = (p.type === 'acid' ? 16 : 8) * GAME_SCALE;
          ctx.fillRect(px - size/2, py - size/2, size, size);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px - size/4, py - size/4, size/2, size/2); 
          ctx.shadowBlur = 0;
        } 
        else if (p.type === 'slash') { 
          ctx.strokeStyle = p.color;
          ctx.shadowBlur = 20; ctx.shadowColor = p.color;
          ctx.lineWidth = 24 * GAME_SCALE * (p.life / p.maxLife);
          ctx.lineCap = 'square';
          ctx.beginPath();
          ctx.arc(px, py, p.radius, p.angle - p.spread/2, p.angle + p.spread/2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        } 
        else if (p.type === 'line') { 
          ctx.strokeStyle = 'rgba(100, 255, 100, 0.4)';
          ctx.shadowBlur = 30; ctx.shadowColor = '#00ff00';
          ctx.lineWidth = 60 * GAME_SCALE * (p.life / p.maxLife);
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(p.targetX - cam.x, p.targetY - cam.y); ctx.stroke();
          ctx.shadowBlur = 0;
        }
        else if (p.type === 'line_core') { 
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 20 * GAME_SCALE * (p.life / p.maxLife);
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(p.targetX - cam.x, p.targetY - cam.y); ctx.stroke();
        }
        else if (p.type === 'fog') { 
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = '#1a0525';
          ctx.globalAlpha = (p.life / p.maxLife) * 0.8;
          ctx.fillRect(px - 140 * GAME_SCALE, py - 140 * GAME_SCALE, 280 * GAME_SCALE, 280 * GAME_SCALE); 
          if(Math.random() < 0.1) {
            ctx.fillStyle = '#ff0000';
            ctx.globalAlpha = 1;
            ctx.fillRect(px - 20 * GAME_SCALE, py - 10 * GAME_SCALE, 8 * GAME_SCALE, 8 * GAME_SCALE);
            ctx.fillRect(px + 12 * GAME_SCALE, py - 10 * GAME_SCALE, 8 * GAME_SCALE, 8 * GAME_SCALE);
          }
          ctx.globalCompositeOperation = 'screen';
        } 
        else if (p.type === 'egg') { 
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = '#113311';
          ctx.fillRect(px - 14 * GAME_SCALE, py - 20 * GAME_SCALE, 28 * GAME_SCALE, 40 * GAME_SCALE);
          ctx.fillStyle = '#44ff44';
          ctx.fillRect(px - 8 * GAME_SCALE, py - 12 * GAME_SCALE, 16 * GAME_SCALE, 24 * GAME_SCALE);
          ctx.globalCompositeOperation = 'screen';
        } 
        else if (p.type === 'suck') { 
          ctx.fillStyle = '#aa44ff';
          ctx.shadowBlur = 15; ctx.shadowColor = '#aa44ff';
          ctx.fillRect(px - 6 * GAME_SCALE, py - 6 * GAME_SCALE, 12 * GAME_SCALE, 12 * GAME_SCALE);
          ctx.fillStyle = '#fff';
          ctx.fillRect(px - 2 * GAME_SCALE, py - 2 * GAME_SCALE, 4 * GAME_SCALE, 4 * GAME_SCALE);
          ctx.shadowBlur = 0;
        } 
        else if (p.type === 'blast') { 
          let progress = 1 - p.life / p.maxLife;
          let r = 800 * GAME_SCALE * progress;
          ctx.fillStyle = `rgba(255, 50, 50, ${1 - progress})`;
          ctx.fillRect(px - r, py - r, r*2, r*2); 
          ctx.fillStyle = `rgba(255, 255, 255, ${1 - progress})`;
          ctx.fillRect(px - r/2, py - r/2, r, r); 
        } 
        else if (p.type === 'shockwave') { 
          ctx.strokeStyle = 'rgba(255, 50, 50, 0.8)';
          ctx.shadowBlur = 20; ctx.shadowColor = '#ff0000';
          ctx.lineWidth = 20 * GAME_SCALE;
          let r = 400 * GAME_SCALE * (1 - p.life / p.maxLife);
          ctx.strokeRect(px - r, py - r, r*2, r*2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 5 * GAME_SCALE;
          ctx.strokeRect(px - r + 10*GAME_SCALE, py - r + 10*GAME_SCALE, r*2 - 20*GAME_SCALE, r*2 - 20*GAME_SCALE);
          ctx.shadowBlur = 0;
        }
        else if (p.type === 'bite') { 
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = '#ff0000';
          ctx.shadowBlur = 30; ctx.shadowColor = '#ff0000';
          ctx.lineWidth = 24 * GAME_SCALE;
          ctx.lineJoin = 'miter'; 
          let pr = 1 - (p.life / 0.4);
          ctx.beginPath(); 
          ctx.moveTo(px - 120*GAME_SCALE, py + 80*GAME_SCALE - pr*70*GAME_SCALE); ctx.lineTo(px, py + 160*GAME_SCALE - pr*70*GAME_SCALE); ctx.lineTo(px + 120*GAME_SCALE, py + 80*GAME_SCALE - pr*70*GAME_SCALE);
          ctx.stroke();
          ctx.beginPath(); 
          ctx.moveTo(px - 120*GAME_SCALE, py + 200*GAME_SCALE + pr*70*GAME_SCALE); ctx.lineTo(px, py + 120*GAME_SCALE + pr*70*GAME_SCALE); ctx.lineTo(px + 120*GAME_SCALE, py + 200*GAME_SCALE + pr*70*GAME_SCALE);
          ctx.stroke();
          
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 8 * GAME_SCALE;
          ctx.shadowBlur = 0;
          ctx.beginPath(); 
          ctx.moveTo(px - 120*GAME_SCALE, py + 80*GAME_SCALE - pr*70*GAME_SCALE); ctx.lineTo(px, py + 160*GAME_SCALE - pr*70*GAME_SCALE); ctx.lineTo(px + 120*GAME_SCALE, py + 80*GAME_SCALE - pr*70*GAME_SCALE);
          ctx.stroke();
          ctx.beginPath(); 
          ctx.moveTo(px - 120*GAME_SCALE, py + 200*GAME_SCALE + pr*70*GAME_SCALE); ctx.lineTo(px, py + 120*GAME_SCALE + pr*70*GAME_SCALE); ctx.lineTo(px + 120*GAME_SCALE, py + 200*GAME_SCALE + pr*70*GAME_SCALE);
          ctx.stroke();
          ctx.globalCompositeOperation = 'screen';
        }
        ctx.globalAlpha = 1;
      });
    }

    ctx.globalCompositeOperation = 'source-over';

    // 绘制小怪 (Larvas)
    if (vm.larvas) {
      vm.larvas.forEach(e => {
        const ex = e.x - cam.x;
        const ey = e.y - cam.y;
        ctx.fillStyle = '#225522';
        ctx.fillRect(ex - 10 * GAME_SCALE, ey - 6 * GAME_SCALE, 20 * GAME_SCALE, 12 * GAME_SCALE);
        ctx.fillStyle = '#66ff66';
        ctx.fillRect(ex - 8 * GAME_SCALE, ey - 4 * GAME_SCALE, 16 * GAME_SCALE, 8 * GAME_SCALE);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(ex + (e.vx>0?4:-6) * GAME_SCALE, ey - 2 * GAME_SCALE, 2 * GAME_SCALE, 2 * GAME_SCALE);
      });
    }

    // 绘制像素风主体 BOSS
    ctx.save();
    ctx.translate(sx, sy + vm.offsetY);
    
    // 呼吸起伏
    let s = 1 + Math.sin(time * 4) * 0.02; 
    ctx.scale(s * 1.33 * GAME_SCALE, s * 1.33 * GAME_SCALE); // 视觉体型缩小三分之一

    // 尾巴摆动
    let tailSwing = Math.sin(time * 2.5) * 6;
    if (b.skill === 'tail') tailSwing = Math.sin(time * 30) * 15; // 狂乱摆动预警
    
    pxRect(ctx, -2 + tailSwing*0.1, -40, 4, 12, '#0a0a0a');
    pxRect(ctx, -3 + tailSwing*0.4, -32, 6, 12, '#151515');
    pxRect(ctx, -4 + tailSwing*0.8, -22, 8, 12, '#222');
    pxRect(ctx, -1 + tailSwing*0.1, -42, 2, 4, '#88ff88');

    // 后肢 (反向关节)
    pxRect(ctx, -22, -10, 12, 6, '#151515');
    pxRect(ctx, -28, -15, 8, 12, '#0f0f0f');
    pxRect(ctx, -30, -5, 4, 18, '#050505');
    pxRect(ctx, -31, 13, 6, 2, '#555'); 
    
    pxRect(ctx, 10, -10, 12, 6, '#151515');
    pxRect(ctx, 20, -15, 8, 12, '#0f0f0f');
    pxRect(ctx, 26, -5, 4, 18, '#050505');
    pxRect(ctx, 25, 13, 6, 2, '#555');

    // 躯干底座与肌肉
    pxRect(ctx, -18, -16, 36, 38, '#1a1010'); 
    pxRect(ctx, -16, -14, 32, 32, '#2b1a1a'); 
    pxRect(ctx, -12, -10, 24, 26, '#3a2222'); 

    // 脉动的血管 (荧光绿)
    let veinColor = (Math.sin(time * 5) > 0) ? '#228822' : '#115511';
    pxRect(ctx, -10, -2, 2, 10, veinColor);
    pxRect(ctx, 8, -2, 2, 10, veinColor);
    pxRect(ctx, -4, 10, 8, 2, veinColor);

    // 背部甲壳与骨刺 (带反光)
    pxRect(ctx, -14, -12, 28, 20, '#111');
    pxRect(ctx, -12, -8, 24, 14, '#1a1a1a');
    pxRect(ctx, -10, -6, 20, 4, '#2a2a2a'); 

    // 骨刺
    pxRect(ctx, -16, -10, 4, 2, '#aaa'); pxRect(ctx, -18, -12, 2, 2, '#fff');
    pxRect(ctx, 12, -10, 4, 2, '#aaa');  pxRect(ctx, 16, -12, 2, 2, '#fff');
    pxRect(ctx, -18, 0, 4, 2, '#aaa');   pxRect(ctx, -20, -2, 2, 2, '#fff');
    pxRect(ctx, 14, 0, 4, 2, '#aaa');    pxRect(ctx, 18, -2, 2, 2, '#fff');

    // 荧光绿卵囊与酸液包 (加入辉光)
    ctx.shadowBlur = 10; ctx.shadowColor = '#00ff00';
    pxRect(ctx, -14, 10, 8, 8, '#114411'); pxRect(ctx, -12, 12, 4, 4, '#44ff44'); pxRect(ctx, -11, 13, 2, 2, '#ccffcc');
    pxRect(ctx, 6, 14, 10, 8, '#114411');  pxRect(ctx, 8, 16, 6, 4, '#44ff44');  pxRect(ctx, 10, 17, 2, 2, '#ccffcc');
    pxRect(ctx, -6, 18, 12, 6, '#114411'); pxRect(ctx, -4, 19, 8, 4, '#44ff44'); pxRect(ctx, -2, 20, 4, 2, '#ccffcc');
    ctx.shadowBlur = 0;

    // 核心肉瘤 (大招外露时极度明亮)
    if (vm.coreExposed) {
        ctx.shadowBlur = 20; ctx.shadowColor = '#ff0000';
        pxRect(ctx, -8, -6, 16, 16, '#550000');
        pxRect(ctx, -6, -4, 12, 12, '#ff0000');
        pxRect(ctx, -4, -2, 8, 8, '#ff8888');
        pxRect(ctx, -2, 0, 4, 4, '#ffffff');
        ctx.shadowBlur = 0;
    }

    // 头部 (异形长梭形)
    let headY = b.skill === 'bite' ? 15 : 0;
    ctx.translate(0, headY);
    
    pxRect(ctx, -8, 22, 16, 12, '#151515');
    pxRect(ctx, -6, 34, 12, 14, '#111');
    pxRect(ctx, -4, 48, 8, 10, '#0a0a0a');
    pxRect(ctx, -2, 24, 4, 20, '#1a1a1a'); 
    
    // 邪恶的红色眼孔
    ctx.shadowBlur = 8; ctx.shadowColor = '#ff0000';
    pxRect(ctx, -5, 38, 3, 2, '#ff1111');
    pxRect(ctx, 2, 38, 3, 2, '#ff1111');
    ctx.shadowBlur = 0;

    if (b.skill === 'fog') {
        ctx.shadowBlur = 10; ctx.shadowColor = '#8800ff';
        pxRect(ctx, -10, 26, 3, 3, '#bb55ff'); 
        pxRect(ctx, 7, 26, 3, 3, '#bb55ff');
        ctx.shadowBlur = 0;
    }

    // 嘴部与酸液/牙齿
    if (b.skill === 'acid') {
        ctx.shadowBlur = 15; ctx.shadowColor = '#00ff00';
        pxRect(ctx, -5, 56, 10, 8, '#111'); 
        pxRect(ctx, -3, 56, 6, 12, '#44ff44'); 
        pxRect(ctx, -1, 60, 2, 10, '#ccffcc'); 
        ctx.shadowBlur = 0;
    } else if (b.skill === 'bite') {
        pxRect(ctx, -6, 56, 12, 8, '#ff1111'); 
        pxRect(ctx, -4, 56, 2, 4, '#fff'); 
        pxRect(ctx, 2, 56, 2, 4, '#fff');
        pxRect(ctx, -2, 62, 4, 6, '#ffaaaa'); 
    } else {
        pxRect(ctx, -3, 56, 6, 2, '#aaa'); 
    }
    ctx.translate(0, -headY);

    // 前肢巨型螯爪
    let leftClawY = b.skill === 'sweep' ? 25 : 0;
    let rightClawY = b.skill === 'sweep' ? -10 : 0;
    
    pxRect(ctx, -26, 8 + leftClawY, 10, 18, '#1a1a1a');
    pxRect(ctx, -30, 22 + leftClawY, 8, 28, '#111');
    pxRect(ctx, -28, 50 + leftClawY, 4, 12, '#ddd'); 
    pxRect(ctx, -27, 62 + leftClawY, 2, 6, '#fff');
    
    pxRect(ctx, 16, 8 + rightClawY, 10, 18, '#1a1a1a');
    pxRect(ctx, 22, 22 + rightClawY, 8, 28, '#111');
    pxRect(ctx, 24, 50 + rightClawY, 4, 12, '#ddd');
    pxRect(ctx, 25, 62 + rightClawY, 2, 6, '#fff');

    ctx.restore();
    
    ctx.restore();

    ctx.restore();
    
    // hit flash
    if (b.hitFlash > 0) {
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = "white";
      ctx.globalAlpha = 0.6;
      ctx.fillRect(Math.round(sx - b.r), Math.round(sy - b.r), Math.round(b.r * 2), Math.round(b.r * 2));
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
  };

  const drawBoss = (ctx, atlas, cam, boss) => {
    if (!boss || !boss.active) return;
    if (boss.kind === "fire_giant" && boss.fg) {
      drawFireGiant(ctx, cam, boss);
      return;
    }
    if (boss.kind === "gunslinger") {
      drawGunslingerBoss(ctx, cam, boss);
      return;
    }
    if (boss.kind === "void_mother") {
      drawVoidMotherBoss(ctx, atlas, cam, boss);
      return;
    }
    if (boss.kind === "core") {
      drawCoreBoss(ctx, cam, boss);
      return;
    }
  };

  const drawRocketLauncher = (ctx, p, slot) => {
    ctx.save();
    
    let offsetX = 0;
    let offsetY = 0;
    let angle = 0;
    
    const rTime = slot.weapon.reloadTime;
    const fTime = slot.weapon.fireInterval;
    
    // Animation states
    if (slot.reloading > 0) {
      const t = rTime - slot.reloading; // time since reload started (0 to 0.8)
      if (t < 0.2) {
        offsetX = -5;
        angle = 5 * Math.PI / 180;
        offsetX += (Math.random() - 0.5) * 1;
        offsetY += (Math.random() - 0.5) * 1;
      } else if (t < 0.6) {
        offsetX = 3;
      }
    } else if (slot.cooldown > 0) {
      const t = fTime - slot.cooldown; // time since fired (0 to 1.2)
      if (t < 0.1) {
        offsetX = 8;
        offsetX += (Math.random() - 0.5) * 2;
        offsetY += (Math.random() - 0.5) * 2;
      } else if (t < 0.3) {
        offsetX = -10;
      } else {
        const progress = (t - 0.3) / 0.9;
        offsetX = -10 * (1 - progress);
      }
    }
    
    ctx.translate(offsetX * GAME_SCALE, offsetY * GAME_SCALE);
    ctx.rotate(angle);
    ctx.scale(GAME_SCALE, GAME_SCALE);

    // RPG-7 Body
    // Ammo compartment
    const bodyGrad = ctx.createLinearGradient(-15, -5, -15, 5);
    bodyGrad.addColorStop(0, "#444444");
    bodyGrad.addColorStop(1, "#222222");
    
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-15, -6);
    ctx.lineTo(-5, -5);
    ctx.lineTo(-5, 5);
    ctx.lineTo(-15, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Top load port
    ctx.fillStyle = "#333";
    ctx.fillRect(-12, -8, 8, 3);
    
    // Barrel
    ctx.fillStyle = "#555";
    ctx.fillRect(-5, -3, 35, 6);
    ctx.strokeRect(-5, -3, 35, 6);
    
    // Muzzle tip
    ctx.fillStyle = "#555";
    ctx.beginPath();
    ctx.arc(30, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Inner muzzle
    ctx.fillStyle = (slot.reloading === 0 && slot.mag > 0) ? "#0099FF" : "#111";
    ctx.beginPath();
    ctx.arc(30, 0, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Middle black ring
    ctx.fillStyle = "#111";
    ctx.fillRect(10, -3.5, 2, 7);
    ctx.fillRect(20, -3.5, 2, 7);
    
    // Grip
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(-10, 5, 4, 15);
    ctx.fillRect(-10, 15, 8, 5);
    ctx.strokeStyle = "#A0522D";
    ctx.beginPath();
    for(let i=0; i<3; i++) {
      ctx.moveTo(-10, 8 + i*3);
      ctx.lineTo(-6, 11 + i*3);
    }
    ctx.stroke();

    // Aim mark
    ctx.fillStyle = "#FF0000";
    ctx.beginPath();
    ctx.moveTo(15, -3);
    ctx.lineTo(13.5, -5);
    ctx.lineTo(16.5, -5);
    ctx.closePath();
    ctx.fill();

    // Text "RPG-7"
    ctx.fillStyle = "#FFF";
    ctx.font = "6px Arial";
    ctx.textAlign = "center";
    ctx.fillText("RPG-7", -10, 2);
    
    // Rocket loading animation
    if (slot.reloading > 0) {
      const t = rTime - slot.reloading;
      if (t >= 0.2 && t <= 0.6) {
        const p = (t - 0.2) / 0.4;
        const rx = -30 + p * 18;
        ctx.fillStyle = "#ff6600";
        ctx.fillRect(rx, -12, 10, 4);
        ctx.fillStyle = "#fff";
        ctx.fillRect(rx+10, -13, 6, 6);
        ctx.fillStyle = "#ff0000";
        ctx.beginPath();
        ctx.moveTo(rx+16, -13);
        ctx.lineTo(rx+20, -10);
        ctx.lineTo(rx+16, -7);
        ctx.fill();
      }
      if (t >= 0.6 && t < 0.8) {
        ctx.fillStyle = `rgba(0, 153, 255, ${1 - (t-0.6)/0.2})`;
        ctx.beginPath();
        ctx.arc(30, 0, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Muzzle flash animation
    if (slot.cooldown > 0) {
      const t = fTime - slot.cooldown;
      if (t > 0.1 && t < 0.3) {
        const p = (t - 0.1) / 0.2;
        ctx.fillStyle = `rgba(255, ${100 + p*100}, 0, ${1-p})`;
        ctx.beginPath();
        ctx.ellipse(45, 0, 15 * (1-p), 10 * (1-p), 0, 0, Math.PI*2);
        ctx.fill();
      }
    }

    ctx.restore();
  };

  const drawPlayerSprite = (ctx, p) => {
    const hair = "#9aa5b1";
    const skin = "#f2ccb0";
    const shirt = "#3a3c40";
    const shorts = "#222222";
    const belt = "#8B4513";
    const shoes = "#2a2a2a";

    // Animation angles
    // walkAnim is accumulated dt * 15
    const walkAngle = Math.sin(p.walkAnim || 0);
    const legSwing = walkAngle * 30 * Math.PI / 180;
    const armSwing = -walkAngle * 20 * Math.PI / 180;

    // Body Bob
    const bob = Math.abs(Math.sin(p.walkAnim || 0)) * 2;

    ctx.save();
    ctx.translate(-24, -24 + bob);

    // Back Arm (Right arm)
    ctx.save();
    ctx.translate(15, 22);
    ctx.rotate(armSwing);
    pxRect(ctx, -3, 0, 6, 14, skin);
    pxRect(ctx, -3, 0, 6, 6, shirt); // Sleeve
    ctx.restore();

    // Back Leg (Right leg)
    ctx.save();
    ctx.translate(19, 32);
    ctx.rotate(-legSwing);
    pxRect(ctx, -3, 0, 6, 12, skin);
    pxRect(ctx, -3, 0, 6, 6, shorts);
    pxRect(ctx, -3, 8, 6, 4, shoes);
    ctx.restore();

    // Body
    pxRect(ctx, 16, 18, 16, 14, shirt);
    // Logo on shirt
    pxRect(ctx, 20, 22, 2, 6, "#ffffff");
    pxRect(ctx, 22, 22, 4, 2, "#ffffff");
    pxRect(ctx, 26, 22, 2, 6, "#ffffff");

    // Belt
    pxRect(ctx, 16, 30, 16, 3, belt);
    pxRect(ctx, 22, 30, 4, 3, "#ddaa00"); // Buckle

    // Front Leg (Left leg)
    ctx.save();
    ctx.translate(27, 32);
    ctx.rotate(legSwing);
    pxRect(ctx, -3, 0, 6, 12, skin);
    pxRect(ctx, -3, 0, 6, 6, shorts);
    pxRect(ctx, -3, 8, 6, 4, shoes);
    ctx.restore();

    // Head
    ctx.save();
    // Head slightly bobs less
    ctx.translate(0, -bob * 0.5);
    pxRect(ctx, 14, 4, 20, 14, skin);
    // Hair
    pxRect(ctx, 12, 2, 24, 6, hair); // Top
    pxRect(ctx, 12, 6, 4, 8, hair); // Side
    pxRect(ctx, 14, 8, 2, 2, hair); // Detail
    // Eyes
    pxRect(ctx, 18, 10, 4, 4, "#111111");
    pxRect(ctx, 28, 10, 4, 4, "#111111");
    ctx.restore();

    // Front Arm (Left arm)
    // We only animate the front arm swing if not aiming? 
    // Actually the player always holds the weapon in the front arm. 
    // We can just keep the arm slightly rotated to hold the weapon, or animate it less.
    ctx.save();
    ctx.translate(33, 22);
    ctx.rotate(-armSwing * 0.5); 
    pxRect(ctx, -3, 0, 6, 14, skin);
    pxRect(ctx, -3, 0, 6, 6, shirt); // Sleeve

    // Book/Shield in Front Hand
    pxRect(ctx, -1, 2, 10, 12, "#f1c40f");
    pxRect(ctx, 1, 4, 6, 8, "#d35400");
    pxRect(ctx, -1, 0, 10, 2, "#e67e22");
    ctx.restore();

    ctx.restore();
  };

  const drawPlayer = (ctx, atlas, cam, p) => {
    const sx = p.x - cam.x;
    const sy = p.y - cam.y;
    if (window.Shooter?.config?.invincible === true) {
      const tt = (performance.now ? performance.now() : Date.now()) / 1000;
      const pulse = 0.5 + 0.5 * Math.sin(tt * 6.2);
      const r = (p.r ?? 12) + (12 + pulse * 6) * GAME_SCALE * 0.5;
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
    
    // Instead of rotating the whole body, just flip based on aimX
    if (p.aimX < 0) {
      ctx.scale(-1, 1);
    }
    
    // Roll effect
    if (p.rollTimer > 0) {
      ctx.rotate(p.rollTimer * 20); // Fast spinning
    }
    
    ctx.globalAlpha = p.invuln > 0 ? 0.6 : 1;
    
    ctx.save();
    ctx.scale(GAME_SCALE * 0.5, GAME_SCALE * 0.5);
    drawPlayerSprite(ctx, p);
    ctx.restore();
    
    ctx.globalAlpha = 1;
    
    // Draw Weapon
    const slot = p.slot;
    if (slot && slot.weapon && p.rollTimer <= 0) {
      ctx.save();
      // Translate to hand position (approximate)
      // In makePlayer, right arm is at x=12 (which is -12 from center 24)
      // y=22 (which is -2 from center 24)
      // But because we might scale(-1, 1), the visual right arm is always at X = -12 * GAME_SCALE (before aimX rotation)
      // Actually, the weapon should point towards the mouse.
      const handX = -5 * GAME_SCALE; 
      const handY = (1 + Math.abs(Math.sin(p.walkAnim || 0))) * GAME_SCALE;
      ctx.translate(handX, handY);
      
      // Rotate weapon towards aim (compensating for the body scale(-1, 1) flip if aiming left)
      let aimAngle = Math.atan2(p.aimY, p.aimX);
      if (p.aimX < 0) {
        aimAngle = Math.atan2(p.aimY, -p.aimX);
      }
      ctx.rotate(aimAngle);
      
      ctx.scale(0.5, 0.5); // Also scale down the weapon drawing
      
      if (slot.weapon.key === "rocket_launcher") {
        drawRocketLauncher(ctx, p, slot);
      } else if (slot.weapon.key === "grenade") {
        // Draw Grenade in hand
        ctx.fillStyle = "#2d5a27"; // dark green body
        ctx.fillRect(-2 * GAME_SCALE, -4 * GAME_SCALE, 6 * GAME_SCALE, 8 * GAME_SCALE);
        ctx.fillStyle = "#1a3617"; // pattern
        ctx.fillRect(-1 * GAME_SCALE, -3 * GAME_SCALE, 4 * GAME_SCALE, 2 * GAME_SCALE);
        ctx.fillRect(-1 * GAME_SCALE, 1 * GAME_SCALE, 4 * GAME_SCALE, 2 * GAME_SCALE);
        ctx.fillStyle = "#555"; // top pin area
        ctx.fillRect(0 * GAME_SCALE, -6 * GAME_SCALE, 2 * GAME_SCALE, 2 * GAME_SCALE);
        ctx.strokeStyle = "#888"; // pin ring
        ctx.beginPath();
        ctx.arc(3 * GAME_SCALE, -6 * GAME_SCALE, 1.5 * GAME_SCALE, 0, Math.PI * 2);
        ctx.stroke();
      } else if (slot.weapon.key === "thunder_gun") {
        // Draw Thunder Gun (sci-fi tech weapon)
        ctx.fillStyle = "#223"; // main body
        ctx.fillRect(-2 * GAME_SCALE, -3 * GAME_SCALE, 18 * GAME_SCALE, 6 * GAME_SCALE);
        ctx.fillStyle = "#112"; // grip
        ctx.fillRect(2 * GAME_SCALE, 3 * GAME_SCALE, 4 * GAME_SCALE, 6 * GAME_SCALE);
        ctx.fillStyle = "#7ad0ff"; // energy core
        const pulse = 0.5 + 0.5 * Math.sin((performance.now() / 1000) * 8);
        ctx.globalAlpha = 0.5 + 0.5 * pulse;
        ctx.fillRect(4 * GAME_SCALE, -2 * GAME_SCALE, 8 * GAME_SCALE, 4 * GAME_SCALE);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#4af"; // barrel rails
        ctx.fillRect(14 * GAME_SCALE, -4 * GAME_SCALE, 6 * GAME_SCALE, 2 * GAME_SCALE);
        ctx.fillRect(14 * GAME_SCALE, 2 * GAME_SCALE, 6 * GAME_SCALE, 2 * GAME_SCALE);
        ctx.fillStyle = "#fff"; // muzzle node
        ctx.beginPath();
        ctx.arc(21 * GAME_SCALE, 0, 1.5 * GAME_SCALE, 0, Math.PI * 2);
        ctx.fill();
        if (slot.cooldown > 0) {
          ctx.strokeStyle = "#7ad0ff";
          ctx.beginPath();
          ctx.moveTo(21 * GAME_SCALE, 0);
          ctx.lineTo(26 * GAME_SCALE + Math.random() * 4 * GAME_SCALE, (Math.random() - 0.5) * 4 * GAME_SCALE);
          ctx.stroke();
        }
      } else {
        // Generic simple gun drawing for other weapons
        ctx.fillStyle = "#333";
        ctx.fillRect(0, -2 * GAME_SCALE, 15 * GAME_SCALE, 4 * GAME_SCALE);
        ctx.fillStyle = "#ffcc00";
        ctx.fillRect(10 * GAME_SCALE, -2 * GAME_SCALE, 2 * GAME_SCALE, 2 * GAME_SCALE);
      }
      ctx.restore();
    }
    
    ctx.restore();
    
    // Draw aiming line
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const bob = Math.abs(Math.sin(p.walkAnim || 0)) * GAME_SCALE;
    ctx.moveTo(sx, sy + bob);
    ctx.lineTo(sx + p.aimX * (34 * GAME_SCALE * 0.5), sy + bob + p.aimY * (34 * GAME_SCALE * 0.5));
    ctx.stroke();
  };

  const drawIndicators = (ctx, gameplay, cam, viewW, viewH) => {
    const margin = 30;
    const cx = viewW / 2;
    const cy = viewH / 2;
    
    const drawPointer = (x, y, color, isBoss) => {
      const dx = x - (cam.x + cx);
      const dy = y - (cam.y + cy);
      // Only show if off-screen
      if (Math.abs(dx) < cx && Math.abs(dy) < cy) return;
      
      const angle = Math.atan2(dy, dx);
      let px = cx + Math.cos(angle) * (cx - margin);
      let py = cy + Math.sin(angle) * (cy - margin);
      
      // Clamp to screen edges properly
      const boundX = cx - margin;
      const boundY = cy - margin;
      if (Math.abs(Math.cos(angle)) > 0.001) {
        const t = boundX / Math.abs(Math.cos(angle));
        if (t * Math.abs(Math.sin(angle)) <= boundY) {
          px = cx + Math.sign(Math.cos(angle)) * boundX;
          py = cy + t * Math.sin(angle);
        }
      }
      if (Math.abs(Math.sin(angle)) > 0.001) {
        const t = boundY / Math.abs(Math.sin(angle));
        if (t * Math.abs(Math.cos(angle)) <= boundX) {
          px = cx + t * Math.cos(angle);
          py = cy + Math.sign(Math.sin(angle)) * boundY;
        }
      }

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-8, -6);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, 6);
      ctx.fill();
      
      if (isBoss) {
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    };

    if (gameplay.boss && gameplay.boss.active) {
      drawPointer(gameplay.boss.x, gameplay.boss.y, "#ff6fb0", true);
    }
    for (const e of gameplay.enemies.items) {
      if (e.active && e.elite) {
        drawPointer(e.x, e.y, "#ffd36f", false);
      }
    }
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

  root.render = { PixelRenderer, drawWorld, drawBullet, drawPickup, drawSpecial, drawLightning, drawEnemy, drawBoss, drawParticle, drawPlayer, drawIndicators, nightOverlay, drawFloatingText };
})();
