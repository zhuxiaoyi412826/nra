(() => {
  const root = (window.Shooter = window.Shooter || {});
  const { WEAPONS } = root.constants;

  Object.assign(WEAPONS, {
    pistol: {
      key: "pistol",
      name: "手枪",
      damage: 18,
      fireInterval: 0.24,
      magSize: 12,
      reloadTime: 1.05,
      spreadDeg: 2.2,
      bulletsPerShot: 1,
      bulletSpeed: 980,
      kick: 2.2,
    },
    rifle: {
      key: "rifle",
      name: "步枪",
      damage: 12,
      fireInterval: 0.095,
      magSize: 30,
      reloadTime: 1.35,
      spreadDeg: 3.2,
      bulletsPerShot: 1,
      bulletSpeed: 1080,
      kick: 2.6,
    },
    shotgun: {
      key: "shotgun",
      name: "霰弹枪",
      damage: 7,
      fireInterval: 0.78,
      magSize: 6,
      reloadTime: 1.55,
      spreadDeg: 14,
      bulletsPerShot: 7,
      bulletSpeed: 900,
      kick: 5.2,
    },
    smg: {
      key: "smg",
      name: "冲锋枪",
      damage: 8,
      fireInterval: 0.065,
      magSize: 42,
      reloadTime: 1.45,
      spreadDeg: 6.5,
      bulletsPerShot: 1,
      bulletSpeed: 980,
      kick: 2.4,
    },
    dmr: {
      key: "dmr",
      name: "连发步枪",
      damage: 24,
      fireInterval: 0.26,
      magSize: 14,
      reloadTime: 1.35,
      spreadDeg: 1.4,
      bulletsPerShot: 1,
      bulletSpeed: 1200,
      kick: 3.2,
    },
    sniper: {
      key: "sniper",
      name: "狙击枪",
      damage: 60,
      fireInterval: 0.95,
      magSize: 5,
      reloadTime: 1.8,
      spreadDeg: 0.6,
      bulletsPerShot: 1,
      bulletSpeed: 1550,
      kick: 6.2,
    },
    hmg: {
      key: "hmg",
      name: "重型机枪",
      damage: 14,
      fireInterval: 0.045,
      magSize: 120,
      reloadTime: 2.2,
      spreadDeg: 7.5,
      bulletsPerShot: 1,
      bulletSpeed: 1100,
      kick: 3.6,
      bulletR: 3.2,
      bulletColor: "#ffd36f",
    },
  });

  root.weapons = {
    list() {
      return Object.values(WEAPONS);
    },
    get(key) {
      return WEAPONS[key] || null;
    },
  };
})();
