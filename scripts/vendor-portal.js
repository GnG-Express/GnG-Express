const BACKEND_URL = "https://gng-express-backend.onrender.com/api";
const VENDOR_RATE_PER_KG = 160;
const VENDOR_MINIMUM_FEE = 100;

let currentUser = null;
let orders = [];
let revenueChart = null;
let currentOrderId = null;
let currentOrderPage = 1;
const itemsPerPage = 10;

const loginScreen = document.getElementById('loginScreen');
const vendorDashboard = document.getElementById('vendorDashboard');
const loginForm = document.getElementById('loginForm');
const settingsForm = document.getElementById('settingsForm');
const registerForm = document.getElementById('registerForm');
const navItems = document.querySelectorAll('.vendor-nav-item');
const sections = {
  dashboard: document.getElementById('dashboardSection'),
  orders: document.getElementById('ordersSection'),
  settings: document.getElementById('settingsSection')
};
const VENDOR_ORDER_STATUSES = ["Processing", "In Transit", "Arrived"];

document.addEventListener('DOMContentLoaded', function() {
  const savedUser = localStorage.getItem('vendorUser');
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      showDashboard();
      fetchData();
    } catch (e) {
      localStorage.removeItem('vendorUser');
    }
  }

  // Login form
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
      const res = await fetch(`${BACKEND_URL}/vendors/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Login failed.");
      // Store token and user info in a consistent structure
      currentUser = {
        token: result.token,
        email: result.email,
        name: result.name
      };
      localStorage.setItem('vendorUser', JSON.stringify(currentUser));
      showDashboard();
      fetchData();
    } catch (err) {
      showNotification(err.message || 'Invalid email or password', 'error');
    }
  });

  // Registration link
  document.getElementById('registerLink').addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('registerModal').classList.add('active');
    document.getElementById('registerForm').reset();
  });

  // Register form
  document.getElementById('registerBtn').addEventListener('click', async function() {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    
    if (password !== confirmPassword) {
      showNotification('Passwords do not match', 'error');
      return;
    }
    
    try {
      const res = await fetch(`${BACKEND_URL}/vendors/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Registration failed.");
      showNotification('Registration successful! Please login.', 'success');
      closeRegisterModal();
    } catch (err) {
      showNotification(err.message || 'Registration failed', 'error');
    }
  });

  // Navigation
  navItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const section = this.dataset.section;
      if (section === 'logout') {
        logout();
        return;
      }
      showSection(section);
      if (['dashboard', 'orders'].includes(section)) {
        fetchData();
      }
    });
  });

  // Settings form
  settingsForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = currentUser.email;
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    if (newPassword !== confirmPassword) {
      showNotification('New passwords do not match', 'error');
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/vendors/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, currentPassword, newPassword })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to change password.");
      showNotification('Password changed successfully!', 'success');
      settingsForm.reset();
    } catch (err) {
      showNotification(err.message || 'Failed to change password.', 'error');
    }
  });

  // Chart range selector
  document.getElementById('chartRange').addEventListener('change', function() {
    updateRevenueChart(parseInt(this.value));
  });

  // Modal close buttons
  document.getElementById('closeOrderModal').addEventListener('click', closeOrderModal);
  document.getElementById('closeOrderModalBtn').addEventListener('click', closeOrderModal);
  document.getElementById('closeRegisterModal').addEventListener('click', closeRegisterModal);
  document.getElementById('cancelRegisterBtn').addEventListener('click', closeRegisterModal);

  // Search buttons
  document.getElementById('searchOrdersBtn').addEventListener('click', searchOrders);

  // Logout button
  document.getElementById('logoutBtn').addEventListener('click', logout);

  // Filter buttons
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', function() {
      const filter = this.dataset.filter;
      fetchOrders(filter);
    });
  });

  // Delete account button
  document.getElementById('deleteAccountBtn').addEventListener('click', async function() {
    if (!confirm('Are you sure you want to request account deletion? This action is irreversible.')) return;
    try {
      const res = await fetch(`${BACKEND_URL}/vendors/${currentUser.email}/request-deletion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to request deletion.");
      showNotification('Account deletion request sent to admin.', 'success');
    } catch (err) {
      showNotification(err.message || 'Failed to request deletion.', 'error');
    }
  });

  // Toggle password visibility for login
  document.getElementById('toggleLoginPassword').onclick = function() {
    const input = document.getElementById('password');
    input.type = input.type === 'password' ? 'text' : 'password';
    this.innerHTML = `<i class="fas fa-eye${input.type === 'password' ? '' : '-slash'}"></i>`;
  };

  // Toggle password visibility for registration
  const toggleRegisterPassword = document.getElementById('toggleRegisterPassword');
  if (toggleRegisterPassword) {
    toggleRegisterPassword.onclick = function() {
      const input = document.getElementById('regPassword');
      input.type = input.type === 'password' ? 'text' : 'password';
      this.innerHTML = `<i class="fas fa-eye${input.type === 'password' ? '' : '-slash'}"></i>`;
    };
  }

  // Toggle password visibility for settings
  const toggleCurrentPassword = document.getElementById('toggleCurrentPassword');
  if (toggleCurrentPassword) {
    toggleCurrentPassword.onclick = function() {
      const input = document.getElementById('currentPassword');
      input.type = input.type === 'password' ? 'text' : 'password';
      this.innerHTML = `<i class="fas fa-eye${input.type === 'password' ? '' : '-slash'}"></i>`;
    };
  }
  const toggleNewPassword = document.getElementById('toggleNewPassword');
  if (toggleNewPassword) {
    toggleNewPassword.onclick = function() {
      const input = document.getElementById('newPassword');
      input.type = input.type === 'password' ? 'text' : 'password';
      this.innerHTML = `<i class="fas fa-eye${input.type === 'password' ? '' : '-slash'}"></i>`;
    };
  }
  const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
  if (toggleConfirmPassword) {
    toggleConfirmPassword.onclick = function() {
      const input = document.getElementById('confirmPassword');
      input.type = input.type === 'password' ? 'text' : 'password';
      this.innerHTML = `<i class="fas fa-eye${input.type === 'password' ? '' : '-slash'}"></i>`;
    };
  }

  if (currentUser) {
    fetchData();
  }
});

// ===== Helper Functions =====
function showDashboard() {
  loginScreen.style.display = 'none';
  vendorDashboard.style.display = 'grid';
  showSection('dashboard');
  // Show user name in header
  document.getElementById('vendorUserName').textContent = currentUser?.name ? `Logged in as: ${currentUser.name}` : '';
}

function showSection(section) {
  Object.values(sections).forEach(sec => {
    if (sec) sec.style.display = 'none';
  });
  if (sections[section]) sections[section].style.display = 'block';
  document.querySelectorAll('.vendor-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.section === section);
  });
}

function logout() {
  localStorage.removeItem('vendorUser');
  location.reload();
}

async function fetchData() {
  try {
    // Fetch ALL vendor orders (including completed)
    const ordersRes = await fetch(`${BACKEND_URL}/vendors/all-orders`, {
      headers: {
        'Authorization': `Bearer ${currentUser.token}`
      }
    });
    const ordersData = await ordersRes.json();
    orders = ordersData.orders || [];

    renderDashboard();
    renderOrdersTable(orders);
  } catch (error) {
    showNotification('Failed to fetch data. Please try again.', 'error');
    setTimeout(fetchData, 5000); // Retry after 5 seconds
  }
}

async function fetchOrders(filter = 'all') {
  try {
    const res = await fetch(`${BACKEND_URL}/vendors/orders?filter=${filter}`, {
      headers: {
        'Authorization': `Bearer ${currentUser.token}`
      }
    });
    const data = await res.json();
    let filteredOrders = data.orders || [];
    if (filter !== 'all') {
      filteredOrders = applyFilter(filteredOrders, filter);
    }
    orders = filteredOrders;
    renderOrdersTable(filteredOrders);
  } catch (error) {
    showNotification('Failed to fetch orders.', 'error');
  }
}

function applyFilter(data, filterType) {
  const now = new Date();
  return data.filter(row => {
    const rowDate = new Date(row.createdAt || row.timestamp || row.Timestamp);
    switch(filterType) {
      case 'today':
        return rowDate.toDateString() === now.toDateString();
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return rowDate >= weekStart;
      case 'month':
        return rowDate.getMonth() === now.getMonth() && 
               rowDate.getFullYear() === now.getFullYear();
      case 'year':
        return rowDate.getFullYear() === now.getFullYear();
      default:
        return true;
    }
  });
}

function renderDashboard() {
  // Calculate vendor revenue from completed orders
  let totalRevenue = 0;
  let totalOrders = 0;
  let activeOrders = 0;

  orders.forEach(order => {
    if (order.status === 'Completed') {
      let totalKg = 0;
      if (order.orderSummary) {
        const lines = order.orderSummary.split('\n');
        for (const line of lines) {
          // Match: 2 × Pishori Rice (10kg) (KSh 2200.00)
          const match = line.match(/(\d+)\s*[×x]\s*.*\((\d+)\s*kg\)/i);
          if (match) {
            const qty = parseInt(match[1]);
            const kg = parseInt(match[2]);
            totalKg += qty * kg;
          }
        }
      }
      totalRevenue += totalKg * VENDOR_RATE_PER_KG;
      totalOrders++;
    } else if (VENDOR_ORDER_STATUSES.includes(order.status)) {
      activeOrders++;
    }
  });

  document.getElementById('totalOrders').textContent = totalOrders;
  document.getElementById('activeOrders').textContent = activeOrders;
  document.getElementById('totalRevenue').textContent = `KSh ${totalRevenue.toLocaleString()}`;

  updateRevenueChart(parseInt(document.getElementById('chartRange').value) || 7);
}

function showNotification(message, type = 'info') {
  alert(message); // Or use your custom notification UI
}

function searchOrders() {
  // Implement search logic or leave empty to avoid error
}