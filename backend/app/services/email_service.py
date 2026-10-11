import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    def send_location_request_email(recipient_email: str, requester_name: str, share_url: str, expire_minutes: int = 30) -> bool:
        """
        Sends a consent-based location request email using Gmail SMTP.
        Contains the secure token link for the recipient consent page.
        """
        subject = "Location Sharing Request"
        
        # HTML Email Template matching Requirement #5
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    background-color: #041a12;
                    color: #ffffff;
                    margin: 0;
                    padding: 40px 20px;
                }}
                .container {{
                    max-width: 560px;
                    margin: 0 auto;
                    background: #062b1e;
                    border: 1px solid rgba(212, 175, 55, 0.4);
                    border-radius: 20px;
                    padding: 36px;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
                }}
                .header {{
                    text-align: center;
                    border-bottom: 1px solid rgba(212, 175, 55, 0.2);
                    padding-bottom: 20px;
                    margin-bottom: 24px;
                }}
                .header h1 {{
                    color: #d4af37;
                    font-size: 24px;
                    margin: 0 0 6px 0;
                    letter-spacing: 0.5px;
                }}
                .header p {{
                    color: #a7f3d0;
                    font-size: 13px;
                    margin: 0;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }}
                .content {{
                    line-height: 1.6;
                    font-size: 15px;
                    color: #e2e8f0;
                }}
                .requester-box {{
                    background: rgba(4, 26, 18, 0.7);
                    border-left: 4px solid #d4af37;
                    padding: 16px;
                    border-radius: 8px;
                    margin: 20px 0;
                }}
                .btn-container {{
                    text-align: center;
                    margin: 32px 0;
                }}
                .btn {{
                    display: inline-block;
                    background: linear-gradient(135deg, #d4af37 0%, #b8860b 100%);
                    color: #041a12;
                    font-weight: 800;
                    font-size: 16px;
                    padding: 16px 36px;
                    text-decoration: none;
                    border-radius: 12px;
                    box-shadow: 0 10px 25px rgba(212, 175, 55, 0.3);
                }}
                .notice {{
                    background: rgba(16, 185, 129, 0.1);
                    border: 1px solid rgba(16, 185, 129, 0.3);
                    border-radius: 10px;
                    padding: 14px;
                    font-size: 13px;
                    color: #6ee7b7;
                    margin-top: 24px;
                }}
                .footer {{
                    margin-top: 32px;
                    text-align: center;
                    font-size: 12px;
                    color: #94a3b8;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    padding-top: 20px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Safe Route Map</h1>
                    <p>Location Sharing Request</p>
                </div>
                <div class="content">
                    <p>Hello,</p>
                    <div class="requester-box">
                        <strong>{requester_name}</strong> is requesting you to share your current location through the Safe Route application.
                    </div>
                    <p>Your location will <strong>NOT</strong> be shared automatically. You must explicitly approve the request.</p>

                    <div class="btn-container">
                        <a href="{share_url}" class="btn">Share My Location</a>
                    </div>

                    <div class="notice">
                        <strong>Explicit Consent Notice:</strong> If you do not want to share your location, simply ignore the request or choose <strong>Decline</strong> on the link. This request expires automatically in {expire_minutes} minutes.
                    </div>
                </div>
                <div class="footer">
                    Sent securely via Safe Route AI • Personal Safety & Navigation Engine
                </div>
            </div>
        </body>
        </html>
        """

        plain_text = f"""
Location Sharing Request

{requester_name} is requesting you to share your current location through the Safe Route application.

Your location will NOT be shared automatically. You must explicitly approve the request.

Click the following secure link to view the request and choose to Share My Location or Decline:
{share_url}

If you do not want to share your location, simply ignore the request or choose Decline.
This request expires automatically in {expire_minutes} minutes.
        """

        gmail_user = settings.GMAIL_USER
        gmail_pass = settings.GMAIL_APP_PASSWORD

        # Always log to stdout for testing and verification
        print(f"\n=======================================================")
        print(f"[EMAIL SERVICE] Preparing Location Share Email")
        print(f"To: {recipient_email}")
        print(f"Subject: {subject}")
        print(f"Consent URL: {share_url}")
        print(f"=======================================================\n")

        if not gmail_user or not gmail_pass:
            logger.warning("[EmailService] GMAIL_USER or GMAIL_APP_PASSWORD is not set in environment. Email simulated.")
            print("[EmailService Notice]: Set GMAIL_USER and GMAIL_APP_PASSWORD in .env for real inbox delivery.")
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"Safe Route AI <{gmail_user}>"
            msg["To"] = recipient_email

            msg.attach(MIMEText(plain_text, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=3) as server:
                server.starttls()
                server.login(gmail_user, gmail_pass)
                server.sendmail(gmail_user, [recipient_email], msg.as_string())
            
            logger.info(f"[EmailService] Email successfully delivered to {recipient_email}")
            print(f"[EmailService Success]: Real email sent via Gmail SMTP to {recipient_email}")
            return True
        except Exception as e:
            logger.error(f"[EmailService Error] Failed to send email via SMTP: {e}")
            print(f"[EmailService SMTP Error]: {e}")
            return False

    @staticmethod
    def send_verification_otp(recipient_email: str, recipient_name: str, otp: str, expire_minutes: int = 5) -> dict:
        """
        Sends an email verification OTP with dark emerald and gold branding.
        """
        subject = f"{otp} is your RouteMap Email Verification Code"
        name = recipient_name or "RouteMap Explorer"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    background-color: #041a12;
                    color: #ffffff;
                    margin: 0;
                    padding: 40px 20px;
                }}
                .container {{
                    max-width: 560px;
                    margin: 0 auto;
                    background: #062b1e;
                    border: 1px solid rgba(212, 175, 55, 0.4);
                    border-radius: 20px;
                    padding: 36px;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
                }}
                .header {{
                    text-align: center;
                    border-bottom: 1px solid rgba(212, 175, 55, 0.2);
                    padding-bottom: 20px;
                    margin-bottom: 24px;
                }}
                .header h1 {{
                    color: #d4af37;
                    font-size: 24px;
                    margin: 0 0 6px 0;
                    letter-spacing: 0.5px;
                }}
                .header p {{
                    color: #a7f3d0;
                    font-size: 13px;
                    margin: 0;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }}
                .content {{
                    line-height: 1.6;
                    font-size: 15px;
                    color: #e2e8f0;
                }}
                .otp-box {{
                    background: rgba(4, 26, 18, 0.9);
                    border: 2px solid #d4af37;
                    border-radius: 12px;
                    padding: 24px;
                    text-align: center;
                    margin: 28px 0;
                }}
                .otp-code {{
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 38px;
                    font-weight: 800;
                    letter-spacing: 10px;
                    color: #d4af37;
                }}
                .notice {{
                    background: rgba(16, 185, 129, 0.1);
                    border: 1px solid rgba(16, 185, 129, 0.3);
                    border-radius: 10px;
                    padding: 14px;
                    font-size: 13px;
                    color: #6ee7b7;
                    margin-top: 24px;
                }}
                .footer {{
                    margin-top: 32px;
                    text-align: center;
                    font-size: 12px;
                    color: #94a3b8;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    padding-top: 20px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>RouteMap AI</h1>
                    <p>Personal Safety Risk Predictor & Safely Mesh</p>
                </div>
                <div class="content">
                    <p>Hello <strong>{name}</strong>,</p>
                    <p>Thank you for registering your account with RouteMap. Use the 6-digit verification code below to verify your email address and activate your account:</p>
                    
                    <div class="otp-box">
                        <div class="otp-code">{otp}</div>
                        <div style="color: #94a3b8; font-size: 12px; margin-top: 8px;">Valid for {expire_minutes} minutes</div>
                    </div>

                    <div class="notice">
                        <strong>Security Reminder:</strong> Never share this code with anyone. RouteMap engineers will never ask for your verification code. If you did not create an account, please ignore this email.
                    </div>
                </div>
                <div class="footer">
                    Sent securely via RouteMap AI • AI Personal Safety Risk Predictor
                </div>
            </div>
        </body>
        </html>
        """

        plain_text = f"""
RouteMap AI — Email Verification

Hello {name},

Your 6-digit verification code is: {otp}

This code expires in {expire_minutes} minutes.
Never share this code with anyone. If you did not create this account, please ignore this email.
        """

        gmail_user = settings.GMAIL_USER
        gmail_pass = settings.GMAIL_APP_PASSWORD

        print("\n=======================================================")
        print(f"[EMAIL SERVICE] Verification OTP for {recipient_email}: [{otp}]")
        print(f"Expires in: {expire_minutes} minutes")
        print("=======================================================\n")

        if not gmail_user or not gmail_pass:
            logger.warning("[EmailService] SMTP credentials not configured. Verification code logged to terminal.")
            return {
                "delivered": False,
                "status": "smtp_unconfigured",
                "message": "SMTP credentials are not configured. Check server log for the development OTP."
            }

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"RouteMap Safety <{gmail_user}>"
            msg["To"] = recipient_email

            msg.attach(MIMEText(plain_text, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=3) as server:
                server.starttls()
                server.login(gmail_user, gmail_pass)
                server.sendmail(gmail_user, [recipient_email], msg.as_string())

            logger.info(f"[EmailService] Verification OTP delivered to {recipient_email}")
            return {
                "delivered": True,
                "status": "sent",
                "message": f"Verification code sent to {recipient_email}"
            }
        except Exception as e:
            logger.error(f"[EmailService Error] SMTP sending failed: {e}")
            print(f"[EmailService Error]: {e}")
            return {
                "delivered": False,
                "status": "smtp_failed",
                "message": f"SMTP delivery failed: {str(e)}"
            }

    @staticmethod
    def send_password_reset_email(recipient_email: str, recipient_name: str, reset_token: str, expire_minutes: int = 15) -> dict:
        """
        Sends a secure password reset link and token to the user.
        """
        subject = "RouteMap Password Reset Request"
        name = recipient_name or "RouteMap User"
        frontend_url = settings.FRONTEND_URL.rstrip('/')
        reset_url = f"{frontend_url}/reset-password?token={reset_token}"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    background-color: #041a12;
                    color: #ffffff;
                    margin: 0;
                    padding: 40px 20px;
                }}
                .container {{
                    max-width: 560px;
                    margin: 0 auto;
                    background: #062b1e;
                    border: 1px solid rgba(212, 175, 55, 0.4);
                    border-radius: 20px;
                    padding: 36px;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
                }}
                .header {{
                    text-align: center;
                    border-bottom: 1px solid rgba(212, 175, 55, 0.2);
                    padding-bottom: 20px;
                    margin-bottom: 24px;
                }}
                .header h1 {{
                    color: #d4af37;
                    font-size: 24px;
                    margin: 0 0 6px 0;
                }}
                .content {{
                    line-height: 1.6;
                    font-size: 15px;
                    color: #e2e8f0;
                }}
                .btn-container {{
                    text-align: center;
                    margin: 30px 0;
                }}
                .btn {{
                    display: inline-block;
                    background: linear-gradient(135deg, #d4af37 0%, #b8860b 100%);
                    color: #041a12;
                    font-weight: 800;
                    font-size: 16px;
                    padding: 14px 32px;
                    text-decoration: none;
                    border-radius: 12px;
                }}
                .notice {{
                    background: rgba(220, 38, 38, 0.1);
                    border: 1px solid rgba(220, 38, 38, 0.3);
                    border-radius: 10px;
                    padding: 14px;
                    font-size: 13px;
                    color: #fca5a5;
                    margin-top: 24px;
                }}
                .footer {{
                    margin-top: 32px;
                    text-align: center;
                    font-size: 12px;
                    color: #94a3b8;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    padding-top: 20px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>RouteMap AI</h1>
                    <p style="color: #a7f3d0; margin: 0; text-transform: uppercase; font-size: 12px;">Password Reset Request</p>
                </div>
                <div class="content">
                    <p>Hello <strong>{name}</strong>,</p>
                    <p>We received a request to reset the password for your RouteMap account.</p>
                    
                    <div class="btn-container">
                        <a href="{reset_url}" class="btn">Reset My Password</a>
                    </div>

                    <p style="font-size: 13px; color: #94a3b8;">Or copy and paste this link in your browser:<br>
                    <span style="word-break: break-all; color: #a7f3d0;">{reset_url}</span></p>

                    <p style="font-size: 13px; color: #94a3b8;">Your reset token: <code>{reset_token}</code></p>

                    <div class="notice">
                        <strong>Security Notice:</strong> This single-use link expires in {expire_minutes} minutes. If you did not request a password reset, you can safely ignore this email; your password will remain unchanged.
                    </div>
                </div>
                <div class="footer">
                    Sent securely via RouteMap AI • AI Personal Safety Risk Predictor
                </div>
            </div>
        </body>
        </html>
        """

        plain_text = f"""
RouteMap Password Reset

Hello {name},

Click the following link to reset your password (valid for {expire_minutes} minutes):
{reset_url}

Token: {reset_token}

If you did not request this, please ignore this email.
        """

        gmail_user = settings.GMAIL_USER
        gmail_pass = settings.GMAIL_APP_PASSWORD

        print("\n=======================================================")
        print(f"[EMAIL SERVICE] Password Reset URL for {recipient_email}:")
        print(reset_url)
        print("=======================================================\n")

        if not gmail_user or not gmail_pass:
            return {
                "delivered": False,
                "status": "smtp_unconfigured",
                "message": "SMTP credentials are not configured. Check server log for the reset link."
            }

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"RouteMap Safety <{gmail_user}>"
            msg["To"] = recipient_email

            msg.attach(MIMEText(plain_text, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                server.starttls()
                server.login(gmail_user, gmail_pass)
                server.sendmail(gmail_user, [recipient_email], msg.as_string())

            return {
                "delivered": True,
                "status": "sent",
                "message": f"Password reset instructions sent to {recipient_email}"
            }
        except Exception as e:
            return {
                "delivered": False,
                "status": "smtp_failed",
                "message": f"SMTP delivery failed: {str(e)}"
            }

    @staticmethod
    def send_password_changed_notification(recipient_email: str, recipient_name: str) -> dict:
        """Sends security confirmation that password was successfully reset."""
        subject = "Security Alert: Your RouteMap Password Has Changed"
        name = recipient_name or "RouteMap User"
        plain_text = f"Hello {name},\n\nThe password for your RouteMap account was recently changed. If you made this change, no action is needed.\n\nIf you did not make this change, please contact support immediately."

        gmail_user = settings.GMAIL_USER
        gmail_pass = settings.GMAIL_APP_PASSWORD

        if not gmail_user or not gmail_pass:
            return {"delivered": False, "status": "smtp_unconfigured"}

        try:
            msg = MIMEText(plain_text, "plain")
            msg["Subject"] = subject
            msg["From"] = f"RouteMap Safety <{gmail_user}>"
            msg["To"] = recipient_email

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                server.starttls()
                server.login(gmail_user, gmail_pass)
                server.sendmail(gmail_user, [recipient_email], msg.as_string())

            return {"delivered": True, "status": "sent"}
        except Exception:
            return {"delivered": False, "status": "smtp_failed"}

email_service = EmailService()
