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

    /* Draw the whole map from the current game state. */
    render: function () {
      const state = window.Game.state;
      const map = Data.MAPS[state.map];
      const grid = document.getElementById("map-grid");

      grid.innerHTML = "";
      grid.style.gridTemplateColumns = "repeat(" + map.grid[0].length + ", 40px)";

      for (let y = 0; y < map.grid.length; y++) {
        for (let x = 0; x < map.grid[y].length; x++) {
          const tile = Data.TILES[map.grid[y][x]];

          const cell = document.createElement("div");
          cell.className = "tile";
          cell.style.background = tile.color;

          const npc = map.npcs[x + "," + y];
          if (npc) {
            cell.classList.add("tile-npc");
            cell.innerHTML = window.CharacterArt.npc(npc.kind, npc.trainer);
          } else if (tile.decor) {
            cell.innerHTML = window.TileArt.decor(tile.decor);
          }
          if (tile.door) cell.classList.add("tile-door");

          /* Draw the player on their current tile. */
          if (x === state.x && y === state.y) {
            const player = document.createElement("div");
            player.className = "person";
            player.innerHTML = window.CharacterArt.player(state.facing);
            cell.appendChild(player);
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
      this.render();

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

      if (npc.kind === "nurse") {
        Game.healParty();
        Game.save();
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
