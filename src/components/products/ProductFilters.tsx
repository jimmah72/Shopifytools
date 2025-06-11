import { Box, TextField, MenuItem, Stack, FormControl, InputLabel, Select, SelectChangeEvent } from '@mui/material';

interface ProductFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  stockFilter: string;
  onStockFilterChange: (value: string) => void;
}

export default function ProductFilters({
  search,
  onSearchChange,
  sortBy,
  onSortChange,
  stockFilter,
  onStockFilterChange,
}: ProductFiltersProps) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
      <TextField
        label="Search products"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search by name, description..."
        sx={{ flexGrow: 1 }}
      />

      <FormControl sx={{ minWidth: 200 }}>
        <InputLabel id="sort-by-label">Sort by</InputLabel>
        <Select
          labelId="sort-by-label"
          value={sortBy}
          label="Sort by"
          onChange={(e: SelectChangeEvent) => onSortChange(e.target.value)}
        >
          <MenuItem value="title_asc">Name (A-Z)</MenuItem>
          <MenuItem value="title_desc">Name (Z-A)</MenuItem>
          <MenuItem value="price_asc">Price (Low to High)</MenuItem>
          <MenuItem value="price_desc">Price (High to Low)</MenuItem>
          <MenuItem value="inventory_asc">Stock (Low to High)</MenuItem>
          <MenuItem value="inventory_desc">Stock (High to Low)</MenuItem>
        </Select>
      </FormControl>

      <FormControl sx={{ minWidth: 200 }}>
        <InputLabel id="stock-filter-label">Stock status</InputLabel>
        <Select
          labelId="stock-filter-label"
          value={stockFilter}
          label="Stock status"
          onChange={(e: SelectChangeEvent) => onStockFilterChange(e.target.value)}
        >
          <MenuItem value="all">All products</MenuItem>
          <MenuItem value="in_stock">In stock</MenuItem>
          <MenuItem value="out_of_stock">Out of stock</MenuItem>
          <MenuItem value="low_stock">Low stock (&lt; 10)</MenuItem>
        </Select>
      </FormControl>
    </Stack>
  );
} 