require('dotenv').config();

export const config = {
    GEMINI_API_KEY: process.env.GOOGLE_API_KEY!,
    CLIENT_URL: '*',
}