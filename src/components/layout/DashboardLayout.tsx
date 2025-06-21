'use client'

import { useState } from "react";
import { 
  Box, 
  AppBar, 
  Toolbar, 
  IconButton, 
  Typography, 
  Menu,
  MenuItem,
  Button,
  useTheme,
  Stack,
  useMediaQuery
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import InventoryIcon from "@mui/icons-material/Inventory";
import CampaignIcon from "@mui/icons-material/Campaign";
import SettingsIcon from "@mui/icons-material/Settings";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import Link from "next/link";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useTheme as useAppTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname } from 'next/navigation';
import LogoutIcon from "@mui/icons-material/Logout";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { text: "Dashboard", icon: <DashboardIcon />, href: "/" },
  { text: "Orders", icon: <ShoppingCartIcon />, href: "/orders" },
  { text: "Products", icon: <InventoryIcon />, href: "/products" },
  { text: "Fees", icon: <MonetizationOnIcon />, href: "/fees" },
  { text: "Ad Spend", icon: <CampaignIcon />, href: "/ad-spend" },
  { text: "Settings", icon: <SettingsIcon />, href: "/settings" },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const { theme: appTheme } = useAppTheme();
  const { logout, user } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const pathname = usePathname();

  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  const handleLogout = () => {
    logout();
  };

  const NavItems = () => (
    <>
      {menuItems.map((item) => (
        <Link key={item.text} href={item.href} style={{ textDecoration: "none" }}>
          <Button
            startIcon={item.icon}
            sx={{
              color: pathname === item.href ? 'primary.main' : 'text.primary',
              mx: 1,
              '&:hover': {
                bgcolor: appTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              },
              ...(pathname === item.href && {
                bgcolor: appTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              }),
            }}
          >
            {item.text}
          </Button>
        </Link>
      ))}
    </>
  );

  return (
    <Box 
      sx={{ 
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        bgcolor: theme.palette.background.default,
        color: theme.palette.text.primary
      }}
    >
      <AppBar 
        position="fixed" 
        sx={{ 
          bgcolor: appTheme === 'dark' ? '#0f172a' : theme.palette.background.paper,
          borderBottom: `1px solid ${theme.palette.divider}`,
          boxShadow: 'none'
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="h6" noWrap component="div" color="text.primary">
              Shopify Analytics
            </Typography>
            
            {!isMobile && (
              <Box sx={{ ml: 4 }}>
                <NavItems />
              </Box>
            )}
          </Stack>

          <Stack direction="row" alignItems="center" spacing={2}>
            <ThemeToggle />
            
            {/* User Info & Logout */}
            <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
              Welcome, {user?.username}
            </Typography>
            
            <Button
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              sx={{
                color: 'text.primary',
                '&:hover': {
                  bgcolor: appTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                },
              }}
            >
              {isMobile ? '' : 'Logout'}
            </Button>
            
            {isMobile && (
              <IconButton
                color="inherit"
                onClick={handleMobileMenuOpen}
                sx={{ color: theme.palette.text.primary }}
              >
                <MenuIcon />
              </IconButton>
            )}
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Mobile Menu */}
      <Menu
        anchorEl={mobileMenuAnchor}
        open={Boolean(mobileMenuAnchor)}
        onClose={handleMobileMenuClose}
        PaperProps={{
          sx: {
            bgcolor: appTheme === 'dark' ? '#0f172a' : theme.palette.background.paper,
            width: '200px',
            mt: 1
          }
        }}
      >
        {menuItems.map((item) => (
          <Link key={item.text} href={item.href} style={{ textDecoration: "none", color: "inherit" }}>
            <MenuItem 
              onClick={handleMobileMenuClose}
              sx={{
                color: theme.palette.text.primary,
                py: 1.5,
                ...(pathname === item.href && {
                  bgcolor: appTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                }),
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {item.icon}
                <Typography>{item.text}</Typography>
              </Box>
            </MenuItem>
          </Link>
        ))}
        
        {/* Mobile Logout */}
        <MenuItem 
          onClick={() => {
            handleMobileMenuClose();
            handleLogout();
          }}
          sx={{
            color: theme.palette.text.primary,
            py: 1.5,
            borderTop: `1px solid ${theme.palette.divider}`,
            mt: 1
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LogoutIcon />
            <Typography>Logout</Typography>
          </Box>
        </MenuItem>
      </Menu>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: "100%",
          mt: 8,
          bgcolor: theme.palette.background.default,
          color: theme.palette.text.primary
        }}
      >
        {children}
      </Box>
    </Box>
  );
} 