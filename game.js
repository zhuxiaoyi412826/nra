(() => {
  const root = window.Shooter;
  const { clamp, norm } = root.util;

  const canvas = document.getElementById("game");
  const renderer = new root.render.PixelRenderer(canvas);
  const audio = new root.AudioEngine();
  const ui = root.ui;
  const game = new root.Game(audio, ui);
  const shake = new root.entities.CameraShake();

  const stick = document.getElementById("stick");
  const stickKnob = document.getElementById("stick-knob");
  const btnShoot = document.getElementById("btn-shoot");
  const btnReload = document.getElementById("btn-reload");
  const btnSwap = document.getElementById("btn-swap");
  const btnShop = document.getElementById("btn-shop");
  const btnPause = document.getElementById("btn-pause");

  const btnStart = document.getElementById("btn-start");
  const btnHow = document.getElementById("btn-how");
  const btnReset = document.getElementById("btn-reset");
  const btnResume = document.getElementById("btn-resume");
  const btnRestart = document.getElementById("btn-restart");
  const btnBack = document.getElementById("btn-back");
  const btnAgain = document.getElementById("btn-again");
  const btnDeadBack = document.getElementById("btn-dead-back");
  const btnShopClose = document.getElementById("btn-shop-close");
  const btnShopRestart = document.getElementById("btn-shop-restart");
  const btnShopBack = document.getElementById("btn-shop-back");
  const btnOpenShop = document.getElementById("btn-open-shop");
  const btnOpenSettings = document.getElementById("btn-open-settings");
  const btnSettings = document.getElementById("btn-settings");
  const btnPauseSettings = document.getElementById("btn-pause-settings");
  const btnShopSettings = document.getElementById("btn-shop-settings");
  const btnDeadSettings = document.getElementById("btn-dead-settings");
  const btnTouchSettings = document.getElementById("btn-touch-settings");

  const btnSettingsApply = document.getElementById("btn-settings-apply");
  const btnSettingsDefaults = document.getElementById("btn-settings-defaults");
  const btnSettingsClose = document.getElementById("btn-settings-close");
  const setPixel = document.getElementById("set-pixel");
  const setShake = document.getElementById("set-shake");
  const setFps = document.getElementById("set-fps");
  const setVol = document.getElementById("set-vol");
  const setAmb = document.getElementById("set-amb");
  const setInfCoins = document.getElementById("set-inf-coins");
  const setInfGems = document.getElementById("set-inf-gems");
  const setInfAmmo = document.getElementById("set-inf-ammo");
  const setInvincible = document.getElementById("set-invincible");

  const elFpsHud = document.getElementById("fps-hud");
  const elTxtFps = document.getElementById("txt-fps");
  const elHowTo = ui.elHowTo;

  const isTouch = () => window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

  class Input {
    constructor() {
      this.keys = new Set();
      this.moveX = 0;
      this.moveY = 0;
      this.aimScreenX = 0;
      this.aimScreenY = 0;
      this.hasAim = false;
      this.fireHeld = false;
      this.reloadPressed = false;
      this.swapPressed = false;
      this.specialQPressed = false;
      this.specialEPressed = false;
      this.specialRPressed = false;
      this.pausePressed = false;
      this.shopPressed = false;
      this.selectSlot = null;
      this.equipWeaponKey = null;
      this.joyActive = false;
      this.joyId = null;
      this.joyBase = { x: 0, y: 0 };
      this.joyVec = { x: 0, y: 0 };
    }
    resetFrame() {
      this.reloadPressed = false;
      this.swapPressed = false;
      this.specialQPressed = false;
      this.specialEPressed = false;
      this.specialRPressed = false;
      this.pausePressed = false;
      this.shopPressed = false;
      this.selectSlot = null;
      this.equipWeaponKey = null;
    }
    recomputeMove() {
      const k = this.keys;
      let x = 0;
      let y = 0;
      if (k.has("KeyA") || k.has("ArrowLeft")) x -= 1;
      if (k.has("KeyD") || k.has("ArrowRight")) x += 1;
      if (k.has("KeyW") || k.has("ArrowUp")) y -= 1;
      if (k.has("KeyS") || k.has("ArrowDown")) y += 1;
      x += this.joyVec.x;
      y += this.joyVec.y;
      const n = norm(x, y);
      this.moveX = n.x;
      this.moveY = n.y;
    }
  }

  const input = new Input();
  let lastUiState = game.state;
  let settingsReturnState = null;
  let fpsInstant = 60;

  const syncSettingsForm = () => {
    const cfg = root.config || {};
    if (setPixel) setPixel.value = String(cfg.pixelScale ?? 0);
    if (setShake) setShake.checked = cfg.screenShake !== false;
    if (setFps) setFps.checked = cfg.showFps === true;
    if (setVol) setVol.value = String(Math.round(clamp(cfg.masterVolume ?? 0.5, 0, 1) * 100));
    if (setAmb) setAmb.value = String(Math.round(clamp(cfg.ambientMul ?? 1, 0, 1) * 100));
    if (setInfCoins) setInfCoins.checked = cfg.infiniteCoins !== false;
    if (setInfGems) setInfGems.checked = cfg.infiniteGems !== false;
    if (setInfAmmo) setInfAmmo.checked = cfg.infiniteAmmo !== false;
    if (setInvincible) setInvincible.checked = cfg.invincible === true;
  };

  const applySettings = () => {
    const cfg = root.config || (root.config = {});
    if (setPixel) cfg.pixelScale = Number(setPixel.value || 0) || 0;
    if (setShake) cfg.screenShake = Boolean(setShake.checked);
    if (setFps) cfg.showFps = Boolean(setFps.checked);
    if (setVol) cfg.masterVolume = clamp(Number(setVol.value || 50) / 100, 0, 1);
    if (setAmb) cfg.ambientMul = clamp(Number(setAmb.value || 100) / 100, 0, 1);
    if (setInfCoins) cfg.infiniteCoins = Boolean(setInfCoins.checked);
    if (setInfGems) cfg.infiniteGems = Boolean(setInfGems.checked);
    if (setInfAmmo) cfg.infiniteAmmo = Boolean(setInfAmmo.checked);
    if (setInvincible) cfg.invincible = Boolean(setInvincible.checked);
    audio.unlock();
    audio.setMaster(cfg.masterVolume);
    renderer.resize(isTouch());
    if (elFpsHud) elFpsHud.hidden = cfg.showFps !== true;
  };

  const openSettings = () => {
    audio.unlock();
    audio.ui();
    settingsReturnState = game.state;
    if (settingsReturnState === "playing") game.pause();
    syncSettingsForm();
    ui.openSettings();
  };

  const closeSettings = (shouldApply) => {
    if (shouldApply) applySettings();
    ui.closeSettings();
    if (settingsReturnState === "playing" && game.state === "paused") game.resume();
    settingsReturnState = null;
  };

  const equipWeaponByKey = (weaponKey) => {
    const w = root.constants.WEAPONS[weaponKey];
    if (!w) return;
    const inv = game.player.inv;
    const idx = inv.findIndex((s) => s.weapon && s.weapon.key === weaponKey);
    if (idx >= 0) {
      game.player.activeSlot = idx;
      return;
    }
    inv.push({ weapon: w, mag: w.magSize, reserve: 9999, reloading: 0, cooldown: 0 });
    game.player.activeSlot = inv.length - 1;
  };

  const pointerAim = (e) => {
    input.hasAim = true;
    input.aimScreenX = e.clientX;
    input.aimScreenY = e.clientY;
  };

  const holdButton = (btn, onDown, onUp) => {
    let down = false;
    const d = () => {
      if (down) return;
      down = true;
      onDown();
    };
    const u = () => {
      if (!down) return;
      down = false;
      onUp();
    };
    btn.addEventListener("pointerdown", (e) => {
      audio.unlock();
      e.preventDefault();
      d();
    });
    btn.addEventListener("pointerup", (e) => {
      e.preventDefault();
      u();
    });
    btn.addEventListener("pointercancel", u);
    btn.addEventListener("pointerleave", u);
  };

  const joy = {
    max: 52,
    updateKnob(dx, dy) {
      const v = norm(dx, dy);
      const m = Math.min(this.max, Math.hypot(dx, dy));
      const kx = v.x * m;
      const ky = v.y * m;
      stickKnob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
      input.joyVec = { x: v.x * (m / this.max), y: v.y * (m / this.max) };
      input.recomputeMove();
    },
    reset() {
      stickKnob.style.transform = `translate(-50%, -50%)`;
      input.joyVec = { x: 0, y: 0 };
      input.recomputeMove();
    },
  };

  window.addEventListener("resize", () => renderer.resize(isTouch()), { passive: true });

  window.addEventListener("keydown", (e) => {
    audio.unlock();
    input.keys.add(e.code);
    if (e.code === "KeyF") input.reloadPressed = true;
    if (e.code === "KeyQ") input.specialQPressed = true;
    if (e.code === "KeyE") input.specialEPressed = true;
    if (e.code === "KeyR") input.specialRPressed = true;
    if (e.code === "Digit1") input.selectSlot = 0;
    if (e.code === "Digit2") input.selectSlot = 1;
    if (e.code === "Digit3") input.selectSlot = 2;
    if (e.code === "Digit4") input.selectSlot = 3;
    if (e.code === "Digit5") input.selectSlot = 4;
    if (e.code === "Digit9") input.equipWeaponKey = "hmg";
    if (e.code === "KeyB") input.shopPressed = true;
    if (e.code === "Escape") input.pausePressed = true;
    input.recomputeMove();
  });
  window.addEventListener("keyup", (e) => {
    input.keys.delete(e.code);
    input.recomputeMove();
  });

  canvas.addEventListener(
    "pointerdown",
    (e) => {
      audio.unlock();
      canvas.setPointerCapture(e.pointerId);
      pointerAim(e);
      if (e.pointerType !== "touch") input.fireHeld = true;
    },
    { passive: true }
  );
  canvas.addEventListener("pointermove", pointerAim, { passive: true });
  canvas.addEventListener(
    "pointerup",
    (e) => {
      if (e.pointerType !== "touch") input.fireHeld = false;
    },
    { passive: true }
  );
  canvas.addEventListener(
    "pointercancel",
    (e) => {
      if (e.pointerType !== "touch") input.fireHeld = false;
    },
    { passive: true }
  );

  stick.addEventListener(
    "pointerdown",
    (e) => {
      audio.unlock();
      stick.setPointerCapture(e.pointerId);
      input.joyActive = true;
      input.joyId = e.pointerId;
      const rect = stick.getBoundingClientRect();
      input.joyBase = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      joy.updateKnob(e.clientX - input.joyBase.x, e.clientY - input.joyBase.y);
    },
    { passive: true }
  );
  stick.addEventListener(
    "pointermove",
    (e) => {
      if (!input.joyActive || input.joyId !== e.pointerId) return;
      joy.updateKnob(e.clientX - input.joyBase.x, e.clientY - input.joyBase.y);
    },
    { passive: true }
  );
  stick.addEventListener(
    "pointerup",
    (e) => {
      if (input.joyId !== e.pointerId) return;
      input.joyActive = false;
      input.joyId = null;
      joy.reset();
    },
    { passive: true }
  );
  stick.addEventListener(
    "pointercancel",
    (e) => {
      if (input.joyId !== e.pointerId) return;
      input.joyActive = false;
      input.joyId = null;
      joy.reset();
    },
    { passive: true }
  );

  holdButton(
    btnShoot,
    () => {
      input.fireHeld = true;
    },
    () => {
      input.fireHeld = false;
    }
  );
  btnReload.addEventListener("click", () => {
    audio.unlock();
    audio.ui();
    input.reloadPressed = true;
  });
  btnSwap.addEventListener("click", () => {
    audio.unlock();
    audio.ui();
    input.swapPressed = true;
  });
  btnShop.addEventListener("click", () => {
    audio.unlock();
    input.shopPressed = true;
  });
  btnPause.addEventListener("click", () => {
    audio.unlock();
    audio.ui();
    input.pausePressed = true;
  });

  btnStart.addEventListener("click", () => {
    audio.unlock();
    audio.ui();
    game.start();
  });
  btnHow.addEventListener("click", () => {
    audio.unlock();
    audio.ui();
    elHowTo.hidden = !elHowTo.hidden;
  });
  if (btnSettings) {
    btnSettings.addEventListener("click", () => {
      openSettings();
    });
  }
  btnReset.addEventListener("click", () => {
    audio.unlock();
    audio.ui();
    ui.clearLeaderboard();
    ui.renderLeaderboard();
  });
  btnResume.addEventListener("click", () => {
    audio.unlock();
    audio.ui();
    game.resume();
  });
  if (btnPauseSettings) {
    btnPauseSettings.addEventListener("click", () => {
      openSettings();
    });
  }
  btnRestart.addEventListener("click", () => {
    audio.unlock();
    audio.ui();
    game.start();
  });
  btnBack.addEventListener("click", () => {
    audio.unlock();
    audio.ui();
    game.backToMenu();
  });
  btnAgain.addEventListener("click", () => {
    audio.unlock();
    audio.ui();
    game.start();
  });
  btnDeadBack.addEventListener("click", () => {
    audio.unlock();
    audio.ui();
    game.backToMenu();
  });
  if (btnDeadSettings) {
    btnDeadSettings.addEventListener("click", () => {
      openSettings();
    });
  }
  btnShopClose.addEventListener("click", () => {
    audio.unlock();
    game.closeShop();
  });
  if (btnShopSettings) {
    btnShopSettings.addEventListener("click", () => {
      openSettings();
    });
  }
  btnShopRestart.addEventListener("click", () => {
    audio.unlock();
    audio.ui();
    game.start();
  });
  btnShopBack.addEventListener("click", () => {
    audio.unlock();
    audio.ui();
    game.backToMenu();
  });
  btnOpenShop.addEventListener("click", () => {
    audio.unlock();
    audio.ui();
    input.shopPressed = true;
  });
  if (btnOpenSettings) {
    btnOpenSettings.addEventListener("click", () => {
      openSettings();
    });
  }
  if (btnTouchSettings) {
    btnTouchSettings.addEventListener("click", () => {
      openSettings();
    });
  }

  const bossSpawnBtns = document.querySelectorAll("[data-boss-spawn]");
  for (const btn of bossSpawnBtns) {
    btn.addEventListener("click", () => {
      audio.unlock();
      audio.ui();
      const kind = btn.getAttribute("data-boss-spawn") || "core";
      if (game.state === "menu" || game.state === "dead") game.start();
      game.spawnBossNow(kind, audio);
      closeSettings(false);
    });
  }
  if (btnSettingsApply) {
    btnSettingsApply.addEventListener("click", () => {
      closeSettings(true);
    });
  }
  if (btnSettingsClose) {
    btnSettingsClose.addEventListener("click", () => {
      closeSettings(false);
    });
  }
  if (btnSettingsDefaults) {
    btnSettingsDefaults.addEventListener("click", () => {
      root.config.pixelScale = 0;
      root.config.screenShake = true;
      root.config.showFps = false;
      root.config.masterVolume = 0.5;
      root.config.ambientMul = 1;
      root.config.infiniteCoins = true;
      root.config.infiniteGems = true;
      root.config.infiniteAmmo = true;
      root.config.invincible = false;
      syncSettingsForm();
    });
  }

  const step = (() => {
    let last = performance.now();
    return (t) => {
      const dtRaw = (t - last) / 1000;
      const dt = clamp(dtRaw, 0, 0.033);
      last = t;
      fpsInstant = 1 / Math.max(0.001, dtRaw);
      shake.update(dt);
      input.recomputeMove();

      renderer.render((hiCtx, viewW, viewH) => {
        if (ui.isSettingsOpen && ui.isSettingsOpen()) {
          input.fireHeld = false;
          if (input.pausePressed || input.shopPressed) closeSettings(false);
          game.updateCamera(viewW, viewH, shake);
          game.updateAim(input, canvas, viewW, viewH);
        } else if (game.state === "playing") {
          if (input.pausePressed) {
            input.fireHeld = false;
            game.pause();
          }
          if (input.shopPressed) {
            input.fireHeld = false;
            game.openShop();
          }
          game.updateCamera(viewW, viewH, shake);
          game.updateAim(input, canvas, viewW, viewH);
          if (input.equipWeaponKey) equipWeaponByKey(input.equipWeaponKey);
          if (input.selectSlot != null) game.player.selectWeapon(input.selectSlot);
          if (input.swapPressed) game.player.swapWeapon();
          if (input.specialQPressed) game.useSpecial("grenade", shake);
          if (input.specialEPressed) game.useSpecial("rocket", shake);
          if (input.specialRPressed) game.useSpecial("thunder", shake);
          game.update(dt, input, shake, audio, t / 1000);
        } else if (game.state === "paused") {
          if (input.pausePressed) game.resume();
          if (input.shopPressed) game.openShop();
          game.updateCamera(viewW, viewH, shake);
          game.updateAim(input, canvas, viewW, viewH);
          if (input.equipWeaponKey) equipWeaponByKey(input.equipWeaponKey);
          if (input.selectSlot != null) game.player.selectWeapon(input.selectSlot);
          if (input.swapPressed) game.player.swapWeapon();
        } else if (game.state === "shop") {
          if (input.pausePressed || input.shopPressed) game.closeShop();
          game.updateCamera(viewW, viewH, shake);
          game.updateAim(input, canvas, viewW, viewH);
        } else {
          input.fireHeld = false;
        }

        ui.setUIState(game.state);
        if (game.state === "playing" || game.state === "paused" || game.state === "shop") ui.updateHud(game);
        if (game.state === "shop" && lastUiState !== "shop") ui.renderShop(game, audio);
        if (game.state === "playing" || game.state === "paused" || game.state === "shop") ui.renderMinimap(game, viewW, viewH);
        game.render(hiCtx, viewW, viewH, renderer.atlas);
        if (game.state === "playing") root.render.drawIndicators(hiCtx, game, game.cam, viewW, viewH);
      });

      if (elFpsHud && elTxtFps) {
        const on = root.config?.showFps === true;
        elFpsHud.hidden = !on;
        if (on) elTxtFps.textContent = fpsInstant.toFixed(1);
      }

      input.resetFrame();
      lastUiState = game.state;
      requestAnimationFrame(step);
    };
  })();

  const boot = () => {
    renderer.resize(isTouch());
    if (elFpsHud) elFpsHud.hidden = root.config?.showFps !== true;
    ui.renderLeaderboard();
    ui.setUIState(game.state);
    requestAnimationFrame(step);
  };

  boot();
})();

