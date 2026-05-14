/* ===== overworld.js — the walk-around map =====
   Draws the current map as a grid of tiles, moves the player with the
   arrow keys (or WASD), and reacts to what the player steps on:
     - tall grass  -> a chance of a wild battle
     - door tiles  -> warp to another map
   The Space key "interacts" with whatever the player is facing (NPCs).

   Everything is on window.Overworld so game.js / main.js can call it. */

(function () {
  const Data = window.GameData;

  const Overworld = {

    /* When a trainer spots the player, this holds { map, x, y } of that
       trainer so render() can pop a "!" over them. Cleared once the
       resulting battle begins. */
    _alert: null,

    /* Draw the whole map from the current game state. */
    render: function () {
      const self = this;
      const state = window.Game.state;
      const map = Data.MAPS[state.map];
      const grid = document.getElementById("map-grid");

      grid.innerHTML = "";
      grid.style.gridTemplateColumns = "repeat(" + map.grid[0].length + ", var(--tile))";

      for (let y = 0; y < map.grid.length; y++) {
        for (let x = 0; x < map.grid[y].length; x++) {
          const tile = Data.TILES[map.grid[y][x]];

          const cell = document.createElement("div");
          cell.className = "tile";
          cell.style.background = tile.color;

          const npc = map.npcs[x + "," + y];
          if (npc) {
            cell.classList.add("tile-npc");
            cell.innerHTML = window.CharacterArt.npc(npc.kind, npc.trainer, npc.look);
          } else if (tile.decor) {
            cell.innerHTML = window.TileArt.decor(tile.decor);
          } else if (map.groundItems) {
            const gi = map.groundItems.find(function (g) { return g.x === x && g.y === y; });
            if (gi && state.flags.pickedItems.indexOf(state.map + ":" + x + "," + y) === -1) {
              cell.classList.add("tile-item");
              cell.innerHTML = window.TileArt.item();
            }
          }
          if (tile.door) cell.classList.add("tile-door");

          /* Draw the player on their current tile. */
          if (x === state.x && y === state.y) {
            const player = document.createElement("div");
            player.className = "person";
            player.innerHTML = window.CharacterArt.player(state.facing);
            cell.appendChild(player);
          }

          /* A "!" bubble over a trainer who just spotted the player. */
          if (self._alert && self._alert.map === state.map &&
              self._alert.x === x && self._alert.y === y) {
            const bang = document.createElement("div");
            bang.className = "npc-alert";
            bang.textContent = "!";
            cell.appendChild(bang);
          }

          grid.appendChild(cell);
        }
      }

      /* Keep the always-visible region strip in sync with the player. */
      if (window.Menus) window.Menus.renderOverworldMap();
    },

    /* Perform a control action: "up" | "down" | "left" | "right" | "interact".
       Shared by the keyboard and the on-screen touch buttons. */
    press: function (action) {
      const Game = window.Game;
      if (!Game.state) return;
      if (Game.dialogActive() || Game.topOverlay()) return;
      if (Game.currentScreen !== "overworld-screen") return;

      if (action === "interact") { this.interact(); return; }

      let dx = 0, dy = 0;
      if (action === "up") dy = -1;
      else if (action === "down") dy = 1;
      else if (action === "left") dx = -1;
      else if (action === "right") dx = 1;
      else return;
      this.tryMove(dx, dy, action);
    },

    /* Handle a key press while the overworld is the active screen. */
    handleKey: function (e) {
      const key = e.key;
      let action = null;
      if (key === "ArrowUp" || key === "w" || key === "W") action = "up";
      else if (key === "ArrowDown" || key === "s" || key === "S") action = "down";
      else if (key === "ArrowLeft" || key === "a" || key === "A") action = "left";
      else if (key === "ArrowRight" || key === "d" || key === "D") action = "right";
      else if (key === " " || key === "Enter") action = "interact";
      else return;
      e.preventDefault();
      this.press(action);
    },

    /* Try to move the player by (dx, dy). Updates facing even if the
       way is blocked (so you can turn to face a wall or an NPC). */
    tryMove: function (dx, dy, facing) {
      const Game = window.Game;
      const state = Game.state;
      const map = Data.MAPS[state.map];

      state.facing = facing;

      const nx = state.x + dx;
      const ny = state.y + dy;

      /* Stay inside the grid. */
      if (ny < 0 || ny >= map.grid.length || nx < 0 || nx >= map.grid[0].length) {
        this.render();
        return;
      }

      const tile = Data.TILES[map.grid[ny][nx]];
      if (!tile.walkable) {
        this.render(); // turned to face it, but didn't move
        return;
      }

      state.x = nx;
      state.y = ny;
      state.stats.steps++;
      this.render();

      /* Did a trainer just spot us? Their challenge takes priority. */
      if (this.checkTrainerSight()) return;

      /* Did we step onto an item lying on the ground? Pick it up. */
      this.tryPickUpItem(nx, ny);

      /* Did we step on a door? Warp — unless it's gated behind a flag. */
      const warp = map.warps.find(function (w) { return w.x === nx && w.y === ny; });
      if (warp) {
        if (warp.requires && !Game.state.flags[warp.requires]) {
          Game.showDialog([warp.requiredMessage || "The way is blocked for now."]);
          return;
        }
        Game.enterMap(warp.to, warp.toX, warp.toY);
        return;
      }

      /* Did we step in tall grass? Maybe a wild creature appears. */
      if (tile.grass && map.encounters && Math.random() < Data.ENCOUNTER_RATE) {
        Game.startWildEncounter();
        return;
      }

      Game.save(); // auto-save after every step
    },

    /* If an uncollected ground item sits at (x, y), add it to the bag,
       mark the spot collected so it never reappears, and announce it. */
    tryPickUpItem: function (x, y) {
      const Game = window.Game;
      const map = Data.MAPS[Game.state.map];
      if (!map.groundItems) return;

      const gi = map.groundItems.find(function (g) { return g.x === x && g.y === y; });
      if (!gi) return;

      const key = Game.state.map + ":" + x + "," + y;
      if (Game.state.flags.pickedItems.indexOf(key) !== -1) return;

      Game.state.flags.pickedItems.push(key);
      Game.state.items[gi.item] = (Game.state.items[gi.item] || 0) + 1;
      Game.save();
      this.render(); // redraw so the picked-up item disappears
      if (window.Sound) window.Sound.select();
      Game.showDialog(["You found a " + Data.ITEMS[gi.item].name + "!"]);
    },

    /* Has any not-yet-defeated trainer's line of sight reached the
       player's tile? Walls, trees and water break the line. */
    checkTrainerSight: function () {
      const Game = window.Game;
      const state = Game.state;
      const map = Data.MAPS[state.map];
      const STEP = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

      for (const key in map.npcs) {
        const npc = map.npcs[key];
        if (npc.kind !== "trainer" || !npc.sight) continue;
        if (Game.state.flags.defeatedTrainers.indexOf(npc.trainer) !== -1) continue;

        const parts = key.split(",");
        const tx = parseInt(parts[0], 10);
        const ty = parseInt(parts[1], 10);
        const d = STEP[npc.sight.dir];
        if (!d) continue;

        for (let step = 1; step <= npc.sight.range; step++) {
          const cx = tx + d[0] * step;
          const cy = ty + d[1] * step;
          if (cy < 0 || cy >= map.grid.length || cx < 0 || cx >= map.grid[0].length) break;
          if (!Data.TILES[map.grid[cy][cx]].walkable) break; // line of sight is blocked
          if (cx === state.x && cy === state.y) {
            this.triggerTrainerSight(tx, ty, npc);
            return true;
          }
        }
      }
      return false;
    },

    /* A trainer spotted the player: pop a "!" over them, then run the
       usual intro-dialog-then-battle flow. */
    triggerTrainerSight: function (tx, ty, npc) {
      const Game = window.Game;
      const self = this;
      this._alert = { map: Game.state.map, x: tx, y: ty };
      this.render();
      Game.showDialog([Data.TRAINERS[npc.trainer].intro], function () {
        self._alert = null;
        Game.startTrainerBattle(npc.trainer);
      });
    },

    /* Press Space/Enter to interact with whatever the player faces. */
    interact: function () {
      const Game = window.Game;
      const state = Game.state;
      const map = Data.MAPS[state.map];

      let fx = state.x, fy = state.y;
      if (state.facing === "up") fy--;
      else if (state.facing === "down") fy++;
      else if (state.facing === "left") fx--;
      else if (state.facing === "right") fx++;

      const npc = map.npcs[fx + "," + fy];
      if (!npc) return;

      if (npc.kind === "person") {
        Game.showDialog(npc.lines || ["..."]);

      } else if (npc.kind === "nurse") {
        Game.healParty();
        Game.save();
        if (window.Sound) window.Sound.heal();
        Game.showDialog([
          "Nurse: Welcome to the Healing Center!",
          "Your team has been fully healed.",
          "Nurse: Come back any time!",
        ]);

      } else if (npc.kind === "shopkeeper") {
        window.Menus.openShop();

      } else if (npc.kind === "gymleader") {
        const trainer = Data.TRAINERS[npc.trainer];
        if (state.flags[npc.flag]) {
          Game.showConfirm(
            [trainer.afterLine, "Challenge " + trainer.name + " again?"],
            function () { Game.startTrainerBattle(npc.trainer); }
          );
        } else {
          Game.showDialog([trainer.intro], function () {
            Game.startTrainerBattle(npc.trainer);
          });
        }

      } else if (npc.kind === "trainer") {
        const trainer = Data.TRAINERS[npc.trainer];
        if (state.flags.defeatedTrainers.indexOf(npc.trainer) !== -1) {
          Game.showConfirm(
            [trainer.afterLine, "Battle " + trainer.name + " again?"],
            function () { Game.startTrainerBattle(npc.trainer); }
          );
        } else {
          Game.showDialog([trainer.intro], function () {
            Game.startTrainerBattle(npc.trainer);
          });
        }
      }
    },
  };

  window.Overworld = Overworld;
})();
