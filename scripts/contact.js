document.addEventListener('DOMContentLoaded', function() {
  // Initialize cart functionality from main.js
  if (window.app && window.app.setupCart) {
    window.app.setupCart();
  }
  
  // FAQ accordion functionality
  const faqQuestions = document.querySelectorAll('.faq-question');
  faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
      const item = question.parentElement;
      const isActive = item.classList.contains('active');
      
      // Close all items first
      document.querySelectorAll('.faq-item').forEach(el => {
        el.classList.remove('active');
      });
      
      // Open current if it wasn't active
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
  
  // Animate contact cards on scroll
  const contactCards = document.querySelectorAll('.contact-card');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        entry.target.style.transitionDelay = `${index * 0.1}s`;
      }
    });
  }, { threshold: 0.1 });
  
  contactCards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'all 0.6s ease-out';
    observer.observe(card);
  });
  
  // Helper function to show notifications
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <span class="notification-icon">${type === 'error' ? '⚠️' : '✓'}</span>
      <span class="notification-text">${message}</span>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  function showFieldError(form, fieldSelector, message) {
    const field = form.querySelector(fieldSelector);
    if (!field) return;
    let errorMsg = field.parentNode.querySelector('.field-error-message');
    if (errorMsg) errorMsg.remove();

    errorMsg = document.createElement('div');
    errorMsg.className = 'field-error-message';
    errorMsg.style.color = '#d32f2f';
    errorMsg.style.background = '#fff8f8';
    errorMsg.style.border = '1px solid #f8d7da';
    errorMsg.style.padding = '0.4em 0.8em';
    errorMsg.style.margin = '0.3em 0 0 0';
    errorMsg.style.borderRadius = '4px';
    errorMsg.style.fontSize = '0.98em';
    errorMsg.style.fontWeight = '400';
    errorMsg.textContent = message;

    field.parentNode.appendChild(errorMsg);
  }

  function showContactError(form, message) {
    // Remove any previous error message
    let errorMsg = form.querySelector('.contact-error-message');
    if (errorMsg) errorMsg.remove();

    errorMsg = document.createElement('div');
    errorMsg.className = 'contact-error-message';
    errorMsg.style.color = '#d32f2f';
    errorMsg.style.background = '#fff8f8';
    errorMsg.style.border = '1px solid #f8d7da';
    errorMsg.style.padding = '0.7em 1em';
    errorMsg.style.margin = '1em 0 0 0';
    errorMsg.style.borderRadius = '6px';
    errorMsg.style.fontSize = '1em';
    errorMsg.style.fontWeight = '500';
    errorMsg.textContent = message;

    // Insert right after the "send message" button
    const btn = form.querySelector('.send-message-btn');
    if (btn && btn.parentNode) {
      btn.parentNode.insertBefore(errorMsg, btn.nextSibling);
    } else {
      form.appendChild(errorMsg);
    }
  }

  // Add at the top or near your utilities
  function canSubmitForm(formKey, limit = 10, windowMs = 60 * 60 * 1000) {
    const now = Date.now();
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem(formKey)) || [];
    } catch { history = []; }
    // Remove timestamps older than windowMs
    history = history.filter(ts => now - ts < windowMs);
    if (history.length >= limit) return false;
    history.push(now);
    localStorage.setItem(formKey, JSON.stringify(history));
    return true;
  }
});