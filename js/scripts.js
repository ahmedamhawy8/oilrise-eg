// Smooth scroll for nav links
document.querySelectorAll('header.hero nav a').forEach(link=>{
    link.addEventListener('click',function(e){
        e.preventDefault();
        const target=document.querySelector(this.getAttribute('href'));
        if(target){ target.scrollIntoView({behavior:'smooth'}); }
    });
});

// Fade-in animations
window.addEventListener('scroll',()=>{
    document.querySelectorAll('.content-section,.service-item').forEach(el=>{
        const top=el.getBoundingClientRect().top; const windowHeight=window.innerHeight;
        if(top<windowHeight-100){ el.style.opacity=1; el.style.transform='translateY(0)'; }
    });
});
document.querySelectorAll('.content-section,.service-item').forEach(el=>{
    el.style.opacity=0; el.style.transform='translateY(30px)';
});

const heroImages = [
  "images/hero1.jpeg",
  "images/hero2.jpeg",
  "images/hero3.jpeg"
];

let currentIndex = 0;
const heroSlider = document.getElementById("heroSlider");

setInterval(() => {
  currentIndex = (currentIndex + 1) % heroImages.length;
  heroSlider.src = heroImages[currentIndex];
}, 4000); // change every 4 seconds
