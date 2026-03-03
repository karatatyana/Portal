function updateCourseProgress() {

  let completedLessons =
    JSON.parse(localStorage.getItem("completedLessons")) || [];

  const allLessons = courseData.flatMap(m => m.lessons);

  let completedCount = 0;

  allLessons.forEach(lesson => {

    // Если хранится как массив
    if (Array.isArray(completedLessons)) {
      if (completedLessons.includes(lesson.id)) {
        completedCount++;
      }
    }

    // Если хранится как объект (на будущее)
    else if (completedLessons[lesson.id]) {
      completedCount++;
    }

  });

  const percent = allLessons.length === 0
    ? 0
    : Math.round((completedCount / allLessons.length) * 100);

  const fill = document.getElementById("progressFill");
  const text = document.getElementById("progressPercent");

  if (fill) fill.style.width = percent + "%";
  if (text) text.textContent = percent + "%";
}