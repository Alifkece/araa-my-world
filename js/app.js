/* =========================================================================
   APP.JS
   Main orchestrator: populates content from CONFIG, wires up the
   loading screen, page transitions, live counter, video player,
   envelope/letter, 100 reasons grid, and the CTA into the planet page.
   ========================================================================= */

const App = (() => {

  let counterInterval = null;
  const AUTH_KEY = "annUnlocked";

  /* -----------------------------------------------------------------
     PIN / HISTORY GUARD
     -----------------------------------------------------------------
     Without this, the page has no real navigation history at all: a
     single Back press could leave the site, and some mobile browsers
     restore the exact previous DOM from the back-forward cache (bfcache)
     when the person comes back — including an already-unlocked
     anniversary page — which bypassed the PIN entirely. This adds a
     real history entry on unlock and re-locks on any back/forward
     navigation or bfcache restore that isn't that unlocked entry.
     ----------------------------------------------------------------- */
  function isAuthenticated() {
    try { return sessionStorage.getItem(AUTH_KEY) === "1"; } catch (e) { return false; }
  }

  function markAuthenticated() {
    try { sessionStorage.setItem(AUTH_KEY, "1"); } catch (e) {}
  }

  function relockToPinScreen() {
    document.getElementById("annPage").hidden = true;
    document.getElementById("planetPage").hidden = true;
    document.getElementById("pinScreen").style.display = "";
    PlanetPage.leave();
    window.scrollTo(0, 0);
    // Note: the session flag is intentionally NOT cleared here — it just
    // means "the correct PIN was entered at least once in this tab".
    // Re-locking on Back always hides the content regardless of the flag;
    // the flag only lets a subsequent Forward (within the same tab/session)
    // restore the view instead of demanding the PIN again.
  }

  function restoreUnlockedView() {
    document.getElementById("pinScreen").style.display = "none";
    document.getElementById("annPage").hidden = false;
    document.getElementById("planetPage").hidden = true;
  }

  function unlock() {
    markAuthenticated();
    try { history.pushState({ annStep: "unlocked" }, ""); } catch (e) {}
  }

  function initHistoryGuard() {
    try {
      history.replaceState({ annStep: isAuthenticated() ? "unlocked" : "locked" }, "");
    } catch (e) {}

    window.addEventListener("popstate", (e) => {
      const step = e.state && e.state.annStep;
      if (step === "unlocked" && isAuthenticated()) {
        restoreUnlockedView();
      } else {
        relockToPinScreen();
      }
    });

    // Some mobile browsers restore a cached page (including the DOM as it
    // looked when the person left) instead of re-running this script —
    // re-check real auth state whenever that happens.
    window.addEventListener("pageshow", (e) => {
      if (e.persisted && !isAuthenticated()) relockToPinScreen();
    });
  }

  /* -----------------------------------------------------------------
     LOADING SCREEN
     ----------------------------------------------------------------- */
  function hideLoadingScreen() {
    const screen = document.getElementById("loadingScreen");
    if (!screen) return;
    screen.classList.add("is-hidden");
    setTimeout(() => screen.remove(), 1000);
  }

  /* -----------------------------------------------------------------
     ANNIVERSARY PAGE — populate copy from config
     ----------------------------------------------------------------- */
  function populateAnniversaryCopy() {
    document.getElementById("annEyebrow").textContent = CONFIG.anniversaryPage.eyebrow;
    document.getElementById("annTitle").textContent = CONFIG.anniversaryPage.title;
    document.getElementById("annSubtitle").textContent = CONFIG.anniversaryPage.subtitle;
    document.getElementById("annName").textContent = CONFIG.recipientName;
    document.getElementById("profilePhoto").src = CONFIG.media.profilePhoto;

    document.getElementById("envelopeLabel").textContent = CONFIG.letter.envelopeLabel;
    document.getElementById("letterHeading").textContent = CONFIG.letter.heading;

    const video = document.getElementById("annVideo");
    video.src = CONFIG.media.video;
  }

  /* -----------------------------------------------------------------
     LIVE COUNTER
     ----------------------------------------------------------------- */
  function startCounter() {
    const start = new Date(CONFIG.anniversaryDate).getTime();
    function tick() {
      const now = Date.now();
      let diff = Math.max(0, now - start);
      const day = 24 * 60 * 60 * 1000;
      const hour = 60 * 60 * 1000;
      const minute = 60 * 1000;

      const days = Math.floor(diff / day);
      diff -= days * day;
      const hours = Math.floor(diff / hour);
      diff -= hours * hour;
      const minutes = Math.floor(diff / minute);
      diff -= minutes * minute;
      const seconds = Math.floor(diff / 1000);

      document.getElementById("cDays").textContent = days.toLocaleString();
      document.getElementById("cHours").textContent = String(hours).padStart(2, "0");
      document.getElementById("cMinutes").textContent = String(minutes).padStart(2, "0");
      document.getElementById("cSeconds").textContent = String(seconds).padStart(2, "0");
    }
    tick();
    counterInterval = setInterval(tick, 1000);
  }

  /* -----------------------------------------------------------------
     VIDEO PLAYER — ducks background music while playing
     ----------------------------------------------------------------- */
  function bindVideoPlayer() {
    const player = document.getElementById("videoPlayer");
    const video = document.getElementById("annVideo");
    const playBtn = document.getElementById("videoPlayBtn");

    playBtn.addEventListener("click", () => {
      video.currentTime = 0;
      video.muted = false;
      video.controls = true; // once played, hand the person real pause/seek/replay controls
      video.play().catch(() => {});
      player.classList.add("is-playing");
    });

    // duck/restore off the real media events so it stays correct whether
    // playback is (re)started/paused from the custom button or the
    // native controls revealed after first play
    video.addEventListener("play", () => MusicManager.duckForVideo());

    video.addEventListener("ended", () => {
      player.classList.remove("is-playing");
      MusicManager.restoreAfterVideo();
    });

    video.addEventListener("pause", () => {
      if (video.currentTime > 0 && !video.ended) {
        MusicManager.restoreAfterVideo();
      }
    });
  }

  /* -----------------------------------------------------------------
     ENVELOPE / LETTER — opens on seal click, types the letter out
     ----------------------------------------------------------------- */
  let letterTyped = false;

  function typeLetter() {
    if (letterTyped) return;
    letterTyped = true;
    const bodyEl = document.getElementById("letterBody");
    bodyEl.textContent = "";

    // Split on blank lines so every paragraph in config.js becomes its own
    // real <p>, preserving paragraph spacing and structure instead of
    // relying on a single pre-line text blob.
    const paragraphs = CONFIG.letter.body
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(Boolean);

    let pIndex = 0;
    let cIndex = 0;
    const charSpeed = 14;        // ms per character
    const paragraphPause = 260;  // pause between paragraphs, feels intentional

    function typeNext() {
      if (pIndex >= paragraphs.length) return;

      let p = bodyEl.querySelector(".letter-p--typing");
      if (!p) {
        p = document.createElement("p");
        p.className = "letter-p letter-p--typing";
        bodyEl.appendChild(p);
      }

      const text = paragraphs[pIndex];
      if (cIndex < text.length) {
        // every character is appended in order — nothing is ever skipped,
        // so line breaks within a paragraph (e.g. from a manual \n) and
        // punctuation always survive intact.
        p.textContent += text[cIndex];
        cIndex++;
        setTimeout(typeNext, charSpeed);
      } else {
        p.classList.remove("letter-p--typing");
        pIndex++;
        cIndex = 0;
        setTimeout(typeNext, paragraphPause);
      }
    }
    typeNext();
  }

  function bindEnvelope() {
    const envelope = document.getElementById("envelope");
    const seal = document.getElementById("envelope__seal") || document.querySelector(".envelope__seal");
    const hint = document.getElementById("envelopeHint");

    function open() {
      envelope.classList.add("is-open");
      hint.textContent = "Take your time.";
      setTimeout(typeLetter, 600);
    }

    seal.addEventListener("click", open);
    envelope.querySelector(".envelope__front").addEventListener("click", () => {
      if (!envelope.classList.contains("is-open")) open();
    });
  }

  /* -----------------------------------------------------------------
     100 REASONS GRID
     ----------------------------------------------------------------- */
  function buildReasonsGrid() {
    const grid = document.getElementById("reasonsGrid");
    const fragment = document.createDocumentFragment();
    const cards = [];

    CONFIG.reasons.forEach((reason, i) => {
      const card = document.createElement("div");
      card.className = "reason-card";
      const num = document.createElement("span");
      num.className = "reason-card__index";
      num.textContent = String(i + 1).padStart(3, "0");
      const text = document.createElement("p");
      text.style.margin = "0";
      text.textContent = reason;
      card.appendChild(num);
      card.appendChild(text);
      fragment.appendChild(card);
      cards.push(card);
    });
    grid.appendChild(fragment);

    revealReasonsGrid(grid, cards);
  }

  // Staggered "bubble" reveal for the reason cards: triggers once when the
  // Reasons section enters the viewport, then fades/scales/un-blurs each
  // card in one after another. Plays once — the observer unobserves itself,
  // so scrolling back up and down again never replays it.
  const REASONS_STAGGER_MS = 50;

  function revealReasonsGrid(grid, cards) {
    const playBubbleReveal = () => {
      cards.forEach((card, i) => {
        card.style.transitionDelay = `${i * REASONS_STAGGER_MS}ms`;
        card.classList.add("is-visible");
      });
      // Drop the inline transition-delay / will-change once every card has
      // finished animating, so they don't linger on 100 elements forever
      // and interfere with the (much shorter) hover transition.
      const settleTime = cards.length * REASONS_STAGGER_MS + 700;
      setTimeout(() => {
        cards.forEach(card => {
          card.style.transitionDelay = "";
          card.style.willChange = "auto";
        });
      }, settleTime);
    };

    if (!("IntersectionObserver" in window)) {
      playBubbleReveal();
      return;
    }

    // Observe the section itself rather than each card individually: the
    // section is ~100 cards tall, far taller than any phone screen, so
    // this needs threshold: 0 (fire as soon as any pixel is visible)
    // rather than a percentage-of-area threshold — the same issue that
    // was hiding the whole section on mobile (see animation.js).
    const section = grid.closest(".reasons-section") || grid;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          playBubbleReveal();
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: "0px 0px -10% 0px" });
    io.observe(section);

    // Safety net: guarantee the grid can never end up stuck fully hidden.
    setTimeout(() => {
      if (cards.some(c => !c.classList.contains("is-visible"))) {
        io.unobserve(section);
        playBubbleReveal();
      }
    }, 4000);
  }

  /* -----------------------------------------------------------------
     CTA — RIPPLE + NAVIGATE TO PLANET
     ----------------------------------------------------------------- */
  function bindCTA() {
    const btn = document.getElementById("visitPlanetBtn");
    btn.addEventListener("click", (e) => {
      const rect = btn.getBoundingClientRect();
      const ripple = btn.querySelector(".glow-button__ripple");
      const size = Math.max(rect.width, rect.height) * 2;
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      btn.classList.remove("is-rippling");
      void btn.offsetWidth;
      btn.classList.add("is-rippling");

      setTimeout(() => goToPlanetPage(), 260);
    });
  }

  /* -----------------------------------------------------------------
     PAGE NAVIGATION
     ----------------------------------------------------------------- */
  function goToAnniversaryPage(opts = {}) {
    document.getElementById("pinScreen").style.display = "none";
    document.getElementById("planetPage").hidden = true;
    document.getElementById("annPage").hidden = false;
    document.body.style.overflow = "";
    window.scrollTo({ top: opts.fromPlanet ? window.scrollY : 0, behavior: "instant" in window ? "instant" : "auto" });

    if (opts.fromPlanet) {
      PlanetPage.leave();
      MusicManager.crossfadeToIntro();
    }

    Ambient.startScrollReveal();
  }

  function goToPlanetPage() {
    document.getElementById("annPage").hidden = true;
    document.getElementById("planetPage").hidden = false;
    window.scrollTo(0, 0);
    PlanetPage.enter();
    MusicManager.crossfadeToPlanet();
  }

  /* -----------------------------------------------------------------
     INIT
     ----------------------------------------------------------------- */
  function init() {
    populateAnniversaryCopy();
    bindVideoPlayer();
    bindEnvelope();
    buildReasonsGrid();
    bindCTA();
    startCounter();

    PinScreen.init();
    PlanetPage.init();
    initHistoryGuard();

    if (isAuthenticated()) {
      document.getElementById("pinScreen").style.display = "none";
      document.getElementById("annPage").hidden = false;
      Ambient.startScrollReveal();
    }

    // simulate a brief, elegant loading sequence
    window.addEventListener("load", () => {
      setTimeout(hideLoadingScreen, 1200);
    });
    // fallback in case 'load' already fired
    setTimeout(hideLoadingScreen, 3000);
  }

  document.addEventListener("DOMContentLoaded", init);

  return { goToAnniversaryPage, goToPlanetPage, unlock };
})();
