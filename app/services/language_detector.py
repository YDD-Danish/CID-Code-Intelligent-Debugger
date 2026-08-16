# app/services/language_detector.py
# ─────────────────────────────────────────────────────────────────────────────
# C.I.D — Code Intelligent Debugger
# Automatic programming language detection
# ─────────────────────────────────────────────────────────────────────────────

import re

LANGUAGE_PATTERNS = {
    "python": [
        r"^\s*def\s+\w+\s*\(",
        r"^\s*class\s+\w+.*:",
        r"^\s*import\s+\w+",
        r"^\s*from\s+\w+\s+import",
        r"print\s*\(",
        r"^\s*if\s+__name__\s*==",
        r":\s*$",
        r"^\s*#",
        r"elif\s+",
        r"lambda\s+",
        r"^\s*@\w+",
        r"f\".*\"",
        r"None|True|False",
    ],
    "javascript": [
        r"const\s+\w+\s*=",
        r"let\s+\w+\s*=",
        r"var\s+\w+\s*=",
        r"function\s+\w+\s*\(",
        r"=>\s*{",
        r"console\.log\(",
        r"document\.",
        r"require\s*\(",
        r"module\.exports",
        r"import\s+.*\s+from\s+['\"]",
        r"===|!==",
        r"async\s+function",
        r"\.then\s*\(",
        r"undefined|null",
    ],
    "typescript": [
        r":\s*string|:\s*number|:\s*boolean",
        r"interface\s+\w+\s*{",
        r"type\s+\w+\s*=",
        r"<T>|<T,\s*",
        r"as\s+\w+",
        r"readonly\s+",
        r"enum\s+\w+",
        r"implements\s+\w+",
        r"public\s+|private\s+|protected\s+",
    ],
    "java": [
        r"public\s+class\s+\w+",
        r"public\s+static\s+void\s+main",
        r"System\.out\.println",
        r"import\s+java\.",
        r"@Override",
        r"new\s+\w+\s*\(",
        r"private\s+|public\s+|protected\s+",
        r"throws\s+\w+",
        r"extends\s+\w+",
        r"implements\s+\w+",
    ],
    "cpp": [
        r"#include\s*<",
        r"std::",
        r"cout\s*<<",
        r"cin\s*>>",
        r"int\s+main\s*\(",
        r"namespace\s+\w+",
        r"::\w+",
        r"->",
        r"nullptr",
        r"template\s*<",
    ],
    "c": [
        r"#include\s*<stdio\.h>",
        r"#include\s*<stdlib\.h>",
        r"printf\s*\(",
        r"scanf\s*\(",
        r"int\s+main\s*\(\s*void\s*\)",
        r"malloc\s*\(",
        r"free\s*\(",
        r"struct\s+\w+\s*{",
    ],
    "csharp": [
        r"using\s+System",
        r"namespace\s+\w+",
        r"Console\.Write",
        r"public\s+class\s+\w+",
        r"static\s+void\s+Main",
        r"var\s+\w+\s*=\s*new",
        r"string\s+\w+\s*=",
        r"List<|Dictionary<",
    ],
    "go": [
        r"^package\s+\w+",
        r"^import\s+\(",
        r"func\s+\w+\s*\(",
        r"fmt\.Print",
        r":=\s*",
        r"goroutine|go\s+func",
        r"chan\s+|<-",
        r"defer\s+",
        r"interface\s*{",
    ],
    "rust": [
        r"fn\s+main\s*\(\s*\)",
        r"let\s+mut\s+",
        r"println!\s*\(",
        r"use\s+std::",
        r"impl\s+\w+",
        r"match\s+\w+\s*{",
        r"Option<|Result<",
        r"&str|String",
        r"->.*{",
    ],
    "php": [
        r"<\?php",
        r"\$\w+\s*=",
        r"echo\s+",
        r"function\s+\w+\s*\(",
        r"->",
        r"::",
        r"array\s*\(",
        r"foreach\s*\(",
        r"require_once|include_once",
    ],
    "ruby": [
        r"def\s+\w+",
        r"puts\s+",
        r"end\s*$",
        r"\.each\s*do",
        r"require\s+'",
        r"attr_accessor",
        r"class\s+\w+\s*<",
        r"nil|true|false",
        r"@\w+",
        r":\w+",
    ],
    "sql": [
        r"SELECT\s+.*FROM",
        r"INSERT\s+INTO",
        r"UPDATE\s+\w+\s+SET",
        r"DELETE\s+FROM",
        r"CREATE\s+TABLE",
        r"DROP\s+TABLE",
        r"WHERE\s+",
        r"JOIN\s+\w+",
        r"GROUP\s+BY",
        r"ORDER\s+BY",
    ],
    "html": [
        r"<!DOCTYPE\s+html>",
        r"<html",
        r"<head>|<\/head>",
        r"<body>|<\/body>",
        r"<div|<span|<p>",
        r"<script|<style",
        r"href=|src=",
    ],
    "css": [
        r"\w+\s*{[^}]*}",
        r":\s*\w+;",
        r"@media\s+",
        r"#\w+\s*{",
        r"\.\w+\s*{",
        r"margin:|padding:|color:",
        r"px|em|rem|vh|vw",
    ],
    "bash": [
        r"^#!/bin/bash",
        r"^#!/bin/sh",
        r"\$\{?\w+\}?",
        r"echo\s+",
        r"if\s+\[",
        r"for\s+\w+\s+in\s+",
        r"chmod\s+|chown\s+",
        r"\|\s*grep\s+",
    ],
}


def detect_language(code: str) -> str:
    """
    Analyze code and return the most likely programming language.
    Returns 'unknown' if no language scores above threshold.
    """

    if not code or not code.strip():
        return "unknown"

    scores = {}

    for language, patterns in LANGUAGE_PATTERNS.items():
        score = 0
        for pattern in patterns:
            try:
                matches = re.findall(
                    pattern, code, re.MULTILINE | re.IGNORECASE
                )
                if matches:
                    score += len(matches)
            except re.error:
                continue

        if score > 0:
            scores[language] = score

    if not scores:
        return "unknown"

    best_language = max(scores, key=scores.get)

    if scores[best_language] < 2:
        return "unknown"

    return best_language


def detect_language_with_confidence(code: str) -> dict:
    """
    Same as detect_language but returns confidence level too.
    """

    if not code or not code.strip():
        return {"detected": "unknown", "confidence": "none", "scores": {}}

    scores = {}

    for language, patterns in LANGUAGE_PATTERNS.items():
        score = 0
        for pattern in patterns:
            try:
                matches = re.findall(
                    pattern, code, re.MULTILINE | re.IGNORECASE
                )
                if matches:
                    score += len(matches)
            except re.error:
                continue
        if score > 0:
            scores[language] = score

    if not scores:
        return {"detected": "unknown", "confidence": "none", "scores": {}}

    best_language = max(scores, key=scores.get)
    best_score    = scores[best_language]

    if best_score >= 8:
        confidence = "high"
    elif best_score >= 4:
        confidence = "medium"
    elif best_score >= 2:
        confidence = "low"
    else:
        confidence = "none"
        best_language = "unknown"

    return {
        "detected":   best_language,
        "confidence": confidence,
        "scores":     dict(
            sorted(scores.items(), key=lambda x: x[1], reverse=True)
        )
    }