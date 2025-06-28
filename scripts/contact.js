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
      
      document.querySelectorAll('.faq-item').forEach(el => {
        el.classList.remove('active');
      });
      
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

    const btn = form.querySelector('.send-message-btn');
    if (btn && btn.parentNode) {
      btn.parentNode.insertBefore(errorMsg, btn.nextSibling);
    } else {
      form.appendChild(errorMsg);
    }
  }

  function canSubmitForm(formKey, limit = 10, windowMs = 60 * 60 * 1000) {
    const now = Date.now();
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem(formKey)) || [];
    } catch { history = []; }
    history = history.filter(ts => now - ts < windowMs);
    if (history.length >= limit) return false;
    history.push(now);
    localStorage.setItem(formKey, JSON.stringify(history));
    return true;
  }

  const BACKEND_URL = "http://localhost:5000"; // or your deployed backend URL

  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const form = e.target;

      // Validate form
      if (!form.elements['name'].value.trim()) {
        showFieldError(form, '#name', 'Please enter your name');
        return;
      }
      
      if (!form.elements['email'].value.trim() || !isValidEmail(form.elements['email'].value)) {
        showFieldError(form, '#email', 'Please enter a valid email');
        return;
      }
      
      if (form.elements['phone'].value && !isValidPhone(form.elements['phone'].value)) {
        showFieldError(form, '#phone', 'Please enter a valid phone number');
        return;
      }
      
      if (!form.elements['subject'].value) {
        showFieldError(form, '#subject', 'Please select a subject');
        return;
      }
      
      if (!form.elements['message'].value.trim()) {
        showFieldError(form, '#message', 'Please enter your message');
        return;
      }

      // Rate limiting
      if (!canSubmitForm('contactForm', 5, 60 * 60 * 1000)) {
        showContactError(form, 'Too many submissions. Please try again later.');
        return;
      }

      // Build inquiry data object (remove type)
      const inquiryData = {
        name: form.elements['name'].value,
        email: form.elements['email'].value,
        phone: form.elements['phone'].value,
        subject: form.elements['subject'].value,
        message: form.elements['message'].value
      };

      // Show loading state
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="loading-dots">Sending</span>';

      // Send to Google Apps Script as JSON
      fetch(`${BACKEND_URL}/api/inquiries`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inquiryData)
      })
      .then(async res => {
        const result = await res.json();
        if (!res.ok || !result.inquiry || !result.inquiry.inquiryId) {
          throw new Error(result.error || "Failed to send inquiry.");
        }
        form.reset();
        const container = form.parentNode;
        if (container) {
          container.innerHTML = `
            <div class="success-hero" style="max-width:600px;margin:8vh auto 0 auto;background:#fff;border-radius:18px;box-shadow:0 8px 40px rgba(27,60,19,0.12),0 1.5px 0 0 #ffe066;padding:3rem 2.5rem 2.5rem 2.5rem;text-align:center;border-top:8px solid var(--gold);overflow:auto;">
              <div class="success-icon" style="font-size:3.5rem;color:var(--success);margin-bottom:1.2rem;">💬</div>
              <h2 style="color:var(--primary);font-size:2.5rem;margin-bottom:1.2rem;font-family:'Playfair Display',serif;background:linear-gradient(90deg,var(--gold),var(--primary));-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:1px 1px 8px rgba(212,175,55,0.12);">Message Sent!</h2>
              <p style="color:var(--dark);font-size:1.18rem;margin-bottom:2.2rem;line-height:1.7;">
                Thank you for reaching out to <span style="color:var(--gold);font-weight:600;">G&amp;G Express</span>.<br>
                Your inquiry has been received.<br>
                <b>Your Inquiry Number:</b> <span style="color:var(--primary);font-weight:700;">${result.inquiry.inquiryId}</span><br>
                Our team will respond within 24 hours via email or WhatsApp.
              </p>
              <a href="index.html" class="back-home" style="display:inline-block;margin-top:1.5rem;color:#fff;background:linear-gradient(90deg,var(--primary),var(--gold));border:none;border-radius:30px;padding:0.9em 2.2em;font-size:1.1rem;font-weight:600;text-decoration:none;box-shadow:0 4px 15px rgba(212,175,55,0.13);transition:all 0.3s;">Back to Home</a>
            </div>
          `;
        }
      })
      .catch(err => {
        showContactError(form, err.message || "Failed to send inquiry.");
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      });
    });
  }
  
  // Helper validation functions
  function isValidEmail(email) {
    // Simple email regex
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function isValidPhone(phone) {
    // Simple phone regex (Kenya + international formats)
    return /^(\+?\d{7,15})$/.test(phone.replace(/\s+/g, ''));
  }

});