const SPREADSHEET_ID = '1pj5pi_ebWMcvJ0Bclapl5kpCRYH-RgKUtyp5gNvudWM';

// ===== MAIN HANDLERS =====
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var response = ContentService.createTextOutput();
  response.setMimeType(ContentService.MimeType.JSON);

  // CORS headers (will NOT work for ContentService, but left for completeness)
  if (typeof response.setHeader === 'function') {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (!e) {
    response.setContent(JSON.stringify({
      status: "ok",
      message: "API is running (manual execution)"
    }));
    return response;
  }

  try {
    Logger.log("Incoming request: " + JSON.stringify(e));

    let result;
    if (e.postData && e.postData.contents) {
      const data = JSON.parse(e.postData.contents);
      result = processPostRequest(data);
    } else if (e.parameter) {
      result = processGetRequest(e.parameter);
    } else {
      result = { status: "ok", message: "API ready" };
    }

    response.setContent(JSON.stringify({
      success: true,
      ...result
    }));

  } catch (error) {
    console.error("API Error:", error);
    response.setContent(JSON.stringify({
      success: false,
      error: error.message,
      details: error.stack
    }));
  }

  return response;
}

// ===== REQUEST PROCESSORS =====
function processGetRequest(params) {
  const { type, sheet, query, days } = params;

  try {
    switch(type) {
      case 'getAll': 
        return getAllData();
      case 'getContent':
        return getActiveContent();
      case 'search':
        if (!sheet || !query) throw new Error("Missing sheet or query parameters");
        return searchData(sheet, query);
      case 'getPackageStock':
        return getPackageStock();
      case 'getRevenueData':
        return getRevenueData(parseInt(days) || 30);
      case 'getOrder':
        return getOrderDetails(params.orderId);
      case 'getInquiry':
        return getInquiryDetails(params.inquiryId);
      default:
        throw new Error("Invalid request type");
    }
  } catch (error) {
    console.error("Get Request Error:", error);
    throw error;
  }
}

function processPostRequest(data) {
  const { type } = data;

  switch(type) {
    case 'addOrder':
      return addOrder(data);
    case 'addInquiry':
      return addInquiry(data);
    case 'updateOrder': 
      return updateOrder(data);
    case 'updateInquiry':
      return updateInquiry(data);
    case 'updatePackage':
      return updatePackage(data);
    case 'updateContent':
      return updateContent(data);
    case 'addPackage':
      return addPackage(data);
    case 'deletePackage':
      return deletePackage(data);
    case 'logAdminAction':
      return logAdminAction(data);
    case 'updatePassword':
      return updatePassword(data);
    default:
      throw new Error("Invalid request type");
  }
}

// ===== DATA ACCESS LAYER =====
function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheetData(sheetName) {
  const spreadsheet = getSpreadsheet();
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error(`Sheet ${sheetName} not found`);

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  return rows.map((row, idx) => {
    const obj = { rowIndex: idx + 2 };
    headers.forEach((header, i) => {
      const key = header.replace(/\s+/g, '_');
      obj[key] = row[i];
      obj[header] = row[i];
    });
    return obj;
  });
}

// ====== FIXED addOrder ======
function addOrder(data) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName('Orders');
  if (!sheet) {
    sheet = spreadsheet.insertSheet('Orders');
  }

  // Set headers if empty sheet
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Timestamp', 'Name', 'Phone', 'Email', 'Location', 
      'Note', 'Order Summary', 'Order Total', 'Status', 'Order ID'
    ]);
  }

  // Generate order ID
  const orders = getSheetData('Orders');
  const lastOrderNum = orders.reduce((max, order) => {
    const match = order.Order_ID?.match(/GNG-O-(\d+)/) || order['Order ID']?.match(/GNG-O-(\d+)/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  const orderId = `GNG-O-${String(lastOrderNum + 1).padStart(3, '0')}`;

  // Prepare row data
  const rowData = [
    new Date(),
    data.name || '',
    data.phone || '',
    data.email || '',
    data.location || '',
    data.note || '',
    data.orderSummary || '',
    data.orderTotal || '0',
    'Pending',
    orderId
  ];

  sheet.appendRow(rowData);
  SpreadsheetApp.flush();

  return { 
    orderId,
    rowIndex: sheet.getLastRow(),
    timestamp: rowData[0]
  };
}

// ====== FIXED addInquiry ======
function addInquiry(data) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName('Inquiries');
  if (!sheet) {
    sheet = spreadsheet.insertSheet('Inquiries');
  }

  // Set headers if empty sheet
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Timestamp', 'Name', 'Email', 'Phone', 'Subject', 
      'Message', 'Status', 'Inquiry ID', 'Comments'
    ]);
  }

  // Generate inquiry ID
  const inquiries = getSheetData('Inquiries');
  const lastInquiryNum = inquiries.reduce((max, inquiry) => {
    const match = inquiry.Inquiry_ID?.match(/GNG-I-(\d+)/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  const inquiryId = `GNG-I-${String(lastInquiryNum + 1).padStart(3, '0')}`;

  // Prepare row data
  const rowData = [
    new Date(),
    data.name || '',
    data.email || '',
    data.phone || '',
    data.subject || '',
    data.message || '',
    'New',
    inquiryId,
    ''
  ];

  sheet.appendRow(rowData);
  SpreadsheetApp.flush();

  return { 
    inquiryId,
    rowIndex: sheet.getLastRow(),
    timestamp: rowData[0]
  };
}

// ===== BUSINESS LOGIC =====
function getAllData() {
  return {
    orders: getSheetData('Orders'),
    inquiries: getSheetData('Inquiries'),
    packages: getSheetData('Packages'),
    content: getSheetData('Content')
  };
}

function getActiveContent() {
  const content = getSheetData('Content');
  const active = content.find(item => item.Active === true);
  return active || { Type: 'notification', Message: '' };
}

function searchData(sheetName, query) {
  const data = getSheetData(sheetName);
  const results = data.filter(row => 
    Object.values(row).some(value => 
      String(value).toLowerCase().includes(query.toLowerCase())
    )
  );
  return { results };
}

function getPackageStock() {
  const packages = getSheetData('Packages');
  const stockStatus = {};
  packages.forEach(pkg => {
    if (pkg.Package) stockStatus[pkg.Package] = pkg.Stock || 'In Stock';
  });
  return { packageStock: stockStatus };
}

function getRevenueData(days = 30) {
  const orders = getSheetData('Orders');
  const now = new Date();
  const dailyRevenue = Array(days).fill(0);
  const labels = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }

  orders.forEach(order => {
    if (order.Status?.toLowerCase() !== 'completed') return;

    const orderDate = new Date(order.Timestamp);
    const diffDays = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays < days) {
      const amountStr = order.Order_Total?.toString().replace(/[^0-9.]/g, '') || '0';
      dailyRevenue[days - diffDays - 1] += parseFloat(amountStr) || 0;
    }
  });

  return { labels, data: dailyRevenue };
}

function getOrderDetails(orderId) {
  const orders = getSheetData('Orders');
  const order = orders.find(o => o.Order_ID === orderId);
  if (!order) throw new Error("Order not found");
  return order;
}

function getInquiryDetails(inquiryId) {
  const inquiries = getSheetData('Inquiries');
  const inquiry = inquiries.find(i => i.Inquiry_ID === inquiryId);
  if (!inquiry) throw new Error("Inquiry not found");
  return inquiry;
}

function updateOrder(data) {
  const { orderId, rowIndex } = data;
  if (!orderId && !rowIndex) throw new Error("Missing order identifier");

  let order;
  if (rowIndex) {
    const orders = getSheetData('Orders');
    order = orders.find(o => o.rowIndex === parseInt(rowIndex));
    if (!order) throw new Error("Order not found");
  } else {
    order = getOrderDetails(orderId);
  }

  const updates = {};
  if (data.name) updates.Name = data.name;
  if (data.phone) updates.Phone = data.phone;
  if (data.email) updates.Email = data.email;
  if (data.location) updates.Location = data.location;
  if (data.note) updates.Note = data.note;
  if (data.orderSummary) updates.Order_Summary = data.orderSummary;
  if (data.orderTotal) updates.Order_Total = data.orderTotal;
  if (data.status) updates.Status = data.status;

  updateSheetRow('Orders', order.rowIndex, updates);

  return { 
    success: true,
    orderId: order.Order_ID || orderId,
    updatedFields: Object.keys(updates)
  };
}

function updateInquiry(data) {
  const { inquiryId, rowIndex } = data;
  if (!inquiryId && !rowIndex) throw new Error("Missing inquiry identifier");

  let inquiry;
  if (rowIndex) {
    const inquiries = getSheetData('Inquiries');
    inquiry = inquiries.find(i => i.rowIndex === parseInt(rowIndex));
    if (!inquiry) throw new Error("Inquiry not found");
  } else {
    inquiry = getInquiryDetails(inquiryId);
  }

  const updates = {};
  if (data.name) updates.Name = data.name;
  if (data.email) updates.Email = data.email;
  if (data.phone) updates.Phone = data.phone;
  if (data.subject) updates.Subject = data.subject;
  if (data.message) updates.Message = data.message;
  if (data.status) updates.Status = data.status;
  if (data.comments) updates.Comments = data.comments;

  updateSheetRow('Inquiries', inquiry.rowIndex, updates);

  return { 
    success: true,
    inquiryId: inquiry.Inquiry_ID || inquiryId,
    updatedFields: Object.keys(updates)
  };
}

function updatePackage(data) {
  if (!data.package) throw new Error("Missing package identifier");

  const packages = getSheetData('Packages');
  const pkg = packages.find(p => p.Package === data.package);
  if (!pkg) throw new Error("Package not found");

  const updates = {};
  if (data.newPackage) updates.Package = data.newPackage;
  if (data.price) updates.Price = data.price;
  if (data.stock) updates.Stock = data.stock;

  updateSheetRow('Packages', pkg.rowIndex, updates);

  return { 
    success: true,
    package: data.newPackage || data.package
  };
}

function addPackage(data) {
  if (!data.package || !data.price) throw new Error("Missing package or price");

  const packages = getSheetData('Packages');
  if (packages.some(p => p.Package === data.package)) {
    throw new Error("Package already exists");
  }

  const packageData = [
    data.package,
    data.price,
    data.stock || 'In Stock'
  ];

  const rowIndex = writeToSheet('Packages', packageData);

  return { 
    success: true,
    rowIndex,
    package: data.package
  };
}

function deletePackage(data) {
  if (!data.package) throw new Error("Missing package identifier");

  const spreadsheet = getSpreadsheet();
  const sheet = spreadsheet.getSheetByName('Packages');
  const packages = getSheetData('Packages');

  const pkg = packages.find(p => p.Package === data.package);
  if (!pkg) throw new Error("Package not found");

  sheet.deleteRow(pkg.rowIndex);
  SpreadsheetApp.flush();

  return { 
    success: true,
    package: data.package
  };
}

function updateContent(data) {
  if (!data.contentType || !data.message) throw new Error("Missing content type or message");

  const content = getSheetData('Content');
  content.forEach(item => {
    if (item.Active === true) {
      updateSheetRow('Content', item.rowIndex, { Active: false });
    }
  });

  const contentData = [
    data.contentType,
    data.message,
    new Date(),
    true
  ];

  const rowIndex = writeToSheet('Content', contentData);

  return { 
    success: true,
    rowIndex
  };
}

function updatePassword(data) {
  if (!data.email || !data.newPassword) throw new Error("Missing email or new password");

  let sheet = getSpreadsheet().getSheetByName('AdminSettings');
  if (!sheet) {
    sheet = getSpreadsheet().insertSheet('AdminSettings');
    sheet.appendRow(['Email', 'Password', 'LastUpdated']);
  }

  const adminSettings = getSheetData('AdminSettings');
  const admin = adminSettings.find(a => a.Email === data.email);

  if (admin) {
    updateSheetRow('AdminSettings', admin.rowIndex, { 
      Password: data.newPassword,
      LastUpdated: new Date()
    });
  } else {
    const adminData = [
      data.email,
      data.newPassword,
      new Date()
    ];
    writeToSheet('AdminSettings', adminData);
  }

  return { success: true };
}

function logAdminAction(data) {
  if (!data.adminEmail || !data.action) throw new Error("Missing admin email or action");

  let sheet = getSpreadsheet().getSheetByName('AdminLogs');
  if (!sheet) {
    sheet = getSpreadsheet().insertSheet('AdminLogs');
    sheet.appendRow(['Timestamp', 'AdminEmail', 'Action', 'Details']);
  }

  const logData = [
    new Date(),
    data.adminEmail,
    data.action,
    data.details || ''
  ];

  writeToSheet('AdminLogs', logData);

  return { success: true };
}