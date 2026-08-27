# app/routes/security.py
# ─────────────────────────────────────────────────────────────────────────────
# C.I.D — Code Intelligent Debugger
# Security scanner endpoint — NOW WITH REAL AI
# ─────────────────────────────────────────────────────────────────────────────

import json
from flask import Blueprint, jsonify, request, current_app
from ..utils.validators import validate_code_request, get_code_stats
from ..models.code_session import CodeSession
from ..services.llm_service import analyze_code
from ..extensions import db

security_bp = Blueprint("security", __name__)


@security_bp.route("/security", methods=["POST"])
def security_scan():
    """Receive code and return real AI security vulnerability analysis."""

    # ── Parse Request ─────────────────────────────────────────────────────────
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({
            "success": False,
            "error":   "Invalid JSON",
            "message": "Request body must be valid JSON"
        }), 400

    data["mode"] = "security"
    is_valid, error_msg, clean_data = validate_code_request(data)

    if not is_valid:
        return jsonify({
            "success": False,
            "error":   "Validation Error",
            "message": error_msg
        }), 400

    stats = get_code_stats(clean_data["code"])

    # ── Call Real AI ──────────────────────────────────────────────────────────
    try:
        llm_response  = analyze_code(
            code     = clean_data["code"],
            language = clean_data["language"],
            mode     = "security"
        )
        result        = llm_response["result"]
        provider      = llm_response["provider"]
        resolved_lang = llm_response["language"]
        response_time = llm_response["response_time"]

    except Exception as e:
        current_app.logger.error(f"Security scan error: {e}")
        return jsonify({
            "success": False,
            "error":   "Scan Failed",
            "message": "AI security scan failed. Please try again.",
            "detail":  str(e)
        }), 500

    # ── Save to Database ──────────────────────────────────────────────────────
    try:
        session = CodeSession(
            code_input            = clean_data["code"],
            language              = resolved_lang,
            mode                  = "security",
            result_json           = json.dumps(result),
            llm_provider_used     = provider,
            response_time_seconds = response_time,
            status                = "success",
            ip_address            = request.remote_addr,
            session_title         = CodeSession.generate_title(
                                        resolved_lang,
                                        "security",
                                        clean_data["code"]
                                    ),
        )
        db.session.add(session)
        db.session.commit()
        session_id = session.id

    except Exception as e:
        current_app.logger.error(f"Failed to save security session: {e}")
        db.session.rollback()
        session_id = None

    # ── Return Response ───────────────────────────────────────────────────────
    return jsonify({
        "success":       True,
        "mode":          "security",
        "language":      resolved_lang,
        "result":        result,
        "stats":         stats,
        "provider":      provider,
        "response_time": response_time,
        "rate_limit":    llm_response.get("rate_limit", {}),
        "session_id":    session_id,
        "message":       "Security scan completed"
    }), 200