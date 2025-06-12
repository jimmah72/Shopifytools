'use client';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useTheme } from '@/contexts/ThemeContext';

export default function MuiThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme: appTheme } = useTheme();

  const theme = createTheme({
    palette: {
      mode: appTheme === 'dark' ? 'dark' : 'light',
      primary: {
        main: "#2563eb",
        light: "#3b82f6",
        dark: "#1d4ed8",
      },
      background: {
        default: appTheme === 'dark' ? "#0f172a" : "#f8fafc",
        paper: appTheme === 'dark' ? "#1e293b" : "#ffffff",
      },
      text: {
        primary: appTheme === 'dark' ? "#f8fafc" : "#0f172a",
        secondary: appTheme === 'dark' ? "#94a3b8" : "#64748b",
      },
    },
    typography: {
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
          },
        },
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  );
} 