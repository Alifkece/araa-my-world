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

  function build() {
    introAudio = new Audio(CONFIG.media.introMusic);
    introAudio.loop = true;
    introAudio.volume = 0;
    introAudio.preload = "auto";

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

  async function playIntro() {
    if (!introAudio) build();
    currentTrack = "intro";
    if (muted) return;
    try { await introAudio.play(); } catch (e) { /* autoplay may be blocked until interaction */ }
    fade(introAudio, TARGET_VOLUME, 1200);
  }

  async function crossfadeToPlanet() {
    if (!planetAudio) build();
    currentTrack = "planet";
    if (muted) {
      fade(introAudio, 0, 300);
      return;
    }
    try { await planetAudio.play(); } catch (e) {}
    fade(introAudio, 0, 1400);
    fade(planetAudio, TARGET_VOLUME, 1600);
  }

  async function crossfadeToIntro() {
    if (!introAudio) build();
    currentTrack = "intro";
    if (muted) {
      fade(planetAudio, 0, 300);
      return;
    }
    try { await introAudio.play(); } catch (e) {}
    fade(planetAudio, 0, 1400);
    fade(introAudio, TARGET_VOLUME, 1600);
  }

  function duckForVideo() {
    const active = currentTrack === "planet" ? planetAudio : introAudio;
    fade(active, 0, 700);
  }

  function restoreAfterVideo() {
    if (muted) return;
    const active = currentTrack === "planet" ? planetAudio : introAudio;
    fade(active, TARGET_VOLUME, 900);
  }

  function toggleMute() {
    muted = !muted;
    const active = currentTrack === "planet" ? planetAudio : introAudio;
    if (muted) {
      fade(active, 0, 400);
    } else {
      if (active.paused) active.play().catch(() => {});
      fade(active, TARGET_VOLUME, 600);
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
