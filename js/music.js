/* =========================================================================
   MUSIC.JS
   Small audio manager that handles crossfades between the intro track
   and the planet track, plus ducking while the memory video plays.
   ========================================================================= */

const MusicManager = (() => {

  let introAudio = null;
  let planetAudio = null;
  let currentTrack = null; // "intro" | "planet" | null
  let muted = false;
  const TARGET_VOLUME = 0.55;
  const FADE_STEP_MS = 60;

  // Built lazily and *separately* so entering the anniversary page doesn't
  // simultaneously kick off a competing preload of the planet track right
  // when the intro track needs bandwidth to start immediately.
  function buildIntro() {
    if (introAudio) return;
    introAudio = new Audio(CONFIG.media.introMusic);
    introAudio.loop = true;
    introAudio.volume = 0;
    introAudio.preload = "auto";
  }

  function buildPlanet() {
    if (planetAudio) return;
    planetAudio = new Audio(CONFIG.media.planetMusic);
    planetAudio.loop = true;
    planetAudio.volume = 0;
    planetAudio.preload = "auto";
  }

  function fade(audio, to, duration = 900) {
    return new Promise((resolve) => {
      if (!audio) return resolve();
      const from = audio.volume;
      const steps = Math.max(1, Math.floor(duration / FADE_STEP_MS));
      let step = 0;
      clearInterval(audio._fadeTimer);
      audio._fadeTimer = setInterval(() => {
        step++;
        const progress = step / steps;
        audio.volume = Math.max(0, Math.min(1, from + (to - from) * progress));
        if (step >= steps) {
          clearInterval(audio._fadeTimer);
          audio.volume = to;
          if (to === 0) audio.pause();
          resolve();
        }
      }, FADE_STEP_MS);
    });
  }

  // fades an <audio> element up to a target volume, making sure playback
  // is actually (re)started first — fading the volume of a paused element
  // has no audible effect, which was silently swallowing the "resume
  // intro music after the video ends" and "unmute" transitions.
  function fadeIn(audio, to, duration) {
    if (!audio) return Promise.resolve();
    if (audio.paused) {
      // Don't silently swallow play() failures — log them so a real
      // playback problem (bad file, decode error, autoplay block) is
      // visible instead of silently doing nothing.
      return audio.play().then(() => fade(audio, to, duration)).catch((err) => {
        console.error("[MusicManager] play() failed for", audio.src, "-", err.name + ":", err.message);
      });
    }
    return fade(audio, to, duration);
  }

  async function playIntro() {
    if (!introAudio) buildIntro();
    currentTrack = "intro";
    if (muted) return;
    await fadeIn(introAudio, TARGET_VOLUME, 1200);
  }

  async function crossfadeToPlanet() {
    if (!introAudio) buildIntro();
    if (!planetAudio) buildPlanet();
    currentTrack = "planet";
    if (muted) {
      await fade(introAudio, 0, 300);
      return;
    }
    // sequential, not overlapping: the intro track must be fully silent
    // and paused before the planet track starts, so only one track is
    // ever audible at a time.
    await fade(introAudio, 0, 700);
    await fadeIn(planetAudio, TARGET_VOLUME, 900);
  }

  async function crossfadeToIntro() {
    if (!introAudio) buildIntro();
    currentTrack = "intro";
    if (muted) {
      await fade(planetAudio, 0, 300);
      return;
    }
    await fade(planetAudio, 0, 700);
    await fadeIn(introAudio, TARGET_VOLUME, 900);
  }

  function duckForVideo() {
    const active = currentTrack === "planet" ? planetAudio : introAudio;
    fade(active, 0, 700);
  }

  function restoreAfterVideo() {
    if (muted) return;
    const active = currentTrack === "planet" ? planetAudio : introAudio;
    fadeIn(active, TARGET_VOLUME, 900);
  }

  function toggleMute() {
    muted = !muted;
    const active = currentTrack === "planet" ? planetAudio : introAudio;
    if (!active) return muted;
    if (muted) {
      fade(active, 0, 400);
    } else {
      fadeIn(active, TARGET_VOLUME, 600);
    }
    return muted;
  }

  function isMuted() { return muted; }

  return {
    playIntro,
    crossfadeToPlanet,
    crossfadeToIntro,
    duckForVideo,
    restoreAfterVideo,
    toggleMute,
    isMuted,
  };
})();
