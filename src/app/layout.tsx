import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import DashboardLayout from "@/components/layout/DashboardLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ShopifyTools - Analytics Dashboard",
  description: "Advanced analytics and profit tracking for your Shopify store",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-white text-gray-900 dark:bg-gray-900 dark:text-white`}>
        <ThemeProvider>
          <DashboardLayout>
            {children}
          </DashboardLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
