/* ===== art.js — original creature artwork =====
   Every creature has its own bespoke SVG design — a unique body, a
   tuned palette, and its own features. These are all original cartoon
   monster designs, not based on any existing creatures.

   window.CreatureArt.markup(speciesId)        -> an <svg> string
   window.CreatureArt.into(element, speciesId) -> sets element.innerHTML */

(function () {

  /* ---- tiny SVG element helpers ---- */
  function E(cx, cy, rx, ry, f, s, w) {
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry +
      '" fill="' + f + '"' + (s ? ' stroke="' + s + '" stroke-width="' + (w || 3) + '"' : '') + '/>';
  }
  function C(cx, cy, r, f, s, w) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r +
      '" fill="' + f + '"' + (s ? ' stroke="' + s + '" stroke-width="' + (w || 3) + '"' : '') + '/>';
  }
  function P(pts, f, s, w) {
    return '<polygon points="' + pts + '" fill="' + f + '"' +
      (s ? ' stroke="' + s + '" stroke-width="' + (w || 3) + '" stroke-linejoin="round"' : '') + '/>';
  }
  function PATH(d, f, s, w) {
    return '<path d="' + d + '" fill="' + (f || "none") + '"' +
      (s ? ' stroke="' + s + '" stroke-width="' + (w || 3) +
        '" stroke-linejoin="round" stroke-linecap="round"' : '') + '/>';
  }
  function L(x1, y1, x2, y2, s, w) {
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
      '" stroke="' + s + '" stroke-width="' + (w || 3) + '" stroke-linecap="round"/>';
  }

  /* Eyes — round (cute) or sharp (fierce). */
  function eyes(cx, cy, gap, r, sharp) {
    let s = "";
    [cx - gap, cx + gap].forEach(function (ex) {
      if (sharp) {
        s += P([ex - r, cy - r * 0.7, ex + r, cy - r * 0.2, ex + r * 0.25, cy + r].join(" "), "#fff", "#222", 1.6);
        s += C(ex + r * 0.1, cy, r * 0.42, "#222");
      } else {
        s += C(ex, cy, r, "#fff", "#222", 2);
        s += C(ex, cy + r * 0.22, r * 0.5, "#222");
        s += C(ex - r * 0.28, cy - r * 0.25, r * 0.22, "#fff");
      }
    });
    return s;
  }
  function mouth(cx, cy, w, frown) {
    if (frown) return PATH("M" + (cx - w) + " " + (cy + 3) + " Q " + cx + " " + (cy - 3) + " " + (cx + w) + " " + (cy + 3), null, "#222", 2);
    return PATH("M" + (cx - w) + " " + cy + " Q " + cx + " " + (cy + w * 0.9) + " " + (cx + w) + " " + cy, null, "#222", 2);
  }

  /* Shared "topper" features, placed and scaled per creature. */
  function flame(x, y, sc) {
    sc = sc || 1;
    return '<g transform="translate(' + x + ',' + y + ') scale(' + sc + ')">' +
      PATH("M0 -20 C 11 -6 13 2 6 9 C 4 4 2 6 0 11 C -2 6 -4 4 -6 9 C -13 2 -11 -6 0 -20 Z", "#ff8a1a", "#d4540a", 2.5) +
      PATH("M0 -10 C 5 -2 6 3 2 8 C 1 5 0 6 0 9 C 0 6 -1 5 -2 8 C -6 3 -5 -2 0 -10 Z", "#ffd24a") +
      "</g>";
  }
  function sprout(x, y, sc) {
    sc = sc || 1;
    return '<g transform="translate(' + x + ',' + y + ') scale(' + sc + ')">' +
      L(0, 10, 0, -4, "#2f7f1f", 3) +
      PATH("M0 6 Q -3 -10 -13 -16 Q -1 -15 0 6 Z", "#5fbf3f", "#2f7f1f", 2) +
      PATH("M0 6 Q 3 -10 13 -16 Q 1 -15 0 6 Z", "#6fce4f", "#2f7f1f", 2) +
      "</g>";
  }
  function bolt(x, y, sc) {
    sc = sc || 1;
    return '<g transform="translate(' + x + ',' + y + ') scale(' + sc + ')">' +
      P("3,-20 -9,-1 -1,-1 -5,13 10,-7 1,-7 8,-20", "#ffe04a", "#c79a00", 2) +
      "</g>";
  }
  function crystal(x, y, sc) {
    sc = sc || 1;
    return '<g transform="translate(' + x + ',' + y + ') scale(' + sc + ')">' +
      P("0,-20 7,-4 4,11 -4,11 -7,-4", "#bfe9f5", "#4f9cc8", 2.4) +
      P("0,-20 7,-4 0,2", "#e8f7fc") +
      P("0,-20 -7,-4 0,2", "#9fd4e8") +
      "</g>";
  }

  function wrap(inner) {
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="creature-svg">' +
      inner + "</svg>";
  }


  /* ============================================================
     One bespoke design per creature.
     ============================================================ */
  const CREATURES = {

    /* --- Ember starter line --- */
    cindlet: function () {
      const b = "#ff8c4d", d = "#bd4a17", l = "#ffd2a6", ch = "#ff5c3c";
      return wrap(
        PATH("M66 72 Q 86 74 84 58", null, d, 6) + flame(83, 60, 0.55) +
        E(38, 85, 9, 7, b, d) + E(58, 85, 9, 7, b, d) +
        P("28,42 23,22 42,38", b, d, 2.5) + P("72,42 77,22 58,38", b, d, 2.5) +
        E(48, 60, 27, 25, b, d) + E(48, 70, 15, 11, l) +
        flame(48, 30, 0.85) +
        eyes(48, 54, 11, 6) + mouth(48, 66, 5) +
        C(33, 62, 4, ch) + C(63, 62, 4, ch)
      );
    },
    pyrunt: function () {
      const b = "#f3603a", d = "#962a12", l = "#ffb27a";
      return wrap(
        E(40, 87, 9, 9, b, d) + E(60, 87, 9, 9, b, d) +
        E(21, 58, 8, 13, b, d) + E(79, 58, 8, 13, b, d) +
        flame(30, 32, 0.7) + flame(50, 26, 0.95) + flame(70, 32, 0.7) +
        E(50, 56, 23, 30, b, d) + E(50, 65, 13, 16, l) +
        eyes(50, 45, 11, 6.5, true) +
        mouth(50, 56, 5) +
        P("45,59 50,59 47,65", "#fff", d, 1.2) + P("55,59 50,59 53,65", "#fff", d, 1.2)
      );
    },
    volcanyx: function () {
      const b = "#8f2a16", d = "#430f05", l = "#c2502a", crack = "#ff9a2e";
      return wrap(
        PATH("M74 60 Q 94 58 90 38", null, d, 7) + flame(89, 40, 0.7) +
        E(26, 82, 9, 12, b, d) + E(44, 87, 9, 12, b, d) + E(58, 87, 9, 12, b, d) + E(74, 82, 9, 12, b, d) +
        P("24,34 14,12 36,32", b, d, 2.5) + P("76,34 86,12 64,32", b, d, 2.5) +
        flame(38, 26, 0.7) + flame(50, 18, 1.05) + flame(62, 26, 0.7) +
        E(50, 56, 35, 26, b, d) + E(50, 64, 20, 14, l) +
        PATH("M30 50 L 38 57 L 33 63", null, crack, 2.5) +
        PATH("M68 48 L 62 56 L 67 62", null, crack, 2.5) +
        PATH("M48 44 L 52 52 L 47 58", null, crack, 2.5) +
        eyes(50, 48, 13, 6.5, true) +
        mouth(50, 60, 6) +
        P("42,63 48,63 44,71", "#fff", d, 1.3) + P("58,63 52,63 56,71", "#fff", d, 1.3)
      );
    },

    /* --- Aqua starter line --- */
    dewbble: function () {
      const b = "#5bb8e8", d = "#1f6fa8", l = "#c4ecfb", fin = "#9ad8f0";
      return wrap(
        E(40, 84, 8, 5, b, d) + E(60, 84, 8, 5, b, d) +
        P("50,6 40,30 60,30", fin, d, 2.5) +
        L(50, 10, 50, 28, d, 1.5) +
        PATH("M50 22 C 72 42 78 64 50 86 C 22 64 28 42 50 22 Z", b, d, 3) +
        E(50, 66, 15, 13, l) +
        eyes(50, 52, 11, 6) + mouth(50, 64, 5) +
        C(34, 60, 4, "#7fcdee") + C(66, 60, 4, "#7fcdee")
      );
    },
    splashfin: function () {
      const b = "#3f9fd6", d = "#185a8a", l = "#abe0f4", fin = "#7fc8e8";
      return wrap(
        P("66,74 94,62 90,92", fin, d, 2.5) +
        E(40, 86, 9, 8, b, d) + E(60, 86, 9, 8, b, d) +
        P("20,52 4,42 20,70", fin, d, 2.5) + P("80,52 96,42 80,70", fin, d, 2.5) +
        P("38,30 50,8 62,30", fin, d, 2.5) +
        E(50, 56, 24, 29, b, d) + E(50, 64, 14, 16, l) +
        eyes(50, 46, 11, 6) + mouth(50, 57, 5) +
        C(35, 54, 3.5, "#9ad8f0") + C(65, 54, 3.5, "#9ad8f0")
      );
    },
    tidalore: function () {
      const b = "#2a72b8", d = "#103b66", l = "#8cc8ee", fin = "#6fb4e0", crest = "#bfe6fa";
      return wrap(
        P("66,72 96,58 92,94", fin, d, 2.5) +
        E(28, 84, 9, 9, b, d) + E(72, 84, 9, 9, b, d) +
        P("14,54 0,44 16,72", fin, d, 2.5) + P("86,54 100,44 84,72", fin, d, 2.5) +
        PATH("M26 30 Q 34 6 44 22 Q 50 8 56 22 Q 66 6 74 30 Z", crest, d, 2.5) +
        E(50, 56, 33, 27, b, d) + E(50, 65, 19, 15, l) +
        eyes(50, 48, 12, 6.5) + mouth(50, 60, 5) +
        C(32, 58, 4, "#6fb4e0") + C(68, 58, 4, "#6fb4e0")
      );
    },

    /* --- Leaf starter line --- */
    sprigling: function () {
      const b = "#7ec85a", d = "#3a7f28", l = "#d2ecb6";
      return wrap(
        E(42, 83, 8, 6, b, d) + E(58, 83, 8, 6, b, d) +
        sprout(50, 40, 1.05) +
        E(50, 62, 24, 22, b, d) + E(50, 70, 13, 10, l) +
        eyes(50, 58, 10, 6) + mouth(50, 68, 4.5) +
        C(35, 65, 3.6, "#ff9c8c") + C(65, 65, 3.6, "#ff9c8c") +
        E(44, 56, 3, 5, "#9ad77a") + E(56, 56, 3, 5, "#9ad77a")
      );
    },
    bramblox: function () {
      const b = "#5cae3e", d = "#2c6b1e", l = "#aad98b", thorn = "#36741f";
      return wrap(
        E(40, 86, 8, 8, b, d) + E(60, 86, 8, 8, b, d) +
        E(22, 60, 7, 11, b, d) + E(78, 60, 7, 11, b, d) +
        sprout(38, 34, 0.8) + sprout(50, 28, 1) + sprout(62, 34, 0.8) +
        E(50, 58, 26, 26, b, d) + E(50, 66, 14, 13, l) +
        P("24,52 16,46 26,44", thorn, d, 1.6) + P("76,52 84,46 74,44", thorn, d, 1.6) +
        P("32,76 26,82 36,82", thorn, d, 1.6) + P("68,76 74,82 64,82", thorn, d, 1.6) +
        eyes(50, 52, 11, 6) + mouth(50, 63, 5)
      );
    },
    thornmaw: function () {
      const b = "#3f8f2a", d = "#1d4a12", l = "#7fc05c", thorn = "#2c6b1e";
      return wrap(
        E(26, 82, 9, 11, b, d) + E(44, 87, 9, 11, b, d) + E(58, 87, 9, 11, b, d) + E(74, 82, 9, 11, b, d) +
        sprout(26, 38, 0.85) + sprout(40, 28, 1) + sprout(54, 24, 1.1) + sprout(68, 30, 1) + sprout(80, 40, 0.85) +
        E(50, 56, 35, 26, b, d) + E(50, 64, 20, 14, l) +
        P("22,48 12,42 24,40", thorn, d, 1.8) + P("78,48 88,42 76,40", thorn, d, 1.8) +
        P("36,78 30,86 42,86", thorn, d, 1.8) + P("64,78 70,86 58,86", thorn, d, 1.8) +
        eyes(50, 48, 13, 6.5, true) + mouth(50, 60, 6) +
        P("42,63 48,63 44,70", "#fff", d, 1.3) + P("58,63 52,63 56,70", "#fff", d, 1.3)
      );
    },

    /* --- Wild Normal creatures --- */
    nibblet: function () {
      const b = "#d8b483", d = "#9a7445", l = "#f0dcc0", ear = "#e8c9a0", pink = "#e89a9a";
      return wrap(
        PATH("M70 74 Q 92 70 84 50", null, "#b89868", 4) +
        E(32, 30, 11, 16, ear, d) + E(32, 30, 5, 9, pink) +
        E(68, 30, 11, 16, ear, d) + E(68, 30, 5, 9, pink) +
        E(42, 83, 7, 6, b, d) + E(58, 83, 7, 6, b, d) +
        E(50, 62, 23, 22, b, d) + E(50, 70, 13, 10, l) +
        eyes(50, 57, 10, 5.5) +
        C(50, 64, 2.6, "#7a5a38") +
        P("46,66 54,66 50,73", "#fff", d, 1.2) +
        L(34, 64, 22, 61, d, 1.4) + L(34, 67, 22, 68, d, 1.4) +
        L(66, 64, 78, 61, d, 1.4) + L(66, 67, 78, 68, d, 1.4)
      );
    },
    gnawer: function () {
      const b = "#b3895a", d = "#6e4f2c", l = "#dcc4a0", pink = "#d98f8f";
      return wrap(
        PATH("M72 70 Q 96 64 86 42", null, "#8a6638", 5) +
        P("26,40 20,16 40,34", b, d, 2.2) + P("28,38 25,24 36,33", pink) +
        P("74,40 80,16 60,34", b, d, 2.2) + P("72,38 75,24 64,33", pink) +
        E(40, 86, 8, 7, b, d) + E(60, 86, 8, 7, b, d) +
        E(50, 58, 27, 24, b, d) + E(50, 66, 15, 12, l) +
        eyes(50, 52, 11, 6, true) +
        C(50, 60, 3, "#5a3f22") +
        P("44,62 56,62 50,71", "#fff", d, 1.4) + L(50, 62, 50, 70, d, 1.2) +
        L(33, 56, 20, 52, d, 1.4) + L(67, 56, 80, 52, d, 1.4)
      );
    },
    pebblit: function () {
      const b = "#9a9a92", d = "#52524b", l = "#c4c4ba";
      return wrap(
        E(36, 83, 9, 6, "#6e6e66", d) + E(64, 83, 9, 6, "#6e6e66", d) +
        P("22,74 13,46 30,23 56,17 82,33 87,62 64,81", b, d, 3) +
        P("30,23 56,17 50,40 34,42", l) +
        P("82,33 87,62 66,56 70,38", "#82827a") +
        PATH("M40 52 L 48 58 L 44 66", null, d, 2.2) +
        PATH("M62 46 L 58 54 L 64 60", null, d, 2.2) +
        P("46,12 54,4 60,14", b, d, 2) +
        eyes(48, 50, 12, 6) + mouth(48, 64, 5)
      );
    },

    /* --- Spark line --- */
    zaplet: function () {
      const b = "#ffd84a", d = "#bd8e00", l = "#fff0a8";
      return wrap(
        P("64,72 88,78 78,56", "#ffe066", d, 2) +
        E(40, 84, 8, 7, b, d) + E(60, 84, 8, 7, b, d) +
        P("34,40 40,16 46,34 52,12 58,36 64,40", b, d, 2) +
        E(50, 60, 24, 23, b, d) + E(50, 68, 14, 11, l) +
        eyes(50, 56, 10, 6, true) +
        PATH("M44 65 L 50 68 L 56 65", null, "#222", 2) +
        C(34, 63, 4, "#ff8f3a") + C(66, 63, 4, "#ff8f3a") +
        P("16,40 12,46 18,46 14,54", "#fff", "#ffd000", 1.2) +
        P("86,46 82,52 88,52 84,60", "#fff", "#ffd000", 1.2)
      );
    },
    voltcrest: function () {
      const b = "#ffcf2e", d = "#a8780a", l = "#fff0a0";
      return wrap(
        P("60,80 90,86 80,58", "#ffe04a", d, 2) +
        E(40, 88, 9, 8, b, d) + E(60, 88, 9, 8, b, d) +
        E(20, 56, 7, 13, b, d) + E(80, 56, 7, 13, b, d) +
        P("30,34 38,8 44,28 50,4 56,28 62,8 70,34", b, d, 2) +
        E(50, 56, 23, 29, b, d) + E(50, 64, 13, 16, l) +
        eyes(50, 46, 11, 6.5, true) +
        PATH("M43 56 L 50 60 L 57 56", null, "#222", 2.2) +
        C(33, 53, 4, "#ff8f3a") + C(67, 53, 4, "#ff8f3a") +
        bolt(14, 44, 0.55) + bolt(86, 44, 0.55)
      );
    },

    /* --- Other Route 2 creatures --- */
    mossling: function () {
      const b = "#6fa84a", d = "#3a6b22", l = "#aecd86", moss = "#86bd5c", moss2 = "#5a8f38";
      return wrap(
        E(36, 85, 9, 7, b, d) + E(64, 85, 9, 7, b, d) +
        E(34, 40, 10, 8, moss, d, 2) + E(50, 33, 12, 9, moss, d, 2) + E(66, 40, 10, 8, moss, d, 2) +
        E(42, 38, 4, 3, moss2) + E(58, 38, 4, 3, moss2) +
        sprout(50, 30, 0.7) +
        E(50, 60, 28, 25, b, d) + E(50, 68, 16, 12, l) +
        eyes(50, 56, 11, 6) + mouth(50, 67, 5) +
        E(28, 62, 4, 3, moss2) + E(70, 64, 4, 3, moss2) + E(58, 74, 4, 3, moss2)
      );
    },
    pidglet: function () {
      const b = "#c9a06a", d = "#8a6638", l = "#ead0a8", beak = "#e8a93a", beakD = "#b07a1a", wing = "#ab8550";
      return wrap(
        P("46,76 32,90 50,82", wing, d, 2) + P("54,76 68,90 50,82", wing, d, 2) +
        L(45, 80, 45, 92, d, 3) + L(55, 80, 55, 92, d, 3) +
        E(24, 56, 10, 16, wing, d) + E(76, 56, 10, 16, wing, d) +
        P("44,18 50,6 56,18", b, d, 2) +
        E(50, 54, 21, 24, b, d) + E(50, 62, 12, 14, l) +
        eyes(50, 46, 9, 5.5) +
        P("50,52 43,60 57,60", beak, beakD, 2)
      );
    },
    skywren: function () {
      const b = "#7d93a8", d = "#3a4e5e", l = "#c6d4e0", beak = "#e8b54a", beakD = "#b07a1a", wing = "#5f7588";
      return wrap(
        P("44,74 26,92 50,82", wing, d, 2) + P("56,74 74,92 50,82", wing, d, 2) +
        L(46, 80, 46, 93, d, 3) + L(54, 80, 54, 93, d, 3) +
        E(20, 52, 12, 20, wing, d) + E(80, 52, 12, 20, wing, d) +
        P("40,20 48,4 50,18 56,2 60,22", b, d, 2) +
        E(50, 52, 22, 26, b, d) + E(50, 60, 12, 15, l) +
        eyes(50, 44, 10, 5.5, true) +
        P("50,50 41,59 59,59", beak, beakD, 2)
      );
    },
    finnow: function () {
      const b = "#3fb8c4", d = "#1a6e7a", l = "#abe6ec", fin = "#7fd4dc";
      return wrap(
        P("66,56 92,40 92,72", fin, d, 2.5) +
        P("36,36 54,36 45,16", fin, d, 2.5) +
        E(44, 56, 30, 23, b, d) +
        P("40,72 56,72 47,88", fin, d, 2.5) +
        E(40, 63, 16, 11, l) +
        eyes(36, 52, 9, 6) +
        PATH("M28 62 Q 33 66 38 62", null, "#1a6e7a", 2) +
        C(64, 44, 3, "#bff0f4")
      );
    },
    tidecrest: function () {
      const b = "#2a8fb0", d = "#114e64", l = "#8cd0e2", fin = "#6fc0d6", crest = "#bfe8f0";
      return wrap(
        P("68,56 98,36 98,76", fin, d, 2.5) +
        PATH("M30 36 Q 38 10 46 28 Q 52 12 58 30 Z", crest, d, 2.5) +
        E(46, 56, 32, 25, b, d) +
        P("40,74 60,74 50,92", fin, d, 2.5) +
        P("24,62 8,66 22,74", fin, d, 2.5) +
        E(42, 64, 18, 12, l) +
        eyes(38, 52, 10, 6.5) +
        PATH("M28 63 Q 34 68 40 63", null, "#114e64", 2) +
        C(62, 44, 3.4, "#d4f2f8") + C(70, 52, 2.6, "#d4f2f8")
      );
    },
    coalcub: function () {
      const b = "#403a3e", d = "#19161a", l = "#5c545a", crack = "#ff7a1a", glow = "#ffb24a";
      return wrap(
        PATH("M64 74 Q 84 76 82 60", null, d, 6) + flame(81, 62, 0.5) +
        E(38, 86, 9, 7, b, d) + E(58, 86, 9, 7, b, d) +
        P("28,44 24,24 42,40", b, d, 2.5) + P("72,44 76,24 58,40", b, d, 2.5) +
        E(48, 62, 26, 24, b, d) + E(48, 71, 14, 10, l) +
        flame(48, 34, 0.75) +
        PATH("M30 56 L 37 62 L 33 70", null, crack, 2.2) +
        PATH("M64 54 L 58 61 L 63 69", null, crack, 2.2) +
        C(40, 76, 2.6, glow) + C(56, 74, 2.6, glow) +
        eyes(48, 56, 11, 6) + mouth(48, 67, 5)
      );
    },

    /* --- Frost line --- */
    chillet: function () {
      const b = "#a8e0f0", d = "#3f8fb8", l = "#e0f4fb";
      return wrap(
        E(42, 84, 8, 6, b, d) + E(58, 84, 8, 6, b, d) +
        crystal(50, 42, 0.9) +
        E(50, 62, 24, 22, b, d) + E(50, 70, 13, 10, l) +
        eyes(50, 58, 10, 6) + mouth(50, 68, 4.5) +
        C(35, 65, 3.6, "#7fc8e6") + C(65, 65, 3.6, "#7fc8e6") +
        crystal(29, 60, 0.4) + crystal(71, 60, 0.4)
      );
    },
    frostnip: function () {
      const b = "#7fc8e6", d = "#2f6f96", l = "#cdeaf6";
      return wrap(
        E(40, 86, 8, 8, b, d) + E(60, 86, 8, 8, b, d) +
        E(22, 60, 7, 11, b, d) + E(78, 60, 7, 11, b, d) +
        crystal(38, 36, 0.6) + crystal(50, 30, 0.95) + crystal(62, 36, 0.6) +
        E(50, 58, 26, 25, b, d) + E(50, 66, 14, 13, l) +
        eyes(50, 52, 11, 6) + mouth(50, 63, 5) +
        C(33, 60, 4, "#5fa8cc") + C(67, 60, 4, "#5fa8cc")
      );
    },
    glacelle: function () {
      const b = "#4f9cc8", d = "#1d4f6e", l = "#9fd4e8";
      return wrap(
        PATH("M74 62 Q 94 60 90 40", null, d, 6) + crystal(89, 42, 0.5) +
        E(26, 82, 9, 12, b, d) + E(44, 87, 9, 12, b, d) + E(58, 87, 9, 12, b, d) + E(74, 82, 9, 12, b, d) +
        crystal(28, 38, 0.7) + crystal(40, 28, 0.95) + crystal(54, 24, 1.1) + crystal(68, 30, 0.95) + crystal(80, 40, 0.7) +
        E(50, 56, 34, 26, b, d) + E(50, 64, 19, 14, l) +
        eyes(50, 48, 13, 6.5, true) + mouth(50, 60, 6) +
        P("42,63 48,63 44,70", "#fff", d, 1.3) + P("58,63 52,63 56,70", "#fff", d, 1.3)
      );
    },

    /* --- Cobalt Cavern creatures --- */
    craggle: function () {
      const b = "#8a8276", d = "#4a443c", l = "#b3aa9c";
      return wrap(
        E(36, 84, 9, 6, "#6a6258", d) + E(64, 84, 9, 6, "#6a6258", d) +
        P("24,72 18,44 34,24 62,22 84,40 82,68 60,82", b, d, 3) +
        P("34,24 62,22 54,44 38,44", l) +
        P("84,40 82,68 64,60 70,42", "#6e675c") +
        PATH("M42 54 L 50 60 L 46 68", null, d, 2.2) +
        PATH("M64 48 L 60 56 L 66 62", null, d, 2.2) +
        eyes(48, 50, 12, 6) + mouth(48, 64, 5)
      );
    },
    boulderon: function () {
      const b = "#5f5a50", d = "#2a2620", l = "#837d70";
      return wrap(
        E(30, 86, 10, 6, "#46423a", d) + E(50, 88, 10, 6, "#46423a", d) + E(70, 86, 10, 6, "#46423a", d) +
        P("16,72 10,40 28,14 64,10 90,32 88,70 58,88", b, d, 3.2) +
        P("28,14 64,10 54,38 34,40", l) +
        P("90,32 88,70 66,72 70,40", "#4a463c") +
        PATH("M34 52 L 44 60 L 38 70", null, d, 2.6) +
        PATH("M62 44 L 56 54 L 64 62", null, d, 2.6) +
        PATH("M48 30 L 54 40 L 46 46", null, d, 2.4) +
        eyes(46, 50, 13, 6.5, true) + mouth(46, 64, 6)
      );
    },
    glimmoth: function () {
      const b = "#b9a0e8", d = "#6a4fa0", l = "#e2d6f6", wing = "#d2c2f0";
      return wrap(
        E(26, 54, 16, 22, wing, d) + E(74, 54, 16, 22, wing, d) +
        C(26, 48, 5, "#f0e8fb") + C(74, 48, 5, "#f0e8fb") +
        L(44, 30, 36, 14, d, 2) + L(56, 30, 64, 14, d, 2) +
        C(36, 13, 3, "#ffe04a") + C(64, 13, 3, "#ffe04a") +
        E(50, 60, 16, 24, b, d) +
        E(50, 40, 11, 12, b, d) +
        eyes(50, 38, 8, 5, true) +
        bolt(50, 70, 0.4)
      );
    },
  };


  /* Build the full SVG markup for a species. */
  function markup(speciesId) {
    const fn = CREATURES[speciesId];
    if (fn) return fn();
    /* Fallback: a plain blob in the species color. */
    const c = (window.GameData.SPECIES[speciesId] || {}).color || "#cccccc";
    return wrap(E(50, 58, 30, 28, c, "#333") + eyes(50, 52, 12, 6) + mouth(50, 66, 5));
  }

  function into(element, speciesId) {
    element.innerHTML = markup(speciesId);
  }

  window.CreatureArt = { markup: markup, into: into };


  /* ============================================================
     CharacterArt — the player and the people you meet
     ============================================================ */

  /* A simple cartoon person. opts: skin, hair, shirt, pants, hat, facing.
     facing ("down" | "up" | "left" | "right") shifts the eyes; "up"
     shows the back of the head. */
  function personSVG(o) {
    const facing = o.facing || "down";
    const topColor = o.hat || o.hair;
    let s = "";

    /* soft shadow */
    s += '<ellipse cx="20" cy="37.5" rx="9" ry="2.6" fill="rgba(0,0,0,0.16)"/>';
    /* legs */
    s += '<rect x="15" y="27" width="4.6" height="9.5" rx="2" fill="' + o.pants + '" stroke="#222" stroke-width="1"/>';
    s += '<rect x="20.4" y="27" width="4.6" height="9.5" rx="2" fill="' + o.pants + '" stroke="#222" stroke-width="1"/>';
    /* arms */
    s += '<rect x="8.5" y="18" width="4" height="10" rx="2" fill="' + o.shirt + '" stroke="#222" stroke-width="1"/>';
    s += '<rect x="27.5" y="18" width="4" height="10" rx="2" fill="' + o.shirt + '" stroke="#222" stroke-width="1"/>';
    /* body */
    s += '<rect x="11.5" y="16.5" width="17" height="13.5" rx="4.5" fill="' + o.shirt + '" stroke="#222" stroke-width="1.2"/>';
    /* head */
    s += '<circle cx="20" cy="11" r="7.5" fill="' + o.skin + '" stroke="#222" stroke-width="1.2"/>';

    if (facing === "up") {
      /* back of the head — cover the face with hair/hat colour */
      s += '<circle cx="20" cy="11" r="7" fill="' + topColor + '"/>';
    } else {
      let lx = 17, rx = 23;
      if (facing === "left") { lx = 15; rx = 18.5; }
      else if (facing === "right") { lx = 21.5; rx = 25; }
      s += '<circle cx="' + lx + '" cy="11.5" r="1.3" fill="#222"/>';
      s += '<circle cx="' + rx + '" cy="11.5" r="1.3" fill="#222"/>';
    }

    /* hair or hat on top */
    if (o.hat) {
      s += '<path d="M11.5 8.5 Q 20 0 28.5 8.5 Q 20 5.5 11.5 8.5 Z" fill="' + o.hat + '" stroke="#222" stroke-width="1"/>';
      s += '<rect x="11" y="7.5" width="18" height="2.6" rx="1.3" fill="' + o.hat + '" stroke="#222" stroke-width="1"/>';
    } else {
      s += '<path d="M12 9 Q 20 1 28 9 Q 24 5 20 5 Q 16 5 12 9 Z" fill="' + o.hair + '" stroke="#222" stroke-width="1"/>';
    }

    return '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" class="person-svg">' + s + '</svg>';
  }

  /* The player character — red cap, blue trousers. */
  function playerArt(facing) {
    return personSVG({
      skin: "#f0c89a", hair: "#5a3a1a", shirt: "#d23a3a",
      pants: "#2a4a8a", hat: "#d23a3a", facing: facing,
    });
  }

  /* Looks for the people you meet, keyed by NPC kind or trainer id. */
  const NPC_LOOKS = {
    nurse:      { skin: "#f1cda6", hair: "#d98a8a", shirt: "#f6f6f0", pants: "#e68a8a", hat: "#f6f6f0" },
    shopkeeper: { skin: "#e0b088", hair: "#5a4030", shirt: "#3a8f5a", pants: "#36362f", hat: null },
  };
  const TRAINER_LOOKS = {
    bramwen:     { skin: "#e8c0a0", hair: "#2f7f1f", shirt: "#5fbf3f", pants: "#3a5a2a", hat: null },
    cole:        { skin: "#d8b088", hair: "#1a3a5a", shirt: "#2a72b8", pants: "#16365a", hat: "#2a72b8" },
    scout_tam:   { skin: "#e8c0a0", hair: "#8a5a2a", shirt: "#d4a017", pants: "#6a4a2a", hat: "#c0451a" },
    camper_joss: { skin: "#d8a878", hair: "#3a2a1a", shirt: "#c0451a", pants: "#3a5a2a", hat: null },
    miner_dolf:  { skin: "#d8a878", hair: "#3a2a1a", shirt: "#7a6a4a", pants: "#4a4030", hat: "#e0b020" },
    skater_pia:  { skin: "#e8c4a0", hair: "#3a6f9a", shirt: "#5fc0d8", pants: "#2a4a6a", hat: null },
    frieda:      { skin: "#e8d0c0", hair: "#cfe4f0", shirt: "#7fc8e6", pants: "#3f6f96", hat: "#bfe9f5" },
  };

  /* Looks for the everyday townsfolk you can chat with, keyed by the
     NPC's `look` field. */
  const VILLAGER_LOOKS = {
    elder:    { skin: "#e8c8a8", hair: "#d8d8d0", shirt: "#7a6a8a", pants: "#4a4458", hat: null },
    farmer:   { skin: "#d8a878", hair: "#3a2a1a", shirt: "#6a9a4a", pants: "#5a4a2a", hat: "#d8b86a" },
    fisher:   { skin: "#e0b890", hair: "#2a3a4a", shirt: "#3a7a9a", pants: "#2a3a5a", hat: "#3a7a9a" },
    kid:      { skin: "#f0c89a", hair: "#8a5a2a", shirt: "#e0a020", pants: "#3a6a8a", hat: null },
    villager: { skin: "#e0b088", hair: "#5a4030", shirt: "#b06a4a", pants: "#4a4030", hat: null },
  };

  function npcArt(kind, trainerId, look) {
    let person;
    if (kind === "nurse") person = NPC_LOOKS.nurse;
    else if (kind === "shopkeeper") person = NPC_LOOKS.shopkeeper;
    else if (trainerId && TRAINER_LOOKS[trainerId]) person = TRAINER_LOOKS[trainerId];
    else if (look && VILLAGER_LOOKS[look]) person = VILLAGER_LOOKS[look];
    else if (kind === "person") person = VILLAGER_LOOKS.villager;
    else person = { skin: "#e0b088", hair: "#444444", shirt: "#8a8a8a", pants: "#444444", hat: null };
    return personSVG({
      skin: person.skin, hair: person.hair, shirt: person.shirt,
      pants: person.pants, hat: person.hat, facing: "down",
    });
  }

  window.CharacterArt = { player: playerArt, npc: npcArt };


  /* ============================================================
     TileArt — decorative furniture drawn on top of decor tiles
     ============================================================ */
  const DECOR = {
    plant: function () {
      return '<ellipse cx="20" cy="35" rx="9" ry="2.5" fill="rgba(0,0,0,0.15)"/>' +
        '<polygon points="13,36 27,36 25,26 15,26" fill="#c0703a" stroke="#7a3f16" stroke-width="1.5"/>' +
        '<rect x="12.5" y="23.5" width="15" height="3.8" rx="1" fill="#d9874a" stroke="#7a3f16" stroke-width="1.2"/>' +
        '<path d="M20 25 Q 9 18 7 5 Q 18 11 20 25 Z" fill="#5fbf3f" stroke="#2f7f1f" stroke-width="1.2"/>' +
        '<path d="M20 25 Q 31 18 33 5 Q 22 11 20 25 Z" fill="#6fce4f" stroke="#2f7f1f" stroke-width="1.2"/>' +
        '<path d="M20 25 Q 20 13 20 3 Q 25 13 20 25 Z" fill="#52a832" stroke="#2f7f1f" stroke-width="1.2"/>';
    },
    counter: function () {
      return '<rect x="2" y="7" width="36" height="29" rx="2" fill="#b88a4a" stroke="#6e4a1e" stroke-width="2"/>' +
        '<rect x="2" y="7" width="36" height="7" rx="2" fill="#d8aa68" stroke="#6e4a1e" stroke-width="1.5"/>' +
        '<line x1="15" y1="14" x2="15" y2="36" stroke="#6e4a1e" stroke-width="1.5"/>' +
        '<line x1="27" y1="14" x2="27" y2="36" stroke="#6e4a1e" stroke-width="1.5"/>';
    },
    shelf: function () {
      return '<rect x="3" y="3" width="34" height="34" rx="2" fill="#9a7a4a" stroke="#5e4422" stroke-width="2"/>' +
        '<rect x="3" y="14" width="34" height="3" fill="#6e4f28"/>' +
        '<rect x="3" y="25" width="34" height="3" fill="#6e4f28"/>' +
        '<rect x="7" y="7" width="5" height="6" fill="#d23a3a"/>' +
        '<rect x="14" y="7" width="5" height="6" fill="#3a8fd2"/>' +
        '<rect x="22" y="8" width="5" height="5" fill="#e0b020"/>' +
        '<rect x="29" y="7" width="4" height="6" fill="#5fbf3f"/>' +
        '<rect x="8" y="19" width="5" height="5" fill="#9c4dcc"/>' +
        '<rect x="16" y="18" width="6" height="6" fill="#e07a2a"/>' +
        '<rect x="26" y="19" width="5" height="5" fill="#3ac0b0"/>';
    },
    machine: function () {
      return '<rect x="5" y="11" width="30" height="25" rx="3" fill="#cfd6dc" stroke="#5a6a72" stroke-width="2"/>' +
        '<rect x="10" y="17" width="20" height="11" rx="2" fill="#2a3a44"/>' +
        '<rect x="12" y="19" width="7" height="3" rx="1" fill="#5fd0a0"/>' +
        '<circle cx="13" cy="10" r="3.4" fill="#ff6a8a" stroke="#5a6a72" stroke-width="1.2"/>' +
        '<circle cx="20" cy="9" r="3.4" fill="#ff6a8a" stroke="#5a6a72" stroke-width="1.2"/>' +
        '<circle cx="27" cy="10" r="3.4" fill="#ff6a8a" stroke="#5a6a72" stroke-width="1.2"/>';
    },
  };

  function decorSVG(type) {
    const fn = DECOR[type];
    if (!fn) return "";
    return '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" class="decor-svg">' +
      fn() + "</svg>";
  }

  /* A collectible item lying on the ground — a small shiny orb. */
  function itemSVG() {
    return '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" class="item-svg">' +
      '<ellipse cx="20" cy="32" rx="7" ry="2.4" fill="rgba(0,0,0,0.2)"/>' +
      '<circle cx="20" cy="19" r="8.5" fill="#ffd24a" stroke="#9a6b00" stroke-width="2.2"/>' +
      '<rect x="11.5" y="17.6" width="17" height="2.8" fill="#9a6b00"/>' +
      '<circle cx="20" cy="19" r="2.6" fill="#fff" stroke="#9a6b00" stroke-width="1.4"/>' +
      '<circle cx="16.6" cy="15.4" r="2" fill="rgba(255,255,255,0.75)"/>' +
      "</svg>";
  }

  window.TileArt = { decor: decorSVG, item: itemSVG };
})();
