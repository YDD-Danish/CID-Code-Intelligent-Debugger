# app/utils/rate_limiter.py
# ─────────────────────────────────────────────────────────────────────────────
# C.I.D — Code Intelligent Debugger
# Rate limiting helpers
#
# These functions work alongside Flask-Limiter to give users clear
# feedback when they hit rate limits, and to provide different limits
# for different endpoint types.
# ─────────────────────────────────────────────────────────────────────────────

from flask import request, jsonify
from datetime import datetime


def get_rate_limit_string(per_minute: int = 10) -> str:
    """
    Build a Flask-Limiter rate limit string.

    Args:
        per_minute: How many requests allowed per minute

    Returns:
        String like "10 per minute" that Flask-Limiter understands
    """
    return f"{per_minute} per minute"


def rate_limit_error_response():
    """
    Return a clean JSON response when rate limit is exceeded.
    Called by Flask-Limiter's on_breach handler.
    """
    return jsonify({
        "success": False,
        "error":   "Rate Limit Exceeded",
        "message": (
            "You have made too many requests. "
            "Please wait 60 seconds before trying again."
        ),
        "retry_after_seconds": 60,
        "timestamp": datetime.utcnow().isoformat()
    }), 429


def get_client_ip() -> str:
    """
    Get the real IP address of the client.
    Handles cases where the app is behind a proxy (like on Render/Railway).
    """
    # X-Forwarded-For is set by proxies/load balancers
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Take the first IP (the original client)
        return forwarded_for.split(",")[0].strip()

    return request.remote_addr or "unknown"