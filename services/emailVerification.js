import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { APP_URL } from '../config'; // Import APP_URL

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

// Generate verification token and send email
export async function sendVerificationEmail(email, allowedDomains = []) {
  // Check if email domain is allowed
  if (allowedDomains.length > 0) {
    const domain = email.split('@')[1];
    if (!allowedDomains.includes(domain)) {
      throw new Error('Email domain not allowed');
    }
  }
  
  // Generate verification token
  const token = crypto.randomBytes(32).toString('hex');
  const verificationLink = `${APP_URL}/verify-email?token=${token}`; // Use APP_URL
  
  // Store token in database
  const { error } = await supabase
    .from('email_verification')
    .insert({
      email,
      token,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) 
    });
    
  if (error) throw error;
  
  // Send email
  const info = await transporter.sendMail({
    from: '"PollSay" <verify@pollsay.com>',
    to: email,
    subject: "Verify your email for PollSay",
    text: `Please verify your email by clicking on this link: ${verificationLink}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to PollSay!</h2>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${verificationLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
      </div>
    `
  });
  
  return info;
}

// Verify email token
export async function verifyEmailToken(token) {
  // Check if token exists and is valid
  const { data, error } = await supabase
    .from('email_verification')
    .select('*')
    .eq('token', token)
    .gt('expires_at', new Date())
    .single();
    
  if (error || !data) {
    throw new Error('Invalid or expired verification token');
  }
  
  // Mark as verified
  await supabase
    .from('email_verification')
    .update({ verified_at: new Date() })
    .eq('id', data.id);
    
  return data.email;
}