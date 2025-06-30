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

  if (currentUser) {
    fetchData();
  }
});

// ===== Helper Functions =====
function showDashboard() {
  loginScreen.style.display = 'none';
  vendorDashboard.style.display = 'grid';
  showSection('dashboard');
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
    // Fetch vendor-specific orders
    const ordersRes = await fetch(`${BACKEND_URL}/vendors/orders`, {
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
      // Calculate vendor revenue (KES160 per kg + KES100 minimum)
      const kg = parseFloat(order.orderSummary?.match(/(\d+)\s*kg/i)?.[1]) || 0;
      const revenue = Math.max(VENDOR_MINIMUM_FEE, kg * VENDOR_RATE_PER_KG);
      totalRevenue += revenue;
      totalOrders++;
    } else if (VENDOR_ORDER_STATUSES.includes(order.status)) {
      activeOrders++;
    }
  });

  document.getElementById('totalRevenue').textContent = `KSh ${totalRevenue.toLocaleString()}`;
  document.getElementById('totalOrders').textContent = totalOrders;
  document.getElementById('activeOrders').textContent = activeOrders;

  // Calculate changes (simplified - would need historical data for real calculations)
  document.getElementById('revenueChange').textContent = "0%";
  document.getElementById('ordersChange').textContent = "0%";
  document.getElementById('activeChange').textContent = "0%";

  renderRecentOrders();
  updateRevenueChart(30); // Default to last 30 days
}

function renderRecentOrders() {
  const tbody = document.getElementById('recentOrdersTable');
  if (!tbody) return;
  tbody.innerHTML = '';

  // Show 5 most recent orders that are active (not completed)
  const recentOrders = [...orders]
    .filter(order => VENDOR_ORDER_STATUSES.includes(order.status))
    .sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp))
    .slice(0, 5);

  recentOrders.forEach(order => {
    const status = (order.status || "processing").toLowerCase();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${order.orderId || 'N/A'}</td>
      <td>${order.name || 'N/A'}</td>
      <td>${formatDate(order.createdAt || order.timestamp)}</td>
      <td>${calculateVendorRevenue(order)}</td>
      <td><span class="status-badge status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
      <td>
        <button class="vendor-btn vendor-btn-outline vendor-btn-sm" onclick="viewOrder('${order._id}')">
          <i class="fas fa-eye"></i> View
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderOrdersTable(ordersToRender = orders) {
  const tbody = document.getElementById('ordersTable');
  if (!tbody) return;
  tbody.innerHTML = '';

  // Only show orders that vendors can manage
  const vendorOrders = ordersToRender.filter(order => 
    VENDOR_ORDER_STATUSES.includes(order.status)
  );

  vendorOrders.forEach((order) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${order.orderId || 'N/A'}</td>
      <td>${order.name || 'N/A'}</td>
      <td>${formatDate(order.createdAt || order.timestamp)}</td>
      <td>${calculateVendorRevenue(order)}</td>
      <td>
        <select class="order-status-dropdown" data-id="${order._id}">
          <option value="Processing"${order.status === 'Processing' ? ' selected' : ''}>Processing</option>
          <option value="In Transit"${order.status === 'In Transit' ? ' selected' : ''}>In Transit</option>
          <option value="Arrived"${order.status === 'Arrived' ? ' selected' : ''}>Arrived</option>
        </select>
      </td>
      <td>
        <button class="vendor-btn vendor-btn-outline vendor-btn-sm" onclick="viewOrder('${order._id}')">
          <i class="fas fa-eye"></i> View
        </button>
        <button class="vendor-btn vendor-btn-primary vendor-btn-sm save-order-btn" data-id="${order._id}">
          <i class="fas fa-save"></i> Save
        </button>
      </td>
    `;
    tbody.appendChild(tr);

    tr.querySelector('.save-order-btn').addEventListener('click', async function() {
      const orderId = order._id;
      const status = tr.querySelector('.order-status-dropdown').value;
      try {
        const res = await fetch(`${BACKEND_URL}/vendors/orders/${orderId}`, {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json",
            'Authorization': `Bearer ${currentUser.token}`
          },
          body: JSON.stringify({ status })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Failed to update order.");
        showNotification('Order updated!', 'success');
        fetchOrders();
      } catch (error) {
        showNotification('Failed to update order.', 'error');
      }
    });
  });
}

function calculateVendorRevenue(order) {
  if (order.status === 'Completed') {
    const kg = parseFloat(order.orderSummary?.match(/(\d+)\s*kg/i)?.[1]) || 0;
    const revenue = Math.max(VENDOR_MINIMUM_FEE, kg * VENDOR_RATE_PER_KG);
    return `KSh ${revenue.toLocaleString()}`;
  }
  return "Pending";
}

async function updateRevenueChart(days = 30) {
  try {
    const res = await fetch(`${BACKEND_URL}/vendors/revenue?days=${days}`, {
      headers: {
        'Authorization': `Bearer ${currentUser.token}`
      }
    });
    const data = await res.json();
    const labels = data.map(item => item._id);
    const totals = data.map(item => item.total);

    const ctx = document.getElementById('revenueChart').getContext('2d');

    // Only destroy if revenueChart is a Chart instance
    if (revenueChart && typeof revenueChart.destroy === 'function' && revenueChart instanceof Chart) {
      revenueChart.destroy();
    }

    revenueChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Revenue',
          data: totals,
          borderColor: 'green',
          backgroundColor: 'rgba(34,139,34,0.08)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: 'var(--gold)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: { display: false }
        },
        scales: {
          x: { display: true, title: { display: false } },
          y: { 
            display: true,
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return 'KSh ' + value.toLocaleString();
              }
            }
          }
        }
      }
    });
    setTimeout(() => revenueChart.resize(), 100);
  } catch (error) {
    console.error('Failed to load revenue chart:', error);
  }
}

async function searchOrders() {
  const query = document.getElementById('orderSearch').value.trim();
  if (!query) {
    fetchOrders();
    return;
  }
  try {
    const res = await fetch(`${BACKEND_URL}/vendors/orders/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${currentUser.token}`
      }
    });
    const data = await res.json();
    renderOrdersTable(data.orders || []);
  } catch (error) {
    showNotification('Failed to search orders.', 'error');
  }
}

function viewOrder(orderId) {
  const order = orders.find(o => o._id === orderId);
  if (!order) {
    alert('Order not found');
    return;
  }
  currentOrderId = order._id;
  // Only show assignment field if status is being set to "Arrived"
  document.getElementById('orderModalBody').innerHTML = `
    <table class="vendor-table">
      <tr><th>Order ID</th><td>${order.orderId || ''}</td></tr>
      <tr><th>Customer Name</th><td>${order.name || ''}</td></tr>
      <tr><th>Delivery Address</th><td>${order.deliveryAddress || ''}</td></tr>
      <tr><th>Phone</th><td>${order.phone || ''}</td></tr>
      <tr><th>Vendor Revenue</th><td>${calculateVendorRevenue(order)}</td></tr>
      <tr><th>Status</th>
        <td>
          <select id="modalOrderStatus">
            <option value="Processing"${order.status === 'Processing' ? ' selected' : ''}>Processing</option>
            <option value="In Transit"${order.status === 'In Transit' ? ' selected' : ''}>In Transit</option>
            <option value="Arrived"${order.status === 'Arrived' ? ' selected' : ''}>Arrived</option>
          </select>
        </td>
      </tr>
      <tr id="assignmentRow" style="display:none;">
        <th>Assignment</th>
        <td>
          <select id="modalOrderAssignment">
            <option value="vendor">Keep with Vendor</option>
            <option value="admin">Reassign to Admin</option>
          </select>
        </td>
      </tr>
      <tr><th>Order Summary</th><td>${order.orderSummary || ''}</td></tr>
      <tr><th>Date</th><td>${formatDate(order.createdAt || order.timestamp)}</td></tr>
    </table>
  `;
  document.getElementById('orderModal').classList.add('active');

  // Show assignment field only if status is "Arrived"
  const statusSelect = document.getElementById('modalOrderStatus');
  const assignmentRow = document.getElementById('assignmentRow');
  function toggleAssignmentField() {
    if (statusSelect.value === 'Arrived') {
      assignmentRow.style.display = '';
    } else {
      assignmentRow.style.display = 'none';
    }
  }
  statusSelect.addEventListener('change', toggleAssignmentField);
  toggleAssignmentField();
}

document.getElementById('updateOrderBtn').addEventListener('click', async function() {
  if (!currentOrderId) return;
  const status = document.getElementById('modalOrderStatus').value;
  let body = { status };
  // Only send assignment if status is "Arrived" and admin is selected
  if (status === 'Arrived') {
    const assignment = document.getElementById('modalOrderAssignment').value;
    if (assignment === 'admin') {
      body.vendor = null; // Remove vendor assignment
    }
  }
  try {
    const res = await fetch(`${BACKEND_URL}/vendors/orders/${currentOrderId}`, {
      method: "PATCH",
      headers: { 
        "Content-Type": "application/json",
        'Authorization': `Bearer ${currentUser.token}`
      },
      body: JSON.stringify(body)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Failed to update order.");
    showNotification('Order status updated!', 'success');
    closeOrderModal();
    fetchOrders();
  } catch (error) {
    showNotification('Failed to update order status.', 'error');
  }
});

function closeOrderModal() {
  document.getElementById('orderModal').classList.remove('active');
}

function closeRegisterModal() {
  document.getElementById('registerModal').classList.remove('active');
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

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

// Expose functions to global scope for HTML onclick handlers
window.viewOrder = viewOrder;