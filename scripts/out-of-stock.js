const BACKEND_URL = "https://gng-express-backend.onrender.com/api";

let currentUser = null;
let orders = [];
let inquiries = [];
let packages = [
  { Package: "1", Price: "220", Stock: "In Stock" },
  { Package: "2", Price: "440", Stock: "In Stock" },
  { Package: "5", Price: "1100", Stock: "In Stock" },
  { Package: "10", Price: "2200", Stock: "In Stock" },
  { Package: "20", Price: "4400", Stock: "In Stock" },
  { Package: "50", Price: "11000", Stock: "In Stock" }
];

let content = [];
let currentOrderPage = 1;
let currentInquiryPage = 1;
const itemsPerPage = 10;
let revenueChart = null;
let currentOrderId = null;
let currentInquiryId = null;

const loginScreen = document.getElementById('loginScreen');
const adminDashboard = document.getElementById('adminDashboard');
const loginForm = document.getElementById('loginForm');
const settingsForm = document.getElementById('settingsForm');
const navItems = document.querySelectorAll('.admin-nav-item');
const sections = {
  dashboard: document.getElementById('dashboardSection'),
  orders: document.getElementById('ordersSection'),
  inquiries: document.getElementById('inquiriesSection'),
  products: document.getElementById('productsSection'),
  settings: document.getElementById('settingsSection'),
  contentUpdate: document.getElementById('contentUpdateSection')
};
const ORDER_STATUSES = ["Pending", "Processing", "Completed", "Cancelled"];
const INQUIRY_STATUSES = ["New", "In Progress", "Resolved"];

document.addEventListener('DOMContentLoaded', function() {
  const savedUser = localStorage.getItem('adminUser');
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      showDashboard();
      fetchData();
    } catch (e) {
      localStorage.removeItem('adminUser');
    }
  }

  // Login form
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
      const res = await fetch(`${BACKEND_URL}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Login failed.");
      currentUser = { email };
      localStorage.setItem('adminUser', JSON.stringify(currentUser));
      showDashboard();
      fetchData();
    } catch (err) {
      alert(err.message || 'Invalid email or password');
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
      if (['dashboard', 'orders', 'inquiries', 'products'].includes(section)) {
        fetchData();
      }
    });
  });

  // Settings form (local only)
  settingsForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = currentUser.email;
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/users/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, currentPassword, newPassword })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to change password.");
      alert('Password changed successfully!');
      settingsForm.reset();
    } catch (err) {
      alert(err.message || 'Failed to change password.');
    }
  });

  // Chart range selector (implement backend endpoint if needed)
  document.getElementById('chartRange').addEventListener('change', function() {
    // updateRevenueChart(parseInt(this.value));
  });

  // Modal close buttons
  document.getElementById('closeOrderModal').addEventListener('click', closeOrderModal);
  document.getElementById('closeOrderModalBtn').addEventListener('click', closeOrderModal);
  document.getElementById('closeInquiryModal').addEventListener('click', closeInquiryModal);
  document.getElementById('closeInquiryModalBtn').addEventListener('click', closeInquiryModal);
  document.getElementById('closePackageModal').addEventListener('click', closePackageModal);
  document.getElementById('cancelPackageBtn').addEventListener('click', closePackageModal);

  // Search buttons
  document.getElementById('searchOrdersBtn').addEventListener('click', searchOrders);
  document.getElementById('searchInquiriesBtn').addEventListener('click', searchInquiries);

  // Content update form (backend version)
  document.getElementById('contentUpdateForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const type = document.getElementById('contentType').value;
    const message = document.getElementById('contentMessage').value;
    const expiry = document.getElementById('contentExpiry').value;
    const body = { type, message };
    if (type === 'offer' && expiry) body.expiry = expiry;
    try {
      await fetch(`${BACKEND_URL}/content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      alert("Content updated successfully!");
      fetchData();
    } catch (error) {
      alert("Failed to update content. Please try again.");
    }
  });

  // Add package button (local only)
  document.getElementById('addProductBtn').addEventListener('click', function() {
    document.getElementById('packageModal').classList.add('active');
    document.getElementById('packageForm').reset();

    // Remove previous handler to avoid stacking
    const saveBtn = document.getElementById('savePackageBtn');
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

    newSaveBtn.addEventListener('click', function() {
      packages.push({
        Package: document.getElementById('packageSize').value,
        Price: document.getElementById('packagePrice').value,
        Stock: document.getElementById('packageStock').value
      });
      showNotification('Package added locally!', 'success');
      closePackageModal();
      renderProductPackages();
    });
  });

  // Save package button (local only)
  document.getElementById('savePackageBtn').addEventListener('click', function() {
    // Local only for now
    showNotification('Package saved locally!', 'success');
    closePackageModal();
    renderProductPackages();
  });

  // Logout button
  document.getElementById('logoutBtn').addEventListener('click', logout);

  // Filter buttons (backend only)
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', function() {
      const filter = this.dataset.filter;
      const currentSection = document.querySelector('.admin-nav-item.active').dataset.section;
      if (currentSection === 'orders') {
        fetchOrders(filter);
      } else if (currentSection === 'inquiries') {
        fetchInquiries(filter);
      }
    });
  });

  if (currentUser) {
    fetchData();
  }

  document.getElementById('contentType').addEventListener('change', function() {
    const expiryGroup = document.getElementById('expiryGroup');
    if (this.value === 'offer') {
      expiryGroup.style.display = '';
    } else {
      expiryGroup.style.display = 'none';
    }
  });

  // Global search
  const searchInput = document.getElementById('global-search');
  const searchDropdown = document.getElementById('search-dropdown');
  searchInput.addEventListener('input', async (e) => {
    const q = e.target.value.trim();
    if (!q) {
      searchDropdown.style.display = 'none';
      searchDropdown.innerHTML = '';
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      let html = '';
      data.orders.forEach(order => {
        html += `<div class="search-result" data-type="order" data-id="${order._id}">Order: ${order.orderId || order._id} - ${order.name || ''}</div>`;
      });
      data.inquiries.forEach(inquiry => {
        html += `<div class="search-result" data-type="inquiry" data-id="${inquiry._id}">Inquiry: ${inquiry.inquiryId || inquiry._id} - ${inquiry.name || ''}</div>`;
      });
      searchDropdown.innerHTML = html || '<div class="search-result">No results found</div>';
      searchDropdown.style.display = 'block';
    } catch (err) {
      searchDropdown.innerHTML = '<div class="search-result">Error fetching results</div>';
      searchDropdown.style.display = 'block';
    }
  });

  searchDropdown.addEventListener('click', (e) => {
    if (e.target.classList.contains('search-result')) {
      const type = e.target.dataset.type;
      const id = e.target.dataset.id;
      if (type === 'order') {
        viewOrder(id);
      } else if (type === 'inquiry') {
        viewInquiry(id);
      }
      searchDropdown.style.display = 'none';
      searchInput.value = '';
    }
  });

  // Hide dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!searchDropdown.contains(e.target) && e.target !== searchInput) {
      searchDropdown.style.display = 'none';
    }
  });

  // Revenue graph
  async function loadRevenueGraph() {
    const res = await fetch(`${BACKEND_URL}/orders/revenue-overview`);
    const data = await res.json();
    const labels = data.map(item => item._id);
    const totals = data.map(item => item.total);

    const ctx = document.getElementById('revenueChart').getContext('2d');
    if (window.revenueChart) window.revenueChart.destroy();
    window.revenueChart = new Chart(ctx, {
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
          y: { display: true, beginAtZero: true }
        }
      }
    });
    setTimeout(() => window.revenueChart.resize(), 100);
  }
  loadRevenueGraph();
});

// ===== Helper Functions =====
function showDashboard() {
  loginScreen.style.display = 'none';
  adminDashboard.style.display = 'grid';
  showSection('dashboard');
}

function showSection(section) {
  Object.values(sections).forEach(sec => {
    if (sec) sec.style.display = 'none';
  });
  if (sections[section]) sections[section].style.display = 'block';
  document.querySelectorAll('.admin-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.section === section);
  });
}

function logout() {
  localStorage.removeItem('adminUser');
  location.reload();
}

async function fetchData() {
  try {
    // Fetch orders
    const ordersRes = await fetch(`${BACKEND_URL}/orders`);
    const ordersData = await ordersRes.json();
    orders = ordersData.orders || [];

    // Fetch inquiries
    const inquiriesRes = await fetch(`${BACKEND_URL}/inquiries`);
    const inquiriesData = await inquiriesRes.json();
    inquiries = inquiriesData.inquiries || [];

    // Fetch packages from backend
    const packagesRes = await fetch(`${BACKEND_URL}/packages`);
    const packagesData = await packagesRes.json();
    packages = packagesData.packages || [];

    renderDashboard();
    renderOrdersTable(orders);
    renderInquiriesTable(inquiries);
    renderProductPackages();
  } catch (error) {
    showNotification('Failed to fetch data. Please try again.', 'error');
    setTimeout(fetchData, 5000); // Retry after 5 seconds
  }
}

async function fetchOrders(filter = 'all') {
  try {
    const res = await fetch(`${BACKEND_URL}/orders`);
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

async function fetchInquiries(filter = 'all') {
  try {
    const res = await fetch(`${BACKEND_URL}/inquiries`);
    const data = await res.json();
    let filteredInquiries = data.inquiries || [];
    if (filter !== 'all') {
      filteredInquiries = applyFilter(filteredInquiries, filter);
    }
    inquiries = filteredInquiries;
    renderInquiriesTable(filteredInquiries);
  } catch (error) {
    showNotification('Failed to fetch inquiries.', 'error');
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
  // Calculate total revenue from completed orders
  let totalRevenue = 0;
  const completedOrders = orders.filter(row => (row.status || "").toLowerCase() === "completed");
  completedOrders.forEach(row => {
    const amountStr = (row.orderTotal || '').toString().replace(/[^0-9.]/g, '') || '0';
    totalRevenue += parseFloat(amountStr) || 0;
  });

  document.getElementById('totalRevenue').textContent = `KSh ${totalRevenue.toLocaleString()}`;
  document.getElementById('totalOrders').textContent = orders.length;
  document.getElementById('pendingOrders').textContent = orders.filter(row => (row.status || "").toLowerCase() === "pending").length;
  document.getElementById('newInquiries').textContent = inquiries.filter(row => (row.status || "").toLowerCase() === "new").length;

  // Calculate changes (simplified - would need historical data for real calculations)
  document.getElementById('revenueChange').textContent = "0%";
  document.getElementById('ordersChange').textContent = "0%";
  document.getElementById('pendingChange').textContent = "0%";
  document.getElementById('inquiriesChange').textContent = "0%";

  renderRecentOrders();
  renderRecentInquiries();
}

function renderRecentOrders() {
  const tbody = document.getElementById('recentOrdersTable');
  if (!tbody) return;
  tbody.innerHTML = '';

  // Show 5 most recent orders
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp))
    .slice(0, 5);

  recentOrders.forEach(row => {
    const status = (row.status || "pending").toLowerCase();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.orderId || 'N/A'}</td>
      <td>${row.name || 'N/A'}</td>
      <td>${formatDate(row.createdAt || row.timestamp)}</td>
      <td>${row.orderTotal || 'KSh 0'}</td>
      <td><span class="status-badge status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
      <td>
        <button class="admin-btn admin-btn-outline admin-btn-sm" onclick="viewOrder('${row._id}')">
          <i class="fas fa-eye"></i> View
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderRecentInquiries() {
  const tbody = document.getElementById('recentInquiriesTable');
  if (!tbody) return;
  tbody.innerHTML = '';

  // Show 5 most recent inquiries
  const recentInquiries = [...inquiries]
    .sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp))
    .slice(0, 5);

  recentInquiries.forEach(row => {
    const status = (row.status || "new").toLowerCase();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.inquiryId || 'N/A'}</td>
      <td>${row.name || 'N/A'}</td>
      <td>${row.subject || 'N/A'}</td>
      <td>${formatDate(row.createdAt || row.timestamp)}</td>
      <td><span class="status-badge status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
      <td>
        <button class="admin-btn admin-btn-outline admin-btn-sm" onclick="viewInquiry('${row._id}')">
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

  ordersToRender.forEach((order) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${order.orderId || 'N/A'}</td>
      <td>${order.name || 'N/A'}</td>
      <td>${formatDate(order.createdAt || order.timestamp)}</td>
      <td>
        <input type="number" class="order-total-input" value="${order.orderTotal || 0}" min="0" style="width:90px;">
      </td>
      <td>
        <select class="order-status-dropdown" data-id="${order._id}">
          <option value="Pending"${order.status === 'Pending' ? ' selected' : ''}>Pending</option>
          <option value="Processing"${order.status === 'Processing' ? ' selected' : ''}>Processing</option>
          <option value="Completed"${order.status === 'Completed' ? ' selected' : ''}>Completed</option>
          <option value="Cancelled"${order.status === 'Cancelled' ? ' selected' : ''}>Cancelled</option>
        </select>
      </td>
      <td>
        <button class="admin-btn admin-btn-outline admin-btn-sm" onclick="viewOrder('${order._id}')">
          <i class="fas fa-eye"></i> View
        </button>
        <button class="admin-btn admin-btn-primary admin-btn-sm save-order-btn" data-id="${order._id}">
          <i class="fas fa-save"></i> Save
        </button>
      </td>
    `;
    tbody.appendChild(tr);

    tr.querySelector('.save-order-btn').addEventListener('click', async function() {
      const orderId = order._id;
      const status = tr.querySelector('.order-status-dropdown').value;
      const orderTotal = parseFloat(tr.querySelector('.order-total-input').value) || 0;
      try {
        const res = await fetch(`${BACKEND_URL}/orders/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, orderTotal })
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

function renderInquiriesTable(inquiriesToRender = inquiries) {
  const tbody = document.getElementById('inquiriesTable');
  if (!tbody) return;
  tbody.innerHTML = '';

  inquiriesToRender.forEach((inquiry) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${inquiry.inquiryId || 'N/A'}</td>
      <td>${inquiry.name || 'N/A'}</td>
      <td>${inquiry.subject || 'N/A'}</td>
      <td>${formatDate(inquiry.createdAt || inquiry.timestamp)}</td>
      <td>
        <select class="inquiry-status-dropdown" data-id="${inquiry._id}">
          <option value="New"${inquiry.status === 'New' ? ' selected' : ''}>New</option>
          <option value="In Progress"${inquiry.status === 'In Progress' ? ' selected' : ''}>In Progress</option>
          <option value="Resolved"${inquiry.status === 'Resolved' ? ' selected' : ''}>Resolved</option>
        </select>
      </td>
      <td>
        <button class="admin-btn admin-btn-outline admin-btn-sm" onclick="viewInquiry('${inquiry._id}')">
          <i class="fas fa-eye"></i> View
        </button>
        <button class="admin-btn admin-btn-primary admin-btn-sm save-inquiry-btn" data-id="${inquiry._id}">
          <i class="fas fa-save"></i> Save
        </button>
      </td>
    `;
    tbody.appendChild(tr);

    tr.querySelector('.save-inquiry-btn').addEventListener('click', async function() {
      const inquiryId = inquiry._id;
      const status = tr.querySelector('.inquiry-status-dropdown').value;
      try {
        await fetch(`${BACKEND_URL}/inquiries/${inquiryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        });
        showNotification('Inquiry status updated!', 'success');
        fetchInquiries();
      } catch (error) {
        showNotification('Failed to update inquiry status.', 'error');
      }
    });
  });
}

function renderProductPackages() {
  const tbody = document.getElementById('productPackagesTable');
  if (!tbody) return;
  tbody.innerHTML = '';

  document.getElementById('packageCount').textContent = `${packages.length} Packages`;

  packages.forEach((pkg, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${pkg.size}</td>
      <td>${pkg.price}</td>
      <td>
        <span class="status-badge ${pkg.stock === 'Out of Stock' ? 'status-cancelled' : 'status-completed'}">
          ${pkg.stock}
        </span>
      </td>
      <td>
        <button class="admin-btn admin-btn-primary admin-btn-sm edit-package-btn" data-idx="${idx}">
          <i class="fas fa-edit"></i> Edit
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Attach edit handlers
  tbody.querySelectorAll('.edit-package-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const idx = this.dataset.idx;
      openEditPackageModal(idx);
    });
  });
}

function openEditPackageModal(idx) {
  const pkg = packages[idx];
  document.getElementById('packageModal').classList.add('active');
  document.getElementById('packageSize').value = pkg.size;
  document.getElementById('packagePrice').value = pkg.price;
  document.getElementById('packageStock').value = pkg.stock;

  // Remove previous handler to avoid stacking
  const saveBtn = document.getElementById('savePackageBtn');
  const newSaveBtn = saveBtn.cloneNode(true);
  saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

  newSaveBtn.addEventListener('click', async function() {
    const size = parseInt(document.getElementById('packageSize').value, 10);
    const price = parseFloat(document.getElementById('packagePrice').value);
    const stock = document.getElementById('packageStock').value;
    await fetch(`${BACKEND_URL}/packages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ size, price, stock })
    });
    showNotification('Package updated!', 'success');
    closePackageModal();
    fetchData();
  });
}

// --- Search Functions (Backend) ---
async function searchOrders() {
  const query = document.getElementById('orderSearch').value.trim();
  if (!query) {
    fetchOrders();
    return;
  }
  try {
    const res = await fetch(`${BACKEND_URL}/orders?search=${encodeURIComponent(query)}`);
    const data = await res.json();
    renderOrdersTable(data.orders || []);
  } catch (error) {
    showNotification('Failed to search orders.', 'error');
  }
}

async function searchInquiries() {
  const query = document.getElementById('inquirySearch').value.trim();
  if (!query) {
    fetchInquiries();
    return;
  }
  try {
    const res = await fetch(`${BACKEND_URL}/inquiries?search=${encodeURIComponent(query)}`);
    const data = await res.json();
    renderInquiriesTable(data.inquiries || []);
  } catch (error) {
    showNotification('Failed to search inquiries.', 'error');
  }
}

// Remove or comment out the old globalSearch() and globalSearchResults logic:

// function globalSearch() {
//   const query = document.getElementById('globalSearchInput').value.trim().toLowerCase();
//   const container = document.getElementById('globalSearchResults');
//   if (!query) {
//     container.style.display = 'none';
//     return;
//   }
//   container.style.display = 'block';
//   container.innerHTML = '<h3>Search Results</h3>';

//   // Search orders
//   const filteredOrders = orders.filter(order =>
//     (order.orderId || '').toLowerCase().includes(query) ||
//     (order.name || '').toLowerCase().includes(query) ||
//     (order.email || '').toLowerCase().includes(query)
//   );
//   if (filteredOrders.length > 0) {
//     const ordersDiv = document.createElement('div');
//     ordersDiv.innerHTML = '<h4>Orders</h4>';
//     const ordersTable = document.createElement('table');
//     ordersTable.className = 'admin-table';
//     ordersTable.innerHTML = `
//       <thead>
//         <tr>
//           <th>Order ID</th>
//           <th>Customer</th>
//           <th>Date</th>
//           <th>Amount</th>
//           <th>Status</th>
//         </tr>
//       </thead>
//       <tbody>
//         ${filteredOrders.map(order => `
//           <tr>
//             <td>${order.orderId || 'N/A'}</td>
//             <td>${order.name || 'N/A'}</td>
//             <td>${formatDate(order.createdAt || order.timestamp)}</td>
//             <td>${order.orderTotal || 'KSh 0'}</td>
//             <td><span class="status-badge status-${(order.status || 'pending').toLowerCase()}">
//               ${(order.status || 'pending').charAt(0).toUpperCase() + (order.status || 'pending').slice(1)}
//             </span></td>
//           </tr>
//         `).join('')}
//       </tbody>
//     `;
//     ordersDiv.appendChild(ordersTable);
//     container.appendChild(ordersDiv);
//   }

//   // Search inquiries
//   const filteredInquiries = inquiries.filter(inquiry =>
//     (inquiry.inquiryId || '').toLowerCase().includes(query) ||
//     (inquiry.name || '').toLowerCase().includes(query) ||
//     (inquiry.email || '').toLowerCase().includes(query) ||
//     (inquiry.subject || '').toLowerCase().includes(query)
//   );
//   if (filteredInquiries.length > 0) {
//     const inquiriesDiv = document.createElement('div');
//     inquiriesDiv.innerHTML = '<h4>Inquiries</h4>';
//     const inquiriesTable = document.createElement('table');
//     inquiriesTable.className = 'admin-table';
//     inquiriesTable.innerHTML = `
//       <thead>
//         <tr>
//           <th>Inquiry ID</th>
//           <th>Name</th>
//           <th>Subject</th>
//           <th>Date</th>
//           <th>Status</th>
//         </tr>
//       </thead>
//       <tbody>
//         ${filteredInquiries.map(inquiry => `
//           <tr>
//             <td>${inquiry.inquiryId || 'N/A'}</td>
//             <td>${inquiry.name || 'N/A'}</td>
//             <td>${inquiry.subject || 'N/A'}</td>
//             <td>${formatDate(inquiry.createdAt || inquiry.timestamp)}</td>
//             <td><span class="status-badge status-${(inquiry.status || 'new').toLowerCase()}">
//               ${(inquiry.status || 'new').charAt(0).toUpperCase() + (inquiry.status || 'new').slice(1)}
//             </span></td>
//           </tr>
//         `).join('')}
//       </tbody>
//     `;
//     inquiriesDiv.appendChild(inquiriesTable);
//     container.appendChild(inquiriesDiv);
//   }

//   if (filteredOrders.length === 0 && filteredInquiries.length === 0) {
//     container.innerHTML += '<p>No results found for your search.</p>';
//   }
// }

async function updateOrderStatus(orderId, status) {
  try {
    await fetch(`${BACKEND_URL}/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    showNotification('Order status updated!', 'success');
    fetchData();
  } catch (error) {
    showNotification('Failed to update order status.', 'error');
  }
}

async function updateInquiryStatus(inquiryId, status) {
  try {
    await fetch(`${BACKEND_URL}/inquiries/${inquiryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    showNotification('Inquiry status updated!', 'success');
    fetchData();
  } catch (error) {
    showNotification('Failed to update inquiry status.', 'error');
  }
}

// --- Modal View Functions (implement as needed for backend structure) ---
function viewOrder(orderId) {
  const order = orders.find(o => o._id === orderId);
  if (!order) {
    alert('Order not found');
    return;
  }
  currentOrderId = order._id;
  document.getElementById('orderModalBody').innerHTML = `
    <table class="admin-table">
      <tr><th>Order ID</th><td>${order.orderId || ''}</td></tr>
      <tr><th>Name</th><td><input type="text" id="modalOrderName" value="${order.name || ''}"></td></tr>
      <tr><th>Email</th><td><input type="email" id="modalOrderEmail" value="${order.email || ''}"></td></tr>
      <tr><th>Phone</th><td><input type="text" id="modalOrderPhone" value="${order.phone || ''}"></td></tr>
      <tr><th>Amount</th><td><input type="number" id="modalOrderTotal" value="${order.orderTotal || 0}" min="0"></td></tr>
      <tr><th>Status</th>
        <td>
          <select id="modalOrderStatus">
            <option value="Pending"${order.status === 'Pending' ? ' selected' : ''}>Pending</option>
            <option value="Processing"${order.status === 'Processing' ? ' selected' : ''}>Processing</option>
            <option value="Completed"${order.status === 'Completed' ? ' selected' : ''}>Completed</option>
            <option value="Cancelled"${order.status === 'Cancelled' ? ' selected' : ''}>Cancelled</option>
          </select>
        </td>
      </tr>
      <tr><th>Order Summary</th>
        <td>
          <textarea id="modalOrderSummary" rows="4" style="width:98%;">${order.orderSummary || ''}</textarea>
        </td>
      </tr>
      <tr><th>Date</th><td>${formatDate(order.createdAt || order.timestamp)}</td></tr>
    </table>
  `;
  document.getElementById('orderModal').classList.add('active');
}

function viewInquiry(inquiryId) {
  const inquiry = inquiries.find(i => i._id === inquiryId);
  if (!inquiry) {
    alert('Inquiry not found');
    return;
  }
  currentInquiryId = inquiry._id;
  // Show all comments, most recent first, with user
  const commentsHtml = (inquiry.comments || []).slice().reverse().map(c =>
    `<div class="inquiry-comment"><b>${c.user || 'admin'} (${formatDate(c.date)}):</b> ${c.text}</div>`
  ).join('');
  document.getElementById('inquiryModalBody').innerHTML = `
    <table class="admin-table">
      <tr><th>Inquiry ID</th><td>${inquiry.inquiryId || ''}</td></tr>
      <tr><th>Name</th><td>${inquiry.name || ''}</td></tr>
      <tr><th>Email</th><td>${inquiry.email || ''}</td></tr>
      <tr><th>Phone</th><td>${inquiry.phone || ''}</td></tr>
      <tr><th>Subject</th><td>${inquiry.subject || ''}</td></tr>
      <tr><th>Message</th><td>${inquiry.message || ''}</td></tr>
      <tr><th>Status</th>
        <td>
          <select id="modalInquiryStatus">
            <option value="New"${inquiry.status === 'New' ? ' selected' : ''}>New</option>
            <option value="In Progress"${inquiry.status === 'In Progress' ? ' selected' : ''}>In Progress</option>
            <option value="Resolved"${inquiry.status === 'Resolved' ? ' selected' : ''}>Resolved</option>
          </select>
        </td>
      </tr>
      <tr><th>Comments</th>
        <td>
          <div id="inquiryCommentsList">${commentsHtml}</div>
          <textarea id="modalInquiryComments" rows="2" style="width:98%;" placeholder="Add a comment..."></textarea>
        </td>
      </tr>
      <tr><th>Date</th><td>${formatDate(inquiry.createdAt || inquiry.timestamp)}</td></tr>
    </table>
  `;
  document.getElementById('inquiryModal').classList.add('active');
}

document.getElementById('updateOrderBtn').addEventListener('click', async function() {
  if (!currentOrderId) return;
  const name = document.getElementById('modalOrderName').value;
  const email = document.getElementById('modalOrderEmail').value;
  const phone = document.getElementById('modalOrderPhone').value;
  const orderTotal = parseFloat(document.getElementById('modalOrderTotal').value) || 0;
  const status = document.getElementById('modalOrderStatus').value;
  const orderSummary = document.getElementById('modalOrderSummary').value;
  try {
    await fetch(`${BACKEND_URL}/orders/${currentOrderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, orderTotal, status, orderSummary })
    });
    showNotification('Order updated!', 'success');
    closeOrderModal();
    fetchOrders();
  } catch (error) {
    showNotification('Failed to update order.', 'error');
  }
});

document.getElementById('updateInquiryBtn').addEventListener('click', async function() {
  if (!currentInquiryId) return;
  const status = document.getElementById('modalInquiryStatus').value;
  const comments = document.getElementById('modalInquiryComments').value;
  try {
    await fetch(`${BACKEND_URL}/inquiries/${currentInquiryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        status, 
        comments, 
        user: currentUser?.email || 'admin' 
      })
    });
    showNotification('Inquiry updated!', 'success');
    closeInquiryModal();
    fetchInquiries();
  } catch (error) {
    showNotification('Failed to update inquiry.', 'error');
  }
});

function closeOrderModal() {
  document.getElementById('orderModal').classList.remove('active');
}

function closeInquiryModal() {
  document.getElementById('inquiryModal').classList.remove('active');
}

function closePackageModal() {
  document.getElementById('packageModal').classList.remove('active');
  document.getElementById('packageForm').reset();
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
window.viewInquiry = viewInquiry;