# API Setup Guide

Jobestry uses Google's Gemini API to generate AI-powered responses for job applications. This guide will help you set up your API key and understand the API requirements.

## Getting a Gemini API Key

### Step 1: Create a Google Account

If you don't have one, create a Google account at [accounts.google.com](https://accounts.google.com).

### Step 2: Visit Google AI Studio

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account

### Step 3: Create an API Key

1. Click **"Get API Key"** or **"Create API Key"**
2. Select or create a Google Cloud project
   - You can use an existing project or create a new one
   - The project name doesn't matter for personal use
3. Click **"Create API Key in New Project"** or select an existing project
4. Copy your API key immediately - you won't be able to see it again!

### Step 4: Configure API Key in Jobestry

1. Open the Jobestry extension popup
2. Go to the **"API Key"** tab
3. Paste your API key
4. Click **"Save API Key"**

The API key is stored locally in your browser and never shared with anyone.

## API Models Used

Jobestry uses the following Gemini models:

- **gemini-2.5-flash-lite**: Fast, cost-effective model for most operations
  - Used for: Field responses, chat, quick generations
  - Token limit: 1024-2048 tokens

- **gemini-2.5-flash**: Standard model for complex operations
  - Used for: Cover letters, batch operations
  - Token limit: 4096 tokens

## Rate Limits and Quotas

### Free Tier Limits

Google provides a generous free tier:

- **Requests per minute**: 60 requests
- **Requests per day**: 1,500 requests
- **Tokens per minute**: 1,000,000 tokens
- **Tokens per day**: 15,000,000 tokens

### Paid Tier

If you exceed free tier limits, Google charges per token:
- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens

For most users, the free tier is more than sufficient.

### Monitoring Usage

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Dashboard**
4. View usage metrics and quotas

## Cost Considerations

### Typical Usage Costs

- **Single field response**: ~500-1000 tokens (~$0.0001)
- **Cover letter**: ~2000-3000 tokens (~$0.0003)
- **Batch fill (10 fields)**: ~5000-8000 tokens (~$0.0008)

**Example**: 100 job applications with cover letters ≈ $0.03

### Cost Optimization Tips

1. **Use caching**: Jobestry caches responses to avoid duplicate API calls
2. **Batch operations**: Fill multiple fields at once to reduce API calls
3. **Review before regenerating**: Check responses before regenerating
4. **Monitor usage**: Keep an eye on your usage in Google Cloud Console

## API Key Security

### Best Practices

1. **Never share your API key** publicly
2. **Don't commit API keys** to version control
3. **Rotate keys** if compromised
4. **Set API key restrictions** in Google Cloud Console (optional)

### Setting API Restrictions (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your API key
4. Under **API restrictions**, select **"Restrict key"**
5. Choose **"Gemini API"** only
6. Under **Application restrictions**, you can restrict by:
   - HTTP referrers (web sites)
   - IP addresses
   - Android apps
   - iOS apps

For Jobestry, you typically don't need restrictions since the key is stored locally.

## Troubleshooting

### "API Key Required" Error

- Verify your API key is correctly pasted
- Check for extra spaces before/after the key
- Ensure the key hasn't been revoked in Google Cloud Console

### "Invalid API Key" Error

- Verify the key format (should be ~39 characters, starts with "AI")
- Check if the key has been deleted or regenerated
- Ensure you're using a Gemini API key, not a different Google API key

### Rate Limit Errors

- Wait a few minutes before retrying
- Reduce the frequency of API calls
- Use cached responses when available
- Consider upgrading to paid tier if needed

### "Quota Exceeded" Error

- Check your daily quota in Google Cloud Console
- Wait until the quota resets (daily)
- Consider upgrading to paid tier
- Review your usage patterns

### Network Errors

- Check your internet connection
- Verify Google services are accessible
- Try again after a few moments
- Check browser console for detailed error messages

## Alternative API Options

Currently, Jobestry only supports Google Gemini API. Future versions may support:

- OpenAI GPT models
- Anthropic Claude
- Local models (via Ollama or similar)

If you'd like to see support for other APIs, please [open a feature request](https://github.com/your-username/jobestry/issues).

## Privacy and Data Handling

### What Data is Sent to Google?

- Your resume text (parsed)
- Job description text
- Form field questions
- Your profile information (name, experience, etc.)
- Writing style preferences

### What is NOT Sent?

- Your API key (it's used locally)
- Your browsing history
- Other personal data not related to job applications

### Data Retention

- Google may retain API request data for up to 30 days for abuse prevention
- Jobestry doesn't store any data on external servers
- All your data remains in your browser

For more information, see [Privacy Documentation](./PRIVACY.md).

## Getting Help

If you encounter issues with API setup:

1. Check this guide first
2. Review [Google's Gemini API documentation](https://ai.google.dev/docs)
3. Check [GitHub Issues](https://github.com/your-username/jobestry/issues)
4. Open a new issue with details about your problem

## References

- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Pricing Information](https://ai.google.dev/pricing)
