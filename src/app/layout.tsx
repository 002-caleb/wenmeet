import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { Outfit } from "next/font/google";
import { SiteStatusBanner } from "@/components/SiteStatusBanner";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans", weight: ["400", "500", "600", "700", "800"] });

export const metadata = {
  title: "WenMeet",
  description: "Find a time. Share one link. Get the meeting booked.",
  openGraph: {
    title: "WenMeet",
    description: "Find a time. Share one link. Get the meeting booked.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "WenMeet",
    description: "Find a time. Share one link. Get the meeting booked.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={outfit.variable}>
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <SiteStatusBanner />
        <ClerkProvider>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}