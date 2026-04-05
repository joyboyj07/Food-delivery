/* QuickBite — Frontend App */
const API = '/api';
let token = localStorage.getItem('qb_token');
let currentUser = null;
let cartData = { items: [], count: 0 };
let currentRestaurantId = null;
let socket = null;
let restPage = 1;
let searchTimer = null;

// ── Utils ─────────────────────────────────────────────────────────────────────
const fmt = n => '₹' + parseFloat(n || 0).toLocaleString('en-IN');
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const ago = d => {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
};

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: '🍕' };
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  document.getElementById('toast-wrap').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function statusBadge(s) {
  return `<span class="status-badge status-${s}">${s?.replace('_', ' ') || ''}</span>`;
}

function starRating(r) {
  const stars = Math.round(r || 0);
  return '⭐'.repeat(stars) + '☆'.repeat(5 - stars);
}

// ── Auth ─────────────────────────────────────────────────────────────────────
function switchAuth(mode) {
  document.getElementById('login-form').style.display = mode === 'login' ? 'block' : 'none';
  document.getElementById('register-form').style.display = mode === 'register' ? 'block' : 'none';
}

function quickLogin(email, pass) {
  document.getElementById('l-email').value = email;
  document.getElementById('l-password').value = pass;
  login();
}

async function login() {
  const email = document.getElementById('l-email').value.trim();
  const password = document.getElementById('l-password').value;
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';
  if (!email || !password) { errEl.textContent = 'Enter email and password'; errEl.style.display = 'block'; return; }
  try {
    const data = await api('POST', '/auth/login', { email, password });
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('qb_token', token);
    initApp();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.style.display = 'block';
  }
}

async function register() {
  const name = document.getElementById('r-name').value.trim();
  const email = document.getElementById('r-email').value.trim();
  const phone = document.getElementById('r-phone').value.trim();
  const password = document.getElementById('r-password').value;
  const address = document.getElementById('r-address').value.trim();
  const errEl = document.getElementById('register-error');
  errEl.style.display = 'none';
  if (!name || !email || !password) { errEl.textContent = 'Name, email, password required'; errEl.style.display = 'block'; return; }
  try {
    const data = await api('POST', '/auth/register', { name, email, phone, password, address });
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('qb_token', token);
    initApp();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.style.display = 'block';
  }
}

function logout() {
  token = null; currentUser = null; cartData = { items: [], count: 0 };
  localStorage.removeItem('qb_token');
  document.getElementById('main-app').style.display = 'none';
  document.getElementById('auth-page').style.display = 'flex';
}

document.getElementById('l-password').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });

// ── Init ─────────────────────────────────────────────────────────────────────
async function initApp() {
  if (!token) { document.getElementById('auth-page').style.display = 'flex'; return; }
  try {
    currentUser = await api('GET', '/auth/me');
    document.getElementById('auth-page').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    updateNavUser();
    await loadCart();
    showSection('home');
    if (currentUser.role === 'admin') document.getElementById('admin-link').style.display = 'block';
    // Init socket
    try {
      socket = io();
    } catch (e) {}
  } catch (e) {
    localStorage.removeItem('qb_token');
    document.getElementById('auth-page').style.display = 'flex';
  }
}

function updateNavUser() {
  if (!currentUser) return;
  const initials = currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('nav-avatar').textContent = initials;
  document.getElementById('nav-user-name').textContent = currentUser.name;
}

// ── Navigation ─────────────────────────────────────────────────────────────────
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  const sec = document.getElementById('section-' + name);
  if (sec) sec.classList.add('active');
  const nav = document.querySelector(`[data-page="${name}"]`);
  if (nav) nav.classList.add('active');
  window.scrollTo(0, 0);
  if (name === 'home') loadHomeRestaurants();
  else if (name === 'restaurants') { loadRestaurants(); loadCuisineFilter(); }
  else if (name === 'cart') loadCartPage();
  else if (name === 'orders') loadOrders();
  else if (name === 'profile') loadProfile();
  else if (name === 'admin') loadAdminPanel();
}

function toggleMobileMenu() {
  const links = document.getElementById('nav-links');
  links.style.display = links.style.display === 'flex' ? 'none' : 'flex';
}

// ── Home ─────────────────────────────────────────────────────────────────────
async function loadHomeRestaurants() {
  try {
    const data = await api('GET', '/restaurants?limit=8&sort=rating');
    renderRestaurantGrid('home-restaurants', data.restaurants);
  } catch (e) { }
}

function heroSearch() {
  const val = document.getElementById('hero-search').value;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    if (val.length > 1) { showSection('restaurants'); document.getElementById('rest-search').value = val; loadRestaurants(); }
  }, 500);
}

function goToRestaurants() {
  const val = document.getElementById('hero-search').value;
  showSection('restaurants');
  if (val) { document.getElementById('rest-search').value = val; loadRestaurants(); }
}

function filterCuisine(cuisine) {
  showSection('restaurants');
  document.getElementById('cuisine-filter').value = cuisine;
  loadRestaurants();
}

// ── Restaurants ─────────────────────────────────────────────────────────────────
async function loadRestaurants(page = 1) {
  restPage = page;
  const search = document.getElementById('rest-search')?.value || '';
  const cuisine = document.getElementById('cuisine-filter')?.value || '';
  const sort = document.getElementById('sort-filter')?.value || 'rating';
  try {
    const data = await api('GET', `/restaurants?search=${encodeURIComponent(search)}&cuisine=${cuisine}&sort=${sort}&page=${page}&limit=12`);
    const cnt = document.getElementById('restaurants-count');
    if (cnt) cnt.textContent = `${data.total} restaurant${data.total !== 1 ? 's' : ''} found`;
    renderRestaurantGrid('all-restaurants', data.restaurants);
    renderPagination('rest-pagination', page, data.pages, loadRestaurants);
  } catch (e) { toast(e.message, 'error'); }
}

function searchRestaurants() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadRestaurants(1), 400);
}

async function loadCuisineFilter() {
  try {
    const cuisines = await api('GET', '/restaurants/meta/cuisines');
    const sel = document.getElementById('cuisine-filter');
    if (sel.options.length <= 1) {
      cuisines.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o); });
    }
  } catch (e) { }
}

function renderRestaurantGrid(containerId, restaurants) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!restaurants.length) { el.innerHTML = '<div style="text-align:center;padding:40px;color:#999;grid-column:1/-1">No restaurants found</div>'; return; }
  el.innerHTML = restaurants.map(r => `
    <div class="rest-card" onclick="openRestaurant(${r.id})">
      <div class="rest-card-img">
        <img src="${r.image || 'https://images.unsplash.com/photo-1517244683847-7456b63c5969?w=400&h=300&fit=crop'}" 
             alt="${r.name}" onerror="this.src='https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop'">
        <span class="rest-badge ${!r.is_open ? 'closed' : r.rating >= 4.5 ? 'top-rated' : ''}">${!r.is_open ? 'Closed' : r.rating >= 4.5 ? '⭐ Top Rated' : r.cuisine}</span>
        ${r.delivery_fee == 0 ? '<span class="rest-offers">🎉 Free Delivery</span>' : ''}
      </div>
      <div class="rest-card-body">
        <div class="rest-card-top">
          <div class="rest-name">${r.name}</div>
          <div class="rest-rating">⭐ ${parseFloat(r.rating || 0).toFixed(1)}</div>
        </div>
        <div class="rest-cuisine">${r.cuisine} · ${r.menu_count || 0} items</div>
        <div class="rest-meta">
          <span>🕐 ${r.delivery_time}-${parseInt(r.delivery_time) + 15} min</span>
          <span>🚴 ${r.delivery_fee == 0 ? 'Free' : fmt(r.delivery_fee)}</span>
          <span>📦 Min ${fmt(r.min_order)}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// ── Restaurant Detail ─────────────────────────────────────────────────────────
async function openRestaurant(id) {
  currentRestaurantId = id;
  showSection('restaurant-detail');
  try {
    const r = await api('GET', `/restaurants/${id}`);
    const cartItems = cartData.items || [];
    const getItemQty = (itemId) => {
      const found = cartItems.find(c => c.menu_item_id === itemId);
      return found ? found.quantity : 0;
    };
    // Group menu by category
    const grouped = {};
    r.menu.forEach(item => {
      const cat = item.category_name || 'Other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });
    const categoryNames = Object.keys(grouped);
    document.getElementById('restaurant-detail-content').innerHTML = `
      <div class="rest-detail-hero">
        <img src="${r.cover_image || r.image || 'https://images.unsplash.com/photo-1517244683847-7456b63c5969?w=800&h=400&fit=crop'}" 
             alt="${r.name}" onerror="this.src='https://images.unsplash.com/photo-1517244683847-7456b63c5969?w=800&h=400&fit=crop'">
        <div class="rest-detail-hero-overlay">
          <div class="rest-detail-info">
            <button class="btn-back" onclick="showSection('restaurants')" style="color:white;margin-bottom:8px">← Back</button>
            <h1>${r.name}</h1>
            <div class="rest-detail-meta">
              <span>⭐ ${parseFloat(r.rating || 0).toFixed(1)} (${r.review_count || 0} reviews)</span>
              <span>🍽️ ${r.cuisine}</span>
              <span>🕐 ${r.delivery_time}-${parseInt(r.delivery_time) + 15} min</span>
              <span>🚴 Delivery: ${r.delivery_fee == 0 ? 'Free' : fmt(r.delivery_fee)}</span>
              <span>📦 Min: ${fmt(r.min_order)}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="rest-detail-body">
        <div class="rest-detail-layout">
          <div>
            <div class="menu-section">
              <h2 style="margin-bottom:16px">Menu</h2>
              <div class="menu-categories-nav">
                ${categoryNames.map((cat, i) => `<button class="menu-cat-btn ${i === 0 ? 'active' : ''}" onclick="scrollToCategory('${cat}',this)">${cat}</button>`).join('')}
              </div>
              ${categoryNames.map(cat => `
                <div id="cat-${cat.replace(/\s+/g, '-')}" class="menu-category-block">
                  <div class="menu-category-title">${cat}</div>
                  ${grouped[cat].map(item => {
                    const qty = getItemQty(item.id);
                    return `
                    <div class="menu-item" id="menu-item-${item.id}">
                      <img class="menu-item-img" src="${item.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=200&fit=crop'}" 
                           alt="${item.name}" onerror="this.src='https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=200&fit=crop'">
                      <div class="menu-item-info">
                        <div class="menu-item-name">
                          <div class="veg-dot ${item.is_veg ? 'veg' : 'nonveg'}"></div>
                          ${item.name}
                          ${item.is_popular ? '<span class="popular-tag">🔥 Popular</span>' : ''}
                        </div>
                        <div class="menu-item-desc">${item.description || ''}</div>
                        <div class="menu-item-price">${fmt(item.price)}</div>
                      </div>
                      <div class="menu-item-actions">
                        ${qty > 0 ? `
                          <div class="qty-ctrl" id="qty-ctrl-${item.id}">
                            <button class="qty-btn" onclick="updateCartItem(${item.id}, ${qty - 1})">−</button>
                            <span class="qty-num">${qty}</span>
                            <button class="qty-btn" onclick="updateCartItem(${item.id}, ${qty + 1})">+</button>
                          </div>
                        ` : `<button class="add-btn" id="add-btn-${item.id}" onclick="addToCart(${item.id}, ${r.id})">Add +</button>`}
                      </div>
                    </div>`;
                  }).join('')}
                </div>
              `).join('')}
            </div>
            ${r.reviews.length ? `
            <div class="reviews-section">
              <h3 style="margin-bottom:16px">Customer Reviews</h3>
              ${r.reviews.map(rev => `
                <div class="review-item">
                  <div class="review-header">
                    <div style="width:32px;height:32px;border-radius:50%;background:var(--orange);color:white;display:flex;align-items:center;justify-content:center;font-weight:700">${rev.user_name[0]}</div>
                    <span class="review-name">${rev.user_name}</span>
                    <span class="stars">${'⭐'.repeat(rev.rating)}</span>
                    <span style="font-size:11px;color:#999;margin-left:auto">${ago(rev.created_at)}</span>
                  </div>
                  <div class="review-text">${rev.comment || ''}</div>
                </div>
              `).join('')}
            </div>` : ''}
          </div>
          <div>
            <div class="cart-sidebar" id="cart-sidebar">
              <h3>🛒 Your Order</h3>
              ${renderCartSidebar()}
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (e) { toast(e.message, 'error'); }
}

function renderCartSidebar() {
  const items = cartData.items || [];
  if (!items.length) return `<div class="cart-empty-msg"><div class="empty-icon">🛒</div><p>Add items to get started</p></div>`;
  const subtotal = cartData.subtotal || 0;
  const delivery = cartData.delivery_fee || 0;
  const tax = cartData.tax || 0;
  const total = cartData.total || 0;
  return `
    ${items.map(i => `
      <div class="cart-sidebar-item">
        <img class="cart-item-img" src="${i.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=100&h=80&fit=crop'}" 
             onerror="this.src='https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=100&h=80&fit=crop'" alt="${i.name}">
        <div class="cart-item-info">
          <div class="cart-item-name">${i.name}</div>
          <div class="cart-item-price">${i.quantity} × ${fmt(i.price)}</div>
        </div>
        <div style="font-weight:700">${fmt(i.price * i.quantity)}</div>
      </div>
    `).join('')}
    <div class="cart-total-section">
      <div class="cart-total-row"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
      <div class="cart-total-row"><span>Delivery</span><span>${delivery == 0 ? 'Free' : fmt(delivery)}</span></div>
      <div class="cart-total-row"><span>Tax (5%)</span><span>${fmt(tax)}</span></div>
      <div class="cart-total-row final"><span>Total</span><span>${fmt(total)}</span></div>
    </div>
    <button class="checkout-btn" onclick="showSection('cart')">View Cart & Checkout</button>
  `;
}

function scrollToCategory(cat, btn) {
  document.querySelectorAll('.menu-cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const el = document.getElementById('cat-' + cat.replace(/\s+/g, '-'));
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Cart ─────────────────────────────────────────────────────────────────────
async function loadCart() {
  try {
    cartData = await api('GET', '/cart');
    updateCartCount();
  } catch (e) { }
}

function updateCartCount() {
  const cnt = document.getElementById('cart-count');
  if (cnt) cnt.textContent = cartData.count || 0;
}

async function addToCart(menuItemId, restaurantId) {
  try {
    await api('POST', '/cart/add', { menu_item_id: menuItemId, quantity: 1 });
    await loadCart();
    // Update button to qty control
    const btn = document.getElementById(`add-btn-${menuItemId}`);
    if (btn) {
      btn.outerHTML = `<div class="qty-ctrl" id="qty-ctrl-${menuItemId}">
        <button class="qty-btn" onclick="updateCartItem(${menuItemId}, 0)">−</button>
        <span class="qty-num">1</span>
        <button class="qty-btn" onclick="updateCartItem(${menuItemId}, 2)">+</button>
      </div>`;
    }
    const sidebar = document.getElementById('cart-sidebar');
    if (sidebar) sidebar.innerHTML = '<h3>🛒 Your Order</h3>' + renderCartSidebar();
    toast('Added to cart!', 'success');
  } catch (e) {
    if (e.message.includes('DIFFERENT_RESTAURANT')) {
      if (confirm('Your cart has items from another restaurant. Clear cart and add this item?')) {
        await api('DELETE', '/cart/clear');
        await loadCart();
        addToCart(menuItemId, restaurantId);
      }
    } else { toast(e.message, 'error'); }
  }
}

async function updateCartItem(menuItemId, quantity) {
  try {
    await api('PUT', '/cart/update', { menu_item_id: menuItemId, quantity });
    await loadCart();
    // Update qty control
    const ctrl = document.getElementById(`qty-ctrl-${menuItemId}`);
    if (ctrl) {
      if (quantity <= 0) {
        ctrl.outerHTML = `<button class="add-btn" id="add-btn-${menuItemId}" onclick="addToCart(${menuItemId}, ${currentRestaurantId})">Add +</button>`;
      } else {
        ctrl.innerHTML = `
          <button class="qty-btn" onclick="updateCartItem(${menuItemId}, ${quantity - 1})">−</button>
          <span class="qty-num">${quantity}</span>
          <button class="qty-btn" onclick="updateCartItem(${menuItemId}, ${quantity + 1})">+</button>`;
      }
    }
    const sidebar = document.getElementById('cart-sidebar');
    if (sidebar) sidebar.innerHTML = '<h3>🛒 Your Order</h3>' + renderCartSidebar();
  } catch (e) { toast(e.message, 'error'); }
}

function loadCartPage() {
  const el = document.getElementById('cart-content');
  if (!el) return;
  const items = cartData.items || [];
  if (!items.length) {
    el.innerHTML = `<div class="cart-empty" style="grid-column:1/-1">
      <div class="empty-icon">🛒</div>
      <h2>Your cart is empty</h2>
      <p>Add some delicious food to get started!</p>
      <button class="btn-primary" onclick="showSection('restaurants')">Browse Restaurants</button>
    </div>`;
    return;
  }
  el.innerHTML = `
    <div class="cart-items-card">
      <h3 style="margin-bottom:16px">Cart Items (${items.length})</h3>
      ${items.map(i => `
        <div class="cart-page-item">
          <img class="cart-page-img" src="${i.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=150&fit=crop'}" 
               onerror="this.src='https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=150&fit=crop'" alt="${i.name}">
          <div class="cart-page-info">
            <div class="cart-page-name">${i.name}</div>
            <div class="cart-page-rest">from ${i.restaurant_name || ''}</div>
          </div>
          <div class="qty-ctrl">
            <button class="qty-btn" onclick="updateCartItem(${i.menu_item_id}, ${i.quantity - 1});setTimeout(loadCartPage,300)">−</button>
            <span class="qty-num">${i.quantity}</span>
            <button class="qty-btn" onclick="updateCartItem(${i.menu_item_id}, ${i.quantity + 1});setTimeout(loadCartPage,300)">+</button>
          </div>
          <div class="cart-page-price">${fmt(i.price * i.quantity)}</div>
        </div>
      `).join('')}
      <button onclick="clearCart()" style="margin-top:12px;background:none;border:none;color:#ef4444;cursor:pointer;font-size:13px">🗑 Clear Cart</button>
    </div>
    <div class="cart-summary-card">
      <h3>Order Summary</h3>
      <div class="summary-row"><span>Subtotal</span><span>${fmt(cartData.subtotal)}</span></div>
      <div class="summary-row"><span>Delivery Fee</span><span>${cartData.delivery_fee == 0 ? 'Free' : fmt(cartData.delivery_fee)}</span></div>
      <div class="summary-row"><span>Tax (5%)</span><span>${fmt(cartData.tax)}</span></div>
      <div class="summary-row final"><span>Total</span><span>${fmt(cartData.total)}</span></div>
      <button class="btn-checkout" onclick="goToCheckout()">Proceed to Checkout →</button>
      <button class="btn-secondary" style="width:100%;margin-top:10px" onclick="showSection('restaurants')">Add More Items</button>
    </div>
  `;
}

async function clearCart() {
  if (!confirm('Clear entire cart?')) return;
  await api('DELETE', '/cart/clear');
  await loadCart();
  loadCartPage();
}

function goToCheckout() {
  showSection('checkout');
  // Pre-fill address
  if (currentUser?.address) document.getElementById('checkout-address').value = currentUser.address;
  // Render checkout summary
  const items = cartData.items || [];
  document.getElementById('checkout-items').innerHTML = items.map(i => `
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f3f5;font-size:13px">
      <span>${i.name} × ${i.quantity}</span><span style="font-weight:600">${fmt(i.price * i.quantity)}</span>
    </div>
  `).join('');
  document.getElementById('checkout-totals').innerHTML = `
    <div class="summary-row"><span>Subtotal</span><span>${fmt(cartData.subtotal)}</span></div>
    <div class="summary-row"><span>Delivery</span><span>${cartData.delivery_fee == 0 ? 'Free' : fmt(cartData.delivery_fee)}</span></div>
    <div class="summary-row"><span>Tax (5%)</span><span>${fmt(cartData.tax)}</span></div>
    <div class="summary-row final"><span>Total</span><span>${fmt(cartData.total)}</span></div>
  `;
}

// ── Order ─────────────────────────────────────────────────────────────────────
async function placeOrder() {
  const address = document.getElementById('checkout-address').value.trim();
  const payment_method = document.querySelector('input[name="payment"]:checked')?.value || 'cod';
  const notes = document.getElementById('checkout-notes').value.trim();
  if (!address) { toast('Enter delivery address', 'error'); return; }
  if (!cartData.items?.length) { toast('Cart is empty', 'error'); return; }
  const restaurantId = cartData.items[0].restaurant_id;
  const orderItems = cartData.items.map(i => ({ menu_item_id: i.menu_item_id, quantity: i.quantity }));
  try {
    const order = await api('POST', '/orders', {
      restaurant_id: restaurantId, items: orderItems,
      delivery_address: address, payment_method, notes
    });
    await api('DELETE', '/cart/clear');
    await loadCart();
    showOrderSuccess(order);
  } catch (e) { toast(e.message, 'error'); }
}

function showOrderSuccess(order) {
  showSection('order-success');
  document.getElementById('success-order-number').textContent = `Order #${order.order_number}`;
  const steps = [
    { icon: '✅', label: 'Order Placed', desc: 'Your order has been received', status: 'done' },
    { icon: '👨‍🍳', label: 'Preparing', desc: 'Restaurant is cooking your food', status: 'active' },
    { icon: '🛵', label: 'On The Way', desc: 'Rider will pick up shortly', status: '' },
    { icon: '🏠', label: 'Delivered', desc: 'Enjoy your meal!', status: '' }
  ];
  document.getElementById('order-tracking-section').innerHTML = `
    <div class="tracking-steps">
      ${steps.map(s => `
        <div class="track-step">
          <div class="track-icon ${s.status}">${s.icon}</div>
          <div class="track-info"><h4>${s.label}</h4><p>${s.desc}</p></div>
        </div>
      `).join('')}
    </div>
  `;
  if (socket) {
    socket.emit('join_order', order.id);
    socket.on('order_status_update', data => { if (data.orderId === order.id) toast(`Order ${data.status}!`, 'info'); });
  }
}

async function loadOrders() {
  const status = document.getElementById('orders-filter')?.value || '';
  try {
    const data = await api('GET', `/orders?status=${status}&limit=20`);
    const el = document.getElementById('orders-list');
    if (!data.orders.length) {
      el.innerHTML = '<div style="text-align:center;padding:60px;color:#999"><div style="font-size:50px;margin-bottom:12px">📦</div><p>No orders yet</p></div>';
      return;
    }
    el.innerHTML = data.orders.map(o => `
      <div class="order-card" onclick="loadOrderDetail(${o.id})">
        <div class="order-card-top">
          <div>
            <div class="order-number">#${o.order_number}</div>
            <div class="order-date">${fmtDate(o.created_at)}</div>
          </div>
          ${statusBadge(o.status)}
        </div>
        <div class="order-rest">
          <img class="order-rest-img" src="${o.restaurant_image || 'https://images.unsplash.com/photo-1517244683847-7456b63c5969?w=100&h=80&fit=crop'}"
               onerror="this.src='https://images.unsplash.com/photo-1517244683847-7456b63c5969?w=100&h=80&fit=crop'" alt="">
          <div>
            <div class="order-rest-name">${o.restaurant_name}</div>
            <div class="order-items-preview">${o.items?.map(i => i.name).join(', ').slice(0, 60) || ''}${(o.items?.length > 2) ? '...' : ''}</div>
          </div>
        </div>
        <div class="order-card-bottom">
          <span style="font-size:13px;color:#999">${o.items?.length || 0} item${o.items?.length !== 1 ? 's' : ''} · ${o.payment_method?.toUpperCase()}</span>
          <div class="order-total">${fmt(o.total)}</div>
        </div>
      </div>
    `).join('');
  } catch (e) { toast(e.message, 'error'); }
}

async function loadOrderDetail(id) {
  showSection('order-detail');
  try {
    const o = await api('GET', `/orders/${id}`);
    const trackSteps = ['pending', 'confirmed', 'preparing', 'picked_up', 'on_the_way', 'delivered'];
    const currentIdx = trackSteps.indexOf(o.status);
    document.getElementById('order-detail-content').innerHTML = `
      <div style="background:white;border-radius:12px;padding:24px;box-shadow:var(--shadow);margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
          <div><h2 style="font-size:20px">#${o.order_number}</h2><p style="color:#999;font-size:13px">${fmtDate(o.created_at)}</p></div>
          ${statusBadge(o.status)}
        </div>
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px">
          <img src="${o.restaurant_image || 'https://images.unsplash.com/photo-1517244683847-7456b63c5969?w=100&h=80&fit=crop'}" 
               style="width:60px;height:50px;border-radius:8px;object-fit:cover" alt="">
          <div><div style="font-weight:700;font-size:15px">${o.restaurant_name}</div><div style="font-size:12px;color:#999">${o.restaurant_address || ''}</div></div>
        </div>
        <!-- Order Tracking -->
        <div style="margin:20px 0">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            ${trackSteps.map((step, i) => `
              <div style="text-align:center;flex:1">
                <div style="width:36px;height:36px;border-radius:50%;margin:0 auto 4px;display:flex;align-items:center;justify-content:center;font-size:16px;
                  background:${i <= currentIdx ? 'var(--orange)' : '#eee'};color:${i <= currentIdx ? 'white' : '#999'}">
                  ${['📝','✅','👨‍🍳','🛵','🚀','🏠'][i]}
                </div>
                <div style="font-size:10px;color:${i <= currentIdx ? 'var(--orange)' : '#999'};font-weight:600">${step.replace('_', ' ')}</div>
              </div>
              ${i < trackSteps.length - 1 ? `<div style="flex:1;height:2px;background:${i < currentIdx ? 'var(--orange)' : '#eee'};margin-bottom:20px"></div>` : ''}
            `).join('')}
          </div>
        </div>
        <!-- Items -->
        <h3 style="margin-bottom:12px">Items Ordered</h3>
        ${o.items.map(i => `
          <div style="display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid #f1f3f5">
            <img src="${i.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=100&h=80&fit=crop'}" 
                 style="width:55px;height:45px;border-radius:8px;object-fit:cover" onerror="this.src='https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=100&h=80&fit=crop'" alt="">
            <div style="flex:1"><div style="font-weight:600">${i.name}</div><div style="font-size:12px;color:#999">${i.quantity} × ${fmt(i.price)}</div></div>
            <div style="font-weight:700">${fmt(i.price * i.quantity)}</div>
          </div>
        `).join('')}
        <!-- Totals -->
        <div style="margin-top:16px;padding-top:12px;border-top:2px solid #f1f3f5">
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#666"><span>Subtotal</span><span>${fmt(o.subtotal)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#666"><span>Delivery</span><span>${fmt(o.delivery_fee)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#666"><span>Tax</span><span>${fmt(o.tax)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:17px;font-weight:700;border-top:1px solid #eee;margin-top:6px"><span>Total</span><span>${fmt(o.total)}</span></div>
        </div>
        <div style="margin-top:16px;padding:12px;background:#f8f9fa;border-radius:8px;font-size:13px">
          <div><strong>📍 Delivery to:</strong> ${o.delivery_address}</div>
          <div style="margin-top:4px"><strong>💳 Payment:</strong> ${o.payment_method?.toUpperCase()}</div>
        </div>
        ${['pending', 'confirmed'].includes(o.status) ? `<button class="btn-danger btn-sm" onclick="cancelOrder(${o.id})" style="margin-top:12px">Cancel Order</button>` : ''}
      </div>
    `;
  } catch (e) { toast(e.message, 'error'); }
}

async function cancelOrder(id) {
  if (!confirm('Cancel this order?')) return;
  try { await api('PUT', `/orders/${id}/cancel`); toast('Order cancelled', 'info'); loadOrderDetail(id); }
  catch (e) { toast(e.message, 'error'); }
}

// ── Profile ─────────────────────────────────────────────────────────────────────
async function loadProfile() {
  if (!currentUser) return;
  const initials = currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('profile-ava').textContent = initials;
  document.getElementById('profile-name').textContent = currentUser.name;
  document.getElementById('profile-email-display').textContent = currentUser.email;
  document.getElementById('edit-name').value = currentUser.name || '';
  document.getElementById('edit-phone').value = currentUser.phone || '';
  document.getElementById('edit-address').value = currentUser.address || '';
  try {
    const orders = await api('GET', '/orders?limit=100');
    document.getElementById('profile-orders-count').textContent = orders.total || 0;
  } catch (e) { }
}

async function updateProfile() {
  const body = { name: document.getElementById('edit-name').value.trim(), phone: document.getElementById('edit-phone').value.trim(), address: document.getElementById('edit-address').value.trim() };
  try { currentUser = await api('PUT', '/auth/profile', body); updateNavUser(); loadProfile(); toast('Profile updated!', 'success'); }
  catch (e) { toast(e.message, 'error'); }
}

// ── Admin Panel ─────────────────────────────────────────────────────────────────
async function loadAdminPanel() {
  try {
    const stats = await api('GET', '/orders/admin/stats');
    document.getElementById('admin-stats').innerHTML = `
      <div class="admin-stat"><div class="admin-stat-val">${stats.total_orders}</div><div class="admin-stat-label">Total Orders</div></div>
      <div class="admin-stat" style="border-color:var(--green)"><div class="admin-stat-val">₹${parseFloat(stats.total_revenue || 0).toLocaleString()}</div><div class="admin-stat-label">Total Revenue</div></div>
      <div class="admin-stat" style="border-color:var(--yellow)"><div class="admin-stat-val">${stats.pending_orders}</div><div class="admin-stat-label">Pending Orders</div></div>
      <div class="admin-stat" style="border-color:#6366f1"><div class="admin-stat-val">${stats.total_users}</div><div class="admin-stat-label">Customers</div></div>
      <div class="admin-stat" style="border-color:var(--red)"><div class="admin-stat-val">${stats.today_orders}</div><div class="admin-stat-label">Today's Orders</div></div>
      <div class="admin-stat" style="border-color:var(--green)"><div class="admin-stat-val">₹${parseFloat(stats.today_revenue || 0).toLocaleString()}</div><div class="admin-stat-label">Today's Revenue</div></div>
    `;
    loadAdminOrders();
  } catch (e) { toast(e.message, 'error'); }
}

async function loadAdminOrders() {
  const status = document.getElementById('admin-order-filter')?.value || '';
  try {
    const data = await api('GET', `/orders/admin/all?status=${status}&limit=50`);
    document.getElementById('admin-orders-body').innerHTML = data.orders.map(o => `
      <tr>
        <td><strong>${o.order_number}</strong></td>
        <td>${o.customer_name}<br><small style="color:#999">${o.customer_phone || ''}</small></td>
        <td>${o.restaurant_name}</td>
        <td style="font-weight:700">${fmt(o.total)}</td>
        <td>${statusBadge(o.status)}</td>
        <td style="color:#999;font-size:12px">${ago(o.created_at)}</td>
        <td>
          <select class="status-select" onchange="updateOrderStatus(${o.id}, this.value)">
            <option value="">Update Status</option>
            <option value="confirmed">Confirm</option>
            <option value="preparing">Preparing</option>
            <option value="picked_up">Picked Up</option>
            <option value="on_the_way">On The Way</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancel</option>
          </select>
        </td>
      </tr>
    `).join('');
  } catch (e) { toast(e.message, 'error'); }
}

async function updateOrderStatus(orderId, status) {
  if (!status) return;
  try {
    await api('PUT', `/orders/${orderId}/status`, { status });
    toast(`Order ${status}!`, 'success');
    loadAdminOrders();
    if (socket) socket.emit('update_order_status', { orderId, status });
  } catch (e) { toast(e.message, 'error'); }
}

async function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`admin-${tab}-tab`).classList.add('active');
  event.target.classList.add('active');
  if (tab === 'restaurants') loadAdminRestaurants();
  else if (tab === 'menu') loadAdminMenuDropdown();
}

async function loadAdminRestaurants() {
  try {
    const data = await api('GET', '/restaurants?limit=50');
    document.getElementById('admin-restaurants-grid').innerHTML = data.restaurants.map(r => `
      <div class="rest-card">
        <div class="rest-card-img"><img src="${r.image}" alt="${r.name}" onerror="this.src='https://images.unsplash.com/photo-1517244683847-7456b63c5969?w=400&h=300&fit=crop'"></div>
        <div class="rest-card-body">
          <div class="rest-card-top"><div class="rest-name">${r.name}</div><div class="rest-rating">⭐ ${parseFloat(r.rating).toFixed(1)}</div></div>
          <div class="rest-cuisine">${r.cuisine}</div>
          <div style="display:flex;gap:8px;margin-top:10px">
            <button class="btn-primary btn-sm" onclick="editRestaurant(${r.id})">✏️ Edit</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (e) { toast(e.message, 'error'); }
}

async function loadAdminMenuDropdown() {
  try {
    const data = await api('GET', '/restaurants?limit=50');
    const sel = document.getElementById('admin-menu-restaurant');
    sel.innerHTML = '<option value="">Select Restaurant</option>' + data.restaurants.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
  } catch (e) { }
}

async function loadAdminMenu() {
  const restId = document.getElementById('admin-menu-restaurant').value;
  if (!restId) return;
  try {
    const r = await api('GET', `/restaurants/${restId}`);
    document.getElementById('admin-menu-grid').innerHTML = r.menu.map(item => `
      <div class="rest-card">
        <div class="rest-card-img" style="height:140px"><img src="${item.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=200&fit=crop'}" alt="${item.name}" onerror="this.src='https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=200&fit=crop'"></div>
        <div class="rest-card-body" style="padding:12px">
          <div style="display:flex;gap:6px;align-items:center"><div class="veg-dot ${item.is_veg ? 'veg' : 'nonveg'}"></div><strong>${item.name}</strong></div>
          <div style="color:var(--orange);font-weight:700;margin-top:4px">${fmt(item.price)}</div>
          <div style="font-size:11px;color:#999">${item.category_name || ''}</div>
        </div>
      </div>
    `).join('');
  } catch (e) { toast(e.message, 'error'); }
}

function openRestaurantModal(id = null) {
  document.getElementById('rm-id').value = id || '';
  document.getElementById('rest-modal-title').textContent = id ? 'Edit Restaurant' : 'Add Restaurant';
  openModal('restaurant-modal');
}

async function editRestaurant(id) {
  try {
    const r = await api('GET', `/restaurants/${id}`);
    document.getElementById('rm-id').value = r.id;
    document.getElementById('rm-name').value = r.name || '';
    document.getElementById('rm-desc').value = r.description || '';
    document.getElementById('rm-cuisine').value = r.cuisine || '';
    document.getElementById('rm-phone').value = r.phone || '';
    document.getElementById('rm-address').value = r.address || '';
    document.getElementById('rm-image').value = r.image || '';
    document.getElementById('rm-dtime').value = r.delivery_time || 30;
    document.getElementById('rm-dfee').value = r.delivery_fee || 30;
    document.getElementById('rm-minorder').value = r.min_order || 100;
    document.getElementById('rest-modal-title').textContent = 'Edit Restaurant';
    openModal('restaurant-modal');
  } catch (e) { toast(e.message, 'error'); }
}

async function saveRestaurant() {
  const id = document.getElementById('rm-id').value;
  const body = {
    name: document.getElementById('rm-name').value.trim(),
    description: document.getElementById('rm-desc').value.trim(),
    cuisine: document.getElementById('rm-cuisine').value.trim(),
    phone: document.getElementById('rm-phone').value.trim(),
    address: document.getElementById('rm-address').value.trim(),
    image: document.getElementById('rm-image').value.trim(),
    delivery_time: parseInt(document.getElementById('rm-dtime').value),
    delivery_fee: parseFloat(document.getElementById('rm-dfee').value),
    min_order: parseFloat(document.getElementById('rm-minorder').value),
    is_active: 1
  };
  if (!body.name) { toast('Restaurant name required', 'error'); return; }
  try {
    if (id) { await api('PUT', `/restaurants/${id}`, body); toast('Restaurant updated', 'success'); }
    else { await api('POST', '/restaurants', body); toast('Restaurant added', 'success'); }
    closeModal(); loadAdminRestaurants();
  } catch (e) { toast(e.message, 'error'); }
}

function openMenuItemModal() {
  const restId = document.getElementById('admin-menu-restaurant').value;
  if (!restId) { toast('Select a restaurant first', 'error'); return; }
  openModal('menu-modal');
  // Load categories
  api('GET', `/restaurants/${restId}`).then(r => {
    const sel = document.getElementById('mi-category');
    sel.innerHTML = r.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }).catch(() => {});
}

async function saveMenuItem() {
  const restId = document.getElementById('admin-menu-restaurant').value;
  const body = {
    name: document.getElementById('mi-name').value.trim(),
    description: document.getElementById('mi-desc').value.trim(),
    price: parseFloat(document.getElementById('mi-price').value),
    category_id: document.getElementById('mi-category').value || null,
    image: document.getElementById('mi-image').value.trim(),
    is_veg: document.getElementById('mi-veg').checked
  };
  if (!body.name || !body.price) { toast('Name and price required', 'error'); return; }
  try {
    await api('POST', `/restaurants/${restId}/menu`, body);
    toast('Menu item added', 'success');
    closeModal(); loadAdminMenu();
  } catch (e) { toast(e.message, 'error'); }
}

// ── Modals ─────────────────────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById('modal-overlay').classList.add('active');
  document.getElementById(id).classList.add('active');
}
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
}

// ── Pagination ─────────────────────────────────────────────────────────────────
function renderPagination(containerId, current, total, loadFn) {
  const el = document.getElementById(containerId);
  if (!el || total <= 1) { if (el) el.innerHTML = ''; return; }
  let html = '';
  if (current > 1) html += `<button class="pg-btn" onclick="${loadFn.name}(${current - 1})">‹</button>`;
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - current) <= 1) html += `<button class="pg-btn${i === current ? ' active' : ''}" onclick="${loadFn.name}(${i})">${i}</button>`;
    else if (Math.abs(i - current) === 2) html += `<span style="padding:0 4px;color:#999">…</span>`;
  }
  if (current < total) html += `<button class="pg-btn" onclick="${loadFn.name}(${current + 1})">›</button>`;
  el.innerHTML = html;
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
document.addEventListener('click', e => {
  if (!e.target.closest('.user-menu')) {
    document.querySelectorAll('.user-dropdown').forEach(d => d.style.display = '');
  }
});

// ── Bootstrap ─────────────────────────────────────────────────────────────────
initApp();
