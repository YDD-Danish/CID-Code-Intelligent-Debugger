// static/js/app.js
// ─────────────────────────────────────────────────────────────────────────────
// C.I.D — Code Intelligent Debugger
// Main Application Script
// ─────────────────────────────────────────────────────────────────────────────
(function () {
    'use strict';

    // ── State ─────────────────────────────────────────────────────────────────
    let editor = null;
    let currentMode = 'explain';
    let isLoading = false;
    let rateLimitCountdownTimer = null;

    // ── Sample Codes ──────────────────────────────────────────────────────────
    const SAMPLES = {
        bubble_sort: {
            language: 'python',
            code: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n-i-1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
    return arr

numbers = [64, 34, 25, 12, 22, 11, 90]
print(bubble_sort(numbers))`
        },
        fetch_api: {
            language: 'javascript',
            code: `async function fetchUsers() {
    try {
        const response = await fetch('https://api.example.com/users');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const users = await response.json();
        users.forEach(user => {
            console.log(user.name, user.email);
        });
        return users;
    } catch (error) {
        console.error('Failed to fetch users:', error);
    }
}`
        },
        sql_injection: {
            language: 'python',
            code: `import sqlite3

def get_user(username):
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    query = "SELECT * FROM users WHERE username = '" + username + "'"
    cursor.execute(query)
    results = cursor.fetchall()
    conn.close()
    return results

def login(user, password):
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    query = f"SELECT * FROM users WHERE user='{user}' AND pass='{password}'"
    cursor.execute(query)
    return cursor.fetchone()`
        },
        linked_list: {
            language: 'java',
            code: `public class LinkedList {
    Node head;

    static class Node {
        int data;
        Node next;
        Node(int d) {
            data = d;
            next = null;
        }
    }

    public void insert(int data) {
        Node newNode = new Node(data);
        if (head == null) {
            head = newNode;
            return;
        }
        Node current = head;
        while (current.next != null) {
            current = current.next;
        }
        current.next = newNode;
    }

    public void printList() {
        Node current = head;
        while (current != null) {
            System.out.print(current.data + " -> ");
            current = current.next;
        }
        System.out.println("null");
    }

    public static void main(String[] args) {
        LinkedList list = new LinkedList();
        list.insert(1);
        list.insert(2);
        list.insert(3);
        list.printList();
    }
}`
        },
        fibonacci: {
            language: 'cpp',
            code: `#include <iostream>
using namespace std;

int fibonacci(int n) {
    if (n <= 0) return 0;
    if (n == 1) return 1;

    int prev2 = 0, prev1 = 1, current;
    for (int i = 2; i <= n; i++) {
        current = prev1 + prev2;
        prev2 = prev1;
        prev1 = current;
    }
    return prev1;
}

int main() {
    int n = 10;
    cout << "Fibonacci(" << n << ") = " << fibonacci(n) << endl;

    cout << "Sequence: ";
    for (int i = 0; i <= n; i++) {
        cout << fibonacci(i) << " ";
    }
    cout << endl;
    return 0;
}`
        }
    };

    // ── Language Map for Monaco ────────────────────────────────────────────────
    const LANGUAGE_MAP = {
        'python': 'python',
        'javascript': 'javascript',
        'typescript': 'typescript',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'csharp': 'csharp',
        'go': 'go',
        'rust': 'rust',
        'php': 'php',
        'ruby': 'ruby',
        'swift': 'swift',
        'kotlin': 'kotlin',
        'sql': 'sql',
        'html': 'html',
        'css': 'css',
        'bash': 'shell',
        'auto': 'plaintext'
    };

    // Detect production environment
    window.isProduction = false;
    fetch('/env-check')
        .then(r => r.json())
        .then(data => {
            window.isProduction = data.is_production;
    });

    // ── Initialize App ────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        // ── Lazy Load Monaco Editor ──
        const monacoScript = document.createElement('script');
        monacoScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js';
        monacoScript.onload = () => initMonaco();
        document.body.appendChild(monacoScript);
        initModeTabs();
        initAnalyseButton();
        initSampleSelect();
        initMobileToggle();
        initCopyButton();
        initRetryButton();
        initRunButton();
        initExportButton();
        initShareButton();
        initShareLoader();
        initNewSessionButton();
        initFormatButton();
    });

    // ── Auto-load Shared Session on Page Load ─────────────────────────────────
    function initShareLoader() {
        const meta = document.querySelector('meta[name="cid-share-id"]');
        if (!meta) return;

        const shareId = meta.getAttribute('content');
        if (!shareId) return;

        // Wait for Monaco to load first
        const check = setInterval(function () {
            if (window.monacoEditorInstance) {
                clearInterval(check);
                loadSharedSession(shareId);
            }
        }, 200);
    }

    function loadSharedSession(id) {
        fetch('/api/share/' + id)
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data.success) return;
                const s = data.session;

                if (window.monacoEditorInstance) {
                    window.monacoEditorInstance.setValue(s.code_input);
                    window.isPlaceholder = false;
                }

                const langSelect = document.getElementById('languageSelect');
                if (langSelect) langSelect.value = s.language;

                const tabs = document.querySelectorAll('.mode-tab');
                tabs.forEach(function (t) {
                    t.classList.remove('active');
                    if (t.getAttribute('data-mode') === s.mode) {
                        t.classList.add('active');
                    }
                });
                currentMode = s.mode;

                if (s.result_json) {
                    try {
                        const result = JSON.parse(s.result_json);
                        renderResults({
                            result:        result,
                            mode:          s.mode,
                            language:      s.language,
                            provider:      s.llm_provider_used,
                            response_time: s.response_time_seconds,
                            session_id:    s.id,
                        });
                        showToast('Shared analysis loaded', 'success');
                    } catch (e) {
                        console.error('Failed to load shared session:', e);
                    }
                }
            });
    }

    // ── Monaco Editor Setup ───────────────────────────────────────────────────
    function initMonaco() {
        require.config({
            paths: {
                'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs'
            }
        });

        require(['vs/editor/editor.main'], function () {

            // Define dark theme
            monaco.editor.defineTheme('cid-dark', {
                base: 'vs-dark',
                inherit: true,
                rules: [
                    { token: 'comment', foreground: '4A4A4A', fontStyle: 'italic' },
                    { token: 'keyword', foreground: '4F8EF7' },
                    { token: 'string', foreground: '34D399' },
                    { token: 'number', foreground: 'FBBF24' },
                    { token: 'type', foreground: 'A78BFA' },
                ],
                colors: {
                    'editor.background': '#1A1A1A',
                    'editor.foreground': '#E2E8F0',
                    'editor.lineHighlightBackground': '#2D2D2D',
                    'editorLineNumber.foreground': '#4A4A4A',
                    'editorLineNumber.activeForeground': '#6B6B6B',
                    'editor.selectionBackground': '#4F8EF744',
                    'editorCursor.foreground': '#4F8EF7',
                    'editorIndentGuide.background': '#2D2D2D',
                    'scrollbar.shadow': '#00000000',
                    'scrollbarSlider.background': '#4A4A4A66',
                    'scrollbarSlider.hoverBackground': '#6B6B6B88',
                }
            });

            // Define light theme
            monaco.editor.defineTheme('cid-light', {
                base: 'hc-light',
                inherit: true,
                rules: [
                    { token: 'comment', foreground: '7A9098', fontStyle: 'italic' },
                    { token: 'keyword', foreground: '2563EB' },
                    { token: 'string', foreground: '059669' },
                    { token: 'number', foreground: 'D97706' },
                    { token: 'type', foreground: '7C3AED' },
                    { token: 'identifier', foreground: '3D4A52' },
                    { token: '', foreground: '3D4A52' },
                ],
                colors: {
                    'editor.background': '#F0F5F8',
                    'editor.foreground': '#1A1A1A',
                    'editor.lineHighlightBackground': '#E2ECF0',
                    'editorLineNumber.foreground': '#7A9098',
                    'editorLineNumber.activeForeground': '#3D4A52',
                    'editor.selectionBackground': '#4F8EF744',
                    'editorCursor.foreground': '#000000',
                    'editorWhitespace.foreground': '#98B0B844',
                    'editorIndentGuide.background': '#98B0B844',
                    'editorBracketMatch.background': '#4F8EF733',
                    'editorBracketMatch.border': '#4F8EF7',
                    'contrastBorder': '#F0F5F8',
                    'contrastActiveBorder': '#4F8EF7',
                }
            });


            const currentTheme = document.documentElement.getAttribute('data-theme');
            const editorTheme = currentTheme === 'dark' ? 'cid-dark' : 'cid-light';

                        const placeholderText = '// Paste your code here or select a sample below\n\n';

            editor = monaco.editor.create(document.getElementById('monacoEditor'), {
                value: placeholderText,
                language: 'plaintext',
                theme: editorTheme,
                fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
                lineNumbers: 'on',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                roundedSelection: true,
                smoothScrolling: true,
                cursorSmoothCaretAnimation: 'on',
                cursorStyle: 'block',
                padding: { top: 12, bottom: 12 },
                wordWrap: 'on',
                automaticLayout: true,
                tabSize: 4,
                renderLineHighlight: 'line',
                selectionHighlight: true,
                overviewRulerBorder: false,
                hideCursorInOverviewRuler: true,
                scrollbar: {
                    verticalScrollbarSize: 6,
                    horizontalScrollbarSize: 6,
                }
            });

            // Track if placeholder is active
            window.isPlaceholder = true;

            // When user clicks into editor, clear placeholder
            editor.onDidFocusEditorText(function () {
                if (isPlaceholder) {
                    editor.setValue('');
                    window.isPlaceholder = false;
                }
            });

            // When editor content changes, check if empty
            editor.onDidChangeModelContent(function () {
                const content = editor.getValue().trim();

                // If user deleted everything, show placeholder again
                if (content === '' && !editor.hasTextFocus()) {
                    editor.setValue(placeholderText);
                    window.isPlaceholder = true;
                }

                // If user typed something, mark placeholder as gone
                if (content !== '' && content !== placeholderText.trim()) {
                    window.isPlaceholder = false;
                }
            });

            // When user clicks away from editor and it is empty, restore placeholder
            editor.onDidBlurEditorText(function () {
                const content = editor.getValue().trim();
                if (content === '') {
                    editor.setValue(placeholderText);
                    window.isPlaceholder = true;
                }
            });

            // Auto-analyse on paste (only if setting enabled)
            editor.onDidPaste(function () {
                if (window.cidSettings && window.cidSettings.autoAnalyse) {
                    setTimeout(function () {
                        const btn = document.getElementById('analyseBtn');
                        if (btn && !btn.disabled) {
                            btn.click();
                        }
                    }, 300);
                }
            });
            window.monacoEditorInstance = editor;
            forceEditorLayout();

// Keep Monaco matched to its container on mobile, tablet, resize,
// orientation changes, and Code/Results panel switches.
const editorContainer = document.getElementById('editorContainer');

if (editorContainer && 'ResizeObserver' in window) {
    window.cidEditorResizeObserver = new ResizeObserver(function (entries) {
        const entry = entries[0];

        window.requestAnimationFrame(function () {
            if (!editor || !entry) return;

            const width = Math.floor(entry.contentRect.width);
            const height = Math.floor(entry.contentRect.height);

            if (width > 0 && height > 0) {
                editor.layout({ width: width, height: height });
            }
        });
    });

    window.cidEditorResizeObserver.observe(editorContainer);
}
            
            // Update stats bar whenever content changes
            editor.onDidChangeModelContent(function () {
                updateStatsBar();
            });

            // Initial stats update
            updateStatsBar();
        });
    }

    // ── Update Stats Bar ──────────────────────────────────────────────────────
    function updateStatsBar() {
        if (!editor) return;

        const content = editor.getValue();
        const isPlaceholderText = window.isPlaceholder;

        const lines = isPlaceholderText ? 0 : content.split('\n').length;
        const chars = isPlaceholderText ? 0 : content.length;
        const words = isPlaceholderText
            ? 0
            : content.split(/\s+/).filter(function (w) { return w.length > 0; }).length;

        const langSelect = document.getElementById('languageSelect');
        const lang = langSelect ? langSelect.value : 'auto';
        const langDisplay = lang.charAt(0).toUpperCase() + lang.slice(1);

        const linesEl = document.getElementById('statLines');
        const charsEl = document.getElementById('statChars');
        const wordsEl = document.getElementById('statWords');
        const langEl  = document.getElementById('statLang');

        if (linesEl) linesEl.textContent = lines;
        if (charsEl) charsEl.textContent = chars.toLocaleString();
        if (wordsEl) wordsEl.textContent = words;
        if (langEl)  langEl.textContent  = langDisplay;
    }

    // Expose globally so New Session button can call it
    window.updateStatsBar = updateStatsBar;
    // Also update stats when language dropdown changes
    document.addEventListener('DOMContentLoaded', function () {
        const langSelect = document.getElementById('languageSelect');
        if (langSelect) {
            langSelect.addEventListener('change', updateStatsBar);
        }
    });
    // initmodetabs
    function initModeTabs() {
        const tabs = document.querySelectorAll('.mode-tab');
        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                if (isLoading) return;

                tabs.forEach(function (t) { t.classList.remove('active'); });
                tab.classList.add('active');
                currentMode = tab.getAttribute('data-mode');
                window.currentAnalysisMode = currentMode;

                // Clear bug highlights when switching modes
                if (window.clearBugHighlights) {
                    window.clearBugHighlights();
                }
            });
        });
    }

    // ── Analyse Button ────────────────────────────────────────────────────────
    function initAnalyseButton() {
        const btn = document.getElementById('analyseBtn');
        btn.addEventListener('click', function () {
            if (isLoading) return;
            analyseCode();
        });
    }

    // ── Sample Code Select ────────────────────────────────────────────────────
    function initSampleSelect() {
        const select = document.getElementById('sampleSelect');
        select.addEventListener('change', function () {
            const sample = SAMPLES[select.value];
            if (sample && editor) {
                editor.setValue(sample.code);

                const langSelect = document.getElementById('languageSelect');
                langSelect.value = sample.language;

                const monacoLang = LANGUAGE_MAP[sample.language] || 'plaintext';
                monaco.editor.setModelLanguage(editor.getModel(), monacoLang);

                showToast('Sample code loaded', 'info');
            }
            select.value = '';
        });
    }

       // ── Language Select Change & Mobile Menu ─────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        
        // ── Mobile "More" Dropdown Menu ──────────────────────────────────────────
        const moreBtn = document.getElementById('moreBtn');
        const dropdown = document.getElementById('mobileDropdown');
        const snippetsBtn = document.getElementById('snippetsBtn');
        const newSessionBtn = document.getElementById('newSessionBtn');
        const themeToggle = document.getElementById('themeToggle');
        
        const navLeft = document.querySelector('.nav-left');
        const navRight = document.querySelector('.nav-right');
        const runCodeBtn = document.getElementById('runCodeBtn');

        function handleResponsiveMenu() {
            if (window.innerWidth <= 768) {
                if (snippetsBtn) dropdown.appendChild(snippetsBtn);
                if (newSessionBtn) dropdown.appendChild(newSessionBtn);
                if (themeToggle) dropdown.appendChild(themeToggle);
            } else {
                if (snippetsBtn) navLeft.insertBefore(snippetsBtn, document.querySelector('.logo'));
                if (newSessionBtn) navRight.insertBefore(newSessionBtn, runCodeBtn);
                if (themeToggle) navRight.insertBefore(themeToggle, document.getElementById('settingsBtn'));
                
                if (dropdown) dropdown.classList.remove('show');
                if (moreBtn) moreBtn.textContent = '⋮';
            }
        }

        window.addEventListener('resize', handleResponsiveMenu);
        handleResponsiveMenu(); // Run on load

        if (moreBtn && dropdown) {
            moreBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                dropdown.classList.toggle('show');
                moreBtn.textContent = dropdown.classList.contains('show') ? '✕' : '⋮';
            });
        }

        document.addEventListener('click', function(e) {
            if (dropdown && dropdown.classList.contains('show') && !dropdown.contains(e.target) && e.target !== moreBtn) {
                dropdown.classList.remove('show');
                moreBtn.textContent = '⋮';
            }
        });

        // ── Language Select
        const langSelect = document.getElementById('languageSelect');
        if (langSelect) {
            langSelect.addEventListener('change', function () {
                if (editor) {
                    const monacoLang = LANGUAGE_MAP[langSelect.value] || 'plaintext';
                    monaco.editor.setModelLanguage(editor.getModel(), monacoLang);
                }
            });
        }

        // ── iOS Push Back Drawer Observer ────────────────────────────────────────
        const observer = new MutationObserver(() => {
            const anyOpen = document.querySelector('.snippets-overlay.active, .history-overlay.active, .settings-overlay.active');
            document.body.classList.toggle('drawer-open', !!anyOpen);
        });
        document.querySelectorAll('.snippets-overlay, .history-overlay, .settings-overlay').forEach(el => {
            if(el) observer.observe(el, { attributes: true, attributeFilter: ['class'] });
        });
    });

        // ── Mobile Panel Toggle ───────────────────────────────────────────────────
    function initMobileToggle() {
        const toggles = document.querySelectorAll('.panel-toggle');
        toggles.forEach(function (toggle) {
            toggle.addEventListener('click', function () {
                toggles.forEach(function (t) { t.classList.remove('active'); });
                toggle.classList.add('active');

                const panel = toggle.getAttribute('data-panel');
                const codePanel = document.getElementById('codePanel');
                const resultsPanel = document.getElementById('resultsPanel');

                if (panel === 'code') {
                    codePanel.classList.add('active');
                    resultsPanel.classList.remove('active');

                    // Force Monaco to recalculate layout multiple times
                    // as the CSS transitions complete
                    forceEditorLayout();
                } else {
                    codePanel.classList.remove('active');
                    resultsPanel.classList.add('active');
                }
            });
        });
    }

    // ── Force Monaco Editor to Recalculate Its Size ──────────────────────────
    function forceEditorLayout() {
    if (!editor) return;

    const editorContainer = document.getElementById('editorContainer');

    // Monaco needs the actual container dimensions after mobile panels,
    // CSS Grid, or responsive layouts have finished rendering.
    [50, 150, 300, 500].forEach(function (delay) {
        setTimeout(function () {
            if (!editor || !editorContainer) return;

            const width = editorContainer.clientWidth;
            const height = editorContainer.clientHeight;

            if (width > 0 && height > 0) {
                editor.layout({ width: width, height: height });
            }
        }, delay);
    });
}

    // Also expose globally so other scripts can trigger it
    window.forceEditorLayout = forceEditorLayout;

    // ── Auto-Layout on Window Resize ─────────────────────────────────────────
    window.addEventListener('resize', function () {
        if (editor) editor.layout();
    });

    // ── Copy Button ───────────────────────────────────────────────────────────
    function initCopyButton() {
        const btn = document.getElementById('copyBtn');
        btn.addEventListener('click', function () {
            const output = document.getElementById('resultsOutput');
            const text = output.innerText;
            navigator.clipboard.writeText(text).then(function () {
                showToast('Result copied to clipboard', 'success');
            });
        });
    }

        // ── Export PDF Button ─────────────────────────────────────────────────────
    function initExportButton() {
        const btn = document.getElementById('exportPdfBtn');
        if (!btn) return;

        btn.addEventListener('click', function () {
            if (!window.currentSessionId) {
                showToast('No analysis to export', 'error');
                return;
            }

            showToast('Generating PDF...', 'info');

            // Open PDF in new tab (browser handles download)
            window.open('/api/export/' + window.currentSessionId, '_blank');
        });
    }

    // ── Share Button ──────────────────────────────────────────────────────────
    function initShareButton() {
        const btn = document.getElementById('shareBtn');
        if (!btn) return;

        btn.addEventListener('click', function () {
            if (!window.currentSessionId) {
                showToast('No analysis to share', 'error');
                return;
            }

            const shareUrl = window.location.origin + '/share/' + window.currentSessionId;

            navigator.clipboard.writeText(shareUrl).then(function () {
                showToast('Share link copied to clipboard!', 'success');
                showSharePopup(shareUrl);
            }).catch(function () {
                showSharePopup(shareUrl);
            });
        });
    }

    function showSharePopup(url) {
        const existing = document.getElementById('sharePopup');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'info-popup-overlay';
        overlay.id = 'sharePopup';

        overlay.innerHTML = `
            <div class="info-popup">
                <div class="info-popup-header">
                    <span class="info-popup-title">🔗 Share this Analysis</span>
                    <button class="info-popup-close" onclick="document.getElementById('sharePopup').remove()">✕</button>
                </div>
                <p style="font-size:13px;color:var(--text-secondary);margin-bottom:14px;line-height:1.6;">
                    Anyone with this link can view the code and its analysis:
                </p>
                <div style="display:flex;gap:8px;margin-bottom:12px;">
                    <input type="text" value="${url}" readonly
                        style="flex:1;padding:10px 12px;background:var(--bg-elevated);border:1px solid var(--accent);border-radius:8px;color:var(--text-primary);font-family:'JetBrains Mono',monospace;font-size:12px;outline:none;"
                        onclick="this.select()">
                    <button onclick="navigator.clipboard.writeText('${url}').then(function(){this.textContent='✓';setTimeout(function(){document.getElementById('sharePopup').remove();},800);}.bind(this))"
                        style="padding:0 16px;background:var(--accent);border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;">
                        Copy
                    </button>
                </div>
                <p style="font-size:11px;color:var(--text-muted);text-align:center;">
                    Note: Link only works while C.I.D server is running.
                </p>
            </div>
        `;

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) overlay.remove();
        });

        document.body.appendChild(overlay);
    }
        // ── New Session Button ────────────────────────────────────────────────────
    function initNewSessionButton() {
        const btn = document.getElementById('newSessionBtn');
        if (!btn) return;

        btn.addEventListener('click', function () {
            // Check if user has entered code or has results
            const hasCode = editor && !window.isPlaceholder && editor.getValue().trim().length > 0;
            const hasResults = document.getElementById('resultsOutput').style.display !== 'none';

            // If confirmClear setting is on and there is data, ask first
            const confirmClear = window.cidSettings && window.cidSettings.confirmClear;

            if (confirmClear && (hasCode || hasResults)) {
                if (!confirm('Start a new session? Current code and results will be cleared.')) {
                    return;
                }
            }

            // ── Clear Editor ──────────────────────────────────────────────────
            if (editor) {
                const placeholderText = '// Paste your code here or select a sample below\n\n';
                editor.setValue(placeholderText);
                window.isPlaceholder = true;
            }

            // ── Clear Results ─────────────────────────────────────────────────
            showView('empty');

            // ── Clear Bug Highlights ──────────────────────────────────────────
            if (window.clearBugHighlights) {
                window.clearBugHighlights();
            }

            // ── Close Chat Panel ──────────────────────────────────────────────
            const chatSection = document.getElementById('chatSection');
            if (chatSection) chatSection.style.display = 'none';

            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) chatMessages.innerHTML = '';

            // ── Close Run Output ──────────────────────────────────────────────
            const runPanel = document.getElementById('runOutputPanel');
            if (runPanel) runPanel.style.display = 'none';

            // ── Hide Result Buttons ───────────────────────────────────────────
            const buttons = ['copyBtn', 'chatToggleBtn', 'exportPdfBtn', 'shareBtn'];
            buttons.forEach(function (id) {
                const b = document.getElementById(id);
                if (b) b.style.display = 'none';
            });

            // ── Hide Badges ───────────────────────────────────────────────────
            const providerBadge = document.getElementById('providerBadge');
            const timeBadge     = document.getElementById('timeBadge');
            if (providerBadge) providerBadge.style.display = 'none';
            if (timeBadge)     timeBadge.style.display = 'none';
            hideRateLimitStatus();

            // ── Reset Session ID ──────────────────────────────────────────────
            window.currentSessionId = null;

            // ── Reset to Default Mode ─────────────────────────────────────────
            const defaultMode = (window.cidSettings && window.cidSettings.defaultMode) || 'explain';
            const tabs = document.querySelectorAll('.mode-tab');
            tabs.forEach(function (t) {
                t.classList.remove('active');
                if (t.getAttribute('data-mode') === defaultMode) {
                    t.classList.add('active');
                }
            });
            currentMode = defaultMode;

            // ── On Mobile, Switch to Code Panel ───────────────────────────────
            if (window.innerWidth <= 768) {
                const codeToggle = document.querySelector('[data-panel="code"]');
                if (codeToggle) codeToggle.click();
            }

            // ── Update Stats Bar ──────────────────────────────────────────────
            if (window.updateStatsBar) {
                window.updateStatsBar();
            }

            // ── Focus Editor ──────────────────────────────────────────────────
            if (editor) {
                setTimeout(function () {
                    editor.focus();
                }, 100);
            }

            showToast('New session started', 'success');
        });
    }

    // ── Format Code Button ────────────────────────────────────────────────────
    function initFormatButton() {
        const btn = document.getElementById('formatBtn');
        if (!btn) return;

        btn.addEventListener('click', function () {
            if (!editor) return;

            const code = editor.getValue().trim();
            if (!code || window.isPlaceholder || code.length < 5) {
                showToast('No code to format', 'error');
                return;
            }

            const language = document.getElementById('languageSelect').value;

            btn.disabled = true;
            btn.querySelector('.format-icon').textContent = '⏳';
            showToast('Formatting code...', 'info');

            fetch('/api/format', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code:     code,
                    language: language
                })
            })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                btn.disabled = false;
                btn.querySelector('.format-icon').textContent = '✨';

                if (data.success && data.code) {
                    editor.setValue(data.code);
                    showToast('Code formatted ✓', 'success');
                } else {
                    showToast('Format failed: ' + (data.error || 'Unknown error'), 'error');
                }
            })
            .catch(function (err) {
                btn.disabled = false;
                btn.querySelector('.format-icon').textContent = '✨';
                showToast('Could not format code', 'error');
                console.error('Format error:', err);
            });
        });
    }
    // ── Retry Button ──────────────────────────────────────────────────────────
    function initRetryButton() {
        const btn = document.getElementById('retryBtn');
        btn.addEventListener('click', function () {
            analyseCode();
        });
    }

        // ── Run Code Button ───────────────────────────────────────────────────────
    function initRunButton() {
        const btn = document.getElementById('runCodeBtn');
        const closeBtn = document.getElementById('closeRunBtn');

        btn.addEventListener('click', function () {
            if (!editor) {
                showToast('Editor not ready yet', 'error');
                return;
            }

            const code = editor.getValue().trim();
            if (!code || code.length < 5 || window.isPlaceholder) {
                showToast('No code to run', 'error');
                return;
            }

            // Block execution on production
            if (window.isProduction) {
                showToast('⚡ Code execution is only available in local mode', 'info');
                return;
            } 

            const language = document.getElementById('languageSelect').value;

            // Languages we support for execution
            const runnable = ['python', 'javascript', 'ruby', 'php', 'bash',
                              'go', 'java', 'cpp', 'c', 'auto'];
            if (!runnable.includes(language)) {
                showToast('Run not available for ' + language +
                          '. Try: Python, JS, Java, C++, Ruby, PHP, Go, Bash', 'info');
                return;
            }

            // Disable button while running
            btn.disabled = true;
            btn.querySelector('.run-label').textContent = 'Running...';

            // Call our run endpoint
            fetch('/api/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: code,
                    language: language
                })
            })
            .then(function (response) {
                return response.json();
            })
            .then(function (data) {
                btn.disabled = false;
                btn.querySelector('.run-label').textContent = 'Run';

                const panel = document.getElementById('runOutputPanel');
                const content = document.getElementById('runOutputContent');

                panel.style.display = 'block';

                if (data.success) {
                    content.className = 'run-output-content';
                    content.textContent = data.output || '(No output)';
                    showToast('Code executed successfully', 'success');
                } else {
                    content.className = 'run-output-content error-output';
                    content.textContent = data.error || 'Execution failed';
                    showToast('Code had errors', 'error');
                }

                // On mobile switch to results panel
                if (window.innerWidth <= 768) {
                    switchToResultsPanel();
                }
            })
            .catch(function (error) {
                btn.disabled = false;
                btn.querySelector('.run-label').textContent = 'Run';
                showToast('Could not run code', 'error');
                console.error('Run error:', error);
            });
        });

        // Close button for run output
        if (closeBtn) {
            closeBtn.addEventListener('click', function () {
                document.getElementById('runOutputPanel').style.display = 'none';
            });
        }
    }

    // ── Main Analysis Function ────────────────────────────────────────────────
    function analyseCode() {
        if (!editor) {
            showToast('Editor not ready yet. Please wait.', 'error');
            return;
        }

        const code = editor.getValue().trim();

        if (!code || code === '// Paste your code here or select a sample below' || window.isPlaceholder) {
            showToast('Please paste some code first', 'error');
            return;
        }

        if (code.length < 5) {
            showToast('Code is too short to analyse', 'error');
            return;
        }

        const language = document.getElementById('languageSelect').value;

        // Show loading state
        setLoadingState(true);
        // ADD THIS: Switch to results panel immediately on mobile
    if (window.innerWidth <= 768) {
        switchToResultsPanel();
    }

        // Make API call
        fetch('/api/' + currentMode, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: code,
                language: language,
                mode: currentMode,
                beginner_mode: false
            })
        })
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            setLoadingState(false);

            if (data.success) {
                renderResults(data);
                showToast('Analysis complete', 'success');

                // On mobile switch to results panel
                if (window.innerWidth <= 768) {
                    switchToResultsPanel();
                }
            } else {
                showError(data.error || 'Analysis Failed', data.message || 'Please try again.');
            }
        })
        .catch(function (error) {
            setLoadingState(false);
            showError('Connection Error', 'Could not reach C.I.D server. Is it running?');
            console.error('Fetch error:', error);
        });
    }

    // ── Loading State ─────────────────────────────────────────────────────────
        // ── Loading State ─────────────────────────────────────────────────────────
    function setLoadingState(loading) {
        isLoading = loading;

        const btn = document.getElementById('analyseBtn');
        const btnText = btn.querySelector('.btn-text');
        const btnLoader = btn.querySelector('.btn-loader');
        const btnArrow = btn.querySelector('.btn-arrow');

        if (loading) {
            btn.disabled = true;
            btnText.textContent = 'Analysing...';
            btnLoader.style.display = 'inline-flex';
            btnArrow.style.display = 'none';

            showView('loading');
            animateLoadingSteps();
        } else {
            btn.disabled = false;
            btnText.textContent = 'Analyse Code';
            btnLoader.style.display = 'none';
            btnArrow.style.display = 'inline';
        }
    }

    // ── Animate Loading Steps ─────────────────────────────────────────────────
    function animateLoadingSteps() {
        const steps = document.querySelectorAll('.loading-step');
        if (!steps.length) return;

        // Reset all steps
        steps.forEach(function (s) {
            s.classList.remove('active', 'done');
        });

        // Sequentially activate each step
        const timings = [100, 400, 800, 2000];  // ms delays

        steps.forEach(function (step, index) {
            setTimeout(function () {
                step.classList.add('active');

                // Mark previous step as done
                if (index > 0) {
                    steps[index - 1].classList.remove('active');
                    steps[index - 1].classList.add('done');
                }
            }, timings[index]);
        });
    }
    // ── Show/Hide Views ───────────────────────────────────────────────────────
    function showView(view) {
        const views = ['emptyState', 'loadingState', 'errorState', 'resultsOutput'];
        views.forEach(function (id) {
            document.getElementById(id).style.display = 'none';
        });

        const stateMap = {
            'empty':   'emptyState',
            'loading': 'loadingState',
            'error':   'errorState',
            'results': 'resultsOutput'
        };

        if (stateMap[view]) {
            document.getElementById(stateMap[view]).style.display =
                view === 'results' ? 'block' : 'flex';
        }
    }

    // ── Show Error ────────────────────────────────────────────────────────────
    function showError(title, message) {
        document.getElementById('errorTitle').textContent = title;
        document.getElementById('errorMessage').textContent = message;
        showView('error');
    }

    // ── Switch to Results Panel (Mobile) ──────────────────────────────────────
    function switchToResultsPanel() {
        const toggles = document.querySelectorAll('.panel-toggle');
        toggles.forEach(function (t) { t.classList.remove('active'); });

        const resultsToggle = document.querySelector('[data-panel="results"]');
        if (resultsToggle) resultsToggle.classList.add('active');

        document.getElementById('codePanel').classList.remove('active');
        document.getElementById('resultsPanel').classList.add('active');
    }

        // ── Section Wrapping Helper ───────────────────────────────────────────────
    function wrapSection(title, contentHtml) {
        return '<div class="result-section">' +
               '<div class="result-section-title" onclick="toggleSection(this)">' +
                   '<span>' + title + '</span>' +
                   '<span class="section-toggle">▼</span>' +
               '</div>' +
               '<div class="section-content">' + contentHtml + '</div>' +
               '</div>';
    }

    // Make toggle function global so onclick works
    window.toggleSection = function (titleEl) {
        const section = titleEl.closest('.result-section');
        section.classList.toggle('collapsed');
    };
    // ── Groq Rate-Limit Status ─────────────────────────────────────────────────

function parseGroqResetDuration(value) {
    if (!value) return 0;

    const text = String(value).trim();
    let totalMs = 0;

    const hours = text.match(/(\d+(?:\.\d+)?)h/);
    const minutes = text.match(/(\d+(?:\.\d+)?)m(?!s)/);
    const seconds = text.match(/(\d+(?:\.\d+)?)s/);
    const milliseconds = text.match(/(\d+(?:\.\d+)?)ms/);

    if (hours) totalMs += parseFloat(hours[1]) * 60 * 60 * 1000;
    if (minutes) totalMs += parseFloat(minutes[1]) * 60 * 1000;
    if (seconds) totalMs += parseFloat(seconds[1]) * 1000;
    if (milliseconds) totalMs += parseFloat(milliseconds[1]);

    return totalMs;
}

function formatGroqTokenCount(value) {
    const amount = Number.parseInt(value, 10);

    if (!Number.isFinite(amount)) return null;
    if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return (amount / 1000).toFixed(1).replace('.0', '') + 'K';

    return String(amount);
}

function formatGroqResetTime(milliseconds) {
    const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));

    if (totalSeconds >= 3600) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        return hours + 'h ' + minutes + 'm';
    }

    if (totalSeconds >= 60) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return minutes + 'm ' + seconds + 's';
    }

    return totalSeconds + 's';
}

function hideRateLimitStatus() {
    const status = document.getElementById('rateLimitStatus');

    if (rateLimitCountdownTimer) {
        window.clearInterval(rateLimitCountdownTimer);
        rateLimitCountdownTimer = null;
    }

    if (status) {
        status.style.display = 'none';
        status.textContent = '';
        status.classList.remove('is-low', 'is-critical');
    }
}

function renderRateLimitStatus(rateLimit) {
    const status = document.getElementById('rateLimitStatus');

    hideRateLimitStatus();

    if (!status || !rateLimit || !rateLimit.tokens_remaining) {
        return;
    }

    const remaining = Number.parseInt(rateLimit.tokens_remaining, 10);
    const limit = Number.parseInt(rateLimit.tokens_limit, 10);
    const formattedTokens = formatGroqTokenCount(rateLimit.tokens_remaining);

    if (!Number.isFinite(remaining) || !formattedTokens) {
        return;
    }

    const resetDuration = parseGroqResetDuration(rateLimit.tokens_reset);
    const resetAt = Date.now() + resetDuration;

    status.style.display = 'inline-flex';
    status.title = 'Current Groq token rate-limit window. It updates after each analysis.';

    if (Number.isFinite(limit) && limit > 0) {
        const remainingRatio = remaining / limit;

        if (remainingRatio <= 0.05) {
            status.classList.add('is-critical');
        } else if (remainingRatio <= 0.20) {
            status.classList.add('is-low');
        }
    }

    function updateStatusText() {
        const timeLeft = Math.max(0, resetAt - Date.now());

        if (resetDuration <= 0) {
            status.textContent = formattedTokens + ' tokens left';
            return;
        }

        if (timeLeft <= 0) {
            status.textContent = 'Limit reset. Run analysis to update.';

            if (rateLimitCountdownTimer) {
                window.clearInterval(rateLimitCountdownTimer);
                rateLimitCountdownTimer = null;
            }

            return;
        }

        status.textContent =
            formattedTokens + ' tokens left · resets in ' +
            formatGroqResetTime(timeLeft);
    }

    updateStatusText();
    rateLimitCountdownTimer = window.setInterval(updateStatusText, 1000);
}
    // ── Render Results ────────────────────────────────────────────────────────
    function renderResults(data) {
        const output = document.getElementById('resultsOutput');
        const result = data.result;
        const mode = data.mode;

        // Show badges
        const providerBadge = document.getElementById('providerBadge');
        const timeBadge = document.getElementById('timeBadge');
        const copyBtn = document.getElementById('copyBtn');

        providerBadge.textContent = data.provider;
        providerBadge.style.display = 'inline-block';

        timeBadge.textContent = data.response_time + 's';
        timeBadge.style.display = 'inline-block';
        renderRateLimitStatus(data.rate_limit);

        copyBtn.style.display = 'flex';

        const chatToggle = document.getElementById('chatToggleBtn');
        if (chatToggle) chatToggle.style.display = 'flex';

        const exportBtn = document.getElementById('exportPdfBtn');
        if (exportBtn) exportBtn.style.display = 'flex';

        const shareBtn = document.getElementById('shareBtn');
        if (shareBtn) shareBtn.style.display = 'flex';

        // Save session ID for export/share
        if (data.session_id) {
            window.currentSessionId = data.session_id;
        }
        // Build HTML based on mode
        let html = '';

        if (mode === 'explain') {
            html = renderExplain(result);
        } else if (mode === 'debug') {
            html = renderDebug(result);
        } else if (mode === 'optimize') {
            html = renderOptimize(result);
        } else if (mode === 'security') {
            html = renderSecurity(result);
        }

        output.innerHTML = html;
        showView('results');
        
        // ── Apply ChatGPT Streaming Effect ──
        const elements = output.querySelectorAll('.quality-score-card, .result-summary, .result-section-title, .line-card, .bug-card, .complexity-grid, .fixed-code-section');
        elements.forEach(function(el, index) {
            el.classList.add('stream-animate');
            // Stagger the animation so they appear one after another (150ms apart)
            el.style.animationDelay = (index * 0.12) + 's';
        });

        // Attach copy code button listeners
        attachCopyCodeButtons();
    }
        // Expose for history loading
    window.renderSavedResult = renderResults;
    // ── Render: Explain Mode ──────────────────────────────────────────────────
        function renderExplain(result) {
        let html = '';

        // Quality Score (at very top)
        html += buildQualityScore(result);

        // Summary
        if (result.summary) {
            html += '<div class="result-summary">' + escapeHtml(result.summary) + '</div>';
        }

        // Line by line — wrapped in collapsible section
        if (result.lines && result.lines.length > 0) {
            let linesHtml = '';
            result.lines.forEach(function (line) {
                linesHtml += '<div class="line-card">';
                linesHtml += '<div class="line-number">' + (line.line_number || '') + '</div>';
                linesHtml += '<div class="line-content">';
                linesHtml += '<div class="line-code">' + escapeHtml(line.code || '') + '</div>';
                linesHtml += '<div class="line-explanation">' + escapeHtml(line.explanation || '') + '</div>';
                linesHtml += '</div></div>';
            });
            html += wrapSection('Line-by-Line Explanation', linesHtml);
        }

        // Functions
        if (result.functions && result.functions.length > 0) {
            let fnHtml = '';
            result.functions.forEach(function (fn) {
                fnHtml += '<div class="bug-card">';
                fnHtml += '<div class="bug-header">';
                fnHtml += '<span class="severity-badge medium">' + escapeHtml(fn.name || '') + '</span>';
                fnHtml += '</div>';
                fnHtml += '<div class="bug-description">' + escapeHtml(fn.purpose || '') + '</div>';
                if (fn.parameters && fn.parameters.length > 0) {
                    fnHtml += '<div class="bug-why">Parameters: ' + fn.parameters.join(', ') + '</div>';
                }
                if (fn.returns) {
                    fnHtml += '<div class="bug-why">Returns: ' + escapeHtml(fn.returns) + '</div>';
                }
                fnHtml += '</div>';
            });
            html += wrapSection('Functions', fnHtml);
        }

        // Key Concepts
        if (result.key_concepts && result.key_concepts.length > 0) {
            let tagsHtml = '<div class="concept-tags">';
            result.key_concepts.forEach(function (concept) {
                tagsHtml += '<span class="concept-tag">' + escapeHtml(concept) + '</span>';
            });
            tagsHtml += '</div>';
            html += wrapSection('Key Concepts', tagsHtml);
        }

        // Beginner Tip
        if (result.beginner_tip) {
            html += '<div class="beginner-tip">' + escapeHtml(result.beginner_tip) + '</div>';
        }

        // Overview Section
        html += buildOverview(result);

        return html;
    }

        // ── Render: Debug Mode ────────────────────────────────────────────────────
    function renderDebug(result) {
        let html = '';
        
        // Quality Score
        html += buildQualityScore(result);

        // Summary
        if (result.summary) {
            html += '<div class="result-summary">' + escapeHtml(result.summary) + '</div>';
        }

        // Bug count
        const bugCount = result.bugs_found || 0;
        const status = result.overall_status || 'unknown';

        if (status === 'no_bugs' || bugCount === 0) {
            html += '<div class="risk-header none">';
            html += '<span style="font-size:24px;">✅</span>';
            html += '<div><div class="risk-level" style="color:var(--green);">No Bugs Found</div>';
            html += '<div style="font-size:12px;color:var(--text-secondary);">Your code looks good!</div></div>';
            html += '</div>';
        } else {
            // Highlight bug lines in editor
            const bugLineNumbers = [];

            let bugsHtml = '';
            if (result.bugs && result.bugs.length > 0) {
                result.bugs.forEach(function (bug) {
                    const severity = (bug.severity || 'medium').toLowerCase();
                    if (bug.line_number) bugLineNumbers.push(bug.line_number);

                    bugsHtml += '<div class="bug-card ' + severity + '">';
                    bugsHtml += '<div class="bug-header">';
                    bugsHtml += '<span class="severity-badge ' + severity + '">' + severity + '</span>';
                    bugsHtml += '<span class="bug-type">' + escapeHtml(bug.type || '') + '</span>';
                    if (bug.line_number) {
                        bugsHtml += '<span class="bug-type">Line ' + bug.line_number + '</span>';
                    }
                    bugsHtml += '</div>';
                    bugsHtml += '<div class="bug-description">' + escapeHtml(bug.description || '') + '</div>';

                    // Diff view: before + after
                    if (bug.line_code && bug.fix) {
                        bugsHtml += '<div class="diff-container">';
                        bugsHtml += '<div class="diff-header">';
                        bugsHtml += '<div class="diff-header-cell before">✗ Before</div>';
                        bugsHtml += '<div class="diff-header-cell after">✓ After</div>';
                        bugsHtml += '</div>';
                        bugsHtml += '<div class="diff-body">';
                        bugsHtml += '<div class="diff-column before">' + escapeHtml(bug.line_code) + '</div>';
                        bugsHtml += '<div class="diff-column after">' + escapeHtml(bug.fix) + '</div>';
                        bugsHtml += '</div></div>';
                    } else {
                        if (bug.line_code) {
                            bugsHtml += '<div class="bug-code-block bug-code-wrong">' + escapeHtml(bug.line_code) + '</div>';
                        }
                        if (bug.fix) {
                            bugsHtml += '<div class="bug-code-block bug-code-fix">' + escapeHtml(bug.fix) + '</div>';
                        }
                    }

                    if (bug.why_problem) {
                        bugsHtml += '<div class="bug-why">Why: ' + escapeHtml(bug.why_problem) + '</div>';
                    }

                    bugsHtml += '</div>';
                });
            }

            html += wrapSection('Bugs Found: ' + bugCount, bugsHtml);

            // Highlight bug lines in Monaco Editor
            highlightBugLines(bugLineNumbers);
        }

        // Fixed Code
        if (result.fixed_code && bugCount > 0) {
            html += '<div class="fixed-code-section">';
            html += '<div class="fixed-code-header">';
            html += '<span class="fixed-code-title">✅ Complete Fixed Code</span>';
            html += '<button class="copy-code-btn" data-code="' + encodeURIComponent(result.fixed_code) + '">Copy Code</button>';
            html += '</div>';
            html += '<div class="fixed-code-block">' + escapeHtml(result.fixed_code) + '</div>';
            html += '</div>';
        }

        html += buildOverview(result);

        return html;
    }

    // ── Highlight Bug Lines in Monaco Editor ──────────────────────────────────
    let currentDecorations = [];

    function highlightBugLines(lineNumbers) {
        if (!editor || !lineNumbers || lineNumbers.length === 0) return;

        // Clear previous decorations
        currentDecorations = editor.deltaDecorations(currentDecorations, []);

        // Create new decorations
        const decorations = lineNumbers.map(function (lineNum) {
            return {
                range: new monaco.Range(lineNum, 1, lineNum, 1),
                options: {
                    isWholeLine:       true,
                    className:         'bug-line-highlight',
                    glyphMarginClassName: 'bug-line-glyph',
                    hoverMessage:      { value: '🐛 Bug detected on this line' }
                }
            };
        });

        currentDecorations = editor.deltaDecorations([], decorations);
    }

    // Expose for use when clearing
    window.clearBugHighlights = function () {
        if (editor && currentDecorations.length > 0) {
            currentDecorations = editor.deltaDecorations(currentDecorations, []);
        }
    };

        // ── Render: Optimize Mode ─────────────────────────────────────────────────
    function renderOptimize(result) {
        let html = '';

        // Quality Score
        html += buildQualityScore(result);
        // Summary
        if (result.summary) {
            html += '<div class="result-summary">' + escapeHtml(result.summary) + '</div>';
        }

        // Complexity comparison
        const current = result.current_complexity || {};
        const optimized = result.optimized_complexity || {};

        let complexityHtml = '<div class="complexity-grid">';
        complexityHtml += '<div class="complexity-card">';
        complexityHtml += '<div class="complexity-label">Current Time</div>';
        complexityHtml += '<div class="complexity-value">' + escapeHtml(current.time || '?') + '</div>';
        complexityHtml += '</div>';
        complexityHtml += '<div class="complexity-card improved">';
        complexityHtml += '<div class="complexity-label">Optimized Time</div>';
        complexityHtml += '<div class="complexity-value">' + escapeHtml(optimized.time || '?') + '</div>';
        complexityHtml += '</div>';
        complexityHtml += '<div class="complexity-card">';
        complexityHtml += '<div class="complexity-label">Current Space</div>';
        complexityHtml += '<div class="complexity-value">' + escapeHtml(current.space || '?') + '</div>';
        complexityHtml += '</div>';
        complexityHtml += '<div class="complexity-card improved">';
        complexityHtml += '<div class="complexity-label">Optimized Space</div>';
        complexityHtml += '<div class="complexity-value">' + escapeHtml(optimized.space || '?') + '</div>';
        complexityHtml += '</div>';
        complexityHtml += '</div>';

        html += '<div class="result-section">';
        html += '<div class="result-section-title" onclick="toggleSection(this)">';
        html += '<span>Complexity Analysis <button class="info-btn" onclick="event.stopPropagation();showComplexityInfo()">i</button></span>';
        html += '<span class="section-toggle">▼</span>';
        html += '</div>';
        html += '<div class="section-content">' + complexityHtml + '</div>';
        html += '</div>';

        // Suggestions with diff view
        if (result.suggestions && result.suggestions.length > 0) {
            let sugHtml = '';
            result.suggestions.forEach(function (sug) {
                sugHtml += '<div class="bug-card medium">';
                sugHtml += '<div class="bug-header">';
                sugHtml += '<span class="severity-badge medium">' + escapeHtml(sug.priority || 'medium') + '</span>';
                sugHtml += '<span class="bug-type">' + escapeHtml(sug.title || '') + '</span>';
                sugHtml += '</div>';
                sugHtml += '<div class="bug-description">' + escapeHtml(sug.description || '') + '</div>';

                if (sug.before_code && sug.after_code) {
                    sugHtml += '<div class="diff-container">';
                    sugHtml += '<div class="diff-header">';
                    sugHtml += '<div class="diff-header-cell before">Before</div>';
                    sugHtml += '<div class="diff-header-cell after">After</div>';
                    sugHtml += '</div>';
                    sugHtml += '<div class="diff-body">';
                    sugHtml += '<div class="diff-column before">' + escapeHtml(sug.before_code) + '</div>';
                    sugHtml += '<div class="diff-column after">' + escapeHtml(sug.after_code) + '</div>';
                    sugHtml += '</div></div>';
                }

                sugHtml += '</div>';
            });
            html += wrapSection('Optimization Suggestions', sugHtml);
        }

        // Optimized Code
        if (result.optimized_code) {
            html += '<div class="fixed-code-section">';
            html += '<div class="fixed-code-header">';
            html += '<span class="fixed-code-title">⚡ Optimized Code</span>';
            html += '<button class="copy-code-btn" data-code="' + encodeURIComponent(result.optimized_code) + '">Copy Code</button>';
            html += '</div>';
            html += '<div class="fixed-code-block">' + escapeHtml(result.optimized_code) + '</div>';
            html += '</div>';
        }

        html += buildOverview(result);

        return html;
    }

    // ── Render: Security Mode ─────────────────────────────────────────────────
    function renderSecurity(result) {
        let html = '';

        // Quality Score
        html += buildQualityScore(result);

        // Risk header
        const risk = (result.overall_risk || 'unknown').toLowerCase();
        html += '<div class="risk-header ' + risk + '">';
        html += '<span style="font-size:24px;">' + getRiskIcon(risk) + '</span>';
        html += '<div>';
        html += '<div class="risk-level">Risk: ' + risk.toUpperCase() + '</div>';
        html += '<div style="font-size:12px;color:var(--text-secondary);">';
        html += (result.total_found || 0) + ' vulnerabilities found';
        html += '</div></div></div>';

        // Summary
        if (result.summary) {
            html += '<div class="result-summary">' + escapeHtml(result.summary) + '</div>';
        }

        // Vulnerabilities
        if (result.vulnerabilities && result.vulnerabilities.length > 0) {
            html += '<div class="result-section">';
            html += '<div class="result-section-title">Vulnerabilities</div>';

            result.vulnerabilities.forEach(function (vuln) {
                const severity = (vuln.severity || 'medium').toLowerCase();
                html += '<div class="bug-card ' + severity + '">';
                html += '<div class="bug-header">';
                html += '<span class="severity-badge ' + severity + '">' + severity + '</span>';
                html += '<span class="bug-type">' + escapeHtml(vuln.type || '') + '</span>';
                if (vuln.line_number) {
                    html += '<span class="bug-type">Line ' + vuln.line_number + '</span>';
                }
                html += '</div>';
                html += '<div class="bug-description">' + escapeHtml(vuln.description || '') + '</div>';

                if (vuln.risk) {
                    html += '<div class="bug-why">Risk: ' + escapeHtml(vuln.risk) + '</div>';
                }
                if (vuln.line_code) {
                    html += '<div class="bug-code-block bug-code-wrong">' + escapeHtml(vuln.line_code) + '</div>';
                }
                if (vuln.fix) {
                    html += '<div class="bug-code-block bug-code-fix">' + escapeHtml(vuln.fix) + '</div>';
                }
                if (vuln.owasp_category) {
                    html += '<div style="margin-top:6px;">';
                    html += '<span class="concept-tag">' + escapeHtml(vuln.owasp_category) + '</span>';
                    html += '</div>';
                }

                html += '</div>';
            });

            html += '</div>';
        } else if (risk === 'none') {
            html += '<div class="risk-header none">';
            html += '<span style="font-size:24px;">✅</span>';
            html += '<div><div class="risk-level" style="color:var(--green);">Code is Secure</div>';
            html += '<div style="font-size:12px;color:var(--text-secondary);">No vulnerabilities detected</div></div>';
            html += '</div>';
        }

        // Recommendations
        if (result.recommendations && result.recommendations.length > 0) {
            html += '<div class="result-section">';
            html += '<div class="result-section-title">Recommendations</div>';
            result.recommendations.forEach(function (rec) {
                html += '<div class="line-card">';
                html += '<div class="line-number">→</div>';
                html += '<div class="line-content">';
                html += '<div class="line-explanation">' + escapeHtml(rec) + '</div>';
                html += '</div></div>';
            });
            html += '</div>';
        }
        html += buildOverview(result);

        return html;
    }

    // ── Build Quality Score Card ──────────────────────────────────────────────
    function buildQualityScore(result) {
        const quality = result.quality_score;
        if (!quality || !quality.overall) return '';

        const overall = Math.max(0, Math.min(100, quality.overall));
        const readability = quality.readability || 0;
        const complexity = quality.complexity || 0;
        const bestPractices = quality.best_practices || 0;
        const verdict = quality.verdict || 'Unknown';

        // Determine color based on score
        let color = 'var(--red)';
        let verdictClass = 'poor';
        if (overall >= 90) { color = 'var(--green)';  verdictClass = 'excellent'; }
        else if (overall >= 80) { color = 'var(--accent)'; verdictClass = 'very-good'; }
        else if (overall >= 70) { color = 'var(--accent)'; verdictClass = 'good'; }
        else if (overall >= 50) { color = 'var(--amber)';  verdictClass = 'fair'; }
        else if (overall >= 30) { color = 'var(--amber)';  verdictClass = 'needs-work'; }

        // Icon for verdict
        const icons = {
            'excellent': '🏆',
            'very-good': '✨',
            'good':      '👍',
            'fair':      '⚠️',
            'needs-work':'🔧',
            'poor':      '❌',
        };
        const icon = icons[verdictClass] || '📊';

        // SVG circular gauge calculations
        const radius = 32;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (overall / 100) * circumference;

        let html = '<div class="quality-score-card">';

        // Circular gauge
        html += '<div class="quality-gauge">';
        html += '<svg viewBox="0 0 80 80">';
        html += '<circle class="gauge-bg" cx="40" cy="40" r="32"/>';
        html += '<circle class="gauge-fill" cx="40" cy="40" r="32" ';
        html += 'stroke-dasharray="' + circumference + '" ';
        html += 'stroke-dashoffset="' + offset + '" ';
        html += 'style="stroke:' + color + ';"/>';
        html += '</svg>';
        html += '<div class="gauge-text">';
        html += '<div class="gauge-number">' + overall + '</div>';
        html += '<div class="gauge-total">/ 100</div>';
        html += '</div></div>';

        // Details section
        html += '<div class="quality-details">';
        html += '<div class="quality-verdict ' + verdictClass + '">';
        html += icon + ' ' + escapeHtml(verdict);
        html += '</div>';

        html += '<div class="quality-bars">';
        html += renderQualityBar('Readability',    readability);
        html += renderQualityBar('Complexity',     complexity);
        html += renderQualityBar('Best Practices', bestPractices);
        html += '</div>';

        html += '</div></div>';

        return html;
    }

    function renderQualityBar(label, value) {
        value = Math.max(0, Math.min(100, value));
        let color = 'var(--red)';
        if (value >= 80)      color = 'var(--green)';
        else if (value >= 60) color = 'var(--accent)';
        else if (value >= 40) color = 'var(--amber)';

        let html = '<div class="quality-bar-row">';
        html += '<span class="quality-bar-label">' + label + '</span>';
        html += '<div class="quality-bar-track">';
        html += '<div class="quality-bar-fill" style="width:' + value + '%;background:' + color + ';"></div>';
        html += '</div>';
        html += '<span class="quality-bar-value">' + value + '</span>';
        html += '</div>';
        return html;
    }
    // ── Build Overview Section ────────────────────────────────────────────────
    function buildOverview(result) {
        let overviewText = '';

        if (result.summary) {
            overviewText = result.summary;
        } else {
            return '';
        }

        // Keep overview short — max 2 sentences
        const sentences = overviewText.split(/(?<=[.!?])\s+/);
        if (sentences.length > 3) {
            overviewText = sentences.slice(0, 3).join(' ');
        }

        let html = '<div class="overview-section">';
        html += '<div class="overview-header">';
        html += '<span class="overview-icon">📝</span>';
        html += '<span class="overview-title">Quick Overview</span>';
        html += '</div>';
        html += '<div class="overview-text">' + escapeHtml(overviewText) + '</div>';
        html += '</div>';

        return html;
    }

        // ── Complexity Info Popup ─────────────────────────────────────────────────
    window.showComplexityInfo = function () {
        // Remove existing popup if any
        const existing = document.getElementById('infoPopupOverlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'info-popup-overlay';
        overlay.id = 'infoPopupOverlay';

        overlay.innerHTML = `
            <div class="info-popup">
                <div class="info-popup-header">
                    <span class="info-popup-title">📊 What is Complexity Analysis?</span>
                    <button class="info-popup-close" onclick="document.getElementById('infoPopupOverlay').remove()">✕</button>
                </div>

                <p style="font-size:13px; color:var(--text-secondary); line-height:1.6; margin-bottom:16px;">
                    Complexity tells you how <strong style="color:var(--text-primary)">fast</strong> your code runs 
                    and how much <strong style="color:var(--text-primary)">memory</strong> it uses. 
                    As your data gets bigger, slow code becomes a real problem. 
                    The AI analyses your code and tells you if there is a faster way to do the same thing.
                </p>

                <div class="info-row">
                    <span class="info-badge best">O(1)</span>
                    <div class="info-text">
                        <div class="info-text-title">Constant — Instant ⚡</div>
                        <div class="info-text-desc">Same speed no matter how much data you have. Example: looking up a value by index in a list.</div>
                    </div>
                </div>

                <div class="info-row">
                    <span class="info-badge good">O(log n)</span>
                    <div class="info-text">
                        <div class="info-text-title">Logarithmic — Very Fast</div>
                        <div class="info-text-desc">Cuts the problem in half each step. Example: binary search — finding a word in a dictionary by opening to the middle.</div>
                    </div>
                </div>

                <div class="info-row">
                    <span class="info-badge good">O(n)</span>
                    <div class="info-text">
                        <div class="info-text-title">Linear — Fast</div>
                        <div class="info-text-desc">Goes through each item once. Example: reading every name in a list to find someone.</div>
                    </div>
                </div>

                <div class="info-row">
                    <span class="info-badge ok">O(n log n)</span>
                    <div class="info-text">
                        <div class="info-text-title">Linearithmic — Decent</div>
                        <div class="info-text-desc">Efficient sorting speed. Example: merge sort, quicksort — the fastest way to sort a shuffled deck of cards.</div>
                    </div>
                </div>

                <div class="info-row">
                    <span class="info-badge bad">O(n²)</span>
                    <div class="info-text">
                        <div class="info-text-title">Quadratic — Slow ⚠️</div>
                        <div class="info-text-desc">Two nested loops. Example: comparing every student with every other student. 1000 students = 1,000,000 comparisons.</div>
                    </div>
                </div>

                <div class="info-row">
                    <span class="info-badge bad">O(2^n)</span>
                    <div class="info-text">
                        <div class="info-text-title">Exponential — Very Slow 🐌</div>
                        <div class="info-text-desc">Doubles with each new item. Example: trying every possible combination of a password. Practically unusable for large data.</div>
                    </div>
                </div>

                <div class="info-example">
                    <div class="info-example-title">Real World Example — 1000 Items</div>
                    <div class="info-example-row">
                        <span class="info-example-label">O(1)</span>
                        <span class="info-example-value">1 operation</span>
                    </div>
                    <div class="info-example-row">
                        <span class="info-example-label">O(log n)</span>
                        <span class="info-example-value">10 operations</span>
                    </div>
                    <div class="info-example-row">
                        <span class="info-example-label">O(n)</span>
                        <span class="info-example-value">1,000 operations</span>
                    </div>
                    <div class="info-example-row">
                        <span class="info-example-label">O(n log n)</span>
                        <span class="info-example-value">10,000 operations</span>
                    </div>
                    <div class="info-example-row">
                        <span class="info-example-label">O(n²)</span>
                        <span class="info-example-value">1,000,000 operations</span>
                    </div>
                    <div class="info-example-row">
                        <span class="info-example-label">O(2^n)</span>
                        <span class="info-example-value">∞ practically impossible</span>
                    </div>
                </div>

                <p style="font-size:12px; color:var(--text-muted); margin-top:16px; text-align:center;">
                    The AI shows your code's current complexity and suggests a faster version.
                </p>
            </div>
        `;

        // Close when clicking outside
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) {
                overlay.remove();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escHandler);
            }
        });

        document.body.appendChild(overlay);
    };

    // ── Utility Functions ─────────────────────────────────────────────────────

    function getRiskIcon(risk) {
        const icons = {
            'critical': '🔴',
            'high': '🟠',
            'medium': '🟡',
            'low': '🟢',
            'none': '✅',
        };
        return icons[risk] || '⚪';
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showToast(message, type) {
        type = type || 'info';
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast ' + type;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(function () {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }
        // Expose for other scripts
    window.showToastGlobal = showToast;

    function attachCopyCodeButtons() {
        const buttons = document.querySelectorAll('.copy-code-btn');
        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                const code = decodeURIComponent(btn.getAttribute('data-code'));
                navigator.clipboard.writeText(code).then(function () {
                    btn.textContent = 'Copied!';
                    showToast('Code copied to clipboard', 'success');
                    setTimeout(function () {
                        btn.textContent = 'Copy Code';
                    }, 2000);
                });
            });
        });
    }

})();