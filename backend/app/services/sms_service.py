import os
import logging
from typing import Dict, Any

logger = logging.getLogger("sms_service")

class SMSService:
    def __init__(self):
        self.account_id = os.getenv("SMS_PROVIDER_ACCOUNT_ID", "")
        self.auth_token = os.getenv("SMS_PROVIDER_AUTH_TOKEN", "")
        self.from_phone = os.getenv("SMS_PROVIDER_PHONE_NUMBER", "")
        self.provider = os.getenv("SMS_PROVIDER", "mock").lower()

    def send_location_request_sms(self, recipient_phone: str, requester_name: str, invitation_url: str) -> Dict[str, Any]:
        """
        Send location sharing invitation SMS to recipient phone number.
        Does NOT send raw location coordinates. Only sends secure invitation token link.
        """
        sms_body = (
            f"{requester_name} has requested your location for family safety.\n\n"
            f"To share your current location, open:\n"
            f"{invitation_url}\n\n"
            f"You can allow or decline the request."
        )

        if self.provider == "twilio" and self.account_id and self.auth_token:
            try:
                from twilio.rest import Client
                client = Client(self.account_id, self.auth_token)
                message = client.messages.create(
                    body=sms_body,
                    from_=self.from_phone,
                    to=recipient_phone
                )
                logger.info(f"[SMS Provider Twilio]: Sent SMS to {recipient_phone}, SID: {message.sid}")
                return {
                    "sent": True,
                    "provider": "twilio",
                    "sid": message.sid,
                    "body": sms_body,
                    "url": invitation_url
                }
            except Exception as e:
                logger.error(f"[SMS Provider Twilio Error]: {e}. Falling back to mock SMS mode.")

        # Development / Mock Mode
        logger.info(f"\n================ [MOCK SMS SERVICE LOG] ================")
        logger.info(f"Recipient Phone: {recipient_phone}")
        logger.info(f"Message Body:\n{sms_body}")
        logger.info(f"Invitation Link: {invitation_url}")
        logger.info(f"========================================================\n")

        return {
            "sent": True,
            "provider": "mock",
            "body": sms_body,
            "url": invitation_url,
            "note": "Development Mode: Invitation link available in response and server log."
        }

sms_service = SMSService()
