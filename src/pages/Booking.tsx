import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { PageHero } from "@/components/sections/PageHero";
import { images, property as defaultProperty } from "@/data/site";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Tag, Users, Plane, Car, MapPin, Loader2, Download, Home } from "lucide-react";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";
import { useSiteContent, resolveImage } from "@/hooks/useSiteContent";
import { useAuth } from "@/admin/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { downloadReceipt } from "@/lib/receipt";
import { logReceiptDownload } from "@/lib/receiptTracking";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProperties, formatKES, type Property } from "@/hooks/useProperties";
import { PaymentMethodSelector } from "@/components/booking/PaymentMethodSelector";

const addOns = [
  { id: "airport", label: "Airport pickup (JKIA)", price: 35, icon: Plane },
  { id: "joel", label: "Joel's Nissan + driver (per day)", price: 80, icon: Car },
  { id: "tour", label: "City tour with guide", price: 60, icon: MapPin },
];

type RentalType = "nightly" | "monthly_unfurnished" | "monthly_furnished";

const Booking = () => {
  const { get } = useSiteContent();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [search] = useSearchParams();
  const { properties, loading: propsLoading } = useProperties();

  const h = (k: string, fb: string) => get("booking", "hero", k, fb);
  const s = (k: string, fb: string) => get("booking", "summary", k, fb);

  // Property selection — defaults to ?property=slug or the first active property.
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  useEffect(() => {
    if (propsLoading) return;
    const fromQuery = search.get("property");
    setSelectedSlug(fromQuery ?? properties[0]?.slug ?? "");
  }, [propsLoading, properties, search]);

  const selectedProperty = useMemo<Property | undefined>(
    () => properties.find((p) => p.slug === selectedSlug),
    [properties, selectedSlug],
  );

  // Default rental type per property.
  const [rentalType, setRentalType] = useState<RentalType>("nightly");
  useEffect(() => {
    if (!selectedProperty) return;
    if (selectedProperty.supports_nightly) setRentalType("nightly");
    else if (selectedProperty.supports_furnished_option) setRentalType("monthly_unfurnished");
    else setRentalType("monthly_unfurnished");
  }, [selectedProperty]);

  const [range, setRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState(2);
  const [promo, setPromo] = useState("");
  const [discount, setDiscount] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [bookingId, setBookingId] = useState<string | null>(null);

  // Prefill from profile.
  useEffect(() => {
    if (!user) return;
    setEmail(user.email ?? "");
    (async () => {
      const { data } = await supabase
        .from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
      if (data?.full_name) setFullName(data.full_name);
    })();
  }, [user]);

  // Handle PayPal & Stripe return URLs.
  useEffect(() => {
    const payment = search.get("payment");
    if (!payment) return;
    const token = search.get("token");
    const status = search.get("status");
    if (payment === "paypal" && token) {
      supabase.functions.invoke("paypal-capture-order", { body: { order_id: token } })
        .then(({ data, error }) => {
          if (error) return toast.error(error.message);
          if (data?.success) toast.success("Payment received! Your booking is confirmed.");
          else toast.error("PayPal payment was not completed.");
        });
    } else if (payment === "card" && status === "success") {
      toast.success("Payment received! Your booking is confirmed.");
    } else if (payment === "card" && status === "cancelled") {
      toast.info("Card payment was cancelled.");
    }
  }, [search]);

  const nights = useMemo(() => {
    if (!range?.from || !range?.to) return 0;
    return Math.max(0, Math.round((+range.to - +range.from) / 86400000));
  }, [range]);

  // ---------- Pricing engine ----------
  // Nightly stays use USD (legacy). Monthly stays use KES from the properties table.
  const isMonthly = rentalType !== "nightly";
  const months = isMonthly && range?.from && range?.to
    ? Math.max(1, Math.round((+range.to - +range.from) / (86400000 * 30)))
    : 0;

  let baseAmountCents = 0;
  let currency: "USD" | "KES" = "USD";
  let baseLabel = "";

  if (selectedProperty) {
    if (rentalType === "nightly" && selectedProperty.price_nightly_kes_cents) {
      // 2BR nightly: KES per night.
      baseAmountCents = nights * selectedProperty.price_nightly_kes_cents;
      currency = "KES";
      baseLabel = `${formatKES(selectedProperty.price_nightly_kes_cents)} × ${nights} night${nights === 1 ? "" : "s"}`;
    } else if (rentalType === "monthly_unfurnished" && selectedProperty.price_monthly_kes_cents) {
      baseAmountCents = months * selectedProperty.price_monthly_kes_cents;
      currency = "KES";
      baseLabel = `${formatKES(selectedProperty.price_monthly_kes_cents)} × ${months} month${months === 1 ? "" : "s"}`;
    } else if (rentalType === "monthly_furnished" && selectedProperty.price_monthly_furnished_kes_cents) {
      baseAmountCents = months * selectedProperty.price_monthly_furnished_kes_cents;
      currency = "KES";
      baseLabel = `${formatKES(selectedProperty.price_monthly_furnished_kes_cents)} × ${months} month${months === 1 ? "" : "s"}`;
    }
  }

  const cleaningCents = !isMonthly && nights > 0 && currency === "KES" ? 250000 : 0; // KES 2,500
  const addonTotalUsd = selected.reduce((s, id) => s + (addOns.find((a) => a.id === id)?.price ?? 0), 0);
  // For monthly stays we don't apply USD add-ons (they're stay extras for short trips).
  const addonsCents = !isMonthly ? addonTotalUsd * 100 * (currency === "KES" ? 130 : 1) : 0;
  const discountAmtCents = Math.round(baseAmountCents * (discount / 100));
  const totalCents = baseAmountCents + cleaningCents + addonsCents - discountAmtCents;

  const formatAmount = (cents: number) =>
    currency === "KES" ? `KES ${(cents / 100).toLocaleString("en-KE")}` : `$${(cents / 100).toFixed(0)}`;

  const applyPromo = () => {
    if (promo.trim().toUpperCase() === "SAVANNAH10") {
      setDiscount(10);
      toast.success("Promo applied — 10% off your stay");
    } else {
      setDiscount(0);
      toast.error("Invalid promo code");
    }
  };

  const datesValid = isMonthly ? months > 0 : nights > 0;

  const confirm = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedProperty) return toast.error("Please choose a property");
    if (!datesValid) return toast.error("Please select your dates");
    if (!user) return toast.error("Please sign in to confirm your booking");
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      return toast.error("Please fill in your name, email, and phone");
    }

    setSaving(true);
    const furnishedOption = rentalType === "monthly_furnished" ? "furnished"
      : rentalType === "monthly_unfurnished" ? "unfurnished" : null;

    const { data: inserted, error } = await supabase.from("bookings").insert([{
      user_id: user.id,
      property_id: selectedProperty.id,
      rental_type: rentalType === "nightly" ? "short_stay" : "monthly",
      furnished_option: furnishedOption,
      guest_name: fullName.trim(),
      guest_email: email.trim(),
      guest_phone: phone.trim(),
      guest_country: country.trim() || null,
      check_in: range!.from!.toISOString().slice(0, 10),
      check_out: range!.to!.toISOString().slice(0, 10),
      guests,
      nights: isMonthly ? months * 30 : nights,
      add_ons: selected.map((id) => addOns.find((a) => a.id === id)).filter(Boolean) as any,
      promo_code: promo.trim() || null,
      discount_percent: discount,
      subtotal_cents: baseAmountCents,
      cleaning_cents: cleaningCents,
      addons_cents: addonsCents,
      discount_cents: discountAmtCents,
      total_cents: totalCents,
      currency,
      amount_kes_cents: currency === "KES" ? totalCents : null,
      status: "confirmed",
      payment_status: "pending",
    }]).select("id").single();
    setSaving(false);
    if (error) return toast.error(error.message);
    if (inserted?.id) setBookingId(inserted.id);
    setSubmitted(true);
    toast.success("Booking saved! Choose a payment method to complete.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDownloadReceipt = async () => {
    if (!range?.from || !range?.to || !selectedProperty) return;
    setDownloadingReceipt(true);
    try {
      await logReceiptDownload(user?.id, bookingId);
      downloadReceipt({
        bookingId: bookingId ?? "PENDING",
        guestName: fullName, guestEmail: email, guestPhone: phone, guestCountry: country,
        checkIn: range.from.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
        checkOut: range.to.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
        nights: isMonthly ? months * 30 : nights,
        guests,
        pricePerNight: rentalType === "nightly" && selectedProperty.price_nightly_kes_cents
          ? selectedProperty.price_nightly_kes_cents / 100
          : (selectedProperty.price_per_night_usd ?? 0),
        subtotal: baseAmountCents / 100,
        cleaning: cleaningCents / 100,
        addons: selected.map((id) => addOns.find((a) => a.id === id)).filter(Boolean).map((a) => ({ label: a!.label, price: a!.price })),
        discountPercent: discount,
        discountAmount: discountAmtCents / 100,
        total: totalCents / 100,
        promoCode: promo.trim() || undefined,
        propertyName: selectedProperty.name,
        propertyLocation: selectedProperty.location,
        contactEmail: "savannahsafarisairbnb@gmail.com",
      });
    } catch (error: any) {
      toast.error(error.message ?? "Could not log receipt download");
    } finally {
      setDownloadingReceipt(false);
    }
  };

  // ---------------- CONFIRMED VIEW ----------------
  if (submitted && selectedProperty) {
    return (
      <>
        <PageHero eyebrow="Confirmed" title="Your stay is reserved" image={resolveImage(h("image", ""), images.view)} />
        <section className="section-padding">
          <div className="container-luxe max-w-3xl space-y-6">
            <div className="text-center space-y-4">
              <div className="size-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto">
                <CheckCircle2 className="size-10" />
              </div>
              <h2 className="font-display text-3xl font-bold">Booking saved!</h2>
              <p className="text-muted-foreground">Complete payment below to fully confirm your reservation.</p>
            </div>

            <Card className="p-6 space-y-2 text-left">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Property</span><span className="font-medium">{selectedProperty.name}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Dates</span><span className="font-medium">{range?.from?.toLocaleDateString()} – {range?.to?.toLocaleDateString()}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Guests</span><span className="font-medium">{guests}</span></div>
              <div className="flex items-center justify-between border-t pt-2 mt-2"><span className="font-semibold">Total due</span><span className="font-display text-xl font-bold text-primary">{formatAmount(totalCents)}</span></div>
            </Card>

            <PaymentMethodSelector
              ctx={{
                bookingId: bookingId!,
                amountCents: totalCents,
                currency,
                customerName: fullName,
                customerEmail: email,
                customerPhone: phone,
                propertyName: selectedProperty.name,
              }}
            />

            <div className="flex flex-wrap gap-3 justify-center">
              <Button onClick={handleDownloadReceipt} variant="outline" disabled={downloadingReceipt}>
                {downloadingReceipt ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Download receipt
              </Button>
              <Button asChild variant="outline"><Link to="/my-bookings">View my bookings</Link></Button>
              <Button onClick={() => { setSubmitted(false); setRange(undefined); setBookingId(null); }} variant="ghost">
                Make another booking
              </Button>
            </div>
          </div>
        </section>
      </>
    );
  }

  // ---------------- BOOKING FORM ----------------
  return (
    <>
      <PageHero
        eyebrow={h("eyebrow", "Book direct")}
        title={h("title", "Reserve your stay")}
        subtitle={h("subtitle", "Best-rate guarantee · Instant confirmation")}
        image={resolveImage(h("image", ""), images.view)}
      />

      <section className="section-padding">
        <div className="container-luxe grid gap-6 lg:grid-cols-3 lg:gap-8">
          <form onSubmit={confirm} className="lg:col-span-2 space-y-8">

            {/* Property selector */}
            <Card className="p-6 md:p-8 space-y-5">
              <h3 className="font-display text-xl font-bold sm:text-2xl flex items-center gap-2">
                <Home className="size-5 text-primary" /> 1. Choose your property
              </h3>
              {propsLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="size-5 animate-spin text-primary" /></div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {properties.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setSelectedSlug(p.slug)}
                      className={`text-left rounded-xl border-2 p-4 transition-smooth ${
                        selectedSlug === p.slug ? "border-primary bg-secondary/40" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{p.name}</span>
                        {p.block_label && <span className="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5">{p.block_label}</span>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{p.bedrooms} bed · {p.bathrooms} bath · up to {p.max_guests} guests</p>
                    </button>
                  ))}
                </div>
              )}
            </Card>

            {/* Rental type (only when property has multiple options) */}
            {selectedProperty && (selectedProperty.supports_nightly || selectedProperty.supports_furnished_option) && (
              <Card className="p-6 md:p-8 space-y-4">
                <h3 className="font-display text-xl font-bold sm:text-2xl">2. Rental type</h3>
                <RadioGroup value={rentalType} onValueChange={(v) => setRentalType(v as RentalType)} className="grid gap-3 sm:grid-cols-2">
                  {selectedProperty.supports_nightly && selectedProperty.price_nightly_kes_cents && (
                    <label className={`flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition-smooth ${rentalType === "nightly" ? "border-primary bg-secondary/40" : "border-border"}`}>
                      <RadioGroupItem value="nightly" />
                      <div>
                        <p className="font-semibold">Nightly stay</p>
                        <p className="text-sm text-muted-foreground">{formatKES(selectedProperty.price_nightly_kes_cents)} / night</p>
                      </div>
                    </label>
                  )}
                  {selectedProperty.supports_monthly && selectedProperty.price_monthly_kes_cents && (
                    <label className={`flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition-smooth ${rentalType === "monthly_unfurnished" ? "border-primary bg-secondary/40" : "border-border"}`}>
                      <RadioGroupItem value="monthly_unfurnished" />
                      <div>
                        <p className="font-semibold">Monthly{selectedProperty.supports_furnished_option ? " · Unfurnished" : ""}</p>
                        <p className="text-sm text-muted-foreground">{formatKES(selectedProperty.price_monthly_kes_cents)} / month</p>
                      </div>
                    </label>
                  )}
                  {selectedProperty.supports_furnished_option && selectedProperty.price_monthly_furnished_kes_cents && (
                    <label className={`flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition-smooth ${rentalType === "monthly_furnished" ? "border-primary bg-secondary/40" : "border-border"}`}>
                      <RadioGroupItem value="monthly_furnished" />
                      <div>
                        <p className="font-semibold">Monthly · Furnished</p>
                        <p className="text-sm text-muted-foreground">{formatKES(selectedProperty.price_monthly_furnished_kes_cents)} / month</p>
                      </div>
                    </label>
                  )}
                </RadioGroup>
              </Card>
            )}

            {/* Dates */}
            <Card className="p-6 md:p-8 space-y-6">
              <h3 className="font-display text-xl font-bold sm:text-2xl">3. {isMonthly ? "Lease period" : "Choose your dates"}</h3>
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <Calendar
                  mode="range"
                  selected={range}
                  onSelect={setRange}
                  numberOfMonths={isMobile ? 1 : 2}
                  disabled={{ before: new Date() }}
                  className="mx-auto"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Users className="size-4" /> Guests</Label>
                  <Input
                    type="number" min={1} max={selectedProperty?.max_guests ?? 4}
                    value={guests} onChange={(e) => setGuests(+e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Tag className="size-4" /> Promo code</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input placeholder="Try SAVANNAH10" value={promo} onChange={(e) => setPromo(e.target.value)} />
                    <Button type="button" variant="outline" onClick={applyPromo} className="sm:w-auto">Apply</Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Add-ons (nightly only) */}
            {!isMonthly && (
              <Card className="p-6 md:p-8 space-y-6">
                <h3 className="font-display text-xl font-bold sm:text-2xl">4. Add extras</h3>
                <div className="space-y-3">
                  {addOns.map((a) => {
                    const Icon = a.icon;
                    const checked = selected.includes(a.id);
                    return (
                      <label key={a.id} className={`flex flex-wrap items-center gap-3 rounded-xl border-2 p-4 transition-smooth cursor-pointer sm:flex-nowrap sm:gap-4 ${checked ? "border-primary bg-secondary/40" : "border-border hover:border-primary/40"}`}>
                        <Checkbox checked={checked} onCheckedChange={(v) => setSelected((s) => v ? [...s, a.id] : s.filter((x) => x !== a.id))} />
                        <Icon className="size-5 text-primary" />
                        <span className="min-w-0 flex-1 font-medium">{a.label}</span>
                        <span className="w-full text-left font-semibold text-primary sm:w-auto sm:text-right">+${a.price}</span>
                      </label>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Guest details */}
            <Card className="p-6 md:p-8 space-y-6">
              <h3 className="font-display text-xl font-bold sm:text-2xl">{isMonthly ? "4" : "5"}. Your details</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Full name</Label><Input required placeholder="Jane Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
                <div className="space-y-2"><Label>Email</Label><Input required type="email" placeholder="jane@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input required type="tel" placeholder="+254..." value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                <div className="space-y-2"><Label>Country</Label><Input placeholder="Kenya" value={country} onChange={(e) => setCountry(e.target.value)} /></div>
              </div>
              <p className="text-xs text-muted-foreground">After saving, you'll be able to choose how to pay — M-Pesa, PayPal, or card.</p>
            </Card>
          </form>

          {/* Sticky summary */}
          <aside className="self-start lg:sticky lg:top-28">
            <Card className="overflow-hidden shadow-elegant">
              <img src={selectedProperty?.hero_image_url ?? resolveImage(s("image", ""), images.bedroom)} alt="" className="w-full aspect-[4/3] object-cover" />
              <div className="p-6 space-y-4">
                <div>
                  <h4 className="font-display text-xl font-bold">{selectedProperty?.name ?? defaultProperty.name}</h4>
                  <p className="text-sm text-muted-foreground">{selectedProperty?.location ?? defaultProperty.location}</p>
                  {selectedProperty?.block_label && <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{selectedProperty.block_label}</span>}
                </div>
                <div className="space-y-2 text-sm border-t border-border pt-4">
                  {baseLabel && <div className="flex justify-between"><span>{baseLabel}</span><span>{formatAmount(baseAmountCents)}</span></div>}
                  {cleaningCents > 0 && <div className="flex justify-between"><span>Cleaning fee</span><span>{formatAmount(cleaningCents)}</span></div>}
                  {addonsCents > 0 && <div className="flex justify-between"><span>Add-ons</span><span>{formatAmount(addonsCents)}</span></div>}
                  {discountAmtCents > 0 && <div className="flex justify-between text-primary"><span>Promo ({discount}%)</span><span>-{formatAmount(discountAmtCents)}</span></div>}
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-border pt-4">
                  <span>Total</span><span>{formatAmount(totalCents)}</span>
                </div>
                <Button onClick={confirm as any} variant="hero" size="lg" className="w-full" disabled={saving}>
                  {saving ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : "Continue to payment"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">M-Pesa · PayPal · Visa · Mastercard</p>
              </div>
            </Card>
          </aside>
        </div>
      </section>
    </>
  );
};

export default Booking;
