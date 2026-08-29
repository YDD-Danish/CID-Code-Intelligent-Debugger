# C.I.D — Code Intelligent Debugger

An AI-powered code analysis platform. Paste your code, pick a mode, get a structured answer — a plain-English explanation, bug fixes, optimization suggestions, or a security scan.

🌐 **Live demo:** [cid-app.onrender.com](https://cid-app.onrender.com)
*(Runs on Render's free tier, so the first visit after idle can take a few seconds while it wakes up.)*


## What it does

| Mode | What you get |
|------|--------------|
| 📖 **Explain** | Line-by-line plain-English walkthrough of your code |
| 🐞 **Debug** | Bug detection with fixes, a before/after diff view, and the buggy lines highlighted right in the editor |
| ⚡ **Optimize** | Big-O complexity analysis + concrete improvements, with diff |
| 🛡 **Security** | OWASP Top 10 vulnerability scan with risk levels |

### Everything else

- **Run code in 9 languages** — Python, JavaScript, C++, Java, Go, C, Ruby, PHP, Bash
- **Quality score (0–100)** on every analysis, with readability / complexity / best-practices breakdown
- **User accounts** — sign up / log in, with your sessions tied to your account
- **Snippet library** — save, categorize, search and reload your own code
- **Session history** — full history with mode filters, click to reload any session
- **Chat** — ask follow-up questions about the code you analysed
- **PDF export** — professional report of any analysis
- **Share links** — public URL for any session
- **AI code formatter** — clean up messy code in one click
- Monaco editor, 11 editor themes, dark/light mode, 25 settings, 11 keyboard shortcuts, fully mobile-friendly

## Tech stack

| Layer | Tech |
|-------|------|
| Backend | Python 3.14, Flask |
| Database | SQLite + SQLAlchemy |
| AI | Qwen3 27B (LLM API) |
| Frontend | Vanilla JavaScript, HTML5, CSS3 (no frameworks) |
| Code editor | Monaco Editor |
| PDF export | ReportLab |

## Quick start (Windows / PowerShell)

```powershell
git clone https://github.com/YDD-Danish/CID-Code-Intelligent-Debugger.git
cd CID-Code-Intelligent-Debugger

python -m venv venv
venv\Scripts\Activate.ps1
venv\Scripts\pip install -r requirements.txt

# Create a .env file with your API key:
#   GROQ_API_KEY=your_key_here

venv\Scripts\python.exe run.py
```

Then open **http://localhost:5000**

### Note for Python 3.14 users

- Built and tested on Python 3.14. `Pillow` is intentionally **not** in `requirements.txt` (no pre-built wheels for 3.14 yet); PDF export uses ReportLab, which works fine.
- If you have multiple Python versions installed, always use the venv's interpreter (`venv\Scripts\python.exe`), never bare `python`.

## Project structure

```
C.I.D/
├── run.py                  # Entry point
├── app/
│   ├── routes/             # Flask blueprints — main, api, security, history, snippets
│   ├── services/           # LLM calls, prompt builder, response parser, language detector
│   ├── models/             # CodeSession + Snippet (SQLAlchemy)
│   └── utils/              # Validation, rate limiting
├── static/                 # CSS + JS (app, theme, settings, history, chat, shortcuts, snippets)
├── templates/              # Single-page app
└── database/               # SQLite (auto-created on first run)
```

## Team

- **Danish Khan**
- **Anuj Gore**
- **Shubh Srivastav**

*Built as a group project — B.Sc. (AIML).*
