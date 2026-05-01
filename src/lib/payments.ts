import { supabase } from "@/integrations/supabase/client";

export type PaymentMethod = "mpesa" | "paypal" | "card";

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
