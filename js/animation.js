/* =========================================================================
   ANIMATION.JS
   Ambient background (stars, hearts, shooting stars), scroll reveal,
   mouse parallax, and the PIN-success confetti burst.
   ========================================================================= */

const Ambient = (() => {

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------
     STAR FIELD — generated once as a repeating radial-gradient tile
     --------------------------------------------------------------- */
  function buildStarField() {
    const field = document.getElementById("starField");
    if (!field) return;
    const layers = [];
    for (let i = 0; i < 3; i++) {
      const canvas = document.createElement("canvas");
      const size = 320;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      const count = 60 + i * 20;
      for (let s = 0; s < count; s++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = Math.random() * (i === 2 ? 1.1 : 1.6) + 0.2;
        const alpha = Math.random() * 0.6 + 0.3;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();
      }
      layers.push(canvas.toDataURL());
    }
    field.style.backgroundImage = layers.map(l => `url(${l})`).join(",");
    field.style.backgroundSize = "420px 420px, 640px 640px, 900px 900px";
    field.style.backgroundPosition = "0 0, 0 0, 0 0";
    field.style.animation = prefersReducedMotion ? "none" : "starDrift 140s linear infinite";
    if (!document.getElementById("starDriftKeyframe")) {
      const style = document.createElement("style");
      style.id = "starDriftKeyframe";
      style.textContent = `
        @keyframes starDrift {
          from { background-position: 0 0, 0 0, 0 0; }
          to { background-position: -420px 300px, 500px -400px, -700px 600px; }
        }`;
      document.head.appendChild(style);
    }
  }

  /* ---------------------------------------------------------------
     FLOATING HEARTS
     --------------------------------------------------------------- */
  const heartSVG = `<svg viewBox="0 0 24 24" fill="none"><path d="M12 21s-7.6-4.7-10.1-9C.3 8.6 1.7 5.2 5 4.6c2-.4 3.8.5 5 2.2 1.2-1.7 3-2.6 5-2.2 3.3.6 4.7 4 3.1 7.4C19.6 16.3 12 21 12 21Z" fill="currentColor"/></svg>`;

  function spawnHeart(container) {
    if (!container) return;
    const el = document.createElement("div");
    el.className = "floating-heart";
    el.innerHTML = heartSVG;
    const size = 10 + Math.random() * 16;
    const left = Math.random() * 100;
    const duration = 9 + Math.random() * 8;
    const drift = (Math.random() - 0.5) * 120;
    const opacity = 0.25 + Math.random() * 0.35;
    el.style.left = `${left}vw`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.setProperty("--drift", `${drift}px`);
    el.style.setProperty("--s", (0.7 + Math.random() * 0.8).toFixed(2));
    el.style.setProperty("--o", opacity.toFixed(2));
    el.style.animationDuration = `${duration}s`;
    container.appendChild(el);
    setTimeout(() => el.remove(), duration * 1000 + 500);
  }

  function startHeartLoop() {
    const container = document.getElementById("heartField");
    if (!container || prefersReducedMotion) return;
    const tick = () => {
      spawnHeart(container);
      setTimeout(tick, 1400 + Math.random() * 1600);
    };
    tick();
  }

  /* ---------------------------------------------------------------
     SHOOTING STARS
     --------------------------------------------------------------- */
  function spawnShootingStar(container) {
    if (!container) return;
    const el = document.createElement("div");
    el.className = "shooting-star";
    const top = Math.random() * 50;
    const left = 55 + Math.random() * 40;
    el.style.top = `${top}vh`;
    el.style.left = `${left}vw`;
    el.style.animation = `shootAcross ${2.2 + Math.random() * 1}s ease-in forwards`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }

  function startShootingLoop() {
    const container = document.getElementById("shootingField");
    if (!container || prefersReducedMotion) return;
    const tick = () => {
      spawnShootingStar(container);
      setTimeout(tick, 5000 + Math.random() * 7000);
    };
    setTimeout(tick, 2500);
  }

  /* fires several shooting stars in quick succession — used by the
     Planet Page's double-tap cinematic moment to make the sky feel alive */
  function burstShootingStars(count = 4) {
    const container = document.getElementById("shootingField");
    if (!container || prefersReducedMotion) return;
    for (let i = 0; i < count; i++) {
      setTimeout(() => spawnShootingStar(container), i * 220 + Math.random() * 150);
    }
  }

  /* ---------------------------------------------------------------
     MOUSE PARALLAX for aurora layers
     --------------------------------------------------------------- */
  function startParallax() {
    if (prefersReducedMotion) return;
    const auroras = document.querySelectorAll(".ambient__aurora");
    let raf = null;
    window.addEventListener("mousemove", (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;
        auroras.forEach((a, i) => {
          const strength = 8 + i * 4;
          a.style.marginLeft = `${x * strength}px`;
          a.style.marginTop = `${y * strength}px`;
        });
        raf = null;
      });
    }, { passive: true });
  }

  /* ---------------------------------------------------------------
     SCROLL REVEAL
     --------------------------------------------------------------- */
  function startScrollReveal() {
    const targets = document.querySelectorAll(".reveal-on-scroll");
    if (!("IntersectionObserver" in window)) {
      targets.forEach(t => t.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    targets.forEach(t => io.observe(t));
  }

  /* ---------------------------------------------------------------
     PROFILE FRAME SPARKLES
     --------------------------------------------------------------- */
  function buildFrameSparkles() {
    const wrap = document.getElementById("frameSparkles");
    if (!wrap) return;
    const count = 14;
    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      s.className = "sparkle";
      const angle = (i / count) * Math.PI * 2;
      const radius = 46 + Math.random() * 6;
      const x = 50 + Math.cos(angle) * radius;
      const y = 50 + Math.sin(angle) * radius;
      s.style.left = `${x}%`;
      s.style.top = `${y}%`;
      s.style.animationDuration = `${2 + Math.random() * 3}s`;
      s.style.animationDelay = `${Math.random() * 3}s`;
      wrap.appendChild(s);
    }
  }

  /* ---------------------------------------------------------------
     CONFETTI BURST (canvas-based, used on correct PIN)
     --------------------------------------------------------------- */
  function burstConfetti() {
    const canvas = document.getElementById("confettiCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    ctx.scale(dpr, dpr);

    const colors = ["#4FE3FF", "#8B7CFF", "#E8C88C", "#FF8FA3", "#6DFFB0"];
    const count = prefersReducedMotion ? 0 : 120;
    const particles = Array.from({ length: count }, () => ({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2.6,
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * -12 - 4,
      size: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      gravity: 0.32 + Math.random() * 0.12,
      life: 0,
      maxLife: 90 + Math.random() * 40,
    }));

    let frame = 0;
    function loop() {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      let alive = false;
      particles.forEach(p => {
        if (p.life > p.maxLife) return;
        alive = true;
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life++;
        const alpha = 1 - p.life / p.maxLife;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(alpha, 0);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      });
      frame++;
      if (alive && frame < 200) {
        requestAnimationFrame(loop);
      } else {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    }
    requestAnimationFrame(loop);
  }

  function init() {
    buildStarField();
    startHeartLoop();
    startShootingLoop();
    startParallax();
    buildFrameSparkles();
  }

  return { init, startScrollReveal, burstConfetti, burstShootingStars };
})();

document.addEventListener("DOMContentLoaded", Ambient.init);
