/* ===== ui.js — battle screen + pop-up menus =====
   Two things live here:
     window.BattleScreen — draws the battle and its action menus
     window.Menus        — the pause-menu panels (party, bag, shop)
   Both share a few small helpers defined at the top of this file. */

(function () {
  const Data = window.GameData;
  const Game = window.Game;

  /* ---- shared helpers ---- */

  function el(id) { return document.getElementById(id); }

  /* Draw a creature's artwork into an element. */
  function spriteInto(element, speciesId) {
    window.CreatureArt.into(element, speciesId);
  }

  function hpColor(percent) {
    if (percent > 50) return "#4caf50";
    if (percent > 20) return "#e0c040";
    return "#e04040";
  }

  /* Short label for a status condition (e.g. "burn" -> "BRN"). */
  function statusLabel(status) {
    if (status === "burn") return "BRN";
    if (status === "poison") return "PSN";
    if (status === "paralysis") return "PAR";
    return "";
  }
  /* A small coloured status tag for use inside an innerHTML string. */
  function statusTag(status) {
    if (!status) return "";
    return " <span class='status-badge status-" + status + "'>" + statusLabel(status) + "</span>";
  }

  /* Use up one of an item; remove it from the bag when it hits zero. */
  function consumeItem(itemId) {
    Game.state.items[itemId]--;
    if (Game.state.items[itemId] <= 0) delete Game.state.items[itemId];
  }

  /* Make a plain button. */
  function button(label, className, onClick) {
    const b = document.createElement("button");
    b.className = "btn " + (className || "");
    b.innerHTML = label;
    if (onClick) b.addEventListener("click", onClick);
    return b;
  }

  /* A one-line summary row for a creature (name, level, HP bar). */
  function creatureRow(creature, extraNote) {
    const species = Data.SPECIES[creature.speciesId];
    const percent = (creature.currentHp / creature.maxHp) * 100;

    const row = document.createElement("div");
    row.className = "creature-row";
    if (creature.currentHp <= 0) row.classList.add("fainted");

    const swatch = document.createElement("div");
    swatch.className = "swatch";
    window.CreatureArt.into(swatch, creature.speciesId);
    row.appendChild(swatch);

    const info = document.createElement("div");
    info.className = "creature-row-info";
    info.innerHTML =
      "<div class='creature-row-name'>" + species.name +
      " <span class='lvl'>Lv" + creature.level + "</span>" +
      statusTag(creature.status) +
      (extraNote ? " <span class='note'>" + extraNote + "</span>" : "") + "</div>" +
      "<div class='hp-bar'><div class='hp-fill' style='width:" + percent +
      "%;background:" + hpColor(percent) + "'></div></div>" +
      "<div class='hp-text'>" + creature.currentHp + " / " + creature.maxHp + " HP</div>";
    row.appendChild(info);

    return row;
  }


  /* ---- region map data + builder (used by the menu panel AND the
     always-visible strip on the overworld) ---- */
  const REGION_PLACES = [
    { label: "Greendale Gym",   maps: ["gym2"],                             requires: "gymDefeated" },
    { label: "Greendale Town",  maps: ["town2", "healing_center2", "shop2"], requires: "gymDefeated" },
    { label: "Greendale Route", maps: ["route2"],                           requires: "gymDefeated" },
    { label: "Velora Town",     maps: ["town", "healing_center", "shop"],    requires: null },
    { label: "Velora Route",    maps: ["route1"],                           requires: null },
    { label: "Velora Gym",      maps: ["gym"],                              requires: null },
  ];

  function shortLabel(label) {
    return label.replace("Greendale ", "G·").replace("Velora ", "V·");
  }

  /* Render the region into `container`. compact = the small overworld strip. */
  function buildRegion(container, compact) {
    container.innerHTML = "";
    const currentMap = Game.state.map;

    REGION_PLACES.forEach(function (place, i) {
      const here = place.maps.indexOf(currentMap) !== -1;
      const locked = place.requires && !Game.state.flags[place.requires];

      const node = document.createElement("div");
      node.className = "region-node" + (compact ? " region-node-mini" : "");
      if (here) node.classList.add("region-here");
      if (locked) node.classList.add("region-locked");

      const name = document.createElement("span");
      name.className = "region-name";
      name.textContent = compact ? shortLabel(place.label)
                                 : place.label + (locked ? "  (locked)" : "");
      node.appendChild(name);

      if (here && !compact) {
        const tag = document.createElement("span");
        tag.className = "region-you";
        tag.textContent = "You are here";
        node.appendChild(tag);
      }
      container.appendChild(node);

      if (i < REGION_PLACES.length - 1) {
        const link = document.createElement("div");
        link.className = compact ? "region-link-mini" : "region-link";
        container.appendChild(link);
      }
    });
  }


  /* ============================================================
     BattleScreen — drawing the fight and its action menus
     ============================================================ */
  const BattleScreen = {
    mode: "main",      // main | fight | bag | bagtarget | party | forceswitch | over
    pendingItem: null, // item id chosen in the bag, waiting for a target
    _prevPlayerHp: 0,  // HP at the last render, used to flash on damage
    _prevEnemyHp: 0,

    open: function () {
      this.mode = "main";
      this.pendingItem = null;
      this._prevPlayerHp = Game.battle.active().currentHp;
      this._prevEnemyHp = Game.battle.enemy().currentHp;
      Game.showScreen("battle-screen");
      this.render();
    },

    render: function () {
      this.renderField();
      this.renderMenu();
      this.playFx();
    },

    /* Play any queued hit effects — a type-coloured burst over the
       struck creature's sprite — then clear the queue. */
    playFx: function () {
      const battle = Game.battle;
      if (!battle || !battle.fx || battle.fx.length === 0) return;
      const queued = battle.fx.slice();
      battle.fx.length = 0;

      queued.forEach(function (effect, i) {
        setTimeout(function () {
          const slot = el(effect.target + "-sprite");
          if (!slot) return;
          const burst = document.createElement("div");
          burst.className = "move-fx type-" + effect.type;
          slot.appendChild(burst);
          setTimeout(function () {
            if (burst.parentNode) burst.parentNode.removeChild(burst);
          }, 420);
        }, i * 140);
      });
    },

    /* Briefly shake a sprite if its creature just lost HP. */
    flashDamage: function (spriteId, previousHp, currentHp) {
      if (currentHp < previousHp) {
        const sprite = el(spriteId);
        sprite.classList.remove("shake");
        void sprite.offsetWidth; // forces the animation to restart
        sprite.classList.add("shake");
        setTimeout(function () { sprite.classList.remove("shake"); }, 320);
      }
    },

    /* Draw creatures, HP/XP bars and the message log. */
    renderField: function () {
      const battle = Game.battle;
      const player = battle.active();
      const enemy = battle.enemy();

      spriteInto(el("player-sprite"), player.speciesId);
      spriteInto(el("enemy-sprite"), enemy.speciesId);

      this.flashDamage("player-sprite", this._prevPlayerHp, player.currentHp);
      this.flashDamage("enemy-sprite", this._prevEnemyHp, enemy.currentHp);
      this._prevPlayerHp = player.currentHp;
      this._prevEnemyHp = enemy.currentHp;

      el("player-sprite").classList.toggle("fainted-sprite", player.currentHp <= 0);
      el("enemy-sprite").classList.toggle("fainted-sprite", enemy.currentHp <= 0);

      el("player-name").textContent = Data.SPECIES[player.speciesId].name;
      el("player-level").textContent = player.level;
      el("enemy-name").textContent = Data.SPECIES[enemy.speciesId].name;
      el("enemy-level").textContent = enemy.level;

      this.setStatusBadge("player", player.status);
      this.setStatusBadge("enemy", enemy.status);

      this.updateHpBar("player", player);
      this.updateHpBar("enemy", enemy);

      this.renderStages("player", battle.playerStages);
      this.renderStages("enemy", battle.enemyStages);

      const xpNeeded = Data.xpToNext(player.level);
      el("player-xp-fill").style.width = (player.xp / xpNeeded) * 100 + "%";
      el("player-xp-text").textContent = player.xp + " / " + xpNeeded;

      const log = el("battle-log");
      log.innerHTML = "";
      battle.log.forEach(function (line) {
        const p = document.createElement("p");
        p.textContent = line;
        log.appendChild(p);
      });
      log.scrollTop = log.scrollHeight;
    },

    updateHpBar: function (who, creature) {
      const percent = (creature.currentHp / creature.maxHp) * 100;
      const fill = el(who + "-hp-fill");
      fill.style.width = percent + "%";
      fill.style.background = hpColor(percent);
      el(who + "-hp-text").textContent = creature.currentHp + " / " + creature.maxHp + " HP";
    },

    /* Show or clear the small status badge next to a creature's name. */
    setStatusBadge: function (who, status) {
      const badge = el(who + "-status");
      if (status) {
        badge.textContent = statusLabel(status);
        badge.className = "status-badge status-" + status;
      } else {
        badge.textContent = "";
        badge.className = "status-badge";
      }
    },

    /* Show the active stat-stage changes (ATK/DEF/SPD up or down). */
    renderStages: function (who, stages) {
      const container = el(who + "-stages");
      container.innerHTML = "";
      [["atk", "ATK"], ["def", "DEF"], ["spd", "SPD"]].forEach(function (pair) {
        const value = stages[pair[0]];
        if (value === 0) return;
        const badge = document.createElement("span");
        badge.className = "stage-badge " + (value > 0 ? "stage-up" : "stage-down");
        badge.textContent = pair[1] + " " + (value > 0 ? "▲" : "▼") + Math.abs(value);
        container.appendChild(badge);
      });
    },

    /* Rebuild the action menu based on the current mode. */
    renderMenu: function () {
      const battle = Game.battle;
      const menu = el("battle-menu");
      menu.innerHTML = "";
      const self = this;

      /* --- Battle is over --- */
      if (battle.over) {
        menu.appendChild(button("Continue", "wide", function () {
          Game.finishBattle();
        }));
        return;
      }

      /* --- The player's creature fainted: must pick another --- */
      if (battle.needsSwitch) {
        const label = document.createElement("p");
        label.className = "menu-label";
        label.textContent = "Choose your next creature:";
        menu.appendChild(label);
        this.appendPartyList(menu, true);
        return;
      }

      /* --- Choosing a move --- */
      if (this.mode === "fight") {
        const active = battle.active();
        const moves = document.createElement("div");
        moves.className = "move-buttons";

        const anyPP = active.moves.some(function (m) {
          return (active.movePP[m] || 0) > 0;
        });

        if (!anyPP) {
          /* Every move is out of PP — only Struggle is available. */
          moves.appendChild(button(
            "Struggle<span class='move-type'>No moves left! &middot; Pow 35</span>",
            "move-btn type-Normal",
            function () { battle.playerAttack("Struggle"); self.afterAction("fight"); }
          ));
        } else {
          active.moves.forEach(function (moveName) {
            const move = Data.MOVES[moveName];
            const pp = active.movePP[moveName] || 0;
            const detail = move.type +
              (move.power > 0 ? " &middot; Pow " + move.power : " &middot; status") +
              " &middot; PP " + pp + "/" + move.pp;
            const btn = button(
              moveName + "<span class='move-type'>" + detail + "</span>",
              "move-btn type-" + move.type,
              function () { battle.playerAttack(moveName); self.afterAction("fight"); }
            );
            if (pp <= 0) btn.disabled = true;
            moves.appendChild(btn);
          });
        }

        menu.appendChild(moves);
        menu.appendChild(button("Back", "wide back-btn", function () {
          self.mode = "main"; self.render();
        }));
        return;
      }

      /* --- Choosing an item from the bag --- */
      if (this.mode === "bag") {
        this.appendBagList(menu);
        menu.appendChild(button("Back", "wide back-btn", function () {
          self.mode = "main"; self.render();
        }));
        return;
      }

      /* --- Picking who a heal/revive item applies to --- */
      if (this.mode === "bagtarget") {
        const label = document.createElement("p");
        label.className = "menu-label";
        label.textContent = "Use " + Data.ITEMS[this.pendingItem].name + " on:";
        menu.appendChild(label);
        this.appendPartyList(menu, false, function (index) {
          const result = battle.playerUseItem(self.pendingItem, index);
          if (result === "blocked") { self.render(); return; }
          consumeItem(self.pendingItem);
          self.pendingItem = null;
          self.afterAction();
        });
        menu.appendChild(button("Back", "wide back-btn", function () {
          self.pendingItem = null; self.mode = "bag"; self.render();
        }));
        return;
      }

      /* --- Choosing a creature to switch to (voluntary) --- */
      if (this.mode === "party") {
        this.appendPartyList(menu, false);
        menu.appendChild(button("Back", "wide back-btn", function () {
          self.mode = "main"; self.render();
        }));
        return;
      }

      /* --- The main action menu --- */
      const actions = document.createElement("div");
      actions.className = "action-grid";
      actions.appendChild(button("Fight", "", function () { self.mode = "fight"; self.render(); }));
      actions.appendChild(button("Bag", "", function () { self.mode = "bag"; self.render(); }));
      actions.appendChild(button("Party", "", function () { self.mode = "party"; self.render(); }));
      if (battle.isWild) {
        actions.appendChild(button("Run", "run-btn", function () {
          battle.playerRun(); self.afterAction();
        }));
      } else {
        const placeholder = button("Run", "run-btn", null);
        placeholder.disabled = true;
        actions.appendChild(placeholder);
      }
      menu.appendChild(actions);
    },

    /* List the player's party as buttons (for switching / item targets).
       forced = true means this is a forced switch after a faint. */
    appendPartyList: function (container, forced, onPick) {
      const battle = Game.battle;
      const self = this;

      battle.party.forEach(function (creature, index) {
        let note = "";
        if (index === battle.activeIndex) note = "active";
        else if (creature.currentHp <= 0) note = "fainted";

        const row = creatureRow(creature, note);
        const wrap = document.createElement("button");
        wrap.className = "btn row-btn";
        wrap.appendChild(row);

        /* Decide if this entry can be clicked. */
        let clickable = true;
        if (onPick) {
          /* Item target — any party member is a valid target. */
          clickable = true;
        } else {
          /* Switching — can't pick the active one or a fainted one. */
          if (index === battle.activeIndex || creature.currentHp <= 0) clickable = false;
        }

        if (clickable) {
          wrap.addEventListener("click", function () {
            if (onPick) {
              onPick(index);
            } else {
              battle.playerSwitch(index, forced);
              self.afterAction();
            }
          });
        } else {
          wrap.disabled = true;
        }

        container.appendChild(wrap);
      });
    },

    /* List the bag's items as buttons. */
    appendBagList: function (container) {
      const self = this;
      const battle = Game.battle;
      const ids = Object.keys(Game.state.items);

      if (ids.length === 0) {
        const empty = document.createElement("p");
        empty.className = "menu-label";
        empty.textContent = "Your bag is empty.";
        container.appendChild(empty);
        return;
      }

      ids.forEach(function (itemId) {
        const item = Data.ITEMS[itemId];
        const count = Game.state.items[itemId];
        const btn = button(
          item.name + " <span class='count'>x" + count + "</span>" +
          "<span class='move-type'>" + item.desc + "</span>",
          "row-btn",
          function () {
            if (item.kind === "ball") {
              const result = battle.playerUseItem(itemId);
              if (result === "blocked") { self.render(); return; }
              consumeItem(itemId);
              self.afterAction();
            } else {
              /* heal / revive — need to pick a target first */
              self.pendingItem = itemId;
              self.mode = "bagtarget";
              self.render();
            }
          }
        );
        container.appendChild(btn);
      });
    },

    /* After any action that may have run a turn: figure out the next mode.
       `nextMode` is where to return if the battle continues normally —
       e.g. attacking returns to "fight" so the move list stays open. */
    afterAction: function (nextMode) {
      const battle = Game.battle;
      if (battle.over) this.mode = "over";
      else if (battle.needsSwitch) this.mode = "forceswitch";
      else this.mode = nextMode || "main";
      this.render();
    },
  };


  /* ============================================================
     Menus — the pause-menu panels (party / bag / shop)
     ============================================================ */
  const Menus = {

    /* ---- Party & storage manager ----
       Move creatures between the party (max 6) and the storage box,
       and reorder the party to choose which creature leads. */
    openParty: function () {
      this.renderPartyManager();
      Game.openOverlay("party-panel");
    },

    renderPartyManager: function () {
      const panel = el("party-list");
      panel.innerHTML = "";
      const self = this;
      const party = Game.state.party;
      const storage = Game.state.storage;

      /* Build one card: the creature row plus its action buttons. */
      function card(creature, actionButtons) {
        const row = creatureRow(creature);
        const moves = document.createElement("div");
        moves.className = "row-moves";
        moves.textContent = "Moves: " + creature.moves.join(", ");
        row.querySelector(".creature-row-info").appendChild(moves);

        const actions = document.createElement("div");
        actions.className = "row-actions";
        actionButtons.forEach(function (btn) { actions.appendChild(btn); });

        const wrap = document.createElement("div");
        wrap.className = "manage-row";
        wrap.appendChild(row);
        wrap.appendChild(actions);
        return wrap;
      }

      function refresh() { self.renderPartyManager(); Game.save(); }

      /* --- Party section --- */
      const partyHead = document.createElement("p");
      partyHead.className = "menu-label";
      partyHead.textContent = "Party (" + party.length + " / 6)";
      panel.appendChild(partyHead);

      party.forEach(function (creature, index) {
        const view = button("View", "mini-btn", function () {
          self.openCreatureDetail(creature);
        });

        const up = button("&#9650;", "mini-btn", function () {
          const tmp = party[index - 1]; party[index - 1] = party[index]; party[index] = tmp;
          refresh();
        });
        if (index === 0) up.disabled = true;

        const down = button("&#9660;", "mini-btn", function () {
          const tmp = party[index + 1]; party[index + 1] = party[index]; party[index] = tmp;
          refresh();
        });
        if (index === party.length - 1) down.disabled = true;

        const toBox = button("To Box", "mini-btn", function () {
          storage.push(party.splice(index, 1)[0]);
          refresh();
        });
        if (party.length <= 1) toBox.disabled = true; // never empty the party

        panel.appendChild(card(creature, [view, up, down, toBox]));
      });

      /* --- Storage section --- */
      const storageHead = document.createElement("p");
      storageHead.className = "menu-label";
      storageHead.textContent = "Storage Box (" + storage.length + ")";
      panel.appendChild(storageHead);

      if (storage.length === 0) {
        const note = document.createElement("p");
        note.className = "dex-note storage-empty";
        note.textContent = "Empty. Creatures caught while your party is full are kept here.";
        panel.appendChild(note);
      } else {
        storage.forEach(function (creature, index) {
          const view = button("View", "mini-btn", function () {
            self.openCreatureDetail(creature);
          });
          const toParty = button("To Party", "mini-btn", function () {
            party.push(storage.splice(index, 1)[0]);
            refresh();
          });
          if (party.length >= 6) toParty.disabled = true;
          panel.appendChild(card(creature, [view, toParty]));
        });
      }
    },

    /* ---- Creature detail: full stats, XP progress and move list ---- */
    openCreatureDetail: function (creature) {
      this.renderCreatureDetail(creature);
      Game.openOverlay("creature-panel");
    },

    renderCreatureDetail: function (creature) {
      const species = Data.SPECIES[creature.speciesId];
      const content = el("creature-content");
      content.innerHTML = "";

      const sprite = document.createElement("div");
      sprite.className = "sprite creature-detail-sprite";
      window.CreatureArt.into(sprite, creature.speciesId);
      content.appendChild(sprite);

      const header = document.createElement("div");
      header.className = "creature-detail-header";
      header.innerHTML =
        "<div class='creature-detail-name'>" + species.name +
        " <span class='lvl'>Lv" + creature.level + "</span>" +
        statusTag(creature.status) + "</div>" +
        "<div class='creature-detail-types'>" + species.types.join(" / ") + "</div>";
      content.appendChild(header);

      const hpPercent = (creature.currentHp / creature.maxHp) * 100;
      const xpNeeded = Data.xpToNext(creature.level);
      const stats = document.createElement("div");
      stats.className = "creature-detail-stats";
      stats.innerHTML =
        "<div class='stat-line'><span>HP</span>" +
        "<div class='hp-bar'><div class='hp-fill' style='width:" + hpPercent +
        "%;background:" + hpColor(hpPercent) + "'></div></div>" +
        "<span class='stat-val'>" + creature.currentHp + " / " + creature.maxHp + "</span></div>" +
        "<div class='stat-line'><span>ATK</span><span class='stat-val wide-val'>" + creature.atk + "</span></div>" +
        "<div class='stat-line'><span>DEF</span><span class='stat-val wide-val'>" + creature.def + "</span></div>" +
        "<div class='stat-line'><span>SPD</span><span class='stat-val wide-val'>" + creature.spd + "</span></div>" +
        "<div class='stat-line'><span>XP</span>" +
        "<div class='xp-bar'><div class='xp-fill' style='width:" +
        ((creature.xp / xpNeeded) * 100) + "%'></div></div>" +
        "<span class='stat-val'>" + creature.xp + " / " + xpNeeded + "</span></div>";
      content.appendChild(stats);

      const movesHead = document.createElement("p");
      movesHead.className = "menu-label";
      movesHead.textContent = "Moves";
      content.appendChild(movesHead);

      creature.moves.forEach(function (moveName) {
        const move = Data.MOVES[moveName];
        const pp = (creature.movePP && creature.movePP[moveName] !== undefined)
          ? creature.movePP[moveName] : move.pp;
        const row = document.createElement("div");
        row.className = "move-row type-" + move.type;
        row.innerHTML =
          "<strong>" + moveName + "</strong>" +
          "<span class='move-detail'>" + move.type +
          (move.power > 0 ? " &middot; Pow " + move.power : " &middot; status") +
          " &middot; PP " + pp + " / " + move.pp + "</span>";
        content.appendChild(row);
      });
    },

    /* ---- Bag panel: view items, and use heal/revive items ---- */
    openBag: function () {
      this._bagTargetItem = null;
      this.renderBag();
      Game.openOverlay("bag-panel");
    },

    renderBag: function () {
      const panel = el("bag-list");
      panel.innerHTML = "";
      const self = this;
      const ids = Object.keys(Game.state.items);

      /* If an item was chosen, show party members to use it on. */
      if (this._bagTargetItem) {
        const item = Data.ITEMS[this._bagTargetItem];
        const label = document.createElement("p");
        label.className = "menu-label";
        label.textContent = "Use " + item.name + " on:";
        panel.appendChild(label);

        Game.state.party.forEach(function (creature, index) {
          const row = creatureRow(creature, creature.currentHp <= 0 ? "fainted" : "");
          const wrap = document.createElement("button");
          wrap.className = "btn row-btn";
          wrap.appendChild(row);
          wrap.addEventListener("click", function () {
            const ok = self.applyItem(self._bagTargetItem, index);
            if (ok) self._bagTargetItem = null;
            self.renderBag();
            Game.save();
          });
          panel.appendChild(wrap);
        });

        panel.appendChild(button("Back", "wide back-btn", function () {
          self._bagTargetItem = null;
          self.renderBag();
        }));
        return;
      }

      if (ids.length === 0) {
        const empty = document.createElement("p");
        empty.className = "menu-label";
        empty.textContent = "Your bag is empty.";
        panel.appendChild(empty);
        return;
      }

      ids.forEach(function (itemId) {
        const item = Data.ITEMS[itemId];
        const count = Game.state.items[itemId];
        const btn = button(
          item.name + " <span class='count'>x" + count + "</span>" +
          "<span class='move-type'>" + item.desc + "</span>",
          "row-btn",
          null
        );
        if (item.kind === "ball") {
          /* Balls only do something inside a battle. */
          btn.disabled = true;
          btn.querySelector(".move-type").textContent = item.desc + " (use in battle)";
        } else {
          btn.addEventListener("click", function () {
            self._bagTargetItem = itemId;
            self.renderBag();
          });
        }
        panel.appendChild(btn);
      });
    },

    /* Apply a heal/revive item to a party member outside of battle.
       Returns true if it was actually used. */
    applyItem: function (itemId, creatureIndex) {
      const item = Data.ITEMS[itemId];
      const creature = Game.state.party[creatureIndex];

      if (item.kind === "heal") {
        if (creature.currentHp <= 0 || creature.currentHp >= creature.maxHp) return false;
        creature.currentHp = Math.min(creature.maxHp, creature.currentHp + item.healAmount);
        consumeItem(itemId);
        return true;
      }
      if (item.kind === "cure") {
        if (!creature.status) return false;
        creature.status = null;
        consumeItem(itemId);
        return true;
      }
      if (item.kind === "ether") {
        let restored = false;
        creature.moves.forEach(function (m) {
          const max = Data.MOVES[m].pp;
          if ((creature.movePP[m] || 0) < max) { creature.movePP[m] = max; restored = true; }
        });
        if (!restored) return false;
        consumeItem(itemId);
        return true;
      }
      if (item.kind === "revive") {
        if (creature.currentHp > 0) return false;
        creature.currentHp = Math.floor(creature.maxHp / 2);
        creature.status = null;
        consumeItem(itemId);
        return true;
      }
      return false;
    },

    /* ---- Shop panel: buy items ---- */
    openShop: function () {
      this.renderShop();
      Game.openOverlay("shop-panel");
    },

    renderShop: function () {
      el("shop-money").textContent = Game.state.money + " coins";
      const list = el("shop-list");
      list.innerHTML = "";
      const self = this;

      Data.SHOP_STOCK.forEach(function (itemId) {
        const item = Data.ITEMS[itemId];

        const row = document.createElement("div");
        row.className = "shop-row";
        row.innerHTML =
          "<div class='shop-info'><strong>" + item.name + "</strong>" +
          "<span class='move-type'>" + item.desc + "</span></div>" +
          "<div class='shop-price'>" + item.price + "</div>";

        const buy = button("Buy", "buy-btn", function () {
          if (Game.state.money < item.price) {
            Game.showDialog(["You don't have enough coins for that."]);
            return;
          }
          Game.state.money -= item.price;
          Game.state.items[itemId] = (Game.state.items[itemId] || 0) + 1;
          Game.save();
          Game.updateHud();
          self.renderShop();
        });
        row.appendChild(buy);
        list.appendChild(row);
      });
    },

    /* ---- Dex panel: which species you've seen and caught ---- */
    openDex: function () {
      const dex = Game.state.dex;
      el("dex-caught").textContent = dex.caught.length;
      el("dex-seen").textContent = dex.seen.length;
      el("dex-total").textContent = Object.keys(Data.SPECIES).length;

      const list = el("dex-list");
      list.innerHTML = "";

      Object.keys(Data.SPECIES).forEach(function (speciesId) {
        const species = Data.SPECIES[speciesId];
        const caught = dex.caught.indexOf(speciesId) !== -1;
        const seen = dex.seen.indexOf(speciesId) !== -1;

        const row = document.createElement("div");
        row.className = "dex-row";

        const swatch = document.createElement("div");
        swatch.className = "swatch";

        const info = document.createElement("div");
        info.className = "dex-info";

        if (caught) {
          window.CreatureArt.into(swatch, speciesId);
          info.innerHTML = "<strong>" + species.name + "</strong>" +
            "<span class='dex-note'>" + species.types.join(" / ") + " &middot; caught</span>";
        } else if (seen) {
          window.CreatureArt.into(swatch, speciesId);
          swatch.classList.add("silhouette");
          info.innerHTML = "<strong>" + species.name + "</strong>" +
            "<span class='dex-note'>seen &mdash; not yet caught</span>";
        } else {
          swatch.classList.add("swatch-unknown");
          swatch.textContent = "?";
          info.innerHTML = "<strong>???</strong>" +
            "<span class='dex-note'>not yet discovered</span>";
          row.classList.add("dex-unknown");
        }

        row.appendChild(swatch);
        row.appendChild(info);
        list.appendChild(row);
      });

      Game.openOverlay("dex-panel");
    },

    /* ---- Region map: the full panel from the pause menu ---- */
    openMap: function () {
      buildRegion(el("region-map"), false);
      Game.openOverlay("map-panel");
    },

    /* ---- Region map: the always-visible strip on the overworld ---- */
    renderOverworldMap: function () {
      const strip = document.getElementById("overworld-mini-map");
      if (strip) buildRegion(strip, true);
    },

    /* ---- Trainer card: a summary of the player's adventure ---- */
    openCard: function () {
      const s = Game.state;
      const stats = s.stats;
      const badges = (s.flags.gymDefeated ? 1 : 0) + (s.flags.gym2Defeated ? 1 : 0);
      const totalSpecies = Object.keys(Data.SPECIES).length;

      const sec = stats.playSeconds || 0;
      const playtime = Math.floor(sec / 3600) + "h " + (Math.floor(sec / 60) % 60) + "m";

      function row(label, value) {
        return "<div class='card-row'><span>" + label + "</span><span>" + value + "</span></div>";
      }

      el("card-content").innerHTML =
        row("Badges", badges + " / 2") +
        row("Coins", s.money) +
        row("Dex caught", s.dex.caught.length + " / " + totalSpecies) +
        row("Party", s.party.length + " / 6") +
        row("Steps taken", stats.steps || 0) +
        row("Battles won", stats.battlesWon || 0) +
        row("Playtime", playtime);

      Game.openOverlay("card-panel");
    },

    /* ---- Type chart: a reference grid of the damage multipliers ---- */
    openTypes: function () {
      const ABBREV = { Normal: "Nrm", Ember: "Emb", Aqua: "Aqa", Leaf: "Lef", Spark: "Spk" };
      const types = Data.TYPES;
      const grid = el("types-grid");
      grid.innerHTML = "";

      function headCell(type) {
        const c = document.createElement("div");
        c.className = "type-cell type-head type-" + type;
        c.textContent = ABBREV[type] || type;
        return c;
      }

      /* Top-left corner, then the defending-type header row. */
      const corner = document.createElement("div");
      corner.className = "type-cell type-corner";
      corner.textContent = "ATK \\ DEF";
      grid.appendChild(corner);
      types.forEach(function (def) { grid.appendChild(headCell(def)); });

      /* One row per attacking type. */
      types.forEach(function (atk) {
        grid.appendChild(headCell(atk));
        types.forEach(function (def) {
          const mult = Data.TYPE_CHART[atk][def];
          const cell = document.createElement("div");
          cell.className = "type-cell type-mult";
          if (mult > 1) { cell.classList.add("type-strong"); cell.textContent = "2×"; }
          else if (mult < 1) { cell.classList.add("type-weak"); cell.textContent = "½×"; }
          else { cell.textContent = "1×"; }
          grid.appendChild(cell);
        });
      });

      Game.openOverlay("types-panel");
    },

    /* ---- Learn-a-move flow ----
       After a battle, any party creature that wants to learn a move it
       has no room for is resolved here, one move at a time. */
    openLearnFlow: function (onDone) {
      const self = this;
      this._learnQueue = [];
      Game.state.party.forEach(function (creature) {
        (creature.pendingMoves || []).forEach(function (moveName) {
          self._learnQueue.push({ creature: creature, move: moveName });
        });
      });
      this._learnOnDone = onDone;
      this._nextLearn();
    },

    _nextLearn: function () {
      if (this._learnQueue.length === 0) {
        Game.closeOverlay("learn-panel");
        const done = this._learnOnDone;
        this._learnOnDone = null;
        if (done) done();
        return;
      }
      this._renderLearn(this._learnQueue[0]);
      Game.openOverlay("learn-panel");
    },

    _renderLearn: function (entry) {
      const self = this;
      const creature = entry.creature;
      const newMove = entry.move;
      const species = Data.SPECIES[creature.speciesId];
      const content = el("learn-content");
      content.innerHTML = "";

      function moveBlurb(name) {
        const m = Data.MOVES[name];
        return m.type + (m.power > 0 ? " &middot; Pow " + m.power : " &middot; status");
      }

      const intro = document.createElement("p");
      intro.className = "menu-label";
      intro.textContent = species.name + " wants to learn " + newMove + "!";
      content.appendChild(intro);

      const newCard = document.createElement("div");
      newCard.className = "learn-newmove type-" + Data.MOVES[newMove].type;
      newCard.innerHTML = "<strong>" + newMove + "</strong><span class='move-type'>" +
        moveBlurb(newMove) + "</span>";
      content.appendChild(newCard);

      const prompt = document.createElement("p");
      prompt.className = "dex-note";
      prompt.textContent = "Choose a move to forget — or skip:";
      content.appendChild(prompt);

      creature.moves.forEach(function (mv, idx) {
        content.appendChild(button(
          "Forget " + mv + "<span class='move-type'>" + moveBlurb(mv) + "</span>",
          "wide row-btn",
          function () {
            const oldMove = creature.moves[idx];
            creature.moves[idx] = newMove;
            if (creature.movePP) {
              delete creature.movePP[oldMove];
              creature.movePP[newMove] = Data.MOVES[newMove].pp;
            }
            self._finishLearnEntry(entry);
          }
        ));
      });

      content.appendChild(button("Don't learn " + newMove, "wide back-btn", function () {
        self._finishLearnEntry(entry);
      }));
    },

    _finishLearnEntry: function (entry) {
      const pending = entry.creature.pendingMoves;
      const i = pending.indexOf(entry.move);
      if (i !== -1) pending.splice(i, 1);
      this._learnQueue.shift();
      Game.save();
      this._nextLearn();
    },
  };


  window.BattleScreen = BattleScreen;
  window.Menus = Menus;
})();
