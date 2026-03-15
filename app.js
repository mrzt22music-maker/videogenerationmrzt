/* ════════════════════════════════════════════════════════
   GenTube – app.js
   AI Video Generation via Hugging Face Inference API
   ════════════════════════════════════════════════════════

   SETUP:
   1. Go to https://huggingface.co/settings/tokens
   2. Create a free account and generate an Access Token
   3. Paste it into HF_API_TOKEN below
   4. Optionally change HF_MODEL to another text-to-video model
      available on the Hugging Face Hub.

   Models to try (free tier):
     - damo-vilab/text-to-video-ms-1.7b  (default, good quality)
     - cerspense/zeroscope_v2_576w        (faster, lower res)
     - ali-vilab/i2vgen-xl                (image-to-video, needs image input)
   ════════════════════════════════════════════════════════ */

// ─── ⚙️  CONFIGURATION — EDIT HERE ───────────────────────
const HF_API_TOKEN = "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"; // 🔑 Replace with your token
const HF_MODEL     = "cerspense/zeroscope_v2_576w"; // Change model if desired
// ─────────────────────────────────────────────────────────

const HF_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

// ══════════════════════════════════════════════════════════
//  DOM REFERENCES
// ══════════════════════════════════════════════════════════
const $ = id => document.getElementById(id);

const sidebar          = $("sidebar");
const sidebarToggle    = $("sidebarToggle");
const mainContent      = document.querySelector(".main-content");
const promptInput      = $("promptInput");
const generateBtn      = $("generateBtn");

const homepageView     = $("homepageView");
const watchView        = $("watchView");

const videoSkeleton    = $("videoSkeleton");
const videoResult      = $("videoResult");
const videoInfo        = $("videoInfo");

const generatedVideo   = $("generatedVideo");
const playerOverlay    = $("playerOverlay");
const generatedGif     = $("generatedGif");
const playerError      = $("playerError");
const errorMessage     = $("errorMessage");
const retryBtn         = $("retryBtn");
const downloadBtn      = $("downloadBtn");

const videoTitle       = $("videoTitle");
const viewCount        = $("viewCount");
const descriptionText  = $("descriptionText");
const videoGrid        = $("videoGrid");
const recommendations  = $("recommendations");
const toast            = $("toast");

// ══════════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════════
let sidebarCollapsed = false;
let lastPrompt       = "";
let lastVideoBlob    = null;
let toastTimer       = null;

// ══════════════════════════════════════════════════════════
//  PLACEHOLDER / SEED DATA
// ══════════════════════════════════════════════════════════
const SEED_VIDEOS = [
  { title: "A cinematic sunset over a neon-lit futuristic city",    channel: "AI Cinema",    views: "4.2M",  duration: "0:08", ago: "2 days ago",    progress: 0,   gradient: "135deg, #1a1a2e, #e94560" },
  { title: "Golden eagle soaring through misty mountain valleys",   channel: "Nature AI",    views: "2.8M",  duration: "0:12", ago: "5 days ago",    progress: 60,  gradient: "135deg, #0a3d0a, #f9a825" },
  { title: "Underwater coral reef with exotic glowing fish",        channel: "OceanGen",     views: "1.1M",  duration: "0:10", ago: "1 week ago",    progress: 0,   gradient: "135deg, #003060, #00b4d8" },
  { title: "Abstract fluid art morphing in slow motion",            channel: "ArtFlow AI",   views: "890K",  duration: "0:15", ago: "3 days ago",    progress: 30,  gradient: "135deg, #6a0572, #f72585" },
  { title: "Astronaut walking on a terraformed Mars colony",        channel: "SpaceGenAI",   views: "3.4M",  duration: "0:09", ago: "6 hours ago",   progress: 0,   gradient: "135deg, #2d1b69, #c1440e" },
  { title: "Medieval castle under a stormy dramatic sky",           channel: "HistoryAI",    views: "567K",  duration: "0:11", ago: "2 weeks ago",   progress: 0,   gradient: "135deg, #1c1c1c, #5a5a5a" },
  { title: "Hyper-realistic robot hand building a circuit board",   channel: "TechVision",   views: "2.1M",  duration: "0:07", ago: "1 day ago",     progress: 0,   gradient: "135deg, #001f3f, #00cfff" },
  { title: "Cherry blossoms falling in a traditional Japanese garden", channel: "WabiSabi AI", views: "1.7M", duration: "0:14", ago: "4 days ago",   progress: 75,  gradient: "135deg, #3d0c45, #ff9eb5" },
  { title: "Time-lapse of a thunderstorm over the Grand Canyon",    channel: "WeatherGen",   views: "4.9M",  duration: "0:10", ago: "3 hours ago",   progress: 0,   gradient: "135deg, #0d0d0d, #f97316" },
  { title: "Deep-sea bioluminescent creatures in pitch darkness",   channel: "DeepOceanAI",  views: "730K",  duration: "0:13", ago: "5 days ago",    progress: 0,   gradient: "135deg, #000814, #0077b6" },
  { title: "Viral dance performed by realistic 3D humanoid robot",  channel: "RoboGroove",   views: "8.1M",  duration: "0:06", ago: "2 days ago",    progress: 20,  gradient: "135deg, #1a0033, #7209b7" },
  { title: "Photorealistic aurora borealis over frozen tundra",     channel: "ArcticAI",     views: "3.3M",  duration: "0:11", ago: "1 week ago",    progress: 0,   gradient: "135deg, #0d1b2a, #00f5d4" },
];

const REC_VIDEOS = [
  { title: "City streets in the rain, cinematic slow-mo",       channel: "RainVision",   views: "2.3M views",  duration: "0:08" },
  { title: "Quantum computer visualization abstract art",       channel: "TechArt AI",   views: "980K views",  duration: "0:12" },
  { title: "Sunset timelapse over Sahara dunes",                channel: "DesertGen",    views: "1.4M views",  duration: "0:09" },
  { title: "Holographic display in cyberpunk alley",            channel: "NeonDreams",   views: "4.0M views",  duration: "0:07" },
  { title: "Wolf pack running through a snowy forest",          channel: "WildlifeAI",   views: "1.8M views",  duration: "0:11" },
  { title: "Macro shot of a blooming rose in 4K",               channel: "MacroGen AI",  views: "620K views",  duration: "0:10" },
];

const GRADIENTS = [
  "135deg, #1a1a2e, #e94560",
  "135deg, #003060, #00b4d8",
  "135deg, #0a3d0a, #f9a825",
  "135deg, #2d1b69, #c1440e",
  "135deg, #001f3f, #00cfff",
  "135deg, #6a0572, #f72585",
];

// ══════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════
function init() {
  renderVideoGrid();
  renderRecommendations();
  bindEvents();
}

// ══════════════════════════════════════════════════════════
//  RENDER – HOMEPAGE GRID
// ══════════════════════════════════════════════════════════
function renderVideoGrid() {
  videoGrid.innerHTML = "";
  SEED_VIDEOS.forEach((vid, i) => {
    const card = document.createElement("div");
    card.className = "video-card";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", vid.title);

    card.innerHTML = `
      <div class="card-thumb-wrap">
        <canvas class="card-thumb" data-gradient="${vid.gradient}" width="320" height="180"></canvas>
        <span class="card-duration">${vid.duration}</span>
        ${vid.progress ? `<div class="card-progress-bar" style="width:${vid.progress}%"></div>` : ""}
      </div>
      <div class="card-info">
        <div class="card-channel-avatar">${vid.channel[0]}</div>
        <div class="card-text">
          <div class="card-title">${vid.title}</div>
          <div class="card-channel">${vid.channel}</div>
          <div class="card-meta">${vid.views} views · ${vid.ago}</div>
        </div>
      </div>
    `;

    // Click: load this prompt into player as demo
    card.addEventListener("click", () => {
      promptInput.value = vid.title;
      showWatchView(vid.title, false /* don't auto-generate, just demo */);
    });
    card.addEventListener("keydown", e => { if (e.key === "Enter") card.click(); });

    videoGrid.appendChild(card);
  });

  // Paint placeholder gradient thumbnails on canvases
  requestAnimationFrame(paintThumbnails);
}

function paintThumbnails() {
  document.querySelectorAll("canvas.card-thumb[data-gradient]").forEach(canvas => {
    const ctx = canvas.getContext("2d");
    const [deg, c1, c2] = canvas.dataset.gradient.split(", ");
    const grd = ctx.createLinearGradient(0, 0, 320, 180);
    grd.addColorStop(0, c1);
    grd.addColorStop(1, c2);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 320, 180);
    // AI icon overlay
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.font = "bold 56px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("▶", 160, 90);
  });
}

// ══════════════════════════════════════════════════════════
//  RENDER – RECOMMENDATIONS
// ══════════════════════════════════════════════════════════
function renderRecommendations() {
  recommendations.innerHTML = "";
  REC_VIDEOS.forEach((vid, i) => {
    const card = document.createElement("div");
    card.className = "rec-card";
    card.innerHTML = `
      <div class="rec-thumb">
        <canvas width="168" height="94" data-gradient="${GRADIENTS[i % GRADIENTS.length]}"></canvas>
      </div>
      <div class="rec-info">
        <div class="rec-title-text">${vid.title}</div>
        <div class="rec-channel">${vid.channel}</div>
        <div class="rec-views">${vid.views} · ${vid.duration}</div>
      </div>
    `;
    recommendations.appendChild(card);
  });
  requestAnimationFrame(() => {
    document.querySelectorAll(".rec-thumb canvas[data-gradient]").forEach(canvas => {
      const ctx = canvas.getContext("2d");
      const [, c1, c2] = canvas.dataset.gradient.split(", ");
      const grd = ctx.createLinearGradient(0, 0, 168, 94);
      grd.addColorStop(0, c1);
      grd.addColorStop(1, c2);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, 168, 94);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("▶", 84, 47);
    });
  });
}

// ══════════════════════════════════════════════════════════
//  EVENTS
// ══════════════════════════════════════════════════════════
function bindEvents() {
  // Sidebar toggle
  sidebarToggle.addEventListener("click", toggleSidebar);

  // Generate button
  generateBtn.addEventListener("click", handleGenerate);

  // Enter key in prompt input
  promptInput.addEventListener("keydown", e => {
    if (e.key === "Enter") handleGenerate();
  });

  // Retry button
  retryBtn.addEventListener("click", () => {
    if (lastPrompt) generateVideo(lastPrompt);
  });

  // Download button
  downloadBtn.addEventListener("click", handleDownload);

  // Chip clicks
  document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
    });
  });

  // Mobile: close sidebar when clicking main
  mainContent.addEventListener("click", () => {
    if (window.innerWidth <= 768 && sidebar.classList.contains("mobile-open")) {
      sidebar.classList.remove("mobile-open");
    }
  });
}

// ══════════════════════════════════════════════════════════
//  SIDEBAR
// ══════════════════════════════════════════════════════════
function toggleSidebar() {
  if (window.innerWidth <= 768) {
    sidebar.classList.toggle("mobile-open");
    return;
  }
  sidebarCollapsed = !sidebarCollapsed;
  sidebar.classList.toggle("collapsed", sidebarCollapsed);
  mainContent.classList.toggle("expanded", sidebarCollapsed);
}

// ══════════════════════════════════════════════════════════
//  GENERATE HANDLER
// ══════════════════════════════════════════════════════════
function handleGenerate() {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    showToast("Please enter a video prompt first.");
    promptInput.focus();
    return;
  }
  lastPrompt = prompt;
  showWatchView(prompt, true /* auto-generate */);
}

// ══════════════════════════════════════════════════════════
//  SWITCH VIEWS
// ══════════════════════════════════════════════════════════
function showWatchView(prompt, generate = true) {
  homepageView.classList.add("hidden");
  watchView.classList.remove("hidden");

  // Reset to skeleton state
  videoSkeleton.classList.remove("hidden");
  videoResult.classList.add("hidden");
  videoInfo.classList.add("hidden");
  playerError.classList.add("hidden");
  generatedVideo.src = "";
  generatedGif.src   = "";
  playerOverlay.classList.add("hidden");
  lastVideoBlob      = null;

  // Set title immediately
  videoTitle.textContent = prompt;
  descriptionText.textContent = `AI-generated video for: "${prompt}". Created using the GenTube AI Video Generator powered by Hugging Face Inference API.`;

  // Randomize view count for fun
  viewCount.textContent = (Math.floor(Math.random() * 900) + 100).toLocaleString();

  if (generate) {
    generateVideo(prompt);
  } else {
    // Demo mode: show a "placeholder" error-free state with info visible
    setTimeout(() => {
      showDemoPlaceholder(prompt);
    }, 600);
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showDemoPlaceholder(prompt) {
  videoSkeleton.classList.add("hidden");
  videoResult.classList.remove("hidden");
  videoInfo.classList.remove("hidden");

  // Draw a gradient placeholder in the player
  const canvas = document.createElement("canvas");
  canvas.width  = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");
  const grd = ctx.createLinearGradient(0, 0, 1280, 720);
  grd.addColorStop(0, "#1a1a2e");
  grd.addColorStop(1, "#e94560");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.font = "bold 120px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("▶", 640, 360);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText("Click Generate to create this video", 640, 480);

  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    generatedGif.src = url;
    playerOverlay.classList.remove("hidden");
    generatedVideo.classList.add("hidden");
  }, "image/png");
}

// ══════════════════════════════════════════════════════════
//  API CALL — HUGGING FACE INFERENCE
// ══════════════════════════════════════════════════════════
async function generateVideo(prompt) {
  // Validate API token
  if (!HF_API_TOKEN || HF_API_TOKEN === "YOUR_HUGGINGFACE_API_TOKEN_HERE") {
    showError("No API token configured. Please open app.js and add your Hugging Face API token to HF_API_TOKEN.");
    return;
  }

  setLoadingState(true);

  try {
    console.log(`[GenTube] Generating video for: "${prompt}"`);
    console.log(`[GenTube] Model: ${HF_MODEL}`);
    console.log(`[GenTube] Endpoint: ${HF_API_URL}`);

    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          // Hugging Face text-to-video common parameters
          num_inference_steps: 25,    // fewer = faster, lower quality
          num_frames: 16,             // number of video frames
          guidance_scale: 9,          // how closely to follow the prompt
          height: 256,                // output height (px)
          width:  256,                // output width  (px)
        },
        options: {
          wait_for_model: true,       // wait instead of receiving a 503
          use_cache: false,           // always generate fresh
        }
      })
    });

    // ── Handle non-2xx responses ─────────────────────────
    if (!response.ok) {
      const status = response.status;

      if (status === 401) {
        throw new Error("Invalid API token. Check your Hugging Face token in app.js.");
      }
      if (status === 403) {
        throw new Error("Access denied. Make sure your token has 'read' permissions.");
      }
      if (status === 404) {
        throw new Error(`Model "${HF_MODEL}" not found. Try a different model in HF_MODEL.`);
      }
      if (status === 503) {
        // Model is loading — Hugging Face spins down models when idle
        const errData = await response.json().catch(() => ({}));
        const eta = errData.estimated_time ? `~${Math.ceil(errData.estimated_time)}s` : "a moment";
        throw new Error(`Model is loading (${eta}). Please wait and try again — this is normal for free tier models.`);
      }
      if (status === 429) {
        throw new Error("Rate limit exceeded. Please wait a minute before generating again.");
      }

      // Generic error
      const errText = await response.text().catch(() => "Unknown error");
      throw new Error(`API Error ${status}: ${errText.slice(0, 200)}`);
    }

    // ── Parse response ───────────────────────────────────
    const contentType = response.headers.get("content-type") || "";

    // Most text-to-video models return a binary video/mp4 or video/webm blob
    if (contentType.includes("video") || contentType.includes("octet-stream")) {
      const blob = await response.blob();
      handleVideoBlob(blob, prompt);
      return;
    }

    // Some models return a GIF
    if (contentType.includes("image/gif") || contentType.includes("image/")) {
      const blob = await response.blob();
      handleImageBlob(blob, prompt);
      return;
    }

    // Fallback: try to parse as JSON (some models wrap output)
    const json = await response.json();
    console.log("[GenTube] JSON response:", json);

    // HF might return { video: base64 } or an array
    if (json.video) {
      const blob = base64ToBlob(json.video, "video/mp4");
      handleVideoBlob(blob, prompt);
      return;
    }
    if (Array.isArray(json) && json[0]?.blob) {
      const blob = base64ToBlob(json[0].blob, "video/mp4");
      handleVideoBlob(blob, prompt);
      return;
    }

    throw new Error("Unexpected API response format. Check the browser console for details.");

  } catch (err) {
    console.error("[GenTube] Generation failed:", err);
    showError(err.message || "An unknown error occurred.");
  }
}

// ══════════════════════════════════════════════════════════
//  RESPONSE HANDLERS
// ══════════════════════════════════════════════════════════

/** Handle a video blob (mp4, webm, etc.) */
function handleVideoBlob(blob, prompt) {
  lastVideoBlob = blob;
  const url = URL.createObjectURL(blob);

  generatedVideo.src = url;
  generatedVideo.classList.remove("hidden");
  playerOverlay.classList.add("hidden");

  setLoadingState(false);
  videoResult.classList.remove("hidden");
  videoInfo.classList.remove("hidden");
  playerError.classList.add("hidden");

  viewCount.textContent = (Math.floor(Math.random() * 900000) + 10000).toLocaleString();
  showToast("Video generated successfully!");
  console.log("[GenTube] Video loaded from blob URL:", url);
}

/** Handle an image/GIF blob (some models return animated GIFs) */
function handleImageBlob(blob, prompt) {
  lastVideoBlob = blob;
  const url = URL.createObjectURL(blob);

  generatedGif.src = url;
  playerOverlay.classList.remove("hidden");
  generatedVideo.classList.add("hidden");

  setLoadingState(false);
  videoResult.classList.remove("hidden");
  videoInfo.classList.remove("hidden");
  playerError.classList.add("hidden");

  viewCount.textContent = (Math.floor(Math.random() * 900000) + 10000).toLocaleString();
  showToast("Video generated successfully!");
}

/** Convert base64 string to a Blob */
function base64ToBlob(base64, mimeType) {
  const byteChars = atob(base64);
  const byteArr   = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteArr[i] = byteChars.charCodeAt(i);
  }
  return new Blob([byteArr], { type: mimeType });
}

// ══════════════════════════════════════════════════════════
//  UI STATE HELPERS
// ══════════════════════════════════════════════════════════

function setLoadingState(loading) {
  generateBtn.disabled = loading;
  generateBtn.style.opacity = loading ? "0.6" : "1";

  if (loading) {
    videoSkeleton.classList.remove("hidden");
    videoResult.classList.add("hidden");
    videoInfo.classList.add("hidden");
    playerError.classList.add("hidden");
    generateBtn.innerHTML = `
      <svg viewBox="0 0 24 24" class="icon spin"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
      <span>Generating…</span>
    `;
    // Add spin animation inline
    const style = document.getElementById("spin-style") || (() => {
      const s = document.createElement("style");
      s.id = "spin-style";
      s.textContent = "@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }";
      document.head.appendChild(s);
      return s;
    })();
  } else {
    generateBtn.innerHTML = `
      <svg viewBox="0 0 24 24" class="icon"><path d="M8 5v14l11-7z"/></svg>
      <span>Generate</span>
    `;
  }
}

function showError(msg) {
  setLoadingState(false);
  videoSkeleton.classList.add("hidden");
  videoResult.classList.remove("hidden");
  videoInfo.classList.add("hidden");
  playerError.classList.remove("hidden");
  generatedVideo.classList.add("hidden");
  playerOverlay.classList.add("hidden");
  errorMessage.textContent = msg;
}

// ══════════════════════════════════════════════════════════
//  DOWNLOAD
// ══════════════════════════════════════════════════════════
function handleDownload() {
  if (!lastVideoBlob) {
    showToast("No video to download yet.");
    return;
  }
  const ext = lastVideoBlob.type.includes("gif") ? "gif" :
              lastVideoBlob.type.includes("webm") ? "webm" : "mp4";
  const a = document.createElement("a");
  a.href = URL.createObjectURL(lastVideoBlob);
  a.download = `gentube-${Date.now()}.${ext}`;
  a.click();
  showToast("Download started!");
}

// ══════════════════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════════════════
function showToast(message, duration = 3000) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.remove("hidden");
  // Force reflow to restart transition
  void toast.offsetWidth;
  toast.classList.add("show");
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.classList.add("hidden"), 300);
  }, duration);
}

// ══════════════════════════════════════════════════════════
//  BACK NAVIGATION (logo click)
// ══════════════════════════════════════════════════════════
document.querySelector(".logo-link").addEventListener("click", e => {
  e.preventDefault();
  watchView.classList.add("hidden");
  homepageView.classList.remove("hidden");
  promptInput.value = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ══════════════════════════════════════════════════════════
//  KICK OFF
// ══════════════════════════════════════════════════════════
init();
