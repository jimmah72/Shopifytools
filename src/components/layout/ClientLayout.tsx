'use client';

import ThemeRegistry from "@/components/ThemeRegistry/ThemeRegistry";
import MuiThemeProvider from "@/components/ThemeRegistry/MuiThemeProvider";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { StoreProvider } from "@/contexts/StoreContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <ThemeRegistry>
        <MuiThemeProvider>
          <AuthProvider>
            <ProtectedRoute>
              <StoreProvider>
                <DashboardLayout>{children}</DashboardLayout>
              </StoreProvider>
            </ProtectedRoute>
          </AuthProvider>
        </MuiThemeProvider>
      </ThemeRegistry>
    </ThemeProvider>
  );
} 