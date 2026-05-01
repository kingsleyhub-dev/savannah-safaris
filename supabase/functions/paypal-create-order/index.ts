// supabase/functions/paypal-create-order/index.ts
// Creates a PayPal Order via the v2 REST API and returns the approval URL.
//
// Required secrets:
//   PAYPAL_CLIENT_ID
//   PAYPAL_CLIENT_SECRET
//   PAYPAL_ENV          'sandbox' | 'live' (defaults to sandbox)
//   PAYPAL_RETURN_URL   e.g. https://yoursite.com/booking/success
//   PAYPAL_CANCEL_URL   e.g. https://yoursite.com/booking/cancel

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    const userId = claims?.claims?.sub;
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const { booking_id, amount_usd, property_name } = await req.json();
    if (!booking_id || !amount_usd) return json({ error: "Missing booking_id or amount_usd" }, 400);

    const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    const env = Deno.env.get("PAYPAL_ENV") ?? "sandbox";
    const returnUrl = Deno.env.get("PAYPAL_RETURN_URL") ?? `${new URL(req.url).origin}/booking`;
    const cancelUrl = Deno.env.get("PAYPAL_CANCEL_URL") ?? `${new URL(req.url).origin}/booking`;

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: payment, error: payErr } = await service.from("payments").insert({
      booking_id, user_id: userId, provider: "paypal", status: "pending",
      amount_cents: Math.round(parseFloat(amount_usd) * 100), currency: "USD",
    }).select("id").single();
    if (payErr) return json({ error: payErr.message }, 500);

    if (!clientId || !clientSecret) {
      await service.from("payments").update({ status: "failed", failure_reason: "PayPal not configured" }).eq("id", payment.id);
      return json({ error: "PayPal is not yet configured. Please contact support.", configured: false }, 503);
    }

    const baseUrl = env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

    // 1) OAuth
    const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${clientId}:${clientSecret}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token;
    if (!accessToken) return json({ error: "PayPal auth failed" }, 502);

    // 2) Create Order
    const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: booking_id,
          description: property_name ?? "Booking",
          amount: { currency_code: "USD", value: parseFloat(amount_usd).toFixed(2) },
        }],
        application_context: {
          return_url: `${returnUrl}?payment=paypal&payment_id=${payment.id}`,
          cancel_url: `${cancelUrl}?payment=paypal&cancelled=1`,
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
        },
      }),
    });
    const order = await orderRes.json();
    const approval = order.links?.find((l: any) => l.rel === "approve")?.href;

    await service.from("payments").update({
      provider_reference: order.id,
      provider_response: order,
      status: approval ? "processing" : "failed",
      failure_reason: approval ? null : (order.message ?? "Failed to create PayPal order"),
    }).eq("id", payment.id);

    if (!approval) return json({ error: order.message ?? "Failed to create PayPal order" }, 400);
    return json({ approval_url: approval, order_id: order.id, payment_id: payment.id });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
