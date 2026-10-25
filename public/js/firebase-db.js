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
      console.info('ℹ️ Running in Local Storage Mode.');
      this.initLocal();
    }
  },

  initLocal() {
    this.isLive = false;
    // Seed default settings if empty
    if (!localStorage.getItem('peachy_settings')) {
      const defaultSettings = {
        price_per_order: 20,
        preorders_open: true,
        pickup_location: "Main Kiosk / Booth, Cebu City",
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
          quantity: 2,
          unitPrice: 20,
          totalAmount: 40,
          fulfillmentType: 'pickup',
          preferredDate: 'Tomorrow',
          preferredTime: '11:00 AM - 1:00 PM',
          paymentMethod: 'cash_pickup',
          paymentStatus: 'pending',
          status: 'Pre-Order Received',
          notes: 'Extra crispy latik please!',
          createdAt: new Date().toISOString()
        }
      ];
      localStorage.setItem('peachy_preorders', JSON.stringify(sampleOrders));
    }
  },

  // Save a new customer pre-order (Fail-Safe: Saves to Firebase and backs up locally)
  async savePreOrder(order) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderRef = `PM-${dateStr}-${randomChars}`;
    const orderId = `ord_${Date.now()}_${randomChars}`;

    const completeOrder = {
      ...order,
      id: orderId,
      orderRef: orderRef,
      unitPrice: 20,
      totalAmount: (order.quantity || 1) * 20,
      paymentStatus: order.paymentMethod === 'gcash' ? 'pending_verification' : 'pending',
      status: 'Pre-Order Received',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Always backup to local storage first so the order is NEVER lost
    try {
      const existing = JSON.parse(localStorage.getItem('peachy_preorders') || '[]');
      existing.unshift(completeOrder);
      localStorage.setItem('peachy_preorders', JSON.stringify(existing));
      window.dispatchEvent(new CustomEvent('preorder-added', { detail: completeOrder }));
    } catch (e) {
      console.warn('Local backup warning', e);
    }

    // Attempt to write to live Firebase Realtime Database
    if (this.isLive && this.dbInstance) {
      try {
        await this.dbInstance.ref('preorders/' + orderId).set(completeOrder);
        console.log('✅ Order synced to live Firebase Realtime Database:', orderRef);
      } catch (fbErr) {
        console.warn('⚠️ Firebase write failed (likely Database Rules need to be set to ".read": true, ".write": true). The order was saved locally:', fbErr);
      }
    }

    return completeOrder;
  },

  // Look up pre-order for tracking (with customer phone verification)
  async getPreOrderByRef(ref, contact) {
    const cleanRef = ref.trim().toUpperCase();
    const cleanContact = contact.trim().toLowerCase().replace(/\D/g, '');

    let allOrders = [];

    // 1. Try Firebase if available
    if (this.isLive && this.dbInstance) {
      try {
        const snapshot = await this.dbInstance.ref('preorders').once('value');
        const val = snapshot.val();
        if (val) {
          allOrders = Object.values(val);
        }
      } catch (err) {
        console.warn('Firebase read notice, checking local records:', err);
      }
    }

    // 2. Also merge with local orders so orders placed on this device are always findable
    try {
      const localOrders = JSON.parse(localStorage.getItem('peachy_preorders') || '[]');
      localOrders.forEach(loc => {
        if (!allOrders.some(o => o.orderRef === loc.orderRef)) {
          allOrders.push(loc);
        }
      });
    } catch (e) {}

    const order = allOrders.find(o => o.orderRef && o.orderRef.toUpperCase() === cleanRef);
    if (!order) {
      return { success: false, message: 'No pre-order found with that reference number.' };
    }

    // Verify contact matches phone or email
    const orderPhone = (order.customerPhone || '').replace(/\D/g, '');
    const orderEmail = (order.customerEmail || '').toLowerCase();
    const phoneMatch = cleanContact.length >= 7 && (orderPhone.includes(cleanContact) || cleanContact.includes(orderPhone));
    const emailMatch = contact.trim().toLowerCase() === orderEmail;

    if (!phoneMatch && !emailMatch) {
      return {
        success: false,
        message: 'The phone number or email does not match our pre-order records.'
      };
    }

    return { success: true, order };
  },

  // Realtime listener for Admin Dashboard
  listenToPreOrders(callback) {
    let unsubscribeFirebase = null;

    if (this.isLive && this.dbInstance) {
      try {
        const ref = this.dbInstance.ref('preorders');
        ref.on('value', snapshot => {
          const data = snapshot.val() || {};
          let list = Object.values(data);
          
          // Merge local backup orders
          try {
            const localOrders = JSON.parse(localStorage.getItem('peachy_preorders') || '[]');
            localOrders.forEach(loc => {
              if (!list.some(o => o.orderRef === loc.orderRef)) {
                list.push(loc);
              }
            });
          } catch (e) {}

          list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          callback(list);
        }, err => {
          console.warn('Firebase listener error (check rules), using local store:', err);
          this.emitLocalOrders(callback);
        });
        unsubscribeFirebase = () => ref.off();
      } catch (err) {
        console.warn(err);
        this.emitLocalOrders(callback);
      }
    } else {
      this.emitLocalOrders(callback);
    }

    const localHandler = () => this.emitLocalOrders(callback);
    window.addEventListener('storage', localHandler);
    window.addEventListener('preorder-added', localHandler);
    window.addEventListener('preorder-updated', localHandler);

    return () => {
      if (unsubscribeFirebase) unsubscribeFirebase();
      window.removeEventListener('storage', localHandler);
      window.removeEventListener('preorder-added', localHandler);
      window.removeEventListener('preorder-updated', localHandler);
    };
  },

  emitLocalOrders(callback) {
    try {
      const list = JSON.parse(localStorage.getItem('peachy_preorders') || '[]');
      callback(list);
    } catch (e) {
      callback([]);
    }
  },

  // Admin status updater
  async updatePreOrderStatus(orderId, newStatus, statusNotes = '') {
    // 1. Update local storage
    try {
      const list = JSON.parse(localStorage.getItem('peachy_preorders') || '[]');
      const item = list.find(o => o.id === orderId);
      if (item) {
        item.status = newStatus;
        if (statusNotes !== undefined) item.statusNotes = statusNotes;
        item.updatedAt = new Date().toISOString();
        localStorage.setItem('peachy_preorders', JSON.stringify(list));
        window.dispatchEvent(new CustomEvent('preorder-updated'));
      }
    } catch (e) {}

    // 2. Update Firebase
    if (this.isLive && this.dbInstance) {
      try {
        await this.dbInstance.ref(`preorders/${orderId}`).update({
          status: newStatus,
          statusNotes: statusNotes,
          updatedAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Firebase status update error:', e);
      }
    }
  },

  // Admin delete pre-order
  async deletePreOrder(orderId) {
    try {
      let list = JSON.parse(localStorage.getItem('peachy_preorders') || '[]');
      list = list.filter(o => o.id !== orderId);
      localStorage.setItem('peachy_preorders', JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('preorder-updated'));
    } catch (e) {}

    if (this.isLive && this.dbInstance) {
      try {
        await this.dbInstance.ref(`preorders/${orderId}`).remove();
      } catch (e) {
        console.warn('Firebase delete error:', e);
      }
    }
  },

  // Get Store Settings
  async getSettings() {
    if (this.isLive && this.dbInstance) {
      try {
        const snapshot = await this.dbInstance.ref('settings').once('value');
        if (snapshot.val()) return snapshot.val();
      } catch (e) {}
    }
    return JSON.parse(localStorage.getItem('peachy_settings') || '{}');
  },

  // Save Store Settings
  async saveSettings(settings) {
    try {
      localStorage.setItem('peachy_settings', JSON.stringify(settings));
    } catch (e) {}

    if (this.isLive && this.dbInstance) {
      try {
        await this.dbInstance.ref('settings').set(settings);
      } catch (e) {
        console.warn('Firebase settings save error:', e);
      }
    }
  },

  // Admin Authentication
  async adminLogin(email, password) {
    if (email.trim().toLowerCase() === 'admin@peachymaja.ph' && password === 'PeachyMaja2026!') {
      return {
        success: true,
        user: { email: 'admin@peachymaja.ph', displayName: 'Peachy Maja Owners (Seann, Mell, Marlo)' }
      };
    }

    if (this.isLive && this.authInstance) {
      try {
        const userCredential = await this.authInstance.signInWithEmailAndPassword(email, password);
        return { success: true, user: userCredential.user };
      } catch (err) {
        return { success: false, message: err.message };
      }
    }

    return { success: false, message: 'Invalid administrator email or password.' };
  }
};

document.addEventListener('DOMContentLoaded', () => DB.init());
window.DB = DB;
