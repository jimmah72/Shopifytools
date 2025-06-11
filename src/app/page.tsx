'use client';

import { Paper, Typography, Box } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import InventoryIcon from "@mui/icons-material/Inventory";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";

const StatCard = ({ title, value, icon: Icon, trend }: { title: string; value: string; icon: any; trend?: string }) => (
  <Paper elevation={2} sx={{ p: 3 }}>
    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
      <Icon sx={{ fontSize: 40, color: "primary.main", mr: 2 }} />
      <Typography variant="h6" color="text.secondary">
        {title}
      </Typography>
    </Box>
    <Typography variant="h4" component="div" sx={{ mb: 1 }}>
      {value}
    </Typography>
    {trend && (
      <Typography variant="body2" color="success.main" sx={{ display: "flex", alignItems: "center" }}>
        <TrendingUpIcon sx={{ mr: 0.5 }} fontSize="small" />
        {trend}
      </Typography>
    )}
  </Paper>
);

export default function DashboardPage() {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4 }}>
        Dashboard Overview
      </Typography>

      <Box sx={{ 
        display: "grid", 
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, 1fr)",
          md: "repeat(4, 1fr)"
        },
        gap: 3
      }}>
        <StatCard
          title="Total Sales"
          value="$24,780"
          icon={MonetizationOnIcon}
          trend="+12% from last month"
        />
        <StatCard
          title="Orders"
          value="156"
          icon={ShoppingCartIcon}
          trend="+8% from last month"
        />
        <StatCard
          title="Products"
          value="89"
          icon={InventoryIcon}
        />
        <StatCard
          title="Revenue"
          value="$18,230"
          icon={MonetizationOnIcon}
          trend="+15% from last month"
        />
      </Box>
    </Box>
  );
}
