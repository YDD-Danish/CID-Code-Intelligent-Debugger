# run.py
# ─────────────────────────────────────────────────────────────────────────────
# C.I.D — Code Intelligent Debugger
# Entry Point
#
# HOW TO START EVERY TIME:
#   1. Open PowerShell
#   2. cd "$env:USERPROFILE\C.I.D"
#   3. venv\Scripts\Activate.ps1
#   4. python run.py
#   5. Open browser → http://localhost:5000
# ─────────────────────────────────────────────────────────────────────────────

import os
from dotenv import load_dotenv

# Load .env BEFORE importing app so API keys are ready
load_dotenv()

# Production flag — Render sets this automatically
IS_PRODUCTION = os.environ.get("RENDER", False)


from app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))

    app.run(
        host         = "0.0.0.0",
        port         = port,
        debug        = False,
        use_reloader = False,
    )