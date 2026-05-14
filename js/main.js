/* ===== main.js — startup and global wiring =====
   This file builds the title and starter screens, wires up the
   pause menu and pop-up panels, routes keyboard input to whichever
   part of the game is active, and kicks everything off. */

(function () {
  const Data = window.GameData;
  const Game = window.Game;

  function el(id) { return document.getElementById(id); }

  /* A creature sprite box (used on the starter-choice cards). */
  function makeSprite(speciesId) {
    const div = document.createElement("div");
    div.className = "sprite";
    window.CreatureArt.into(div, speciesId);
    return div;
  }

  /* Wire an on-screen control button (D-pad / interact).
     Touch is handled on touchend with preventDefault(): this fires the
     action AND stops iOS Safari from treating a quick second tap as a
     double-tap-to-zoom gesture, which `touch-action: manipulation`
     does not reliably suppress on Safari. preventDefault also cancels
     the compatibility click, so the click handler (for mouse/desktop)
     never double-fires on touch devices. */
  function wireControl(btn, action) {
    btn.addEventListener("touchend", function (e) {
      e.preventDefault();
      window.Overworld.press(action);
    }, { passive: false });
    btn.addEventListener("click", function () {
      window.Overworld.press(action);
    });
  }


  /* ===== Title screen ===== */
  function buildTitleScreen() {
    const container = el("title-buttons");
    container.innerHTML = "";

    const newBtn = document.createElement("button");
    newBtn.className = "btn wide";
    newBtn.textContent = "New Game";
    newBtn.addEventListener("click", function () {
      if (Game.hasSave()) {
        const ok = window.confirm("Starting a new game will overwrite your saved progress. Continue?");
        if (!ok) return;
      }
      Game.showScreen("starter-screen");
    });
    container.appendChild(newBtn);

    if (Game.hasSave()) {
      const continueBtn = document.createElement("button");
      continueBtn.className = "btn wide";
      continueBtn.textContent = "Continue";
      continueBtn.addEventListener("click", function () {
        if (Game.load()) {
          Game.resumeOverworld();
        } else {
          window.alert("Sorry — your saved game could not be loaded.");
        }
      });
      container.appendChild(continueBtn);
    }
  }


  /* ===== Starter selection screen ===== */
  function buildStarterScreen() {
    const container = el("starter-choices");
    container.innerHTML = "";

    Data.STARTER_IDS.forEach(function (speciesId) {
      const species = Data.SPECIES[speciesId];

      const card = document.createElement("div");
      card.className = "starter-card";
      card.appendChild(makeSprite(speciesId));

      const name = document.createElement("div");
      name.innerHTML = "<strong>" + species.name + "</strong>";
      card.appendChild(name);

      const type = document.createElement("div");
      type.className = "starter-types";
      type.textContent = "Type: " + species.types.join(" / ");
      card.appendChild(type);

      card.addEventListener("click", function () {
        Game.newGame(speciesId);
      });

      container.appendChild(card);
    });
  }


  /* ===== Pause menu and pop-up panels ===== */
  function wireMenus() {
    /* Pause menu buttons */
    el("menu-party").addEventListener("click", function () { window.Menus.openParty(); });
    el("menu-bag").addEventListener("click", function () { window.Menus.openBag(); });
    el("menu-dex").addEventListener("click", function () { window.Menus.openDex(); });
    el("menu-map").addEventListener("click", function () { window.Menus.openMap(); });
    el("menu-types").addEventListener("click", function () { window.Menus.openTypes(); });
    el("menu-sound").addEventListener("click", function () {
      window.Sound.setMuted(!window.Sound.isMuted());
      window.GameStorage.setItem("velora_muted", window.Sound.isMuted() ? "1" : "0");
      updateSoundLabel();
      if (!window.Sound.isMuted()) window.Sound.select();
    });
    el("menu-save").addEventListener("click", function () {
      const ok = Game.save();
      Game.showDialog([ok ? "Game saved." : "Could not save (your browser may be blocking storage)."]);
    });
    el("menu-close").addEventListener("click", function () {
      Game.closeOverlay("menu-overlay");
    });

    /* Close buttons on each panel */
    el("party-close").addEventListener("click", function () { Game.closeOverlay("party-panel"); });
    el("creature-close").addEventListener("click", function () { Game.closeOverlay("creature-panel"); });
    el("bag-close").addEventListener("click", function () { Game.closeOverlay("bag-panel"); });
    el("dex-close").addEventListener("click", function () { Game.closeOverlay("dex-panel"); });
    el("map-close").addEventListener("click", function () { Game.closeOverlay("map-panel"); });
    el("types-close").addEventListener("click", function () { Game.closeOverlay("types-panel"); });
    el("shop-close").addEventListener("click", function () { Game.closeOverlay("shop-panel"); });

    /* Clicking the dialog box advances the text */
    el("dialog-box").addEventListener("click", function () {
      Game.advanceDialog();
    });

    /* Yes / No buttons for choice dialogs */
    el("dialog-yes").addEventListener("click", function (e) {
      e.stopPropagation();
      Game.resolveChoice(true);
    });
    el("dialog-no").addEventListener("click", function (e) {
      e.stopPropagation();
      Game.resolveChoice(false);
    });

    /* The on-screen "Menu" button in the overworld HUD */
    el("hud-menu-btn").addEventListener("click", openPauseMenu);

    /* On-screen touch controls — the D-pad and interact button */
    document.querySelectorAll(".dpad-btn").forEach(function (btn) {
      wireControl(btn, btn.getAttribute("data-dir"));
    });
    wireControl(el("touch-interact"), "interact");
  }

  function openPauseMenu() {
    Game.openOverlay("menu-overlay");
  }

  /* Keep the pause-menu sound button's label in sync with the setting. */
  function updateSoundLabel() {
    el("menu-sound").textContent = "Sound: " + (window.Sound.isMuted() ? "Off" : "On");
  }

  /* Browsers keep audio suspended until the player interacts; resume it
     on the very first key, tap or click, then stop listening. */
  function unlockAudioOnce() {
    window.Sound.unlock();
    document.removeEventListener("keydown", unlockAudioOnce);
    document.removeEventListener("pointerdown", unlockAudioOnce);
  }


  /* ===== Global keyboard routing =====
     Sends each key press to whatever part of the game is active. */
  function routeKey(e) {
    /* Dialog text has top priority. */
    if (Game.dialogActive()) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        Game.advanceDialog();
      }
      return;
    }

    /* If a pop-up panel is open, Escape closes it — except the
       learn-a-move panel, which requires the player to make a choice. */
    const top = Game.topOverlay();
    if (top) {
      if (e.key === "Escape" && top !== "learn-panel") {
        e.preventDefault();
        Game.closeOverlay(top);
      }
      return;
    }

    /* Otherwise, the overworld handles movement and the menu key. */
    if (Game.currentScreen === "overworld-screen") {
      if (e.key === "m" || e.key === "M" || e.key === "Escape") {
        e.preventDefault();
        openPauseMenu();
        return;
      }
      window.Overworld.handleKey(e);
    }
  }


  /* ===== Start everything =====
     Hydrate saved data first (async on a native shell), then build the
     screens — the title screen needs to know whether a save exists. */
  function init() {
    window.GameStorage.init().then(function () {
      window.Sound.setMuted(window.GameStorage.getItem("velora_muted") === "1");
      buildTitleScreen();
      buildStarterScreen();
      wireMenus();
      updateSoundLabel();
      document.addEventListener("keydown", routeKey);
      document.addEventListener("keydown", unlockAudioOnce);
      document.addEventListener("pointerdown", unlockAudioOnce);
      Game.showScreen("title-screen");
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
