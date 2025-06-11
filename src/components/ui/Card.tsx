'use client';

import { Paper, Box } from '@mui/material';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className }: CardProps) {
  return (
    <Paper 
      elevation={1} 
      sx={{ 
        p: 3,
        '&:hover': {
          boxShadow: 2,
          transform: 'translateY(-2px)',
        },
        transition: 'all 0.2s ease-in-out',
      }}
      className={className}
    >
      <Box>{children}</Box>
    </Paper>
  );
} 