(() => {
  const root = (window.Shooter = window.Shooter || {});
  const { clamp, fmtTime } = root.util;
  const WORLD = root.WORLD;

  const elMenu = document.getElementById("menu");
  const elPause = document.getElementById("pause");
  const elShop = document.getElementById("shop");
  const elDead = document.getElementById("dead");
  const elSettings = document.getElementById("settings");
  const elHud = document.getElementById("hud");
  const elTouch = document.getElementById("touch");
  const elHowTo = document.getElementById("howto");
  const elLbList = document.getElementById("lb-list");
  const elDeadSummary = document.getElementById("dead-summary");
  const elMinimap = document.getElementById("minimap");
  const elBossbar = document.getElementById("bossbar");
  const elBossName = document.getElementById("boss-name");
  const elBossPhase = document.getElementById("boss-phase");
  const elBossFill = document.getElementById("boss-fill");
  const elToasts = document.getElementById("toasts");
  const elBuffs = document.getElementById("buffs");

  const elBarHealth = document.getElementById("bar-health");
  const elBarHunger = document.getElementById("bar-hunger");
  const elBarThirst = document.getElementById("bar-thirst");
  const elTxtHealth = document.getElementById("txt-health");
  const elTxtHunger = document.getElementById("txt-hunger");
  const elTxtThirst = document.getElementById("txt-thirst");
  const elTxtWeapon = document.getElementById("txt-weapon");
  const elTxtAmmo = document.getElementById("txt-ammo");
  const elTxtKills = document.getElementById("txt-kills");
  const elTxtCoins = document.getElementById("txt-coins");
  const elTxtGems = document.getElementById("txt-gems");
  const elTxtMission = document.getElementById("txt-mission");
  const elTxtMissionProgress = document.getElementById("txt-mission-progress");
  const elTxtTime = document.getElementById("txt-time");
  const elTxtPhase = document.getElementById("txt-phase");

  const elShopCoins = document.getElementById("shop-coins");
  const elShopGems = document.getElementById("shop-gems");
  const elShopList = document.getElementById("shop-list");

  const mmCtx = elMinimap ? elMinimap.getContext("2d", { alpha: true }) : null;
  if (mmCtx) mmCtx.imageSmoothingEnabled = false;

  const isTouch = () => window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

  let settingsOpen = false;

  const LBS_KEY = "shooter_lb_v1";
  const loadLeaderboard = () => {
    try {
      const raw = localStorage.getItem(LBS_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.filter((x) => x && typeof x.score === "number").slice(0, 10);
    } catch {
      return [];
    }
  };
  const saveLeaderboard = (entry) => {
    const lb = loadLeaderboard();
    lb.push(entry);
    lb.sort((a, b) => b.score - a.score);
    const top = lb.slice(0, 10);
    localStorage.setItem(LBS_KEY, JSON.stringify(top));
    return top;
  };
  const clearLeaderboard = () => {
    localStorage.removeItem(LBS_KEY);
  };
  const renderLeaderboard = () => {
    const lb = loadLeaderboard();
    elLbList.innerHTML = "";
    if (lb.length === 0) {
      const li = document.createElement("li");
      li.textContent = "暂无记录";
      elLbList.appendChild(li);
      return;
    }
    for (const e of lb) {
      const li = document.createElement("li");
      li.textContent = `${e.score} 分  |  击杀 ${e.kills}  |  存活 ${fmtTime(e.time)}  |  ${e.at}`;
      elLbList.appendChild(li);
    }
  };

  const toast = (text, kind = "good") => {
    if (!elToasts) return;
    const el = document.createElement("div");
    el.className = `toast ${kind}`;
    el.textContent = text;
    elToasts.appendChild(el);
    window.setTimeout(() => {
      el.remove();
    }, 1900);
  };

  const renderBuffs = (game) => {
    if (!elBuffs) return;
    const hpLv = game.upgrades?.hp ?? 0;
    const spdLv = game.upgrades?.speed ?? 0;
    const dmgLv = game.upgrades?.damage ?? 0;
    const spdMul = Math.pow(1.06, spdLv);
    const dmgMul = game.player?.damageMul ?? 1;
    elBuffs.innerHTML = "";
    const mk = (t, v) => {
      const c = document.createElement("div");
      c.className = "buff-chip";
      const a = document.createElement("span");
      a.className = "t";
      a.textContent = t;
      const b = document.createElement("span");
      b.className = "v";
      b.textContent = v;
      c.appendChild(a);
      c.appendChild(b);
      return c;
    };
    elBuffs.appendChild(mk("HP+", `Lv${hpLv}`));
    elBuffs.appendChild(mk("移速", `x${spdMul.toFixed(2)}`));
    elBuffs.appendChild(mk("伤害", `x${dmgMul.toFixed(2)}`));
  };

  const SHOP_ITEMS = [
    {
      id: "ammo",
      title: "弹药包",
      desc: "为所有已携带武器补充备用弹药（适合持续火力）",
      coins: 25,
      gems: 0,
      canBuy: () => true,
      buy: (g) => {
        for (const s of g.player.inv) s.reserve += 28;
        if (g.player.inv.length >= 2) g.player.inv[1].reserve += 10;
      },
    },
    {
      id: "med",
      title: "急救包",
      desc: "立刻恢复 35 点生命（不超过上限）",
      coins: 30,
      gems: 0,
      canBuy: (g) => g.player.hp < g.player.maxHp,
      buy: (g) => {
        g.player.hp = clamp(g.player.hp + 35, 0, g.player.maxHp);
      },
    },
    {
      id: "food",
      title: "罐头",
      desc: "立刻恢复 40 点饥饿（不超过上限）",
      coins: 22,
      gems: 0,
      canBuy: (g) => g.player.hunger < g.player.maxHunger,
      buy: (g) => {
        g.player.hunger = clamp(g.player.hunger + 40, 0, g.player.maxHunger);
      },
    },
    {
      id: "water",
      title: "清水",
      desc: "立刻恢复 40 点口渴（不超过上限）",
      coins: 22,
      gems: 0,
      canBuy: (g) => g.player.thirst < g.player.maxThirst,
      buy: (g) => {
        g.player.thirst = clamp(g.player.thirst + 40, 0, g.player.maxThirst);
      },
    },
    {
      id: "hp_up",
      title: "生命上限 +10",
      desc: "永久提升本局生命上限，并补充同等生命",
      coins: 70,
      gems: 0,
      canBuy: (g) => g.upgrades.hp < 6,
      buy: (g) => {
        g.upgrades.hp += 1;
        g.player.maxHp += 10;
        g.player.hp = clamp(g.player.hp + 10, 0, g.player.maxHp);
      },
    },
    {
      id: "spd_up",
      title: "移速 +6%",
      desc: "永久提升本局移动速度",
      coins: 80,
      gems: 0,
      canBuy: (g) => g.upgrades.speed < 6,
      buy: (g) => {
        g.upgrades.speed += 1;
        g.player.speed *= 1.06;
      },
    },
    {
      id: "dmg_up",
      title: "伤害 +8%",
      desc: "永久提升本局武器伤害",
      coins: 90,
      gems: 1,
      canBuy: (g) => g.upgrades.damage < 6,
      buy: (g) => {
        g.upgrades.damage += 1;
        g.player.damageMul *= 1.08;
      },
    },
    {
      id: "smg",
      title: "购买冲锋枪（新增武器槽）",
      desc: "高射速压制，适合近中距离清场",
      coins: 160,
      gems: 1,
      canBuy: (g) => !g.player.inv.some((s) => s.weapon.key === "smg") && g.player.inv.length < 5,
      buy: (g) => {
        const w = root.constants.WEAPONS.smg;
        g.player.inv.push({ weapon: w, mag: w.magSize, reserve: 140, reloading: 0, cooldown: 0 });
        g.player.activeSlot = g.player.inv.length - 1;
      },
    },
    {
      id: "dmr",
      title: "购买连发步枪（新增武器槽）",
      desc: "高伤害中射速，适合点杀精英与风筝 BOSS",
      coins: 220,
      gems: 2,
      canBuy: (g) => !g.player.inv.some((s) => s.weapon.key === "dmr") && g.player.inv.length < 5,
      buy: (g) => {
        const w = root.constants.WEAPONS.dmr;
        g.player.inv.push({ weapon: w, mag: w.magSize, reserve: 70, reloading: 0, cooldown: 0 });
        g.player.activeSlot = g.player.inv.length - 1;
      },
    },
    {
      id: "sniper",
      title: "购买狙击枪（新增武器槽）",
      desc: "单发爆发极高，适合 BOSS 输出窗口",
      coins: 260,
      gems: 3,
      canBuy: (g) => !g.player.inv.some((s) => s.weapon.key === "sniper") && g.player.inv.length < 5,
      buy: (g) => {
        const w = root.constants.WEAPONS.sniper;
        g.player.inv.push({ weapon: w, mag: w.magSize, reserve: 25, reloading: 0, cooldown: 0 });
        g.player.activeSlot = g.player.inv.length - 1;
      },
    },
  ];

  const renderShop = (game, audio) => {
    if (!elShopList) return;
    elShopCoins.textContent = String(game.coins);
    elShopGems.textContent = String(game.gems);
    elShopList.innerHTML = "";
    for (const it of SHOP_ITEMS) {
      const affordable =
        (root.config?.infiniteCoins ? true : game.coins >= it.coins) && (root.config?.infiniteGems ? true : game.gems >= it.gems);
      const available = it.canBuy(game);
      const box = document.createElement("div");
      box.className = "shop-item";
      const title = document.createElement("div");
      title.className = "shop-item-title";
      title.textContent = it.title;
      const price = document.createElement("div");
      price.className = "shop-item-price";
      price.textContent = `${it.coins} 金币${it.gems ? ` + ${it.gems} 钻石` : ""}`;
      const desc = document.createElement("div");
      desc.className = "shop-item-desc";
      desc.textContent = it.desc;
      const btn = document.createElement("button");
      btn.className = "btn shop-item-btn primary";
      btn.textContent = available ? "购买" : "已满/已拥有";
      btn.disabled = !affordable || !available || game.state !== "shop";
      btn.addEventListener("click", () => {
        audio.unlock();
        if (game.state !== "shop") return;
        if (!it.canBuy(game)) return;
        if ((!root.config?.infiniteCoins && game.coins < it.coins) || (!root.config?.infiniteGems && game.gems < it.gems)) return;
        if (!root.config?.infiniteCoins) game.coins -= it.coins;
        if (!root.config?.infiniteGems) game.gems -= it.gems;
        it.buy(game);
        audio.ui();
        if (it.id === "hp_up") toast("生命上限提升 +10", "buff");
        else if (it.id === "spd_up") toast("移速提升 +6%", "buff");
        else if (it.id === "dmg_up") toast("伤害提升 +8%", "buff");
        else if (it.id === "med") toast("生命恢复 +35", "good");
        else if (it.id === "food") toast("饥饿恢复 +40", "good");
        else if (it.id === "water") toast("口渴恢复 +40", "good");
        else if (it.id === "ammo") toast("弹药补给已装填", "good");
        else toast(`获得：${it.title}`, "good");
        renderShop(game, audio);
        updateHud(game);
      });
      box.appendChild(title);
      box.appendChild(btn);
      box.appendChild(price);
      box.appendChild(desc);
      elShopList.appendChild(box);
    }
  };

  const renderMinimap = (game, viewW, viewH) => {
    if (!mmCtx || !elMinimap) return;
    const w = elMinimap.width;
    const h = elMinimap.height;
    mmCtx.setTransform(1, 0, 0, 1, 0, 0);
    mmCtx.clearRect(0, 0, w, h);
    mmCtx.fillStyle = "rgba(0,0,0,0.28)";
    mmCtx.fillRect(0, 0, w, h);
    const pad = 8;
    const mw = w - pad * 2;
    const mh = h - pad * 2;
    const s = Math.min(mw / WORLD.w, mh / WORLD.h);
    const ox = pad + (mw - WORLD.w * s) / 2;
    const oy = pad + (mh - WORLD.h * s) / 2;
    mmCtx.fillStyle = "rgba(255,255,255,0.05)";
    mmCtx.fillRect(ox, oy, WORLD.w * s, WORLD.h * s);
    mmCtx.fillStyle = "rgba(255,255,255,0.18)";
    for (const ob of WORLD.obstacles) mmCtx.fillRect(ox + ob.x * s, oy + ob.y * s, ob.w * s, ob.h * s);
    mmCtx.fillStyle = "rgba(247,209,84,0.9)";
    for (const p of game.pickups.items) {
      if (!p.active) continue;
      const x = ox + p.x * s;
      const y = oy + p.y * s;
      mmCtx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
    }
    mmCtx.fillStyle = "rgba(255,91,110,0.9)";
    for (const e of game.enemies.items) {
      if (!e.active) continue;
      const x = ox + e.x * s;
      const y = oy + e.y * s;
      mmCtx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
    }
    if (game.boss && game.boss.active) {
      const x = ox + game.boss.x * s;
      const y = oy + game.boss.y * s;
      mmCtx.fillStyle = "rgba(255,211,111,0.95)";
      mmCtx.fillRect(Math.round(x) - 3, Math.round(y) - 3, 6, 6);
      mmCtx.fillStyle = "rgba(0,0,0,0.35)";
      mmCtx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
    }
    const px = ox + game.player.x * s;
    const py = oy + game.player.y * s;
    mmCtx.fillStyle = "rgba(89,255,205,1)";
    mmCtx.fillRect(Math.round(px) - 2, Math.round(py) - 2, 4, 4);
    mmCtx.strokeStyle = "rgba(89,255,205,0.9)";
    mmCtx.lineWidth = 1;
    mmCtx.beginPath();
    mmCtx.moveTo(Math.round(px), Math.round(py));
    mmCtx.lineTo(Math.round(px + game.player.aimX * 10), Math.round(py + game.player.aimY * 10));
    mmCtx.stroke();
    mmCtx.strokeStyle = "rgba(255,255,255,0.65)";
    mmCtx.lineWidth = 1;
    mmCtx.strokeRect(ox + game.cam.x * s, oy + game.cam.y * s, viewW * s, viewH * s);
    mmCtx.strokeStyle = "rgba(255,255,255,0.18)";
    mmCtx.strokeRect(0.5, 0.5, w - 1, h - 1);
  };

  const setUIState = (state) => {
    elMenu.hidden = state !== "menu" || settingsOpen;
    elPause.hidden = state !== "paused" || settingsOpen;
    elShop.hidden = state !== "shop" || settingsOpen;
    elDead.hidden = state !== "dead" || settingsOpen;
    if (elSettings) elSettings.hidden = !settingsOpen;
    elHud.hidden = state !== "playing" && state !== "paused" && state !== "shop";
    const t = isTouch();
    elTouch.hidden = !t || (state !== "playing" && state !== "paused" && state !== "shop");
    if (t) document.body.classList.add("touch");
  };

  const openSettings = () => {
    if (!elSettings) return;
    settingsOpen = true;
  };

  const closeSettings = () => {
    if (!elSettings) return;
    settingsOpen = false;
  };

  const isSettingsOpen = () => settingsOpen;

  const updateHud = (game) => {
    const p = game.player;
    const hpPct = clamp(p.hp / p.maxHp, 0, 1);
    const huPct = clamp(p.hunger / p.maxHunger, 0, 1);
    const thPct = clamp(p.thirst / p.maxThirst, 0, 1);
    elBarHealth.style.width = `${hpPct * 100}%`;
    elBarHunger.style.width = `${huPct * 100}%`;
    elBarThirst.style.width = `${thPct * 100}%`;
    elTxtHealth.textContent = `${Math.ceil(p.hp)}/${p.maxHp}`;
    elTxtHunger.textContent = `${Math.ceil(p.hunger)}/${p.maxHunger}`;
    elTxtThirst.textContent = `${Math.ceil(p.thirst)}/${p.maxThirst}`;
    elTxtWeapon.textContent = p.slot.weapon.name;
    elTxtAmmo.textContent = `${p.slot.mag}/${p.slot.reserve}`;
    elTxtKills.textContent = String(game.kills);
    elTxtCoins.textContent = String(game.coins);
    elTxtGems.textContent = String(game.gems);
    elTxtMission.textContent = game.mission.text;
    if (game.mission.type === "kill") elTxtMissionProgress.textContent = `${game.kills}/${game.mission.target}`;
    else elTxtMissionProgress.textContent = `${fmtTime(game.t)}/${fmtTime(game.mission.target)}`;
    elTxtTime.textContent = fmtTime(game.t);
    elTxtPhase.textContent = game.isNight() ? "夜晚" : "白天";

    renderBuffs(game);

    const boss = game.boss;
    if (boss && boss.active) {
      elBossbar.hidden = false;
      elBossName.textContent = boss.name || "BOSS";
      elBossPhase.textContent = `阶段 ${boss.phase}`;
      const hpPct = clamp(boss.hp / boss.maxHp, 0, 1);
      elBossFill.style.width = `${hpPct * 100}%`;
    } else {
      elBossbar.hidden = true;
    }
  };

  const setDeathSummary = (html) => {
    elDeadSummary.innerHTML = html;
  };

  root.ui = {
    elHowTo,
    renderLeaderboard,
    clearLeaderboard,
    saveLeaderboard,
    setUIState,
    updateHud,
    setDeathSummary,
    renderShop,
    renderMinimap,
    toast,
    openSettings,
    closeSettings,
    isSettingsOpen,
  };
})();
