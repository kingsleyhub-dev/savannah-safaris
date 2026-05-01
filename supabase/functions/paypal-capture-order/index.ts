// supabase/functions/paypal-capture-order/index.ts
// Captures a previously-approved PayPal order. Called when the user is
// redirected back to /booking?payment=paypal&token=<order_id>.

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
    const { order_id } = await req.json();
    if (!order_id) return json({ error: "Missing order_id" }, 400);

    const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    const env = Deno.env.get("PAYPAL_ENV") ?? "sandbox";
    if (!clientId || !clientSecret) return json({ error: "PayPal not configured" }, 503);

    const baseUrl = env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
    const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${clientId}:${clientSecret}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const accessToken = (await tokenRes.json()).access_token;

    const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${order_id}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });
    const capture = await captureRes.json();
    const success = capture.status === "COMPLETED";

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: payment } = await service.from("payments")
      .select("id, booking_id")
      .eq("provider_reference", order_id)
      .maybeSingle();

    if (payment) {
      await service.from("payments").update({
        status: success ? "succeeded" : "failed",
        provider_response: capture,
        failure_reason: success ? null : (capture.message ?? "PayPal capture failed"),
      }).eq("id", payment.id);
      if (success && payment.booking_id) {
        await service.from("bookings").update({
          payment_status: "paid", payment_method: "paypal", payment_reference: order_id,
        }).eq("id", payment.booking_id);
      }
    }
    return json({ status: capture.status, success });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
