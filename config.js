// config.js
import dotenv from 'dotenv';
dotenv.config();

export const EMAIL_USER = process.env.EMAIL_USER;
export const EMAIL_PASS = process.env.EMAIL_PASS;
export const EMAIL_TO = process.env.EMAIL_TO;
export const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
