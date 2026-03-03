// ======================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ======================================

let currentLessonId = null;
let currentModuleIndex = null;
let lessonTimer = null;


// ======================================
// INIT
// ======================================

document.addEventListener("DOMContentLoaded", () => {
  renderSidebar();
  renderModulesGrid();
  updateCourseProgress();
});


// ======================================
// SIDEBAR
// ======================================

function renderSidebar() {

  const sidebar = document.getElementById("sidebarMenu");
  if (!sidebar) return;

  sidebar.innerHTML = "";

  courseData.forEach((module, moduleIndex) => {

    const block = document.createElement("div");
    block.className = "module-block";

    const header = document.createElement("div");
    header.className = "module-header";
    header.textContent = module.title;

    header.onclick = () => {
      showModuleLessons(moduleIndex);
    };

    const lessonsContainer = document.createElement("div");
    lessonsContainer.className = "module-lessons";

    module.lessons.forEach((lesson, lessonIndex) => {

      const lessonItem = document.createElement("div");
      lessonItem.className = "lesson";
      lessonItem.textContent = lesson.title;

      lessonItem.onclick = () => {
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
// ГЛАВНАЯ
// ======================================

function renderModulesGrid() {

  clearTimeout(lessonTimer);

  const content = document.getElementById("content");

  content.innerHTML = `
    <div id="modulesGrid" class="modules-grid"></div>
  `;

  const grid = document.getElementById("modulesGrid");

  courseData.forEach((module, moduleIndex) => {

    const card = document.createElement("div");
    card.className = "module-card";

    card.innerHTML = `
      <div class="module-image" style="background-image: url('${module.image}')"></div>
      <div class="module-title">${module.title}</div>
    `;

    card.onclick = () => {
      showModuleLessons(moduleIndex);
    };

    grid.appendChild(card);
  });
}


// ======================================
// СПИСОК УРОКОВ
// ======================================

function showModuleLessons(moduleIndex) {

  clearTimeout(lessonTimer);

  currentModuleIndex = moduleIndex;

  const content = document.getElementById("content");

  content.innerHTML = `
    <button class="btn btn-primary" id="backToModules">← К модулям</button>
    <div id="modulesGrid" style="display:flex;flex-direction:column;"></div>
  `;

  document.getElementById("backToModules").onclick = renderModulesGrid;

  const grid = document.getElementById("modulesGrid");
  const module = courseData[moduleIndex];

  module.lessons.forEach((lesson, lessonIndex) => {

    const lessonCard = document.createElement("div");
    lessonCard.className = "lesson-card";
    lessonCard.innerHTML = `<div class="lesson-title">${lesson.title}</div>`;

    lessonCard.onclick = () => {
      openLesson(moduleIndex, lessonIndex);
    };

    grid.appendChild(lessonCard);
  });
}


// ======================================
// ОТКРЫТИЕ УРОКА
// ======================================

function openLesson(moduleIndex, lessonIndex) {

  const lesson = courseData[moduleIndex].lessons[lessonIndex];

  currentLessonId = lesson.id;
  currentModuleIndex = moduleIndex;

  const content = document.getElementById("content");

  content.innerHTML = `
    <button class="btn btn-primary" id="backToLessons">← К урокам</button>
    <iframe src="${lesson.file}" 
            style="width:100%;height:80vh;border:none;">
    </iframe>
  `;

  document.getElementById("backToLessons").onclick = () => {
    clearTimeout(lessonTimer);
    showModuleLessons(moduleIndex);
  };

  startLessonTimer();
}


// ======================================
// ТАЙМЕР 3 МИН
// ======================================

function startLessonTimer() {

  clearTimeout(lessonTimer);

  lessonTimer = setTimeout(() => {

    if (!currentLessonId) return;

    let completedLessons =
      JSON.parse(localStorage.getItem("completedLessons")) || [];

    if (!completedLessons.includes(currentLessonId)) {

      completedLessons.push(currentLessonId);

      localStorage.setItem(
        "completedLessons",
        JSON.stringify(completedLessons)
      );

      console.log("Урок засчитан:", currentLessonId);

      updateCourseProgress();
    }

  }, 180000); // 3 минуты
}


// ======================================
// ОБЩИЙ ПРОГРЕСС
// ======================================

function updateCourseProgress() {

  const percentText = document.getElementById("progressPercent");
  const progressFill = document.getElementById("progressFill");

  if (!percentText || !progressFill) return;

  const completedLessons =
    JSON.parse(localStorage.getItem("completedLessons")) || [];

  let totalLessons = 0;

  courseData.forEach(module => {
    totalLessons += module.lessons.length;
  });

  const completedCount = completedLessons.length;

  const percent = totalLessons === 0
    ? 0
    : Math.round((completedCount / totalLessons) * 100);

  percentText.textContent = percent + "%";
  progressFill.style.width = percent + "%";
}


// ======================================
// ЛОГОТИП
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