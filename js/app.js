// --- 1. Lenis Smooth Scroll Setup ---
const lenis = new Lenis({
  duration: 1.5,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true
});

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

gsap.ticker.lagSmoothing(0);

// Stop scrolling initially while loading
lenis.stop();

// --- 2. Configuration & State ---
const FRAME_COUNT = 241;
const frames = [];
let currentFrame = -1;
let imagesLoaded = 0;

const canvas = document.getElementById('sequence-canvas');

// Attempt to use display-p3 color space to match Safari's lighter rendering on Macs
let ctxOptions = {};
if (window.matchMedia && window.matchMedia("(color-gamut: p3)").matches) {
  ctxOptions.colorSpace = 'display-p3';
}
let ctx;
try {
  ctx = canvas.getContext('2d', ctxOptions);
} catch (e) {
  ctx = canvas.getContext('2d'); // fallback
}
const loader = document.getElementById('loader');
const loaderBar = document.getElementById('loader-bar');
const hero = document.getElementById('hero');
const scrollContainer = document.getElementById('scroll-container');
const videoSection = document.getElementById('video-section');
const playBtn = document.getElementById('play-button');
const videoContainer = document.getElementById('video-container');
const revealVideo = document.getElementById('reveal-video');
const closeVideoBtn = document.getElementById('close-video');

const footerBar = document.getElementById('footer-bar');
const currentYearSpan = document.getElementById('current-year');
if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();

const bgAudio = document.getElementById('bg-audio');
const muteBtn = document.getElementById('mute-btn');
const iconUnmuted = document.getElementById('icon-unmuted');
const iconMuted = document.getElementById('icon-muted');
let userHasInteracted = false;
let isAudioPlaying = false;
let videoWasPlayingOnScroll = false;

// Sync initial icon state
iconMuted.style.display = bgAudio.muted ? 'block' : 'none';
iconUnmuted.style.display = bgAudio.muted ? 'none' : 'block';

// Format number to 3 digits (e.g. 1 -> "001")
const padZero = (num) => num.toString().padStart(3, '0');

// Generate image path
const getFramePath = (index) => `Public/Header Image Sequence/PS Studios Spring 2026 Agency CampaignHeader Sequence${padZero(index)}.png`;

const mausoleumBg = document.querySelector('.mausoleum-bg');

// --- 3. Preloader ---
function loadImages() {
  // Preload background video loop
  mausoleumBg.load();
  mausoleumBg.addEventListener('canplaythrough', () => {
    mausoleumBg.play().catch(e => console.log('Bg loop autoplay blocked:', e));
  }, { once: true });

  for (let i = 0; i < FRAME_COUNT; i++) {
    const img = new Image();
    img.src = getFramePath(i);
    
    img.onload = () => {
      imagesLoaded++;
      const progress = (imagesLoaded / FRAME_COUNT) * 100;
      loaderBar.style.width = `${progress}%`;
      
      if (imagesLoaded === FRAME_COUNT) {
        initExperience();
      }
    };
    
    img.onerror = () => {
      // In case a frame is missing, still increment so we don't block forever
      console.warn(`Failed to load frame ${i}`);
      imagesLoaded++;
      if (imagesLoaded === FRAME_COUNT) initExperience();
    };
    
    frames.push(img);
  }
}

// --- 4. Canvas Renderer ---
function resizeCanvas() {
  // Use devicePixelRatio for crisp rendering
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  
  // Normalize coordinate system to use css pixels
  ctx.scale(dpr, dpr);
  
  if (currentFrame >= 0) {
    drawFrame(currentFrame);
  }
}

function drawFrame(index) {
  const img = frames[index];
  if (!img || !img.complete) return;
  
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  
  // 'Cover' calculation
  const scale = Math.max(cw / iw, ch / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (cw - dw) / 2;
  const dy = (ch - dh) / 2;
  
  // Clear and draw
  ctx.clearRect(0, 0, cw, ch);
  ctx.drawImage(img, dx, dy, dw, dh);
}

// --- 5. Initialization ---
function initExperience() {
  // Hide Loader
  loader.style.opacity = '0';
  setTimeout(() => {
    loader.style.display = 'none';
    // Allow scrolling
    lenis.start();
  }, 800);
  
  // Initial setup
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  
  // Draw first frame
  currentFrame = 0;
  drawFrame(0);
  
  setupAnimations();
}

// --- 6. Scroll Animations (GSAP) ---
function setupAnimations() {
  // Hero Text Fade Out
  gsap.to(hero, {
    opacity: 0,
    y: -50,
    ease: "none",
    scrollTrigger: {
      trigger: scrollContainer,
      start: "top top",
      end: "10% top",
      scrub: true
    }
  });

  // Frame Sequence Mapping
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: "top top",
    end: "bottom bottom",
    scrub: 1.5, // Smooth scrubbing
    onUpdate: (self) => {
      // Map scroll progress (0 to 1) to frame index (0 to 201)
      const index = Math.min(Math.floor(self.progress * FRAME_COUNT), FRAME_COUNT - 1);
      
      if (index !== currentFrame) {
        currentFrame = index;
        requestAnimationFrame(() => drawFrame(currentFrame));
      }
      
      // Reveal Video Section at the very end
      if (self.progress > 0.99) {
        if (isAudioPlaying && !bgAudio.paused) bgAudio.pause();
        videoSection.style.opacity = '1';
        videoSection.style.pointerEvents = 'auto';
        footerBar.style.opacity = '0';
        footerBar.style.pointerEvents = 'none';
        
        // Unpause video if we scrolled back into view
        if (videoContainer.classList.contains('active') && videoWasPlayingOnScroll) {
          revealVideo.play();
          videoWasPlayingOnScroll = false;
        }
      } else {
        if (isAudioPlaying && bgAudio.paused && userHasInteracted) bgAudio.play().catch(e => {});
        
        // Pause video if scrolling away
        if (videoContainer.classList.contains('active') && !revealVideo.paused) {
          revealVideo.pause();
          videoWasPlayingOnScroll = true;
        }

        videoSection.style.opacity = '0';
        videoSection.style.pointerEvents = 'none';
        footerBar.style.opacity = '1';
        footerBar.style.pointerEvents = 'none'; // Will let CSS handle the pointer-events auto for children
      }
    }
  });
}

// --- 7. Video Interaction ---
playBtn.addEventListener('click', () => {
  // Hide play button, show video player
  playBtn.style.opacity = '0';
  setTimeout(() => {
    playBtn.style.display = 'none';
    videoContainer.classList.add('active');
    revealVideo.play();
  }, 300);
});

closeVideoBtn.addEventListener('click', () => {
  revealVideo.pause();
  revealVideo.currentTime = 0;
  videoContainer.classList.remove('active');
  
  // Bring back play button
  setTimeout(() => {
    playBtn.style.display = 'flex';
    // Trigger reflow
    void playBtn.offsetWidth;
    playBtn.style.opacity = '1';
  }, 500);
});

// --- 8. Background Audio Logic ---
function toggleMute() {
  bgAudio.muted = !bgAudio.muted;
  if (bgAudio.muted) {
    iconMuted.style.display = 'block';
    iconUnmuted.style.display = 'none';
  } else {
    iconMuted.style.display = 'none';
    iconUnmuted.style.display = 'block';
  }
}

muteBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleMute();
});

const enableAudio = () => {
  if (!userHasInteracted) {
    bgAudio.play().then(() => {
      isAudioPlaying = true;
      userHasInteracted = true;
    }).catch(e => {
      console.log('Autoplay blocked:', e);
    });
  }
};

['click', 'touchstart', 'keydown', 'mousedown', 'wheel'].forEach(event => {
  document.addEventListener(event, enableAudio);
});

// Start Loading
window.addEventListener('load', loadImages);

// --- 9. Custom Video Player Controls ---
const ctrlRewind = document.getElementById('ctrl-rewind');
const ctrlPlayPause = document.getElementById('ctrl-play-pause');
const ctrlEnd = document.getElementById('ctrl-end');
const ctrlTimeline = document.getElementById('ctrl-timeline');
const timeCurrent = document.getElementById('time-current');
const timeTotal = document.getElementById('time-total');
const ctrlMute = document.getElementById('ctrl-mute');
const ctrlVolume = document.getElementById('ctrl-volume');

const iconPlay = document.getElementById('icon-play');
const iconPause = document.getElementById('icon-pause');
const iconVolUp = document.getElementById('icon-vol-up');
const iconVolMute = document.getElementById('icon-vol-mute');

// Time formatting helper
function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Play / Pause Toggle
ctrlPlayPause.addEventListener('click', () => {
  if (revealVideo.paused) {
    revealVideo.play();
  } else {
    revealVideo.pause();
  }
});

// Update play/pause icons based on video state
revealVideo.addEventListener('play', () => {
  iconPlay.style.display = 'none';
  iconPause.style.display = 'block';
});

revealVideo.addEventListener('pause', () => {
  iconPlay.style.display = 'block';
  iconPause.style.display = 'none';
});

// Rewind
ctrlRewind.addEventListener('click', () => {
  revealVideo.currentTime = 0;
});

// Skip to End
ctrlEnd.addEventListener('click', () => {
  if (revealVideo.duration) {
    revealVideo.currentTime = revealVideo.duration - 0.1; // Jump to end
  }
});

// Timeline Scrubbing & Updating
function updateMetadata() {
  if (revealVideo.duration) {
    ctrlTimeline.max = revealVideo.duration;
    timeTotal.textContent = formatTime(revealVideo.duration);
  }
}

// Check if metadata is already loaded
if (revealVideo.readyState >= 1) {
  updateMetadata();
} else {
  revealVideo.addEventListener('loadedmetadata', updateMetadata);
}

revealVideo.addEventListener('timeupdate', () => {
  // Only update timeline if user isn't currently dragging it
  if (document.activeElement !== ctrlTimeline) {
    ctrlTimeline.value = revealVideo.currentTime;
  }
  timeCurrent.textContent = formatTime(revealVideo.currentTime);
});

ctrlTimeline.addEventListener('input', (e) => {
  revealVideo.currentTime = e.target.value;
});

// Mute Toggle
ctrlMute.addEventListener('click', () => {
  revealVideo.muted = !revealVideo.muted;
  updateVolumeUI();
});

// Volume Slider
ctrlVolume.addEventListener('input', (e) => {
  revealVideo.volume = e.target.value;
  revealVideo.muted = e.target.value === '0';
  updateVolumeUI();
});

function updateVolumeUI() {
  if (revealVideo.muted || revealVideo.volume === 0) {
    iconVolUp.style.display = 'none';
    iconVolMute.style.display = 'block';
    ctrlVolume.value = 0;
  } else {
    iconVolUp.style.display = 'block';
    iconVolMute.style.display = 'none';
    ctrlVolume.value = revealVideo.volume;
  }
}

// Ensure video doesn't have default controls and set initial volume
revealVideo.controls = false;
revealVideo.volume = 1;
updateVolumeUI();
