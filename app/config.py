# app/config.py
# ─────────────────────────────────────────────────────────────────────────────
# C.I.D — Code Intelligent Debugger
# Configuration classes for different environments
# ─────────────────────────────────────────────────────────────────────────────

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration shared across all environments."""

    # ── App Identity ──────────────────────────────────────────────────────────
    APP_NAME        = os.environ.get("APP_NAME")        or "C.I.D"
    APP_FULL_NAME   = os.environ.get("APP_FULL_NAME")   or "Code Intelligent Debugger"
    APP_VERSION     = os.environ.get("APP_VERSION")     or "1.0.0"
    APP_AUTHOR      = os.environ.get("APP_AUTHOR")      or "Danish Khan"

    # ── Security ──────────────────────────────────────────────────────────────
    SECRET_KEY = (
        os.environ.get("FLASK_SECRET_KEY") or "fallback-dev-key-change-in-prod"
    )

    # ── Database ──────────────────────────────────────────────────────────────
    SQLALCHEMY_DATABASE_URI = (
        os.environ.get("DATABASE_URL") or "sqlite:///database/cid.db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ── LLM API Keys ──────────────────────────────────────────────────────────
    GROQ_API_KEY          = os.environ.get("GROQ_API_KEY")
    GEMINI_API_KEY        = os.environ.get("GEMINI_API_KEY")
    DEFAULT_LLM_PROVIDER  = os.environ.get("DEFAULT_LLM_PROVIDER") or "groq"

    # ── App Behaviour ─────────────────────────────────────────────────────────
    MAX_CODE_LENGTH       = int(os.environ.get("MAX_CODE_LENGTH")       or 50000)
    RATE_LIMIT_PER_MINUTE = int(os.environ.get("RATE_LIMIT_PER_MINUTE") or 10)

    # ── Supported Languages ───────────────────────────────────────────────────
    SUPPORTED_LANGUAGES = [
        "python", "javascript", "typescript", "java",
        "cpp", "c", "csharp", "go", "rust", "php",
        "ruby", "swift", "kotlin", "sql", "html",
        "css", "bash", "r", "matlab", "auto",
    ]


class DevelopmentConfig(Config):
    DEBUG           = True
    TESTING         = False
    SQLALCHEMY_ECHO = False


class TestingConfig(Config):
    TESTING                 = True
    DEBUG                   = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    RATE_LIMIT_PER_MINUTE   = 9999


class ProductionConfig(Config):
    DEBUG   = False
    TESTING = False


config_map = {
    "development" : DevelopmentConfig,
    "testing"     : TestingConfig,
    "production"  : ProductionConfig,
}