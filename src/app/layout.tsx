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
    <html lang="en">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
