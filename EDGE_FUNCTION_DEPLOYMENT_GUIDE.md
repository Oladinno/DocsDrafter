# Edge Function Deployment Guide

## Issue
The Supabase CLI deployment is failing due to network connectivity issues. This guide provides alternative deployment methods.

## Method 1: Manual Deployment via Supabase Dashboard

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Navigate to your project: `<YOUR_PROJECT_REF>`

2. **Access Edge Functions**
   - Click on "Edge Functions" in the left sidebar
   - Click "Create a new function" or edit existing `generate-document` function

3. **Copy Function Code**
   - Copy the entire content from `supabase/functions/generate-document/index.ts`
   - Paste it into the function editor in the dashboard

4. **Set Environment Variables**
   - In the dashboard, go to Settings → Environment Variables
   - Add the following variables:

5. **Deploy Function**
   - Click "Deploy" in the dashboard
   - Wait for deployment to complete

## Method 2: Alternative CLI Approach

If you want to try CLI again later:

1. **Ensure Docker is running** (if using local development)
2. **Check network connectivity**
3. **Try with VPN disabled** (sometimes corporate networks block Supabase)
4. **Use the following commands:**
   ```bash
   npx supabase login
   npx supabase link --project-ref <YOUR_PROJECT_REF>
   npx supabase functions deploy generate-document
   ```

## Verification

After deployment, test the function by:
1. Running the app
2. Trying to generate a document
3. Check the console logs for detailed error information
4. The enhanced error handling will now provide more specific error messages

## Troubleshooting

- **Environment Variables**: Ensure they are set correctly in the Supabase dashboard
- **Function Logs**: Check the Edge Function logs in the Supabase dashboard
- **Network Issues**: Try different network connections
- **Browser Console**: Check for detailed error messages in the app