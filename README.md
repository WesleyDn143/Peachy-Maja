# 🍑 Peachy Maja — Full E-Commerce Website

A modern, responsive, customer-facing e-commerce web application for **Peachy Maja**, a student-owned Maja Blanca dessert business founded by **Seann Li**, **Mell Cordevilla**, and **Marlo Tiempo** in Cebu City, Philippines.

---

## 🎨 Brand Identity & Design System

- **Primary Peach:** `#FFA45B`
- **Soft Peach:** `#FFD2B0`
- **Light Peach:** `#FFF0E5`
- **White Background:** `#FFFFFF`
- **Dark Brown Typography:** `#603719`
- **Orange Accent:** `#D95B16`
- **Typography:** Plus Jakarta Sans (Google Fonts)
- **Authentic Imagery:** Real Maja Blanca dessert photography garnished with toasted coconut latik and savory cheddar cheese.
- **Logos:** Integrated original [Peachy_Maja_Logo.png](file:///c:/Users/Fluyd%20Potot/Documents/E-Commerce/Website/public/Peachy_Maja_Logo.png) and [favicon.ico](file:///c:/Users/Fluyd%20Potot/Documents/E-Commerce/Website/public/favicon.ico).

---

## 🚀 Quick Start Guide

### 1. Start the Server
Run the application using Node.js:

```bash
npm start
# or
npm run dev
```

The application will start at:
👉 **http://localhost:3000**

---

## 🔐 Default Administrator Credentials

To access the protected **Admin Management Dashboard**:
- **URL:** [http://localhost:3000/admin.html](http://localhost:3000/admin.html)
- **Email:** `admin@peachymaja.ph`
- **Password:** `PeachyMaja2026!`

---

## 🌟 Key Features & Capabilities

### 1. Customer Storefront
- **Hero Section:** Headline *"A Little Sweetness in Every Bite!"*, authentic Maja Blanca showcase, and direct calls-to-action.
- **Featured Menu:** Classic Maja Blanca (₱50), Special Maja Blanca (₱70), and Family-Size Tray (₱150).
- **Product Details Quick-View Modal:** Complete ingredient transparency, allergen notices, serving size, shelf life, and storage instructions.
- **Interactive Cart Drawer & Page:** Real-time quantity adjustments, badge counters, and LocalStorage persistence.

### 2. Search, Filter & Catalog
- **Search:** Live keyword search across product names and descriptions.
- **Category Filter:** Filter by *All*, *Individual*, or *Family & Sharing*.
- **Sorting:** Sort by price (low-to-high, high-to-low) and alphabetical name.

### 3. Server-Validated Checkout
- **Customer Information:** Name, mobile number, and optional email for order updates.
- **Fulfillment Choice:** Campus / Kiosk Pickup (Free) or Local Delivery (+₱40 flat rate).
- **Payment Methods:** Cash on Pickup, Cash on Delivery (COD), or GCash with payment details (`0917-123-4567`).
- **Data Integrity:** Order calculations are strictly verified on the backend using trusted database prices; client prices are never trusted.
- **Unique Reference Generation:** Generates tamper-proof order codes (e.g., `PM-20261025-XXXX`).

### 4. Real-Time Order Tracking
- **URL:** [http://localhost:3000/track.html](http://localhost:3000/track.html)
- **Privacy Verification:** Requires both the Order Reference Number and matching phone/email.
- **Live Stepper Status:**
  1. `Order Received`
  2. `Confirmed`
  3. `Preparing`
  4. `Ready for Pickup or Out for Delivery`
  5. `Completed` (or `Cancelled`)
- **Itemized Receipt:** Displays items, quantities, subtotal, delivery fee, total, and owner status updates. Includes a printable receipt view.

### 5. Customer Inquiries & Contact
- **URL:** [http://localhost:3000/contact.html](http://localhost:3000/contact.html)
- Direct contact inquiry form that saves submissions to the SQLite database.
- Campus pickup point details, business hours, and FAQ accordion.

### 6. Customer Accounts
- **URL:** [http://localhost:3000/account.html](http://localhost:3000/account.html)
- Customer registration and login.
- "My Orders" order history view. Guest checkout remains available without forcing registration.

### 7. Protected Admin Management
- **URL:** [http://localhost:3000/admin.html](http://localhost:3000/admin.html)
- **Live Business Stats:** Total orders, pending orders, completed orders, total revenue, and unread inquiries.
- **Order Management:** Filter and search orders, view complete customer details, and update fulfillment status with custom customer notes.
- **Product Management:** Add new products, update prices, upload product photos, edit ingredients, and toggle availability.
- **Inquiry Management:** Read customer questions and mark them as replied or archived.
- **Store Configuration:** Adjust delivery fee, campus pickup point, GCash account details, and business hours.

---

## 🗄️ Database Architecture (`peachy_maja.db`)

An embedded SQLite database using `better-sqlite3`:
- `products`: Menu items, categories, prices, stock, ingredients, allergens, shelf life, and images.
- `orders`: Order references, customer contact, fulfillment choice, totals, payment method, and live status.
- `order_items`: Line items linked to orders with product snapshot pricing.
- `inquiries`: Customer contact messages and reply statuses.
- `users`: Registered customers and administrators with bcrypt-hashed passwords.
- `settings`: Configurable store settings (delivery fee, GCash details, pickup point).

---

## 📁 Project Directory Structure

```
Website/
├── Peachy_Maja_Logo.png       # Original brand logo
├── Peachy_Maja_Logo.ico       # Favicon
├── peachy_maja.db             # Persistent SQLite database
├── package.json               # Dependencies and run scripts
├── test_suite.js              # Automated integration tests
├── server/
│   ├── db.js                  # Database schema & seeder
│   └── server.js              # Express REST API & static server
└── public/
    ├── index.html             # Homepage
    ├── shop.html              # Catalog & Search
    ├── cart.html              # Shopping Cart
    ├── checkout.html          # Order Checkout
    ├── track.html             # Customer Order Tracking
    ├── about.html             # About Founders & Story
    ├── contact.html           # Inquiries & FAQs
    ├── account.html           # Customer Portal & Auth
    ├── admin.html             # Protected Admin Dashboard
    ├── css/
    │   └── styles.css         # Responsive Vanilla CSS design system
    ├── js/
    │   ├── app.js             # Core UI, notifications & mobile drawer
    │   ├── firebase-config.js # Firebase credentials & connection
    │   └── firebase-db.js     # Realtime database operations
    └── images/                # Authentic Maja Blanca photography
        ├── hero_maja.png
        ├── classic_maja.png
        └── classic_maja_without_background.png
```
