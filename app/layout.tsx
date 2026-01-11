import type { Metadata } from "next";
import "./globals.css";
import SplashIntro from "@/components/SplashIntro";

export const metadata: Metadata = {
  title: "HR Agent Dashboard",
  description: "Agentic onboarding & referral triage",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SplashIntro />
        {children}
      </body>
    </html>
  );
}
