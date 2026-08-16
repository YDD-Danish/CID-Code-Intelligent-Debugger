# app/routes/api.py
# ─────────────────────────────────────────────────────────────────────────────
# C.I.D — Code Intelligent Debugger
# Main API endpoints — NOW WITH REAL AI
# ─────────────────────────────────────────────────────────────────────────────

import json
import hashlib
from flask import Blueprint, jsonify, request, current_app
from ..utils.validators import validate_code_request, get_code_stats
from ..models.code_session import CodeSession
from ..services.llm_service import analyze_code
from ..extensions import db

api_bp = Blueprint("api", __name__)


def save_session(code, language, mode, result, provider, response_time,
                 status="success", error_message=None):
    """Save one analysis session to the database."""
    try:
        session = CodeSession(
            code_input            = code,
            language              = language,
            mode                  = mode,
            result_json           = json.dumps(result) if result else None,
            llm_provider_used     = provider,
            response_time_seconds = response_time,
            status                = status,
            error_message         = error_message,
            ip_address            = request.remote_addr,
            session_title         = CodeSession.generate_title(language, mode, code),
        )
        db.session.add(session)
        db.session.commit()
        return session
    except Exception as e:
        current_app.logger.error(f"Failed to save session: {e}")
        db.session.rollback()
        return None


@api_bp.route("/explain", methods=["POST"])
def explain_code():
    """Receive code and return real AI explanation."""

    data = request.get_json(silent=True)
    if data is None:
        return jsonify({
            "success": False,
            "error":   "Invalid JSON",
            "message": "Request body must be valid JSON"
        }), 400

    data["mode"] = "explain"
    is_valid, error_msg, clean_data = validate_code_request(data)

    if not is_valid:
        return jsonify({
            "success": False,
            "error":   "Validation Error",
            "message": error_msg
        }), 400

    stats = get_code_stats(clean_data["code"])

    try:
        llm_response  = analyze_code(
            code          = clean_data["code"],
            language      = clean_data["language"],
            mode          = "explain",
            beginner_mode = clean_data.get("beginner_mode", False)
        )
        result        = llm_response["result"]
        provider      = llm_response["provider"]
        resolved_lang = llm_response["language"]
        response_time = llm_response["response_time"]

    except Exception as e:
        current_app.logger.error(f"LLM error in explain: {e}")
        save_session(
            code          = clean_data["code"],
            language      = clean_data["language"],
            mode          = "explain",
            result        = None,
            provider      = "none",
            response_time = 0,
            status        = "error",
            error_message = str(e)
        )
        return jsonify({
            "success": False,
            "error":   "Analysis Failed",
            "message": "AI analysis failed. Please try again.",
            "detail":  str(e)
        }), 500

    session = save_session(
        code          = clean_data["code"],
        language      = resolved_lang,
        mode          = "explain",
        result        = result,
        provider      = provider,
        response_time = response_time,
        status        = "success"
    )

    return jsonify({
        "success":       True,
        "mode":          "explain",
        "language":      resolved_lang,
        "result":        result,
        "stats":         stats,
        "provider":      provider,
        "response_time": response_time,
        "session_id":    session.id if session else None,
        "message":       "Code explained successfully"
    }), 200


@api_bp.route("/debug", methods=["POST"])
def debug_code():
    """Receive code and return real AI bug detection."""

    data = request.get_json(silent=True)
    if data is None:
        return jsonify({
            "success": False,
            "error":   "Invalid JSON",
            "message": "Request body must be valid JSON"
        }), 400

    data["mode"] = "debug"
    is_valid, error_msg, clean_data = validate_code_request(data)

    if not is_valid:
        return jsonify({
            "success": False,
            "error":   "Validation Error",
            "message": error_msg
        }), 400

    stats = get_code_stats(clean_data["code"])

    try:
        llm_response  = analyze_code(
            code     = clean_data["code"],
            language = clean_data["language"],
            mode     = "debug"
        )
        result        = llm_response["result"]
        provider      = llm_response["provider"]
        resolved_lang = llm_response["language"]
        response_time = llm_response["response_time"]

    except Exception as e:
        current_app.logger.error(f"LLM error in debug: {e}")
        save_session(
            code          = clean_data["code"],
            language      = clean_data["language"],
            mode          = "debug",
            result        = None,
            provider      = "none",
            response_time = 0,
            status        = "error",
            error_message = str(e)
        )
        return jsonify({
            "success": False,
            "error":   "Debug Failed",
            "message": "AI debug failed. Please try again.",
            "detail":  str(e)
        }), 500

    session = save_session(
        code          = clean_data["code"],
        language      = resolved_lang,
        mode          = "debug",
        result        = result,
        provider      = provider,
        response_time = response_time,
        status        = "success"
    )

    return jsonify({
        "success":       True,
        "mode":          "debug",
        "language":      resolved_lang,
        "result":        result,
        "stats":         stats,
        "provider":      provider,
        "response_time": response_time,
        "session_id":    session.id if session else None,
        "message":       "Code debugged successfully"
    }), 200


@api_bp.route("/optimize", methods=["POST"])
def optimize_code():
    """Receive code and return real AI optimization with Big O analysis."""

    data = request.get_json(silent=True)
    if data is None:
        return jsonify({
            "success": False,
            "error":   "Invalid JSON",
            "message": "Request body must be valid JSON"
        }), 400

    data["mode"] = "optimize"
    is_valid, error_msg, clean_data = validate_code_request(data)

    if not is_valid:
        return jsonify({
            "success": False,
            "error":   "Validation Error",
            "message": error_msg
        }), 400

    stats = get_code_stats(clean_data["code"])

    try:
        llm_response  = analyze_code(
            code     = clean_data["code"],
            language = clean_data["language"],
            mode     = "optimize"
        )
        result        = llm_response["result"]
        provider      = llm_response["provider"]
        resolved_lang = llm_response["language"]
        response_time = llm_response["response_time"]

    except Exception as e:
        current_app.logger.error(f"LLM error in optimize: {e}")
        save_session(
            code          = clean_data["code"],
            language      = clean_data["language"],
            mode          = "optimize",
            result        = None,
            provider      = "none",
            response_time = 0,
            status        = "error",
            error_message = str(e)
        )
        return jsonify({
            "success": False,
            "error":   "Optimization Failed",
            "message": "AI optimization failed. Please try again.",
            "detail":  str(e)
        }), 500

    session = save_session(
        code          = clean_data["code"],
        language      = resolved_lang,
        mode          = "optimize",
        result        = result,
        provider      = provider,
        response_time = response_time,
        status        = "success"
    )

    return jsonify({
        "success":       True,
        "mode":          "optimize",
        "language":      resolved_lang,
        "result":        result,
        "stats":         stats,
        "provider":      provider,
        "response_time": response_time,
        "session_id":    session.id if session else None,
        "message":       "Code optimized successfully"
    }), 200
    
    # ── Route: Run Code ────────────────────────────────────────────────────────

@api_bp.route("/run", methods=["POST"])
def run_code():
    """
    Run Python or JavaScript code and return the output.
    Uses subprocess with timeout for safety.
    """
    import subprocess
    import tempfile
    import os

    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"success": False, "error": "Invalid JSON"}), 400

    code     = data.get("code", "").strip()
    language = data.get("language", "auto").lower()

    if not code:
        return jsonify({"success": False, "error": "No code provided"}), 400

    if len(code) > 10000:
        return jsonify({
            "success": False,
            "error": "Code too long to run (max 10,000 chars)"
        }), 400

    # Determine language if auto
    if language == "auto":
        from ..services.language_detector import detect_language
        detected = detect_language(code)

        # If detection failed, try simple keyword checks
        if detected == "unknown":
            code_lower = code.lower()
            if any(kw in code_lower for kw in ["print(", "def ", "import ", "elif", "self."]):
                detected = "python"
            elif any(kw in code_lower for kw in ["console.log", "function ", "const ", "let ", "=>"]):
                detected = "javascript"
            elif "public class" in code_lower or "system.out" in code_lower:
                detected = "java"
            elif "#include" in code_lower and "std::" in code_lower:
                detected = "cpp"
            elif "#include" in code_lower and "printf" in code_lower:
                detected = "c"
            elif "puts " in code_lower or "def " in code_lower and "end" in code_lower:
                detected = "ruby"
            elif "<?php" in code_lower or "$" in code:
                detected = "php"
            elif "package main" in code_lower or "fmt.print" in code_lower:
                detected = "go"
            else:
                detected = "python"

        language = detected

    # Languages we support for execution
    SUPPORTED_RUN_LANGUAGES = {
        "python":     {"suffix": ".py",   "cmd": ["python", "-u"],       "compile": None},
        "javascript": {"suffix": ".js",   "cmd": ["node"],                "compile": None},
        "ruby":       {"suffix": ".rb",   "cmd": ["ruby"],                "compile": None},
        "php":        {"suffix": ".php",  "cmd": ["php"],                 "compile": None},
        "bash":       {"suffix": ".sh",   "cmd": ["bash"],                "compile": None},
        "go":         {"suffix": ".go",   "cmd": ["go", "run"],           "compile": None},
        "java":       {"suffix": ".java", "cmd": None, "compile": "java"},
        "cpp":        {"suffix": ".cpp",  "cmd": None, "compile": "cpp"},
        "c":          {"suffix": ".c",    "cmd": None, "compile": "c"},
    }

    if language not in SUPPORTED_RUN_LANGUAGES:
        return jsonify({
            "success": False,
            "error": (
                "Run not available for: " + language + ". "
                "Supported: " + ", ".join(SUPPORTED_RUN_LANGUAGES.keys())
            )
        }), 400

    config = SUPPORTED_RUN_LANGUAGES[language]
    suffix = config["suffix"]

    try:

        # Write code to temporary file
        tmp = tempfile.NamedTemporaryFile(
            mode     = "w",
            suffix   = suffix,
            delete   = False,
            encoding = "utf-8"
        )
        tmp.write(code)
        tmp.close()

        # Handle compiled languages (Java, C, C++)
        compile_type = config.get("compile")

        if compile_type == "java":
            # Java needs class name to match file name
            import re as _re
            class_match = _re.search(r'public\s+class\s+(\w+)', code)
            if not class_match:
                os.unlink(tmp.name)
                return jsonify({
                    "success": False,
                    "error": "Java code must contain 'public class ClassName'"
                }), 200

            class_name = class_match.group(1)
            java_dir = tempfile.gettempdir()
            java_file = os.path.join(java_dir, class_name + ".java")

            # Rename tmp file to match class name
            import shutil
            shutil.move(tmp.name, java_file)
            tmp.name = java_file

            # Compile
            compile_result = subprocess.run(
                ["javac", java_file],
                capture_output=True, text=True, timeout=15, cwd=java_dir
            )
            if compile_result.returncode != 0:
                os.unlink(java_file)
                return jsonify({
                    "success": False,
                    "error": "Compilation failed:\n" + compile_result.stderr
                }), 200

            # Run
            result = subprocess.run(
                ["java", class_name],
                capture_output=True, text=True, timeout=10, cwd=java_dir
            )

            # Cleanup .class file
            class_file = os.path.join(java_dir, class_name + ".class")
            if os.path.exists(class_file):
                os.unlink(class_file)

        elif compile_type in ("cpp", "c"):
            # C/C++ compile with g++ or gcc
            compiler = "g++" if compile_type == "cpp" else "gcc"
            exe_file = tmp.name + ".exe"

            compile_result = subprocess.run(
                [compiler, tmp.name, "-o", exe_file],
                capture_output=True, text=True, timeout=15
            )
            if compile_result.returncode != 0:
                os.unlink(tmp.name)
                return jsonify({
                    "success": False,
                    "error": "Compilation failed:\n" + compile_result.stderr
                }), 200

            # Run compiled binary
            result = subprocess.run(
                [exe_file],
                capture_output=True, text=True, timeout=10
            )

            # Cleanup
            if os.path.exists(exe_file):
                os.unlink(exe_file)

        else:
            # Interpreted languages
            cmd = config["cmd"]
            result = subprocess.run(
                cmd + [tmp.name],
                capture_output = True,
                text           = True,
                timeout        = 10,
                cwd            = tempfile.gettempdir()
            )

        # Clean up temp file
        os.unlink(tmp.name)

        if result.returncode == 0:
            output = result.stdout or "(No output)"
            return jsonify({
                "success":  True,
                "output":   output,
                "language": language
            }), 200
        else:
            error_output = result.stderr or "Unknown error"
            return jsonify({
                "success":  False,
                "error":    error_output,
                "language": language
            }), 200

    except subprocess.TimeoutExpired:
        try:
            os.unlink(tmp.name)
        except Exception:
            pass
        return jsonify({
            "success": False,
            "error": "Code took too long (max 10 seconds). Possible infinite loop."
        }), 200

    except FileNotFoundError:
        try:
            os.unlink(tmp.name)
        except Exception:
            pass
        interpreter = "Python" if language == "python" else "Node.js"
        return jsonify({
            "success": False,
            "error": interpreter + " is not installed or not in PATH."
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Execution error: " + str(e)
        }), 500

# ── Route: Chat Follow-up ──────────────────────────────────────────────────

@api_bp.route("/chat", methods=["POST"])
def chat_followup():
    """
    Handle follow-up questions about previously analyzed code.
    """
    from ..services.llm_service import _call_groq

    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"success": False, "error": "Invalid JSON"}), 400

    code     = data.get("code", "").strip()
    question = data.get("question", "").strip()
    language = data.get("language", "auto")

    if not question:
        return jsonify({"success": False, "error": "No question provided"}), 400

    if len(question) > 500:
        return jsonify({
            "success": False,
            "error": "Question too long (max 500 chars)"
        }), 400

    # Build the prompt using string concatenation to avoid quote issues
    prompt = (
        "You are C.I.D, a helpful code assistant.\n"
        "The user is asking a follow-up question about their code.\n\n"
        "THEIR CODE (" + language + "):\n"
        + code + "\n\n"
        "THEIR QUESTION:\n"
        + question + "\n\n"
        "INSTRUCTIONS:\n"
        "- Answer clearly and concisely (2-4 sentences maximum)\n"
        "- Use plain English, avoid jargon unless necessary\n"
        "- If asking about a specific line or concept, be direct\n"
        "- If asking for alternatives, give one clear suggestion\n"
        "- Do NOT respond with JSON, just answer naturally\n"
        "- Keep response under 200 words"
    )

    try:
        groq_key = current_app.config.get("GROQ_API_KEY")
        if not groq_key:
            return jsonify({
                "success": False,
                "error": "GROQ API key not configured"
            }), 500

        response = _call_groq(prompt, groq_key, expect_json=False)

        return jsonify({
            "success": True,
            "answer":  response.strip(),
        }), 200

    except Exception as e:
        current_app.logger.error(f"Chat error: {e}")
        return jsonify({
            "success": False,
            "error":   "Chat failed: " + str(e)
        }), 500

# ── Route: Export Analysis as PDF ──────────────────────────────────────────

@api_bp.route("/export/<int:session_id>", methods=["GET"])
def export_pdf(session_id):
    """
    Generate a PDF report of a saved analysis session.
    Returns the PDF as a downloadable file.
    """
    from flask import send_file
    from io import BytesIO
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
    )
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    import json as json_lib

    # Fetch the session
    session = CodeSession.query.get(session_id)
    if not session:
        return jsonify({"success": False, "error": "Session not found"}), 404

    # Parse the stored result
    try:
        result = json_lib.loads(session.result_json) if session.result_json else {}
    except Exception:
        result = {}

    # Build PDF in memory
    buffer = BytesIO()
    doc    = SimpleDocTemplate(
        buffer,
        pagesize     = letter,
        leftMargin   = 0.75 * inch,
        rightMargin  = 0.75 * inch,
        topMargin    = 0.75 * inch,
        bottomMargin = 0.75 * inch,
    )

    story  = []
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent   = styles['Heading1'],
        fontSize = 24,
        textColor = colors.HexColor('#4F8EF7'),
        alignment = TA_CENTER,
        spaceAfter = 6,
    )

    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent   = styles['Normal'],
        fontSize = 10,
        textColor = colors.HexColor('#6B6B6B'),
        alignment = TA_CENTER,
        spaceAfter = 20,
    )

    heading_style = ParagraphStyle(
        'Heading',
        parent   = styles['Heading2'],
        fontSize = 14,
        textColor = colors.HexColor('#4F8EF7'),
        spaceAfter = 8,
        spaceBefore = 16,
    )

    body_style = ParagraphStyle(
        'Body',
        parent   = styles['Normal'],
        fontSize = 10,
        leading  = 14,
        textColor = colors.HexColor('#333333'),
        spaceAfter = 6,
    )

    code_style = ParagraphStyle(
        'Code',
        parent   = styles['Normal'],
        fontSize = 9,
        fontName = 'Courier',
        leading  = 12,
        textColor = colors.HexColor('#1F4E79'),
        leftIndent = 12,
        rightIndent = 12,
        backColor = colors.HexColor('#F4F7FA'),
        borderColor = colors.HexColor('#DDDDDD'),
        borderWidth = 0.5,
        borderPadding = 8,
        spaceAfter = 10,
    )

    # ── Header ──────────────────────────────────────────────────────────
    story.append(Paragraph("C.I.D — Code Intelligent Debugger", title_style))
    story.append(Paragraph(
        "Analysis Report — Generated " + session.created_at.strftime("%d %B %Y at %I:%M %p"),
        subtitle_style
    ))

    # ── Metadata Table ──────────────────────────────────────────────────
    meta_data = [
        ['Analysis Mode', session.mode.capitalize()],
        ['Language',      session.language.capitalize()],
        ['AI Provider',   (session.llm_provider_used or 'Unknown').upper()],
        ['Response Time', f"{session.response_time_seconds or 0}s"],
        ['Session ID',    str(session.id)],
    ]

    meta_table = Table(meta_data, colWidths=[2*inch, 4.5*inch])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#4F8EF7')),
        ('TEXTCOLOR',  (0, 0), (0, -1), colors.white),
        ('TEXTCOLOR',  (1, 0), (1, -1), colors.HexColor('#333333')),
        ('FONTNAME',   (0, 0), (-1, -1), 'Helvetica'),
        ('FONTNAME',   (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE',   (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING',    (0, 0), (-1, -1), 8),
        ('LEFTPADDING',   (0, 0), (-1, -1), 12),
        ('BACKGROUND', (1, 0), (1, -1), colors.HexColor('#F8FAFC')),
        ('GRID',       (0, 0), (-1, -1), 0.5, colors.HexColor('#DDDDDD')),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 20))

    # ── Original Code ───────────────────────────────────────────────────
    story.append(Paragraph("📄 Submitted Code", heading_style))
    code_lines = session.code_input.split('\n')
    numbered_code = ''
    for i, line in enumerate(code_lines, 1):
        safe_line = line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        numbered_code += f"{i:3d}  {safe_line}<br/>"
    story.append(Paragraph(numbered_code, code_style))

    # ── Analysis Result ─────────────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("🔍 AI Analysis", heading_style))

    if session.mode == "explain":
        _render_explain_pdf(story, result, body_style, code_style, heading_style)
    elif session.mode == "debug":
        _render_debug_pdf(story, result, body_style, code_style, heading_style)
    elif session.mode == "optimize":
        _render_optimize_pdf(story, result, body_style, code_style, heading_style)
    elif session.mode == "security":
        _render_security_pdf(story, result, body_style, code_style, heading_style)

    # ── Footer ──────────────────────────────────────────────────────────
    story.append(Spacer(1, 30))
    footer_style = ParagraphStyle(
        'Footer',
        parent   = styles['Normal'],
        fontSize = 8,
        textColor = colors.HexColor('#6B6B6B'),
        alignment = TA_CENTER,
    )
    story.append(Paragraph(
        "Generated by C.I.D — Code Intelligent Debugger  |  Built by Danish Khan",
        footer_style
    ))

    # Build the PDF
    doc.build(story)
    buffer.seek(0)

    filename = f"CID_Report_{session.mode}_{session.id}.pdf"
    return send_file(
        buffer,
        mimetype     = 'application/pdf',
        as_attachment = True,
        download_name = filename,
    )


def _render_explain_pdf(story, result, body_style, code_style, heading_style):
    """Render explain mode content into PDF."""
    from reportlab.platypus import Paragraph, Spacer

    if result.get('summary'):
        story.append(Paragraph("<b>Summary:</b> " + _escape(result['summary']), body_style))
        story.append(Spacer(1, 8))

    if result.get('lines'):
        story.append(Paragraph("<b>Line-by-Line Explanation:</b>", body_style))
        for line in result['lines']:
            line_num = line.get('line_number', '?')
            code     = _escape(line.get('code', ''))
            exp      = _escape(line.get('explanation', ''))
            story.append(Paragraph(
                f"<b>Line {line_num}:</b> <font face='Courier' color='#1F4E79'>{code}</font><br/>"
                f"<i>{exp}</i>",
                body_style
            ))
            story.append(Spacer(1, 4))

    if result.get('key_concepts'):
        story.append(Spacer(1, 8))
        story.append(Paragraph("<b>Key Concepts:</b> " + ", ".join(result['key_concepts']), body_style))

    if result.get('beginner_tip'):
        story.append(Spacer(1, 8))
        story.append(Paragraph("<b>💡 Tip:</b> " + _escape(result['beginner_tip']), body_style))


def _render_debug_pdf(story, result, body_style, code_style, heading_style):
    """Render debug mode content into PDF."""
    from reportlab.platypus import Paragraph, Spacer

    if result.get('summary'):
        story.append(Paragraph("<b>Summary:</b> " + _escape(result['summary']), body_style))
        story.append(Spacer(1, 8))

    story.append(Paragraph(f"<b>Bugs Found:</b> {result.get('bugs_found', 0)}", body_style))
    story.append(Spacer(1, 8))

    for bug in result.get('bugs', []):
        severity = bug.get('severity', 'medium').upper()
        story.append(Paragraph(
            f"<b>[{severity}]</b> {_escape(bug.get('type', ''))} — Line {bug.get('line_number', '?')}",
            body_style
        ))
        story.append(Paragraph(_escape(bug.get('description', '')), body_style))
        if bug.get('line_code'):
            story.append(Paragraph("<b>Problem:</b>", body_style))
            story.append(Paragraph(_escape(bug['line_code']), code_style))
        if bug.get('fix'):
            story.append(Paragraph("<b>Fix:</b>", body_style))
            story.append(Paragraph(_escape(bug['fix']), code_style))
        story.append(Spacer(1, 10))

    if result.get('fixed_code'):
        story.append(Paragraph("<b>✅ Complete Fixed Code:</b>", heading_style))
        story.append(Paragraph(_escape(result['fixed_code']).replace('\n', '<br/>'), code_style))


def _render_optimize_pdf(story, result, body_style, code_style, heading_style):
    """Render optimize mode content into PDF."""
    from reportlab.platypus import Paragraph, Spacer, Table, TableStyle
    from reportlab.lib import colors
    from reportlab.lib.units import inch

    if result.get('summary'):
        story.append(Paragraph("<b>Summary:</b> " + _escape(result['summary']), body_style))
        story.append(Spacer(1, 8))

    current  = result.get('current_complexity', {})
    optim    = result.get('optimized_complexity', {})

    comp_data = [
        ['', 'Time', 'Space'],
        ['Current',   current.get('time', '?'),  current.get('space', '?')],
        ['Optimized', optim.get('time', '?'),    optim.get('space', '?')],
    ]

    comp_table = Table(comp_data, colWidths=[1.5*inch, 2.5*inch, 2.5*inch])
    comp_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4F8EF7')),
        ('TEXTCOLOR',  (0, 0), (-1, 0), colors.white),
        ('FONTNAME',   (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME',   (0, 1), (0, -1), 'Helvetica-Bold'),
        ('BACKGROUND', (0, 1), (0, -1), colors.HexColor('#F0F5F8')),
        ('ALIGN',      (0, 0), (-1, -1), 'CENTER'),
        ('FONTSIZE',   (0, 0), (-1, -1), 11),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('GRID',       (0, 0), (-1, -1), 0.5, colors.HexColor('#DDDDDD')),
    ]))
    story.append(comp_table)
    story.append(Spacer(1, 16))

    for sug in result.get('suggestions', []):
        story.append(Paragraph(f"<b>💡 {_escape(sug.get('title', ''))}</b>", body_style))
        story.append(Paragraph(_escape(sug.get('description', '')), body_style))
        story.append(Spacer(1, 8))

    if result.get('optimized_code'):
        story.append(Paragraph("<b>⚡ Optimized Code:</b>", heading_style))
        story.append(Paragraph(_escape(result['optimized_code']).replace('\n', '<br/>'), code_style))


def _render_security_pdf(story, result, body_style, code_style, heading_style):
    """Render security mode content into PDF."""
    from reportlab.platypus import Paragraph, Spacer

    risk = (result.get('overall_risk', 'unknown')).upper()
    story.append(Paragraph(f"<b>Overall Risk Level:</b> {risk}", body_style))
    story.append(Paragraph(f"<b>Vulnerabilities Found:</b> {result.get('total_found', 0)}", body_style))
    story.append(Spacer(1, 10))

    if result.get('summary'):
        story.append(Paragraph("<b>Summary:</b> " + _escape(result['summary']), body_style))
        story.append(Spacer(1, 10))

    for vuln in result.get('vulnerabilities', []):
        severity = vuln.get('severity', 'medium').upper()
        story.append(Paragraph(
            f"<b>[{severity}]</b> {_escape(vuln.get('type', ''))} — Line {vuln.get('line_number', '?')}",
            body_style
        ))
        story.append(Paragraph(_escape(vuln.get('description', '')), body_style))
        if vuln.get('risk'):
            story.append(Paragraph("<b>Risk:</b> " + _escape(vuln['risk']), body_style))
        if vuln.get('line_code'):
            story.append(Paragraph("<b>Vulnerable Code:</b>", body_style))
            story.append(Paragraph(_escape(vuln['line_code']), code_style))
        if vuln.get('fix'):
            story.append(Paragraph("<b>Secure Fix:</b>", body_style))
            story.append(Paragraph(_escape(vuln['fix']), code_style))
        story.append(Spacer(1, 10))

    if result.get('recommendations'):
        story.append(Paragraph("<b>🛡 Recommendations:</b>", heading_style))
        for rec in result['recommendations']:
            story.append(Paragraph("• " + _escape(rec), body_style))


def _escape(text):
    """Escape text for safe HTML rendering in PDF."""
    if not text:
        return ''
    return (str(text)
            .replace('&', '&amp;')
            .replace('<', '&lt;')
            .replace('>', '&gt;'))


# ── Route: Share Session ───────────────────────────────────────────────────

@api_bp.route("/share/<int:session_id>", methods=["GET"])
def share_session(session_id):
    """
    Return a shareable view of a session (public).
    """
    session = CodeSession.query.get(session_id)
    if not session:
        return jsonify({"success": False, "error": "Session not found"}), 404

    return jsonify({
        "success": True,
        "session": session.to_dict()
    }), 200

# ── Route: Format Code ────────────────────────────────────────────────────

@api_bp.route("/format", methods=["POST"])
def format_code():
    """
    Use AI to reformat code with proper indentation, spacing, and style.
    Returns cleaned up version of the same code.
    """
    from ..services.llm_service import _call_groq

    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"success": False, "error": "Invalid JSON"}), 400

    code     = data.get("code", "").strip()
    language = data.get("language", "auto").lower()

    if not code:
        return jsonify({"success": False, "error": "No code provided"}), 400

    if len(code) > 10000:
        return jsonify({
            "success": False,
            "error": "Code too long to format (max 10,000 chars)"
        }), 400

    # Detect language if auto
    if language == "auto":
        from ..services.language_detector import detect_language
        detected = detect_language(code)
        language = detected if detected != "unknown" else "python"

    prompt = (
        "You are a code formatter. Reformat this " + language + " code "
        "with proper indentation, spacing, and industry-standard style conventions.\n\n"
        "RULES:\n"
        "1. Do NOT change the logic or functionality\n"
        "2. Do NOT add or remove any code\n"
        "3. Only fix indentation, spacing, line breaks, and style\n"
        "4. Return ONLY the formatted code — no explanations, no markdown\n"
        "5. Do NOT wrap in triple backticks\n\n"
        "CODE TO FORMAT:\n"
        + code
    )

    try:
        groq_key = current_app.config.get("GROQ_API_KEY")
        if not groq_key:
            return jsonify({
                "success": False,
                "error": "GROQ API key not configured"
            }), 500

        response = _call_groq(prompt, groq_key, expect_json=False)

        # Clean up any accidental markdown wrapping
        formatted = response.strip()
        if formatted.startswith("```"):
            lines = formatted.split("\n")
            formatted = "\n".join(lines[1:-1])
        formatted = formatted.strip()

        return jsonify({
            "success":  True,
            "code":     formatted,
            "language": language
        }), 200

    except Exception as e:
        current_app.logger.error(f"Format error: {e}")
        return jsonify({
            "success": False,
            "error":   "Format failed: " + str(e)
        }), 500