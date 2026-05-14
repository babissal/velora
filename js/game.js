/* ===== game.js — the central hub =====
   This file owns the running game state and the "glue" that the other
   parts of the game lean on: switching screens, opening pop-up panels,
   showing dialog text, saving/loading, and moving between maps and
   battles.

   Everything lives on `window.Game` so the other script files can use
   it without needing modules (the game runs by opening index.html). */

(function () {
  const Data = window.GameData;
  const SAVE_KEY = "velora_save_v1";

  function el(id) { return document.getElementById(id); }

  const Game = {
    state: null,          // the saved game data (see newGame)
    currentScreen: null,  // id of the visible .screen
    battle: null,         // current Battle object, or null
    pendingTrainer: null, // trainer id, if the current battle is a gym fight

    /* internal dialog bookkeeping */
    _dialogLines: [],
    _dialogIndex: 0,
    _dialogOnDone: null,
    _dialogChoice: null,   // { onYes, onNo } when the dialog ends in a choice
    _overlayStack: [],
  };


  /* ===== Screens =====
     A "screen" is a full view. Only one is visible at a time. */
  Game.showScreen = function (screenId) {
    document.querySelectorAll(".screen").forEach(function (s) {
      s.classList.add("hidden");
    });
    el(screenId).classList.remove("hidden");
    Game.currentScreen = screenId;
  };


  /* ===== Overlays =====
     An overlay is a pop-up panel shown on top of a screen (the pause
     menu, the bag, the shop, dialog text...). Several screens reuse
     them, so they are tracked in a small stack. */
  Game.openOverlay = function (overlayId) {
    el(overlayId).classList.remove("hidden");
    if (Game._overlayStack.indexOf(overlayId) === -1) {
      Game._overlayStack.push(overlayId);
    }
  };
  Game.closeOverlay = function (overlayId) {
    el(overlayId).classList.add("hidden");
    Game._overlayStack = Game._overlayStack.filter(function (id) {
      return id !== overlayId;
    });
  };
  Game.closeAllOverlays = function () {
    Game._overlayStack.slice().forEach(Game.closeOverlay);
  };
  Game.topOverlay = function () {
    return Game._overlayStack[Game._overlayStack.length - 1] || null;
  };


  /* ===== Dialog box =====
     showDialog(["line 1", "line 2"], onDone)
     The player advances lines with Space/Enter or by clicking. */
  Game.showDialog = function (lines, onDone) {
    Game._dialogLines = lines.slice();
    Game._dialogIndex = 0;
    Game._dialogOnDone = onDone || null;
    Game._dialogChoice = null;
    el("dialog-choices").classList.add("hidden");
    el("dialog-hint").classList.remove("hidden");
    el("dialog-text").textContent = Game._dialogLines[0] || "";
    Game.openOverlay("dialog-box");
  };

  /* Like showDialog, but the final line is a question with Yes / No
     buttons that call onYes / onNo. */
  Game.showConfirm = function (lines, onYes, onNo) {
    Game.showDialog(lines, null);
    Game._dialogChoice = { onYes: onYes || null, onNo: onNo || null };
  };

  Game.dialogActive = function () {
    return el("dialog-box") && !el("dialog-box").classList.contains("hidden");
  };

  /* True while the Yes / No buttons are showing. */
  Game.dialogChoosing = function () {
    return !el("dialog-choices").classList.contains("hidden");
  };

  Game.advanceDialog = function () {
    if (!Game.dialogActive()) return;
    if (Game.dialogChoosing()) return; // a choice is up — must click Yes/No

    Game._dialogIndex++;
    if (Game._dialogIndex >= Game._dialogLines.length) {
      if (Game._dialogChoice) {
        /* Reached the question — show the Yes / No buttons. */
        el("dialog-hint").classList.add("hidden");
        el("dialog-choices").classList.remove("hidden");
        return;
      }
      Game.closeOverlay("dialog-box");
      const done = Game._dialogOnDone;
      Game._dialogOnDone = null;
      if (done) done();
    } else {
      el("dialog-text").textContent = Game._dialogLines[Game._dialogIndex];
    }
  };

  /* Called by the Yes / No buttons. */
  Game.resolveChoice = function (yes) {
    const choice = Game._dialogChoice;
    Game._dialogChoice = null;
    el("dialog-choices").classList.add("hidden");
    el("dialog-hint").classList.remove("hidden");
    Game.closeOverlay("dialog-box");
    if (!choice) return;
    if (yes && choice.onYes) choice.onYes();
    else if (!yes && choice.onNo) choice.onNo();
  };


  /* ===== Saving and loading (uses the browser's localStorage) ===== */
  Game.hasSave = function () {
    try { return window.GameStorage.getItem(SAVE_KEY) !== null; }
    catch (e) { return false; }
  };
  Game.save = function () {
    try {
      window.GameStorage.setItem(SAVE_KEY, JSON.stringify(Game.state));
      return true;
    } catch (e) {
      return false;
    }
  };
  Game.load = function () {
    try {
      const raw = window.GameStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      Game.state = JSON.parse(raw);
      /* Fill in anything an older save might be missing. */
      if (!Game.state.flags) Game.state.flags = { gymDefeated: false };
      if (typeof Game.state.flags.gym2Defeated !== "boolean") Game.state.flags.gym2Defeated = false;
      if (typeof Game.state.flags.gym3Defeated !== "boolean") Game.state.flags.gym3Defeated = false;
      if (!Game.state.flags.defeatedTrainers) Game.state.flags.defeatedTrainers = [];
      if (!Game.state.flags.pickedItems) Game.state.flags.pickedItems = [];
      if (!Game.state.dex) Game.state.dex = { seen: [], caught: [] };
      if (!Game.state.stats) Game.state.stats = { steps: 0, battlesWon: 0, playSeconds: 0 };
      /* Older saves predate status / pending moves / move PP — backfill. */
      Game.state.party.concat(Game.state.storage).forEach(function (c) {
        if (c.status === undefined) c.status = null;
        if (!c.pendingMoves) c.pendingMoves = [];
        Data.ensurePP(c);
      });
      return true;
    } catch (e) {
      return false;
    }
  };
  Game.deleteSave = function () {
    try { window.GameStorage.removeItem(SAVE_KEY); } catch (e) {}
  };


  /* ===== Starting a game ===== */
  Game.newGame = function (starterId) {
    Game.state = {
      party: [Data.createCreature(starterId, 5)],
      storage: [],
      items: { capture_orb: 5, potion: 3 },
      money: 600,
      map: "town",
      x: 5,
      y: 4,
      facing: "down",
      flags: { gymDefeated: false, gym2Defeated: false, gym3Defeated: false, defeatedTrainers: [], pickedItems: [] },
      dex: { seen: [], caught: [] },
      stats: { steps: 0, battlesWon: 0, playSeconds: 0 },
    };
    Game.recordCaught(starterId);
    Game.save();
    Game.resumeOverworld();
    Game.showDialog([
      "Welcome to Velora!",
      "Your very first companion is by your side.",
      "Tip: walk with the arrow keys. Press Space to talk and to read signs.",
      "Press M to open your menu (party, bag, save).",
      "Head south to reach the route, and find the Gym beyond it.",
    ]);
  };

  /* Show the overworld and (re)draw it from the current state. */
  Game.resumeOverworld = function () {
    Game.closeAllOverlays();
    Game.showScreen("overworld-screen");
    Game.updateHud();
    window.Overworld.render();
  };

  /* The little status bar on the overworld (map name + money). */
  Game.updateHud = function () {
    if (!Game.state) return;
    el("hud-map").textContent = Data.MAPS[Game.state.map].name;
    el("hud-money").textContent = Game.state.money + " coins";
  };


  /* ===== Party helpers ===== */
  Game.healParty = function () {
    Game.state.party.forEach(function (c) {
      c.currentHp = c.maxHp;
      c.status = null;
      Data.refillPP(c);
    });
  };
  Game.partyWiped = function () {
    return Game.state.party.every(function (c) { return c.currentHp <= 0; });
  };
  /* ===== Creature Dex — which species you've seen and caught ===== */
  Game.recordSeen = function (speciesId) {
    if (Game.state.dex.seen.indexOf(speciesId) === -1) {
      Game.state.dex.seen.push(speciesId);
    }
  };
  Game.recordCaught = function (speciesId) {
    Game.recordSeen(speciesId);
    if (Game.state.dex.caught.indexOf(speciesId) === -1) {
      Game.state.dex.caught.push(speciesId);
    }
  };

  /* Put a newly caught creature in the party if there's room (max 6),
     otherwise send it to storage. Returns where it went. */
  Game.addCreature = function (creature) {
    if (Game.state.party.length < 6) {
      Game.state.party.push(creature);
      return "party";
    }
    Game.state.storage.push(creature);
    return "storage";
  };


  /* ===== Moving between maps ===== */
  Game.enterMap = function (mapId, x, y) {
    Game.state.map = mapId;
    Game.state.x = x;
    Game.state.y = y;
    Game.save();
    Game.updateHud();
    window.Overworld.render();
  };


  /* ===== Battles ===== */
  Game.startWildEncounter = function () {
    const enemy = Data.rollWildCreature(Game.state.map);
    if (!enemy) return;
    Game.pendingTrainer = null;
    Game.recordSeen(enemy.speciesId);
    Game.battle = new window.Battle(Game.state.party, [enemy], { isWild: true });
    if (window.Sound) window.Sound.encounter();
    window.BattleScreen.open();
  };

  Game.startTrainerBattle = function (trainerId) {
    const trainer = Data.TRAINERS[trainerId];
    const team = trainer.team.map(function (pair) {
      return Data.createCreature(pair[0], pair[1]);
    });
    team.forEach(function (c) { Game.recordSeen(c.speciesId); });
    Game.pendingTrainer = trainerId;
    Game.battle = new window.Battle(Game.state.party, team, {
      isWild: false,
      isTrainer: true,
      trainerName: trainer.name,
      moneyOnWin: trainer.reward,
    });
    if (window.Sound) window.Sound.encounter();
    window.BattleScreen.open();
  };

  /* Called by the battle screen when the player acknowledges the end
     of a battle. If any party creature wants to learn a move it has no
     room for, the player resolves that first; then the result is handled. */
  Game.finishBattle = function () {
    const hasPending = Game.state.party.some(function (c) {
      return c.pendingMoves && c.pendingMoves.length > 0;
    });
    if (hasPending) {
      window.Menus.openLearnFlow(function () { Game._resolveBattleEnd(); });
    } else {
      Game._resolveBattleEnd();
    }
  };

  /* Handle the actual outcome of the battle (win / lose / caught / ran). */
  Game._resolveBattleEnd = function () {
    const battle = Game.battle;
    const result = battle.result;
    const trainerId = Game.pendingTrainer;
    Game.battle = null;
    Game.pendingTrainer = null;

    if (result === "win") {
      Game.state.money += battle.moneyReward;
      Game.state.stats.battlesWon++;

      /* Remember any trainer we just beat so they don't rematch. */
      if (trainerId && Game.state.flags.defeatedTrainers.indexOf(trainerId) === -1) {
        Game.state.flags.defeatedTrainers.push(trainerId);
      }

      /* Gym leaders are the milestone fights — special celebrations. */
      if (trainerId === "bramwen" && !Game.state.flags.gymDefeated) {
        Game.state.flags.gymDefeated = true;
        Game.save();
        Game.resumeOverworld();
        Game.showDialog([
          Data.TRAINERS.bramwen.winLine,
          "You received the Velora Badge!",
          "The guard north of town will now let you through. A new route awaits!",
        ]);
        return;
      }
      if (trainerId === "cole" && !Game.state.flags.gym2Defeated) {
        Game.state.flags.gym2Defeated = true;
        Game.save();
        Game.resumeOverworld();
        Game.showDialog([
          Data.TRAINERS.cole.winLine,
          "You received the Tide Badge!",
          "The trail north of Greendale Town is open — the Cobalt Cavern climbs to Frostvale!",
        ]);
        return;
      }
      if (trainerId === "frieda" && !Game.state.flags.gym3Defeated) {
        Game.state.flags.gym3Defeated = true;
        Game.save();
        Game.resumeOverworld();
        Game.showDialog([
          Data.TRAINERS.frieda.winLine,
          "You received the Glacier Badge!",
          "Three badges! You've journeyed from Velora Town to the frozen peaks. A true champion!",
        ]);
        return;
      }

      Game.save();
      Game.resumeOverworld();
      /* Other trainers get a quick victory line. */
      if (trainerId && Data.TRAINERS[trainerId]) {
        Game.showDialog([Data.TRAINERS[trainerId].winLine]);
      }
      return;
    }

    if (result === "caught") {
      Game.recordCaught(battle.caught.speciesId);
      const where = Game.addCreature(battle.caught);
      const name = Data.SPECIES[battle.caught.speciesId].name;
      Game.save();
      Game.resumeOverworld();
      Game.showDialog([
        name + " was added to your " + (where === "party" ? "party!" : "storage box."),
      ]);
      return;
    }

    if (result === "ran") {
      Game.resumeOverworld();
      return;
    }

    /* result === "lose" — black out, heal up, return to town. */
    const loseLines = ["Everything went dark..."];
    if (trainerId) loseLines.unshift(Data.TRAINERS[trainerId].loseLine);
    Game.resumeOverworld();
    Game.showDialog(loseLines, function () {
      Game.healParty();
      Game.state.map = "town";
      Game.state.x = 5;
      Game.state.y = 4;
      Game.state.facing = "down";
      Game.save();
      Game.updateHud();
      window.Overworld.render();
      Game.showDialog([
        "You hurried back to Velora Town.",
        "Your team was fully healed.",
      ]);
    });
  };

  window.Game = Game;
})();
