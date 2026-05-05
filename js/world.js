(() => {
  const root = (window.Shooter = window.Shooter || {});

  root.WORLD = {
    w: 2400,
    h: 1600,
    obstacles: [
      { x: 420, y: 260, w: 320, h: 180 },
      { x: 980, y: 220, w: 220, h: 220 },
      { x: 1450, y: 310, w: 360, h: 160 },
      { x: 560, y: 720, w: 280, h: 210 },
      { x: 1100, y: 720, w: 320, h: 210 },
      { x: 1680, y: 760, w: 280, h: 230 },
      { x: 900, y: 1200, w: 520, h: 150 },
    ],
    barrels: [
      { x: 300, y: 300, hp: 1, maxHp: 1, active: true },
      { x: 350, y: 320, hp: 1, maxHp: 1, active: true },
      { x: 1300, y: 200, hp: 1, maxHp: 1, active: true },
      { x: 1360, y: 220, hp: 1, maxHp: 1, active: true },
      { x: 700, y: 1050, hp: 1, maxHp: 1, active: true },
      { x: 740, y: 1010, hp: 1, maxHp: 1, active: true },
      { x: 1600, y: 1150, hp: 1, maxHp: 1, active: true },
      { x: 2100, y: 800, hp: 1, maxHp: 1, active: true },
      { x: 2150, y: 850, hp: 1, maxHp: 1, active: true },
    ],
    details: Array.from({ length: 120 }).map(() => ({
      x: Math.random() * 2400,
      y: Math.random() * 1600,
      type: Math.random() < 0.6 ? 'tile' : Math.random() < 0.5 ? 'crack' : 'grass',
      size: Math.random() * 16 + 16,
      rot: Math.random() * Math.PI * 2,
      opacity: Math.random() * 0.08 + 0.02
    }))
  };
})();
