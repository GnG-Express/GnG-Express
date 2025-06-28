// ===== Scroll to Products =====
function scrollToProducts() {
  const productsSection = document.getElementById('products');
  productsSection.scrollIntoView({
    behavior: 'smooth'
  });
}

// ===== Product Card Interactions =====
document.querySelectorAll('.product-card').forEach(card => {
  let hoverTimer;
  card.addEventListener('click', function(e) {
    if (!e.target.classList.contains('btn-secondary')) {
      openProductModal();
    }
  });
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
  fetchActiveContent();
  setInterval(fetchActiveContent, 300000);
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

let currentFloatingNotification = null;
let lastNotificationContent = '';
let notificationClosedByUser = false;
let notificationStillExists = false;

function fetchActiveContent() {
  fetch('http://localhost:5000/api/content/active-all')
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById('siteContentUpdate');
      container.innerHTML = '';
      let foundNotification = false;
      if (data && Array.isArray(data.content)) {
        data.content.forEach(item => {
          if (item.type === 'offer') {
            // Offer: show above hero
            let bg = '#fffbe6', border = '#d4af37', color = '#d4af37';
            const div = document.createElement('div');
            div.className = 'content-update offer';
            div.style = `
              background: ${bg};
              border-left: 4px solid ${border};
              padding: 1.2em 2em;
              margin: 1em 0;
              border-radius: 8px;
              font-size: 1.1em;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              position: relative;
            `;
            div.innerHTML = `
              <strong style="
                color: ${color};
                text-transform: uppercase;
                font-family: 'Jost', sans-serif;
              ">${item.type}</strong>: 
              <span style="font-family: 'Jost', sans-serif;">${item.message}</span>
              ${item.expiry ? `<div style="font-size:0.95em;color:#888;margin-top:0.5em;">Expires: ${new Date(item.expiry).toLocaleString()}</div>` : ''}
            `;
            container.appendChild(div);
          }
          if (item.type === 'notification') {
            foundNotification = true;
            notificationStillExists = true;
            // If notification content changed, reset closed flag and show again
            if (lastNotificationContent !== item.message) {
              notificationClosedByUser = false;
              lastNotificationContent = item.message;
              if (currentFloatingNotification) {
                currentFloatingNotification.remove();
                currentFloatingNotification = null;
              }
            }
            // Only show if not closed by user
            if (!notificationClosedByUser) {
              // If not already present, create and show
              if (!currentFloatingNotification || !document.body.contains(currentFloatingNotification)) {
                if (currentFloatingNotification) {
                  currentFloatingNotification.remove();
                }
                currentFloatingNotification = document.createElement('div');
                currentFloatingNotification.className = 'floating-notification content-update notification';
                currentFloatingNotification.style = `
                  background: #e3f2fd;
                  border-left: 4px solid #1565c0;
                  padding: 1.2em 2em 1.2em 1.5em;
                  border-radius: 10px 10px 10px 10px;
                  font-size: 1.08em;
                  box-shadow: 0 4px 24px rgba(21,101,192,0.13);
                  color: #1565c0;
                  position: fixed;
                  left: 2vw;
                  bottom: 2vw;
                  z-index: 9999;
                  min-width: 280px;
                  max-width: 350px;
                  animation: fadeInUp 0.6s;
                `;
                currentFloatingNotification.innerHTML = `
                  <button class="close-notification" style="float:right;background:none;border:none;font-size:1.3em;cursor:pointer;color:#1565c0;margin-left:1em;" aria-label="Close">&times;</button>
                  <strong style="
                    color: #1565c0;
                    text-transform: uppercase;
                    font-family: 'Jost', sans-serif;
                  ">${item.type}</strong>: 
                  <span style="font-family: 'Jost', sans-serif;">${item.message}</span>
                `;
                // Wait for preloader to be gone before appending
                const appendNotification = () => {
                  const preloader = document.getElementById('preloader');
                  if (!preloader && !document.body.contains(currentFloatingNotification)) {
                    document.body.appendChild(currentFloatingNotification);

                    // Close button handler
                    currentFloatingNotification.querySelector('.close-notification').addEventListener('click', () => {
                      if (currentFloatingNotification) {
                        currentFloatingNotification.remove();
                        currentFloatingNotification = null;
                        notificationClosedByUser = true;
                      }
                    });
                  } else if (preloader) {
                    setTimeout(appendNotification, 100);
                  }
                };
                appendNotification();
              }
            }
          }
        });
      }
      // Only remove the notification if the backend notification is truly gone (not just a fetch blip)
      // Do NOT remove the notification here; let the user close it
      // Optionally, if you want to remove it when the backend notification is deleted, uncomment below:
      if (!foundNotification && currentFloatingNotification && !notificationClosedByUser) {
        // Uncomment the next lines ONLY if you want to remove notification when backend deletes it:
        // currentFloatingNotification.remove();
        // currentFloatingNotification = null;
        // lastNotificationContent = '';
        // notificationClosedByUser = false;
      }
    });
}