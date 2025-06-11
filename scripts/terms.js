document.addEventListener('DOMContentLoaded', () => {
  // Remove or comment out loadCommonComponents if not used
  // await loadCommonComponents();
  if (typeof setupHeader === "function") setupHeader();
  setupTermsPage();
});

function setupTermsPage() {
  // Tab functionality
  const tabs = document.querySelector('.terms-tabs');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const tabIndicator = document.querySelector('.tab-indicator');

  // Set initial active tab from URL hash or default to first tab
  let activeTab = window.location.hash.substring(1) || 'terms';
  setActiveTab(activeTab);

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      setActiveTab(tabId);
      // Update URL hash without scrolling
      history.replaceState(null, null, `#${tabId}`);
    });
  });

  function setActiveTab(tabId) {
    // If tabId is invalid, fallback to first tab
    if (![...tabBtns].some(btn => btn.dataset.tab === tabId)) {
      tabId = tabBtns[0].dataset.tab;
    }
    // Update tab buttons
    tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Update tab contents
    tabContents.forEach(content => {
      content.classList.toggle('active', content.id === tabId);
    });

    // Update tab indicator position
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (activeBtn && tabIndicator) {
      const btnWidth = activeBtn.offsetWidth;
      const btnLeft = activeBtn.offsetLeft;
      tabIndicator.style.width = `${btnWidth}px`;
      tabIndicator.style.transform = `translateX(${btnLeft}px)`;
    }
  }

  // Animate cards when they come into view
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate');
      }
    });
  }, observerOptions);

  document.querySelectorAll('.section-card').forEach(card => {
    observer.observe(card);
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth'
        });
      }
    });
  });
}

// Make functions available globally if needed
window.setupTermsPage = setupTermsPage;