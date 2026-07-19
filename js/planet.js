/* =========================================================================
   PLANET.JS
   -------------------------------------------------------------------------
   The Planet Page - an original Three.js scene built as the centerpiece of
   the site. A glowing, animated planet sits at the center of a "memory
   sphere": 100-150 floating photo cards (generated from the 10 source
   photos in CONFIG.media.planetPhotos) distributed through real 3D space.

   Interactions:
     - Drag (mouse or touch) freely rotates the whole memory sphere, with
       inertia that decays naturally after release.
     - Scroll / pinch zooms the camera in and out.
     - A single tap on a photo opens the photo modal.
     - A double tap/click anywhere plays a short cinematic camera + glow
       sequence, then hands control back to the person.

   Three.js (plus its bloom postprocessing addons) is lazy-loaded from a
   CDN the first time this page is opened, so the PIN/anniversary pages
   stay fast. No npm, no bundler - this all still runs from a plain
   index.html or a static Vercel deploy.
   ========================================================================= */

const PlanetPage = (() => {

  const THREE_VERSION = "0.128.0";
  const CDN_BASE = `https://unpkg.com/three@${THREE_VERSION}/`;

  let loadingPromise = null;
  let sceneReady = false;
  let rafId = null;
  let lastFrameTime = 0;

  /* Three.js objects */
  let renderer, scene, camera, composer, bloomPass;
  let worldGroup;      // planet + photo sphere — this is what the person drags
  let deepGroup;       // stars + nebula — drifts independently, ignores drag
  let planetMesh, cloudMesh;
  let rimLight, sunLight;
  let raycaster, pointerNDC;
  const photoSprites = [];
  const starLayers = [];     // [{ points, mat, speed }]
  const nebulaSprites = [];
  const shootingPool = [];   // reusable in-scene shooting star streaks

  /* interaction state */
  let dragging = false;
  let controlsEnabled = true;
  let lastX = 0, lastY = 0;
  let velX = 0, velY = 0;          // angular inertia (applied to target rotation)
  let rotX = 0, rotY = 0;          // smoothed rotation actually applied to worldGroup
  let targetRotX = 0, targetRotY = 0; // raw rotation from drag/inertia — worldGroup eases toward this
  let pointerDownPos = { x: 0, y: 0 };
  let pointerMoved = false;
  const activePointers = new Map();
  let pinchStartDist = 0;
  let pinchStartDistance = 0;
  let cameraDistance = 34;
  let targetCameraDistance = 34;
  let tapTimer = null;
  let tapCount = 0;
  let tapPos = { x: 0, y: 0 };
  let nextShootingStarAt = 0;

  const cinematic = { active: false, start: 0, duration: 0 };
  let pageActive = false;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || Math.min(window.innerWidth, window.innerHeight) < 640;

  /* -----------------------------------------------------------------
     COPY
     ----------------------------------------------------------------- */
  function populateCopy() {
    document.getElementById("planetTitle").textContent = CONFIG.planet.title;
    document.getElementById("planetSubtitle").textContent = CONFIG.planet.subtitle;
  }

  /* -----------------------------------------------------------------
     LAZY-LOAD THREE.JS + BLOOM ADDONS
     ----------------------------------------------------------------- */
  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = url;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load " + url));
      document.head.appendChild(s);
    });
  }

  function loadScriptsInOrder(urls) {
    return urls.reduce((chain, url) => chain.then(() => loadScript(url)), Promise.resolve());
  }

  function ensureThree() {
    if (loadingPromise) return loadingPromise;
    if (window.THREE && window.THREE.EffectComposer && window.THREE.UnrealBloomPass) {
      loadingPromise = Promise.resolve();
      return loadingPromise;
    }
    loadingPromise = loadScriptsInOrder([
      CDN_BASE + "build/three.min.js",
      CDN_BASE + "examples/js/shaders/CopyShader.js",
      CDN_BASE + "examples/js/shaders/LuminosityHighPassShader.js",
      CDN_BASE + "examples/js/postprocessing/ShaderPass.js",
      CDN_BASE + "examples/js/postprocessing/EffectComposer.js",
      CDN_BASE + "examples/js/postprocessing/RenderPass.js",
      CDN_BASE + "examples/js/postprocessing/UnrealBloomPass.js",
    ]);
    return loadingPromise;
  }

  /* -----------------------------------------------------------------
     PROCEDURAL TEXTURES (no external texture files needed)
     ----------------------------------------------------------------- */
  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function bakePlanetTexture() {
    const w = 512, h = 256;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#1a3fae");
    grad.addColorStop(0.35, "#2c63e0");
    grad.addColorStop(0.5, "#4fd7ff");
    grad.addColorStop(0.65, "#2c63e0");
    grad.addColorStop(1, "#132a72");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = "overlay";
    for (let i = 0; i < 46; i++) {
      const x = Math.random() * w, y = Math.random() * h, r = 18 + Math.random() * 70;
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, "rgba(255,255,255,0.28)");
      rg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  }

  function bakeCloudTexture() {
    const w = 512, h = 256;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    for (let i = 0; i < 170; i++) {
      const x = Math.random() * w, y = Math.random() * h, r = 6 + Math.random() * 24;
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, "rgba(255,255,255,0.5)");
      rg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  }

  function bakeHaloTexture() {
    const s = 256;
    const c = document.createElement("canvas");
    c.width = s; c.height = s;
    const ctx = c.getContext("2d");
    const rg = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    rg.addColorStop(0, "rgba(150,225,255,0.9)");
    rg.addColorStop(0.4, "rgba(90,150,255,0.35)");
    rg.addColorStop(1, "rgba(90,150,255,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(c);
  }

  function bakeNebulaTexture(hex) {
    const s = 512;
    const c = document.createElement("canvas");
    c.width = s; c.height = s;
    const ctx = c.getContext("2d");
    const col = new THREE.Color(hex);
    const [r, g, b] = [Math.round(col.r * 255), Math.round(col.g * 255), Math.round(col.b * 255)];
    const rg = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    rg.addColorStop(0, `rgba(${r},${g},${b},0.55)`);
    rg.addColorStop(0.45, `rgba(${r},${g},${b},0.2)`);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(c);
  }

  function bakeStreakTexture() {
    const w = 256, h = 20;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.82, "rgba(200,230,255,0.7)");
    g.addColorStop(1, "rgba(255,255,255,1)");
    ctx.fillStyle = g;
    ctx.fillRect(0, h * 0.3, w, h * 0.4);
    const tex = new THREE.CanvasTexture(c);
    return tex;
  }

  function bakePhotoTexture(img) {
    const size = 256, pad = 10, r = 22;
    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const ctx = c.getContext("2d");

    ctx.save();
    roundRectPath(ctx, pad, pad, size - pad * 2, size - pad * 2, r);
    ctx.clip();
    const scale = Math.max((size - pad * 2) / img.width, (size - pad * 2) / img.height);
    const w = img.width * scale, h = img.height * scale;
    ctx.drawImage(img, pad + (size - pad * 2 - w) / 2, pad + (size - pad * 2 - h) / 2, w, h);
    ctx.restore();

    roundRectPath(ctx, pad, pad, size - pad * 2, size - pad * 2, r);
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.shadowColor = "rgba(79,227,255,0.9)";
    ctx.shadowBlur = 14;
    ctx.stroke();

    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }

  function loadPhotoTextures(urls) {
    return Promise.all(urls.map((src) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(bakePhotoTexture(img));
      img.onerror = () => resolve(null);
      img.src = src;
    })));
  }

  /* -----------------------------------------------------------------
     SCENE CONSTRUCTION
     ----------------------------------------------------------------- */
  function makeStarLayer(count, radiusMin, radiusMax, sizeMin, sizeMax, speed, palette) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = radiusMin + Math.random() * (radiusMax - radiusMin);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      const col = palette[(Math.random() * palette.length) | 0];
      colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
      sizes[i] = sizeMin + Math.random() * (sizeMax - sizeMin);
      phases[i] = Math.random() * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uIntensity: { value: 1 },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        uniform float uTime;
        uniform float uPixelRatio;
        varying vec3 vColor;
        varying float vTwinkle;
        void main() {
          vColor = color;
          float twinkle = 0.5 + 0.5 * sin(uTime * 1.6 + aPhase);
          vTwinkle = 0.45 + 0.55 * twinkle;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * vTwinkle * uPixelRatio * (300.0 / max(1.0, -mvPosition.z));
          gl_Position = projectionMatrix * mvPosition;
        }`,
      fragmentShader: `
        varying vec3 vColor;
        varying float vTwinkle;
        uniform float uIntensity;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          float alpha = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vColor * uIntensity, alpha * vTwinkle);
        }`,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geo, mat);
    points.userData.speed = speed;
    deepGroup.add(points);
    starLayers.push({ points, mat, speed });
  }

  function buildStarField() {
    const total = Math.round(CONFIG.planet.starCount * (isMobile ? 0.6 : 1));
    const palette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0x4fe3ff),
      new THREE.Color(0x8b7cff),
      new THREE.Color(0xe8c88c),
    ];
    // far layer: dense, tiny, barely drifting — the deep backdrop
    makeStarLayer(Math.round(total * 0.55), 120, 260, 0.9, 1.8, 0.004, palette);
    // mid layer: fewer, a little bigger, drifts a bit faster (parallax)
    makeStarLayer(Math.round(total * 0.3), 70, 130, 1.6, 2.8, 0.011, palette);
    // near layer: sparse, bright, fastest drift — reads as "close" stars
    makeStarLayer(Math.round(total * 0.15), 40, 75, 2.4, 4.2, 0.022, palette);
  }

  function buildNebula() {
    const palette = [0x8b7cff, 0x4fe3ff, 0xffb37a];
    palette.forEach((hex, i) => {
      const tex = bakeNebulaTexture(hex);
      const mat = new THREE.SpriteMaterial({
        map: tex, transparent: true, opacity: 0.24, fog: false,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      const r = 95 + i * 22;
      const theta = (i / palette.length) * Math.PI * 2 + Math.random() * 1.4;
      sprite.position.set(
        Math.cos(theta) * r,
        (Math.random() - 0.5) * 50,
        Math.sin(theta) * r
      );
      const s = 100 + Math.random() * 50;
      sprite.scale.set(s, s, 1);
      sprite.userData = { phase: Math.random() * Math.PI * 2, baseOpacity: 0.2 + Math.random() * 0.14 };
      deepGroup.add(sprite);
      nebulaSprites.push(sprite);
    });
  }

  function buildShootingStars() {
    const tex = bakeStreakTexture();
    for (let i = 0; i < 5; i++) {
      const mat = new THREE.SpriteMaterial({
        map: tex, transparent: true, opacity: 0, fog: false,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(16, 1.3, 1);
      scene.add(sprite);
      shootingPool.push({
        sprite, active: false, t: 0, duration: 1,
        start: new THREE.Vector3(), vel: new THREE.Vector3(),
      });
    }
  }

  function fireShootingStar() {
    const s = shootingPool.find((x) => !x.active);
    if (!s) return;
    s.active = true;
    s.t = 0;
    s.duration = 0.85 + Math.random() * 0.5;
    const r = 65 + Math.random() * 20;
    const theta = Math.random() * Math.PI * 2;
    s.start.set(Math.cos(theta) * r, 22 + Math.random() * 24, Math.sin(theta) * r * 0.5 - 30);
    const dir = s.start.clone().negate().normalize();
    dir.x += (Math.random() - 0.5) * 0.5;
    dir.y += -0.35 - Math.random() * 0.25;
    dir.normalize();
    s.vel.copy(dir).multiplyScalar(55);
    s.sprite.position.copy(s.start);
    s.sprite.material.opacity = 0;
    const ang = Math.atan2(s.vel.y, s.vel.x);
    // orient the streak sprite along its travel direction
    s.sprite.material.rotation = ang;
  }

  function updateShootingStars(dt) {
    for (const s of shootingPool) {
      if (!s.active) continue;
      s.t += dt;
      const p = s.t / s.duration;
      if (p >= 1) {
        s.active = false;
        s.sprite.material.opacity = 0;
        continue;
      }
      s.sprite.position.addScaledVector(s.vel, dt);
      // quick fade in, lingering fade out
      s.sprite.material.opacity = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
    }
  }

  function buildPlanet() {
    const r = CONFIG.planet.planetRadius;

    const surfaceMat = new THREE.MeshPhongMaterial({
      map: bakePlanetTexture(),
      shininess: 22,
      specular: new THREE.Color(0x2a4488),
      emissive: new THREE.Color(0x081226),
      emissiveIntensity: 0.7,
    });
    planetMesh = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 64), surfaceMat);
    worldGroup.add(planetMesh);

    const cloudMat = new THREE.MeshLambertMaterial({
      map: bakeCloudTexture(), transparent: true, opacity: 0.5, depthWrite: false,
    });
    cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(r * 1.015, 64, 64), cloudMat);
    worldGroup.add(cloudMesh);

    const atmoMat = new THREE.ShaderMaterial({
      uniforms: { glowColor: { value: new THREE.Color(0x4fe3ff) } },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec3 vNormal;
        uniform vec3 glowColor;
        void main() {
          float intensity = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.2);
          gl_FragColor = vec4(glowColor, clamp(intensity, 0.0, 1.0));
        }`,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    worldGroup.add(new THREE.Mesh(new THREE.SphereGeometry(r * 1.18, 64, 64), atmoMat));

    const haloMat = new THREE.SpriteMaterial({
      map: bakeHaloTexture(), color: 0x8fdcff, transparent: true,
      opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const halo = new THREE.Sprite(haloMat);
    halo.scale.set(r * 5.2, r * 5.2, 1);
    worldGroup.add(halo);
  }

  function buildLights() {
    scene.add(new THREE.AmbientLight(0x445599, 0.5));
    sunLight = new THREE.DirectionalLight(0xffffff, 1.1);
    sunLight.position.set(30, 18, 24);
    scene.add(sunLight);
    rimLight = new THREE.PointLight(0x4fe3ff, 1.4, 130);
    rimLight.position.set(-18, 6, -14);
    scene.add(rimLight);
    // cool fill light from the opposite side so the planet's night side
    // still reads with a bit of shape instead of going fully flat/black
    const fill = new THREE.PointLight(0x6a5cff, 0.55, 100);
    fill.position.set(20, -14, -22);
    scene.add(fill);
  }

  function buildComposer(width, height) {
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));
    bloomPass = new THREE.UnrealBloomPass(
      new THREE.Vector2(width, height),
      CONFIG.planet.bloomStrength,
      CONFIG.planet.bloomRadius,
      CONFIG.planet.bloomThreshold
    );
    composer.addPass(bloomPass);
  }

  function buildPhotoSphere(textures) {
    const validTextures = textures.filter(Boolean);
    if (!validTextures.length) return;

    const count = Math.round(CONFIG.planet.photoCount * (isMobile ? 0.85 : 1));
    const baseR = CONFIG.planet.sphereRadius;
    const jitter = CONFIG.planet.sphereJitter;
    const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle, for even angular coverage

    // organic depth banding: photos aren't placed on a uniform thin shell —
    // some cluster close and large ("in front"), most sit at a comfortable
    // middle distance, and some drift far and small ("behind" the planet)
    const bands = [
      { min: 0.5, max: 0.78, scaleMin: 2.1, scaleMax: 3.1, weight: 0.2 },
      { min: 0.82, max: 1.18, scaleMin: 1.25, scaleMax: 1.95, weight: 0.5 },
      { min: 1.22, max: 1.75, scaleMin: 0.7, scaleMax: 1.25, weight: 0.3 },
    ];

    for (let i = 0; i < count; i++) {
      const tex = textures[i % textures.length] || validTextures[i % validTextures.length];

      const y = 1 - (i / Math.max(1, count - 1)) * 2;
      const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = phi * i + (Math.random() - 0.5) * 0.4; // break the mechanically-even look
      const dir = new THREE.Vector3(
        Math.cos(theta) * radiusAtY,
        y,
        Math.sin(theta) * radiusAtY
      ).normalize();

      let roll = Math.random();
      let band = bands[bands.length - 1];
      for (const b of bands) {
        if (roll <= b.weight) { band = b; break; }
        roll -= b.weight;
      }
      const dist = baseR * (band.min + Math.random() * (band.max - band.min));

      // scatter tangentially off the sphere shell so photos fill real
      // volume instead of sitting on a perfectly even surface
      let tangent1 = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
      if (tangent1.lengthSq() < 0.0001) tangent1.set(1, 0, 0);
      tangent1.normalize();
      const tangent2 = new THREE.Vector3().crossVectors(dir, tangent1).normalize();
      const scatter = baseR * jitter * 0.5;
      const basePos = dir.clone().multiplyScalar(dist)
        .addScaledVector(tangent1, (Math.random() - 0.5) * scatter)
        .addScaledVector(tangent2, (Math.random() - 0.5) * scatter);

      const mat = new THREE.SpriteMaterial({
        map: tex, transparent: true,
        rotation: (Math.random() - 0.5) * 0.55,
        color: new THREE.Color().setHSL(0, 0, 0.94 + Math.random() * 0.06),
      });
      const sprite = new THREE.Sprite(mat);
      const size = band.scaleMin + Math.random() * (band.scaleMax - band.scaleMin);
      sprite.scale.set(size, size, 1);
      sprite.position.copy(basePos);
      sprite.userData = {
        normal: dir,
        basePos,
        phase: Math.random() * Math.PI * 2,
        bobAmp: 0.22 + Math.random() * 0.42,
        bobSpeed: 0.22 + Math.random() * 0.34,
        src: CONFIG.media.planetPhotos[i % CONFIG.media.planetPhotos.length],
      };
      worldGroup.add(sprite);
      photoSprites.push(sprite);
    }
  }

  function buildScene() {
    const canvas = document.getElementById("planetCanvas");
    const stage = document.getElementById("planetStage");
    const width = stage.clientWidth || window.innerWidth;
    const height = stage.clientHeight || window.innerHeight;

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x040613, 1);

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x040613, 0.0052);

    camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 500);
    cameraDistance = CONFIG.planet.cameraDistance;
    targetCameraDistance = cameraDistance;
    camera.position.set(0, 0, cameraDistance);

    worldGroup = new THREE.Group();
    scene.add(worldGroup);
    deepGroup = new THREE.Group();
    scene.add(deepGroup);

    buildStarField();
    buildNebula();
    buildShootingStars();
    buildPlanet();
    buildLights();
    buildComposer(width, height);

    raycaster = new THREE.Raycaster();
    pointerNDC = new THREE.Vector2();

    window.addEventListener("resize", onResize);
    bindPointerControls(canvas);
  }

  /* -----------------------------------------------------------------
     ANIMATION LOOP
     ----------------------------------------------------------------- */
  function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
  function easeInOutCubic(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function updateCinematic(now, dt) {
    if (!cinematic.active) return;
    const t = (now - cinematic.start) / cinematic.duration;
    if (t >= 1) {
      endCinematic();
      return;
    }
    let zoomFactor, spinBoost, glowBoost;
    if (t < 0.28) {
      const p = easeOutCubic(t / 0.28);
      zoomFactor = 1 - p * 0.52;
      spinBoost = 1 + p * 4.4;
      glowBoost = p;
    } else if (t < 0.72) {
      zoomFactor = 0.48;
      spinBoost = 5.4;
      glowBoost = 1;
    } else {
      const p = easeInOutCubic((t - 0.72) / 0.28);
      zoomFactor = 0.48 + p * 0.52;
      spinBoost = 5.4 - p * 4.4;
      glowBoost = 1 - p;
    }
    // camera tilt: one continuous function of t across the whole sequence
    // (rather than three separate per-phase formulas) so there's no jump
    // at the 0.28/0.72 phase boundaries — envelope ramps 0→1→0, and the
    // oscillation is a pure function of t so it never resets mid-sequence
    const tiltEnvelope = t < 0.28
      ? easeOutCubic(t / 0.28)
      : t < 0.72
        ? 1
        : 1 - easeInOutCubic((t - 0.72) / 0.28);
    const tiltAmt = tiltEnvelope * 0.22 * Math.sin(t * Math.PI * 3);

    targetCameraDistance = CONFIG.planet.cameraDistance * zoomFactor;
    targetRotY += CONFIG.planet.autoRotateSpeed * spinBoost * dt * 6;
    targetRotX = clamp(tiltAmt, -0.5, 0.5);

    bloomPass.strength = CONFIG.planet.bloomStrength * (1 + glowBoost * 1.35);
    rimLight.intensity = 1.4 * (1 + glowBoost * 1.9);
    sunLight.intensity = 1.1 * (1 + glowBoost * 0.5);
    starLayers.forEach((l) => { l.mat.uniforms.uIntensity.value = 1 + glowBoost * 0.9; });
    nebulaSprites.forEach((s) => { s.material.opacity = s.userData.baseOpacity * (1 + glowBoost * 1.8); });

    // a couple of extra shooting stars mid-sequence, on top of the burst fired at trigger time
    if (t > 0.35 && t < 0.36) fireShootingStar();
    if (t > 0.55 && t < 0.56) fireShootingStar();
  }

  function endCinematic() {
    cinematic.active = false;
    controlsEnabled = true;
    targetCameraDistance = CONFIG.planet.cameraDistance;
    if (bloomPass) bloomPass.strength = CONFIG.planet.bloomStrength;
    if (rimLight) rimLight.intensity = 1.4;
    if (sunLight) sunLight.intensity = 1.1;
    starLayers.forEach((l) => { l.mat.uniforms.uIntensity.value = 1; });
    nebulaSprites.forEach((s) => { s.material.opacity = s.userData.baseOpacity; });
    const stage = document.getElementById("planetStage");
    if (stage) stage.classList.remove("is-cinematic");
  }

  function triggerCinematic() {
    if (cinematic.active) return;
    cinematic.active = true;
    controlsEnabled = false;
    velX = 0; velY = 0;
    cinematic.start = performance.now();
    cinematic.duration = CONFIG.planet.cinematicDuration;
    const stage = document.getElementById("planetStage");
    if (stage) stage.classList.add("is-cinematic");
    fireShootingStar();
    fireShootingStar();
    if (window.Ambient && Ambient.burstShootingStars) Ambient.burstShootingStars(5);
  }

  function animate(now) {
    rafId = requestAnimationFrame(animate);
    const dt = Math.min((now - (lastFrameTime || now)) / 1000, 0.05);
    lastFrameTime = now;
    const elapsed = now / 1000;

    updateCinematic(now, dt);

    if (!dragging) {
      if (Math.abs(velX) > 0.00006 || Math.abs(velY) > 0.00006) {
        targetRotY += velX;
        targetRotX += velY;
        velX *= 0.945;
        velY *= 0.945;
      } else if (!cinematic.active) {
        targetRotY += CONFIG.planet.autoRotateSpeed * dt;
      }
    }
    targetRotX = clamp(targetRotX, -1.05, 1.05);

    // ease the applied rotation toward the raw drag/inertia target — this is
    // what gives the drag a silky, weighted feel instead of tracking the
    // pointer 1:1, and keeps the double-tap cinematic's fast spin smooth
    const followRate = cinematic.active ? 3.2 : 9;
    const ease = 1 - Math.exp(-followRate * dt);
    rotY += (targetRotY - rotY) * ease;
    rotX += (targetRotX - rotX) * ease;
    worldGroup.rotation.y = rotY;
    worldGroup.rotation.x = rotX;

    planetMesh.rotation.y += 0.05 * dt;
    cloudMesh.rotation.y -= 0.03 * dt;

    for (let i = 0; i < photoSprites.length; i++) {
      const s = photoSprites[i];
      const u = s.userData;
      const bob = Math.sin(elapsed * u.bobSpeed + u.phase) * u.bobAmp;
      s.position.copy(u.basePos).addScaledVector(u.normal, bob);
    }

    // deep background drifts independently of drag — real stars don't spin
    // with the memory sphere, which keeps the sense of infinite depth
    const deepSpeedMul = cinematic.active ? 2.4 : 1;
    starLayers.forEach((l) => {
      l.mat.uniforms.uTime.value = elapsed;
      l.points.rotation.y -= l.speed * dt * 6 * deepSpeedMul;
    });
    nebulaSprites.forEach((s) => {
      const breathe = 0.85 + 0.15 * Math.sin(elapsed * 0.12 + s.userData.phase);
      if (!cinematic.active) s.material.opacity = s.userData.baseOpacity * breathe;
    });
    deepGroup.rotation.y += 0.0025 * dt * 6;
    updateShootingStars(dt);

    // the sky isn't static — an occasional shooting star even outside cinematic mode
    if (now > nextShootingStarAt) {
      fireShootingStar();
      nextShootingStarAt = now + 6000 + Math.random() * 9000;
    }

    cameraDistance += (targetCameraDistance - cameraDistance) * (1 - Math.exp(-6 * dt));
    const idleX = Math.sin(elapsed * 0.15) * 0.6 + Math.sin(elapsed * 0.083) * 0.22;
    const idleY = Math.cos(elapsed * 0.11) * 0.35 + Math.cos(elapsed * 0.061) * 0.15;
    camera.position.set(idleX, idleY, cameraDistance);
    camera.lookAt(0, 0, 0);

    composer.render();
  }

  function onResize() {
    if (!renderer) return;
    const stage = document.getElementById("planetStage");
    const w = stage.clientWidth || window.innerWidth;
    const h = stage.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  }

  /* -----------------------------------------------------------------
     POINTER CONTROLS - drag, inertia, pinch/wheel zoom, tap/double-tap
     ----------------------------------------------------------------- */
  function bindPointerControls(canvas) {
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
  }

  function onPointerDown(e) {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.size === 1) {
      dragging = true;
      pointerMoved = false;
      lastX = e.clientX; lastY = e.clientY;
      pointerDownPos = { x: e.clientX, y: e.clientY };
      velX = 0; velY = 0;
    } else if (activePointers.size === 2) {
      dragging = false;
      const pts = Array.from(activePointers.values());
      pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartDistance = cameraDistance;
    }
  }

  function onPointerMove(e) {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.size === 2) {
      const pts = Array.from(activePointers.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchStartDist > 0) {
        const scale = pinchStartDist / dist;
        targetCameraDistance = clamp(
          pinchStartDistance * scale,
          CONFIG.planet.cameraMinDistance,
          CONFIG.planet.cameraMaxDistance
        );
      }
      return;
    }

    if (!dragging || !controlsEnabled) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;

    if (Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y) > 6) {
      pointerMoved = true;
    }

    const speed = 0.0045;
    targetRotY += dx * speed;
    targetRotX += dy * speed;
    velX = dx * speed;
    velY = dy * speed;
  }

  function onPointerUp(e) {
    const wasSingle = activePointers.size === 1 && activePointers.has(e.pointerId);
    activePointers.delete(e.pointerId);
    if (activePointers.size === 0) {
      dragging = false;
      pinchStartDist = 0;
    }
    if (!wasSingle || pointerMoved || !controlsEnabled) return;
    handleTap(e.clientX, e.clientY);
  }

  function onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY * 0.02;
    targetCameraDistance = clamp(
      targetCameraDistance + delta,
      CONFIG.planet.cameraMinDistance,
      CONFIG.planet.cameraMaxDistance
    );
  }

  function handleTap(x, y) {
    tapCount++;
    if (tapCount === 1) {
      tapPos = { x, y };
      tapTimer = setTimeout(() => {
        tapCount = 0;
        raycastPhoto(tapPos.x, tapPos.y);
      }, 280);
    } else {
      clearTimeout(tapTimer);
      tapCount = 0;
      triggerCinematic();
    }
  }

  function raycastPhoto(x, y) {
    if (!photoSprites.length) return;
    const canvas = document.getElementById("planetCanvas");
    const rect = canvas.getBoundingClientRect();
    pointerNDC.x = ((x - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((y - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNDC, camera);
    const hits = raycaster.intersectObjects(photoSprites);
    if (hits.length) openModal(hits[0].object.userData.src);
  }

  /* -----------------------------------------------------------------
     PHOTO MODAL
     ----------------------------------------------------------------- */
  function openModal(src) {
    const modal = document.getElementById("photoModal");
    document.getElementById("photoModalImg").src = src;
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
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
  }

  /* -----------------------------------------------------------------
     SOUND TOGGLE / BACK
     ----------------------------------------------------------------- */
  function bindSoundToggle() {
    const btn = document.getElementById("soundToggle");
    btn.addEventListener("click", () => {
      const muted = MusicManager.toggleMute();
      btn.querySelector(".sound-toggle__on").hidden = muted;
      btn.querySelector(".sound-toggle__off").hidden = !muted;
    });
  }

  function bindBack() {
    document.getElementById("planetBackBtn").addEventListener("click", () => {
      App.goToAnniversaryPage({ fromPlanet: true });
    });
  }

  /* -----------------------------------------------------------------
     LOADER UI
     ----------------------------------------------------------------- */
  function showLoader(show) {
    const el = document.getElementById("planetLoader");
    if (el) el.style.display = show ? "grid" : "none";
  }

  /* -----------------------------------------------------------------
     LIFECYCLE
     ----------------------------------------------------------------- */
  function resume() {
    if (rafId) cancelAnimationFrame(rafId);
    lastFrameTime = 0;
    rafId = requestAnimationFrame(animate);
  }

  function leave() {
    pageActive = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    cinematic.active = false;
    controlsEnabled = true;
  }

  function onVisibilityChange() {
    if (!sceneReady) return;
    if (document.hidden) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    } else if (pageActive) {
      resume();
    }
  }

  function enter() {
    populateCopy();
    pageActive = true;

    if (sceneReady) {
      onResize();
      resume();
      return;
    }

    showLoader(true);
    ensureThree()
      .then(() => {
        buildScene();
        return loadPhotoTextures(CONFIG.media.planetPhotos);
      })
      .then((textures) => {
        buildPhotoSphere(textures);
        sceneReady = true;
        showLoader(false);
        if (pageActive) resume();
      })
      .catch((err) => {
        console.error("Planet scene failed to load:", err);
        showLoader(false);
        const hint = document.getElementById("planetHint");
        if (hint) hint.textContent = "This experience needs an internet connection to load.";
      });
  }

  function init() {
    bindModal();
    bindSoundToggle();
    bindBack();
    document.addEventListener("visibilitychange", onVisibilityChange);
  }

  return { init, enter, leave };
})();
