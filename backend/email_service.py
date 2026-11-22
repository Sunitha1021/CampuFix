
import os
from email.message import EmailMessage

import aiosmtplib


async def send_status_email(
    recipient_email,
    student_name,
    issue_id,
    issue_title,
    old_status,
    new_status
):
    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")

    if not smtp_email or not smtp_password:
        raise ValueError("SMTP credentials are missing from .env")

    message = EmailMessage()

    message["From"] = smtp_email
    message["To"] = recipient_email
    message["Subject"] = "Your CampusFix issue status has been updated"

    message.set_content(
        f"""
Hello {student_name},

Your reported issue has been updated.

Issue ID: #{issue_id}
Issue Title: {issue_title}
Previous Status: {old_status}
Current Status: {new_status}

Please log in to CampusFix to track your issue.

Regards,
CampusFix Team
"""
    )

    await aiosmtplib.send(
        message,
        hostname=os.getenv("SMTP_SERVER", "smtp.gmail.com"),
        port=int(os.getenv("SMTP_PORT", "587")),
        start_tls=True,
        username=smtp_email,
        password=smtp_password
    )

    return True
