/**
 * Peachy Maja — Shopping Cart Management (LocalStorage + Drawer)
 */

const Cart = {
  STORAGE_KEY: 'peachy_maja_cart',

  getItems() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading cart from localStorage', e);
      return [];
    }
  },

  saveItems(items) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
      this.dispatchUpdate();
    } catch (e) {
      console.error('Error saving cart to localStorage', e);
    }
  },

  addItem(product, quantity = 1) {
    const items = this.getItems();
    const existingIndex = items.findIndex(i => i.id === product.id);

    if (existingIndex > -1) {
      items[existingIndex].quantity += quantity;
    } else {
      items.push({
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: parseFloat(product.price),
        image_url: product.image_url,
        serving_size: product.serving_size || '',
        quantity: quantity
      });
    }

    this.saveItems(items);
    if (window.showToast) {
      window.showToast(`Added ${quantity}x "${product.name}" to cart!`, 'success');
    }
    this.openDrawer();
  },

  updateQuantity(productId, quantity) {
    let items = this.getItems();
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }
    const item = items.find(i => i.id === productId);
    if (item) {
      item.quantity = quantity;
      this.saveItems(items);
    }
  },

  removeItem(productId) {
    let items = this.getItems();
    items = items.filter(i => i.id !== productId);
    this.saveItems(items);
    if (window.showToast) {
      window.showToast('Item removed from cart', 'info');
    }
  },

  clearCart() {
    localStorage.removeItem(this.STORAGE_KEY);
    this.dispatchUpdate();
  },

  getTotalCount() {
    const items = this.getItems();
    return items.reduce((sum, item) => sum + item.quantity, 0);
  },

  getSubtotal() {
    const items = this.getItems();
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  },

  dispatchUpdate() {
    const event = new CustomEvent('cart-updated', {
      detail: {
        items: this.getItems(),
        count: this.getTotalCount(),
        subtotal: this.getSubtotal()
      }
    });
    window.dispatchEvent(event);
    this.updateBadges();
    this.renderDrawer();
  },

  updateBadges() {
    const count = this.getTotalCount();
    document.querySelectorAll('.cart-count').forEach(badge => {
      badge.textContent = count;
      badge.classList.add('bump');
      setTimeout(() => badge.classList.remove('bump'), 250);
    });
  },

  openDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (drawer && overlay) {
      drawer.classList.add('open');
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      this.renderDrawer();
    }
  },

  closeDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (drawer && overlay) {
      drawer.classList.remove('open');
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }
  },

  renderDrawer() {
    const body = document.getElementById('cartDrawerBody');
    const footer = document.getElementById('cartDrawerFooter');
    if (!body || !footer) return;

    const items = this.getItems();
    const count = this.getTotalCount();
    const subtotal = this.getSubtotal();

    if (items.length === 0) {
      body.innerHTML = `
        <div class="empty-state" style="padding: 2.5rem 1rem; border: none; background: transparent;">
          <div class="empty-icon" style="font-size: 2.5rem;">🥣</div>
          <div class="empty-title" style="font-size: 1.15rem;">Your cart is empty</div>
          <div class="empty-desc" style="font-size: 0.88rem; margin-bottom: 1.5rem;">
            Craving sweet, freshly-made Maja Blanca? Browse our delicious homemade treats now!
          </div>
          <a href="/shop.html" class="btn btn-primary btn-sm" onclick="Cart.closeDrawer()">Start Shopping</a>
        </div>
      `;
      footer.style.display = 'none';
      return;
    }

    footer.style.display = 'block';
    body.innerHTML = items.map(item => `
      <div class="cart-item" data-id="${item.id}">
        <img src="${item.image_url}" alt="${item.name}" class="cart-item-img" onerror="this.src='/images/classic_maja.jpg'">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">₱${(item.price * item.quantity).toFixed(2)}</div>
          <div class="qty-control" style="margin-top: 6px;">
            <button class="qty-btn" onclick="Cart.updateQuantity(${item.id}, ${item.quantity - 1})" aria-label="Decrease quantity">−</button>
            <span class="qty-val">${item.quantity}</span>
            <button class="qty-btn" onclick="Cart.updateQuantity(${item.id}, ${item.quantity + 1})" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <button class="cart-item-remove" onclick="Cart.removeItem(${item.id})" title="Remove item" aria-label="Remove item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    `).join('');

    const subtotalEl = document.getElementById('cartDrawerSubtotal');
    if (subtotalEl) {
      subtotalEl.textContent = `₱${subtotal.toFixed(2)}`;
    }
  },

  init() {
    this.updateBadges();
    this.renderDrawer();

    // Close on overlay click
    const overlay = document.getElementById('cartOverlay');
    if (overlay) {
      overlay.addEventListener('click', () => this.closeDrawer());
    }

    // Close button
    const closeBtn = document.getElementById('cartCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeDrawer());
    }

    // Toggle button in header
    document.querySelectorAll('.open-cart-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openDrawer();
      });
    });
  }
};

window.Cart = Cart;
document.addEventListener('DOMContentLoaded', () => Cart.init());
