require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const ShiprocketService = require('../services/shiprocket/ShiprocketService');

async function runTest() {
  console.log("=== Testing Shiprocket Integration ===");
  const shiprocket = new ShiprocketService(process.env.SHIPROCKET_EMAIL, process.env.SHIPROCKET_PASSWORD);
  
  try {
    await shiprocket.initialize();
    
    const dummyOrder = {
      order_id: `TEST-${Date.now()}`,
      customer_name: "Test Customer",
      address: "123 Test Street",
      city: "Bangalore",
      pincode: "560001",
      state: "Karnataka",
      phone: "9876543210", // More realistic number
      email: "test@nakshra.in",
      pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "warehouse",
      sub_total: 100,
      items: [
        { name: "Test Item", sku: "SKU-TEST-1", units: 1, selling_price: 100 }
      ]
    };
    
    console.log("\n2. Processing dummy order:", dummyOrder.order_id);
    const result = await shiprocket.processFulfillment(dummyOrder);
    
    console.log("\n=== Result ===");
    console.log(JSON.stringify(result, null, 2));

  } catch (err) {
    console.error("\n❌ Fatal Error:", err.message);
  }
}

runTest();
