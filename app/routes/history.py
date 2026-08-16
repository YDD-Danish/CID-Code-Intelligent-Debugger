# app/routes/history.py
# ─────────────────────────────────────────────────────────────────────────────
# C.I.D — Code Intelligent Debugger
# Code history endpoints
#
#   GET  /api/history         → list of recent sessions
#   GET  /api/history/<id>    → single session detail
#   DELETE /api/history/<id>  → delete one session
#   DELETE /api/history       → clear all history
# ─────────────────────────────────────────────────────────────────────────────

from flask import Blueprint, jsonify, request
from ..models.code_session import CodeSession
from ..extensions import db

history_bp = Blueprint("history", __name__)


@history_bp.route("/history", methods=["GET"])
def get_history():
    """
    Return list of past code analysis sessions.
    Supports pagination via ?page=1&per_page=20
    Supports filtering via ?mode=explain or ?language=python
    """

    # ── Pagination Parameters ─────────────────────────────────────────────────
    page     = request.args.get("page",     1,  type=int)
    per_page = request.args.get("per_page", 20, type=int)

    # Cap per_page to prevent massive queries
    per_page = min(per_page, 100)

    # ── Filter Parameters ─────────────────────────────────────────────────────
    mode_filter     = request.args.get("mode",     None)
    language_filter = request.args.get("language", None)

    # ── Build Query ───────────────────────────────────────────────────────────
    query = CodeSession.query.order_by(CodeSession.created_at.desc())

    if mode_filter:
        query = query.filter(CodeSession.mode == mode_filter)

    if language_filter:
        query = query.filter(CodeSession.language == language_filter)

    # ── Paginate ──────────────────────────────────────────────────────────────
    try:
        paginated = query.paginate(
            page     = page,
            per_page = per_page,
            error_out = False
        )

        sessions = [s.to_dict() for s in paginated.items]

        return jsonify({
            "success":    True,
            "sessions":   sessions,
            "total":      paginated.total,
            "page":       page,
            "per_page":   per_page,
            "pages":      paginated.pages,
            "has_next":   paginated.has_next,
            "has_prev":   paginated.has_prev,
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error":   "Database Error",
            "message": "Failed to fetch history. Please try again."
        }), 500


@history_bp.route("/history/<int:session_id>", methods=["GET"])
def get_session(session_id: int):
    """Return full details of one specific session by ID."""

    session = CodeSession.query.get(session_id)

    if not session:
        return jsonify({
            "success": False,
            "error":   "Not Found",
            "message": f"No session found with ID {session_id}"
        }), 404

    return jsonify({
        "success": True,
        "session": session.to_dict()
    }), 200


@history_bp.route("/history/<int:session_id>", methods=["DELETE"])
def delete_session(session_id: int):
    """Delete one specific session by ID."""

    session = CodeSession.query.get(session_id)

    if not session:
        return jsonify({
            "success": False,
            "error":   "Not Found",
            "message": f"No session found with ID {session_id}"
        }), 404

    try:
        db.session.delete(session)
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Session {session_id} deleted successfully"
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error":   "Delete Failed",
            "message": "Failed to delete session. Please try again."
        }), 500


@history_bp.route("/history", methods=["DELETE"])
def clear_history():
    """Delete ALL history sessions. This cannot be undone."""

    try:
        count = CodeSession.query.count()
        CodeSession.query.delete()
        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"Cleared {count} sessions from history"
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error":   "Clear Failed",
            "message": "Failed to clear history. Please try again."
        }), 500


@history_bp.route("/history/stats", methods=["GET"])
def get_stats():
    """
    Return usage statistics.
    Used by the dashboard to show total analyses run.
    """

    try:
        total         = CodeSession.query.count()
        explain_count = CodeSession.query.filter_by(mode="explain").count()
        debug_count   = CodeSession.query.filter_by(mode="debug").count()
        optimize_count= CodeSession.query.filter_by(mode="optimize").count()
        security_count= CodeSession.query.filter_by(mode="security").count()

        return jsonify({
            "success": True,
            "stats": {
                "total_sessions":    total,
                "explain_count":     explain_count,
                "debug_count":       debug_count,
                "optimize_count":    optimize_count,
                "security_count":    security_count,
            }
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error":   "Stats Failed",
            "message": "Failed to fetch statistics."
        }), 500