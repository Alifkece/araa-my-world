# My World Is You — Interactive Anniversary Website

A cinematic, three-page anniversary experience: a PIN-locked entrance, a
scroll-driven anniversary page, and a 3D "planet of memories" finale built
with Three.js. Pure HTML, CSS, and vanilla JavaScript — no build step, no
frameworks, no npm. Three.js itself is the one exception: it loads from a
CDN the first time the Planet Page opens, so that page needs an internet
connection (everything else works fully offline).

Every piece of personal content lives in **`js/config.js`**. You should
never need to touch the HTML, CSS, or other JS files to make this yours.

---

## 1. Quick start

1. Unzip the project.
2. Open `index.html` directly in a browser, **or** serve the folder with
   any static server (recommended, since some browsers restrict local
   audio/video playback when opened via `file://`):

   ```bash
   # Python
   python3 -m http.server 8000

   # Node
   npx serve .
   ```
3. Visit `http://localhost:8000` and enter the PIN.

The default PIN is **0714**. Change it in `js/config.js` (see below).

---

## 2. Editing `js/config.js`

Open `js/config.js` in any text editor. Every field has a comment
explaining what it controls. The most important ones:

### Change the PIN
```js
pin: "0714",
```
Always exactly 4 digits, formatted as `MMDD` (month + day). The hint
button on the PIN screen already tells your partner it's "the month and
day we became official," so keep it consistent with your real
anniversary date below.

### Change the anniversary date
```js
anniversaryDate: "2022-07-14T00:00:00",
```
This drives the live "Days / Hours / Minutes / Seconds" counter on the
anniversary page. Use the format `YYYY-MM-DDTHH:MM:SS`.

### Change the character GIF
```js
media: {
  characterGif: "https://example.com/character.gif",
}
```
The GIF is **never stored in the project** — it always loads from this
URL. Paste any direct link to a `.gif` file (must end in `.gif` or be a
direct image URL; Giphy/Tenor "share" pages won't work, but their direct
"media" links will). Changing the URL instantly changes the character
next time the page loads. No HTML editing required.

### Replace the profile photo
Drop your photo in `assets/profile/profile.jpg` (same filename), **or**
point to a different filename by editing:
```js
media: {
  profilePhoto: "assets/profile/profile.jpg",
}
```
The custom glass frame is 1:1 — square photos, cropped centrally, look
best.

### Replace the 10 planet photos
Replace the files in `assets/photos/` — keep the names `photo1.jpg`
through `photo10.jpg`, or update the list in `config.js`:
```js
media: {
  planetPhotos: [
    "assets/photos/photo1.jpg",
    ...
  ],
}
```
These 10 images are automatically duplicated into ~130 floating photos
scattered through the 3D memory sphere (controlled by `planet.photoCount`)
— you only ever need 10 originals.

### Replace the music
```js
media: {
  introMusic: "assets/music/intro.mp3",
  planetMusic: "assets/music/planet.mp3",
}
```
Drop your own MP3s into `assets/music/` with the same filenames, or
point to new filenames. `intro.mp3` plays on the anniversary page;
`planet.mp3` crossfades in on the planet page.

### Replace the video
```js
media: {
  video: "assets/videos/anniversary.mp4",
}
```
Replace `assets/videos/anniversary.mp4` with your own clip (same
filename), or update the path. The video plays with its own original
audio; background music automatically fades out while it plays and
fades back in when it ends or is paused.

### Edit the love letter
```js
letter: {
  heading: "A Letter For You",
  body: `My Love,

  Your letter text here, written exactly how you want it to read.
  Leave a blank line between paragraphs — it's preserved on the page.
  `,
}
```

### Edit the 100 Reasons
```js
reasons: [
  "The way your eyes soften right before you smile.",
  "...",
],
```
This is a plain array of strings — add, remove, reorder, or rewrite any
line. The grid and its reveal animation update automatically to match
however many reasons you list.

### Colors and planet behavior
The `colors` object controls the aurora/glass palette. The `planet`
object controls the 3D memory-sphere scene — how many photos float
around it, how big/close everything is, and how the double-tap
cinematic behaves:
```js
planet: {
  photoCount: 130,
  sphereRadius: 15,
  sphereJitter: 0.6,
  planetRadius: 5.2,
  cameraDistance: 34,
  cameraMinDistance: 16,
  cameraMaxDistance: 60,
  autoRotateSpeed: 0.045,
  bloomStrength: 1.15,
  bloomRadius: 0.55,
  bloomThreshold: 0.15,
  cinematicDuration: 6200,
  starCount: 900,
}
```
Lower `photoCount` and `starCount` on older phones if you want extra
headroom for smooth 60fps. The Planet Page automatically renders a
lighter version on phones already (fewer particles, capped pixel
ratio) — these numbers are the desktop/high-end baseline.

---

## 3. Placeholder assets included in this ZIP

To keep the project immediately runnable, this ZIP ships with
generated placeholder assets:
- `assets/photos/photo1.jpg` – `photo10.jpg` — labeled gradient cards
- `assets/profile/profile.jpg` — a labeled placeholder frame photo
- `assets/videos/anniversary.mp4` — a short silent placeholder clip
- `assets/music/intro.mp3` / `assets/music/planet.mp3` — soft placeholder tones

Replace all of these with your real photos, video, and music before
sharing the site — the experience is designed to look and feel complete
once you do.

---

## 4. Deploying

### Deploy to Vercel
1. Create a free account at vercel.com.
2. Install the CLI: `npm i -g vercel`.
3. From the project folder, run `vercel`.
4. Follow the prompts (accept defaults — this is a static site, no
   build command needed).
5. Vercel gives you a live URL when it finishes.

Alternatively, drag-and-drop the unzipped project folder into the
Vercel dashboard's "Add New Project" → "Import" flow.

### Deploy to GitHub Pages
1. Create a new GitHub repository and push the unzipped project to it:
   ```bash
   git init
   git add .
   git commit -m "Anniversary website"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```
2. In the repository, go to **Settings → Pages**.
3. Under "Build and deployment," set **Source** to "Deploy from a
   branch," branch `main`, folder `/ (root)`.
4. Save. GitHub gives you a live URL
   (`https://YOUR_USERNAME.github.io/YOUR_REPO/`) within a minute or two.

---

## 5. Project structure

```
/
├── index.html            All markup, three pages in one document
├── css/
│   ├── style.css         Design tokens, resets, ambient background
│   ├── pin.css            Loading + PIN screen
│   ├── home.css           Anniversary page (hero, frame, letter, reasons)
│   ├── planet.css         Planet page (canvas mount, loader) + photo popup modal
│   ├── animation.css      Shared keyframes
│   └── responsive.css     Tablet / mobile breakpoints
├── js/
│   ├── config.js          Everything you edit lives here
│   ├── app.js              Orchestrator: page flow, counter, letter, CTA
│   ├── pin.js               PIN screen logic
│   ├── music.js             Crossfade / ducking audio manager
│   ├── planet.js            Three.js memory-sphere scene + photo modal
│   └── animation.js         Ambient stars/hearts/shooting stars/reveal
└── assets/
    ├── photos/            10 source photos, duplicated into the memory sphere
    ├── profile/           1 profile photo
    ├── videos/            1 video
    └── music/             2 tracks (intro + planet)
```

---

## 6. Notes on browser autoplay

Browsers block audio autoplay until the user interacts with the page.
Because this experience starts with a PIN keypad, that first tap
satisfies the interaction requirement — music begins right on the
success transition, no extra click needed.

Enjoy your little universe.
