# app/routes/main.py
# ─────────────────────────────────────────────────────────────────────────────
# C.I.D — Serves the main HTML page and health check
# ─────────────────────────────────────────────────────────────────────────────
import os
from flask import Blueprint, render_template, jsonify, current_app, request

main_bp = Blueprint("main", __name__)


@main_bp.route("/")
def index():
    """Serve the main C.I.D application page."""
    is_production = bool(os.environ.get("RENDER", False))
    return render_template("index.html", is_production=is_production)


@main_bp.route("/share/<int:session_id>")
def share_view(session_id):
    """
    Public shareable view of a session.
    Loads the main page but the JS auto-loads this session on load.
    """
    is_production = bool(os.environ.get("RENDER", False))
    return render_template("index.html", share_id=session_id, is_production=is_production)

@main_bp.route("/env-check")
def env_check():
    """Tell frontend if we are on production."""
    return jsonify({
        "is_production": bool(os.environ.get("RENDER", False))
    })
@main_bp.route("/health")
def health():
    """Health check — used by deployment platforms."""
    return jsonify({
        "status":  "healthy",
        "app":     current_app.config.get("APP_NAME", "C.I.D"),
        "version": current_app.config.get("APP_VERSION", "1.0.0"),
        "message": "C.I.D is running"
    })