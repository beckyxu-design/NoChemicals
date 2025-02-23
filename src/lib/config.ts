import 'dotenv/config';

// Clean up the API key by removing quotes and trimming whitespace
const cleanApiKey = process.env.OPENAI_API_KEY?.replace(/["']/g, '').trim();

if (!cleanApiKey) {
  console.warn('Warning: OPENAI_API_KEY is not set in environment variables');
}

export const config = {
  openai: {
    apiKey: cleanApiKey || '',
  },
} as const;

// Validate environment variables at runtime
export function validateEnv() {
  if (!config.openai.apiKey) {
    throw new Error(
      'OPENAI_API_KEY is required. Please check your .env file and ensure it contains your API key.'
    );
  }
}
