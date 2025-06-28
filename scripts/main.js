// ===== Enhanced Global State =====
const state = {
  cart: [],
  user: null,
  products: {
    "pishori-rice": {
      id: "pishori-rice",
      name: "Pishori Rice",
      description: "Premium quality Pishori rice directly from Mwea farms. Each grain is carefully selected for size and quality.",
      images: [
        "assets/pishori-rice-bag.webp",
        "assets/pishori-rice-closeup.png",
        "assets/pishori-rice-cooked.png"
      ],
      packages: {
        "1": { label: "1kg", price: 220 },
        "2": { label: "2kg", price: 440 },
        "5": { label: "5kg", price: 1100 },
        "10": { label: "10kg", price: 2200 },
        "20": { label: "20kg", price: 4400 },
        "50": { label: "50kg", price: 11000 }
      }
    }
  }
};

const dom = {
  header: null,
  footer: null,
  cartPanel: null,
  cartOverlay: null,
  checkoutModal: null,
  productModal: null
};

// ===== Utility: Input Sanitization =====
function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<script.*?>.*?<\/script>/gi, '')
    .replace(/[<>&"'`]/g, c => ({
      '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;', '`': '&#96;'
    }[c]));
}

// ===== Utility: Basic Input Validation =====
function isValidEmail(email) {
  const allowedDomains = [
    'gmail.com', 'yahoo.com', 'outlook.com', 'icloud.com', 'hotmail.com',
    'protonmail.com', 'yahoo.co.uk', 'ymail.com', 'live.com', 'zoho.com', 'africaonline.co.ke'
  ];
  const match = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/.exec(email);
  if (!match) return false;
  const domain = match[1].toLowerCase();
  return allowedDomains.includes(domain);
}

function isValidPhone(phone) {
  const cleaned = phone.replace(/\s+/g, '');
  if (/^(\+254|0)7\d{8}$/.test(cleaned)) {
    const prefix = cleaned.replace(/^(\+254|0)/, '').substring(0, 3);
    const safaricom = [
      '700','701','702','703','704','705','706','707','708','709',
      '710','711','712','713','714','715','716','717','718','719',
      '720','721','722','723','724','725','726','727','728','729',
      '790','791','792','793','794','795','796','797','798','799',
      '742'
    ];
    const airtel = [
      '730','731','732','733','734','735','736','737','738','739',
      '750','751','752','753','754','755','756','757','758','759'
    ];
    return safaricom.includes(prefix) || airtel.includes(prefix);
  }
  if (/^(\+254|0)1\d{8}$/.test(cleaned)) {
    const prefix = cleaned.replace(/^(\+254|0)/, '').substring(0, 4);
    const allowed = [
      '1000','1001','1002','1003','1004','1005','1006','1007','1008','1009',
      '1100','1101','1102','1103','1104','1105','1106','1107','1108','1109',
      '1110','1111','1112','1113','1114','1115','1116','1117','1118','1119'
    ];
    return allowed.includes(prefix);
  }
  return false;
}

function isNonEmpty(str) {
  return typeof str === 'string' && str.trim().length > 0;
}

// ===== Static Initialization =====
document.addEventListener('DOMContentLoaded', () => {
  dom.header = document.querySelector('header.site-header');
  dom.footer = document.querySelector('footer.site-footer');
  dom.cartPanel = document.getElementById('cart-panel');
  dom.cartOverlay = document.getElementById('cart-overlay');
  dom.checkoutModal = document.getElementById('checkout-modal');
  dom.productModal = document.getElementById('productModal');

  setupHeader();
  setupCart();
  setupCheckout();
  // setupProductModal(); // <-- REMOVE THIS LINE
  setupServiceWorker();
  injectScrollToTopCTA();

  // Initialize cart from localStorage
  state.cart = getCart();
  updateCartUI();
});

// ===== Cart Storage Functions =====
function getCart() {
  try {
    const cart = JSON.parse(localStorage.getItem('cart'));
    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
}

function setCart(cartArr) {
  localStorage.setItem('cart', JSON.stringify(cartArr));
  state.cart = getCart();
}

// ===== Cart UI Rendering =====
function renderCartItems() {
  state.cart = getCart();

  const cartItemsContainer = document.querySelector('.cart-items');
  const totalAmountElement = document.querySelector('.cart-total .total-amount');
  const checkoutBtn = document.querySelector('.checkout-btn');
  if (!cartItemsContainer || !totalAmountElement || !checkoutBtn) return;

  cartItemsContainer.innerHTML = '';

  if (!state.cart.length) {
    cartItemsContainer.innerHTML = `<div class="empty-cart-message">Your cart is empty</div>`;
    totalAmountElement.textContent = 'KSh 0';
    checkoutBtn.disabled = true;
    return;
  }

  let total = 0;
  state.cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <div class="cart-item-info">
        <span>${sanitizeInput(item.name)}</span>
      </div>
      <div class="cart-item-controls">
        <button class="cart-qty-btn decrease-qty" data-id="${item.id}" aria-label="Decrease quantity">−</button>
        <input type="number" min="1" class="cart-qty-input" data-id="${item.id}" value="${item.quantity}">
        <button class="cart-qty-btn increase-qty" data-id="${item.id}" aria-label="Increase quantity">+</button>
      </div>
      <div class="cart-item-total">
        <span>KSh ${(itemTotal).toFixed(2)}</span>
        <button class="remove-cart-item" data-id="${item.id}" title="Remove">&times;</button>
      </div>
    `;
    cartItemsContainer.appendChild(div);
  });

  totalAmountElement.textContent = `KSh ${total.toFixed(2)}`;
  checkoutBtn.disabled = false;

  // Quantity adjustment handlers
  cartItemsContainer.querySelectorAll('.decrease-qty').forEach(btn => {
    btn.addEventListener('click', function() {
      adjustCartQuantity(this.dataset.id, -1);
    });
  });
  cartItemsContainer.querySelectorAll('.increase-qty').forEach(btn => {
    btn.addEventListener('click', function() {
      adjustCartQuantity(this.dataset.id, 1);
    });
  });
  cartItemsContainer.querySelectorAll('.cart-qty-input').forEach(input => {
    input.addEventListener('change', function() {
      let val = parseInt(this.value) || 1;
      if (val < 1) val = 1;
      setCartQuantity(this.dataset.id, val);
    });
  });

  // Remove item handler
  cartItemsContainer.querySelectorAll('.remove-cart-item').forEach(btn => {
    btn.addEventListener('click', function() {
      removeFromCart(this.dataset.id);
    });
  });
}

function updateCartCount() {
  state.cart = getCart();
  const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartCount = document.querySelector('.cart-count');
  if (cartCount) cartCount.textContent = count;
}

function updateCartUI() {
  renderCartItems();
  updateCartCount();
}

// ===== Header Setup =====
function setupHeader() {
  // Profile dropdown
  const profileDropdown = document.querySelector('.profile-dropdown');
  if (profileDropdown) {
    const dropdown = profileDropdown.querySelector('.dropdown-content');
    profileDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.style.display = 'block';
      setTimeout(() => dropdown.classList.toggle('show'), 10);
    });

    document.addEventListener('click', () => {
      dropdown.classList.remove('show');
      setTimeout(() => dropdown.style.display = 'none', 300);
    });
  }

  // Cart icon with bounce effect
  const cartIcon = document.querySelector('.cart-icon');
  if (cartIcon) {
    cartIcon.addEventListener('click', (e) => {
      e.preventDefault();
      cartIcon.style.transform = 'scale(1.2)';
      setTimeout(() => cartIcon.style.transform = '', 300);
      window.app.toggleCart();
    });
  }

  // Mobile nav toggle
  const navToggle = document.querySelector('.nav-toggle');
  const mainNav = document.querySelector('.main-nav');
  let navOverlay = document.querySelector('.mobile-nav-overlay');

  if (!navOverlay) {
    navOverlay = document.createElement('div');
    navOverlay.className = 'mobile-nav-overlay';
    document.body.appendChild(navOverlay);
  }

  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      this.classList.toggle('open');
      mainNav.classList.toggle('open');
      navOverlay.classList.toggle('active');
      document.body.style.overflow = mainNav.classList.contains('open') ? 'hidden' : '';
    });

    navOverlay.addEventListener('click', function() {
      navToggle.classList.remove('open');
      mainNav.classList.remove('open');
      this.classList.remove('active');
      document.body.style.overflow = '';
    });

    mainNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navToggle.classList.remove('open');
        mainNav.classList.remove('open');
        navOverlay.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }
}

// ===== Cart Functionality =====
function setupCart() {
  // Cart toggle handlers
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-cart-toggle]')) {
      e.preventDefault();
      window.app.openCart();
    }
    if (e.target === dom.cartOverlay) {
      window.app.closeCart();
    }
  });

  // Escape key to close cart
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dom.cartPanel?.classList.contains('active')) {
      window.app.closeCart();
    }
  });

  // Proceed to checkout button
  document.body.addEventListener('click', function(e) {
    if (e.target.classList.contains('checkout-btn') &&
        !e.target.classList.contains('continue-shopping-btn') &&
        !e.target.disabled) {
      openCheckout();
    }
  });

  // Continue Shopping button
  document.body.addEventListener('click', function(e) {
    if (e.target.classList.contains('continue-shopping-btn')) {
      window.app.closeCart();
      setTimeout(() => {
        if (typeof openProductModal === 'function') openProductModal();
      }, 400);
    }
  });
}

// Store fetched packages globally for modal use
window.dynamicPackages = [];

// ===== Product Modal Functionality =====
async function setupProductModal() {
  const select = document.getElementById('package');
  if (select) {
    while (select.options.length > 1) select.remove(1);

    const pkgs = await fetchPackagesForModal();
    window.dynamicPackages = pkgs; // Store for later use
    pkgs.forEach(pkg => {
      if (pkg.Stock !== "Out of Stock") {
        const opt = document.createElement('option');
        opt.value = pkg.Package.replace('kg', '').trim();
        opt.textContent = `${pkg.Package} - KES ${pkg.Price}`;
        select.appendChild(opt);
      }
    });
  }
}

function updateModalPrice() {
  const pkgValue = document.getElementById('package').value;
  const quantity = parseInt(document.getElementById('quantity').value) || 1;
  const btn = document.getElementById('addToCartBtn');

  if (!pkgValue) {
    document.getElementById('modalPrice').textContent = '0';
    document.getElementById('modalPackageLabel').textContent = '-';
    document.getElementById('totalPrice').textContent = '0';
    btn.disabled = true;
    return;
  }

  // Find the selected package from dynamicPackages
  const pkgObj = window.dynamicPackages.find(
    p => p.Package.replace('kg', '').trim() === pkgValue
  );
  if (!pkgObj) {
    document.getElementById('modalPrice').textContent = '0';
    document.getElementById('modalPackageLabel').textContent = '-';
    document.getElementById('totalPrice').textContent = '0';
    btn.disabled = true;
    return;
  }

  const price = Number(pkgObj.Price);
  const label = pkgObj.Package;

  document.getElementById('modalPrice').textContent = price;
  document.getElementById('modalPackageLabel').textContent = label;
  document.getElementById('totalPrice').textContent = (price * quantity).toFixed(2);
  btn.disabled = false;
}

function openProductModal() {
  if (!dom.productModal) return;

  // Always fetch and populate packages when opening the modal
  setupProductModal().then(() => {
    dom.productModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    document.getElementById('quantity').value = 1;
    document.getElementById('mainImage').src = state.products["pishori-rice"].images[0];
    updateModalPrice();

    setTimeout(() => {
      dom.productModal.classList.add('show');
    }, 10);

    const thumbnails = document.querySelectorAll('.thumbnail');
    thumbnails.forEach(t => t.classList.remove('active'));
    if (thumbnails.length > 0) thumbnails[0].classList.add('active');
  });
}

function closeModal() {
  if (!dom.productModal) return;

  dom.productModal.classList.remove('show');
  setTimeout(() => {
    dom.productModal.style.display = 'none';
    document.body.style.overflow = '';

    const mainImage = document.getElementById('mainImage');
    if (mainImage?.classList.contains('zoomed')) {
      mainImage.classList.remove('zoomed');
    }
  }, 300);
}

function addToCart() {
  const pkgValue = document.getElementById('package').value;
  const quantity = parseInt(document.getElementById('quantity').value) || 1;
  if (!pkgValue) return;

  // Find the selected package from dynamicPackages
  const pkgObj = window.dynamicPackages.find(
    p => p.Package.replace('kg', '').trim() === pkgValue
  );
  if (!pkgObj) return;

  const price = Number(pkgObj.Price);
  const label = pkgObj.Package;
  const btn = document.getElementById('addToCartBtn');

  btn.disabled = true;
  btn.innerHTML = 'Adding... <span class="loading-dots"></span>';

  const cartItem = {
    id: `pishori-${pkgValue}kg`,
    name: `Pishori Rice (${label})`,
    price: price,
    quantity: quantity
  };

  let cart = getCart();
  let found = cart.find(item => item.id === cartItem.id);
  if (found) {
    found.quantity += cartItem.quantity;
  } else {
    cart.push(cartItem);
  }
  setCart(cart);
  updateCartUI();

  window.app.openCart();

  btn.innerHTML = '✓ Added!';
  setTimeout(() => {
    closeModal();
    document.getElementById('package').value = '';
    document.getElementById('quantity').value = 1;
    updateModalPrice();
    setTimeout(() => {
      btn.innerHTML = 'Add to Cart';
      btn.disabled = false;
    }, 400);
  }, 400);

  showNotification(`${cartItem.quantity} × ${cartItem.name} added to cart`, 'success');
}

// ===== Cart Operations =====
function removeFromCart(productId) {
  let cart = getCart();
  cart = cart.filter(item => item.id !== productId);
  setCart(cart);
  updateCartUI();
  showNotification('Item removed from cart');
}

function clearCart() {
  setCart([]);
  updateCartUI();
}

function adjustCartQuantity(itemId, delta) {
  let cart = getCart();
  let item = cart.find(i => i.id === itemId);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity < 1) item.quantity = 1;
  setCart(cart);
  updateCartUI();
}

function setCartQuantity(itemId, quantity) {
  let cart = getCart();
  let item = cart.find(i => i.id === itemId);
  if (!item) return;
  item.quantity = Math.max(1, quantity);
  setCart(cart);
  updateCartUI();
}

// ===== Checkout Functions =====
function setupCheckout() {
  // Close checkout handlers
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('close-checkout') ||
        (e.target.classList.contains('checkout-modal') && e.target.classList.contains('active'))) {
      closeCheckout();
    }
  });

  // Escape key to close checkout
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dom.checkoutModal?.classList.contains('active')) {
      closeCheckout();
    }
  });

  // Add floating label effect
  document.querySelectorAll('.form-group').forEach(group => {
    const input = group.querySelector('input, select, textarea');
    if (input && !input.value) {
      group.classList.add('floating-label');
    }
  });
}

function renderCheckoutItems() {
  const orderItemsContainer = document.querySelector('.order-items');
  const orderTotalElement = document.querySelector('.order-total .total-amount');

  if (!orderItemsContainer || !orderTotalElement) return;

  orderItemsContainer.innerHTML = state.cart.map(item => `
    <div class="checkout-item">
      <p>${sanitizeInput(item.quantity.toString())} × ${sanitizeInput(item.name)}</p>
      <p>KSh ${(item.price * item.quantity).toFixed(2)}</p>
    </div>
  `).join('');

  const total = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  orderTotalElement.textContent = `KSh ${total.toFixed(2)}`;
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

function showCheckoutError(form, message) {
  let errorMsg = form.querySelector('.checkout-error-message');
  if (errorMsg) errorMsg.remove();

  errorMsg = document.createElement('div');
  errorMsg.className = 'checkout-error-message';
  errorMsg.style.color = '#d32f2f';
  errorMsg.style.background = '#fff8f8';
  errorMsg.style.border = '1px solid #f8d7da';
  errorMsg.style.padding = '0.7em 1em';
  errorMsg.style.margin = '1em 0 0 0';
  errorMsg.style.borderRadius = '6px';
  errorMsg.style.fontSize = '1em';
  errorMsg.style.fontWeight = '500';
  errorMsg.textContent = message;

  const btn = form.querySelector('.place-order-btn');
  if (btn && btn.parentNode) {
    btn.parentNode.insertBefore(errorMsg, btn.nextSibling);
  } else {
    form.appendChild(errorMsg);
  }
}

function openCheckout() {
  if (!dom.cartPanel || !dom.cartOverlay || !dom.checkoutModal) return;

  dom.cartPanel.classList.remove('active');
  dom.cartOverlay.classList.remove('active');

  renderCheckoutItems();

  dom.checkoutModal.classList.add('active');
  document.body.style.overflow = 'hidden';

  setTimeout(() => {
    document.querySelector('.checkout-content').classList.add('animate-in');
  }, 10);

  setTimeout(() => {
    const firstInput = document.querySelector('#checkout-name');
    if (firstInput) firstInput.focus();
  }, 50);
}

function closeCheckout() {
  if (!dom.checkoutModal) return;

  document.querySelector('.checkout-content')?.classList.remove('animate-in');

  dom.checkoutModal.classList.remove('active');
  document.body.style.overflow = '';

  setTimeout(() => {
    const form = document.querySelector('.checkout-form');
    if (form) form.reset();
  }, 300);
}

// ===== Notification System =====
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <span class="notification-icon">${type === 'error' ? '⚠️' : '✓'}</span>
    <span class="notification-text">${sanitizeInput(message)}</span>
  `;
  document.body.appendChild(notification);

  const existingNotifications = document.querySelectorAll('.notification');
  if (existingNotifications.length > 3) {
    existingNotifications[0].remove();
  }

  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ===== Service Worker Registration =====
function setupServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });
    });
  }
}

// ===== Scroll to Top Button =====
function injectScrollToTopCTA() {
  if (document.getElementById('scrollToTopBtn')) return;

  const btn = document.createElement('button');
  btn.id = 'scrollToTopBtn';
  btn.className = 'pulse-on-hover';
  btn.setAttribute('aria-label', 'Scroll to top');
  btn.innerHTML = `
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="13" stroke="url(#grad1)" stroke-width="2"/>
      <defs>
        <linearGradient id="grad1" x1="0" y1="0" x2="28" y2="28">
          <stop offset="0%" stop-color="#ffb347"/>
          <stop offset="100%" stop-color="#ff5e62"/>
        </linearGradient>
      </defs>
      <path d="M14 20V8M14 8L9 13M14 8L19 13" stroke="url(#grad1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

  btn.style.position = 'fixed';
  btn.style.right = '2rem';
  btn.style.bottom = '2rem';
  btn.style.zIndex = '3000';
  btn.style.background = 'linear-gradient(135deg, #ffb347 0%, #ff5e62 100%)';
  btn.style.color = 'white';
  btn.style.border = 'none';
  btn.style.borderRadius = '50%';
  btn.style.width = '64px';
  btn.style.height = '64px';
  btn.style.display = 'none';
  btn.style.cursor = 'pointer';
  btn.style.boxShadow = '0 8px 32px 0 rgba(255,94,98,0.25), 0 2px 8px 0 rgba(0,0,0,0.10)';
  btn.style.transition = 'opacity 0.3s, transform 0.2s, box-shadow 0.2s';
  btn.style.opacity = '0.95';
  btn.style.backdropFilter = 'blur(2px)';
  btn.style.overflow = 'hidden';

  const glow = document.createElement('div');
  glow.style.position = 'absolute';
  glow.style.top = '-12px';
  glow.style.left = '-12px';
  glow.style.width = '88px';
  glow.style.height = '88px';
  glow.style.borderRadius = '50%';
  glow.style.background = 'radial-gradient(circle, rgba(255,179,71,0.25) 0%, rgba(255,94,98,0.15) 80%, transparent 100%)';
  glow.style.zIndex = '-1';
  glow.style.pointerEvents = 'none';
  glow.style.animation = 'scrollTopGlowPulse 2.5s infinite alternate';
  btn.appendChild(glow);

  btn.animate([
    { transform: 'translateY(0)' },
    { transform: 'translateY(-8px)' },
    { transform: 'translateY(0)' }
  ], {
    duration: 1800,
    iterations: Infinity,
    easing: 'ease-in-out'
  });

  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'scale(1.08)';
    btn.style.boxShadow = '0 12px 36px 0 rgba(255,94,98,0.35), 0 2px 8px 0 rgba(0,0,0,0.12)';
    btn.style.opacity = '1';
  });

  btn.addEventListener('mouseleave', () => {
    btn.style.transform = '';
    btn.style.boxShadow = '0 8px 32px 0 rgba(255,94,98,0.25), 0 2px 8px 0 rgba(0,0,0,0.10)';
    btn.style.opacity = '0.95';
  });

  btn.addEventListener('focus', () => btn.dispatchEvent(new Event('mouseenter')));
  btn.addEventListener('blur', () => btn.dispatchEvent(new Event('mouseleave')));

  document.body.appendChild(btn);
  window.addEventListener('scroll', () => {
    if (window.scrollY > 200) {
      btn.style.display = 'block';
      setTimeout(() => { btn.style.opacity = '1'; }, 10);
    } else {
      btn.style.opacity = '0';
      setTimeout(() => { if (btn.style.opacity === '0') btn.style.display = 'none'; }, 300);
    }
  });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  const style = document.createElement('style');
  style.textContent = `
    @keyframes scrollTopGlowPulse {
      0% { opacity: 0.7; transform: scale(1); }
      100% { opacity: 1; transform: scale(1.12); }
    }
    .loading-dots::after {
      content: '.';
      animation: loadingDots 1.5s infinite steps(5, end);
    }
    @keyframes loadingDots {
      0%, 20% { content: '.'; }
      40% { content: '..'; }
      60% { content: '...'; }
      80%, 100% { content: ''; }
    }
    .pulse {
      animation: pulse 0.3s;
    }
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
}

// ===== Exported Functions =====
window.app = {
  addToCart: function(product) {
    const safeProduct = {
      id: sanitizeInput(product.id),
      name: sanitizeInput(product.name),
      price: Number(product.price),
      quantity: Number(product.quantity)
    };
    let cart = getCart();
    let found = cart.find(item => item.id === safeProduct.id);
    if (found) {
      found.quantity += safeProduct.quantity;
    } else {
      cart.push(safeProduct);
    }
    setCart(cart);
    updateCartUI();
    showNotification(`${safeProduct.quantity} × ${safeProduct.name} added to cart`, 'success');
    this.openCart();
  },

  openCart: function() {
    if (!dom.cartOverlay || !dom.cartPanel) return;
    document.body.style.overflow = 'hidden';
    dom.cartOverlay.classList.add('active');
    dom.cartPanel.classList.add('active');
    updateCartUI();

    const cartItems = document.querySelectorAll('.cart-item');
    cartItems.forEach((item, index) => {
      item.style.animationDelay = `${index * 0.05}s`;
      item.classList.add('fade-in');
    });
  },

  closeCart: function() {
    if (!dom.cartPanel || !dom.cartOverlay) return;
    document.body.style.overflow = '';
    dom.cartOverlay.classList.remove('active');
    dom.cartPanel.classList.remove('active');
  },

  toggleCart: function() {
    if (!dom.cartPanel || !dom.cartOverlay) return;
    if (dom.cartPanel.classList.contains('active')) {
      this.closeCart();
    } else {
      this.openCart();
    }
  }
};

// Preloader logic
setTimeout(() => {
  const preloader = document.getElementById('preloader');
  if (preloader) {
    preloader.classList.add('fade-out');
    document.body.style.overflow = '';
    setTimeout(() => preloader.remove(), 500);
  }
}, 1000);

// ===== Utility: Smooth scroll to products =====
window.scrollToProducts = function() {
  const section = document.getElementById('products');
  if (section) section.scrollIntoView({ behavior: 'smooth' });
};

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

const BACKEND_URL = "http://localhost:5000"; // Change to your deployed backend URL if needed

// Fallback packages data
const fallbackPackages = [
  { Package: "1kg", Price: "220", Stock: "In Stock" },
  { Package: "2kg", Price: "440", Stock: "In Stock" },
  { Package: "5kg", Price: "1100", Stock: "In Stock" },
  { Package: "10kg", Price: "2200", Stock: "In Stock" },
  { Package: "20kg", Price: "4400", Stock: "In Stock" },
  { Package: "50kg", Price: "11000", Stock: "In Stock" }
];

// Fetch packages from Google Sheets, fallback to hardcoded if needed
async function fetchPackagesForModal() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/packages`);
    const data = await res.json();
    if (Array.isArray(data.packages)) {
      // Only show in-stock
      return data.packages.filter(pkg => pkg.stock === "In Stock")
        .map(pkg => ({
          Package: `${pkg.size}kg`,
          Price: pkg.price,
          Stock: pkg.stock
        }));
    }
    return [];
  } catch (e) {
    return [];
  }
}

// Checkout form submission handler
document.addEventListener('DOMContentLoaded', function() {
  const checkoutForm = document.getElementById('checkoutForm');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      // Validate form
      if (!checkoutForm.elements['name'].value.trim()) {
        showFieldError(checkoutForm, '#checkout-name', 'Please enter your name');
        return;
      }
      
      if (!checkoutForm.elements['phone'].value.trim() || !isValidPhone(checkoutForm.elements['phone'].value)) {
        showFieldError(checkoutForm, '#checkout-phone', 'Please enter a valid phone number');
        return;
      }
      
      if (!checkoutForm.elements['email'].value.trim() || !isValidEmail(checkoutForm.elements['email'].value)) {
        showFieldError(checkoutForm, '#checkout-email', 'Please enter a valid email');
        return;
      }

      // Calculate total kgs in cart
      let cart = [];
      try {
        cart = JSON.parse(localStorage.getItem('cart')) || [];
      } catch { cart = []; }
      let totalKgs = 0;
      cart.forEach(item => {
        let match = /(\d+)\s?kg/i.exec(item.name);
        let kgs = match ? parseInt(match[1], 10) : 0;
        totalKgs += kgs * item.quantity;
      });

      // Minimum 5kg check
      if (totalKgs < 5) {
        showCheckoutError(e.target, `Minimum order is 5kg. Your current total is ${totalKgs}kg.`);
        return;
      }

      // Rate limit: 7/hr/user
      if (!canSubmitForm('checkoutForm', 7, 60 * 60 * 1000)) {
        showCheckoutError(e.target, "Order rate limit reached. Please try again after 1 hour.");
        return;
      }

      // Build order summary from the cart
      let summary = '';
      let total = 0;
      cart.forEach(item => {
        summary += `${item.quantity} × ${item.name} (KSh ${(item.price * item.quantity).toFixed(2)})\n`;
        total += item.price * item.quantity;
      });

      // Gather form data
      const form = e.target;
      const name = form.elements['name'].value;
      const phone = form.elements['phone'].value;
      const email = form.elements['email'].value;
      const location = form.elements['location']?.value || '';
      const note = form.elements['note']?.value || '';

      // Build orderData object
      const orderData = {
        type: "addOrder",
        name,
        phone,
        email,
        location,
        note,
        orderSummary: summary.trim(),
        orderTotal: total // <-- send as a number, not a string!
      };

      // Show loading state
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="loading-dots">Processing</span>';

      // Send to Google Apps Script as JSON and await response
      try {
        const res = await fetch(`${BACKEND_URL}/api/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderData)
        });
        const result = await res.json();

        // Only show success if orderId is present
        if (result && result.order && result.order.orderId) {
          // Clear cart and form
          localStorage.removeItem('cart');
          if (typeof updateCartUI === 'function') updateCartUI();
          checkoutForm.reset();

          // Show success message with Order ID
          const modalContent = checkoutForm.closest('.checkout-content');
          if (modalContent) {
            modalContent.innerHTML = `
              <div class="success-hero" style="max-width:600px;margin:8vh auto 0 auto;background:#fff;border-radius:18px;box-shadow:0 8px 40px rgba(27,60,19,0.12),0 1.5px 0 0 #ffe066;padding:3rem 2.5rem 2.5rem 2.5rem;text-align:center;border-top:8px solid var(--gold);overflow:auto;">
                <div class="success-icon" style="font-size:3.5rem;color:var(--success);margin-bottom:1.2rem;">✔️</div>
                <h2 style="color:var(--primary);font-size:2.5rem;margin-bottom:1.2rem;font-family:'Playfair Display',serif;background:linear-gradient(90deg,var(--gold),var(--primary));-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:1px 1px 8px rgba(212,175,55,0.12);">Order Confirmed!</h2>
                <p style="color:var(--dark);font-size:1.18rem;margin-bottom:2.2rem;line-height:1.7;">
                  Thank you for choosing <span style="color:var(--gold);font-weight:600;">G&amp;G Express</span>!<br>
                  Your order has been received and is being processed.<br><br>
                  <b>Your Order Number:</b> <span style="color:var(--primary);font-weight:700;">${result.order.orderId}</span><br>
                  You will receive an email confirmation shortly.
                </p>
                <a href="index.html" class="back-home" style="display:inline-block;margin-top:1.5rem;color:#fff;background:linear-gradient(90deg,var(--primary),var(--gold));border:none;border-radius:30px;padding:0.9em 2.2em;font-size:1.1rem;font-weight:600;text-decoration:none;box-shadow:0 4px 15px rgba(212,175,55,0.13);transition:all 0.3s;">Back to Home</a>
              </div>
            `;
          }
        } else {
          showCheckoutError(checkoutForm, "Order failed. Please try again.");
        }
      } catch (err) {
        showCheckoutError(checkoutForm, "Order failed. Please check your connection and try again.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    });
  }

  // Ensure product modal Add to Cart button works
  const addToCartBtn = document.getElementById('addToCartBtn');
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', addToCart);
  }

  // Fix modal open from product page (if you have a button/link)
  document.querySelectorAll('[data-open-product-modal]').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      openProductModal();
    });
  });

 });

