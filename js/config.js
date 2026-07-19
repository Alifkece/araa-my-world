/* =========================================================================
   CONFIG.JS
   -------------------------------------------------------------------------
   Every editable piece of this website lives in this file.
   You never need to touch the HTML to personalize the site.
   See README.md for a full walkthrough of every field below.
   ========================================================================= */

const CONFIG = {

  /* -----------------------------------------------------------------------
     SECURITY / PIN
     PIN must be exactly 4 digits, formatted as MMDD (Month + Day).
     Example: anniversary on March 7th -> "0307"
     ------------------------------------------------------------------- */
  pin: "0820",

  /* -----------------------------------------------------------------------
     ANNIVERSARY DATE
     Used to auto-calculate the live "together for" counter.
     Format: "YYYY-MM-DDTHH:MM:SS"
     ------------------------------------------------------------------- */
  anniversaryDate: "2024-08-20T00:00:00",

  /* -----------------------------------------------------------------------
     NAMES / TITLES / COPY
     ------------------------------------------------------------------- */
  recipientName: "Happy anniversary Araa",
  senderName: "Yours, Always",

  pinScreen: {
    heading: "A Little Universe, Just for You",
    subheading: "Enter our date to step inside.",
    wrongPin: "That's not quite our date... try again.",
  },

  anniversaryPage: {
    eyebrow: "Happy Anniversary",
    title: "Every Star Remembers Us",
    subtitle: "A love story written in light",
  },

  letter: {
    envelopeLabel: "Open when you have a quiet moment",
    heading: "A Letter For You",
    body:
`My Love,

Happy anniversary sayanggg hihii, dedeee masii ingat kan? hari kapan kita pertama kali ketemu?, jujur akuu gak nyangka kita bisa sampe saat ini, padahal kerasanya baru kemarin yahhh kita?, bertemu sama kamuu itu adalah salah satu kebahagiaan yang paling akuu tunggu dan akuu impikan hehee..

Buat kamuuu jangan sampe lupain akuu yahhh, sampai kapan pun kamuu haru tau, kalo kamuu gak sendiri, yahh meskipun kamuu selalu menahan diri untuk cerita dan mencoba mendem semua masalah kamuu, tapi gapapa so masih adaa akuuu di hidup kamuu hehe, jangann pernah takut untuk cerita sama akuu yahhh, akuu sayangg bangett sama kamuuu sayanggg, akuuu bakalan selalu jadi rumah ternyaman buat kamu hiii.

Every memory we've made together — the ones we've laughed about for weeks, the ones that felt small in the moment but turned out to mean everything, the ones still waiting to happen — they orbit around you, because you are the center of my world. Not the sun I merely admire from a distance, but the gravity that holds everything else in place.

Thank you for choosing me, again and again, on the easy days and the hard ones. Thank you for your patience, your laughter, the way you say my name, the way you make a house feel like home. I promise to keep building little universes for you, for as long as you'll have me.

Here's to every year ahead, and to the stars we haven't discovered yet.

All my love, always.`,
  },

  /* -----------------------------------------------------------------------
     100 REASONS
     Feel free to reorder, edit, remove, or add to this list.
     ------------------------------------------------------------------- */
  reasons: [
    "The way your eyes soften right before you smile.",
    "You remember the small things I mention only once.",
    "Your laugh is the best sound in any room.",
    "You make ordinary errands feel like adventures.",
    "The way you hum without realizing it.",
    "You never let me apologize for being myself.",
    "Your hugs feel like a place, not just an act.",
    "You ask good questions and actually listen to the answers.",
    "The way you fight for the people you love.",
    "You make me want to be a better version of myself.",
    "Your handwriting, messy and unmistakably yours.",
    "The way you dance in the kitchen when you think no one's watching.",
    "You say what you mean, gently but honestly.",
    "The way your voice softens when you're sleepy.",
    "You've never once made me feel small.",
    "The way you defend your opinions with quiet confidence.",
    "You know exactly when I need silence instead of advice.",
    "Your patience with my terrible jokes.",
    "The way you light up talking about things you love.",
    "You make my favorite memories feel even better in retelling.",
    "The way you hold my hand without thinking about it.",
    "You've taught me new ways to see familiar things.",
    "Your steady calm when everything else feels loud.",
    "The way you say 'we' instead of 'you' or 'me'.",
    "You remember anniversaries I forget.",
    "The way you care for the people who can't repay you.",
    "Your fierce, unshakable loyalty.",
    "You make the mundane feel worth documenting.",
    "The way you fall asleep mid-sentence.",
    "Your quiet strength on hard days.",
    "You never make me guess how you feel.",
    "The way you say my name like it means something.",
    "You give the best, most specific compliments.",
    "The way you plan surprises just to see my reaction.",
    "Your honesty, even when it's inconvenient.",
    "The way you make new places feel familiar.",
    "You keep every ticket stub, every little note.",
    "The way your face changes when you talk about your dreams.",
    "You never let a disagreement turn into distance.",
    "The way you make friends everywhere you go.",
    "Your unwavering belief in people, including me.",
    "The way you notice when I'm quiet for a reason.",
    "You make effort look effortless.",
    "The way you cheer for me louder than anyone.",
    "Your comfort with being wrong, and saying so.",
    "The way you turn bad days into inside jokes later.",
    "You ask for what you need instead of expecting me to guess.",
    "The way you look at old photos and remember every detail.",
    "Your generosity, even when no one is watching.",
    "The way you make a house smell like something good is cooking.",
    "You stay curious about the world, and about me.",
    "The way you say 'good morning' like you mean it.",
    "Your bravery in choosing love, over and over.",
    "The way you make plans just to have something to look forward to.",
    "You never let my bad mood ruin your good one, but you still care.",
    "The way you learn the things I love, just to talk about them with me.",
    "Your steady hands when mine are shaking.",
    "The way you find the good in people others give up on.",
    "You make silence comfortable instead of empty.",
    "The way you remember exactly how I take my coffee.",
    "Your ability to make me laugh mid-argument.",
    "The way you keep your promises, even the small ones.",
    "You never treat my dreams as unrealistic.",
    "The way you say 'I'm proud of you' and mean every word.",
    "Your resilience after hard days.",
    "The way you notice small changes, a haircut, a new mug.",
    "You make traveling with you feel like coming home.",
    "The way you always leave a place better than you found it.",
    "Your thoughtful gifts that show you actually listen.",
    "The way you check in on me without being asked to.",
    "You never make love feel like a transaction.",
    "The way your presence makes a room warmer.",
    "Your ability to sit with sadness instead of rushing past it.",
    "The way you show up, even when it's inconvenient.",
    "You make me feel safe enough to be completely myself.",
    "The way you get excited over small good news.",
    "Your quiet confidence that never needs an audience.",
    "The way you remember the lyrics to songs that matter to us.",
    "You never let me feel alone in a crowded room.",
    "The way you make future plans feel certain and safe.",
    "Your willingness to say sorry first.",
    "The way you find joy in the smallest, most ordinary moments.",
    "You make me believe in the version of the future we're building.",
    "The way you notice beauty in things others walk past.",
    "Your ability to turn a bad day around with one text.",
    "The way you protect the time we spend together.",
    "You never make me feel like a burden.",
    "The way you say 'come here' when you can tell I need it.",
    "Your quiet acts of care that you never mention.",
    "The way you keep choosing us, especially when it's hard.",
    "You make growing older feel like something to look forward to.",
    "The way your love feels like a constant, not a variable.",
    "Your ability to make any room feel like ours.",
    "The way you hold space for my dreams and your own.",
    "You never stop learning how to love me better.",
    "The way you turn 'I love you' into a hundred small daily actions.",
    "Your hand finding mine, every single time, without fail.",
    "The way our story keeps getting better, one ordinary day at a time.",
    "Simply, entirely, you — exactly as you are.",
  ],

  /* -----------------------------------------------------------------------
     MEDIA
     ------------------------------------------------------------------- */
  media: {
    profilePhoto: "assets/profile/profile.jpg",
    planetPhotos: [
      "assets/photos/photo1.jpg",
      "assets/photos/photo2.jpg",
      "assets/photos/photo3.jpg",
      "assets/photos/photo4.jpg",
      "assets/photos/photo5.jpg",
      "assets/photos/photo6.jpg",
      "assets/photos/photo7.jpg",
      "assets/photos/photo8.jpg",
      "assets/photos/photo9.jpg",
      "assets/photos/photo10.jpg",
    ],
    video: "assets/videos/anniversary.mp4",
    introMusic: "assets/music/intro.mp3",
    planetMusic: "assets/music/planet.mp3",

    /* Character GIF is NOT stored locally — it's always loaded from a URL.
       Paste any direct .gif link here and the PIN screen updates instantly. */
    characterGif: "https://media.tenor.com/0IKwuW91-ZQAAAAi/mimibubu.gif",
  },

  /* -----------------------------------------------------------------------
     PLANET PAGE COPY
     ------------------------------------------------------------------- */
  planet: {
    title: "My World Is You",
    subtitle: "You are the center of my universe.",
    photoCount: 110,          // how many orbiting photo cards to generate
    minRadiusVW: 18,          // smallest orbit radius (in vw units)
    maxRadiusVW: 46,          // largest orbit radius (in vw units)
    minDurationSec: 18,       // fastest orbit
    maxDurationSec: 60,       // slowest orbit
  },

  /* -----------------------------------------------------------------------
     THEME COLORS
     ------------------------------------------------------------------- */
  colors: {
    bgDeep: "#040613",
    bgNavy: "#0A1030",
    auroraBlue: "#3D6BFF",
    auroraCyan: "#4FE3FF",
    auroraViolet: "#8B7CFF",
    gold: "#E8C88C",
    textPrimary: "#F5F7FF",
    textMuted: "#A9B2D6",
  },
};

/* Do not edit below this line. */
if (typeof module !== "undefined") { module.exports = CONFIG; }
