import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { UpdatePrompt } from "./components/UpdatePrompt";
import { GlobalFooter } from "./components/GlobalFooter";
import { TelemetryProvider } from "./components/TelemetryProvider";
import KhoraSplash from "./components/os/KhoraSplash";
import KhoraShell from "./components/os/KhoraShell";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

const geist600 = Geist({
    weight: "600",
    variable: "--font-geist",
    subsets: ["latin"],
});

const GUION_TEMA =
    "try{var t=localStorage.getItem('khora-theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark');}catch(e){document.documentElement.setAttribute('data-theme','dark');}";

export const metadata: Metadata = {
    title: "Khora",
    description: "Memoria continua",
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
        <html lang="es" suppressHydrationWarning data-theme="dark" className={geist600.variable}>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
                <meta name="theme-color" content="#0a0a0b" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                <script dangerouslySetInnerHTML={{ __html: GUION_TEMA }} />
            </head>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <TelemetryProvider>
                    <UpdatePrompt />
                    <KhoraSplash />
                    <KhoraShell>{children}</KhoraShell>
                    <GlobalFooter />
                </TelemetryProvider>
            </body>
        </html>
    );
}