import type { Metadata } from "next";
import ClientLayout from "@/components/layout/ClientLayout";
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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-white dark:bg-gray-900 text-black dark:text-white">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
