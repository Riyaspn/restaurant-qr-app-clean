import fetch from "node-fetch";

const safeTrim = (val) => (typeof val === "string" ? val.trim() : "");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      owner_id,
      email,
      phone,
      legal_name,             // legal_business_name in Razorpay
      beneficiary_name,       // must match legal_name
      bank_account_name,      // must match legal_name
      display_name,           // customer_facing_business_name
      business_type,
      profile,
      legal_info,
      account_number,
      ifsc,
    } = req.body;

    // Validate required fields presence
    if (
      !owner_id ||
      !email ||
      !phone ||
      !legal_name ||
      !beneficiary_name ||
      !bank_account_name ||
      !business_type ||
      !profile ||
      !legal_info ||
      !account_number ||
      !ifsc
    ) {
      console.error("Validation failed: missing required fields", {
        receivedData: req.body,
      });
      return res.status(400).json({ error: "Missing required fields." });
    }

    // Enforce exact matching of names for compliance
    if (
      safeTrim(legal_name) !== safeTrim(beneficiary_name) ||
      safeTrim(legal_name) !== safeTrim(bank_account_name)
    ) {
      console.error("Validation failed: name mismatch", {
        legal_name,
        beneficiary_name,
        bank_account_name,
      });
      return res.status(400).json({
        error: "Legal Name, Beneficiary Name, and Bank Account Holder Name must exactly match.",
      });
    }

    // Prepare Razorpay account creation payload
    const payload = {
      email: safeTrim(email),
      phone: safeTrim(phone),
      legal_business_name: safeTrim(legal_name),
      customer_facing_business_name: safeTrim(display_name),
      business_type: safeTrim(business_type).toLowerCase(),
      profile,
      legal_info,
      beneficiary_name: safeTrim(beneficiary_name),
      account_number: safeTrim(account_number),
      ifsc: safeTrim(ifsc).toUpperCase(),
      active: true,
      reference_id: owner_id.toString(),
    };

    // Log the payload being sent
    console.info("Sending Razorpay account create request with payload:", payload);

    // Razorpay API Basic Authentication header
    const auth =
      "Basic " +
      Buffer.from(
        `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
      ).toString("base64");

    const response = await fetch("https://api.razorpay.com/v2/accounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();

    if (!response.ok) {
      let errorMsg;
      try {
        errorMsg = JSON.parse(text);
      } catch {
        errorMsg = text;
      }

      // Log detailed error info for debugging
      console.error("Razorpay account creation failed", {
        status: response.status,
        statusText: response.statusText,
        responseBody: text,
        payloadSent: payload,
      });

      return res.status(response.status).json({ error: errorMsg });
    }

    const data = JSON.parse(text);

    // Log success response for diagnostics
    console.info("Razorpay account created successfully:", data);

    // Respond with Razorpay account info
    return res.status(201).json({ account_id: data.id, account: data });
  } catch (error) {
    // Log unexpected errors and stack trace
    console.error("Unhandled exception creating Razorpay Route account:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
