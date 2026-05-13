import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings


def send_password_reset_email(to_email: str, token: str) -> None:
    reset_url = f"{settings.frontend_url}/reset-password/{token}"

    message = MIMEMultipart("alternative")
    message["Subject"] = "Сброс пароля — Личный архив"
    message["From"] = settings.smtp_from
    message["To"] = to_email

    text_body = f"""
Вы запросили сброс пароля.

Перейдите по ссылке для сброса пароля:
{reset_url}

Ссылка действительна 1 час.

Если вы не запрашивали сброс пароля — просто проигнорируйте это письмо.
"""

    html_body = f"""
<html>
  <body style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
    <h2 style="color: #01696f;">Сброс пароля</h2>
    <p>Вы запросили сброс пароля для вашего аккаунта в <strong>Личном архиве</strong>.</p>
    <p>
      <a href="{reset_url}"
         style="display:inline-block; padding: 12px 24px; background:#01696f;
                color:#fff; border-radius:6px; text-decoration:none; font-weight:600;">
        Сбросить пароль
      </a>
    </p>
    <p style="color:#7a7974; font-size:14px;">
      Ссылка действительна <strong>1 час</strong>.<br>
      Если вы не запрашивали сброс — просто проигнорируйте это письмо.
    </p>
  </body>
</html>
"""

    message.attach(MIMEText(text_body, "plain"))
    message.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.ehlo()
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_from, to_email, message.as_string())  