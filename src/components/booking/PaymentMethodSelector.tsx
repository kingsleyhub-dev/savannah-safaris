import { useState } from "react";
import { Smartphone, CreditCard, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  startMpesaPayment,
  startPaypalPayment,
  startCardPayment,
  type PaymentMethod,
  type PaymentContext,
} from "@/lib/payments";

interface Props {
  ctx: PaymentContext;
  onMethodChange?: (method: PaymentMethod) => void;
  onSuccess?: () => void;
}

/**
 * Unified payment selector with three tabs: M-Pesa, PayPal, Card.
 *
 * Each tab handles its own UX:
 *   - M-Pesa: phone field + STK Push trigger; shows pending state.
 *   - PayPal: redirects to PayPal approval URL.
 *   - Card:   redirects to Stripe Checkout.
 *
 * The actual payment provider edge functions handle the heavy lifting; this
 * component is a thin client that surfaces the right inputs and statuses.
 */
export const PaymentMethodSelector = ({ ctx, onMethodChange, onSuccess }: Props) => {
  const [phone, setPhone] = useState(ctx.customerPhone ?? "");
  const [busy, setBusy] = useState<PaymentMethod | null>(null);
  const [mpesaState, setMpesaState] = useState<"idle" | "pending" | "success" | "failed">("idle");

  const handleMpesa = async () => {
    if (!/^(?:\+?254|0)?[17]\d{8}$/.test(phone.replace(/\s/g, ""))) {
      return toast.error("Enter a valid Kenyan phone number (e.g. 0712345678)");
    }
    setBusy("mpesa");
    setMpesaState("pending");
    try {
      await startMpesaPayment({ ...ctx, phone });
      toast.success("Check your phone — enter your M-Pesa PIN to complete payment.");
      // In a real flow we'd poll the payment row or subscribe via Realtime.
      // Here we simply confirm the prompt was sent.
      onSuccess?.();
    } catch (e: any) {
      setMpesaState("failed");
      toast.error(e.message ?? "Could not start M-Pesa payment");
    } finally {
      setBusy(null);
    }
  };

  const handlePaypal = async () => {
    setBusy("paypal");
    try {
      const { approval_url } = await startPaypalPayment(ctx);
      window.location.href = approval_url;
    } catch (e: any) {
      toast.error(e.message ?? "Could not start PayPal checkout");
    } finally {
      setBusy(null);
    }
  };

  const handleCard = async () => {
    setBusy("card");
    try {
      const { url } = await startCardPayment(ctx);
      window.location.href = url;
    } catch (e: any) {
      toast.error(e.message ?? "Could not start card checkout");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="p-6 md:p-8 space-y-5">
      <div>
        <h3 className="font-display text-xl font-bold sm:text-2xl">Choose payment method</h3>
        <p className="mt-1 text-sm text-muted-foreground">Secure checkout · Pay with your preferred method</p>
      </div>

      <Tabs defaultValue="mpesa" onValueChange={(v) => onMethodChange?.(v as PaymentMethod)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="mpesa" className="gap-2"><Smartphone className="size-4" /> M-Pesa</TabsTrigger>
          <TabsTrigger value="paypal" className="gap-2"><span className="font-bold text-[#003087]">Pay</span><span className="font-bold text-[#009cde]">Pal</span></TabsTrigger>
          <TabsTrigger value="card" className="gap-2"><CreditCard className="size-4" /> Card</TabsTrigger>
        </TabsList>

        <TabsContent value="mpesa" className="space-y-4 pt-5">
          <div className="rounded-xl bg-secondary/40 p-4 text-sm text-muted-foreground">
            We'll send an M-Pesa STK Push prompt to your phone. Enter your M-Pesa PIN to authorise{" "}
            <span className="font-semibold text-foreground">KES {(ctx.amountCents / 100).toLocaleString("en-KE")}</span>.
          </div>
          <div className="space-y-2">
            <Label htmlFor="mpesa-phone">M-Pesa phone number</Label>
            <Input
              id="mpesa-phone"
              inputMode="tel"
              placeholder="0712 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <Button onClick={handleMpesa} variant="hero" size="lg" className="w-full" disabled={busy !== null}>
            {busy === "mpesa" ? <><Loader2 className="size-4 animate-spin" /> Sending prompt…</> : "Pay with M-Pesa"}
          </Button>
          {mpesaState === "pending" && (
            <p className="text-center text-sm text-primary">Awaiting confirmation from your phone…</p>
          )}
        </TabsContent>

        <TabsContent value="paypal" className="space-y-4 pt-5">
          <div className="rounded-xl bg-secondary/40 p-4 text-sm text-muted-foreground">
            You'll be redirected to PayPal to complete payment of{" "}
            <span className="font-semibold text-foreground">USD {(ctx.amountCents / 100).toFixed(2)}</span>.
          </div>
          <Button onClick={handlePaypal} size="lg" className="w-full bg-[#ffc439] text-black hover:bg-[#f0b730]" disabled={busy !== null}>
            {busy === "paypal" ? <><Loader2 className="size-4 animate-spin" /> Redirecting…</> : "Continue with PayPal"}
          </Button>
        </TabsContent>

        <TabsContent value="card" className="space-y-4 pt-5">
          <div className="rounded-xl bg-secondary/40 p-4 text-sm text-muted-foreground">
            Pay securely with Visa, Mastercard, or American Express. Powered by Stripe.
          </div>
          <Button onClick={handleCard} variant="hero" size="lg" className="w-full" disabled={busy !== null}>
            {busy === "card" ? <><Loader2 className="size-4 animate-spin" /> Redirecting…</> : <><CreditCard className="size-4" /> Pay with card</>}
          </Button>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
