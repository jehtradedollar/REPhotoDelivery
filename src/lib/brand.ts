// Studio branding shown across the app and in emails. Set with env vars.
export const brand = {
  name: process.env.NEXT_PUBLIC_STUDIO_NAME || "Northlight Media",
  short: process.env.NEXT_PUBLIC_STUDIO_SHORT_NAME || process.env.NEXT_PUBLIC_STUDIO_NAME?.split(" ")[0] || "Northlight",
  tagline: "Real estate photography, delivered.",
  email: process.env.NEXT_PUBLIC_STUDIO_EMAIL || "hello@northlight.example",
  phone: process.env.NEXT_PUBLIC_STUDIO_PHONE || "(530) 555-0100",
  photographer: process.env.NEXT_PUBLIC_PHOTOGRAPHER_NAME || "Jonathan",
};
