// N8N Function: Process Google Ads CSV from Gmail
// This function extracts CSV attachments from Gmail and converts them to webhook format

const processedItems = [];

for (const item of items) {
  // Get the Gmail message data
  const message = item.json;
  
  // Log the incoming data structure for debugging
  console.log('Gmail message received:', {
    id: message.id,
    subject: message.subject,
    attachments: message.attachments ? message.attachments.length : 0
  });
  
  // Check if message has attachments
  if (!message.attachments || message.attachments.length === 0) {
    console.log('No attachments found in email');
    continue;
  }
  
  // Process each attachment
  for (const attachment of message.attachments) {
    // Look for CSV files
    if (attachment.mimeType === 'text/csv' || 
        attachment.filename.toLowerCase().endsWith('.csv')) {
      
      console.log('Processing CSV attachment:', attachment.filename);
      
      try {
        // Get the CSV content (n8n downloads attachments as base64)
        let csvContent;
        if (attachment.content) {
          // If content is base64, decode it
          csvContent = Buffer.from(attachment.content, 'base64').toString('utf8');
        } else {
          console.log('No content found in attachment');
          continue;
        }
        
        // Parse CSV content
        const lines = csvContent.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          console.log('CSV has insufficient data');
          continue;
        }
        
        // Get headers from first row
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        console.log('CSV headers:', headers);
        
        // Process each data row
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          
          if (values.length !== headers.length) {
            console.log(`Row ${i} has mismatched columns, skipping`);
            continue;
          }
          
          // Create row object
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index];
          });
          
          // Extract and format data for webhook
          // Common Google Ads CSV column names:
          // - Date, Campaign, Cost, Clicks, Impressions, Conversions
          // - Day, Campaign name, Cost, Clicks, Impr., Conv.
          
          const webhookData = {
            apiKey: 'shopify-tools-webhook-2025',
            storeDomain: '25898e.myshopify.com',
            platform: 'google_ads',
            
            // Try different possible column names for spend/cost
            spend: parseFloat(
              row['Cost'] || 
              row['Spend'] || 
              row['Amount'] || 
              row['Total Cost'] ||
              '0'
            ),
            
            // Try different possible column names for date
            date: formatDate(
              row['Date'] || 
              row['Day'] || 
              row['Period'] ||
              new Date().toISOString().split('T')[0]
            ),
            
            // Campaign information
            campaignName: row['Campaign'] || 
                         row['Campaign name'] || 
                         row['Campaign Name'] || 
                         'Unknown Campaign',
            
            // Optional metrics
            impressions: parseInt(
              row['Impressions'] || 
              row['Impr.'] || 
              row['Impr'] || 
              '0'
            ),
            
            clicks: parseInt(
              row['Clicks'] || 
              row['Click'] || 
              '0'
            ),
            
            conversions: parseFloat(
              row['Conversions'] || 
              row['Conv.'] || 
              row['Conv'] || 
              '0'
            ),
            
            conversionValue: parseFloat(
              row['Conversion value'] || 
              row['Conv. value'] || 
              '0'
            )
          };
          
          // Only add if we have meaningful spend data
          if (webhookData.spend > 0) {
            console.log('Adding webhook data:', {
              date: webhookData.date,
              campaign: webhookData.campaignName,
              spend: webhookData.spend
            });
            
            processedItems.push({
              json: webhookData
            });
          }
        }
        
      } catch (error) {
        console.error('Error processing CSV:', error.message);
        console.error('CSV content preview:', csvContent.substring(0, 200));
      }
    }
  }
}

// Helper function to format date
function formatDate(dateStr) {
  try {
    // Handle various date formats
    let date;
    
    if (dateStr.includes('/')) {
      // MM/DD/YYYY or MM/DD/YY format
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const month = parts[0].padStart(2, '0');
        const day = parts[1].padStart(2, '0');
        let year = parts[2];
        
        // Handle 2-digit years
        if (year.length === 2) {
          year = '20' + year;
        }
        
        date = `${year}-${month}-${day}`;
      }
    } else if (dateStr.includes('-')) {
      // YYYY-MM-DD format (already correct)
      date = dateStr;
    } else {
      // Fallback to current date
      date = new Date().toISOString().split('T')[0];
    }
    
    // Validate the date
    const testDate = new Date(date);
    if (isNaN(testDate.getTime())) {
      throw new Error('Invalid date');
    }
    
    return date;
  } catch (error) {
    console.log('Date formatting error:', error.message, 'using current date');
    return new Date().toISOString().split('T')[0];
  }
}

console.log(`Processed ${processedItems.length} CSV rows into webhook format`);

// Return the processed items for the next node (Send to Netlify)
return processedItems;
