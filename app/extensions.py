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

# Database ORM
db = SQLAlchemy()

# Migration manager
migrate = Migrate()

# Rate limiter — limits by IP address
limiter = Limiter(key_func=get_remote_address)

# CORS — allows browser JS to call our Flask API
cors = CORS()