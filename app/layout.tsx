import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SidebarLayout } from "../components/SidebarLayout";
import { Providers } from "../components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Booster AI",
  description: "AI Coloring Book Generator",
};

import { auth } from "@/auth";
import { AdminDebugPanel } from "@/components/admin/AdminDebugPanel";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  // Fetch fresh user data from DB to ensure role is up to date (bypassing stale JWT)
  let isAdmin = false;
  if (session?.user?.email) {
    try {
      const { db } = await import("@/lib/db/drizzle");
      const { users } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      const user = await db.query.users.findFirst({
        where: eq(users.email, session.user.email),
        columns: { role: true, isAdmin: true }
      });

      if (user) {
        isAdmin = user.role === 'admin' || user.isAdmin === true;
      }
    } catch (e) {
      console.error("Failed to fetch user role in layout:", e);
      // Fallback to session
      isAdmin = session?.user?.role === 'admin' || session?.user?.isAdmin === true;
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          <SidebarLayout>
            {children}
          </SidebarLayout>
          {isAdmin && <AdminDebugPanel />}
        </Providers>
      </body>
    </html>
  );
}
