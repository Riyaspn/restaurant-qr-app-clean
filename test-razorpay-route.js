// test-razorpay-route.js
import fetch from "node-fetch";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "<your_key_id>";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "<your_key_secret>";

async function testRouteApi() {
  const payload = {
    email: "test@example.com",
    phone: "9999999999",
    legal_business_name: "Test Business",
    customer_facing_business_name: "Test Business",
    business_type: "individual",
    profile: {
      category: "food_and_beverages",
      subcategory: "restaurant",
      addresses: {
        registered: {
          street1: "123 Test St",
          city: "Test City",
          state: "Test State",
          postal_code: "123456",
          country: "IN",
        },
      },
    },
    legal_info: {
      pan: "AAAAA0000A",
    },
    beneficiary_name: "Test Business",
    account_number: "1234567890",
    ifsc: "HDFC0001234",
    active: true,
    reference_id: "test123",
  };

  const auth =
    "Basic " + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");

  try {
    const response = await fetch("https://api.razorpay.com/v2/accounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    const data = response.ok ? JSON.parse(text) : text;

    console.log("Response Status:", response.status);
    console.log("Response Body:", data);
  } catch (error) {
    console.error("Error contacting Razorpay API:", error);
  }
}

testRouteApi();
