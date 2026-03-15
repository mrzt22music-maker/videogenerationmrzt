/* ════════════════════════════════════════════════════════
   GenTube – app.js
   JSON2Video API через Cloudflare Worker прокси
   Асинхронный поллинг — без таймаутов
   ════════════════════════════════════════════════════════ */

const PROXY_URL = "https://hf-proxy2.mrzt22music.workers.dev";

// ── STATE ─────────────────────────────────────────────────
let selectedStyle    = "cinematic";
let selectedDuration = 5;
let sidebarCollapsed = false;
let lastPrompt       = "";
let lastVideoBlob    = null;
let toastTimer       = null;

// ── DOM ───────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const sidebar        = $("sidebar");
const sidebarToggle  = $("sidebarToggle");
const mainContent    = document.querySelector(".main-content");
const promptInput    = $("promptInput");
const generateBtn    = $("generateBtn");
const homepageView   = $("homepageView");
const watchView      = $("watchView");
const videoSkeleton  = $("videoSkeleton");
const videoResult    = $("videoResult");
const videoInfo      = $("videoInfo");
const generatedVideo = $("generatedVideo");
const playerOverlay  = $("playerOverlay");
const generatedGif   = $("generatedGif");
const playerError    = $("playerError");
const errorMessage   = $("errorMessage");
const retryBtn       = $("retryBtn");
const downloadBtn    = $("downloadBtn");
const videoTitle     = $("videoTitle");
const viewCount      = $("viewCount");
const descriptionText= $("descriptionText");
const videoGrid      = $("videoGrid");
const recommendations= $("recommendations");
const toast          = $("toast");

// ── SUGGESTIONS PER STYLE ────────────────────────────────
const SUGGESTIONS = {
  cinematic:   ["Закат над неоновым городом", "Дождливая ночь в Токио", "Космический корабль в гиперпространстве", "Древние руины в тумане"],
  tech:        ["Процессор под микроскопом", "Код на экране в темноте", "Робот собирает электронику", "Голографический интерфейс"],
  travel:      ["Горные вершины на рассвете", "Тропический пляж с волнами", "Ночной Париж с Эйфелевой башней", "Сафари в африканской саванне"],
  gaming:      ["Эпическая битва в фэнтези мире", "Гоночные машины на неоновой трассе", "Космический шутер среди звёзд", "Подземелье с драконом"],
  cooking:     ["Паста с соусом крупным планом", "Японские суши в ресторане", "Свежий хлеб из печи", "Красочный фруктовый смузи"],
  music:       ["Концерт с лазерным шоу", "Пианист в ночном клубе", "Электронная музыка и визуализация", "Оркестр в концертном зале"],
  news:        ["Экстренное включение с места событий", "Пресс-конференция мирового лидера", "Биржевые котировки в реальном времени", "Прогноз погоды с картой"],
  educational: ["Строение атома 3D визуализация", "Эволюция динозавров", "Как работает ДНК", "Путешествие к центру Земли"],
};

// ── SEED DATA ─────────────────────────────────────────────
const SEED_VIDEOS = [
  { title: "Закат над неоновым футуристическим городом", channel: "AI Cinema", views: "4.2M", duration: "0:08", ago: "2 дня назад", progress: 0, gradient: "135deg, #1a1a2e, #e94560", style: "🎬" },
  { title: "Горный орёл в туманной долине", channel: "Nature AI", views: "2.8M", duration: "0:12", ago: "5 дней назад", progress: 60, gradient: "135deg, #0a3d0a, #f9a825", style: "✈️" },
  { title: "Подводный коралловый риф со светящимися рыбами", channel: "OceanGen", views: "1.1M", duration: "0:10", ago: "1 неделю назад", progress: 0, gradient: "135deg, #003060, #00b4d8", style: "✈️" },
  { title: "Абстрактное жидкое искусство в замедленной съёмке", channel: "ArtFlow AI", views: "890K", duration: "0:15", ago: "3 дня назад", progress: 30, gradient: "135deg, #6a0572, #f72585", style: "🎵" },
  { title: "Астронавт на терраформированном Марсе", channel: "SpaceGenAI", views: "3.4M", duration: "0:09", ago: "6 часов назад", progress: 0, gradient: "135deg, #2d1b69, #c1440e", style: "💻" },
  { title: "Средневековый замок под грозовым небом", channel: "HistoryAI", views: "567K", duration: "0:11", ago: "2 недели назад", progress: 0, gradient: "135deg, #1c1c1c, #5a5a5a", style: "🎬" },
  { title: "Робот собирает микросхему крупным планом", channel: "TechVision", views: "2.1M", duration: "0:07", ago: "1 день назад", progress: 0, gradient: "135deg, #001f3f, #00cfff", style: "💻" },
  { title: "Цветение сакуры в японском саду", channel: "WabiSabi AI", views: "1.7M", duration: "0:14", ago: "4 дня назад", progress: 75, gradient: "135deg, #3d0c45, #ff9eb5", style: "✈️" },
  { title: "Таймлапс грозы над Гранд-Каньоном", channel: "WeatherGen", views: "4.9M", duration: "0:10", ago: "3 часа назад", progress: 0, gradient: "135deg, #0d0d0d, #f97316", style: "📚" },
  { title: "Биолюминесцентные существа в глубинах океана", channel: "DeepOceanAI", views: "730K", duration: "0:13", ago: "5 дней назад", progress: 0, gradient: "135deg, #000814, #0077b6", style: "📚" },
  { title: "Эпическая битва в фэнтезийном мире", channel: "GamingAI", views: "8.1M", duration: "0:06", ago: "2 дня назад", progress: 20, gradient: "135deg, #1a0033, #7209b7", style: "🎮" },
  { title: "Северное сияние над замёрзшей тундрой", channel: "ArcticAI", views: "3.3M", duration: "0:11", ago: "1 неделю назад", progress: 0, gradient: "135deg, #0d1b2a, #00f5d4", style: "✈️" },
];

const REC_VIDEOS = [
  { title: "Улицы города в дождь, кино слоу-мо", channel: "RainVision", views: "2.3M просм.", duration: "0:08" },
  { title: "Визуализация квантового компьютера", channel: "TechArt AI", views: "980K просм.", duration: "0:12" },
  { title: "Таймлапс заката над дюнами Сахары", channel: "DesertGen", views: "1.4M просм.", duration: "0:09" },
  { title: "Голографический дисплей в киберпанк-переулке", channel: "NeonDreams", views: "4.0M просм.", duration: "0:07" },
  { title: "Стая волков бежит по заснеженному лесу", channel: "WildlifeAI", views: "1.8M просм.", duration: "0:11" },
  { title: "Макросъёмка распускающейся розы 4K", channel: "MacroGen AI", views: "620K просм.", duration: "0:10" },
];

const GRADIENTS = [
  "135deg, #1a1a2e, #e94560", "135deg, #003060, #00b4d8",
  "135deg, #0a3d0a, #f9a825", "135deg, #2d1b69, #c1440e",
  "135deg, #001f3f, #00cfff", "135deg, #6a0572, #f72585",
];

// ── INIT ──────────────────────────────────────────────────
function init() {
  renderVideoGrid();
  renderRecommendations();
  renderSuggestions();
  bindEvents();
  const seen = localStorage.getItem("gt_disclaimer");
  if (!seen) {
    $("disclaimerModal").classList.remove("hidden");
  } else {
    $("disclaimerModal").classList.add("hidden");
  }
}

// ── RENDER GRID ───────────────────────────────────────────
function renderVideoGrid() {
  videoGrid.innerHTML = "";
  SEED_VIDEOS.forEach(vid => {
    const card = document.createElement("div");
    card.className = "video-card";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.innerHTML = `
      <div class="card-thumb-wrap">
        <canvas class="card-thumb" data-gradient="${vid.gradient}" width="320" height="180"></canvas>
        <span class="card-duration">${vid.duration}</span>
        ${vid.progress ? `<div class="card-progress-bar" style="width:${vid.progress}%"></div>` : ""}
      </div>
      <div class="card-info">
        <div class="card-channel-avatar">${vid.style}</div>
        <div class="card-text">
          <div class="card-title">${vid.title}</div>
          <div class="card-channel">${vid.channel}</div>
          <div class="card-meta">${vid.views} просм. · ${vid.ago}</div>
        </div>
      </div>
    `;
    card.addEventListener("click", () => {
      promptInput.value = vid.title;
      showWatchView(vid.title, false);
    });
    card.addEventListener("keydown", e => { if (e.key === "Enter") card.click(); });
    videoGrid.appendChild(card);
  });
  requestAnimationFrame(paintThumbnails);
}

function paintThumbnails() {
  document.querySelectorAll("canvas.card-thumb[data-gradient]").forEach(canvas => {
    const ctx = canvas.getContext("2d");
    const [, c1, c2] = canvas.dataset.gradient.split(", ");
    const grd = ctx.createLinearGradient(0, 0, 320, 180);
    grd.addColorStop(0, c1); grd.addColorStop(1, c2);
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 320, 180);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.font = "bold 56px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("▶", 160, 90);
  });
}

// ── RENDER RECOMMENDATIONS ────────────────────────────────
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
      grd.addColorStop(0, c1); grd.addColorStop(1, c2);
      ctx.fillStyle = grd; ctx.fillRect(0, 0, 168, 94);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("▶", 84, 47);
    });
  });
}

// ── RENDER SUGGESTIONS ────────────────────────────────────
function renderSuggestions() {
  const container = $("promptSuggestions");
  container.innerHTML = "";
  (SUGGESTIONS[selectedStyle] || []).forEach(s => {
    const chip = document.createElement("button");
    chip.className = "suggestion-chip";
    chip.textContent = s;
    chip.addEventListener("click", () => {
      promptInput.value = s;
      promptInput.focus();
    });
    container.appendChild(chip);
  });
}

// ── EVENTS ───────────────────────────────────────────────
function bindEvents() {
  $("acceptDisclaimer").addEventListener("click", () => {
    localStorage.setItem("gt_disclaimer", "1");
    $("disclaimerModal").classList.add("hidden");
  });
  $("disclaimerBtn").addEventListener("click", () => {
    $("disclaimerModal").classList.remove("hidden");
  });
  $("showDisclaimerNav").addEventListener("click", e => {
    e.preventDefault();
    $("disclaimerModal").classList.remove("hidden");
  });

  sidebarToggle.addEventListener("click", toggleSidebar);
  generateBtn.addEventListener("click", handleGenerate);
  promptInput.addEventListener("keydown", e => { if (e.key === "Enter") handleGenerate(); });
  retryBtn.addEventListener("click", () => { if (lastPrompt) generateVideo(lastPrompt); });
  downloadBtn.addEventListener("click", handleDownload);

  document.querySelectorAll(".style-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".style-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedStyle = btn.dataset.style;
      renderSuggestions();
    });
  });

  document.querySelectorAll(".style-link").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      selectedStyle = link.dataset.style;
      document.querySelectorAll(".style-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.style === selectedStyle);
      });
      renderSuggestions();
      showToast(`Стиль: ${link.querySelector("span").textContent}`);
    });
  });

  document.querySelectorAll(".dur-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".dur-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedDuration = parseInt(btn.dataset.dur);
    });
  });

  document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
    });
  });

  mainContent.addEventListener("click", () => {
    if (window.innerWidth <= 768 && sidebar.classList.contains("mobile-open")) {
      sidebar.classList.remove("mobile-open");
    }
  });

  document.querySelector(".logo-link").addEventListener("click", e => {
    e.preventDefault();
    watchView.classList.add("hidden");
    homepageView.classList.remove("hidden");
    promptInput.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// ── SIDEBAR ───────────────────────────────────────────────
function toggleSidebar() {
  if (window.innerWidth <= 768) { sidebar.classList.toggle("mobile-open"); return; }
  sidebarCollapsed = !sidebarCollapsed;
  sidebar.classList.toggle("collapsed", sidebarCollapsed);
  mainContent.classList.toggle("expanded", sidebarCollapsed);
}

// ── GENERATE HANDLER ─────────────────────────────────────
function handleGenerate() {
  const prompt = promptInput.value.trim();
  if (!prompt) { showToast("Введите описание видео."); promptInput.focus(); return; }
  lastPrompt = prompt;
  showWatchView(prompt, true);
}

// ── VIEWS ─────────────────────────────────────────────────
function showWatchView(prompt, generate = true) {
  homepageView.classList.add("hidden");
  watchView.classList.remove("hidden");
  videoSkeleton.classList.remove("hidden");
  videoResult.classList.add("hidden");
  videoInfo.classList.add("hidden");
  playerError.classList.add("hidden");
  generatedVideo.src = "";
  generatedGif.src = "";
  playerOverlay.classList.add("hidden");
  lastVideoBlob = null;

  const styleEmojis = { cinematic:"🎬", tech:"💻", travel:"✈️", gaming:"🎮", cooking:"🍳", music:"🎵", news:"📺", educational:"📚" };
  const emoji = styleEmojis[selectedStyle] || "🎬";

  videoTitle.textContent = `${emoji} ${prompt}`;
  descriptionText.textContent = `AI-сгенерированное видео (${selectedDuration} сек, стиль: ${selectedStyle}) по описанию: "${prompt}". Создано с помощью GenTube AI. Только для личного использования. Монетизация запрещена.`;
  viewCount.textContent = (Math.floor(Math.random() * 900) + 100).toLocaleString();

  if (generate) {
    generateVideo(prompt);
  } else {
    setTimeout(() => showDemoPlaceholder(prompt), 600);
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showDemoPlaceholder(prompt) {
  videoSkeleton.classList.add("hidden");
  videoResult.classList.remove("hidden");
  videoInfo.classList.remove("hidden");
  const canvas = document.createElement("canvas");
  canvas.width = 1280; canvas.height = 720;
  const ctx = canvas.getContext("2d");
  const grd = ctx.createLinearGradient(0, 0, 1280, 720);
  grd.addColorStop(0, "#1a1a2e"); grd.addColorStop(1, "#e94560");
  ctx.fillStyle = grd; ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.font = "bold 120px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("▶", 640, 340);
  ctx.font = "bold 24px sans-serif";
  ctx.fillText("Нажмите Генерировать для создания видео", 640, 480);
  canvas.toBlob(blob => {
    generatedGif.src = URL.createObjectURL(blob);
    playerOverlay.classList.remove("hidden");
    generatedVideo.classList.add("hidden");
  }, "image/png");
}

// ══════════════════════════════════════════════════════════
//  API — асинхронный поллинг
//  1. POST /        → создаём проект, получаем project_id
//  2. GET  /status  → опрашиваем каждые 5 сек из браузера
//  Cloudflare Worker больше не ждёт — нет таймаутов
// ══════════════════════════════════════════════════════════
async function generateVideo(prompt) {
  setLoadingState(true);
  try {
    console.log(`[GenTube] Starting: "${prompt}" | ${selectedStyle} | ${selectedDuration}s`);

    // ── Шаг 1: создаём проект ────────────────────────────
    const createRes = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        style: selectedStyle,
        duration: selectedDuration,
      })
    });

    const createData = await createRes.json();
    console.log("[GenTube] Created:", createData);

    if (createData.error) throw new Error(createData.error);

    const projectId = createData.project_id;
    if (!projectId) throw new Error("Не получен ID проекта от сервера.");

    showToast("Видео рендерится… обычно 30–60 секунд", 8000);

    // ── Шаг 2: поллинг статуса каждые 5 сек ─────────────
    let attempts = 0;
    const maxAttempts = 24; // 24 × 5сек = 120сек максимум

    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 5000));
      attempts++;

      const statusRes = await fetch(`${PROXY_URL}/status?project=${projectId}`);
      const statusData = await statusRes.json();
      console.log(`[GenTube] Poll ${attempts}/24:`, statusData);

      const elapsed = attempts * 5;

      if (statusData.status === "done" || statusData.status === "completed") {
        if (!statusData.video_url) throw new Error("Видео готово, но URL не найден.");
        showToast("Загружаем видео…");
        const videoRes = await fetch(statusData.video_url);
        const blob = await videoRes.blob();
        handleVideoBlob(blob, prompt);
        return;
      }

      if (statusData.status === "error") {
        throw new Error("Ошибка рендеринга: " + (statusData.message || "неизвестная ошибка"));
      }

      // Обновляем прогресс в тосте
      showToast(`Рендеринг видео… ${elapsed} сек`, 6000);
    }

    throw new Error("Таймаут. Видео не готово за 2 минуты. Попробуйте снова.");

  } catch (err) {
    console.error("[GenTube] Failed:", err);
    showError(err.message || "Произошла неизвестная ошибка.");
  }
}

// ── RESPONSE HANDLERS ────────────────────────────────────
function handleVideoBlob(blob, prompt) {
  lastVideoBlob = blob;
  generatedVideo.src = URL.createObjectURL(blob);
  generatedVideo.classList.remove("hidden");
  playerOverlay.classList.add("hidden");
  setLoadingState(false);
  videoResult.classList.remove("hidden");
  videoInfo.classList.remove("hidden");
  playerError.classList.add("hidden");
  viewCount.textContent = (Math.floor(Math.random() * 900000) + 10000).toLocaleString();
  showToast("Видео успешно сгенерировано!");
}

// ── UI HELPERS ────────────────────────────────────────────
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
      <span>Генерируем…</span>
    `;
    if (!document.getElementById("spin-style")) {
      const s = document.createElement("style");
      s.id = "spin-style";
      s.textContent = "@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}";
      document.head.appendChild(s);
    }
  } else {
    generateBtn.innerHTML = `
      <svg viewBox="0 0 24 24" class="icon"><path d="M8 5v14l11-7z"/></svg>
      <span>Генерировать</span>
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

function handleDownload() {
  if (!lastVideoBlob) { showToast("Нет видео для скачивания."); return; }
  const ext = lastVideoBlob.type.includes("gif") ? "gif"
            : lastVideoBlob.type.includes("webm") ? "webm" : "mp4";
  const a = document.createElement("a");
  a.href = URL.createObjectURL(lastVideoBlob);
  a.download = `gentube-${Date.now()}.${ext}`;
  a.click();
  showToast("Скачивание началось!");
}

function showToast(message, duration = 3000) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.remove("hidden");
  void toast.offsetWidth;
  toast.classList.add("show");
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.classList.add("hidden"), 300);
  }, duration);
}

// ── KICK OFF ──────────────────────────────────────────────
init();
