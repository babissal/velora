/* ===== data.js — the game's content =====
   This file holds the "what exists in the world" data:
   the types, the type matchup chart, the moves, and the creature species.
   It also has helper functions for creating and leveling up creatures.

   Everything here is attached to the global `window` so the other
   script files can use it (we are not using modules so the game can
   run by just double-clicking index.html). */


/* ---- Types ----
   "Normal" is neutral against everything. The core triangle is
   Ember/Aqua/Leaf; "Spark" is added for the second area, and
   "Frost" arrives with the third area, the Frostvale highlands. */
const TYPES = ["Normal", "Ember", "Aqua", "Leaf", "Spark", "Frost"];

/* ---- Type chart ----
   TYPE_CHART[attackingType][defendingType] = damage multiplier.
   2 = super effective, 0.5 = not very effective, 1 = normal.
   The triangle: Ember beats Leaf, Leaf beats Aqua, Aqua beats Ember.
   Spark beats Aqua, but is weak when it hits Leaf.
   Frost beats Leaf, but melts against Ember (and resists itself). */
const TYPE_CHART = {
  Normal: { Normal: 1,   Ember: 1,   Aqua: 1,   Leaf: 1,   Spark: 1,   Frost: 1   },
  Ember:  { Normal: 1,   Ember: 1,   Aqua: 0.5, Leaf: 2,   Spark: 1,   Frost: 2   },
  Aqua:   { Normal: 1,   Ember: 2,   Aqua: 1,   Leaf: 0.5, Spark: 0.5, Frost: 1   },
  Leaf:   { Normal: 1,   Ember: 0.5, Aqua: 2,   Leaf: 1,   Spark: 1,   Frost: 0.5 },
  Spark:  { Normal: 1,   Ember: 1,   Aqua: 2,   Leaf: 0.5, Spark: 1,   Frost: 1   },
  Frost:  { Normal: 1,   Ember: 0.5, Aqua: 1,   Leaf: 2,   Spark: 1,   Frost: 0.5 },
};

/* Get the total multiplier of a move type against a defending creature.
   A creature can have 1 or 2 types, so we multiply through all of them. */
function typeEffectiveness(moveType, defenderTypes) {
  let multiplier = 1;
  for (const defType of defenderTypes) {
    multiplier *= TYPE_CHART[moveType][defType];
  }
  return multiplier;
}


/* ---- Moves ----
   Each move has a type, a power, and `pp` (how many times it can be
   used before it needs to be restored at a Healing Center).
   Some moves also have an `effect` that can inflict a status condition
   ("burn", "poison" or "paralysis") with a given chance (0..1).
   A move with power 0 deals no damage — it exists only for its effect.
   "Struggle" is the last-resort move when every move is out of PP. */
const MOVES = {
  "Tackle":       { name: "Tackle",       type: "Normal", power: 40, pp: 35 },
  "Scratch":      { name: "Scratch",      type: "Normal", power: 40, pp: 35 },
  "Quick Jab":    { name: "Quick Jab",    type: "Normal", power: 35, pp: 35 },
  "Peck":         { name: "Peck",         type: "Normal", power: 45, pp: 30 },
  "Headbutt":     { name: "Headbutt",     type: "Normal", power: 65, pp: 20 },
  "Ember":        { name: "Ember",        type: "Ember",  power: 45, pp: 25, effect: { status: "burn", chance: 0.1 } },
  "Flame Burst":  { name: "Flame Burst",  type: "Ember",  power: 70, pp: 15, effect: { status: "burn", chance: 0.15 } },
  "Water Jet":    { name: "Water Jet",    type: "Aqua",   power: 45, pp: 25 },
  "Aqua Pulse":   { name: "Aqua Pulse",   type: "Aqua",   power: 70, pp: 15 },
  "Vine Whip":    { name: "Vine Whip",    type: "Leaf",   power: 45, pp: 25 },
  "Leaf Slash":   { name: "Leaf Slash",   type: "Leaf",   power: 70, pp: 15 },
  "Toxic Spores": { name: "Toxic Spores", type: "Leaf",   power: 0,  pp: 20, effect: { status: "poison", chance: 1 } },
  "Spark":        { name: "Spark",        type: "Spark",  power: 45, pp: 25, effect: { status: "paralysis", chance: 0.1 } },
  "Volt Snap":    { name: "Volt Snap",    type: "Spark",  power: 70, pp: 15, effect: { status: "paralysis", chance: 0.15 } },
  "Static Field": { name: "Static Field", type: "Spark",  power: 0,  pp: 20, effect: { status: "paralysis", chance: 1 } },
  "Ice Shard":    { name: "Ice Shard",    type: "Frost",  power: 45, pp: 25 },
  "Frost Beam":   { name: "Frost Beam",   type: "Frost",  power: 70, pp: 15 },
  "Icy Wind":     { name: "Icy Wind",     type: "Frost",  power: 35, pp: 20, effect: { statChange: { stat: "spd", stages: -1, target: "enemy" } } },
  "Rock Throw":   { name: "Rock Throw",   type: "Normal", power: 55, pp: 20 },
  /* Healing moves — power 0, they restore the user's own HP. */
  "Recover":      { name: "Recover",      type: "Normal", power: 0,  pp: 10, effect: { heal: 0.5 } },
  "Synthesis":    { name: "Synthesis",    type: "Leaf",   power: 0,  pp: 10, effect: { heal: 0.5 } },
  /* Stat-stage moves — power 0, they shift a stat up or down for the battle. */
  "Growl":        { name: "Growl",        type: "Normal", power: 0,  pp: 30, effect: { statChange: { stat: "atk", stages: -1, target: "enemy" } } },
  "Tail Whip":    { name: "Tail Whip",    type: "Normal", power: 0,  pp: 30, effect: { statChange: { stat: "def", stages: -1, target: "enemy" } } },
  "Focus":        { name: "Focus",        type: "Normal", power: 0,  pp: 25, effect: { statChange: { stat: "atk", stages: 1,  target: "self"  } } },
  "Harden":       { name: "Harden",       type: "Normal", power: 0,  pp: 25, effect: { statChange: { stat: "def", stages: 1,  target: "self"  } } },
  "Agility":      { name: "Agility",      type: "Normal", power: 0,  pp: 25, effect: { statChange: { stat: "spd", stages: 1,  target: "self"  } } },
  /* Last-resort move — usable even with no PP, costs no PP itself. */
  "Struggle":     { name: "Struggle",     type: "Normal", power: 35, pp: 1,  struggle: true },
};


/* ---- Species ----
   The "kinds" of creatures. A species is the template; an actual
   creature in your party is an *instance* made from a species
   (see createCreature below).

   baseStats: the raw potential of the species. Bigger numbers grow
              into bigger stats as the creature levels up.
   learnset:  which move is learned at which level.
   evolvesTo / evolveLevel: if set, the creature transforms when it
              reaches that level.
   color:     placeholder art — the sprite box color. */
const SPECIES = {
  /* --- Ember starter line --- */
  cindlet: {
    id: "cindlet", name: "Cindlet", types: ["Ember"],
    baseStats: { hp: 39, atk: 52, def: 43, spd: 65 },
    learnset: [
      { level: 1, move: "Scratch" },
      { level: 1, move: "Ember" },
      { level: 6, move: "Focus" },
      { level: 12, move: "Flame Burst" },
    ],
    evolvesTo: "pyrunt", evolveLevel: 16,
    color: "#ff8a5c",
  },
  pyrunt: {
    id: "pyrunt", name: "Pyrunt", types: ["Ember"],
    baseStats: { hp: 58, atk: 64, def: 58, spd: 80 },
    learnset: [
      { level: 1, move: "Scratch" },
      { level: 1, move: "Ember" },
      { level: 6, move: "Focus" },
      { level: 12, move: "Flame Burst" },
    ],
    evolvesTo: "volcanyx", evolveLevel: 32,
    color: "#ff6a3c",
  },
  volcanyx: {
    id: "volcanyx", name: "Volcanyx", types: ["Ember"],
    baseStats: { hp: 78, atk: 84, def: 78, spd: 100 },
    learnset: [
      { level: 1, move: "Scratch" },
      { level: 1, move: "Ember" },
      { level: 6, move: "Focus" },
      { level: 12, move: "Flame Burst" },
    ],
    evolvesTo: null, evolveLevel: null,
    color: "#e0461c",
  },

  /* --- Aqua starter line --- */
  dewbble: {
    id: "dewbble", name: "Dewbble", types: ["Aqua"],
    baseStats: { hp: 44, atk: 48, def: 65, spd: 43 },
    learnset: [
      { level: 1, move: "Tackle" },
      { level: 1, move: "Water Jet" },
      { level: 6, move: "Harden" },
      { level: 12, move: "Aqua Pulse" },
    ],
    evolvesTo: "splashfin", evolveLevel: 16,
    color: "#5ca8ff",
  },
  splashfin: {
    id: "splashfin", name: "Splashfin", types: ["Aqua"],
    baseStats: { hp: 59, atk: 63, def: 80, spd: 58 },
    learnset: [
      { level: 1, move: "Tackle" },
      { level: 1, move: "Water Jet" },
      { level: 6, move: "Harden" },
      { level: 12, move: "Aqua Pulse" },
    ],
    evolvesTo: "tidalore", evolveLevel: 32,
    color: "#3c88e0",
  },
  tidalore: {
    id: "tidalore", name: "Tidalore", types: ["Aqua"],
    baseStats: { hp: 79, atk: 83, def: 100, spd: 78 },
    learnset: [
      { level: 1, move: "Tackle" },
      { level: 1, move: "Water Jet" },
      { level: 6, move: "Harden" },
      { level: 12, move: "Aqua Pulse" },
      { level: 28, move: "Recover" },
    ],
    evolvesTo: null, evolveLevel: null,
    color: "#1c5cc0",
  },

  /* --- Leaf starter line --- */
  sprigling: {
    id: "sprigling", name: "Sprigling", types: ["Leaf"],
    baseStats: { hp: 45, atk: 49, def: 55, spd: 45 },
    learnset: [
      { level: 1, move: "Tackle" },
      { level: 1, move: "Vine Whip" },
      { level: 6, move: "Growl" },
      { level: 12, move: "Leaf Slash" },
    ],
    evolvesTo: "bramblox", evolveLevel: 16,
    color: "#7ccf5c",
  },
  bramblox: {
    id: "bramblox", name: "Bramblox", types: ["Leaf"],
    baseStats: { hp: 60, atk: 62, def: 70, spd: 60 },
    learnset: [
      { level: 1, move: "Tackle" },
      { level: 1, move: "Vine Whip" },
      { level: 12, move: "Leaf Slash" },
      { level: 16, move: "Toxic Spores" },
    ],
    evolvesTo: "thornmaw", evolveLevel: 32,
    color: "#5cb03c",
  },
  thornmaw: {
    id: "thornmaw", name: "Thornmaw", types: ["Leaf"],
    baseStats: { hp: 80, atk: 82, def: 90, spd: 80 },
    learnset: [
      { level: 1, move: "Tackle" },
      { level: 1, move: "Vine Whip" },
      { level: 12, move: "Leaf Slash" },
      { level: 16, move: "Toxic Spores" },
      { level: 28, move: "Synthesis" },
    ],
    evolvesTo: null, evolveLevel: null,
    color: "#3c8020",
  },

  /* --- Wild creatures (found in tall grass later) --- */
  nibblet: {
    id: "nibblet", name: "Nibblet", types: ["Normal"],
    baseStats: { hp: 35, atk: 40, def: 30, spd: 55 },
    learnset: [
      { level: 1, move: "Tackle" },
      { level: 1, move: "Quick Jab" },
      { level: 5, move: "Tail Whip" },
    ],
    evolvesTo: "gnawer", evolveLevel: 18,
    color: "#c8a878",
  },
  gnawer: {
    id: "gnawer", name: "Gnawer", types: ["Normal"],
    baseStats: { hp: 55, atk: 60, def: 45, spd: 75 },
    learnset: [
      { level: 1, move: "Tackle" },
      { level: 1, move: "Quick Jab" },
      { level: 5, move: "Tail Whip" },
    ],
    evolvesTo: null, evolveLevel: null,
    color: "#a88858",
  },
  pebblit: {
    id: "pebblit", name: "Pebblit", types: ["Normal"],
    baseStats: { hp: 50, atk: 45, def: 75, spd: 25 },
    learnset: [
      { level: 1, move: "Tackle" },
      { level: 1, move: "Scratch" },
      { level: 7, move: "Harden" },
    ],
    evolvesTo: null, evolveLevel: null,
    color: "#9a9a9a",
  },

  /* --- Spark line (found on Route 2) --- */
  zaplet: {
    id: "zaplet", name: "Zaplet", types: ["Spark"],
    baseStats: { hp: 40, atk: 56, def: 40, spd: 72 },
    learnset: [
      { level: 1, move: "Tackle" },
      { level: 1, move: "Spark" },
      { level: 9, move: "Static Field" },
      { level: 13, move: "Volt Snap" },
    ],
    evolvesTo: "voltcrest", evolveLevel: 18,
    color: "#ffd84a",
  },
  voltcrest: {
    id: "voltcrest", name: "Voltcrest", types: ["Spark"],
    baseStats: { hp: 65, atk: 82, def: 62, spd: 105 },
    learnset: [
      { level: 1, move: "Tackle" },
      { level: 1, move: "Spark" },
      { level: 9, move: "Static Field" },
      { level: 13, move: "Volt Snap" },
    ],
    evolvesTo: null, evolveLevel: null,
    color: "#e0b400",
  },

  /* --- Other Route 2 creatures --- */
  mossling: {
    id: "mossling", name: "Mossling", types: ["Leaf"],
    baseStats: { hp: 62, atk: 55, def: 72, spd: 38 },
    learnset: [
      { level: 1, move: "Tackle" },
      { level: 1, move: "Vine Whip" },
      { level: 8, move: "Toxic Spores" },
      { level: 14, move: "Leaf Slash" },
    ],
    evolvesTo: null, evolveLevel: null,
    color: "#5c9c3c",
  },
  pidglet: {
    id: "pidglet", name: "Pidglet", types: ["Normal"],
    baseStats: { hp: 42, atk: 50, def: 40, spd: 70 },
    learnset: [
      { level: 1, move: "Peck" },
      { level: 1, move: "Quick Jab" },
      { level: 8, move: "Growl" },
      { level: 15, move: "Headbutt" },
    ],
    evolvesTo: "skywren", evolveLevel: 17,
    color: "#bfa98a",
  },
  skywren: {
    id: "skywren", name: "Skywren", types: ["Normal"],
    baseStats: { hp: 68, atk: 80, def: 64, spd: 100 },
    learnset: [
      { level: 1, move: "Peck" },
      { level: 1, move: "Quick Jab" },
      { level: 8, move: "Growl" },
      { level: 15, move: "Headbutt" },
    ],
    evolvesTo: null, evolveLevel: null,
    color: "#8c7a5c",
  },
  finnow: {
    id: "finnow", name: "Finnow", types: ["Aqua"],
    baseStats: { hp: 52, atk: 58, def: 58, spd: 50 },
    learnset: [
      { level: 1, move: "Tackle" },
      { level: 1, move: "Water Jet" },
      { level: 6, move: "Tail Whip" },
      { level: 14, move: "Aqua Pulse" },
    ],
    evolvesTo: "tidecrest", evolveLevel: 20,
    color: "#4fbcd6",
  },
  tidecrest: {
    id: "tidecrest", name: "Tidecrest", types: ["Aqua"],
    baseStats: { hp: 86, atk: 88, def: 92, spd: 70 },
    learnset: [
      { level: 1, move: "Tackle" },
      { level: 1, move: "Water Jet" },
      { level: 6, move: "Tail Whip" },
      { level: 14, move: "Aqua Pulse" },
    ],
    evolvesTo: null, evolveLevel: null,
    color: "#2a86b0",
  },
  coalcub: {
    id: "coalcub", name: "Coalcub", types: ["Ember"],
    baseStats: { hp: 56, atk: 68, def: 52, spd: 58 },
    learnset: [
      { level: 1, move: "Scratch" },
      { level: 1, move: "Ember" },
      { level: 8, move: "Focus" },
      { level: 15, move: "Flame Burst" },
    ],
    evolvesTo: null, evolveLevel: null,
    color: "#cc5530",
  },

  /* --- Frost line (found on Route 3, the Frostvale highlands) --- */
  chillet: {
    id: "chillet", name: "Chillet", types: ["Frost"],
    baseStats: { hp: 44, atk: 50, def: 50, spd: 58 },
    learnset: [
      { level: 1, move: "Tackle" },
      { level: 1, move: "Ice Shard" },
      { level: 8, move: "Harden" },
      { level: 13, move: "Icy Wind" },
      { level: 18, move: "Frost Beam" },
    ],
    evolvesTo: "frostnip", evolveLevel: 18,
    color: "#a8e0f0",
  },
  frostnip: {
    id: "frostnip", name: "Frostnip", types: ["Frost"],
    baseStats: { hp: 60, atk: 64, def: 66, spd: 74 },
    learnset: [
      { level: 1, move: "Tackle" },
      { level: 1, move: "Ice Shard" },
      { level: 8, move: "Harden" },
      { level: 13, move: "Icy Wind" },
      { level: 18, move: "Frost Beam" },
    ],
    evolvesTo: "glacelle", evolveLevel: 34,
    color: "#7fc8e6",
  },
  glacelle: {
    id: "glacelle", name: "Glacelle", types: ["Frost"],
    baseStats: { hp: 80, atk: 82, def: 90, spd: 94 },
    learnset: [
      { level: 1, move: "Tackle" },
      { level: 1, move: "Ice Shard" },
      { level: 8, move: "Harden" },
      { level: 13, move: "Icy Wind" },
      { level: 18, move: "Frost Beam" },
    ],
    evolvesTo: null, evolveLevel: null,
    color: "#4f9cc8",
  },

  /* --- Cobalt Cavern creatures (Route 3) --- */
  craggle: {
    id: "craggle", name: "Craggle", types: ["Normal"],
    baseStats: { hp: 60, atk: 64, def: 82, spd: 30 },
    learnset: [
      { level: 1, move: "Tackle" },
      { level: 1, move: "Scratch" },
      { level: 7, move: "Harden" },
      { level: 12, move: "Rock Throw" },
      { level: 18, move: "Headbutt" },
    ],
    evolvesTo: "boulderon", evolveLevel: 24,
    color: "#8a8276",
  },
  boulderon: {
    id: "boulderon", name: "Boulderon", types: ["Normal"],
    baseStats: { hp: 92, atk: 94, def: 112, spd: 42 },
    learnset: [
      { level: 1, move: "Tackle" },
      { level: 1, move: "Scratch" },
      { level: 7, move: "Harden" },
      { level: 12, move: "Rock Throw" },
      { level: 18, move: "Headbutt" },
    ],
    evolvesTo: null, evolveLevel: null,
    color: "#5f5a50",
  },
  glimmoth: {
    id: "glimmoth", name: "Glimmoth", types: ["Spark"],
    baseStats: { hp: 52, atk: 58, def: 48, spd: 86 },
    learnset: [
      { level: 1, move: "Quick Jab" },
      { level: 1, move: "Spark" },
      { level: 9, move: "Agility" },
      { level: 15, move: "Volt Snap" },
    ],
    evolvesTo: null, evolveLevel: null,
    color: "#b9a0e8",
  },

  /* --- Ancient dual-type creatures (the Champion's Hall) ---
     These are the only creatures with two types, so the type chart
     stacks against them — a single move can be doubly effective. */
  pyrowisp: {
    id: "pyrowisp", name: "Pyrowisp", types: ["Ember", "Spark"],
    baseStats: { hp: 68, atk: 96, def: 62, spd: 110 },
    learnset: [
      { level: 1, move: "Focus" },
      { level: 1, move: "Ember" },
      { level: 8, move: "Spark" },
      { level: 14, move: "Flame Burst" },
      { level: 20, move: "Volt Snap" },
    ],
    evolvesTo: null, evolveLevel: null,
    color: "#ff7a3c",
  },
  glaqua: {
    id: "glaqua", name: "Glaqua", types: ["Aqua", "Frost"],
    baseStats: { hp: 84, atk: 80, def: 96, spd: 78 },
    learnset: [
      { level: 1, move: "Water Jet" },
      { level: 1, move: "Ice Shard" },
      { level: 8, move: "Aqua Pulse" },
      { level: 14, move: "Frost Beam" },
      { level: 20, move: "Recover" },
    ],
    evolvesTo: null, evolveLevel: null,
    color: "#5fbfd0",
  },
  verdfrost: {
    id: "verdfrost", name: "Verdfrost", types: ["Leaf", "Frost"],
    baseStats: { hp: 80, atk: 86, def: 88, spd: 86 },
    learnset: [
      { level: 1, move: "Vine Whip" },
      { level: 1, move: "Ice Shard" },
      { level: 8, move: "Leaf Slash" },
      { level: 14, move: "Frost Beam" },
      { level: 20, move: "Synthesis" },
    ],
    evolvesTo: null, evolveLevel: null,
    color: "#7fc8a0",
  },
  terravolt: {
    id: "terravolt", name: "Terravolt", types: ["Normal", "Spark"],
    baseStats: { hp: 96, atk: 92, def: 100, spd: 60 },
    learnset: [
      { level: 1, move: "Tackle" },
      { level: 1, move: "Rock Throw" },
      { level: 8, move: "Spark" },
      { level: 14, move: "Volt Snap" },
      { level: 20, move: "Recover" },
    ],
    evolvesTo: null, evolveLevel: null,
    color: "#c8b85c",
  },
};

/* The three creatures the player can pick at the start. */
const STARTER_IDS = ["cindlet", "dewbble", "sprigling"];

/* Species that can appear as wild creatures (used from Step 2 onward,
   but also handy for testing battles now). */
const WILD_IDS = ["cindlet", "dewbble", "sprigling", "nibblet", "pebblit"];


/* ===== Stat formulas =====
   These turn a species' baseStats + a level into actual numbers.
   They are intentionally simple so the math is easy to follow. */

function maxHpFor(species, level) {
  return Math.floor(species.baseStats.hp * level / 50) + level + 10;
}
function statFor(baseValue, level) {
  return Math.floor(baseValue * level / 50) + 5;
}

/* How much XP is needed to go from `level` to the next level. */
function xpToNext(level) {
  return level * 25;
}


/* ===== Creating and growing creatures ===== */

/* Build a fresh creature instance from a species id and a level.
   This is the object that actually fights, takes damage, etc. */
function createCreature(speciesId, level) {
  const species = SPECIES[speciesId];
  const maxHp = maxHpFor(species, level);

  /* Figure out which moves it knows: every move whose learn-level is
     at or below the creature's level. Keep at most the 4 most recent. */
  let known = [];
  for (const entry of species.learnset) {
    if (entry.level <= level) known.push(entry.move);
  }
  if (known.length === 0) known = ["Tackle"];
  const moves = known.slice(-4);

  /* Each move starts with a full PP pool. */
  const movePP = {};
  moves.forEach(function (m) { movePP[m] = MOVES[m].pp; });

  return {
    speciesId: speciesId,
    level: level,
    xp: 0,
    maxHp: maxHp,
    currentHp: maxHp,
    atk: statFor(species.baseStats.atk, level),
    def: statFor(species.baseStats.def, level),
    spd: statFor(species.baseStats.spd, level),
    moves: moves,
    movePP: movePP,      // current PP for each known move
    status: null,        // "burn" | "poison" | "paralysis" | null
    pendingMoves: [],    // moves it wants to learn but has no room for yet
  };
}

/* Recalculate stats after a level-up or evolution.
   currentHp grows by however much maxHp grew, so a level-up feels
   like a small heal rather than leaving the creature at low HP. */
function recalcStats(creature) {
  const species = SPECIES[creature.speciesId];
  const oldMaxHp = creature.maxHp;
  creature.maxHp = maxHpFor(species, creature.level);
  creature.currentHp += (creature.maxHp - oldMaxHp);
  if (creature.currentHp > creature.maxHp) creature.currentHp = creature.maxHp;
  creature.atk = statFor(species.baseStats.atk, creature.level);
  creature.def = statFor(species.baseStats.def, creature.level);
  creature.spd = statFor(species.baseStats.spd, creature.level);
}

/* Give a creature XP. It may level up (possibly several times),
   learn new moves, and evolve. Every notable event is reported by
   calling log(message) so the battle screen can show it. */
function gainXp(creature, amount, log) {
  creature.xp += amount;
  log(SPECIES[creature.speciesId].name + " gained " + amount + " XP.");

  while (creature.xp >= xpToNext(creature.level)) {
    creature.xp -= xpToNext(creature.level);
    creature.level++;
    recalcStats(creature);
    log(SPECIES[creature.speciesId].name + " grew to level " + creature.level + "!");
    if (window.Sound) window.Sound.levelUp();

    /* Learn any move tied to this exact level. If there's no room
       (already 4 moves), queue it so the player can choose later. */
    for (const entry of SPECIES[creature.speciesId].learnset) {
      if (entry.level === creature.level &&
          !creature.moves.includes(entry.move) &&
          creature.pendingMoves.indexOf(entry.move) === -1) {
        if (creature.moves.length < 4) {
          creature.moves.push(entry.move);
          if (!creature.movePP) creature.movePP = {};
          creature.movePP[entry.move] = MOVES[entry.move].pp;
          log(SPECIES[creature.speciesId].name + " learned " + entry.move + "!");
        } else {
          creature.pendingMoves.push(entry.move);
          log(SPECIES[creature.speciesId].name + " wants to learn " + entry.move + "...");
        }
      }
    }

    /* Evolve if this species has an evolution and we've hit the level. */
    const species = SPECIES[creature.speciesId];
    if (species.evolvesTo && creature.level >= species.evolveLevel) {
      const oldName = species.name;
      creature.speciesId = species.evolvesTo;
      recalcStats(creature);
      log(oldName + " evolved into " + SPECIES[creature.speciesId].name + "!");
      if (window.Sound) window.Sound.evolve();
    }
  }
}

/* ===== Items =====
   Things the player can carry and use.
   kind tells the game what an item does:
     "ball"   — try to catch a wild creature (catchBonus improves odds)
     "heal"   — restore HP to a creature (healAmount)
     "revive" — bring a fainted creature back (to half HP) */
const ITEMS = {
  capture_orb: {
    id: "capture_orb", name: "Capture Orb", kind: "ball",
    catchBonus: 1, price: 50,
    desc: "A basic orb for catching wild creatures.",
  },
  great_orb: {
    id: "great_orb", name: "Great Orb", kind: "ball",
    catchBonus: 1.6, price: 150,
    desc: "A stronger orb with a better catch rate.",
  },
  potion: {
    id: "potion", name: "Potion", kind: "heal",
    healAmount: 25, price: 60,
    desc: "Restores 25 HP to one creature.",
  },
  super_potion: {
    id: "super_potion", name: "Super Potion", kind: "heal",
    healAmount: 60, price: 180,
    desc: "Restores 60 HP to one creature.",
  },
  revive: {
    id: "revive", name: "Revive", kind: "revive",
    price: 250,
    desc: "Revives a fainted creature to half HP.",
  },
  remedy: {
    id: "remedy", name: "Remedy", kind: "cure",
    price: 70,
    desc: "Cures burn, poison or paralysis.",
  },
  ether: {
    id: "ether", name: "Ether", kind: "ether",
    price: 120,
    desc: "Restores the PP of all of one creature's moves.",
  },
};

/* What the shop sells. */
const SHOP_STOCK = ["capture_orb", "great_orb", "potion", "super_potion", "remedy", "ether", "revive"];


/* ===== Trainers =====
   Non-wild opponents. The gym leader is the Step-1-milestone boss. */
const TRAINERS = {
  scout_tam: {
    id: "scout_tam",
    name: "Scout Tam",
    team: [ ["nibblet", 4], ["pebblit", 5] ],
    reward: 90,
    intro: "Scout Tam: Hey, a challenger! Let's see what your team can do.",
    winLine: "Scout Tam: Nice moves! You're ready for tougher fights.",
    loseLine: "Scout Tam: Heh, better luck next time!",
    afterLine: "Scout Tam: The Gym is just south of here. Train up before you go!",
  },
  camper_joss: {
    id: "camper_joss",
    name: "Camper Joss",
    team: [ ["sprigling", 6], ["gnawer", 7] ],
    reward: 140,
    intro: "Camper Joss: I've been training out here all week. Bring it on!",
    winLine: "Camper Joss: Wow, you're strong. The Gym Leader won't be easy though.",
    loseLine: "Camper Joss: Told you I've been training!",
    afterLine: "Camper Joss: Remember — type matchups win battles.",
  },
  bramwen: {
    id: "bramwen",
    name: "Leader Bramwen",
    team: [ ["sprigling", 10], ["bramblox", 13] ],
    reward: 300,
    intro: "Bramwen: So you've made it to my gym. Show me the bond you share with your creature!",
    winLine: "Bramwen: Incredible! You and your team have earned the Velora Badge.",
    loseLine: "Bramwen: Come back when your team is stronger.",
    afterLine: "Leader Bramwen: The bond you share with your team is the true prize. Travel well!",
  },
  hiker_bex: {
    id: "hiker_bex",
    name: "Hiker Bex",
    team: [ ["mossling", 10], ["pidglet", 12] ],
    reward: 220,
    intro: "Hiker Bex: These hills are my training ground. Let's see if you belong here!",
    winLine: "Hiker Bex: Strong team! Greendale Town is just ahead.",
    loseLine: "Hiker Bex: Ha! The mountains make you tough.",
    afterLine: "Hiker Bex: Watch for Spark creatures up here — they're quick.",
  },
  cole: {
    id: "cole",
    name: "Leader Cole",
    team: [ ["finnow", 15], ["dewbble", 16], ["tidecrest", 19] ],
    reward: 600,
    intro: "Cole: Welcome to the Greendale Gym. My tide will sweep your team away!",
    winLine: "Cole: Astonishing. You've earned the Tide Badge — and my respect.",
    loseLine: "Cole: The current was too strong for you this time.",
    afterLine: "Leader Cole: A true trainer keeps growing. I hope our paths cross again.",
  },
  miner_dolf: {
    id: "miner_dolf",
    name: "Miner Dolf",
    team: [ ["craggle", 16], ["pebblit", 17] ],
    reward: 300,
    intro: "Miner Dolf: You wandered into my cavern? Then you'll battle for the right to pass!",
    winLine: "Miner Dolf: Solid team. Tough as the rock down here.",
    loseLine: "Miner Dolf: Ha! These tunnels harden a trainer.",
    afterLine: "Miner Dolf: Mind the ice up ahead — it's slick, and so are its creatures.",
  },
  skater_pia: {
    id: "skater_pia",
    name: "Skater Pia",
    team: [ ["chillet", 17], ["glimmoth", 18] ],
    reward: 340,
    intro: "Skater Pia: The frost never slows me down. Let's see if it slows you!",
    winLine: "Skater Pia: Whoa, you glide through battles. Frostvale's just ahead!",
    loseLine: "Skater Pia: Too cool for you, huh?",
    afterLine: "Skater Pia: Leader Frieda's Frost team is no joke. Pack an Ember move!",
  },
  frieda: {
    id: "frieda",
    name: "Leader Frieda",
    team: [ ["chillet", 20], ["frostnip", 22], ["glacelle", 25] ],
    reward: 1000,
    intro: "Frieda: So you've climbed all the way to Frostvale. Let's see if your bond can weather the cold!",
    winLine: "Frieda: Magnificent. The Glacier Badge is yours — you've earned every shard of it.",
    loseLine: "Frieda: The cold tests everyone. Come back when you're ready.",
    afterLine: "Leader Frieda: Three badges! You've grown into a trainer Velora can be proud of.",
  },
  elite_varn: {
    id: "elite_varn",
    name: "Elite Varn",
    team: [ ["pyrowisp", 30], ["terravolt", 31] ],
    reward: 1400,
    intro: "Elite Varn: Only badge-holders reach this hall. The ancient creatures answer to me — prove you deserve to pass!",
    winLine: "Elite Varn: Raw power and a steady heart. The Champion awaits.",
    loseLine: "Elite Varn: The old creatures are not so easily tamed, are they?",
    afterLine: "Elite Varn: Two types, one creature — read the chart carefully, challenger.",
  },
  elite_sela: {
    id: "elite_sela",
    name: "Elite Sela",
    team: [ ["glaqua", 30], ["verdfrost", 31] ],
    reward: 1400,
    intro: "Elite Sela: Varn tests strength. I test patience. Outlast my creatures if you can!",
    winLine: "Elite Sela: Composed to the very end. Champion Rook will enjoy this.",
    loseLine: "Elite Sela: Patience wins the long battle. Rest, and return.",
    afterLine: "Elite Sela: A creature that heals itself can outlast almost anything. Remember that.",
  },
  champion_rook: {
    id: "champion_rook",
    name: "Champion Rook",
    team: [ ["pyrowisp", 32], ["glaqua", 32], ["verdfrost", 33], ["terravolt", 33], ["glacelle", 35] ],
    reward: 5000,
    intro: "Rook: I am Rook, Champion of Velora. You've crossed the whole region to stand here. Now — give me everything!",
    winLine: "Rook: ...Incredible. The bond you share outshines my own. Velora has a new Champion!",
    loseLine: "Rook: A Champion must be unbeatable. Train harder, and challenge me again.",
    afterLine: "Champion Rook: The title is yours, but the journey never truly ends. I'll be here for a rematch whenever you're ready.",
  },
};


/* ===== Map tiles =====
   Each number in a map grid refers to one of these tile types.
     walkable — can the player stand on it
     grass    — stepping here may trigger a wild encounter
     door     — stepping here may warp to another map
     npc      — blocked, but can be "talked to" with the interact key */
const TILES = {
  0:  { name: "grass",     walkable: true,  color: "#7cc05c" },
  1:  { name: "tallgrass", walkable: true,  color: "#3f9c3f", grass: true },
  2:  { name: "tree",      walkable: false, color: "#1f5c1f" },
  3:  { name: "path",      walkable: true,  color: "#d8c89a" },
  4:  { name: "water",     walkable: false, color: "#4f86d6" },
  5:  { name: "wall",      walkable: false, color: "#6f5d4a" },
  6:  { name: "door",      walkable: true,  color: "#c08a3a", door: true },
  8:  { name: "npc",       walkable: false, color: "#e6dfc6", npc: true },
  /* Snowy ground — like tall grass, stepping here may trigger an encounter. */
  11: { name: "snow",      walkable: true,  color: "#dcebf2", grass: true },
  /* Decorative furniture — non-walkable, drawn with a small icon. */
  7:  { name: "counter",   walkable: false, color: "#b88a4a", decor: "counter" },
  9:  { name: "plant",     walkable: false, color: "#e6dfc6", decor: "plant" },
  10: { name: "shelf",     walkable: false, color: "#9a7a4a", decor: "shelf" },
  12: { name: "machine",   walkable: false, color: "#cfd6dc", decor: "machine" },
};

/* How likely a step in tall grass is to trigger a wild battle. */
const ENCOUNTER_RATE = 0.18;


/* ===== Maps =====
   Each map has:
     name        — shown in the HUD
     grid        — 2D array [row][col] of tile numbers
     warps       — door tiles that move the player to another map
     npcs        — keyed by "x,y", describe who/what is there
     encounters  — (optional) which wild creatures appear in tall grass
     startFacing — handy default; not required
   Coordinates are x = column, y = row. */
const MAPS = {
  town: {
    name: "Velora Town",
    grid: [
      [2,2,2,2,2,2,6,2,2,2,2,2],
      [2,0,0,5,5,5,0,5,5,5,0,2],
      [2,0,0,5,6,5,0,5,6,5,0,2],
      [2,0,0,8,0,0,0,0,0,0,0,2],
      [2,0,0,0,0,3,3,0,8,0,0,2],
      [2,0,0,0,0,3,3,0,0,0,0,2],
      [2,0,0,0,0,3,3,0,0,0,0,2],
      [2,2,2,2,2,3,3,2,2,2,2,2],
      [2,2,2,2,2,3,3,2,2,2,2,2],
      [2,2,2,2,2,6,6,2,2,2,2,2],
    ],
    warps: [
      { x: 4, y: 2, to: "healing_center", toX: 3, toY: 4 },
      { x: 8, y: 2, to: "shop",           toX: 3, toY: 4 },
      { x: 5, y: 9, to: "route1",         toX: 5, toY: 1 },
      { x: 6, y: 9, to: "route1",         toX: 6, toY: 1 },
      { x: 6, y: 0, to: "route2",         toX: 6, toY: 11,
        requires: "gymDefeated",
        requiredMessage: "A guard blocks the path north. \"The route ahead is dangerous — come back once you've beaten the Velora Gym.\"" },
    ],
    npcs: {
      "3,3": { kind: "person", look: "kid", lines: [
        "My big sister raised a Pyrunt all on her own!",
        "It started out as a tiny Cindlet — just like the ones the Professor hands out.",
      ] },
      "8,4": { kind: "person", look: "elder", lines: [
        "Velora Town has stood among these trees for generations.",
        "The Healing Center to the northwest mends your whole team for free. Never be shy about stopping in.",
      ] },
    },
    groundItems: [
      { x: 1, y: 1, item: "potion" },
    ],
    encounters: null,
  },

  route1: {
    name: "Velora Route",
    grid: [
      [2,2,2,2,2,6,6,2,2,2,2,2],
      [2,0,0,8,3,3,3,0,0,0,0,2],
      [2,1,1,0,3,3,3,0,1,1,1,2],
      [2,1,1,0,3,3,3,0,1,1,1,2],
      [2,1,1,0,3,3,3,0,1,1,1,2],
      [2,0,0,0,3,3,3,0,0,8,0,2],
      [2,0,0,3,3,3,3,3,0,0,0,2],
      [2,1,1,3,3,3,3,3,1,1,0,2],
      [2,1,1,3,3,3,3,3,1,1,0,2],
      [2,0,0,0,3,3,3,8,0,0,0,2],
      [2,2,2,2,5,6,5,2,2,2,2,2],
      [2,2,2,2,2,2,2,2,2,2,2,2],
    ],
    warps: [
      { x: 5, y: 0,  to: "town", toX: 5, toY: 8 },
      { x: 6, y: 0,  to: "town", toX: 6, toY: 8 },
      { x: 5, y: 10, to: "gym",  toX: 4, toY: 7 },
    ],
    npcs: {
      "3,1": { kind: "trainer", trainer: "scout_tam", sight: { dir: "down", range: 3 } },
      "7,9": { kind: "trainer", trainer: "camper_joss", sight: { dir: "up", range: 3 } },
      "9,5": { kind: "person", look: "fisher", lines: [
        "Tall grass is where wild creatures love to hide.",
        "Wear one down in battle before you throw a Capture Orb — a tired creature is far easier to catch.",
      ] },
    },
    groundItems: [
      { x: 8, y: 1, item: "super_potion" },
      { x: 1, y: 9, item: "capture_orb" },
    ],
    encounters: {
      species: [
        "nibblet", "nibblet", "nibblet", "pebblit", "pebblit",
        "sprigling", "dewbble", "cindlet",
      ],
      minLevel: 2,
      maxLevel: 5,
    },
  },

  healing_center: {
    name: "Healing Center",
    grid: [
      [5,5,5,5,5,5,5,5],
      [5,12,0,0,0,0,9,5],
      [5,0,0,8,7,7,9,5],
      [5,0,0,0,0,0,0,5],
      [5,9,0,0,0,0,0,5],
      [5,0,0,6,0,0,0,5],
      [5,5,5,5,5,5,5,5],
    ],
    warps: [
      { x: 3, y: 5, to: "town", toX: 4, toY: 3 },
    ],
    npcs: {
      "3,2": { kind: "nurse" },
    },
    encounters: null,
  },

  shop: {
    name: "Velora Shop",
    grid: [
      [5,5,5,5,5,5,5,5],
      [5,10,10,0,0,10,10,5],
      [5,0,0,8,7,7,0,5],
      [5,0,0,0,0,0,0,5],
      [5,9,0,0,0,0,9,5],
      [5,0,0,6,0,0,0,5],
      [5,5,5,5,5,5,5,5],
    ],
    warps: [
      { x: 3, y: 5, to: "town", toX: 8, toY: 3 },
    ],
    npcs: {
      "3,2": { kind: "shopkeeper" },
    },
    encounters: null,
  },

  gym: {
    name: "Velora Gym",
    grid: [
      [5,5,5,5,5,5,5,5,5],
      [5,0,0,0,8,0,0,0,5],
      [5,0,0,0,0,0,0,0,5],
      [5,0,1,1,0,1,1,0,5],
      [5,0,0,0,0,0,0,0,5],
      [5,0,1,1,0,1,1,0,5],
      [5,0,0,0,3,0,0,0,5],
      [5,0,0,0,3,0,0,0,5],
      [5,5,5,5,6,5,5,5,5],
    ],
    warps: [
      { x: 4, y: 8, to: "route1", toX: 5, toY: 9 },
    ],
    npcs: {
      "4,1": { kind: "gymleader", trainer: "bramwen", flag: "gymDefeated" },
    },
    encounters: null,
  },

  route2: {
    name: "Greendale Route",
    grid: [
      [2,2,2,2,2,2,6,2,2,2,2,2],
      [2,0,0,0,0,3,3,0,0,8,0,2],
      [2,1,1,0,0,3,3,0,1,1,0,2],
      [2,1,1,0,0,3,3,0,1,1,0,2],
      [2,1,1,3,3,3,3,3,1,1,0,2],
      [2,0,0,8,3,3,3,3,0,0,0,2],
      [2,0,4,4,3,3,3,4,4,0,0,2],
      [2,1,1,0,0,3,3,0,1,1,1,2],
      [2,1,1,0,0,3,3,0,1,1,1,2],
      [2,1,1,0,0,3,3,0,1,1,1,2],
      [2,0,0,0,0,3,3,0,0,0,0,2],
      [2,2,2,2,2,2,6,2,2,2,2,2],
    ],
    warps: [
      { x: 6, y: 0,  to: "town2", toX: 5, toY: 1 },
      { x: 6, y: 11, to: "town",  toX: 6, toY: 1 },
    ],
    npcs: {
      "3,5": { kind: "trainer", trainer: "hiker_bex", sight: { dir: "up", range: 3 } },
      "9,1": { kind: "person", look: "elder", lines: [
        "These Greendale hills are steeper than they look.",
        "Spark creatures up here are quick. Aqua types dread them — but Leaf types just shrug off the jolts.",
      ] },
    },
    groundItems: [
      { x: 10, y: 4, item: "great_orb" },
      { x: 1, y: 10, item: "revive" },
    ],
    encounters: {
      species: [
        "zaplet", "zaplet", "mossling", "mossling",
        "pidglet", "pidglet", "finnow", "gnawer",
      ],
      minLevel: 7,
      maxLevel: 12,
    },
  },

  town2: {
    name: "Greendale Town",
    grid: [
      [2,2,2,2,2,2,6,2,2,2,2,2],
      [2,0,5,5,5,0,0,5,5,5,0,2],
      [2,0,5,6,5,0,0,5,6,5,0,2],
      [2,0,0,0,0,0,0,0,0,8,0,2],
      [2,0,8,0,0,0,0,0,0,0,0,2],
      [2,0,0,0,5,5,5,0,0,0,0,2],
      [2,0,0,0,5,6,5,0,0,0,0,2],
      [2,0,0,0,0,3,0,0,0,0,0,2],
      [2,2,2,2,2,3,2,2,2,2,2,2],
      [2,2,2,2,2,6,2,2,2,2,2,2],
    ],
    warps: [
      { x: 3, y: 2, to: "healing_center2", toX: 3, toY: 4 },
      { x: 8, y: 2, to: "shop2",           toX: 3, toY: 4 },
      { x: 5, y: 6, to: "gym2",            toX: 4, toY: 7 },
      { x: 5, y: 9, to: "route2",          toX: 6, toY: 1 },
      { x: 6, y: 0, to: "route3",          toX: 6, toY: 10,
        requires: "gym2Defeated",
        requiredMessage: "A guide stands at the trailhead. \"The Cobalt Cavern road climbs to Frostvale — earn the Tide Badge first, then I'll let you through.\"" },
    ],
    npcs: {
      "9,3": { kind: "person", look: "fisher", lines: [
        "The sea breeze keeps Greendale's creatures lively all year round.",
        "Leader Cole at the gym trains Aqua creatures. Bring along some Leaf or Spark moves!",
      ] },
      "2,4": { kind: "person", look: "villager", lines: [
        "Two badges already? You're becoming quite the trainer.",
        "The trail north leads through the Cobalt Cavern and up to Frostvale Town — it's bitter cold, so bundle up your team!",
      ] },
    },
    encounters: null,
  },

  route3: {
    name: "Cobalt Cavern",
    grid: [
      [2,2,2,2,2,2,6,2,2,2,2,2],
      [2,0,0,11,11,3,3,11,11,0,0,2],
      [2,0,11,11,11,3,3,11,11,11,0,2],
      [2,5,5,0,0,3,3,0,0,5,5,2],
      [2,5,0,0,3,3,3,3,0,0,5,2],
      [2,0,0,3,3,11,11,3,3,0,0,2],
      [2,0,11,3,3,11,11,3,3,11,0,2],
      [2,5,0,0,3,3,3,3,0,0,5,2],
      [2,5,5,0,0,3,3,0,0,5,5,2],
      [2,0,11,11,11,3,3,11,11,11,0,2],
      [2,0,0,11,11,3,3,11,11,0,0,2],
      [2,2,2,2,2,2,6,2,2,2,2,2],
    ],
    warps: [
      { x: 6, y: 0,  to: "town3", toX: 5, toY: 8 },
      { x: 6, y: 11, to: "town2", toX: 6, toY: 1 },
    ],
    npcs: {
      "2,4": { kind: "trainer", trainer: "miner_dolf", sight: { dir: "right", range: 4 } },
      "9,7": { kind: "trainer", trainer: "skater_pia", sight: { dir: "left", range: 4 } },
      "9,2": { kind: "person", look: "elder", lines: [
        "The cavern stays frozen the year round — even the rocks wear frost.",
        "Frost creatures shrug off the cold, but a single Ember move sends them packing.",
      ] },
    },
    groundItems: [
      { x: 1, y: 1, item: "super_potion" },
      { x: 10, y: 10, item: "great_orb" },
      { x: 1, y: 10, item: "ether" },
    ],
    encounters: {
      species: [
        "chillet", "chillet", "craggle", "craggle",
        "glimmoth", "glimmoth", "chillet", "frostnip",
      ],
      minLevel: 14,
      maxLevel: 20,
    },
  },

  town3: {
    name: "Frostvale Town",
    grid: [
      [2,2,2,2,2,2,6,2,2,2,2,2],
      [2,0,5,5,5,0,0,5,5,5,0,2],
      [2,0,5,6,5,0,0,5,6,5,0,2],
      [2,0,0,0,0,0,0,0,0,8,0,2],
      [2,0,8,0,0,0,0,0,0,0,0,2],
      [2,0,0,0,5,5,5,0,0,0,0,2],
      [2,0,0,0,5,6,5,0,0,0,0,2],
      [2,0,0,0,0,3,0,0,0,0,0,2],
      [2,2,2,2,2,3,2,2,2,2,2,2],
      [2,2,2,2,2,6,2,2,2,2,2,2],
    ],
    warps: [
      { x: 3, y: 2, to: "healing_center3", toX: 3, toY: 4 },
      { x: 8, y: 2, to: "shop3",           toX: 3, toY: 4 },
      { x: 5, y: 6, to: "gym3",            toX: 4, toY: 7 },
      { x: 5, y: 9, to: "route3",          toX: 6, toY: 1 },
      { x: 6, y: 0, to: "champions_hall",  toX: 5, toY: 11,
        requires: "gym3Defeated",
        requiredMessage: "A keeper guards the great doors. \"Beyond lies the Champion's Hall. Earn the Glacier Badge, and the way will open.\"" },
    ],
    npcs: {
      "9,3": { kind: "person", look: "villager", lines: [
        "Welcome to Frostvale — the highest town in all of Velora.",
        "Leader Frieda's Frost team is fierce. Ember moves are your best friend up here.",
      ] },
      "2,4": { kind: "person", look: "kid", lines: [
        "It snows here almost every day!",
        "I'm gonna catch a Glacelle when I'm older. They're so cool — literally!",
      ] },
    },
    encounters: null,
  },

  champions_hall: {
    name: "Champion's Hall",
    grid: [
      [5,5,5,5,5,5,5,5,5,5,5],
      [5,0,0,0,0,8,0,0,0,0,5],
      [5,0,9,0,0,3,0,0,9,0,5],
      [5,0,0,0,0,3,0,0,0,0,5],
      [5,0,0,0,3,3,3,0,0,0,5],
      [5,8,0,0,0,3,0,0,0,0,5],
      [5,3,0,0,0,3,0,0,0,3,5],
      [5,0,0,0,0,3,0,0,0,8,5],
      [5,0,0,0,3,3,3,0,0,0,5],
      [5,1,1,0,0,3,0,0,1,1,5],
      [5,1,1,0,0,3,0,0,1,1,5],
      [5,0,0,0,0,3,0,0,0,0,5],
      [5,5,5,5,5,6,5,5,5,5,5],
    ],
    warps: [
      { x: 5, y: 12, to: "town3", toX: 6, toY: 1 },
    ],
    npcs: {
      "5,1": { kind: "gymleader", trainer: "champion_rook", flag: "championDefeated" },
      "1,5": { kind: "trainer", trainer: "elite_varn", sight: { dir: "right", range: 4 } },
      "9,7": { kind: "trainer", trainer: "elite_sela", sight: { dir: "left", range: 4 } },
    },
    groundItems: [
      { x: 1, y: 3, item: "revive" },
      { x: 9, y: 3, item: "great_orb" },
    ],
    encounters: {
      species: [
        "pyrowisp", "glaqua", "verdfrost", "terravolt",
        "glaqua", "verdfrost",
      ],
      minLevel: 28,
      maxLevel: 34,
    },
  },

  healing_center3: {
    name: "Healing Center",
    grid: [
      [5,5,5,5,5,5,5,5],
      [5,12,0,0,0,0,9,5],
      [5,0,0,8,7,7,9,5],
      [5,0,0,0,0,0,0,5],
      [5,9,0,0,0,0,0,5],
      [5,0,0,6,0,0,0,5],
      [5,5,5,5,5,5,5,5],
    ],
    warps: [
      { x: 3, y: 5, to: "town3", toX: 3, toY: 3 },
    ],
    npcs: {
      "3,2": { kind: "nurse" },
    },
    encounters: null,
  },

  shop3: {
    name: "Frostvale Shop",
    grid: [
      [5,5,5,5,5,5,5,5],
      [5,10,10,0,0,10,10,5],
      [5,0,0,8,7,7,0,5],
      [5,0,0,0,0,0,0,5],
      [5,9,0,0,0,0,9,5],
      [5,0,0,6,0,0,0,5],
      [5,5,5,5,5,5,5,5],
    ],
    warps: [
      { x: 3, y: 5, to: "town3", toX: 8, toY: 3 },
    ],
    npcs: {
      "3,2": { kind: "shopkeeper" },
    },
    encounters: null,
  },

  gym3: {
    name: "Frostvale Gym",
    grid: [
      [5,5,5,5,5,5,5,5,5],
      [5,0,0,0,8,0,0,0,5],
      [5,0,0,0,0,0,0,0,5],
      [5,0,11,11,0,11,11,0,5],
      [5,0,0,0,0,0,0,0,5],
      [5,0,11,11,0,11,11,0,5],
      [5,0,0,0,3,0,0,0,5],
      [5,0,0,0,3,0,0,0,5],
      [5,5,5,5,6,5,5,5,5],
    ],
    warps: [
      { x: 4, y: 8, to: "town3", toX: 5, toY: 7 },
    ],
    npcs: {
      "4,1": { kind: "gymleader", trainer: "frieda", flag: "gym3Defeated" },
    },
    encounters: null,
  },

  healing_center2: {
    name: "Healing Center",
    grid: [
      [5,5,5,5,5,5,5,5],
      [5,12,0,0,0,0,9,5],
      [5,0,0,8,7,7,9,5],
      [5,0,0,0,0,0,0,5],
      [5,9,0,0,0,0,0,5],
      [5,0,0,6,0,0,0,5],
      [5,5,5,5,5,5,5,5],
    ],
    warps: [
      { x: 3, y: 5, to: "town2", toX: 3, toY: 3 },
    ],
    npcs: {
      "3,2": { kind: "nurse" },
    },
    encounters: null,
  },

  shop2: {
    name: "Greendale Shop",
    grid: [
      [5,5,5,5,5,5,5,5],
      [5,10,10,0,0,10,10,5],
      [5,0,0,8,7,7,0,5],
      [5,0,0,0,0,0,0,5],
      [5,9,0,0,0,0,9,5],
      [5,0,0,6,0,0,0,5],
      [5,5,5,5,5,5,5,5],
    ],
    warps: [
      { x: 3, y: 5, to: "town2", toX: 8, toY: 3 },
    ],
    npcs: {
      "3,2": { kind: "shopkeeper" },
    },
    encounters: null,
  },

  gym2: {
    name: "Greendale Gym",
    grid: [
      [5,5,5,5,5,5,5,5,5],
      [5,0,0,0,8,0,0,0,5],
      [5,0,0,0,0,0,0,0,5],
      [5,0,4,4,0,4,4,0,5],
      [5,0,0,0,0,0,0,0,5],
      [5,0,4,4,0,4,4,0,5],
      [5,0,0,0,3,0,0,0,5],
      [5,0,0,0,3,0,0,0,5],
      [5,5,5,5,6,5,5,5,5],
    ],
    warps: [
      { x: 4, y: 8, to: "town2", toX: 5, toY: 7 },
    ],
    npcs: {
      "4,1": { kind: "gymleader", trainer: "cole", flag: "gym2Defeated" },
    },
    encounters: null,
  },
};


/* ===== Move PP helpers ===== */

/* Set every known move back to full PP (used by Healing Centers / Ether). */
function refillPP(creature) {
  if (!creature.movePP) creature.movePP = {};
  creature.moves.forEach(function (m) { creature.movePP[m] = MOVES[m].pp; });
}

/* Make sure a creature has a movePP entry for each move, without
   overwriting PP it already has (used when loading older saves). */
function ensurePP(creature) {
  if (!creature.movePP) creature.movePP = {};
  creature.moves.forEach(function (m) {
    if (creature.movePP[m] === undefined) creature.movePP[m] = MOVES[m].pp;
  });
}


/* Pick a random wild creature for a given map (or null if it has none). */
function rollWildCreature(mapId) {
  const map = MAPS[mapId];
  if (!map || !map.encounters) return null;
  const list = map.encounters.species;
  const speciesId = list[Math.floor(Math.random() * list.length)];
  const span = map.encounters.maxLevel - map.encounters.minLevel;
  const level = map.encounters.minLevel + Math.floor(Math.random() * (span + 1));
  return createCreature(speciesId, level);
}


/* Make all of this available to the other script files. */
window.GameData = {
  TYPES, TYPE_CHART, MOVES, SPECIES, ITEMS, TILES, MAPS, TRAINERS,
  STARTER_IDS, WILD_IDS, SHOP_STOCK, ENCOUNTER_RATE,
  typeEffectiveness, xpToNext,
  createCreature, recalcStats, gainXp, rollWildCreature,
  refillPP, ensurePP,
};
