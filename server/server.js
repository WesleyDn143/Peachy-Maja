const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'peachy_maja_secret_key_2026_seann_mell_marlo';

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'public', 'images', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration for product uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'product-' + uniqueSuffix + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are permitted.'));
  }
});

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, '..', 'public')));

// Helper to generate reference numbers
function generateOrderRef() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomStr = '';
  for (let i = 0; i < 4; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `PM-${dateStr}-${randomStr}`;
}

// Authentication Middlewares
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) req.user = null;
    else req.user = decoded;
    next();
  });
}

function requireAuth(req, res, next) {
  authenticateToken(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    }
    next();
  });
}

function requireAdmin(req, res, next) {
  authenticateToken(req, res, () => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied: Administrator privileges required.' });
    }
    next();
  });
}

// ==========================================
// 1. PUBLIC SETTINGS API
// ==========================================
app.get('/api/settings', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve settings', error: err.message });
  }
});

// ==========================================
// 2. PRODUCTS API
// ==========================================
app.get('/api/products', (req, res) => {
  try {
    const { category, search, sort, available_only } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (available_only === 'true') {
      query += ' AND is_available = 1';
    }

    if (category && category !== 'All') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (sort === 'price_asc') {
      query += ' ORDER BY price ASC';
    } else if (sort === 'price_desc') {
      query += ' ORDER BY price DESC';
    } else if (sort === 'name_asc') {
      query += ' ORDER BY name ASC';
    } else {
      query += ' ORDER BY id ASC';
    }

    const products = db.prepare(query).all(...params);
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve products', error: err.message });
  }
});

app.get('/api/products/:identifier', (req, res) => {
  try {
    const { identifier } = req.params;
    let product;
    if (!isNaN(identifier)) {
      product = db.prepare('SELECT * FROM products WHERE id = ?').get(identifier);
    } else {
      product = db.prepare('SELECT * FROM products WHERE slug = ?').get(identifier);
    }

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving product', error: err.message });
  }
});

// Admin Product Upload Image
app.post('/api/admin/upload-image', requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image file uploaded' });
  }
  const imageUrl = `/images/uploads/${req.file.filename}`;
  res.json({ success: true, imageUrl });
});

// Admin Create Product
app.post('/api/admin/products', requireAdmin, (req, res) => {
  try {
    const {
      name, category, description, price, image_url,
      is_available, stock_quantity, serving_size,
      ingredients, allergens, shelf_life, storage_instructions
    } = req.body;

    if (!name || price === undefined || !image_url) {
      return res.status(400).json({ success: false, message: 'Product name, price, and image are required.' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now();

    const stmt = db.prepare(`
      INSERT INTO products (
        slug, name, category, description, price, image_url,
        is_available, stock_quantity, serving_size, ingredients,
        allergens, shelf_life, storage_instructions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      slug,
      name.trim(),
      category || 'Individual',
      description ? description.trim() : '',
      parseFloat(price),
      image_url.trim(),
      is_available !== undefined ? (is_available ? 1 : 0) : 1,
      stock_quantity ? parseInt(stock_quantity) : 50,
      serving_size ? serving_size.trim() : '',
      ingredients ? ingredients.trim() : '',
      allergens ? allergens.trim() : '',
      shelf_life ? shelf_life.trim() : '',
      storage_instructions ? storage_instructions.trim() : ''
    );

    res.json({ success: true, message: 'Product created successfully', productId: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create product', error: err.message });
  }
});

// Admin Update Product
app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, category, description, price, image_url,
      is_available, stock_quantity, serving_size,
      ingredients, allergens, shelf_life, storage_instructions
    } = req.body;

    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const stmt = db.prepare(`
      UPDATE products SET
        name = ?, category = ?, description = ?, price = ?, image_url = ?,
        is_available = ?, stock_quantity = ?, serving_size = ?,
        ingredients = ?, allergens = ?, shelf_life = ?, storage_instructions = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      name !== undefined ? name.trim() : existing.name,
      category !== undefined ? category : existing.category,
      description !== undefined ? description.trim() : existing.description,
      price !== undefined ? parseFloat(price) : existing.price,
      image_url !== undefined ? image_url.trim() : existing.image_url,
      is_available !== undefined ? (is_available ? 1 : 0) : existing.is_available,
      stock_quantity !== undefined ? parseInt(stock_quantity) : existing.stock_quantity,
      serving_size !== undefined ? serving_size.trim() : existing.serving_size,
      ingredients !== undefined ? ingredients.trim() : existing.ingredients,
      allergens !== undefined ? allergens.trim() : existing.allergens,
      shelf_life !== undefined ? shelf_life.trim() : existing.shelf_life,
      storage_instructions !== undefined ? storage_instructions.trim() : existing.storage_instructions,
      id
    );

    res.json({ success: true, message: 'Product updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update product', error: err.message });
  }
});

// Admin Delete Product
app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM products WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete product', error: err.message });
  }
});

// ==========================================
// 3. ORDER CREATION & TRACKING API
// ==========================================

// Place an order (Public / Guest / Logged in)
app.post('/api/orders', authenticateToken, (req, res) => {
  try {
    const {
      customer_name,
      customer_phone,
      customer_email,
      fulfillment_type,
      delivery_address,
      delivery_notes,
      payment_method,
      items
    } = req.body;

    // Validation
    if (!customer_name || !customer_name.trim()) {
      return res.status(400).json({ success: false, message: 'Customer name is required.' });
    }
    if (!customer_phone || !customer_phone.trim()) {
      return res.status(400).json({ success: false, message: 'Customer phone number is required.' });
    }
    if (!fulfillment_type || !['pickup', 'delivery'].includes(fulfillment_type)) {
      return res.status(400).json({ success: false, message: 'Please select a valid fulfillment method (pickup or delivery).' });
    }
    if (fulfillment_type === 'delivery' && (!delivery_address || !delivery_address.trim())) {
      return res.status(400).json({ success: false, message: 'Delivery address is required for delivery orders.' });
    }
    if (!payment_method || !['cash_pickup', 'cash_delivery', 'gcash'].includes(payment_method)) {
      return res.status(400).json({ success: false, message: 'Please select a valid payment option.' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must contain at least one item.' });
    }

    // Server-side calculation and price verification
    let calculatedSubtotal = 0;
    const validatedItems = [];

    const getProductStmt = db.prepare('SELECT id, name, price, is_available, stock_quantity FROM products WHERE id = ?');

    for (const item of items) {
      const product = getProductStmt.get(item.product_id || item.id);
      if (!product) {
        return res.status(400).json({ success: false, message: `Product with ID ${item.product_id || item.id} no longer exists.` });
      }
      if (!product.is_available) {
        return res.status(400).json({ success: false, message: `Product "${product.name}" is currently unavailable.` });
      }
      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ success: false, message: `Invalid quantity for product "${product.name}".` });
      }

      const itemSubtotal = product.price * qty;
      calculatedSubtotal += itemSubtotal;

      validatedItems.push({
        product_id: product.id,
        product_name: product.name,
        unit_price: product.price,
        quantity: qty,
        subtotal: itemSubtotal
      });
    }

    // Get verified delivery fee
    let deliveryFee = 0;
    if (fulfillment_type === 'delivery') {
      const feeRow = db.prepare('SELECT value FROM settings WHERE key = "delivery_fee"').get();
      deliveryFee = feeRow ? parseFloat(feeRow.value) : 40.0;
    }

    const totalAmount = calculatedSubtotal + deliveryFee;
    const orderRef = generateOrderRef();
    const customerId = req.user ? req.user.id : null;

    // Use a transaction to reliably insert order and items
    const placeOrderTransaction = db.transaction(() => {
      const orderStmt = db.prepare(`
        INSERT INTO orders (
          order_ref, customer_id, customer_name, customer_phone, customer_email,
          fulfillment_type, delivery_address, delivery_notes,
          subtotal, delivery_fee, total_amount,
          payment_method, payment_status, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const orderResult = orderStmt.run(
        orderRef,
        customerId,
        customer_name.trim(),
        customer_phone.trim(),
        customer_email ? customer_email.trim() : null,
        fulfillment_type,
        delivery_address ? delivery_address.trim() : null,
        delivery_notes ? delivery_notes.trim() : null,
        calculatedSubtotal,
        deliveryFee,
        totalAmount,
        payment_method,
        payment_method === 'gcash' ? 'pending_verification' : 'pending',
        'Order Received'
      );

      const orderId = orderResult.lastInsertRowid;

      const itemStmt = db.prepare(`
        INSERT INTO order_items (
          order_id, product_id, product_name, unit_price, quantity, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const vItem of validatedItems) {
        itemStmt.run(
          orderId,
          vItem.product_id,
          vItem.product_name,
          vItem.unit_price,
          vItem.quantity,
          vItem.subtotal
        );
      }

      return { orderId, orderRef, totalAmount };
    });

    const result = placeOrderTransaction();

    res.json({
      success: true,
      message: 'Order placed and saved successfully!',
      orderRef: result.orderRef,
      orderId: result.orderId,
      subtotal: calculatedSubtotal,
      deliveryFee,
      totalAmount
    });
  } catch (err) {
    console.error('Order placement error:', err);
    res.status(500).json({ success: false, message: 'Failed to process order', error: err.message });
  }
});

// Secure Order Tracking Lookup
app.get('/api/orders/track', (req, res) => {
  try {
    const { ref, contact } = req.query;

    if (!ref || !ref.trim()) {
      return res.status(400).json({ success: false, message: 'Order reference number is required.' });
    }
    if (!contact || !contact.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide the customer phone number or email used during checkout for security verification.' });
    }

    const cleanRef = ref.trim().toUpperCase();
    const cleanContact = contact.trim().toLowerCase();

    // Look up order matching ref and verification contact
    const order = db.prepare(`
      SELECT
        id, order_ref, customer_name, customer_phone, customer_email,
        fulfillment_type, delivery_address, delivery_notes,
        subtotal, delivery_fee, total_amount,
        payment_method, payment_status, status, status_notes,
        created_at, updated_at
      FROM orders
      WHERE UPPER(order_ref) = ?
    `).get(cleanRef);

    if (!order) {
      return res.status(404).json({ success: false, message: 'No order found with that reference number. Please check the reference code and try again.' });
    }

    // Security check: verify contact matches phone or email
    const orderPhone = (order.customer_phone || '').replace(/\D/g, '');
    const searchPhone = cleanContact.replace(/\D/g, '');
    const emailMatches = order.customer_email && order.customer_email.toLowerCase() === cleanContact;
    const phoneMatches = searchPhone.length >= 7 && orderPhone.includes(searchPhone);

    if (!emailMatches && !phoneMatches) {
      return res.status(403).json({
        success: false,
        message: 'Security verification failed. The phone number or email does not match our records for this order.'
      });
    }

    // Retrieve order items
    const items = db.prepare(`
      SELECT oi.*, p.image_url
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `).all(order.id);

    // Mask phone number for privacy display
    const maskedPhone = order.customer_phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2');

    res.json({
      success: true,
      order: {
        ...order,
        customer_phone_masked: maskedPhone,
        items
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve order tracking information', error: err.message });
  }
});

// Customer's own orders (when logged in)
app.get('/api/customer/orders', requireAuth, (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT * FROM orders
      WHERE customer_id = ? OR LOWER(customer_email) = LOWER(?)
      ORDER BY id DESC
    `).all(req.user.id, req.user.email);

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch customer orders', error: err.message });
  }
});

// ==========================================
// 4. CONTACT & INQUIRIES API
// ==========================================
app.post('/api/contact', (req, res) => {
  try {
    const { name, contact_info, subject, message } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide your name.' });
    }
    if (!contact_info || !contact_info.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide an email or phone number where we can reply.' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message content cannot be blank.' });
    }

    const stmt = db.prepare(`
      INSERT INTO inquiries (name, contact_info, subject, message)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(name.trim(), contact_info.trim(), subject ? subject.trim() : 'General Inquiry', message.trim());

    res.json({
      success: true,
      message: 'Thank you! Your message has been saved and sent to the Peachy Maja team. We will get back to you soon.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to submit inquiry', error: err.message });
  }
});

// ==========================================
// 5. AUTHENTICATION (Customer & Admin)
// ==========================================
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const stmt = db.prepare(`
      INSERT INTO users (name, email, phone, password_hash, role)
      VALUES (?, ?, ?, ?, 'customer')
    `);

    const result = stmt.run(name.trim(), email.trim().toLowerCase(), phone ? phone.trim() : null, passwordHash);

    const user = {
      id: result.lastInsertRowid,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: 'customer'
    };

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

    res.json({ success: true, message: 'Account registered successfully!', user, token });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Registration failed', error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: payload
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login failed', error: err.message });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

// ==========================================
// 6. PROTECTED ADMIN DASHBOARD API
// ==========================================
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  try {
    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
    const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status NOT IN ('Completed', 'Cancelled')").get().count;
    const completedOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'Completed'").get().count;
    const totalRevenue = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status != 'Cancelled'").get().total;
    const totalInquiries = db.prepare("SELECT COUNT(*) as count FROM inquiries WHERE status = 'unread'").get().count;
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;

    res.json({
      success: true,
      stats: {
        totalOrders,
        pendingOrders,
        completedOrders,
        totalRevenue,
        totalInquiries,
        totalProducts
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch admin statistics', error: err.message });
  }
});

app.get('/api/admin/orders', requireAdmin, (req, res) => {
  try {
    const { status, search } = req.query;
    let query = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (status && status !== 'All') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (order_ref LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY id DESC';

    const orders = db.prepare(query).all(...params);

    // Fetch items for each order
    const getItemsStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
    const ordersWithItems = orders.map(order => ({
      ...order,
      items: getItemsStmt.all(order.id)
    }));

    res.json({ success: true, orders: ordersWithItems });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders', error: err.message });
  }
});

app.patch('/api/admin/orders/:id/status', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { status, payment_status, status_notes } = req.body;

    const validStatuses = [
      'Order Received',
      'Confirmed',
      'Preparing',
      'Ready for Pickup or Out for Delivery',
      'Completed',
      'Cancelled'
    ];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid order status specified.' });
    }

    const currentOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!currentOrder) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const stmt = db.prepare(`
      UPDATE orders SET
        status = COALESCE(?, status),
        payment_status = COALESCE(?, payment_status),
        status_notes = COALESCE(?, status_notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(status || null, payment_status || null, status_notes || null, id);

    res.json({ success: true, message: 'Order status updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update order status', error: err.message });
  }
});

app.get('/api/admin/inquiries', requireAdmin, (req, res) => {
  try {
    const inquiries = db.prepare('SELECT * FROM inquiries ORDER BY id DESC').all();
    res.json({ success: true, inquiries });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch inquiries', error: err.message });
  }
});

app.patch('/api/admin/inquiries/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    db.prepare('UPDATE inquiries SET status = ? WHERE id = ?').run(status || 'read', id);
    res.json({ success: true, message: 'Inquiry updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update inquiry', error: err.message });
  }
});

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  try {
    const settings = req.body;
    const updateStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

    const updateTx = db.transaction(() => {
      for (const [key, val] of Object.entries(settings)) {
        updateStmt.run(key, String(val));
      }
    });

    updateTx();
    res.json({ success: true, message: 'Settings updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update settings', error: err.message });
  }
});

// Fallback route to serve index.html for unknown frontend routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🍑 Peachy Maja Server running at http://localhost:${PORT}`);
  console.log(`🍑 Default Admin: admin@peachymaja.ph / PeachyMaja2026!`);
  console.log(`===============================================`);
});
