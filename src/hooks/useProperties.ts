import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Property {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  location: string;
  block_label: string | null;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  price_monthly_kes_cents: number | null;
  price_monthly_furnished_kes_cents: number | null;
  price_nightly_kes_cents: number | null;
  price_per_night_usd: number | null;
  supports_monthly: boolean;
  supports_nightly: boolean;
  supports_furnished_option: boolean;
  hero_image_url: string | null;
  hero_video_url: string | null;
  amenities_inherit: boolean;
  is_active: boolean;
  sort_order: number;
}

/** Format KES cents → "KES 70,000". */
export const formatKES = (cents: number | null | undefined) => {
  if (cents == null) return "—";
  return `KES ${(cents / 100).toLocaleString("en-KE")}`;
};

export const useProperties = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (!error && data) setProperties(data as Property[]);
      setLoading(false);
    })();
  }, []);

  return { properties, loading };
};

export const useProperty = (slug: string | undefined) => {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("properties")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      setProperty((data as Property) ?? null);
      setLoading(false);
    })();
  }, [slug]);

  return { property, loading };
};
