'use client';

import { Paper, Box, Typography } from '@mui/material';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export default function Card({ children, className, title }: CardProps) {
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
      {title && (
        <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
          {title}
        </Typography>
      )}
      <Box>{children}</Box>
    </Paper>
  );
} 