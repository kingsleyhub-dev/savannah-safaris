// supabase/functions/mpesa-stk-push/index.ts
// Initiates an M-Pesa STK Push (Lipa Na M-Pesa Online) for a booking.
//
// Required secrets (Daraja API):
//   MPESA_CONSUMER_KEY
//   MPESA_CONSUMER_SECRET
//   MPESA_SHORTCODE          (Paybill / Till)
//   MPESA_PASSKEY            (Lipa Na M-Pesa Online passkey)
//   MPESA_CALLBACK_URL       (https://<project>.supabase.co/functions/v1/mpesa-callback)
//   MPESA_ENV                'sandbox' | 'production'   (defaults to 'sandbox')
//
// When secrets are missing the function returns 503 so the UI can show
// a clean "M-Pesa not yet configured" state without crashing.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizePhone = (raw: string) => {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return "254" + digits.slice(1);
  if (digits.startsWith("7") || digits.startsWith("1")) return "254" + digits;
  return digits;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const userId = userData?.user?.id;
    if (userErr || !userId) return json({ error: "Unauthorized" }, 401);

    const { booking_id, amount_kes, phone, customer_name } = await req.json();
    if (!booking_id || !amount_kes || !phone) {
      return json({ error: "Missing booking_id, amount_kes, or phone" }, 400);
    }

    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");
    const shortcode = Deno.env.get("MPESA_SHORTCODE");
    const passkey = Deno.env.get("MPESA_PASSKEY");
    const callbackUrl = Deno.env.get("MPESA_CALLBACK_URL");
    const env = Deno.env.get("MPESA_ENV") ?? "sandbox";

    // Always create a payment record so the UI/admin can see attempts.
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: payment, error: payErr } = await service.from("payments").insert({
      booking_id,
      user_id: userId,
      provider: "mpesa",
      status: "pending",
      amount_cents: Math.round(amount_kes * 100),
      currency: "KES",
      provider_request: { phone, customer_name },
    }).select("id").single();
    if (payErr) return json({ error: payErr.message }, 500);

    // Soft-fail when credentials aren't set yet — UI shows a clear message.
    if (!consumerKey || !consumerSecret || !shortcode || !passkey || !callbackUrl) {
      await service.from("payments").update({
        status: "failed",
        failure_reason: "M-Pesa credentials not configured",
      }).eq("id", payment.id);
      return json({
        error: "M-Pesa is not yet configured. Please contact support to complete this payment.",
        configured: false,
      }, 503);
    }

    const baseUrl = env === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

    // 1) OAuth token
    const tokenRes = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: "Basic " + btoa(`${consumerKey}:${consumerSecret}`) },
    });
    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token;
    if (!accessToken) {
      await service.from("payments").update({
        status: "failed",
        failure_reason: "Failed to obtain Daraja access token",
        provider_response: tokenJson,
      }).eq("id", payment.id);
      return json({ error: "M-Pesa auth failed" }, 502);
    }

    // 2) STK Push
    const ts = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
    const password = btoa(`${shortcode}${passkey}${ts}`);
    const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: ts,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(amount_kes),
        PartyA: normalizePhone(phone),
        PartyB: shortcode,
        PhoneNumber: normalizePhone(phone),
        CallBackURL: callbackUrl,
        AccountReference: booking_id.slice(0, 12),
        TransactionDesc: `Booking ${booking_id.slice(0, 8)}`,
      }),
    });
    const stkJson = await stkRes.json();

    await service.from("payments").update({
      status: stkJson.ResponseCode === "0" ? "processing" : "failed",
      provider_reference: stkJson.CheckoutRequestID ?? null,
      provider_response: stkJson,
      failure_reason: stkJson.ResponseCode === "0" ? null : (stkJson.errorMessage ?? "STK Push rejected"),
    }).eq("id", payment.id);

    if (stkJson.ResponseCode !== "0") {
      return json({ error: stkJson.errorMessage ?? "STK Push failed", details: stkJson }, 400);
    }

    return json({ checkout_request_id: stkJson.CheckoutRequestID, payment_id: payment.id });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
