# app/extensions.py
# ─────────────────────────────────────────────────────────────────────────────
# C.I.D — Code Intelligent Debugger
# Flask extension instances — created here, initialized in app/__init__.py
# ─────────────────────────────────────────────────────────────────────────────

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS
from flask_login import LoginManager

db = SQLAlchemy()
migrate = Migrate()
limiter = Limiter(key_func=get_remote_address)
cors = CORS()
login_manager = LoginManager()