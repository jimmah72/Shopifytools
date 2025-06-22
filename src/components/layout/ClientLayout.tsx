'use client';

import { usePathname } from 'next/navigation';
import ThemeRegistry from "@/components/ThemeRegistry/ThemeRegistry";
import MuiThemeProvider from "@/components/ThemeRegistry/MuiThemeProvider";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { StoreProvider } from "@/contexts/StoreContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/privacy', '/terms'];

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  return (
    <ThemeProvider>
      <ThemeRegistry>
        <MuiThemeProvider>
          <AuthProvider>
            {isPublicRoute ? (
              // Public pages - no authentication required, no dashboard layout
              children
            ) : (
              // Protected pages - require authentication and dashboard layout
              <ProtectedRoute>
                <StoreProvider>
                  <DashboardLayout>{children}</DashboardLayout>
                </StoreProvider>
              </ProtectedRoute>
            )}
          </AuthProvider>
        </MuiThemeProvider>
      </ThemeRegistry>
    </ThemeProvider>
  );
} 