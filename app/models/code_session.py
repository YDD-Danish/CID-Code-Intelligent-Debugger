# app/models/code_session.py
# ─────────────────────────────────────────────────────────────────────────────
# C.I.D — Code Intelligent Debugger
# Database model for storing code analysis sessions
# ─────────────────────────────────────────────────────────────────────────────

from datetime import datetime
from ..extensions import db


class CodeSession(db.Model):
    """
    One row = one time a user submitted code for analysis.
    Powers the history feature.
    """

    __tablename__ = "code_sessions"

    # ── Primary Key ───────────────────────────────────────────────────────────
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    # ── User Input ────────────────────────────────────────────────────────────
    code_input   = db.Column(db.Text,    nullable=False)
    content_hash = db.Column(db.String(64), nullable=True, index=True)
    language     = db.Column(db.String(50),  nullable=False, default="auto")
    mode         = db.Column(db.String(20),  nullable=False)

    # ── LLM Output ───────────────────────────────────────────────────────────
    result_json          = db.Column(db.Text,   nullable=True)
    llm_provider_used    = db.Column(db.String(20), nullable=True)
    response_time_seconds = db.Column(db.Float,  nullable=True)

    # ── Status ────────────────────────────────────────────────────────────────
    status        = db.Column(db.String(20), nullable=False, default="pending")
    error_message = db.Column(db.Text,       nullable=True)

    # ── Metadata ──────────────────────────────────────────────────────────────
    created_at    = db.Column(db.DateTime,   nullable=False, default=datetime.utcnow)
    ip_address    = db.Column(db.String(45), nullable=True)
    session_title = db.Column(db.String(200), nullable=True)

    def __repr__(self):
        return (
            f"<CodeSession id={self.id} "
            f"mode={self.mode} "
            f"lang={self.language} "
            f"status={self.status}>"
        )

    def to_dict(self) -> dict:
        """Convert database row to dictionary for JSON responses."""
        return {
            "id":                    self.id,
            "code_input":            self.code_input,
            "language":              self.language,
            "mode":                  self.mode,
            "result_json":           self.result_json,
            "llm_provider_used":     self.llm_provider_used,
            "response_time_seconds": self.response_time_seconds,
            "status":                self.status,
            "error_message":         self.error_message,
            "created_at":            self.created_at.isoformat(),
            "session_title":         self.session_title,
        }

    @staticmethod
    def generate_title(language: str, mode: str, code: str) -> str:
        """
        Generate a short readable title for this session.
        Example →  Python • Explain • 45 lines
        """
        line_count   = len(code.strip().split("\n"))
        lang_display = language.capitalize() if language != "auto" else "Auto"
        mode_display = mode.capitalize()
        return f"{lang_display} • {mode_display} • {line_count} lines"
    
# ── Snippet Model ─────────────────────────────────────────────────────────────

class Snippet(db.Model):
    """
    User-saved code snippets library.
    Users can save any code with a name and category for later reuse.
    """

    __tablename__ = "snippets"

    id          = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name        = db.Column(db.String(200), nullable=False)
    code        = db.Column(db.Text, nullable=False)
    language    = db.Column(db.String(50), nullable=False, default="auto")
    category    = db.Column(db.String(50), nullable=False, default="General")
    description = db.Column(db.Text, nullable=True)
    created_at  = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at  = db.Column(db.DateTime, nullable=False, default=datetime.utcnow,
                             onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Snippet id={self.id} name={self.name} lang={self.language}>"

    def to_dict(self):
        return {
            "id":          self.id,
            "name":        self.name,
            "code":        self.code,
            "language":    self.language,
            "category":    self.category,
            "description": self.description,
            "created_at":  self.created_at.isoformat(),
            "updated_at":  self.updated_at.isoformat(),
        }