const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'peachy_maja.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

function initDatabase() {
  // Products table
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Individual',
      description TEXT NOT NULL,
      price REAL NOT NULL,
      image_url TEXT NOT NULL,
      is_available INTEGER NOT NULL DEFAULT 1,
      stock_quantity INTEGER NOT NULL DEFAULT 50,
      serving_size TEXT,
      ingredients TEXT,
      allergens TEXT,
      shelf_life TEXT,
      storage_instructions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_ref TEXT UNIQUE NOT NULL,
      customer_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT,
      fulfillment_type TEXT NOT NULL,
      delivery_address TEXT,
      delivery_notes TEXT,
      subtotal REAL NOT NULL,
      delivery_fee REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'pending',
      status TEXT NOT NULL DEFAULT 'Order Received',
      status_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      unit_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_info TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'unread',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Seed default settings
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get().count;
  if (settingsCount === 0) {
    const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    insertSetting.run('delivery_fee', '40');
    insertSetting.run('pickup_location', 'Campus Student Pavilion / Main Gate, Cebu City');
    insertSetting.run('gcash_number', '0917-123-4567');
    insertSetting.run('gcash_name', 'Mell C. / Seann L. (Peachy Maja)');
    insertSetting.run('business_hours', 'Monday – Saturday: 9:00 AM – 6:00 PM (Closed Sundays)');
    insertSetting.run('contact_phone', '+63 917 123 4567');
    insertSetting.run('contact_email', 'orders@peachymaja.ph');
    insertSetting.run('store_status', 'open');
  }

  // Seed default admin user
  const adminUser = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@peachymaja.ph');
  if (!adminUser) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('PeachyMaja2026!', salt);
    db.prepare(`
      INSERT INTO users (name, email, phone, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'Peachy Maja Team (Seann, Mell, Marlo)',
      'admin@peachymaja.ph',
      '+63 917 123 4567',
      hash,
      'admin'
    );
    console.log('Default admin seeded: admin@peachymaja.ph / PeachyMaja2026!');
  }

  // Seed default products
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (productCount === 0) {
    const insertProduct = db.prepare(`
      INSERT INTO products (
        slug, name, category, description, price, image_url, is_available,
        stock_quantity, serving_size, ingredients, allergens, shelf_life, storage_instructions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertProduct.run(
      'classic-maja-blanca',
      'Classic Maja Blanca',
      'Individual',
      'Our signature homemade coconut pudding with sweet golden corn kernels, topped with freshly prepared crispy latik.',
      50.00,
      '/images/classic_maja.jpg',
      1,
      45,
      '1 Single-Serve Slice / Tub (~180g)',
      'Pure coconut milk, sweet corn kernels, sugar, cornstarch, water, toasted coconut latik.',
      'Contains coconut. Prepared in a home kitchen that handles dairy.',
      '3 to 4 days refrigerated.',
      'Keep chilled in an airtight container.'
    );

    insertProduct.run(
      'special-maja-blanca',
      'Special Maja Blanca',
      'Individual',
      'A rich, savory-sweet delight. Creamy corn coconut pudding generously crowned with savory grated cheddar cheese and crunchy coconut latik.',
      70.00,
      '/images/special_maja.jpg',
      1,
      35,
      '1 Single-Serve Slice / Tub (~200g)',
      'Pure coconut milk, sweet corn kernels, cheddar cheese, sugar, cornstarch, evaporated milk, toasted coconut latik.',
      'Contains dairy (cheddar cheese, milk) and coconut.',
      '2 to 3 days refrigerated.',
      'Keep refrigerated at all times to preserve cheese freshness.'
    );

    insertProduct.run(
      'family-size-maja-blanca',
      'Family-Size Maja Blanca',
      'Sharing',
      'Perfect for family get-togethers, celebrations, and sharing with friends! A generous party tray topped with golden latik and grated cheese.',
      150.00,
      '/images/family_maja.jpg',
      1,
      20,
      'Party Tray (6–8 Servings, ~800g)',
      'Pure coconut milk, whole sweet corn kernels, cheddar cheese, sugar, cornstarch, evaporated milk, toasted coconut latik.',
      'Contains dairy and coconut.',
      '3 to 4 days refrigerated.',
      'Keep chilled in aluminum tray or sealed container.'
    );

    console.log('Initial sample products seeded successfully.');
  }
}

initDatabase();

module.exports = db;
