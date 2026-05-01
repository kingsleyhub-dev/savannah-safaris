-- ==========================================
-- PROPERTIES
-- ==========================================
CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text,
  description text,
  location text NOT NULL,
  block_label text,
  bedrooms integer NOT NULL DEFAULT 1,
  bathrooms integer NOT NULL DEFAULT 1,
  max_guests integer NOT NULL DEFAULT 2,

  -- Pricing (in KES cents to avoid float issues)
  price_monthly_kes_cents integer,             -- e.g. 70000 * 100
  price_monthly_furnished_kes_cents integer,   -- 1BR furnished
  price_nightly_kes_cents integer,             -- e.g. 8000 * 100
  -- Legacy USD nightly used by existing booking flow
  price_per_night_usd integer,

  supports_monthly boolean NOT NULL DEFAULT false,
  supports_nightly boolean NOT NULL DEFAULT false,
  supports_furnished_option boolean NOT NULL DEFAULT false,

  hero_image_url text,
  hero_video_url text,
  amenities_inherit boolean NOT NULL DEFAULT true,

  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read properties"
  ON public.properties FOR SELECT
  USING (true);

CREATE POLICY "Admins manage properties"
  ON public.properties FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER properties_touch_updated
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ==========================================
-- BOOKINGS: extend for multi-property + payments
-- ==========================================
ALTER TABLE public.bookings
  ADD COLUMN property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  ADD COLUMN rental_type text NOT NULL DEFAULT 'short_stay',
  ADD COLUMN furnished_option text,
  ADD COLUMN payment_method text,
  ADD COLUMN payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN payment_reference text,
  ADD COLUMN currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN amount_kes_cents integer;

-- ==========================================
-- PAYMENTS
-- ==========================================
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  provider text NOT NULL,                   -- 'mpesa' | 'paypal' | 'stripe'
  status text NOT NULL DEFAULT 'pending',   -- pending|processing|succeeded|failed|cancelled
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'KES',
  provider_reference text,                  -- MpesaReceiptNumber / PayPal order id / Stripe session id
  provider_request jsonb,
  provider_response jsonb,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users create own payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage payments"
  ON public.payments FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER payments_touch_updated
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_payments_booking ON public.payments(booking_id);
CREATE INDEX idx_payments_user ON public.payments(user_id);
CREATE INDEX idx_bookings_property ON public.bookings(property_id);

-- ==========================================
-- SEED the two properties
-- ==========================================
INSERT INTO public.properties (
  slug, name, tagline, description, location, block_label,
  bedrooms, bathrooms, max_guests,
  price_monthly_kes_cents, price_nightly_kes_cents, price_per_night_usd,
  supports_monthly, supports_nightly, supports_furnished_option,
  hero_image_url, sort_order
) VALUES (
  '2-bedroom-apartment',
  '2 Bedroom Apartment',
  'Luxury Stay. Prime Location. Seamless Comfort.',
  'Spacious 2-bedroom residence with city views, ensuite bathrooms, modern kitchen and 24/7 secure parking.',
  'Kilimani, Nairobi',
  NULL,
  2, 2, 4,
  15000000, 800000, 120,
  true, true, false,
  '/assets/gallery/images/bedrooms/bedroom-1.jpg', 1
);

INSERT INTO public.properties (
  slug, name, tagline, description, location, block_label,
  bedrooms, bathrooms, max_guests,
  price_monthly_kes_cents, price_monthly_furnished_kes_cents,
  supports_monthly, supports_nightly, supports_furnished_option,
  hero_video_url, sort_order
) VALUES (
  '1-bedroom-block-b',
  '1 Bedroom Apartment',
  'Modern living in Block B — your private sanctuary.',
  'A beautifully appointed 1-bedroom apartment in Block B, available furnished or unfurnished on a monthly basis.',
  'Kilimani, Nairobi',
  'Block B',
  1, 1, 2,
  7000000, 8500000,
  true, false, true,
  '/assets/properties/block-b/1br-tour.mp4', 2
);