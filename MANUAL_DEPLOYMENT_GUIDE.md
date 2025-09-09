# Manual Edge Function Deployment Guide

This guide provides instructions for manually deploying and configuring a Supabase Edge Function using the Supabase Dashboard.

## 1. Set Environment Variables

Your Edge Function requires environment variables to connect to your Supabase project. These must be set in the Supabase Dashboard before deploying the function.

1.  **Navigate to Project Settings**:
    *   Go to your Supabase project.
    *   Click on the **Settings** icon in the left sidebar.
    *   Select **Edge Functions**.

2.  **Add Secrets**:
    *   In the **Secrets** section, add the following two secrets:
        *   **Name**: `SUPABASE_URL`
            *   **Value**: `https://<YOUR_PROJECT_REF>.supabase.co`
        *   **Name**: `SUPABASE_ANON_KEY`
            *   **Value**: `<YOUR_SUPABASE_ANON_KEY>`

    *You can find these values in your project's API settings.*

## 2. Deploy the Function

1.  **Go to the Edge Functions section** in your Supabase Dashboard.
2.  **Click "Create a new function"**.
3.  **Copy and paste the code** from `supabase/functions/generate-document/index.ts` into the code editor.
4.  **Save and deploy** the function.

After completing these steps, your Edge Function will be deployed with the necessary environment variables and should work as expected.