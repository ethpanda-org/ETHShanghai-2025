"""Lightweight alerting helpers for the monitoring stack."""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional
import smtplib
from email.message import EmailMessage

from config import ALERT_CONFIG

logger = logging.getLogger(__name__)


class AlertSystem:
    """Minimal alerting facade used by the trading runner."""

    def __init__(self) -> None:
        self._logger = logger
        self._cfg = ALERT_CONFIG or {}

    def send_alert(self, message: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        if metadata:
            self._logger.warning("ALERT: %s | metadata=%s", message, metadata)
        else:
            self._logger.warning("ALERT: %s", message)
        try:
            if bool(self._cfg.get("enable_email")):
                self._send_email_alert(message, metadata)
        except Exception:
            self._logger.debug("email alert failed", exc_info=True)

    def check_anomalies(self, market_row: Dict[str, Any]) -> None:
        # Placeholder for future anomaly detection logic
        return

    # --- internal -----------------------------------------------------------

    def _send_email_alert(self, message: str, metadata: Optional[Dict[str, Any]]) -> None:
        server = self._cfg.get("smtp_server")
        port = int(self._cfg.get("smtp_port", 587))
        user = self._cfg.get("username")
        password = self._cfg.get("password")
        to_email = self._cfg.get("to_email")
        subject = self._cfg.get("subject", "[Polymarket] System Alert")
        if not (server and to_email):
            return
        body = message
        if metadata:
            try:
                import json
                body = f"{message}\n\nmetadata:\n{json.dumps(metadata, indent=2)}"
            except Exception:
                body = f"{message}\n\nmetadata:\n{metadata}"
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = user or to_email
        msg["To"] = to_email
        msg.set_content(body)
        if user and password:
            with smtplib.SMTP(server, port, timeout=10) as s:
                s.starttls()
                s.login(user, password)
                s.send_message(msg)
        else:
            with smtplib.SMTP(server, port, timeout=10) as s:
                s.send_message(msg)
