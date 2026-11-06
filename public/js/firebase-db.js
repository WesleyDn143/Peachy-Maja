/**
 * Peachy Maja — Firebase Realtime Database Data Manager
 * Handles pre-orders, admin authentication, settings, and live tracking.
 */

const DB = {
  dbInstance: null,
  authInstance: null,
  isLive: false,

  init() {
    if (this._initialized) return;
    if (window.isFirebaseConfigured && window.isFirebaseConfigured()) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(window.FIREBASE_CONFIG);
        }
        this.dbInstance = firebase.database();
        if (typeof firebase.auth === 'function') {
          try {
            this.authInstance = firebase.auth();
          } catch (e) {
            console.warn('Firebase auth instance warning:', e);
          }
        }
        this.isLive = true;
        this._initialized = true;
        console.log('🔥 Connected to live Firebase Realtime Database!');

        // Purge any legacy sample Unsplash photos from Firebase RTDB gallery
        this.dbInstance.ref('gallery').once('value').then(snap => {
          const data = snap.val();
          if (data) {
            Object.keys(data).forEach(k => {
              if (data[k].imageUrl && data[k].imageUrl.includes('unsplash.com')) {
                this.dbInstance.ref('gallery/' + k).remove();
              }
            });
          }
        }).catch(() => {});

        // Purge legacy sample photos from local cache
        try {
          const cachedGal = JSON.parse(localStorage.getItem('peachy_gallery') || '[]');
          if (Array.isArray(cachedGal) && cachedGal.some(item => item.imageUrl && item.imageUrl.includes('unsplash.com'))) {
            localStorage.removeItem('peachy_gallery');
          }
        } catch (e) {}

        window.dispatchEvent(new CustomEvent('peachy-db-ready', { detail: { isLive: true } }));
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
        pickup_location: "Purok 1 Barangay Asuncion, Carmen, Davao del Norte",
        gcash_number: "09292467993",
        gcash_name: "WE***Y SE**N L.",
        batch_schedule: "Daily fresh batches cooked every morning! Pickup 10:00 AM - 5:00 PM."
      };
      localStorage.setItem('peachy_settings', JSON.stringify(defaultSettings));
    }

    // Seed default stock (24 pcs) if empty
    if (!localStorage.getItem('peachy_stock')) {
      const defaultStock = {
        initial_stock: 24,
        last_updated: new Date().toISOString()
      };
      localStorage.setItem('peachy_stock', JSON.stringify(defaultStock));
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
          status: 'Order Received',
          notes: 'Please add extra crispy toasted latik if possible, thank you!',
          createdAt: new Date().toISOString()
        }
      ];
      localStorage.setItem('peachy_preorders', JSON.stringify(sampleOrders));
    }

    // Seed default reviews if empty
    if (!localStorage.getItem('peachy_reviews')) {
      const sampleReviews = [
        {
          id: 'rev_1',
          customerName: 'Bea Alcantara',
          rating: 5,
          comment: 'Super creamy and authentic! The toasted coconut latik on top gives it the perfect crunch. 10/10 will definitely order again!',
          orderRef: 'PM-20261025-BEA1',
          createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
        },
        {
          id: 'rev_2',
          customerName: 'Mark Anthony V.',
          rating: 5,
          comment: 'The sweetness is just right and not overwhelming. Ordered 5 tubs for our family merienda and everyone loved it.',
          orderRef: 'PM-20261023-MRK2',
          createdAt: new Date(Date.now() - 4 * 86400000).toISOString()
        },
        {
          id: 'rev_3',
          customerName: 'Jessa Mae C.',
          rating: 5,
          comment: 'Only ₱15 each for fresh homemade Maja Blanca is such a steal! Fresh coconut aroma, silky smooth, and clean packaging.',
          orderRef: 'PM-20261020-JES3',
          createdAt: new Date(Date.now() - 7 * 86400000).toISOString()
        }
      ];
      localStorage.setItem('peachy_reviews', JSON.stringify(sampleReviews));
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
      status: 'Order Received',
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
      return { success: false, message: 'No order found with that reference number.' };
    }

    // Verify contact matches phone or email
    const orderPhone = (order.customerPhone || '').replace(/\D/g, '');
    const orderEmail = (order.customerEmail || '').toLowerCase();
    const phoneMatch = cleanContact.length >= 7 && orderPhone.includes(cleanContact);
    const emailMatch = contact.trim().toLowerCase() === orderEmail;

    if (!phoneMatch && !emailMatch) {
      return {
        success: false,
        message: 'Security verification failed. The phone number or email does not match our order records.'
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

  // Save Customer Review
  async saveReview(review) {
    const revId = 'rev_' + Date.now();
    const completeReview = {
      ...review,
      id: revId,
      rating: Math.max(1, Math.min(5, parseInt(review.rating, 10) || 5)),
      customerName: review.customerName || 'Happy Customer',
      comment: review.comment || '',
      orderRef: review.orderRef || '',
      createdAt: new Date().toISOString()
    };

    if (this.isLive && this.dbInstance) {
      await this.dbInstance.ref('reviews/' + revId).set(completeReview);
    } else {
      const list = JSON.parse(localStorage.getItem('peachy_reviews') || '[]');
      list.unshift(completeReview);
      localStorage.setItem('peachy_reviews', JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('reviews-updated', { detail: list }));
    }

    return completeReview;
  },

  // Realtime Listener for Customer Reviews
  listenToReviews(callback) {
    if (this.isLive && this.dbInstance) {
      const ref = this.dbInstance.ref('reviews');
      ref.on('value', (snap) => {
        const val = snap.val();
        if (!val) {
          // If live reviews empty, provide fallback
          const local = JSON.parse(localStorage.getItem('peachy_reviews') || '[]');
          callback(local);
          return;
        }
        const list = Object.keys(val).map(k => ({ id: k, ...val[k] }));
        list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        callback(list);
      });
    } else {
      const emit = () => {
        const list = JSON.parse(localStorage.getItem('peachy_reviews') || '[]');
        callback(list);
      };
      emit();
      const handler = () => emit();
      window.addEventListener('reviews-updated', handler);
      return () => window.removeEventListener('reviews-updated', handler);
    }
  },

  // Admin delete review
  async deleteReview(reviewId) {
    if (this.isLive && this.dbInstance) {
      await this.dbInstance.ref(`reviews/${reviewId}`).remove();
    } else {
      let list = JSON.parse(localStorage.getItem('peachy_reviews') || '[]');
      list = list.filter(r => r.id !== reviewId);
      localStorage.setItem('peachy_reviews', JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('reviews-updated', { detail: list }));
    }
  },

  // Save Customer Gallery Item (Satisfied Customers - Pictures Only to Firebase Realtime Database)
  async saveGalleryItem(item) {
    const galId = 'gal_' + Date.now();
    const completeItem = {
      id: galId,
      imageUrl: item.imageUrl || '/images/classic_maja.png',
      createdAt: new Date().toISOString()
    };

    if (this.isLive && this.dbInstance) {
      await this.dbInstance.ref('gallery/' + galId).set(completeItem);
    }
    const list = (JSON.parse(localStorage.getItem('peachy_gallery') || '[]'))
      .filter(i => i && i.imageUrl && !i.imageUrl.includes('unsplash.com'));
    list.unshift(completeItem);
    localStorage.setItem('peachy_gallery', JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('gallery-updated', { detail: list }));

    return completeItem;
  },

  // Realtime Listener for Customer Gallery (Direct from Firebase Realtime Database)
  listenToGallery(callback) {
    if (!this._initialized) this.init();

    // 1. Immediate local cache emit so UI renders instantaneously without blank flash
    const cached = (JSON.parse(localStorage.getItem('peachy_gallery') || '[]'))
      .filter(item => item && item.imageUrl && !item.imageUrl.includes('unsplash.com'));
    if (cached.length > 0) {
      callback(cached);
    }

    const attachFirebaseListener = () => {
      if (this.isLive && this.dbInstance) {
        const ref = this.dbInstance.ref('gallery');
        ref.on('value', (snap) => {
          const val = snap.val();
          if (!val) {
            localStorage.removeItem('peachy_gallery');
            callback([]);
            return;
          }
          // Extract real pictures from Firebase RTDB and filter out any legacy stock URLs
          const list = Object.keys(val)
            .map(k => ({ id: k, ...val[k] }))
            .filter(item => item && item.imageUrl && !item.imageUrl.includes('unsplash.com'));
          list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          localStorage.setItem('peachy_gallery', JSON.stringify(list));
          callback(list);
        }, (err) => {
          console.warn('Firebase gallery read error:', err);
          callback(cached);
        });
        return true;
      }
      return false;
    };

    if (!attachFirebaseListener()) {
      // Retry connecting if DB is initializing
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (attachFirebaseListener() || attempts >= 30) {
          clearInterval(interval);
        }
      }, 100);

      window.addEventListener('peachy-db-ready', () => attachFirebaseListener());

      const emit = () => {
        const list = (JSON.parse(localStorage.getItem('peachy_gallery') || '[]'))
          .filter(item => item && item.imageUrl && !item.imageUrl.includes('unsplash.com'));
        callback(list);
      };
      const handler = () => emit();
      window.addEventListener('gallery-updated', handler);
      return () => window.removeEventListener('gallery-updated', handler);
    }
  },

  // Admin delete gallery item
  async deleteGalleryItem(itemId) {
    if (this.isLive && this.dbInstance) {
      await this.dbInstance.ref(`gallery/${itemId}`).remove();
    }
    let list = JSON.parse(localStorage.getItem('peachy_gallery') || '[]');
    list = list.filter(g => g.id !== itemId);
    localStorage.setItem('peachy_gallery', JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('gallery-updated', { detail: list }));
  },

  // Get Store Settings
  async getSettings() {
    if (this.isLive && this.dbInstance) {
      try {
        const snapshot = await this.dbInstance.ref('settings').once('value');
        const val = snapshot.val();
        if (val) return val;
      } catch (e) {
        console.warn('Error reading settings from Firebase:', e);
      }
    }
    const local = localStorage.getItem('peachy_settings');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return {
      price_per_order: 15,
      preorders_open: true,
      pickup_location: "Purok 1 Barangay Asuncion, Carmen, Davao del Norte",
      gcash_number: "09292467993",
      gcash_name: "WE***Y SE**N L.",
      batch_schedule: "Daily fresh batches cooked every morning! Pickup 10:00 AM - 5:00 PM."
    };
  },

  // Save Store Settings (syncs to localStorage + Firebase)
  async saveSettings(settings) {
    localStorage.setItem('peachy_settings', JSON.stringify(settings));
    if (this.isLive && this.dbInstance) {
      await this.dbInstance.ref('settings').set(settings);
    }
    window.dispatchEvent(new CustomEvent('settings-updated', { detail: settings }));
  },

  // Realtime Listener for Store Settings (used across customer pages & admin)
  listenToSettings(callback) {
    // 1. Initial cached or default values
    let current = null;
    try {
      current = JSON.parse(localStorage.getItem('peachy_settings') || 'null');
    } catch (e) {}

    const defaults = {
      price_per_order: 15,
      preorders_open: true,
      pickup_location: "Purok 1 Barangay Asuncion, Carmen, Davao del Norte",
      gcash_number: "09292467993",
      gcash_name: "WE***Y SE**N L.",
      batch_schedule: "Daily fresh batches cooked every morning! Pickup 10:00 AM - 5:00 PM."
    };

    callback(current || defaults);

    // 2. Realtime listener if Firebase is connected
    if (this.isLive && this.dbInstance) {
      this.dbInstance.ref('settings').on('value', (snap) => {
        const data = snap.val();
        if (data) {
          localStorage.setItem('peachy_settings', JSON.stringify(data));
          callback(data);
        }
      });
    }

    // 3. Local custom event listener
    window.addEventListener('settings-updated', (e) => {
      if (e.detail) callback(e.detail);
    });
  },

  // Get Stock Data
  async getStock() {
    if (this.isLive && this.dbInstance) {
      try {
        const snap = await this.dbInstance.ref('stock').once('value');
        const val = snap.val();
        if (val) return val;
      } catch (e) {
        console.warn('Error reading stock from Firebase:', e);
      }
    }
    const local = localStorage.getItem('peachy_stock');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return {
      initial_stock: 24,
      last_updated: new Date().toISOString()
    };
  },

  // Save Stock Data
  async saveStock(stockData) {
    localStorage.setItem('peachy_stock', JSON.stringify(stockData));
    if (this.isLive && this.dbInstance) {
      try {
        await this.dbInstance.ref('stock').set(stockData);
      } catch (e) {
        console.warn('Firebase saveStock error:', e);
      }
    }
    window.dispatchEvent(new CustomEvent('stock-updated', { detail: stockData }));
  },

  // Realtime Stock Listener
  listenToStock(callback) {
    let current = null;
    try {
      current = JSON.parse(localStorage.getItem('peachy_stock') || 'null');
    } catch (e) {}

    const defaults = {
      initial_stock: 24,
      last_updated: new Date().toISOString()
    };
    callback(current || defaults);

    if (this.isLive && this.dbInstance) {
      this.dbInstance.ref('stock').on('value', (snap) => {
        const val = snap.val();
        if (val) {
          localStorage.setItem('peachy_stock', JSON.stringify(val));
          callback(val);
        }
      });
    }

    window.addEventListener('stock-updated', (e) => {
      if (e.detail) callback(e.detail);
    });
  },

  // Full Database Backup
  async getFullBackup() {
    const backup = {
      backupDate: new Date().toISOString(),
      version: '1.0',
      source: 'Peachy Maja E-Commerce Database',
      data: {
        preorders: {},
        settings: {},
        stock: {},
        inquiries: {},
        reviews: {},
        gallery: {}
      }
    };

    if (this.isLive && this.dbInstance) {
      try {
        const [ordersSnap, settingsSnap, stockSnap, inqSnap, revSnap, galSnap] = await Promise.all([
          this.dbInstance.ref('preorders').once('value'),
          this.dbInstance.ref('settings').once('value'),
          this.dbInstance.ref('stock').once('value'),
          this.dbInstance.ref('inquiries').once('value'),
          this.dbInstance.ref('reviews').once('value'),
          this.dbInstance.ref('gallery').once('value')
        ]);
        backup.data.preorders = ordersSnap.val() || {};
        backup.data.settings = settingsSnap.val() || {};
        backup.data.stock = stockSnap.val() || {};
        backup.data.inquiries = inqSnap.val() || {};
        backup.data.reviews = revSnap.val() || {};
        backup.data.gallery = galSnap.val() || {};
      } catch (err) {
        console.warn('Firebase full backup failed, reading local storage:', err);
      }
    }

    // Ensure fallback data if empty
    if (!backup.data.preorders || Object.keys(backup.data.preorders).length === 0) {
      const localOrders = JSON.parse(localStorage.getItem('peachy_preorders') || '[]');
      backup.data.preorders = localOrders;
    }
    if (!backup.data.settings || Object.keys(backup.data.settings).length === 0) {
      backup.data.settings = JSON.parse(localStorage.getItem('peachy_settings') || '{}');
    }
    if (!backup.data.stock || Object.keys(backup.data.stock).length === 0) {
      backup.data.stock = JSON.parse(localStorage.getItem('peachy_stock') || '{"initial_stock":24}');
    }
    if (!backup.data.reviews || Object.keys(backup.data.reviews).length === 0) {
      backup.data.reviews = JSON.parse(localStorage.getItem('peachy_reviews') || '[]');
    }
    if (!backup.data.gallery || Object.keys(backup.data.gallery).length === 0) {
      backup.data.gallery = JSON.parse(localStorage.getItem('peachy_gallery') || '[]');
    }

    return backup;
  },

  // Restore Database Backup
  async restoreDatabase(backupPayload) {
    if (!backupPayload || !backupPayload.data) {
      throw new Error('Invalid backup file format. Expected "data" property.');
    }
    const data = backupPayload.data;

    // 1. Restore local storage
    if (data.preorders) {
      const ordersArray = Array.isArray(data.preorders)
        ? data.preorders
        : Object.keys(data.preorders).map(k => ({ id: k, ...data.preorders[k] }));
      localStorage.setItem('peachy_preorders', JSON.stringify(ordersArray));
      window.dispatchEvent(new CustomEvent('preorders-updated', { detail: ordersArray }));
    }
    if (data.settings) {
      localStorage.setItem('peachy_settings', JSON.stringify(data.settings));
      window.dispatchEvent(new CustomEvent('settings-updated', { detail: data.settings }));
    }
    if (data.stock) {
      localStorage.setItem('peachy_stock', JSON.stringify(data.stock));
      window.dispatchEvent(new CustomEvent('stock-updated', { detail: data.stock }));
    }
    if (data.reviews) {
      const revArray = Array.isArray(data.reviews)
        ? data.reviews
        : Object.keys(data.reviews).map(k => ({ id: k, ...data.reviews[k] }));
      localStorage.setItem('peachy_reviews', JSON.stringify(revArray));
      window.dispatchEvent(new CustomEvent('reviews-updated', { detail: revArray }));
    }
    if (data.gallery) {
      const galArray = Array.isArray(data.gallery)
        ? data.gallery
        : Object.keys(data.gallery).map(k => ({ id: k, ...data.gallery[k] }));
      localStorage.setItem('peachy_gallery', JSON.stringify(galArray));
      window.dispatchEvent(new CustomEvent('gallery-updated', { detail: galArray }));
    }

    // 2. Restore to Firebase if live
    if (this.isLive && this.dbInstance) {
      const promises = [];
      if (data.preorders) {
        promises.push(this.dbInstance.ref('preorders').set(data.preorders));
      }
      if (data.settings) {
        promises.push(this.dbInstance.ref('settings').set(data.settings));
      }
      if (data.stock) {
        promises.push(this.dbInstance.ref('stock').set(data.stock));
      }
      if (data.inquiries) {
        promises.push(this.dbInstance.ref('inquiries').set(data.inquiries));
      }
      if (data.reviews) {
        promises.push(this.dbInstance.ref('reviews').set(data.reviews));
      }
      if (data.gallery) {
        promises.push(this.dbInstance.ref('gallery').set(data.gallery));
      }
      await Promise.all(promises);
    }

    return { success: true };
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

// Initialize DB immediately on script parse as well as DOMContentLoaded fallback
try { DB.init(); } catch (e) {}
document.addEventListener('DOMContentLoaded', () => DB.init());
window.DB = DB;
