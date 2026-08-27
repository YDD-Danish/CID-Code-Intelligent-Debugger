# app/routes/snippets.py
# ─────────────────────────────────────────────────────────────────────────────
# C.I.D — Snippets Library CRUD endpoints
# ─────────────────────────────────────────────────────────────────────────────

from flask import Blueprint, jsonify, request, current_app
from ..models.code_session import Snippet
from ..extensions import db
from flask_login import current_user, login_required

snippets_bp = Blueprint("snippets", __name__)


@snippets_bp.route("/snippets", methods=["GET"])
def list_snippets():
    """List all snippets, optionally filtered by category or search."""
    category = request.args.get("category")
    search   = request.args.get("search", "").strip()

    query = Snippet.query.filter_by(user_id=current_user.id).order_by(Snippet.updated_at.desc())

    if category and category != "all":
        query = query.filter(Snippet.category == category)

    if search:
        query = query.filter(Snippet.name.ilike(f"%{search}%"))

    snippets = [s.to_dict() for s in query.all()]

    return jsonify({
        "success":  True,
        "snippets": snippets,
        "total":    len(snippets)
    }), 200


@snippets_bp.route("/snippets", methods=["POST"])
def create_snippet():
    """Save a new snippet."""
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"success": False, "error": "Invalid JSON"}), 400

    name        = (data.get("name") or "").strip()
    code        = (data.get("code") or "").strip()
    language    = (data.get("language") or "auto").strip().lower()
    category    = (data.get("category") or "General").strip()
    description = (data.get("description") or "").strip()

    if not name:
        return jsonify({"success": False, "error": "Name is required"}), 400

    if not code:
        return jsonify({"success": False, "error": "Code is required"}), 400

    if len(name) > 200:
        return jsonify({"success": False, "error": "Name too long (max 200 chars)"}), 400

    if len(code) > 50000:
        return jsonify({"success": False, "error": "Code too long (max 50,000 chars)"}), 400

    try:
        snippet = Snippet(
            name        = name,
            code        = code,
            language    = language,
            category    = category,
            description = description,
            user_id = current_user.id
        )
        db.session.add(snippet)
        db.session.commit()

        return jsonify({
            "success": True,
            "snippet": snippet.to_dict(),
            "message": "Snippet saved"
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Failed to save snippet: {e}")
        return jsonify({
            "success": False,
            "error":   f"Failed to save: {str(e)}"
        }), 500


@snippets_bp.route("/snippets/<int:snippet_id>", methods=["GET"])
def get_snippet(snippet_id):
    """Get a single snippet by ID."""
    snippet = Snippet.query.get(snippet_id)
    if not snippet:
        return jsonify({"success": False, "error": "Snippet not found"}), 404

    return jsonify({
        "success": True,
        "snippet": snippet.to_dict()
    }), 200


@snippets_bp.route("/snippets/<int:snippet_id>", methods=["DELETE"])
def delete_snippet(snippet_id):
    """Delete a snippet."""
    snippet = Snippet.query.get(snippet_id)
    if not snippet:
        return jsonify({"success": False, "error": "Snippet not found"}), 404

    try:
        db.session.delete(snippet)
        db.session.commit()
        return jsonify({
            "success": True,
            "message": "Snippet deleted"
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error":   "Failed to delete"
        }), 500


@snippets_bp.route("/snippets/categories", methods=["GET"])
def get_categories():
    """Get list of unique categories used in snippets."""
    try:
        results = db.session.query(Snippet.category).distinct().all()
        categories = sorted([r[0] for r in results if r[0]])
        return jsonify({
            "success":    True,
            "categories": categories
        }), 200
    except Exception:
        return jsonify({
            "success":    True,
            "categories": []
        }), 200