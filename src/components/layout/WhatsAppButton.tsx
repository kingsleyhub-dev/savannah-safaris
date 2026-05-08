import { useContactInfo, toWaNumber } from "@/hooks/useContactInfo";

/** Official WhatsApp glyph (simplified). Inherits color via fill="currentColor". */
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <path
      fill="currentColor"
      d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.888 2.722.888.817 0 2.15-.43 2.493-1.234.187-.43.187-.802.115-.93-.087-.215-.43-.323-.945-.58z"
    />
    <path
      fill="currentColor"
      d="M16.063 0C7.346 0 .26 7.085.26 15.802c0 2.778.73 5.499 2.105 7.892L0 32l8.466-2.222a15.762 15.762 0 0 0 7.597 1.928h.007C24.787 31.706 32 24.62 32 15.9 32 11.682 30.387 7.71 27.41 4.722A15.65 15.65 0 0 0 16.063 0zm0 28.943h-.005a13.116 13.116 0 0 1-6.69-1.83l-.48-.286-4.965 1.302 1.327-4.84-.314-.498a13.072 13.072 0 0 1-2.005-6.99c0-7.225 5.88-13.106 13.137-13.106 3.504 0 6.798 1.367 9.275 3.847a13.011 13.011 0 0 1 3.84 9.272c-.005 7.226-5.886 13.13-13.12 13.13z"
    />
  </svg>
);

export const WhatsAppButton = () => {
  const contact = useContactInfo();
  const num = toWaNumber(contact.whatsapp_primary.number);
  return (
    <a
      href={`https://wa.me/${num}?text=Hi%20Savannah%20Safaris%2C%20I'd%20like%20to%20enquire%20about%20a%20booking.`}
      target="_blank"
      rel="noopener"
      aria-label={`Chat with ${contact.whatsapp_primary.label} on WhatsApp`}
      className="fixed bottom-6 left-6 z-40 size-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-elegant hover:scale-110 transition-smooth animate-float"
    >
      <WhatsAppIcon className="size-7" />
      <span className="absolute inset-0 rounded-full animate-ping bg-[#25D366]/40" />
    </a>
  );
};
