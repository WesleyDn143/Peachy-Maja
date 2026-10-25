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
});
