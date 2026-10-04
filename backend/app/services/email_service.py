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

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
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

email_service = EmailService()
