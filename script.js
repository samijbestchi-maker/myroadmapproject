function scrollToSection(id) {
  document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
}

const slider = document.getElementById("pollution");
const water = document.getElementById("water");

slider.addEventListener("input", () => {
  const value = slider.value;
  // 색조 변화: 오염 높을수록 탁하게
  const clarity = 100 - value;
  const color = `linear-gradient(to top, hsl(${190 - value/3}, 80%, 40%), hsl(${190 - value/3}, 80%, 70%))`;
  water.style.background = color;
  water.style.filter = `blur(${value/30}px) brightness(${clarity/100})`;
});
