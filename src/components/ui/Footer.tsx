import Link from "next/link";
import { Logo } from "./Logo";

const FOOTER_COLUMNS = [
  {
    title: "Buy Accounts",
    links: [
      { label: "Buy YouTube channels", href: "/buy/youtube-channels" },
      { label: "Buy Instagram accounts", href: "/buy/instagram-accounts" },
      { label: "Buy TikTok accounts", href: "/buy/tiktok-accounts" },
      { label: "Buy Facebook pages", href: "/buy/facebook-pages" },
      { label: "Buy Telegram channels", href: "/buy/telegram-channels" },
      { label: "Buy X accounts", href: "/buy/twitter-accounts" },
    ],
  },
  {
    title: "Marketplace",
    links: [
      { label: "Browse listings", href: "/listings" },
      { label: "Sellers", href: "/sellers" },
      { label: "Start selling", href: "/register" },
      { label: "Pricing", href: "/pricing" },
      { label: "Fees", href: "/fees" },
    ],
  },
  {
    title: "Trust & Safety",
    links: [
      { label: "How escrow works", href: "/escrow-guide" },
      { label: "Refund policy", href: "/refunds" },
      { label: "Verified sellers", href: "/listings?verified=true" },
      { label: "FAQ", href: "/faq" },
      { label: "Help Center", href: "/help" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
      { label: "API Docs", href: "/docs" },
      { label: "Affiliate", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Cookie Policy", href: "/cookies" },
      { label: "AML Policy", href: "/aml" },
      { label: "KYC Policy", href: "/kyc-policy" },
      { label: "Sitemap", href: "/sitemap" },
      { label: "Status", href: "/status" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-surface-border bg-surface/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Main grid */}
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-7">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Logo size="md" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              The escrow-protected marketplace for buying and selling social media accounts safely.
            </p>
            {/* Contact */}
            <div className="mt-4 flex flex-col gap-2">
              <a href="tel:+17737156402" className="flex items-center gap-2 text-sm text-muted transition-colors hover:text-brand-600">
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                +1 (773) 715-6402
              </a>
              <a href="mailto:support@accsmarkets.org" className="flex items-center gap-2 text-sm text-muted transition-colors hover:text-brand-600">
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                support@accsmarkets.org
              </a>
            </div>
            {/* Social icons */}
            <div className="mt-5 flex items-center gap-3">
              <a href="https://twitter.com/accsmarkets" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border text-muted transition-all hover:border-brand-200 hover:text-brand-500 hover:shadow-sm" aria-label="Twitter">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://t.me/accsmarkets" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border text-muted transition-all hover:border-brand-200 hover:text-brand-500 hover:shadow-sm" aria-label="Telegram">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              </a>
              <a href="https://instagram.com/accsmarkets" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border text-muted transition-all hover:border-brand-200 hover:text-brand-500 hover:shadow-sm" aria-label="Instagram">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>
              </a>
              <a href="https://www.facebook.com/accsmarkets/" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border text-muted transition-all hover:border-brand-200 hover:text-brand-500 hover:shadow-sm" aria-label="Facebook">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
              </a>
              <a href="https://chat.whatsapp.com/FF635yUd2h96aeY7uDX5Lp" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border text-muted transition-all hover:border-brand-200 hover:text-brand-500 hover:shadow-sm" aria-label="WhatsApp">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-foreground">{col.title}</p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-muted transition-colors hover:text-brand-600">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Payment methods & trust badges */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-surface-border py-6">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted">Accepted:</span>
            <div className="flex items-center gap-2">
              {/* BTC */}
              <span className="flex h-7 items-center gap-1 rounded-md border border-surface-border bg-background px-2 text-xs font-medium text-muted">
                <svg className="h-3.5 w-3.5 text-[#f7931a]" viewBox="0 0 24 24" fill="currentColor"><path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.546zm-6.35-4.613c.24-1.59-.974-2.45-2.64-3.03l.54-2.153-1.315-.33-.52 2.1c-.345-.087-.7-.168-1.05-.25l.526-2.11-1.32-.33-.54 2.16c-.285-.065-.565-.13-.84-.2l.001-.007-1.815-.45-.35 1.407s.975.224.955.238c.535.136.63.494.614.78l-.614 2.46c.037.01.085.025.138.047l-.14-.035-.86 3.45c-.065.16-.23.4-.6.31.015.02-.96-.24-.96-.24l-.66 1.51 1.71.426.93.24-.55 2.19 1.32.33.54-2.17c.36.1.705.19 1.05.273l-.51 2.15 1.32.33.545-2.19c2.24.427 3.93.254 4.64-1.774.57-1.637-.03-2.58-1.217-3.196.854-.2 1.508-.76 1.68-1.93h.01zm-3.01 4.22c-.404 1.64-3.157.75-4.05.53l.72-2.9c.896.23 3.757.67 3.33 2.37zm.41-4.24c-.37 1.49-2.662.735-3.405.55l.654-2.64c.744.18 3.137.52 2.75 2.084v.006z"/></svg>
                BTC
              </span>
              {/* USDT */}
              <span className="flex h-7 items-center gap-1 rounded-md border border-surface-border bg-background px-2 text-xs font-medium text-muted">
                <svg className="h-3.5 w-3.5 text-[#26a17b]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.374 0 12s5.374 12 12 12 12-5.374 12-12S18.629 0 12 0zm5.28 7.392H6.72V5.76h10.56v1.632zm-3.168 2.784v-.96H9.888v.96c-2.784.144-4.896.72-4.896 1.44 0 .72 2.112 1.296 4.896 1.44v4.608h2.224v-4.608c2.784-.144 4.896-.72 4.896-1.44 0-.72-2.112-1.296-4.896-1.44zm0 2.304v-.048c-.048 0-.096.048-.192.048h-.048c-.048 0-.096 0-.192-.048h-.048c-2.4-.096-4.224-.576-4.224-1.152 0-.528 1.632-.96 3.84-1.104v1.728c.192.048.384.048.624.048.192 0 .384 0 .576-.048V10.32c2.208.144 3.84.576 3.84 1.104 0 .576-1.824 1.056-4.176 1.152v-.096z"/></svg>
                USDT
              </span>
              {/* ETH */}
              <span className="flex h-7 items-center gap-1 rounded-md border border-surface-border bg-background px-2 text-xs font-medium text-muted">
                <svg className="h-3.5 w-3.5 text-[#627eea]" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/></svg>
                ETH
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-success/30 bg-success/5 px-3 py-1 text-xs font-medium text-success">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Escrow Protected
            </span>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-surface-border py-6 text-xs text-muted sm:flex-row">
          <p>&copy; {new Date().getFullYear()} AccsMarkets. All rights reserved.</p>
          <p>All account transfers processed through secure escrow.</p>
        </div>
      </div>
    </footer>
  );
}
