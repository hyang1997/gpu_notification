// notifications.js
import nodemailer from 'nodemailer';
import axios from 'axios';
import { EMAIL_USER, EMAIL_PASS, EMAIL_TO, DISCORD_WEBHOOK_URL } from './config.js';

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

export const sendDiscordNotification = async (message) => {
  try {
    console.log(`Attempting to send Discord notification with message: ${message}`);
    const response = await axios.post(DISCORD_WEBHOOK_URL, { content: message });
    console.log('Discord notification sent:', response.status, response.statusText);
  } catch (error) {
    console.error('Error sending Discord notification:', error);
  }
};

export const sendEmailNotification = (subject, text) => {
  const mailOptions = {
    from: EMAIL_USER,
    to: EMAIL_TO,
    subject,
    text,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
};
