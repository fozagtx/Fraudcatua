import type { Metadata } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const display = Space_Grotesk({
  variable: "--font-display-var",
  weight: "400",
  subsets: ["latin"],
});
const body = Inter({ variable: "--font-body-var", subsets: ["latin"] });
const mono = IBM_Plex_Mono({ variable: "--font-mono-var", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fraudcatua: understand where your money goes before you hit send",
  description:
    "Upload a phone-call recording. Fraudcatua transcribes it, checks the caller's claims, and shows you the evidence.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-ink font-body">
        <header className="border-b border-hairline">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-display text-xl tracking-tight">
              Fraudcatua
            </Link>
            <div className="hidden items-center gap-8 text-sm sm:flex">
              <Link href="/analyze" className="hover:text-blue transition-colors">
                Analyze
              </Link>
              <Link href="/finance" className="hover:text-blue transition-colors">
                Finance
              </Link>
              <Link href="/report" className="hover:text-blue transition-colors">
                Report a number
              </Link>
              <Link href="/how-it-works" className="hover:text-blue transition-colors">
                How it works
              </Link>
            </div>
            <Link href="/analyze" className="btn-pill btn-primary">
              Analyze a call
            </Link>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="bg-primary text-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
            <span className="mono-label text-white/60">FRAUDCATUA</span>
            <div className="flex gap-6 text-sm text-white/60">
              <Link href="/analyze" className="hover:text-white transition-colors">
                Analyze
              </Link>
              <Link href="/finance" className="hover:text-white transition-colors">
                Finance
              </Link>
              <Link href="/report" className="hover:text-white transition-colors">
                Report a number
              </Link>
              <Link href="/how-it-works" className="hover:text-white transition-colors">
                How it works
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
