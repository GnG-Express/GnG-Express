// ===== Scroll to Products =====
function scrollToProducts() {
  const productsSection = document.getElementById('products');
  productsSection.scrollIntoView({
    behavior: 'smooth'
  });
}

// ===== Product Card Interactions =====
document.querySelectorAll('.product-card').forEach(card => {
  card.addEventListener('click', function(e) {
    if (!e.target.classList.contains('btn-secondary')) {
      openProductModal();
    }
  });
  let hoverTimer;
  card.addEventListener('mouseenter', () => {
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      card.classList.add('hover-active');
    }, 100);
  });
  card.addEventListener('mouseleave', () => {
    clearTimeout(hoverTimer);
    card.classList.remove('hover-active');
  });
});

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', function() {
  const thumbnails = document.querySelectorAll('.thumbnail');
  if (thumbnails.length > 0) {
    thumbnails[0].classList.add('active');
  }
  document.querySelectorAll('.btn-secondary').forEach(btn => {
    btn.addEventListener('click', openProductModal);
  });

  // Ensure thumbnails work
  document.querySelectorAll('.thumbnail').forEach(thumb => {
    thumb.addEventListener('click', function() {
      document.getElementById('mainImage').src = this.src;
      document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // Connect "Add to Cart" button
  document.querySelector('.modal-details .btn-primary').addEventListener('click', addToCart);
});

// ===== Helper Functions =====
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