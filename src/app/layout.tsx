'use client';

import type { Metadata } from "next";
import ThemeRegistry from "@/components/ThemeRegistry/ThemeRegistry";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { StoreProvider } from "@/contexts/StoreContext";
import "@/styles/globals.scss";

export const metadata: Metadata = {
  title: "Shopify Analytics",
  description: "Advanced analytics and profit tracking for your Shopify store",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>
          <StoreProvider>
            <DashboardLayout>{children}</DashboardLayout>
          </StoreProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
