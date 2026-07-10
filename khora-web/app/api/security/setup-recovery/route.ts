import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

/**
 * Setup portable nodemailer integration.
 * It requires these environment variables for production:
 * SMTP_HOST
 * SMTP_PORT
 * SMTP_USER
 * SMTP_PASS
 */

export async function POST(request: Request) {
  try {
    const { recoveryCode, email } = await request.json();

    if (!recoveryCode || !email) {
      return NextResponse.json(
        { error: 'Missing recovery code or email destination.' },
        { status: 400 }
      );
    }

    // Default configuration to allow testing or local run.
    // In production, configure environment variables properly.
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"Khora Systems" <${process.env.SMTP_USER || 'no-reply@khora.system'}>`,
      to: email,
      subject: 'Código de Recuperación Criptográfica (Alta Entropía) - Khora',
      text: `Tu Código de Recuperación de Alta Entropía es:\n\n${recoveryCode}\n\nGuarda este código en un lugar seguro. Si olvidas tu PIN, lo necesitarás para descifrar tu Llave Maestra (DEK) y recuperar el acceso a tus secretos.\n\nSistemas Khora`,
      html: `
        <div style="font-family: monospace; padding: 20px; background: #0B1F3B; color: #fff; max-width: 600px; margin: 0 auto; border: 1px solid #1F3C6A; border-radius: 8px;">
          <h2 style="color: #3FA7FF; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #1F3C6A; padding-bottom: 10px;">Código de Recuperación</h2>
          <p style="color: #ccc;">Has configurado un nuevo PIN en tu Sistema Khora.</p>
          <p style="color: #ccc;">Tu Código de Recuperación de Alta Entropía es:</p>
          <div style="background: #112A4F; padding: 15px; border-radius: 4px; border: 1px solid #1F3C6A; margin: 20px 0; word-break: break-all; color: #3FA7FF; font-size: 16px; text-align: center;">
            <strong>${recoveryCode}</strong>
          </div>
          <p style="color: #888; font-size: 12px; margin-top: 30px;">
            Guarda este código en un lugar seguro. Si olvidas tu PIN, lo necesitarás para descifrar tu Llave Maestra (DEK) y recuperar el acceso a tus secretos.
          </p>
        </div>
      `,
    };

    // Attempt to send email, but gracefully handle the lack of SMTP setup in non-production.
    // This allows the flow to proceed without failing during local dev without SMTP credentials.
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail(mailOptions);
    } else {
      console.warn("SMTP credentials not configured. Recovery email was not sent in development mode.");
      console.log("Mock Email Content:\n", mailOptions.text);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending recovery email:', error);
    return NextResponse.json(
      { error: 'Failed to process recovery configuration.' },
      { status: 500 }
    );
  }
}
