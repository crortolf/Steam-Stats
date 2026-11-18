import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteNav } from "@/components/site-nav";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Steam Stats",
  description:
    "Explore your Steam friend network, track what is new with your friends' games, and compare achievements.",
  generator: "v0.app",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#171a21",
};

/**
 * The frame around every page: sets the fonts and dark theme, provides the
 * signed in user to every page (AuthProvider), and shows the navigation bar
 * above the page's content. Vercel Analytics is only added in production.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} bg-background`}
    >
      <body className="min-h-screen font-sans antialiased">
        <AuthProvider>
          <SiteNav />
          {children}
        </AuthProvider>
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
