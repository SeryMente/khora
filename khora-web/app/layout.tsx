import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { UpdatePrompt } from "./components/UpdatePrompt";
import { ShellNav } from "./components/ShellNav";
import { TelemetryProvider } from "./components/TelemetryProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Khora",
  description: "Your intelligent companion",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Khora",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#4f46e5" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
      >
        <TelemetryProvider>
          <UpdatePrompt />
          <div className="flex min-h-screen w-full bg-[#08080a] text-gray-200">
            <ShellNav />
            <main className="flex-1 md:ml-64 w-full relative pb-32 md:pb-0 min-h-screen">
              {children}
            </main>
          </div>
        </TelemetryProvider>
      </body>
    </html>
  );
}
