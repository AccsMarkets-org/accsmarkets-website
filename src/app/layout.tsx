import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { Providers } from "./providers";
import { PwaInit } from "@/components/pwa/PwaInit";
import messages from "../../messages/en.json";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://accsmarkets.org"),
  title: {
    default: "AccsMarkets — Buy & Sell Social Media Accounts",
    template: "%s — AccsMarkets",
  },
  description:
    "A secure peer-to-peer marketplace for buying and selling social media accounts, protected by escrow.",
  keywords: ["buy social media accounts", "sell instagram account", "buy youtube channel", "social media marketplace", "account escrow"],
  authors: [{ name: "AccsMarkets" }],
  creator: "AccsMarkets",
  publisher: "AccsMarkets",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://accsmarkets.org",
    siteName: "AccsMarkets",
    title: "AccsMarkets — Buy & Sell Social Media Accounts",
    description: "A secure peer-to-peer marketplace for buying and selling social media accounts, protected by escrow.",
    images: [{ url: "https://accsmarkets.org/og-default.png", width: 1200, height: 630, alt: "AccsMarkets" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@accsmarkets",
    creator: "@accsmarkets",
    title: "AccsMarkets — Buy & Sell Social Media Accounts",
    description: "A secure peer-to-peer marketplace for buying and selling social media accounts, protected by escrow.",
    images: ["https://accsmarkets.org/og-default.png"],
  },
  alternates: { canonical: "https://accsmarkets.org" },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AccsMarkets",
  },
  // icons.apple generates the <link rel="apple-touch-icon"> tag — kept here
  // (not as a raw <link> in the JSX <head> below) specifically so nested
  // layouts like /admin can override it via their own metadata export.
  // Was previously a raw hardcoded link to "/apple-icon.png", a file that
  // doesn't exist on disk — "Add to Home Screen" has been 404ing this icon
  // site-wide. icon-180.png is Apple's recommended 180×180 touch-icon size.
  icons: { apple: "/icons/icon-180.png?v=2" },
};

export function generateViewport(): Viewport {
  return {
    themeColor: "#f97316",
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Blocking script: apply dark class before first paint to prevent FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('accsmarkets-theme');var d=document.documentElement;if(t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches)){d.classList.add('dark')}else{d.classList.remove('dark')}}catch(e){}})()`,
          }}
        />
        {/* AdSense — raw <script> so it appears verbatim in the server-rendered
            <head>; Google's verification crawler reads the raw HTML and does not
            wait for next/script's afterInteractive JS injection. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5723217807710259"
          crossOrigin="anonymous"
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-HF1Q29V5KC"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-HF1Q29V5KC');`}
        </Script>
        <Script id="meta-pixel-init" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','1687927305660768');fbq('track','PageView');`}
        </Script>
      </head>
      <body>
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1687927305660768&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        <NextIntlClientProvider locale="en" messages={messages}>
          <Providers>
            {children}
            <PwaInit />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
