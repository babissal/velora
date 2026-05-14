/* ===== battle.js — the turn-based battle system =====
   A Battle object holds one fight. Both sides can have a party of
   creatures; when the active creature faints, the next is sent out.

   Status conditions ("burn", "poison", "paralysis") live on each
   creature and persist after battle until cured.

   Stat stages (attack / defense / speed, from -3 to +3) are temporary
   in-battle modifiers. They are tracked per side and reset whenever a
   fresh creature is sent out.

   The UI drives the battle by calling:
     battle.playerAttack(moveName)
     battle.playerSwitch(index, forced)
     battle.playerUseItem(itemId, targetIndex)
     battle.playerRun()
   After each call the UI re-reads the battle state and redraws. */

(function () {
  const Data = window.GameData;

  /* A stat stage of 0 is normal; positive boosts, negative weakens. */
  function stageMultiplier(stage) {
    if (stage >= 0) return (2 + stage) / 2;   // +1 = 1.5x, +2 = 2x, +3 = 2.5x
    return 2 / (2 - stage);                   // -1 = 0.67x, -2 = 0.5x, -3 = 0.4x
  }
  function statDisplayName(stat) {
    if (stat === "atk") return "Attack";
    if (stat === "def") return "Defense";
    if (stat === "spd") return "Speed";
    return stat;
  }

  /* ---- Damage maths (a simplified classic RPG formula) ----
     atkStages / defStages are the stat-stage objects for the two sides. */
  function calculateDamage(attacker, defender, move, atkStages, defStages) {
    const moveData = Data.MOVES[move];
    const defenderTypes = Data.SPECIES[defender.speciesId].types;
    const effectiveness = Data.typeEffectiveness(moveData.type, defenderTypes);

    const atk = attacker.atk * stageMultiplier(atkStages.atk);
    const def = defender.def * stageMultiplier(defStages.def);

    const base =
      Math.floor(((2 * attacker.level / 5 + 2) * moveData.power * atk / def) / 50) + 2;

    const randomFactor = 0.85 + Math.random() * 0.15;
    let damage = Math.floor(base * effectiveness * randomFactor);

    /* A burned creature deals less damage. */
    if (attacker.status === "burn") damage = Math.floor(damage * 0.5);

    if (damage < 1) damage = 1;
    return { damage: damage, effectiveness: effectiveness };
  }

  /* The enemy picks a random move that still has PP; if none do, Struggle. */
  function chooseEnemyMove(enemy) {
    const usable = enemy.moves.filter(function (m) {
      return !enemy.movePP || enemy.movePP[m] > 0;
    });
    if (usable.length === 0) return "Struggle";
    return usable[Math.floor(Math.random() * usable.length)];
  }

  /* Effective Speed: base spd, modified by stat stage, halved by paralysis. */
  function effectiveSpeed(creature, stages) {
    let spd = creature.spd * stageMultiplier(stages.spd);
    if (creature.status === "paralysis") spd = spd / 2;
    return spd;
  }

  /* Phrases for status messages. */
  function statusVerb(status) {
    if (status === "burn") return "was burned";
    if (status === "poison") return "was poisoned";
    if (status === "paralysis") return "was paralyzed";
    return "was afflicted";
  }
  function statusAdjective(status) {
    if (status === "burn") return "burned";
    if (status === "poison") return "poisoned";
    if (status === "paralysis") return "paralyzed";
    return "afflicted";
  }

  /* Chance to catch a wild creature: lower HP / lower level / better orb = easier. */
  function catchChance(enemy, orbBonus) {
    const hpFactor = 1 - (enemy.currentHp / enemy.maxHp) * 0.7; // 0.3 (full) .. 1.0 (near 0)
    let levelFactor = 1 - enemy.level * 0.025;
    if (levelFactor < 0.3) levelFactor = 0.3;

    const statusBonus = enemy.status ? 1.2 : 1;

    let chance = 0.5 * hpFactor * levelFactor * orbBonus * statusBonus;
    if (chance < 0.04) chance = 0.04;
    if (chance > 0.95) chance = 0.95;
    return chance;
  }

  function freshStages() { return { atk: 0, def: 0, spd: 0 }; }


  /* ===== The Battle object =====
     playerParty / enemyParty are arrays of creature instances.
     opts: { isWild, isTrainer, trainerName, moneyOnWin } */
  function Battle(playerParty, enemyParty, opts) {
    opts = opts || {};
    this.party = playerParty;
    this.enemyParty = enemyParty;
    this.enemyIndex = 0;

    this.isWild = opts.isWild !== false;       // wild unless told otherwise
    this.isTrainer = !!opts.isTrainer;
    this.trainerName = opts.trainerName || null;
    this.moneyOnWin = opts.moneyOnWin || 0;

    this.log = [];
    this.over = false;
    this.result = null;        // "win" | "lose" | "ran" | "caught"
    this.needsSwitch = false;  // active creature fainted, party still has fighters
    this.caught = null;        // the creature, if one was caught
    this.moneyReward = 0;

    /* Temporary stat stages for each side; reset when a creature is sent out. */
    this.playerStages = freshStages();
    this.enemyStages = freshStages();

    this.activeIndex = this.firstUsableIndex();

    const enemyName = Data.SPECIES[this.enemy().speciesId].name;
    if (this.isWild) {
      this.addLog("A wild " + enemyName + " (Lv" + this.enemy().level + ") appeared!");
    } else {
      this.addLog((this.trainerName || "An opponent") + " wants to battle!");
      this.addLog((this.trainerName || "Opponent") + " sent out " + enemyName + "!");
    }
  }

  Battle.prototype.addLog = function (m) { this.log.push(m); };
  Battle.prototype.active = function () { return this.party[this.activeIndex]; };
  Battle.prototype.enemy = function () { return this.enemyParty[this.enemyIndex]; };

  Battle.prototype.firstUsableIndex = function () {
    for (let i = 0; i < this.party.length; i++) {
      if (this.party[i].currentHp > 0) return i;
    }
    return 0;
  };
  Battle.prototype.hasUsableCreature = function () {
    return this.party.some(function (c) { return c.currentHp > 0; });
  };
  Battle.prototype.enemyHasUsable = function () {
    return this.enemyParty.some(function (c) { return c.currentHp > 0; });
  };

  /* Apply a stat-stage change. `stages` is the side's stage object. */
  Battle.prototype.applyStatChange = function (stages, ownerName, change) {
    const before = stages[change.stat];
    let after = before + change.stages;
    if (after > 3) after = 3;
    if (after < -3) after = -3;

    const name = statDisplayName(change.stat);
    if (after === before) {
      this.addLog(ownerName + "'s " + name + " won't go " +
        (change.stages > 0 ? "higher" : "lower") + "!");
      return;
    }
    stages[change.stat] = after;
    let verb;
    if (change.stages >= 2) verb = "rose sharply";
    else if (change.stages > 0) verb = "rose";
    else if (change.stages <= -2) verb = "fell sharply";
    else verb = "fell";
    this.addLog(ownerName + "'s " + name + " " + verb + "!");
  };

  /* One creature attacks another. Returns true if the defender fainted.
     atkStages / defStages are the attacker's and defender's stage objects. */
  Battle.prototype.performAttack = function (attacker, defender, move, atkStages, defStages) {
    const attackerName = Data.SPECIES[attacker.speciesId].name;
    const defenderName = Data.SPECIES[defender.speciesId].name;

    /* Paralysis: a chance to be unable to move this turn. */
    if (attacker.status === "paralysis" && Math.random() < 0.25) {
      this.addLog(attackerName + " is paralyzed! It can't move!");
      return false;
    }

    const moveData = Data.MOVES[move];

    /* Spend a PP (Struggle costs none). */
    if (!moveData.struggle && attacker.movePP && attacker.movePP[move] !== undefined) {
      attacker.movePP[move] = Math.max(0, attacker.movePP[move] - 1);
    }

    this.addLog(attackerName + " used " + move + "!");

    /* Damage — skipped for power-0 moves. */
    if (moveData.power > 0) {
      const result = calculateDamage(attacker, defender, move, atkStages, defStages);
      defender.currentHp -= result.damage;
      if (defender.currentHp < 0) defender.currentHp = 0;

      if (result.effectiveness > 1) this.addLog("It's super effective!");
      else if (result.effectiveness < 1) this.addLog("It's not very effective...");
    }

    /* Status effect from the move. */
    if (moveData.effect && moveData.effect.status &&
        defender.currentHp > 0 && !defender.status &&
        Math.random() < moveData.effect.chance) {
      defender.status = moveData.effect.status;
      this.addLog(defenderName + " " + statusVerb(defender.status) + "!");
    }

    /* Stat-stage effect from the move. */
    if (moveData.effect && moveData.effect.statChange) {
      const change = moveData.effect.statChange;
      if (change.target === "self") {
        this.applyStatChange(atkStages, attackerName, change);
      } else if (defender.currentHp > 0) {
        this.applyStatChange(defStages, defenderName, change);
      }
    }

    if (defender.currentHp === 0) {
      defender.status = null; // a fainted creature loses its condition
      this.addLog(defenderName + " fainted!");
      return true;
    }
    return false;
  };

  /* The enemy attacks the player's active creature. Returns true if it fainted. */
  Battle.prototype.enemyAttack = function () {
    return this.performAttack(
      this.enemy(), this.active(), chooseEnemyMove(this.enemy()),
      this.enemyStages, this.playerStages
    );
  };

  /* End-of-turn damage from burn and poison. */
  Battle.prototype.applyEndOfTurn = function () {
    if (this.over || this.needsSwitch) return;

    function tickDamage(creature) {
      if (creature.currentHp <= 0) return 0;
      if (creature.status === "poison") return Math.max(1, Math.floor(creature.maxHp / 8));
      if (creature.status === "burn") return Math.max(1, Math.floor(creature.maxHp / 16));
      return 0;
    }

    const player = this.active();
    const pDmg = tickDamage(player);
    if (pDmg > 0) {
      player.currentHp = Math.max(0, player.currentHp - pDmg);
      this.addLog(Data.SPECIES[player.speciesId].name + " is hurt by its " + player.status + "!");
      if (player.currentHp === 0) {
        player.status = null;
        this.addLog(Data.SPECIES[player.speciesId].name + " fainted!");
        this.handleActiveFaint();
        return;
      }
    }

    const enemy = this.enemy();
    const eDmg = tickDamage(enemy);
    if (eDmg > 0) {
      enemy.currentHp = Math.max(0, enemy.currentHp - eDmg);
      this.addLog(Data.SPECIES[enemy.speciesId].name + " is hurt by its " + enemy.status + "!");
      if (enemy.currentHp === 0) {
        enemy.status = null;
        this.addLog(Data.SPECIES[enemy.speciesId].name + " fainted!");
        this.handleEnemyFaint();
        return;
      }
    }
  };

  /* The player's active creature fainted: switch, or lose. */
  Battle.prototype.handleActiveFaint = function () {
    if (this.hasUsableCreature()) {
      this.needsSwitch = true;
      this.addLog("Choose another creature!");
    } else {
      this.over = true;
      this.result = "lose";
      this.addLog("You have no creatures left to fight!");
    }
  };

  /* An enemy creature fainted: award XP, then either send out the
     trainer's next creature (resetting its stat stages) or win. */
  Battle.prototype.handleEnemyFaint = function () {
    const self = this;
    const xpGain = this.enemy().level * 12 + 10;
    Data.gainXp(this.active(), xpGain, function (msg) { self.addLog(msg); });

    if (this.isTrainer && this.enemyHasUsable()) {
      for (let i = 0; i < this.enemyParty.length; i++) {
        if (this.enemyParty[i].currentHp > 0) { this.enemyIndex = i; break; }
      }
      this.enemyStages = freshStages(); // a fresh creature starts unmodified
      this.addLog((this.trainerName || "Opponent") + " sent out " +
        Data.SPECIES[this.enemy().speciesId].name + "!");
      return;
    }

    this.over = true;
    this.result = "win";
    if (this.isWild) {
      this.moneyReward = this.enemyParty[0].level * 8 + Math.floor(Math.random() * 11);
    } else {
      this.moneyReward = this.moneyOnWin;
    }
    if (this.moneyReward > 0) this.addLog("You got " + this.moneyReward + " coins!");
  };

  /* ---- Player action: attack with a move ---- */
  Battle.prototype.playerAttack = function (moveName) {
    if (this.over || this.needsSwitch) return;

    const player = this.active();
    const enemyMoveName = chooseEnemyMove(this.enemy());

    /* Who goes first? Higher effective Speed; ties broken randomly. */
    let playerFirst;
    const pSpeed = effectiveSpeed(player, this.playerStages);
    const eSpeed = effectiveSpeed(this.enemy(), this.enemyStages);
    if (pSpeed > eSpeed) playerFirst = true;
    else if (pSpeed < eSpeed) playerFirst = false;
    else playerFirst = Math.random() < 0.5;

    if (playerFirst) {
      if (this.performAttack(player, this.enemy(), moveName, this.playerStages, this.enemyStages)) this.handleEnemyFaint();
      else if (this.enemyAttack()) this.handleActiveFaint();
    } else {
      if (this.enemyAttack()) this.handleActiveFaint();
      else if (this.performAttack(player, this.enemy(), moveName, this.playerStages, this.enemyStages)) this.handleEnemyFaint();
    }

    this.applyEndOfTurn();
  };

  /* ---- Player action: switch creatures ----
     Voluntary switch costs the turn; a forced switch (after a faint) does not.
     Either way, the player's stat stages reset for the new creature. */
  Battle.prototype.playerSwitch = function (index, forced) {
    if (this.over) return;
    if (index === this.activeIndex && !forced) return;
    if (this.party[index].currentHp <= 0) return;

    this.activeIndex = index;
    this.needsSwitch = false;
    this.playerStages = freshStages();
    this.addLog("Go, " + Data.SPECIES[this.active().speciesId].name + "!");

    if (!forced) {
      if (this.enemyAttack()) this.handleActiveFaint();
      this.applyEndOfTurn();
    }
  };

  /* ---- Player action: use a bag item ----
     Returns "caught" | "used" | "blocked". */
  Battle.prototype.playerUseItem = function (itemId, targetIndex) {
    if (this.over || this.needsSwitch) return "blocked";
    const item = Data.ITEMS[itemId];

    if (item.kind === "ball") {
      if (!this.isWild) {
        this.addLog("You can't catch another trainer's creature!");
        return "blocked";
      }
      this.addLog("You threw a " + item.name + "!");
      if (Math.random() < catchChance(this.enemy(), item.catchBonus)) {
        this.addLog("Gotcha! " + Data.SPECIES[this.enemy().speciesId].name + " was caught!");
        this.caught = this.enemy();
        this.caught.status = null;
        this.over = true;
        this.result = "caught";
        return "caught";
      }
      this.addLog("Oh no! It broke free!");
      if (this.enemyAttack()) this.handleActiveFaint();
      this.applyEndOfTurn();
      return "used";
    }

    if (item.kind === "heal") {
      const target = this.party[targetIndex];
      if (target.currentHp <= 0) { this.addLog("It won't work on a fainted creature."); return "blocked"; }
      if (target.currentHp >= target.maxHp) { this.addLog("Its HP is already full."); return "blocked"; }
      const before = target.currentHp;
      target.currentHp = Math.min(target.maxHp, target.currentHp + item.healAmount);
      this.addLog("Used " + item.name + ". " + Data.SPECIES[target.speciesId].name +
        " recovered " + (target.currentHp - before) + " HP.");
      if (this.enemyAttack()) this.handleActiveFaint();
      this.applyEndOfTurn();
      return "used";
    }

    if (item.kind === "cure") {
      const target = this.party[targetIndex];
      if (!target.status) { this.addLog("It has no condition to cure."); return "blocked"; }
      const old = target.status;
      target.status = null;
      this.addLog("Used " + item.name + ". " + Data.SPECIES[target.speciesId].name +
        " is no longer " + statusAdjective(old) + ".");
      if (this.enemyAttack()) this.handleActiveFaint();
      this.applyEndOfTurn();
      return "used";
    }

    if (item.kind === "ether") {
      const target = this.party[targetIndex];
      let restored = false;
      target.moves.forEach(function (m) {
        const max = Data.MOVES[m].pp;
        if ((target.movePP[m] || 0) < max) { target.movePP[m] = max; restored = true; }
      });
      if (!restored) { this.addLog("Its moves already have full PP."); return "blocked"; }
      this.addLog("Used " + item.name + ". " + Data.SPECIES[target.speciesId].name + "'s PP was restored.");
      if (this.enemyAttack()) this.handleActiveFaint();
      this.applyEndOfTurn();
      return "used";
    }

    if (item.kind === "revive") {
      const target = this.party[targetIndex];
      if (target.currentHp > 0) { this.addLog("It only works on a fainted creature."); return "blocked"; }
      target.currentHp = Math.floor(target.maxHp / 2);
      target.status = null;
      this.addLog("Used " + item.name + ". " + Data.SPECIES[target.speciesId].name + " was revived!");
      if (this.enemyAttack()) this.handleActiveFaint();
      this.applyEndOfTurn();
      return "used";
    }

    return "blocked";
  };

  /* ---- Player action: run (wild battles only) ---- */
  Battle.prototype.playerRun = function () {
    if (this.over || this.needsSwitch) return;
    if (!this.isWild) { this.addLog("You can't run from a trainer battle!"); return; }

    const pSpeed = effectiveSpeed(this.active(), this.playerStages);
    const eSpeed = effectiveSpeed(this.enemy(), this.enemyStages);
    let chance = 0.5 + (pSpeed - eSpeed) * 0.05;
    if (chance < 0.25) chance = 0.25;
    if (chance > 0.95) chance = 0.95;

    if (Math.random() < chance) {
      this.addLog("Got away safely!");
      this.over = true;
      this.result = "ran";
    } else {
      this.addLog("Couldn't escape!");
      if (this.enemyAttack()) this.handleActiveFaint();
      this.applyEndOfTurn();
    }
  };

  window.Battle = Battle;
})();
