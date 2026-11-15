import localFont from "next/font/local";
export const adminSans = localFont({
  src: "../public/fonts/DMSans-Latin.woff2",
  variable: "--font-admin-sans",
  display: "swap",
});
export const brandBubbles = localFont({
  src: "../public/fonts/RubikBubbles-Latin.woff2",
  variable: "--font-admin-brand",
  weight: "400",
  display: "swap",
});

export const studioHand = localFont({
  src: "../public/fonts/ZCOOLKuaiLe.woff2",
  variable: "--font-studio-hand",
  weight: "400",
  display: "swap",
  preload: false,
});
