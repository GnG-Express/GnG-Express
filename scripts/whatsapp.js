// WhatsApp Integration Functions

function submitWhatsAppOrder(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);

  // Get cart items summary
  const items = (window.state?.cart || []).map(item =>
    `${item.quantity} × ${item.name} - KSh ${(item.price * item.quantity).toFixed(2)}`
  ).join('%0A');

  const total = (window.state?.cart || []).reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const grandTotal = total + 100; // Including delivery fee

  // Create WhatsApp message
  const message = `*NEW ORDER REQUEST*%0A%0A` +
    `*Customer Details*%0A` +
    `Name: ${formData.get('name')}%0A` +
    `Email: ${formData.get('email')}%0A` +
    `Phone: ${formData.get('phone')}%0A` +
    `Pickup Time: ${form.querySelector('#pickup-time option:checked')?.text || ''}%0A` +
    `Pickup Location: ${form.querySelector('#pickup-location option:checked')?.text || ''}%0A` +
    `Payment Method: ${form.querySelector('input[name="payment"]:checked')?.value.toUpperCase() || ''}%0A` +
    `Delivery Note: ${formData.get('delivery-note') || 'None'}%0A%0A` +
    `*Order Summary*%0A${items}%0A%0A` +
    `Subtotal: KSh ${total.toFixed(2)}%0A` +
    `Delivery Fee: KSh 100%0A` +
    `*Grand Total: KSh ${grandTotal.toFixed(2)}*%0A%0A` +
    `Please confirm this order and provide payment details.`;

  redirectToWhatsApp(message, event);
}

function submitWhatsAppMessage(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);

  // Create WhatsApp message
  const message = `*NEW CUSTOMER MESSAGE*%0A%0A` +
    `*From*: ${formData.get('name')}%0A` +
    `*Email*: ${formData.get('email')}%0A` +
    `*Phone*: ${formData.get('phone') || 'Not provided'}%0A` +
    `*Subject*: ${form.querySelector('#subject option:checked')?.text || ''}%0A%0A` +
    `*Message*:%0A${formData.get('message')}%0A%0A` +
    `Please respond to this inquiry at your earliest convenience.`;

  redirectToWhatsApp(message, event);
}

function redirectToWhatsApp(message, event) {
  const phone = '254712071081'; // WhatsApp number without +
  const url = `https://wa.me/${phone}?text=${message}`;
  window.open(url, '_blank');

  // Show confirmation
  if (typeof showNotification === 'function') {
    showNotification('Opening WhatsApp to complete your request', 'success');
  }

  // Reset form after delay
  setTimeout(() => {
    event.target.reset();
    if (typeof closeCheckout === 'function') closeCheckout();
    if (typeof window.app?.closeCart === 'function') window.app.closeCart();
  }, 1000);
}