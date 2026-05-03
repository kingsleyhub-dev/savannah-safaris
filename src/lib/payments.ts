import { supabase } from "@/integrations/supabase/client";

export type PaymentMethod = "mpesa" | "mpesa_manual" | "paypal" | "card";

export interface PaymentContext {
  bookingId: string;
  amountCents: number;
  currency: "KES" | "USD";
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  propertyName: string;
}

/**
 * M-Pesa STK Push.
 *
 * Calls the `mpesa-stk-push` edge function with the customer's phone number.
 * The function will trigger Safaricom's STK Push prompt; the user accepts on
 * their phone and the callback updates the payment + booking record.
 *
 * Returns the CheckoutRequestID so the client can poll/listen for completion.
 */
export const startMpesaPayment = async (ctx: PaymentContext & { phone: string }) => {
  const { data, error } = await supabase.functions.invoke("mpesa-stk-push", {
    body: {
      booking_id: ctx.bookingId,
      amount_kes: Math.round(ctx.amountCents / 100),
      phone: ctx.phone,
      customer_name: ctx.customerName,
    },
  });
  if (error) throw new Error(error.message);
  return data as { checkout_request_id: string; payment_id: string };
};

/**
 * PayPal — create an order via the edge function and return the approval URL.
 * The browser is redirected to PayPal; on return, the capture endpoint marks
 * the booking paid.
 */
export const startPaypalPayment = async (ctx: PaymentContext) => {
  const { data, error } = await supabase.functions.invoke("paypal-create-order", {
    body: {
      booking_id: ctx.bookingId,
      amount_usd: (ctx.amountCents / 100).toFixed(2),
      property_name: ctx.propertyName,
    },
  });
  if (error) throw new Error(error.message);
  return data as { approval_url: string; order_id: string; payment_id: string };
};

/**
 * Stripe checkout (Visa / Mastercard / Amex).
 * Creates a Stripe Checkout Session via the edge function and returns the URL
 * to redirect the user to.
 */
export const startCardPayment = async (ctx: PaymentContext) => {
  const { data, error } = await supabase.functions.invoke("stripe-checkout", {
    body: {
      booking_id: ctx.bookingId,
      amount_cents: ctx.amountCents,
      currency: ctx.currency.toLowerCase(),
      customer_email: ctx.customerEmail,
      property_name: ctx.propertyName,
    },
  });
  if (error) throw new Error(error.message);
  return data as { url: string; session_id: string; payment_id: string };
};

/**
 * Manual M-Pesa Send Money — guests pay Joel's number directly and submit the
 * confirmation code. We log a pending `payments` row for admin verification.
 * No external API is called; the booking stays in `pending` until admin confirms.
 */
export const submitManualMpesa = async (
  ctx: PaymentContext & { txCode: string; senderPhone: string },
) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in to record a payment.");
  const { data, error } = await supabase
    .from("payments")
    .insert({
      booking_id: ctx.bookingId,
      user_id: user.id,
      provider: "mpesa_manual",
      status: "pending",
      amount_cents: ctx.amountCents,
      currency: "KES",
      provider_reference: ctx.txCode,
      provider_request: {
        recipient: "Joel — 0722 51765",
        sender_phone: ctx.senderPhone,
        customer_name: ctx.customerName,
        customer_email: ctx.customerEmail,
      },
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await supabase
    .from("bookings")
    .update({ payment_method: "mpesa_manual", payment_reference: ctx.txCode, payment_status: "pending" })
    .eq("id", ctx.bookingId);

  return data as { id: string };
};
