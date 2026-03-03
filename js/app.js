// ======================================
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
// renderModulesGrid();  // УБРАТЬ

  const { data } = await db.auth.getSession();

  if (data?.session) {
    currentUser = data.session.user;
    await loadUserProfile();
    showMainContent();
  }

  db.auth.onAuthStateChange((event, session) => {

  if (session) {

    currentUser = session.user;
    loadUserProfile();
    showMainContent();

  } else {

    handleLogoutUI();

  }

});
});


// ======================================
// PROFILE
// ======================================

async function loadUserProfile() {

  if (!currentUser) return;

  const { data } = await db
    .from("profiles")
    .select("role, full_name")
    .eq("id", currentUser.id)
    .single();

  userRole = data?.role || "student";

  showUserName(data);
  checkAdminUI();
  updateCourseProgress();
}


// ======================================
// AUTH
// ======================================

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


// ✅ ДОБАВЛЕНА КОРРЕКТНАЯ ФУНКЦИЯ ВЫХОДА
window.signOut = async function () {

  clearTimeout(lessonTimer);

  await db.auth.signOut();

  // сброс состояний
  currentUser = null;
  currentLessonId = null;
  currentModuleIndex = null;
};


// ======================================
// LOGOUT UI RESET
// ======================================

function handleLogoutUI() {

  currentUser = null;
  userRole = "student";

  document.getElementById("mainContent").style.display = "none";
  document.getElementById("adminScreen").style.display = "none";
  document.getElementById("authBlock").style.display = "flex";
  document.getElementById("userPanel").style.display = "none";

  document.body.classList.remove("lesson-page");
  hideGlobalProgress();
  checkAdminUI();
}


// ======================================
// UI
// ======================================

function showMainContent() {

  document.getElementById("authBlock").style.display = "none";
  document.getElementById("mainContent").style.display = "flex";
  document.getElementById("userPanel").style.display = "flex";

  document.body.classList.remove("lesson-page");
  showGlobalProgress();
  renderModulesGrid();
}

function showUserName(profile) {

  const nameBlock = document.getElementById("userName");
  const roleBlock = document.getElementById("userRole");

  const name =
    profile?.full_name ||
    currentUser?.user_metadata?.full_name ||
    "Пользователь";

  if (nameBlock) nameBlock.textContent = "Привет, " + name;
  if (roleBlock)
    roleBlock.textContent =
      userRole === "admin" ? "Админка" : "Личный кабинет";
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

  document.body.classList.remove("lesson-page");
  hideGlobalProgress();

  await loadAdminData();
};

window.closeAdminPanel = function () {

  document.getElementById("adminScreen").style.display = "none";
  document.getElementById("mainContent").style.display = "flex";

  document.body.classList.remove("lesson-page");
  showGlobalProgress();
};


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

    const header = document.createElement("div");
    header.className = "module-header";
    header.textContent = module.title;

    const lessonsContainer = document.createElement("div");
    lessonsContainer.className = "module-lessons";

    module.lessons.forEach((lesson, lessonIndex) => {

      const lessonItem = document.createElement("div");
      lessonItem.className = "lesson";
      lessonItem.textContent = lesson.title;

      lessonItem.onclick = (e) => {
        e.stopPropagation();
        openLesson(moduleIndex, lessonIndex);
      };

      lessonsContainer.appendChild(lessonItem);
    });

    block.appendChild(header);
    block.appendChild(lessonsContainer);
    sidebar.appendChild(block);
  });
}


// ======================================
// MODULE GRID
// ======================================

function renderModulesGrid() {


  clearTimeout(lessonTimer);

  document.body.classList.remove("lesson-page");
  showGlobalProgress();

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

async function showModuleLessons(moduleIndex) {

  clearTimeout(lessonTimer);

  document.body.classList.remove("lesson-page");
  hideGlobalProgress();

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

  // 🔹 получаем завершённые уроки пользователя
  let completedLessons = [];

  if (currentUser) {
    const { data } = await db
      .from("progress")
      .select("lesson_id")
      .eq("user_id", currentUser.id)
      .eq("completed", true);

    completedLessons = data ? data.map(p => p.lesson_id) : [];
  }

  module.lessons.forEach((lesson, lessonIndex) => {

    const lessonCard = document.createElement("div");
    lessonCard.className = "lesson-card";

    lessonCard.innerHTML =
      `<div class="lesson-title">${lesson.title}</div>`;

    // 🔴 если урок завершён — добавляем кружок
    if (completedLessons.includes(lesson.id)) {
  const badge = document.createElement("div");
  badge.className = "lesson-status completed";
  badge.innerText = "Пройден";
  lessonCard.appendChild(badge);
} else {
  const badge = document.createElement("div");
  badge.className = "lesson-status not-completed";
  badge.innerText = "Не пройден";
  lessonCard.appendChild(badge);
}

    lessonCard.onclick =
      () => openLesson(moduleIndex, lessonIndex);

    grid.appendChild(lessonCard);
  });
}



// ======================================
// OPEN LESSON
// ======================================

function openLesson(moduleIndex, lessonIndex) {

  document.body.classList.add("lesson-page");
  hideGlobalProgress();

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
// PROGRESS VISIBILITY
// ======================================

function hideGlobalProgress() {
  const progress = document.getElementById("globalProgress");
  if (progress) progress.style.display = "none";
}

function showGlobalProgress() {
  const progress = document.getElementById("globalProgress");
  if (progress) progress.style.display = "block";
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

  const percent =
    totalLessons === 0
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

    document.body.classList.remove("lesson-page");
    showGlobalProgress();
    renderModulesGrid();
  };
});



// ======================================
// ИНДИКАТОР ЗАГРУЗКИ ================

window.signIn = async function () {

  const btn = document.querySelector(".auth-btn.primary");
  btn.textContent = "Входим...";
  btn.disabled = true;

  const { data, error } = await db.auth.signInWithPassword({
    email: document.getElementById("email").value,
    password: document.getElementById("password").value
  });

  if (error) {
    document.getElementById("authMessage").innerText = error.message;
    btn.textContent = "Войти";
    btn.disabled = false;
    return;
  }

  currentUser = data.user;
  await loadUserProfile();
  showMainContent();

  btn.textContent = "Войти";
  btn.disabled = false;
};




// ======================================
// ADMIN DATA
// ======================================

async function loadAdminData() {

  const container = document.getElementById("adminUsersList");
  if (!container) return;

  container.innerHTML = "Загрузка...";

  // 1️⃣ Получаем всех пользователей
  const { data: users, error: usersError } = await db
    .from("profiles")
    .select("id, full_name, role");

  if (usersError) {
    container.innerHTML = "Ошибка загрузки пользователей";
    console.error(usersError);
    return;
  }

  // 2️⃣ Получаем прогресс
  const { data: progress, error: progressError } = await db
    .from("progress")
    .select("user_id, lesson_id")
    .eq("completed", true);

  if (progressError) {
    container.innerHTML = "Ошибка загрузки прогресса";
    console.error(progressError);
    return;
  }

  // 3️⃣ Считаем общее количество уроков
  let totalLessons = 0;
  courseData.forEach(m =>
    totalLessons += m.lessons.length
  );

  container.innerHTML = "";

  users.forEach(user => {

    const userProgress =
      progress?.filter(p => p.user_id === user.id) || [];

    const completedCount = userProgress.length;

    const percent =
      totalLessons === 0
        ? 0
        : Math.round((completedCount / totalLessons) * 100);

    const block = document.createElement("div");
    block.className = "admin-user-card";

    block.innerHTML = `
      <div><strong>${user.full_name || "Без имени"}</strong></div>
      <div>Роль: ${user.role}</div>
      <div>
        Пройдено: ${completedCount} из ${totalLessons} уроков
      </div>
      <div class="admin-progress-bar">
        <div class="admin-progress-fill"
             style="width:${percent}%"></div>
      </div>
      <div style="margin-top:6px; font-size:13px; opacity:0.7;">
        ${percent}%
      </div>
    `;

    container.appendChild(block);
  });

  if (users.length === 0) {
    container.innerHTML = "Пользователей пока нет.";
  }
}