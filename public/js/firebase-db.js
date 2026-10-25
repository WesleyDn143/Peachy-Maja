/**
 * Peachy Maja — Firebase Realtime Database Data Manager
 * Handles pre-orders, admin authentication, settings, and live tracking.
 */

const DB = {
  dbInstance: null,
  authInstance: null,
  isLive: false,

  init() {
    if (window.isFirebaseConfigured && window.isFirebaseConfigured()) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(window.FIREBASE_CONFIG);
        }
        this.dbInstance = firebase.database();
        this.authInstance = firebase.auth();
        this.isLive = true;
        console.log('🔥 Connected to live Firebase Realtime Database!');
      } catch (err) {
        console.warn('Firebase initialization error, using local fallback:', err);
        this.initLocal();
      }
    } else {
      console.info('ℹ️ Firebase placeholder keys detected. Running in Local Storage Mode (Ready to connect to Firebase anytime).');
      this.initLocal();
    }
  },

  initLocal() {
    this.isLive = false;
    // Seed default settings if empty
    if (!localStorage.getItem('peachy_settings')) {
      const defaultSettings = {
        price_per_order: 15,
        preorders_open: true,
        pickup_location: "Main Kiosk / Booth, Carmen, Davao del Norte",
        gcash_number: "0917-123-4567",
        gcash_name: "Mell C. / Seann L. (Peachy Maja)",
        batch_schedule: "Daily fresh batches cooked every morning! Pickup 10:00 AM - 5:00 PM."
      };
      localStorage.setItem('peachy_settings', JSON.stringify(defaultSettings));
    }

    // Seed sample pre-order if empty
    if (!localStorage.getItem('peachy_preorders')) {
      const sampleOrders = [
        {
          id: 'ord_sample_1',
          orderRef: 'PM-20261025-DEMO',
          customerName: 'Juan dela Cruz',
          customerPhone: '0917-123-4567',
          customerEmail: 'juan@example.com',
          quantity: 5,
          unitPrice: 15,
          totalAmount: 75,
          fulfillmentType: 'pickup',
          preferredDate: 'Tomorrow',
          preferredTime: '11:00 AM - 1:00 PM',
          paymentMethod: 'cash_pickup',
          paymentStatus: 'pending',
          status: 'Pre-Order Received',
          notes: 'Please add extra crispy toasted latik if possible, thank you!',
          createdAt: new Date().toISOString()
        }
      ];
      localStorage.setItem('peachy_preorders', JSON.stringify(sampleOrders));
    }
  },

  // Save a new customer pre-order
  async savePreOrder(order) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderRef = `PM-${dateStr}-${randomChars}`;
    const orderId = `ord_${Date.now()}_${randomChars}`;

    const completeOrder = {
      ...order,
      id: orderId,
      orderRef: orderRef,
      unitPrice: order.unitPrice || 15,
      totalAmount: order.totalAmount || (order.quantity * (order.unitPrice || 15)),
      paymentStatus: order.paymentMethod === 'gcash' ? 'pending_verification' : 'pending',
      status: 'Pre-Order Received',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (this.isLive && this.dbInstance) {
      await this.dbInstance.ref('preorders/' + orderId).set(completeOrder);
    } else {
      const existing = JSON.parse(localStorage.getItem('peachy_preorders') || '[]');
      existing.unshift(completeOrder);
      localStorage.setItem('peachy_preorders', JSON.stringify(existing));
      window.dispatchEvent(new CustomEvent('preorder-added', { detail: completeOrder }));
    }

    return completeOrder;
  },

  // Look up pre-order for tracking (with customer phone verification)
  async getPreOrderByRef(ref, contact) {
    const cleanRef = ref.trim().toUpperCase();
    const cleanContact = contact.trim().toLowerCase().replace(/\D/g, '');

    let allOrders = [];

    if (this.isLive && this.dbInstance) {
      const snapshot = await this.dbInstance.ref('preorders').once('value');
      const val = snapshot.val() || {};
      allOrders = Object.values(val);
    } else {
      allOrders = JSON.parse(localStorage.getItem('peachy_preorders') || '[]');
    }

    const order = allOrders.find(o => o.orderRef && o.orderRef.toUpperCase() === cleanRef);
    if (!order) {
      return { success: false, message: 'No pre-order found with that reference number.' };
    }

    // Verify contact matches phone or email
    const orderPhone = (order.customerPhone || '').replace(/\D/g, '');
    const orderEmail = (order.customerEmail || '').toLowerCase();
    const phoneMatch = cleanContact.length >= 7 && orderPhone.includes(cleanContact);
    const emailMatch = contact.trim().toLowerCase() === orderEmail;

    if (!phoneMatch && !emailMatch) {
      return {
        success: false,
        message: 'Security verification failed. The phone number or email does not match our pre-order records.'
      };
    }

    return { success: true, order };
  },

  // Realtime listener for Admin Dashboard
  listenToPreOrders(callback) {
    if (this.isLive && this.dbInstance) {
      const ref = this.dbInstance.ref('preorders');
      ref.on('value', snapshot => {
        const data = snapshot.val() || {};
        const list = Object.values(data).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        callback(list);
      });
      return () => ref.off();
    } else {
      // Local storage listener
      const emitLocal = () => {
        const list = JSON.parse(localStorage.getItem('peachy_preorders') || '[]');
        callback(list);
      };
      emitLocal();
      const handler = () => emitLocal();
      window.addEventListener('storage', handler);
      window.addEventListener('preorder-added', handler);
      window.addEventListener('preorder-updated', handler);
      return () => {
        window.removeEventListener('storage', handler);
        window.removeEventListener('preorder-added', handler);
        window.removeEventListener('preorder-updated', handler);
      };
    }
  },

  // Admin status updater
  async updatePreOrderStatus(orderId, newStatus, statusNotes = '') {
    if (this.isLive && this.dbInstance) {
      await this.dbInstance.ref(`preorders/${orderId}`).update({
        status: newStatus,
        statusNotes: statusNotes,
        updatedAt: new Date().toISOString()
      });
    } else {
      const list = JSON.parse(localStorage.getItem('peachy_preorders') || '[]');
      const item = list.find(o => o.id === orderId);
      if (item) {
        item.status = newStatus;
        if (statusNotes !== undefined) item.statusNotes = statusNotes;
        item.updatedAt = new Date().toISOString();
        localStorage.setItem('peachy_preorders', JSON.stringify(list));
        window.dispatchEvent(new CustomEvent('preorder-updated'));
      }
    }
  },

  // Admin delete pre-order
  async deletePreOrder(orderId) {
    if (this.isLive && this.dbInstance) {
      await this.dbInstance.ref(`preorders/${orderId}`).remove();
    } else {
      let list = JSON.parse(localStorage.getItem('peachy_preorders') || '[]');
      list = list.filter(o => o.id !== orderId);
      localStorage.setItem('peachy_preorders', JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('preorder-updated'));
    }
  },

  // Get Store Settings
  async getSettings() {
    if (this.isLive && this.dbInstance) {
      const snapshot = await this.dbInstance.ref('settings').once('value');
      return snapshot.val() || {
        price_per_order: 15,
        preorders_open: true,
        pickup_location: "Main Kiosk / Booth, Carmen, Davao del Norte",
        gcash_number: "0917-123-4567",
        gcash_name: "Mell C. / Seann L. (Peachy Maja)"
      };
    } else {
      return JSON.parse(localStorage.getItem('peachy_settings') || '{}');
    }
  },

  // Save Store Settings
  async saveSettings(settings) {
    if (this.isLive && this.dbInstance) {
      await this.dbInstance.ref('settings').set(settings);
    } else {
      localStorage.setItem('peachy_settings', JSON.stringify(settings));
    }
  },

  // Admin Authentication
  async adminLogin(email, password) {
    // 1. If Firebase Auth is live, attempt Firebase sign-in
    if (this.isLive && this.authInstance) {
      try {
        const userCredential = await this.authInstance.signInWithEmailAndPassword(email, password);
        return { success: true, user: userCredential.user };
      } catch (err) {
        // Fallback check master credentials
        if (email.trim().toLowerCase() === 'admin@peachymaja.ph' && password === 'PeachyMaja2026!') {
          return {
            success: true,
            user: { email: 'admin@peachymaja.ph', displayName: 'Peachy Maja Owners (Seann, Mell, Marlo)' }
          };
        }
        return { success: false, message: err.message };
      }
    }

    // 2. Default Authorized Admin Credentials
    if (email.trim().toLowerCase() === 'admin@peachymaja.ph' && password === 'PeachyMaja2026!') {
      return {
        success: true,
        user: { email: 'admin@peachymaja.ph', displayName: 'Peachy Maja Owners (Seann, Mell, Marlo)' }
      };
    }

    return { success: false, message: 'Invalid administrator email or password.' };
  }
};

// Initialize DB on script load
document.addEventListener('DOMContentLoaded', () => DB.init());
window.DB = DB;
