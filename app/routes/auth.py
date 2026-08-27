from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from ..models.code_session import User
from ..extensions import db

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/api/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True)
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"success": False, "error": "Email and password required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"success": False, "error": "Email already registered"}), 400

    user = User(email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    login_user(user, remember=True)
    return jsonify({"success": True, "message": "Account created successfully"}), 201

@auth_bp.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True)
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"success": False, "error": "Invalid email or password"}), 401

    login_user(user, remember=True)
    return jsonify({"success": True, "message": "Logged in successfully"}), 200

@auth_bp.route("/api/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return jsonify({"success": True, "message": "Logged out"}), 200