# Meta App Approval URLs

## For Facebook App Configuration

Use these exact URLs when setting up your Facebook app for Shopify Tools:

### App Settings → Basic

```
Privacy Policy URL: https://shopifytoolsprofit.netlify.app/privacy
Terms of Service URL: https://shopifytoolsprofit.netlify.app/terms
```

### Valid OAuth Redirect URIs

```
https://shopifytoolsprofit.netlify.app/api/ad-spend/facebook/callback
http://localhost:3000/api/ad-spend/facebook/callback
```

### Permissions to Request

```
✅ ads_read
✅ ads_management  
✅ business_management
✅ read_insights
```

## For Google Cloud Console

### OAuth 2.0 Client ID - Authorized Redirect URIs

```
https://shopifytoolsprofit.netlify.app/api/ad-spend/google/callback
http://localhost:3000/api/ad-spend/google/callback
```

## Test URLs (Publicly Accessible)

✅ Privacy Policy: https://shopifytoolsprofit.netlify.app/privacy  
✅ Terms of Service: https://shopifytoolsprofit.netlify.app/terms  
✅ Ad Spend Page: https://shopifytoolsprofit.netlify.app/ad-spend (requires login)

## Environment Variables for Production

```bash
# Update your Netlify environment variables
NEXTAUTH_URL=https://shopifytoolsprofit.netlify.app
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_ADS_DEVELOPER_TOKEN=your-developer-token
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
```

## Verification Checklist

- [ ] Privacy policy loads without login at `/privacy`
- [ ] Terms of service loads without login at `/terms`
- [ ] Facebook app configured with correct redirect URI
- [ ] Google OAuth app configured with correct redirect URI
- [ ] Meta app submitted for review with required permissions
- [ ] All environment variables set in Netlify 