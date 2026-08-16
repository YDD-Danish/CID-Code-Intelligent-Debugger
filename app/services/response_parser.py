# app/services/response_parser.py
# ─────────────────────────────────────────────────────────────────────────────
# C.I.D — Code Intelligent Debugger
# Parses raw AI text into clean Python dictionary
# ─────────────────────────────────────────────────────────────────────────────

import json
import re
from flask import current_app


def _extract_from_markdown(text):
    pattern1 = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL)
    if pattern1:
        return pattern1.group(1).strip()
    pattern2 = re.search(r'```\s*(.*?)\s*```', text, re.DOTALL)
    if pattern2:
        return pattern2.group(1).strip()
    return text.strip()


def _fix_common_json_issues(text):
    text = re.sub(r',\s*([}\]])', r'\1', text)
    return text


def _is_valid_result(result, mode):
    if not isinstance(result, dict):
        return False
    required_fields = {
        "explain":  ["mode", "summary"],
        "debug":    ["mode", "bugs_found"],
        "optimize": ["mode", "current_complexity"],
        "security": ["mode", "overall_risk"],
    }
    fields_needed = required_fields.get(mode, ["mode"])
    for field in fields_needed:
        if field not in result:
            return False
    return True


def _fallback_response(mode, language, error_message):
    base = {
        "mode":          mode,
        "language":      language,
        "parse_error":   True,
        "error_message": error_message,
    }

    if mode == "explain":
        return {
            **base,
            "summary":         error_message,
            "lines":           [],
            "functions":       [],
            "classes":         [],
            "design_patterns": [],
            "key_concepts":    [],
            "beginner_tip":    "Please try submitting the code again.",
        }

    elif mode == "debug":
        return {
            **base,
            "bugs_found":      0,
            "overall_status":  "error",
            "summary":         error_message,
            "bugs":            [],
            "fixed_code":      "",
            "additional_notes": "Please try again.",
        }

    elif mode == "optimize":
        return {
            **base,
            "summary": error_message,
            "current_complexity": {
                "time":  "Unknown",
                "space": "Unknown"
            },
            "optimized_complexity": {
                "time":  "Unknown",
                "space": "Unknown"
            },
            "suggestions":       [],
            "optimized_code":    "",
            "improvement_score": 0,
            "key_improvements":  [],
        }

    elif mode == "security":
        return {
            **base,
            "overall_risk":    "unknown",
            "safe_to_deploy":  None,
            "summary":         error_message,
            "vulnerabilities": [],
            "total_found":     0,
            "critical_count":  0,
            "high_count":      0,
            "medium_count":    0,
            "low_count":       0,
            "owasp_checks":    [],
            "recommendations": [],
        }

    return base


def parse_llm_response(raw_response, mode, language):
    """
    Parse raw AI text response into a clean Python dictionary.

    Args:
        raw_response: Raw text string from the AI
        mode:         explain, debug, optimize, or security
        language:     Programming language that was analyzed

    Returns:
        Clean Python dictionary with parsed result.
        Returns safe fallback dictionary if parsing fails.
    """

    if not raw_response or not raw_response.strip():
        return _fallback_response(mode, language, "AI returned empty response")

    # Step 1 — Remove markdown wrappers
    cleaned = _extract_from_markdown(raw_response)

    # Step 2 — Try direct JSON parse
    try:
        result = json.loads(cleaned)
        if _is_valid_result(result, mode):
            return result
    except json.JSONDecodeError:
        pass

    # Step 3 — Find JSON object anywhere in response
    json_match = re.search(r'\{.*\}', raw_response, re.DOTALL)
    if json_match:
        try:
            result = json.loads(json_match.group())
            if _is_valid_result(result, mode):
                return result
        except json.JSONDecodeError:
            pass

    # Step 4 — Fix common issues and try again
    try:
        fixed  = _fix_common_json_issues(cleaned)
        result = json.loads(fixed)
        if _is_valid_result(result, mode):
            return result
    except Exception:
        pass

    # Step 5 — All parsing failed
    current_app.logger.warning(
        f"Could not parse AI response for mode={mode}. "
        f"Preview: {raw_response[:200]}"
    )

    return _fallback_response(
        mode,
        language,
        "Could not parse AI response. Please try again."
    )