'use client';

import ThemeRegistry from "@/components/ThemeRegistry/ThemeRegistry";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { StoreProvider } from "@/contexts/StoreContext";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeRegistry>
      <StoreProvider>
        <DashboardLayout>{children}</DashboardLayout>
      </StoreProvider>
    </ThemeRegistry>
  );
} 