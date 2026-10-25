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

// Active Navigation Highlight & ScrollSpy
function initNavHighlight() {
  const preorderSection = document.getElementById('preorderSection');
  const homeLinks = document.querySelectorAll('a[href="/"], a[href="/index.html"]');
  const orderLinks = document.querySelectorAll('a[href="#preorderSection"], a[href="/#preorderSection"]');

  function setOrderActive(isOrder) {
    if (isOrder) {
      homeLinks.forEach(l => l.classList.remove('active'));
      orderLinks.forEach(l => {
        if (l.classList.contains('nav-link') || l.classList.contains('mobile-nav-link')) {
          l.classList.add('active');
        }
      });
    } else {
      orderLinks.forEach(l => l.classList.remove('active'));
      homeLinks.forEach(l => {
        if (l.classList.contains('nav-link') || l.classList.contains('mobile-nav-link')) {
          l.classList.add('active');
        }
      });
    }
  }

  // Check initial hash
  if (window.location.hash === '#preorderSection') {
    setOrderActive(true);
  }

  // ScrollSpy on homepage
  if (preorderSection) {
    window.addEventListener('scroll', () => {
      const rect = preorderSection.getBoundingClientRect();
      if (rect.top <= 250 && rect.bottom >= 200) {
        setOrderActive(true);
      } else if (window.scrollY < 200) {
        setOrderActive(false);
      }
    }, { passive: true });
  }

  // Click handler for Order links
  orderLinks.forEach(l => {
    l.addEventListener('click', () => {
      setOrderActive(true);
    });
  });

  // Click handler for Home links
  homeLinks.forEach(l => {
    l.addEventListener('click', () => {
      setOrderActive(false);
    });
  });
}

// Mobile Hamburger Navigation & DOM Init
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

  initNavHighlight();
});
