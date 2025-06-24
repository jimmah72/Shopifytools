'use client'

import { useState } from 'react'
import { Box, Card, Typography, Button, Alert, LinearProgress, Chip } from '@mui/material'
import { Upload, CloudUpload, CheckCircle, Error } from '@mui/icons-material'

interface UploadResult {
  success: boolean
  message: string
  recordCount?: number
  errors?: string[]
}

export default function AdSpendUploadPage() {
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState<UploadResult | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFileUpload = async (file: File, platform: 'google_ads' | 'facebook_ads') => {
    setUploading(true)
    setResults(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('platform', platform)

    try {
      const response = await fetch('/api/ad-spend/upload', {
        method: 'POST',
        body: formData
      })

      const result: UploadResult = await response.json()
      setResults(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err) || 'Unknown error'
      setResults({
        success: false,
        message: 'Failed to upload file',
        errors: [errorMessage]
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, platform: 'google_ads' | 'facebook_ads') => {
    e.preventDefault()
    setDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    const csvFile = files.find(file => file.name.toLowerCase().endsWith('.csv'))
    
    if (csvFile) {
      handleFileUpload(csvFile, platform)
    } else {
      setResults({
        success: false,
        message: 'Please upload a CSV file',
        errors: ['Only CSV files are supported']
      })
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, platform: 'google_ads' | 'facebook_ads') => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file, platform)
    }
  }

  const UploadCard = ({ 
    platform, 
    title, 
    description, 
    color 
  }: { 
    platform: 'google_ads' | 'facebook_ads'
    title: string
    description: string
    color: string
  }) => (
    <Card 
      sx={{ 
        p: 3, 
        border: dragOver ? `2px dashed ${color}` : '2px dashed #ddd',
        backgroundColor: dragOver ? `${color}10` : 'white',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        '&:hover': {
          borderColor: color,
          backgroundColor: `${color}05`
        }
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => handleDrop(e, platform)}
    >
      <Box sx={{ textAlign: 'center' }}>
        <CloudUpload sx={{ fontSize: 48, color: color, mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {description}
        </Typography>
        
        <input
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          id={`upload-${platform}`}
          onChange={(e) => handleFileSelect(e, platform)}
        />
        <label htmlFor={`upload-${platform}`}>
          <Button
            variant="contained"
            component="span"
            startIcon={<Upload />}
            disabled={uploading}
            sx={{ 
              backgroundColor: color,
              '&:hover': { backgroundColor: `${color}dd` }
            }}
          >
            Choose CSV File
          </Button>
        </label>
        
        <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
          Drag and drop a CSV file here or click to browse
        </Typography>
      </Box>
    </Card>
  )

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Ad Spend Data Import
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Upload your ad spend CSV files from Google Ads and Meta/Facebook Ads to track your advertising costs and calculate accurate profit margins.
      </Typography>

      {uploading && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress />
          <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
            Processing CSV file...
          </Typography>
        </Box>
      )}

      {results && (
        <Alert 
          severity={results.success ? 'success' : 'error'} 
          sx={{ mb: 3 }}
          icon={results.success ? <CheckCircle /> : <Error />}
        >
          <Typography variant="body1">
            {results.message}
          </Typography>
          {results.recordCount && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Successfully imported {results.recordCount} ad spend records
            </Typography>
          )}
          {results.errors && results.errors.length > 0 && (
            <Box sx={{ mt: 1 }}>
              {results.errors.map((error, index) => (
                <Typography key={index} variant="body2" color="error">
                  • {error}
                </Typography>
              ))}
            </Box>
          )}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 4 }}>
        <UploadCard
          platform="google_ads"
          title="Google Ads"
          description="Upload your Google Ads performance report CSV. Include columns for Day, Campaign, Cost."
          color="#4285F4"
        />
        
        <UploadCard
          platform="facebook_ads"
          title="Meta/Facebook Ads"
          description="Upload your Facebook/Meta Ads report CSV. Include columns for Date, Campaign Name, Amount Spent."
          color="#1877F2"
        />
      </Box>

      <Card sx={{ p: 3, backgroundColor: '#f5f5f5' }}>
        <Typography variant="h6" gutterBottom>
          📋 CSV Format Requirements
        </Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              <Chip label="Google Ads" color="primary" size="small" sx={{ mr: 1 }} />
              Required Columns:
            </Typography>
            <Typography variant="body2" component="div">
              • <strong>Day</strong> (date format)<br/>
              • <strong>Campaign</strong><br/>
              • <strong>Cost</strong> (numeric value)
            </Typography>
          </Box>
          
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              <Chip label="Meta/Facebook" color="primary" size="small" sx={{ mr: 1 }} />
              Required Columns:
            </Typography>
            <Typography variant="body2" component="div">
              • <strong>Date</strong> (YYYY-MM-DD format)<br/>
              • <strong>Campaign Name</strong><br/>
              • <strong>Amount Spent</strong> (numeric value)
            </Typography>
          </Box>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          💡 <strong>Tip:</strong> Export your reports with daily breakdown for the most accurate profit tracking.
        </Typography>
      </Card>
    </Box>
  )
} 