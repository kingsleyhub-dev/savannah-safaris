// supabase/functions/mpesa-callback/index.ts
// Public webhook called by Safaricom Daraja with the STK Push result.
// Updates the corresponding `payments` row and marks the booking paid on success.
//
// IMPORTANT: this endpoint must be reachable without auth (Daraja calls it
// directly). Set verify_jwt = false in supabase/config.toml.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = { "Access-Control-Allow-Origin": "*" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const cb = body?.Body?.stkCallback;
    if (!cb) return new Response(JSON.stringify({ ok: false }), { status: 400 });

    const checkoutId = cb.CheckoutRequestID;
    const success = cb.ResultCode === 0;

    // Pull MpesaReceiptNumber out of the metadata items (when present).
    const items = cb.CallbackMetadata?.Item ?? [];
    const receipt = items.find((i: any) => i.Name === "MpesaReceiptNumber")?.Value ?? null;

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: payment } = await service.from("payments")
      .select("id, booking_id")
      .eq("provider_reference", checkoutId)
      .maybeSingle();

    if (!payment) return new Response(JSON.stringify({ ok: true }), { status: 200 });

    await service.from("payments").update({
      status: success ? "succeeded" : "failed",
      provider_response: body,
      provider_reference: receipt ?? checkoutId,
      failure_reason: success ? null : cb.ResultDesc,
    }).eq("id", payment.id);

    if (success && payment.booking_id) {
      await service.from("bookings").update({
        payment_status: "paid",
        payment_method: "mpesa",
        payment_reference: receipt,
      }).eq("id", payment.booking_id);
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { status: 500 });
  }
});
