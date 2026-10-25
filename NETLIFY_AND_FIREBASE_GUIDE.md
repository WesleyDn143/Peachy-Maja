# 🚀 How to Publish Peachy Maja on Netlify & Connect Firebase

This guide will show you how to publish your website to **Netlify** (100% free hosting) and connect your **Firebase Realtime Database** so you can receive and manage customer pre-orders in real time.

---

## Part 1: Setting up Firebase Realtime Database (Free & Fast)

1. Open your browser and go to [https://console.firebase.google.com/](https://console.firebase.google.com/).
2. Sign in with your Google account.
3. Click **"Add project"** (e.g. name it `peachy-maja-store`).
4. Click through the setup (you can disable Google Analytics for simplicity).
5. Once your project is ready:
   - In the left sidebar, click **Build** ➜ **Realtime Database**.
   - Click **"Create Database"**.
   - Choose a location (e.g., `Singapore (asia-southeast1)` or `United States`).
   - For security rules, select **"Start in test mode"** (this allows read and write for your pre-orders) ➜ click **Enable**.
6. Register your Web App:
   - Click the **Gear icon (Project settings)** at the top left next to "Project Overview".
   - Scroll down to "Your apps" and click the **Web icon (`</>`)**.
   - Enter App nickname: `Peachy Maja Web` ➜ click **Register app**.
   - You will see a `firebaseConfig` object with:
     ```javascript
     const firebaseConfig = {
       apiKey: "AIzaSy...",
       authDomain: "peachy-maja.firebaseapp.com",
       databaseURL: "https://peachy-maja-default-rtdb.asia-southeast1.firebasedatabase.app",
       projectId: "peachy-maja",
       storageBucket: "peachy-maja.appspot.com",
       messagingSenderId: "...",
       appId: "..."
     };
     ```
7. Open `public/js/firebase-config.js` in your website folder and paste these values into `window.FIREBASE_CONFIG`. Save the file!

*(Note: Even before you paste your Firebase keys, the website has a built-in local persistence bridge, so all pre-orders and the admin panel already work immediately right now!)*

---

## Part 2: Publishing to Netlify (Free Hosting in 1 Minute)

Netlify is the best platform to host this website because it is completely static, fast, and free.

### Method A: Drag & Drop (Easiest — No Git required!)

1. Go to **[https://app.netlify.com/drop](https://app.netlify.com/drop)**.
2. Sign up or log in (free).
3. Drag and drop the **`public`** folder from:
   `c:\Users\Fluyd Potot\Documents\E-Commerce\Website\public`
   directly into the browser window.
4. Netlify will deploy your site in **5 seconds** and give you a live URL like:
   `https://peachy-maja.netlify.app`!
5. In Netlify Site Settings, you can customize the domain name to whatever you like (e.g. `peachy-maja.netlify.app`).

### Method B: Via GitHub

1. Upload this repository to GitHub.
2. In Netlify, click **"Add new site"** ➜ **"Import an existing project"** ➜ select GitHub.
3. Select your repository.
4. Netlify will automatically detect `netlify.toml` and set the publish directory to `public`.
5. Click **"Deploy site"**. Every time you push changes to GitHub, Netlify updates your live site automatically!

---

## Part 3: How to Use the Website

### For Customers:
- **Pre-Order Form:** Customers enter their **Name**, **Phone Number**, choose their quantity of **₱20 Maja Blanca tubs** (e.g., 2 orders = ₱40), choose **Pickup or Delivery**, select date and time, and choose Cash or GCash.
- **Instant Reference & Tracking:** Each pre-order receives an automatic reference number (e.g., `PM-20261025-XXXX`). Customers can track their order status live at `/track.html`.

### For the Owners (Seann Li, Mell Cordevilla, Marlo Tiempo):
- Visit: `/admin.html`
- **Email:** `admin@peachymaja.ph`
- **Password:** `PeachyMaja2026!`
- **Features in Admin Dashboard:**
  - **Live Pre-Orders Feed:** See customer names, contact numbers, order quantities, delivery preferences, and special notes in real time.
  - **Status Updates:** Update status anytime (`Pre-Order Received` ➜ `Confirmed` ➜ `Preparing Batch` ➜ `Ready / Out` ➜ `Completed`).
  - **Custom Customer Notes:** Send direct updates (e.g., *"Your batch is freshly cooked and ready for pickup!"*).
  - **Export to CSV:** One-click button to download the day's pre-orders as an Excel/CSV spreadsheet for batch cooking and packing!
