import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { UpdatePrompt } from "./components/UpdatePrompt";
import { ShellNav } from "./components/ShellNav";
import { GlobalFooter } from "./components/GlobalFooter";
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
  themeColor: "#0a0a0b",
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
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0a0a0b" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('theme');
                if (theme === 'light') {
                  document.documentElement.classList.remove('dark');
                } else {
                  document.documentElement.classList.add('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-cora-bg text-cora-text transition-colors duration-300`}
      >
        <TelemetryProvider>
          <UpdatePrompt />
          <div className="flex min-h-screen w-full bg-cora-bg text-cora-text">
            <ShellNav />
            <main className="flex-1 md:ml-64 w-full relative pb-32 md:pb-0 min-h-screen">
              {children}
            </main>
          </div>
          <GlobalFooter />
        </TelemetryProvider>
      </body>
    </html>
  );
}
