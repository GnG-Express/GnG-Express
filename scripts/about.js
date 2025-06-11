document.addEventListener('DOMContentLoaded', function() {
  // Initialize cart functionality from main.js
  if (window.app && window.app.setupCart) {
    window.app.setupCart();
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth'
        });
      }
    });
  });

  // Animate process steps on scroll
  const processSteps = document.querySelectorAll('.process-step');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  processSteps.forEach(step => {
    step.style.opacity = '0';
    step.style.transform = 'translateY(20px)';
    step.style.transition = 'all 0.6s ease-out';
    observer.observe(step);
  });

  // Farmer card animations
  const farmerCards = document.querySelectorAll('.farmer-card');
  farmerCards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = `all 0.5s ease-out ${index * 0.1}s`;
    
    const cardObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, { threshold: 0.1 });
    
    cardObserver.observe(card);
  });
});