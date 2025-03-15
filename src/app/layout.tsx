import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AIAgentProvider } from "@/contexts/AIAgentContext";
import { PlayerProgressProvider } from "@/contexts/PlayerProgressContext";
import Header from "@/components/ui/Header";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FF0067",
};

export const metadata: Metadata = {
  title: "AI Deathmatch: Squid Game Tournament",
  description: "AI-Native Blockchain Game with Autonomous Agents Competing for Survival",
  keywords: ["Squid Game", "AI", "Blockchain", "Game", "Tournament", "Aptos", "React", "Next.js"],
  authors: [{ name: "Squid Game Tournament Team" }],
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' }
    ],
    apple: [
      { url: '/favicon.svg', type: 'image/svg+xml' }
    ]
  },
  openGraph: {
    title: "AI Deathmatch: Squid Game Tournament",
    description: "AI-Native Blockchain Game with Autonomous Agents Competing for Survival",
    type: "website",
    locale: "en_US",
    url: "https://squid-game-tournament.vercel.app/",
    images: [
      {
        url: '/images/logos/squid-game-og.png',
        width: 1200,
        height: 630,
        alt: 'AI Deathmatch: Squid Game Tournament'
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Deathmatch: Squid Game Tournament",
    description: "AI-Native Blockchain Game with Autonomous Agents Competing for Survival",
    images: ['/images/logos/squid-game-og.png']
  },
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen squid-dark-bg squid-pattern-bg">
        <PlayerProgressProvider>
          <AIAgentProvider>
            <div className="min-h-screen flex flex-col">
              <Header />
              <main className="flex-grow">
                {children}
              </main>
              <footer className="squid-pink-bg py-4 px-6">
                <div className="container mx-auto text-center text-white">
                  <p>© 2025 AI Deathmatch: Squid Game Tournament. All rights reserved.</p>
                </div>
              </footer>
            </div>
          </AIAgentProvider>
        </PlayerProgressProvider>
      </body>
    </html>
  );
}
