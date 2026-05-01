// supabase/functions/stripe-checkout/index.ts
// Creates a Stripe Checkout Session for Visa/Mastercard/Amex payments.
//
// Required secrets:
//   STRIPE_SECRET_KEY
//   STRIPE_SUCCESS_URL  (defaults to <origin>/booking?payment=card&status=success)
//   STRIPE_CANCEL_URL   (defaults to <origin>/booking?payment=card&status=cancelled)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const { booking_id, amount_cents, currency, customer_email, property_name } = await req.json();
    if (!booking_id || !amount_cents) return json({ error: "Missing booking_id or amount_cents" }, 400);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const origin = req.headers.get("origin") ?? "";
    const successUrl = Deno.env.get("STRIPE_SUCCESS_URL") ?? `${origin}/booking?payment=card&status=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = Deno.env.get("STRIPE_CANCEL_URL") ?? `${origin}/booking?payment=card&status=cancelled`;

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: payment, error: payErr } = await service.from("payments").insert({
      booking_id, user_id: userId, provider: "stripe", status: "pending",
      amount_cents, currency: (currency ?? "usd").toUpperCase(),
    }).select("id").single();
    if (payErr) return json({ error: payErr.message }, 500);

    if (!stripeKey) {
      await service.from("payments").update({ status: "failed", failure_reason: "Stripe not configured" }).eq("id", payment.id);
      return json({ error: "Card payments are not yet configured. Please contact support.", configured: false }, 503);
    }

    // Create Checkout Session via Stripe REST (form-encoded).
    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", successUrl);
    params.append("cancel_url", cancelUrl);
    if (customer_email) params.append("customer_email", customer_email);
    params.append("line_items[0][price_data][currency]", (currency ?? "usd").toLowerCase());
    params.append("line_items[0][price_data][product_data][name]", property_name ?? "Booking");
    params.append("line_items[0][price_data][unit_amount]", String(amount_cents));
    params.append("line_items[0][quantity]", "1");
    params.append("metadata[booking_id]", booking_id);
    params.append("metadata[payment_id]", payment.id);
    params.append("payment_method_types[0]", "card");

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const session = await stripeRes.json();

    if (!session.url) {
      await service.from("payments").update({
        status: "failed",
        provider_response: session,
        failure_reason: session.error?.message ?? "Failed to create Stripe session",
      }).eq("id", payment.id);
      return json({ error: session.error?.message ?? "Stripe session creation failed" }, 400);
    }

    await service.from("payments").update({
      provider_reference: session.id,
      provider_response: { id: session.id, url: session.url },
      status: "processing",
    }).eq("id", payment.id);

    return json({ url: session.url, session_id: session.id, payment_id: payment.id });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
