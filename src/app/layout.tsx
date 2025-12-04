import type { Metadata } from "next";
import "./globals.css";

import { MainNav } from "@/components/main-nav";
import { AuthProvider } from "@/components/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { AppFooter } from "@/components/app-footer";
import { MiniTimer } from "@/components/mini-timer";
import { ActiveSessionProvider } from "@/components/active-session-context";
import { ScrollToTop } from "@/components/scroll-to-top";

import { Inter, JetBrains_Mono } from "next/font/google";

const geistSans = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Dev Workflow Focus Tracker",
  description: "Log what you actually shipped this week.",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          {/* reset scroll on route change */}
          <ScrollToTop />

          <ActiveSessionProvider>
            <AuthProvider>
              <MainNav />

              {/* main scrollable area */}
              <main
                data-scroll-root
                className="min-h-[calc(100vh-3.5rem)] px-4 py-6 md:px-8 lg:py-10"
              >
                <div className="mx-auto flex max-w-6xl flex-col gap-8">
                  {children}
                </div>
              </main>

              <AppFooter />

              {/* Floating mini timer, visible across routes */}
              <MiniTimer />
            </AuthProvider>
          </ActiveSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
