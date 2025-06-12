'use client';

import ThemeRegistry from "@/components/ThemeRegistry/ThemeRegistry";
import MuiThemeProvider from "@/components/ThemeRegistry/MuiThemeProvider";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { StoreProvider } from "@/contexts/StoreContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <ThemeRegistry>
        <MuiThemeProvider>
          <StoreProvider>
            <DashboardLayout>{children}</DashboardLayout>
          </StoreProvider>
        </MuiThemeProvider>
      </ThemeRegistry>
    </ThemeProvider>
  );
} 