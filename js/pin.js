/* =========================================================================
   PIN.JS
   Handles the PIN screen: character GIF loading, keypad input,
   validation against CONFIG.pin, error/success states, and handoff
   to the anniversary page.
   ========================================================================= */

const PinScreen = (() => {

  let entered = "";
  let locked = false;

  function populateCopy() {
    document.getElementById("pinHeading").textContent = CONFIG.pinScreen.heading;
    document.getElementById("pinSubheading").textContent = CONFIG.pinScreen.subheading;
    const gif = document.getElementById("characterGif");
    gif.src = CONFIG.media.characterGif;
    gif.onerror = () => {
      // graceful fallback if the external GIF URL fails to load
      document.getElementById("characterWrap").style.display = "none";
    };
  }

  function renderDots() {
    const dots = document.querySelectorAll(".pin-dot");
    dots.forEach((dot, i) => {
      dot.classList.toggle("is-filled", i < entered.length);
    });
  }

  function showError(message) {
    const errorEl = document.getElementById("pinError");
    const dotsEl = document.getElementById("pinDots");
    errorEl.textContent = message;
    errorEl.classList.add("is-visible");
    dotsEl.classList.add("is-error", "is-shake");
    setTimeout(() => dotsEl.classList.remove("is-shake"), 500);
  }

  function clearError() {
    const errorEl = document.getElementById("pinError");
    const dotsEl = document.getElementById("pinDots");
    errorEl.classList.remove("is-visible");
    dotsEl.classList.remove("is-error");
  }

  function reset() {
    entered = "";
    renderDots();
  }

  function handleSuccess() {
    locked = true;
    clearError();
    const dotsEl = document.getElementById("pinDots");
    dotsEl.classList.add("is-success");
    Ambient.burstConfetti();
    MusicManager.playIntro();
    setTimeout(() => {
      App.goToAnniversaryPage();
    }, 1100);
  }

  function handleWrong() {
    showError(CONFIG.pinScreen.wrongPin);
    setTimeout(() => {
      reset();
    }, 550);
  }

  function submitDigit(digit) {
    if (locked || entered.length >= 4) return;
    clearError();
    entered += digit;
    renderDots();
    if (entered.length === 4) {
      setTimeout(() => {
        if (entered === CONFIG.pin) {
          handleSuccess();
        } else {
          handleWrong();
        }
      }, 220);
    }
  }

  function backspace() {
    if (locked || entered.length === 0) return;
    entered = entered.slice(0, -1);
    renderDots();
    clearError();
  }

  function showHint() {
    const hintBtn = document.querySelector('[data-key="hint"]');
    hintBtn.classList.add("is-hinting");
    const errorEl = document.getElementById("pinError");
    errorEl.textContent = "Hint: it's the month and day we became official.";
    errorEl.style.color = "#9fb4ff";
    errorEl.classList.add("is-visible");
    setTimeout(() => {
      hintBtn.classList.remove("is-hinting");
      errorEl.classList.remove("is-visible");
      errorEl.style.color = "";
    }, 2600);
  }

  function bindKeypad() {
    document.getElementById("pinKeypad").addEventListener("click", (e) => {
      const btn = e.target.closest(".pin-key");
      if (!btn) return;
      const key = btn.dataset.key;
      if (key === "back") return backspace();
      if (key === "hint") return showHint();
      submitDigit(key);
    });

    document.addEventListener("keydown", (e) => {
      if (document.getElementById("pinScreen").hidden) return;
      if (/^[0-9]$/.test(e.key)) submitDigit(e.key);
      if (e.key === "Backspace") backspace();
    });
  }

  function init() {
    populateCopy();
    renderDots();
    bindKeypad();
  }

  return { init };
})();
