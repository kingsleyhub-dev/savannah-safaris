import { useState } from "react";
import { Smartphone, CreditCard, Loader2, Copy, Check, UserCheck } from "lucide-react";
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
  submitManualMpesa,
  type PaymentMethod,
  type PaymentContext,
} from "@/lib/payments";

const JOEL_MPESA_NUMBER = "0722 51765";
const JOEL_MPESA_NAME = "Joel";

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

  // Manual M-Pesa Send Money state.
  const [txCode, setTxCode] = useState("");
  const [senderPhone, setSenderPhone] = useState(ctx.customerPhone ?? "");
  const [copied, setCopied] = useState(false);

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(JOEL_MPESA_NUMBER.replace(/\s/g, ""));
      setCopied(true);
      toast.success("Number copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy — please copy manually");
    }
  };

  const handleManualMpesa = async () => {
    if (txCode.trim().length < 8) return toast.error("Enter the M-Pesa confirmation code (e.g. SIA1B2C3D4)");
    if (!/^(?:\+?254|0)?[17]\d{8}$/.test(senderPhone.replace(/\s/g, ""))) {
      return toast.error("Enter the phone number you sent from");
    }
    setBusy("mpesa_manual");
    try {
      await submitManualMpesa({ ...ctx, txCode: txCode.trim().toUpperCase(), senderPhone });
      toast.success("Payment recorded — we'll confirm shortly.");
      onSuccess?.();
    } catch (e: any) {
      toast.error(e.message ?? "Could not record payment");
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

      <Tabs defaultValue="joel_mpesa" onValueChange={(v) => onMethodChange?.(v as PaymentMethod)}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="joel_mpesa" className="gap-2"><UserCheck className="size-4" /> Joel M-Pesa</TabsTrigger>
          <TabsTrigger value="mpesa" className="gap-2"><Smartphone className="size-4" /> STK Push</TabsTrigger>
          <TabsTrigger value="paypal" className="gap-2"><span className="font-bold text-[#003087]">Pay</span><span className="font-bold text-[#009cde]">Pal</span></TabsTrigger>
          <TabsTrigger value="card" className="gap-2"><CreditCard className="size-4" /> Card</TabsTrigger>
        </TabsList>

        {/* Manual Send Money to Joel — no API integration required. */}
        <TabsContent value="joel_mpesa" className="space-y-4 pt-5">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Send <span className="font-semibold text-foreground">KES {(ctx.amountCents / 100).toLocaleString("en-KE")}</span> via M-Pesa Send Money to:
            </p>
            <div className="flex items-center justify-between rounded-lg bg-background px-4 py-3 ring-1 ring-border">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{JOEL_MPESA_NAME}</p>
                <p className="font-display text-2xl font-bold tracking-wide">{JOEL_MPESA_NUMBER}</p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={copyNumber}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <ol className="text-xs text-muted-foreground list-decimal pl-4 space-y-1">
              <li>Open M-Pesa → Send Money → enter the number above.</li>
              <li>Enter the exact amount and your M-Pesa PIN.</li>
              <li>Paste the confirmation code (SMS) below and submit.</li>
            </ol>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="manual-tx">M-Pesa confirmation code</Label>
              <Input id="manual-tx" placeholder="SIA1B2C3D4" value={txCode} onChange={(e) => setTxCode(e.target.value)} className="uppercase" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-phone">Your M-Pesa phone</Label>
              <Input id="manual-phone" inputMode="tel" placeholder="0712 345 678" value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleManualMpesa} variant="hero" size="lg" className="w-full" disabled={busy !== null}>
            {busy === "mpesa_manual" ? <><Loader2 className="size-4 animate-spin" /> Submitting…</> : "I've sent — submit confirmation"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">Your booking will be confirmed once we verify the payment (usually within minutes).</p>
        </TabsContent>

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
