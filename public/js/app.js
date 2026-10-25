/**
 * Peachy Maja — Core Client App Functionality
 */

// Toast Notifications System
window.showToast = function(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' 
    ? '✨' 
    : type === 'error' 
      ? '⚠️' 
      : 'ℹ️';

  toast.innerHTML = `
    <span style="font-size: 1.2rem;">${icon}</span>
    <span style="flex: 1;">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.3s reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
};

// Global Quick View Product Modal
window.openProductModal = async function(identifier) {
  try {
    const res = await fetch(`/api/products/${identifier}`);
    const data = await res.json();
    if (!data.success || !data.product) {
      window.showToast('Could not load product details.', 'error');
      return;
    }

    const p = data.product;
    const modal = document.getElementById('productQuickModal');
    if (!modal) return;

    document.getElementById('modalProductImg').src = p.image_url;
    document.getElementById('modalProductImg').alt = p.name;
    document.getElementById('modalProductCategory').textContent = p.category;
    document.getElementById('modalProductName').textContent = p.name;
    document.getElementById('modalProductPrice').textContent = `₱${p.price.toFixed(2)}`;
    document.getElementById('modalProductDesc').textContent = p.description;

    document.getElementById('modalServingSize').textContent = p.serving_size || 'Single Serving';
    document.getElementById('modalIngredients').textContent = p.ingredients || 'Fresh coconut milk, corn, sugar, latik.';
    document.getElementById('modalAllergens').textContent = p.allergens || 'Contains coconut.';
    document.getElementById('modalShelfLife').textContent = p.shelf_life || '3–4 days chilled.';
    document.getElementById('modalStorage').textContent = p.storage_instructions || 'Keep refrigerated.';

    const availBadge = document.getElementById('modalAvailBadge');
    const addToCartBtn = document.getElementById('modalAddToCartBtn');
    const qtyInput = document.getElementById('modalQty');
    if (qtyInput) qtyInput.value = 1;

    if (p.is_available) {
      availBadge.textContent = 'In Stock & Fresh';
      availBadge.className = 'badge-tag available';
      addToCartBtn.disabled = false;
      addToCartBtn.textContent = 'Add to Cart';
    } else {
      availBadge.textContent = 'Temporarily Sold Out';
      availBadge.className = 'badge-tag unavailable';
      addToCartBtn.disabled = true;
      addToCartBtn.textContent = 'Sold Out';
    }

    addToCartBtn.onclick = () => {
      const q = parseInt(document.getElementById('modalQty').value, 10) || 1;
      Cart.addItem(p, q);
      closeProductModal();
    };

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  } catch (err) {
    console.error('Error opening product modal', err);
    window.showToast('Failed to load product information', 'error');
  }
};

window.closeProductModal = function() {
  const modal = document.getElementById('productQuickModal');
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
};

// Auth and User State in Navbar
function updateNavUserStatus() {
  const token = localStorage.getItem('peachy_token');
  const userJson = localStorage.getItem('peachy_user');
  const navUserBtn = document.getElementById('navUserBtn');
  const mobileUserLink = document.getElementById('mobileUserLink');

  if (token && userJson) {
    try {
      const user = JSON.parse(userJson);
      const isSuperAdmin = user.role === 'admin';
      const label = isSuperAdmin ? 'Admin Dashboard' : `Hi, ${user.name.split(' ')[0]}`;
      const link = isSuperAdmin ? '/admin.html' : '/account.html';

      if (navUserBtn) {
        navUserBtn.href = link;
        navUserBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          <span>${label}</span>
        `;
      }
      if (mobileUserLink) {
        mobileUserLink.href = link;
        mobileUserLink.textContent = label;
      }
    } catch (e) {
      console.error(e);
    }
  }
}

// Mobile Hamburger Navigation
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('hamburgerBtn');
  const mobileNav = document.getElementById('mobileNav');

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileNav.classList.toggle('open');
    });

    // Close mobile nav when clicking a link
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileNav.classList.remove('open');
      });
    });
  }

  // Close modals on escape key or backdrop click
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeProductModal();
      if (window.Cart) Cart.closeDrawer();
    }
  });

  const modalOverlay = document.getElementById('productQuickModal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeProductModal();
    });
  }

  updateNavUserStatus();
});
