/* =========================================================================
   PLANET.JS
   Builds the orbiting photo system around the planet, and handles the
   photo popup modal + sound toggle + back navigation.
   ========================================================================= */

const PlanetPage = (() => {

  let built = false;

  function populateCopy() {
    document.getElementById("planetTitle").textContent = CONFIG.planet.title;
    document.getElementById("planetSubtitle").textContent = CONFIG.planet.subtitle;
  }

  function randRange(min, max) { return min + Math.random() * (max - min); }

  function vwToPx(vw) { return (vw / 100) * window.innerWidth; }

  function buildOrbits() {
    if (built) return;
    built = true;

    const field = document.getElementById("orbitField");
    const photos = CONFIG.media.planetPhotos;
    const total = CONFIG.planet.photoCount;
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < total; i++) {
      const photoSrc = photos[i % photos.length];

      const orbit = document.createElement("div");
      orbit.className = "orbit";

      const radiusVW = randRange(CONFIG.planet.minRadiusVW, CONFIG.planet.maxRadiusVW);
      const radiusPx = Math.max(90, vwToPx(radiusVW));
      const duration = randRange(CONFIG.planet.minDurationSec, CONFIG.planet.maxDurationSec);
      const delay = -randRange(0, duration); // negative delay = random start position along orbit
      const direction = Math.random() > 0.5 ? "normal" : "reverse";
      const startAngle = randRange(0, 360);

      orbit.style.setProperty("--dur", `${duration.toFixed(1)}s`);
      orbit.style.setProperty("--delay", `${delay.toFixed(1)}s`);
      orbit.style.setProperty("--dir", direction);
      orbit.style.transform = `translate(-50%, -50%) rotate(${startAngle}deg)`;

      const card = document.createElement("div");
      card.className = "orbit-card";
      const size = randRange(38, 78);
      const scale = randRange(0.85, 1.15);
      card.style.setProperty("--size", `${size.toFixed(0)}px`);
      card.style.setProperty("--radius", `${radiusPx.toFixed(0)}px`);
      card.style.setProperty("--scale", scale.toFixed(2));
      card.style.animationDelay = `${randRange(0, 1.2).toFixed(2)}s`;
      card.dataset.src = photoSrc;
      card.dataset.index = i;

      const img = document.createElement("img");
      img.src = photoSrc;
      img.loading = "lazy";
      img.alt = "A shared memory";
      card.appendChild(img);

      card.addEventListener("click", () => openModal(photoSrc));

      orbit.appendChild(card);
      fragment.appendChild(orbit);
    }

    field.appendChild(fragment);
  }

  /* -----------------------------------------------------------------
     PHOTO MODAL
     ----------------------------------------------------------------- */
  function openModal(src) {
    const modal = document.getElementById("photoModal");
    const img = document.getElementById("photoModalImg");
    img.src = src;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    const modal = document.getElementById("photoModal");
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  function bindModal() {
    document.getElementById("photoModalClose").addEventListener("click", closeModal);
    document.getElementById("photoModalBackdrop").addEventListener("click", closeModal);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  }

  /* -----------------------------------------------------------------
     SOUND TOGGLE
     ----------------------------------------------------------------- */
  function bindSoundToggle() {
    const btn = document.getElementById("soundToggle");
    btn.addEventListener("click", () => {
      const muted = MusicManager.toggleMute();
      btn.querySelector(".sound-toggle__on").hidden = muted;
      btn.querySelector(".sound-toggle__off").hidden = !muted;
    });
  }

  /* -----------------------------------------------------------------
     BACK BUTTON
     ----------------------------------------------------------------- */
  function bindBack() {
    document.getElementById("planetBackBtn").addEventListener("click", () => {
      App.goToAnniversaryPage({ fromPlanet: true });
    });
  }

  function enter() {
    populateCopy();
    buildOrbits();
  }

  function init() {
    bindModal();
    bindSoundToggle();
    bindBack();
  }

  return { init, enter };
})();
