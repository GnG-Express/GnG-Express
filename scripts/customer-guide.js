document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Show preloader
    document.body.style.overflow = 'hidden';
    // No header setup here; handled globally
    setupCustomerGuide();

    // Hide preloader when everything is loaded
    setTimeout(() => {
      const preloader = document.getElementById('preloader');
      if (preloader) {
        preloader.classList.add('fade-out');
        document.body.style.overflow = '';
        setTimeout(() => preloader.remove(), 500);
      }
    }, 1000);
  } catch (error) {
    console.error('Initialization error:', error);
    document.body.style.overflow = '';
    const preloader = document.getElementById('preloader');
    if (preloader) preloader.remove();
  }
});

function setupCustomerGuide() {
  // Robust FAQ accordion
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

    // Ensure unique id for aria-controls
    if (!answer.id) {
      answer.id = `faq-${Math.random().toString(36).substr(2, 9)}`;
      question.setAttribute('aria-controls', answer.id);
    }

    // Initialize state
    question.setAttribute('aria-expanded', 'false');
    answer.setAttribute('aria-expanded', 'false');

    // Micro-interactions
    question.addEventListener('mouseenter', () => {
      question.style.transform = 'translateX(4px)';
      question.style.transition = 'transform 0.2s cubic-bezier(0.4,0,0.2,1)';
      question.style.boxShadow = '0 2px 12px rgba(212,175,55,0.08)';
    });
    question.addEventListener('mouseleave', () => {
      question.style.transform = '';
      question.style.boxShadow = '';
    });
    question.addEventListener('focus', () => {
      question.style.outline = '2px solid var(--gold)';
      question.style.zIndex = '2';
    });
    question.addEventListener('blur', () => {
      question.style.outline = '';
      question.style.zIndex = '';
    });

    // Accordion click handler
    question.addEventListener('click', () => {
      const isExpanded = question.getAttribute('aria-expanded') === 'true';

      // Collapse all others
      faqItems.forEach(otherItem => {
        const otherQ = otherItem.querySelector('.faq-question');
        const otherA = otherItem.querySelector('.faq-answer');
        if (otherQ !== question) {
          otherQ.setAttribute('aria-expanded', 'false');
          otherA.setAttribute('aria-expanded', 'false');
        }
      });

      // Toggle current
      question.setAttribute('aria-expanded', !isExpanded);
      answer.setAttribute('aria-expanded', !isExpanded);
    });

    // Keyboard support
    question.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        question.click();
      }
      // Arrow navigation for accessibility
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = Array.from(document.querySelectorAll('.faq-question'));
        const idx = items.indexOf(question);
        let nextIdx = e.key === 'ArrowDown' ? idx + 1 : idx - 1;
        if (nextIdx < 0) nextIdx = items.length - 1;
        if (nextIdx >= items.length) nextIdx = 0;
        items[nextIdx].focus();
      }
    });
  });

  // Enhanced smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const hash = this.getAttribute('href');
      if (!hash || hash === '#') return;

      const targetElement = document.querySelector(hash);
      if (targetElement) {
        e.preventDefault();

        // Calculate offset based on header height and any custom offset
        const headerHeight = document.querySelector('.site-header')?.offsetHeight || 0;
        const customOffset = parseInt(this.getAttribute('data-offset')) || 0;
        const totalOffset = headerHeight + customOffset;

        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - totalOffset;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });

        // Update URL hash without jumping
        history.replaceState(null, '', hash);

        // Focus the target for accessibility
        setTimeout(() => {
          targetElement.setAttribute('tabindex', '-1');
          targetElement.focus();
        }, 1000);
      }
    });
  });

  // Animate sections when they come into view with Intersection Observer
  const animateOnScroll = (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  };

  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };

  const observer = new IntersectionObserver(animateOnScroll, observerOptions);

  // Observe all sections that should animate in
  document.querySelectorAll('.ordering-step, .option-card, .care-card, .faq-category').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });

  // Add hover effect to ordering steps
  const orderingSteps = document.querySelectorAll('.ordering-step');
  orderingSteps.forEach(step => {
    step.addEventListener('mouseenter', () => {
      const stepNum = step.getAttribute('data-step');
      if (stepNum) {
        step.style.setProperty('--step-hover-color', `hsl(${stepNum * 60}, 80%, 60%)`);
      }
    });
  });

  // Add ripple effect to buttons
  document.querySelectorAll('.btn-primary, .btn-secondary').forEach(button => {
    button.addEventListener('click', function(e) {
      // Remove any existing ripple
      const existingRipple = this.querySelector('.ripple');
      if (existingRipple) {
        existingRipple.remove();
      }

      // Create new ripple
      const ripple = document.createElement('span');
      ripple.classList.add('ripple');

      // Position the ripple
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;

      this.appendChild(ripple);

      // Remove ripple after animation
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });

  // Add scroll progress indicator
  window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset;
    const docHeight = document.body.offsetHeight;
    const winHeight = window.innerHeight;
    const scrollPercent = scrollTop / (docHeight - winHeight);
    const scrollPercentRounded = Math.round(scrollPercent * 100);

    // You could use this value to update a progress indicator if desired
    // For example:
    // document.querySelector('.scroll-progress').style.width = `${scrollPercentRounded}%`;
  });

  // Initialize tooltips
  document.querySelectorAll('[data-tooltip]').forEach(el => {
    el.addEventListener('mouseenter', showTooltip);
    el.addEventListener('mouseleave', hideTooltip);
  });
}

// Tooltip functions
function showTooltip(e) {
  const tooltipText = this.getAttribute('data-tooltip');
  if (!tooltipText) return;

  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.textContent = tooltipText;

  document.body.appendChild(tooltip);

  const rect = this.getBoundingClientRect();
  tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
  tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;

  this._tooltip = tooltip;
}

function hideTooltip() {
  if (this._tooltip) {
    this._tooltip.remove();
    this._tooltip = null;
  }
}

// Make function available globally if needed
window.setupCustomerGuide = setupCustomerGuide;