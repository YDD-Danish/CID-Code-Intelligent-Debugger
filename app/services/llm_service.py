# app/services/llm_service.py
# ─────────────────────────────────────────────────────────────────────────────
# C.I.D — Code Intelligent Debugger
# LLM Service — Groq API Only
#
# Note: Google Generativeai removed due to Python 3.14 incompatibility
# Groq with Llama 3.1 70B is our primary and only LLM for now
# ─────────────────────────────────────────────────────────────────────────────

import time
from flask import current_app
from groq import Groq

from .prompt_builder import (
    build_explain_prompt,
    build_debug_prompt,
    build_optimize_prompt,
    build_security_prompt,
)
from .response_parser import parse_llm_response
from .language_detector import detect_language


# ── Model Settings ────────────────────────────────────────────────────────────

GROQ_MODEL  = "groq/compound-mini"
MAX_TOKENS  = 4096
TEMPERATURE = 0.1


# ── Main Function ─────────────────────────────────────────────────────────────

def analyze_code(
    code: str,
    language: str,
    mode: str,
    beginner_mode: bool = False
) -> dict:
    """
    Main entry point for all code analysis.
    Called by every route in api.py and security.py.

    Args:
        code:          The user's code to analyze
        language:      Programming language — "auto" triggers detection
        mode:          "explain", "debug", "optimize", or "security"
        beginner_mode: If True use simpler explanations

    Returns:
        {
            "result":        { parsed AI response },
            "provider":      "groq",
            "language":      "python",
            "response_time": 1.23
        }

    Raises:
        Exception if Groq fails or no API key is set
    """

    start_time = time.time()

    # ── Step 1: Resolve Language ──────────────────────────────────────────────
    if language == "auto":
        detected          = detect_language(code)
        resolved_language = detected if detected != "unknown" else "python"
        current_app.logger.info(f"Auto detected language: {resolved_language}")
    else:
        resolved_language = language

    # ── Step 2: Build Prompt ──────────────────────────────────────────────────
    prompt = _build_prompt(mode, code, resolved_language, beginner_mode)

    # ── Step 3: Check API Key ─────────────────────────────────────────────────
    groq_key = current_app.config.get("GROQ_API_KEY")

    if not groq_key:
        raise Exception(
            "GROQ_API_KEY not found. "
            "Please add it to your .env file."
        )

    # ── Step 4: Call Groq ─────────────────────────────────────────────────────
    try:
        current_app.logger.info(
            f"Calling Groq — mode={mode} language={resolved_language}"
        )

        raw_response  = _call_groq(prompt, groq_key)
        result        = parse_llm_response(raw_response, mode, resolved_language)
        response_time = round(time.time() - start_time, 3)

        current_app.logger.info(f"Groq responded in {response_time}s")

        return {
            "result":        result,
            "provider":      "groq",
            "language":      resolved_language,
            "response_time": response_time,
        }

    except Exception as e:
        current_app.logger.error(f"Groq API error: {e}")
        raise Exception(f"AI analysis failed: {str(e)}")


# ── Groq API Call ─────────────────────────────────────────────────────────────

def _call_groq(prompt: str, api_key: str, expect_json: bool = True) -> str:
    """
    Send prompt to Groq and return raw text response.

    Args:
        prompt:      Complete prompt string
        api_key:     Groq API key from .env
        expect_json: True for analysis modes (returns JSON)
                     False for chat mode (returns natural conversation)

    Returns:
        Raw text response from the AI

    Raises:
        Exception on any API error or rate limit
    """

    client = Groq(api_key=api_key)

    # Choose system message based on response type
    if expect_json:
        system_msg = (
            "You are C.I.D, an expert code analysis assistant. "
            "You always respond with valid JSON only. "
            "Never include markdown or any text outside the JSON object."
        )
        temp = TEMPERATURE
    else:
        system_msg = (
            "You are C.I.D, a friendly and helpful code assistant. "
            "Respond naturally and conversationally. "
            "Keep answers clear, concise, and beginner-friendly."
        )
        temp = 0.4

    try:
        response = client.chat.completions.create(
            model    = GROQ_MODEL,
            messages = [
                {
                    "role":    "system",
                    "content": system_msg
                },
                {
                    "role":    "user",
                    "content": prompt
                }
            ],
            temperature = temp,
            max_tokens  = MAX_TOKENS,
        )
        return response.choices[0].message.content

    except Exception as e:
        err_msg = str(e).lower()
        if "429" in err_msg or "rate_limit" in err_msg or "rate limit" in err_msg:
            raise Exception("Rate limit reached on Groq free tier. Please wait 10–15 seconds before trying again.")
        raise Exception(f"Groq API error: {str(e)}")

# ── Prompt Router ─────────────────────────────────────────────────────────────

def _build_prompt(
    mode: str,
    code: str,
    language: str,
    beginner_mode: bool = False
) -> str:
    """Route to the correct prompt builder based on mode."""

    if mode == "explain":
        return build_explain_prompt(code, language, beginner_mode)

    elif mode == "debug":
        return build_debug_prompt(code, language)

    elif mode == "optimize":
        return build_optimize_prompt(code, language)

    elif mode == "security":
        return build_security_prompt(code, language)

    else:
        raise ValueError(
            f"Unknown mode: {mode}. "
            f"Must be explain, debug, optimize, or security."
        )