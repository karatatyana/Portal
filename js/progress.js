function updateCourseProgress() {

  let completedLessons =
    JSON.parse(localStorage.getItem("completedLessons")) || {};

  const allLessons = courseData.flatMap(m => m.lessons);

  const completedCount = allLessons.filter(
    lesson => completedLessons[lesson.id]
  ).length;

  const percent = allLessons.length === 0
    ? 0
    : Math.round((completedCount / allLessons.length) * 100);

  document.getElementById("progressFill").style.width = percent + "%";
  document.getElementById("progressPercent").textContent = percent + "%";
}