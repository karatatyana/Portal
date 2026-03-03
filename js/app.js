// SUPABASE INIT
// ======================================

const SUPABASE_URL = "https://mwfuenrluttpreaaxbtt.supabase.co";
const SUPABASE_KEY = "sb_publishable_N1dNiWaQV2gCncK_ZbKNnw_1SUVjbDv";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let currentUser = null;
let userRole = "student";

let currentLessonId = null;
let currentModuleIndex = null;
let lessonTimer = null;

// ======================================
// INIT
// ======================================

document.addEventListener("DOMContentLoaded", async () => {

  renderSidebar();
  renderModulesGrid();

  const { data } = await db.auth.getSession();

  if (data?.session) {
    currentUser = data.session.user;
    await loadUserProfile();
    showMainContent();
  }
});

// ======================================
// PROFILE
// ======================================

async function loadUserProfile() {

  if (!currentUser) return;

  const { data, error } = await db
    .from("profiles")
    .select("role, full_name")
    .eq("id", currentUser.id)
    .single();

  if (!error && data) {
    userRole = data.role || "student";
    showUserName(data);
  } else {
    userRole = "student";
  }

  checkAdminUI();
  updateCourseProgress();
}

// ======================================
// AUTH
// ======================================

window.signUp = async function () {

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const name = document.getElementById("name")?.value || "";

  const { error } = await db.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name }
    }
  });

  document.getElementById("authMessage").innerText =
    error ? error.message : "Регистрация успешна! Проверь email.";
};

window.signIn = async function () {

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await db.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    document.getElementById("authMessage").innerText = error.message;
    return;
  }

  currentUser = data.user;

  await loadUserProfile();
  showMainContent();
};

window.signOut = async function () {

  await db.auth.signOut();

  currentUser = null;
  userRole = "student";

  document.getElementById("mainContent").style.display = "none";
  document.getElementById("adminScreen").style.display = "none";
  document.getElementById("authBlock").style.display = "flex";
  document.getElementById("userPanel").style.display = "none";

  checkAdminUI();
};

// ======================================
// UI
// ======================================

function showMainContent() {
  document.getElementById("authBlock").style.display = "none";
  document.getElementById("mainContent").style.display = "flex";
  document.getElementById("userPanel").style.display = "flex";
}

function showUserName(profile) {

  const nameBlock = document.getElementById("userName");
  if (!nameBlock) return;

  const name =
    profile?.full_name ||
    currentUser.user_metadata?.full_name ||
    "Пользователь";

  nameBlock.textContent = "Привет, " + name;
}

function checkAdminUI() {

  const adminButton = document.getElementById("adminButton");
  if (!adminButton) return;

  adminButton.style.display =
    userRole === "admin" ? "block" : "none";
}

// ======================================
// ADMIN
// ======================================

window.openAdminPanel = async function () {

  if (userRole !== "admin") return;

  document.getElementById("mainContent").style.display = "none";
  document.getElementById("adminScreen").style.display = "block";

  await loadAdminData();
};

window.closeAdminPanel = function () {

  document.getElementById("adminScreen").style.display = "none";
  document.getElementById("mainContent").style.display = "flex";
};

async function loadAdminData() {

  const container = document.getElementById("adminUsersList");
  if (!container) return;

  const { data: users } = await db
    .from("profiles")
    .select("id, full_name");

  let html = "";

  for (const user of users || []) {

    const { data: progress } = await db
      .from("progress")
      .select("lesson_id")
      .eq("user_id", user.id)
      .eq("completed", true);

    html += `
      <div style="margin-bottom:15px; padding:10px; border:1px solid #ccc;">
        <strong>${user.full_name || "Без имени"}</strong><br>
        Завершено уроков: ${progress ? progress.length : 0}
      </div>
    `;
  }

  container.innerHTML = html;
}

// ======================================
// SIDEBAR
// ======================================

function renderSidebar() {

  const sidebar = document.getElementById("sidebarMenu");
  if (!sidebar || typeof courseData === "undefined") return;

  sidebar.innerHTML = "";

  courseData.forEach((module, moduleIndex) => {

    const block = document.createElement("div");
    block.className = "module-block";

    block.innerHTML = `
      <div class="module-header">
        ${module.title}
      </div>
    `;

    block.onclick = () => {
      showModuleLessons(moduleIndex);
    };

    sidebar.appendChild(block);
  });
}

// ======================================
// MODULE GRID
// ======================================

function renderModulesGrid() {

  clearTimeout(lessonTimer);

  const content = document.getElementById("content");

  content.innerHTML =
    `<div id="modulesGrid" class="modules-grid"></div>`;

  const grid = document.getElementById("modulesGrid");

  courseData.forEach((module, moduleIndex) => {

    const card = document.createElement("div");
    card.className = "module-card";

    card.innerHTML = `
      <div class="module-image"
           style="background-image: url('${module.image}')"></div>
      <div class="module-title">${module.title}</div>
    `;

    card.onclick = () => showModuleLessons(moduleIndex);

    grid.appendChild(card);
  });
}

// ======================================
// LESSON LIST
// ======================================

function showModuleLessons(moduleIndex) {

  clearTimeout(lessonTimer);

  currentModuleIndex = moduleIndex;

  const content = document.getElementById("content");

  content.innerHTML = `
    <button class="btn btn-primary" id="backToModules">
      ← К модулям
    </button>
    <div id="modulesGrid"
         style="display:flex;flex-direction:column;"></div>
  `;

  document.getElementById("backToModules").onclick =
    renderModulesGrid;

  const grid = document.getElementById("modulesGrid");
  const module = courseData[moduleIndex];

  module.lessons.forEach((lesson, lessonIndex) => {

    const lessonCard = document.createElement("div");
    lessonCard.className = "lesson-card";
    lessonCard.innerHTML =
      `<div class="lesson-title">${lesson.title}</div>`;

    lessonCard.onclick = () =>
      openLesson(moduleIndex, lessonIndex);

    grid.appendChild(lessonCard);
  });
}

// ======================================
// OPEN LESSON
// ======================================

function openLesson(moduleIndex, lessonIndex) {

  const lesson =
    courseData[moduleIndex].lessons[lessonIndex];

  currentLessonId = lesson.id;
  currentModuleIndex = moduleIndex;

  const content = document.getElementById("content");

  content.innerHTML = `
    <button class="btn btn-primary" id="backToLessons">
      ← К урокам
    </button>
    <iframe src="${lesson.file}"
            style="width:100%;height:80vh;border:none;">
    </iframe>
  `;

  document.getElementById("backToLessons").onclick =
    () => showModuleLessons(moduleIndex);

  startLessonTimer();
}

// ======================================
// PROGRESS TIMER
// ======================================

function startLessonTimer() {

  clearTimeout(lessonTimer);

  lessonTimer = setTimeout(async () => {

    if (!currentLessonId || !currentUser) return;

    await db.from("progress").upsert([{
      user_id: currentUser.id,
      lesson_id: currentLessonId,
      completed: true,
      score: 100
    }]);

    updateCourseProgress();

  }, 180000);
}

// ======================================
// UPDATE PROGRESS
// ======================================

async function updateCourseProgress() {

  if (!currentUser) return;

  const percentText =
    document.getElementById("progressPercent");
  const progressFill =
    document.getElementById("progressFill");

  if (!percentText || !progressFill) return;

  const { data } = await db
    .from("progress")
    .select("lesson_id")
    .eq("user_id", currentUser.id)
    .eq("completed", true);

  let totalLessons = 0;
  courseData.forEach(m =>
    totalLessons += m.lessons.length);

  const completedCount = data ? data.length : 0;

  const percent = totalLessons === 0
    ? 0
    : Math.round((completedCount / totalLessons) * 100);

  percentText.textContent = percent + "%";
  progressFill.style.width = percent + "%";
}

// ======================================
// ЛОГОТИП → НА ГЛАВНУЮ
// ======================================

window.addEventListener("load", () => {

  const logo = document.getElementById("siteLogo");
  if (!logo) return;

  logo.style.cursor = "pointer";

  logo.onclick = () => {

    clearTimeout(lessonTimer);

    currentLessonId = null;
    currentModuleIndex = null;

    renderModulesGrid();
  };
});