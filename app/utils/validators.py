# app/utils/validators.py
# ─────────────────────────────────────────────────────────────────────────────
# C.I.D — Code Intelligent Debugger
# Input validation functions
#
# Every piece of user input passes through here before touching the LLM.
# This protects against empty submissions, oversized code, unsupported
# languages, and malformed requests.
# ─────────────────────────────────────────────────────────────────────────────

from flask import current_app


# ── Constants ─────────────────────────────────────────────────────────────────

VALID_MODES = ["explain", "debug", "optimize", "security"]

SUPPORTED_LANGUAGES = [
    "python", "javascript", "typescript", "java",
    "cpp", "c", "csharp", "go", "rust", "php",
    "ruby", "swift", "kotlin", "sql", "html",
    "css", "bash", "r", "matlab", "auto",
]

# Language display names for error messages
LANGUAGE_DISPLAY = {
    "python":     "Python",
    "javascript": "JavaScript",
    "typescript": "TypeScript",
    "java":       "Java",
    "cpp":        "C++",
    "c":          "C",
    "csharp":     "C#",
    "go":         "Go",
    "rust":       "Rust",
    "php":        "PHP",
    "ruby":       "Ruby",
    "swift":      "Swift",
    "kotlin":     "Kotlin",
    "sql":        "SQL",
    "html":       "HTML",
    "css":        "CSS",
    "bash":       "Bash",
    "r":          "R",
    "matlab":     "MATLAB",
    "auto":       "Auto Detect",
}


# ── Main Validation Function ──────────────────────────────────────────────────

def validate_code_request(data: dict) -> tuple[bool, str, dict]:
    """
    Validate an incoming code analysis request.

    Args:
        data: The parsed JSON body from the request

    Returns:
        Tuple of (is_valid, error_message, cleaned_data)
        - is_valid    → True if all checks pass, False if any fail
        - error_message → Human readable explanation of what went wrong
        - cleaned_data  → Sanitized and normalized version of the input

    Usage in a route:
        is_valid, error_msg, clean = validate_code_request(request.get_json())
        if not is_valid:
            return jsonify({"success": False, "message": error_msg}), 400
    """

    # ── Check 1: Request body must exist ─────────────────────────────────────
    if not data:
        return False, "Request body is empty. Please send JSON data.", {}

    # ── Check 2: Code field must exist ───────────────────────────────────────
    code = data.get("code", "")
    if not code:
        return False, "No code provided. Please paste some code to analyze.", {}

    # ── Check 3: Code must be a string ───────────────────────────────────────
    if not isinstance(code, str):
        return False, "Code must be a text string.", {}

    # ── Check 4: Code must not be only whitespace ─────────────────────────────
    if not code.strip():
        return False, "Code appears to be empty. Please paste some code.", {}

    # ── Check 5: Code must not be too short ───────────────────────────────────
    if len(code.strip()) < 5:
        return False, "Code is too short to analyze. Please provide more code.", {}

    # ── Check 6: Code must not exceed maximum length ──────────────────────────
    max_length = current_app.config.get("MAX_CODE_LENGTH", 50000)
    if len(code) > max_length:
        return (
            False,
            f"Code is too long ({len(code):,} characters). "
            f"Maximum allowed is {max_length:,} characters. "
            f"Please split your code into smaller sections.",
            {}
        )

    # ── Check 7: Language must be valid ───────────────────────────────────────
    language = data.get("language", "auto").lower().strip()
    if language not in SUPPORTED_LANGUAGES:
        supported_list = ", ".join(SUPPORTED_LANGUAGES)
        return (
            False,
            f"Language '{language}' is not supported. "
            f"Supported languages: {supported_list}",
            {}
        )

    # ── Check 8: Mode must be valid ───────────────────────────────────────────
    mode = data.get("mode", "").lower().strip()
    if mode not in VALID_MODES:
        return (
            False,
            f"Invalid mode '{mode}'. "
            f"Valid modes are: {', '.join(VALID_MODES)}",
            {}
        )

    # ── All checks passed — return cleaned data ───────────────────────────────
    cleaned_data = {
        "code":     code.strip(),
        "language": language,
        "mode":     mode,
        # Optional fields with defaults
        "beginner_mode": bool(data.get("beginner_mode", False)),
        "include_examples": bool(data.get("include_examples", True)),
    }

    return True, "", cleaned_data


# ── Individual Field Validators ───────────────────────────────────────────────

def validate_language(language: str) -> bool:
    """Check if a language string is in our supported list."""
    return language.lower().strip() in SUPPORTED_LANGUAGES


def validate_mode(mode: str) -> bool:
    """Check if a mode string is valid."""
    return mode.lower().strip() in VALID_MODES


def sanitize_code(code: str) -> str:
    """
    Basic sanitization of code input.
    Strips leading/trailing whitespace but preserves internal structure.
    We do NOT escape HTML here — that happens in the frontend renderer.
    """
    return code.strip()


def get_code_stats(code: str) -> dict:
    """
    Return basic statistics about the submitted code.
    These are included in API responses so the frontend can display them.

    Example return:
        {
            "line_count": 45,
            "char_count": 1203,
            "word_count": 189,
            "is_large": False
        }
    """
    lines      = code.strip().split("\n")
    line_count = len(lines)
    char_count = len(code)
    word_count = len(code.split())

    return {
        "line_count": line_count,
        "char_count": char_count,
        "word_count": word_count,
        # Flag large files so frontend can show a warning
        "is_large":   char_count > 10000,
    }