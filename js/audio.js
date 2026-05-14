/* ===== audio.js — synthesized sound effects =====
   Every sound is generated at runtime with the Web Audio API — there
   are no audio files, so the game stays a single self-contained folder
   that runs by opening index.html. The bleepy tones suit the retro look.

   Browsers start an AudioContext suspended until a user gesture, so
   main.js calls Sound.unlock() on the first key/tap. If Web Audio is
   unavailable every call simply does nothing.

   Everything is on window.Sound for the other script files to use. */

(function () {
  let ctx = null;
  let muted = false;

  function getCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    return ctx;
  }

  /* Play one tone. opts: { freq, dur, type, volume, delay, freqEnd } */
  function tone(opts) {
    if (muted) return;
    const ac = getCtx();
    if (!ac) return;

    const t0 = ac.currentTime + (opts.delay || 0);
    const dur = opts.dur || 0.1;
    const vol = opts.volume == null ? 0.14 : opts.volume;

    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = opts.type || "square";
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(opts.freqEnd, t0 + dur);
    }

    /* A quick attack and a decay to near-zero — exponential ramps can't
       reach 0, so we fade to a tiny value instead. */
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /* Play notes one after another. notes: [{ freq, dur, volume, type }] */
  function sequence(notes, type) {
    let t = 0;
    notes.forEach(function (n) {
      tone({ freq: n.freq, dur: n.dur, type: n.type || type, volume: n.volume, delay: t });
      t += n.dur;
    });
  }

  const Sound = {
    isMuted: function () { return muted; },
    setMuted: function (m) { muted = !!m; },

    /* Resume the AudioContext — must be called from a user gesture. */
    unlock: function () {
      const ac = getCtx();
      if (ac && ac.state === "suspended") ac.resume();
    },

    /* ---- named effects ---- */
    select: function () {
      tone({ freq: 660, dur: 0.06, type: "square", volume: 0.08 });
    },
    hit: function () {
      tone({ freq: 200, freqEnd: 90, dur: 0.12, type: "square", volume: 0.14 });
    },
    superEffective: function () {
      sequence([{ freq: 520, dur: 0.07 }, { freq: 720, dur: 0.07 }, { freq: 950, dur: 0.11 }], "square");
    },
    notVeryEffective: function () {
      tone({ freq: 170, freqEnd: 110, dur: 0.2, type: "triangle", volume: 0.12 });
    },
    faint: function () {
      tone({ freq: 330, freqEnd: 70, dur: 0.5, type: "sawtooth", volume: 0.13, delay: 0.05 });
    },
    levelUp: function () {
      sequence([
        { freq: 523, dur: 0.09 }, { freq: 659, dur: 0.09 },
        { freq: 784, dur: 0.09 }, { freq: 1047, dur: 0.18 },
      ], "square");
    },
    evolve: function () {
      sequence([
        { freq: 392, dur: 0.12 }, { freq: 523, dur: 0.12 }, { freq: 659, dur: 0.12 },
        { freq: 784, dur: 0.12 }, { freq: 1047, dur: 0.26 },
      ], "triangle");
    },
    catchSuccess: function () {
      sequence([{ freq: 660, dur: 0.1 }, { freq: 880, dur: 0.1 }, { freq: 1175, dur: 0.24 }], "square");
    },
    heal: function () {
      sequence([{ freq: 784, dur: 0.1 }, { freq: 1047, dur: 0.2 }], "sine");
    },
    encounter: function () {
      sequence([
        { freq: 880, dur: 0.07 }, { freq: 587, dur: 0.07 },
        { freq: 880, dur: 0.07 }, { freq: 587, dur: 0.14 },
      ], "square");
    },
  };

  window.Sound = Sound;
})();
