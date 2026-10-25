// Comprehensive Automated Integration Test Suite for Peachy Maja

async function runTests() {
  const BASE_URL = 'http://localhost:3000';
  console.log('--- Starting Peachy Maja End-to-End API & Flow Tests ---');

  // Test 1: Fetch Settings
  console.log('\n[1/9] Testing GET /api/settings...');
  const resSettings = await fetch(`${BASE_URL}/api/settings`);
  const settingsData = await resSettings.json();
  if (settingsData.success && settingsData.settings.delivery_fee) {
    console.log('✅ Settings retrieved successfully:', settingsData.settings);
  } else {
    throw new Error('Failed to fetch settings: ' + JSON.stringify(settingsData));
  }

  // Test 2: Fetch Products
  console.log('\n[2/9] Testing GET /api/products...');
  const resProducts = await fetch(`${BASE_URL}/api/products`);
  const productsData = await resProducts.json();
  if (productsData.success && productsData.products.length >= 3) {
    console.log(`✅ Retrieved ${productsData.products.length} products:`);
    productsData.products.forEach(p => {
      console.log(`   - ${p.name}: ₱${p.price.toFixed(2)} [Category: ${p.category}, In Stock: ${p.is_available}]`);
    });
  } else {
    throw new Error('Products verification failed: ' + JSON.stringify(productsData));
  }

  // Test 3: Place Order (Campus Pickup, Cash on Pickup)
  console.log('\n[3/9] Testing POST /api/orders (Placing a real order)...');
  const classicItem = productsData.products.find(p => p.slug === 'classic-maja-blanca');
  const specialItem = productsData.products.find(p => p.slug === 'special-maja-blanca');

  const orderPayload = {
    customer_name: 'Juan dela Cruz',
    customer_phone: '0917-123-4567',
    customer_email: 'juan.delacruz@example.ph',
    fulfillment_type: 'pickup',
    payment_method: 'cash_pickup',
    items: [
      { id: classicItem.id, quantity: 2 },
      { id: specialItem.id, quantity: 1 }
    ]
  };

  const resOrder = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderPayload)
  });
  const orderData = await resOrder.json();
  if (!orderData.success || !orderData.orderRef) {
    throw new Error('Order creation failed: ' + JSON.stringify(orderData));
  }
  console.log(`✅ Order placed and saved in SQLite database!`);
  console.log(`   Ref: ${orderData.orderRef}, ID: ${orderData.orderId}, Subtotal: ₱${orderData.subtotal}, Delivery: ₱${orderData.deliveryFee}, Total: ₱${orderData.totalAmount}`);

  // Test 4: Track Order with Security Verification
  console.log('\n[4/9] Testing GET /api/orders/track...');
  // 4a: Valid track request
  const resTrackValid = await fetch(`${BASE_URL}/api/orders/track?ref=${encodeURIComponent(orderData.orderRef)}&contact=09171234567`);
  const trackValidData = await resTrackValid.json();
  if (trackValidData.success && trackValidData.order.order_ref === orderData.orderRef) {
    console.log(`✅ Valid tracking lookup succeeded:`);
    console.log(`   Status: "${trackValidData.order.status}", Customer: "${trackValidData.order.customer_name}", Masked Phone: "${trackValidData.order.customer_phone_masked}"`);
    console.log(`   Items in order: ${trackValidData.order.items.length}`);
  } else {
    throw new Error('Valid tracking lookup failed: ' + JSON.stringify(trackValidData));
  }

  // 4b: Unauthorized track request (wrong contact)
  const resTrackInvalid = await fetch(`${BASE_URL}/api/orders/track?ref=${encodeURIComponent(orderData.orderRef)}&contact=09999999999`);
  const trackInvalidData = await resTrackInvalid.json();
  if (!trackInvalidData.success && resTrackInvalid.status === 403) {
    console.log('✅ Security check verified: Unauthorized phone number correctly rejected with 403.');
  } else {
    throw new Error('Security check failed! Should have rejected unauthorized tracking.');
  }

  // Test 5: Submit Customer Inquiry
  console.log('\n[5/9] Testing POST /api/contact...');
  const resContact = await fetch(`${BASE_URL}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Maria Santos',
      contact_info: 'maria.santos@campus.edu.ph',
      subject: 'Bulk / Party Tray Order',
      message: 'Hi Seann and Mell, do you offer discounts if we order 4 Family-Size trays for our student org event next Friday?'
    })
  });
  const contactData = await resContact.json();
  if (contactData.success) {
    console.log('✅ Contact inquiry saved to database successfully:', contactData.message);
  } else {
    throw new Error('Contact inquiry failed: ' + JSON.stringify(contactData));
  }

  // Test 6: Admin Authentication
  console.log('\n[6/9] Testing Admin Login (POST /api/auth/login)...');
  const resLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@peachymaja.ph',
      password: 'PeachyMaja2026!'
    })
  });
  const loginData = await resLogin.json();
  if (!loginData.success || !loginData.token || loginData.user.role !== 'admin') {
    throw new Error('Admin login failed: ' + JSON.stringify(loginData));
  }
  console.log(`✅ Admin login successful! Token received for: ${loginData.user.name}`);
  const adminToken = loginData.token;

  // Test 7: Admin Statistics
  console.log('\n[7/9] Testing GET /api/admin/stats...');
  const resStats = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const statsData = await resStats.json();
  if (statsData.success) {
    console.log('✅ Admin statistics retrieved:');
    console.log(`   Total Orders: ${statsData.stats.totalOrders}`);
    console.log(`   Pending Orders: ${statsData.stats.pendingOrders}`);
    console.log(`   Total Revenue: ₱${statsData.stats.totalRevenue}`);
    console.log(`   Active Products: ${statsData.stats.totalProducts}`);
    console.log(`   Unread Inquiries: ${statsData.stats.totalInquiries}`);
  } else {
    throw new Error('Admin stats failed: ' + JSON.stringify(statsData));
  }

  // Test 8: Admin Status Update
  console.log('\n[8/9] Testing PATCH /api/admin/orders/:id/status (Updating status)...');
  const resUpdate = await fetch(`${BASE_URL}/api/admin/orders/${orderData.orderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      status: 'Preparing',
      status_notes: 'Your Maja Blanca is currently being freshly cooked and topped with warm toasted latik!'
    })
  });
  const updateData = await resUpdate.json();
  if (updateData.success) {
    console.log('✅ Order status successfully updated in database to "Preparing" with custom note.');
  } else {
    throw new Error('Order update failed: ' + JSON.stringify(updateData));
  }

  // Verify that the customer tracking view immediately reflects the updated status and notes
  const resTrackAfterUpdate = await fetch(`${BASE_URL}/api/orders/track?ref=${encodeURIComponent(orderData.orderRef)}&contact=09171234567`);
  const trackAfterData = await resTrackAfterUpdate.json();
  if (trackAfterData.order.status === 'Preparing' && trackAfterData.order.status_notes.includes('freshly cooked')) {
    console.log(`✅ Verified: Customer live tracking view updated in real-time to status: "${trackAfterData.order.status}"`);
  } else {
    throw new Error('Customer tracking did not reflect database update!');
  }

  // Test 9: Verify Static HTML Pages
  console.log('\n[9/9] Verifying Static Front-End Routes...');
  const pages = [
    '/',
    '/shop.html',
    '/cart.html',
    '/checkout.html',
    '/track.html',
    '/about.html',
    '/contact.html',
    '/account.html',
    '/admin.html'
  ];

  for (const page of pages) {
    const resPage = await fetch(`${BASE_URL}${page}`);
    if (resPage.ok) {
      console.log(`   ✓ Page [${page}] is live and serving (HTTP ${resPage.status})`);
    } else {
      throw new Error(`Page [${page}] failed to load: HTTP ${resPage.status}`);
    }
  }

  console.log('\n======================================================');
  console.log('🎉 ALL INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ Test execution failed with error:', err);
  process.exit(1);
});
