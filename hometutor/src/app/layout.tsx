import type { Metadata } from "next";
import { Figtree, Hedvig_Letters_Serif } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

// Headings: a warm humanist serif with an optical-size axis (sharper at large sizes). One weight, no italic.
const hedvig = Hedvig_Letters_Serif({
  variable: "--font-hedvig",
  subsets: ["latin"],
  axes: ["opsz"],
});

// Body and interface: a friendly geometric sans that stays clear at small sizes and in Indian-English text.
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "HomeTutor: home tutors in Pune", template: "%s | HomeTutor" },
  description: "Find a checked home tutor in Pune for Class 1–12 and exam prep. Read real profiles and book a free demo class.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={`${hedvig.variable} ${figtree.variable}`}>
      <body>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
