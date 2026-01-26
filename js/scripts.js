document.addEventListener("DOMContentLoaded", function () {
  console.log("Hero slider JS loaded ✅");

  const heroImages = [
    "images/hero1.jpeg",
    "images/hero2.jpeg",
    "images/hero3.jpeg"
  ];

  let currentIndex = 0;
  const heroSlider = document.getElementById("heroSlider");

  if (!heroSlider) {
    console.error("❌ heroSlider element not found");
    return;
  }

  setInterval(() => {
    currentIndex = (currentIndex + 1) % heroImages.length;
    heroSlider.src = heroImages[currentIndex];
    console.log("Switched to:", heroImages[currentIndex]);
  }, 4000);
});
