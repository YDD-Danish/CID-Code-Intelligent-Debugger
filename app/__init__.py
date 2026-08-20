# app/__init__.py
# ─────────────────────────────────────────────────────────────────────────────
# C.I.D — Code Intelligent Debugger
# Application Factory
# ─────────────────────────────────────────────────────────────────────────────

import os
from flask import Flask
from .config import config_map
from .extensions import db, migrate, limiter, cors

# Absolute path to the project root folder
# This resolves to: C:\Users\Danish Khan\C.I.D
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def create_app(config_name: str = None) -> Flask:
    """
    Create and configure the C.I.D Flask application.
    """

    # ── Create Flask App ──────────────────────────────────────────────────────
    app = Flask(
        __name__,
        template_folder=os.path.join(BASE_DIR, "templates"),
        static_folder=os.path.join(BASE_DIR, "static"),
    )

    # ── Load Config ───────────────────────────────────────────────────────────
    if config_name is None:
        config_name = os.environ.get("FLASK_ENV", "development")

    config_class = config_map.get(config_name, config_map["development"])
    app.config.from_object(config_class)

    # ── Fix Database Path ─────────────────────────────────────────────────────
    # Force absolute path for SQLite so it always finds the database folder
    # regardless of where python is called from
    db_folder = os.path.join(BASE_DIR, "database")
    db_file   = os.path.join(db_folder, "cid.db")

    # Create the database folder if it does not exist
    os.makedirs(db_folder, exist_ok=True)

    # Override the database URI with the absolute path
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_file}"

    # ── Fix Rate Limiter Storage Warning ──────────────────────────────────────
    # Tell Flask-Limiter to use memory storage explicitly
    # This removes the warning message
    app.config["RATELIMIT_STORAGE_URI"] = "memory://"

    # ── Initialize Extensions ─────────────────────────────────────────────────
    db.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    # ── Register Blueprints ───────────────────────────────────────────────────
    from .routes.main     import main_bp
    from .routes.api      import api_bp
    from .routes.security import security_bp
    from .routes.history  import history_bp
    from .routes.snippets import snippets_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp,      url_prefix="/api")
    app.register_blueprint(security_bp, url_prefix="/api")
    app.register_blueprint(history_bp,  url_prefix="/api")
    app.register_blueprint(snippets_bp, url_prefix="/api")

    # ── Create Database Tables ────────────────────────────────────────────────
    with app.app_context():
        from .models import code_session  # noqa: F401
        db.create_all()

    # ── Register Error Handlers ───────────────────────────────────────────────
    register_error_handlers(app)

    # ── Print Startup Banner ──────────────────────────────────────────────────
    _print_banner(app, config_name)

    return app


def _print_banner(app: Flask, config_name: str) -> None:
    """Print a styled startup banner in the terminal."""

    groq_status = (
        "✓ Connected" if app.config.get("GROQ_API_KEY")
        else "✗ MISSING — add to .env"
    )

    banner = f"""
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     ██████╗   ██╗   ██████╗                                  ║
║    ██╔════╝   ██║   ██╔══██╗                                 ║
║    ██║        ██║   ██║  ██║                                  ║
║    ██║        ██║   ██║  ██║                                  ║
║    ╚██████╗   ██║   ██████╔╝                                  ║
║     ╚═════╝   ╚═╝   ╚═════╝                                  ║
║                                                              ║
║    Code Intelligent Debugger  v{app.config.get("APP_VERSION", "1.0.0")}                   ║
║    Built by {app.config.get("APP_AUTHOR", "Danish Khan"):<49}║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  Environment  :  {config_name:<43}║
║  Debug Mode   :  {str(app.config["DEBUG"]):<43}║
║  Groq AI      :  {groq_status:<43}║
║  LLM Model    :  {"llama-3.1-8b-instant":<43}║
║  URL          :  http://localhost:5000                       ║
╚══════════════════════════════════════════════════════════════╝
"""
    print(banner)

def register_error_handlers(app: Flask) -> None:
    """Register global JSON error handlers."""
    from flask import jsonify

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            "success": False,
            "error":   "Bad Request",
            "message": (
                str(error.description)
                if hasattr(error, "description")
                else "Invalid request data"
            )
        }), 400

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "success": False,
            "error":   "Not Found",
            "message": "The endpoint you requested does not exist"
        }), 404

    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        return jsonify({
            "success": False,
            "error":   "Rate Limit Exceeded",
            "message": "Too many requests. Please wait before trying again.",
            "retry_after": "60 seconds"
        }), 429

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            "success": False,
            "error":   "Internal Server Error",
            "message": "Something went wrong. Please try again."
        }), 500