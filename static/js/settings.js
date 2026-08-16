// static/js/settings.js
// ─────────────────────────────────────────────────────────────────────────────
// C.I.D — Settings Panel Manager (Full Implementation)
// Handles all 24 settings with localStorage persistence
// ─────────────────────────────────────────────────────────────────────────────

(function () {
    'use strict';

    // ── Default Settings ──────────────────────────────────────────────────────
    const DEFAULTS = {
        // Editor
        fontSize:        13,
        fontFamily:      "'JetBrains Mono', monospace",
        tabSize:         4,
        wordWrap:        true,
        lineNumbers:     true,
        minimap:         false,
        editorTheme:     'cid-default',

        // Analysis
        beginnerMode:    false,
        defaultLanguage: 'auto',
        defaultMode:     'explain',
        autoAnalyse:     false,
        responseDetail:  'balanced',

        // Appearance
        theme:           'dark',
        accentColor:     '#4F8EF7',
        glassIntensity:  'medium',
        compactMode:     false,
        logoAnimation:   true,

        // Behavior
        saveHistory:     true,
        showTime:        true,
        showProvider:    true,
        toastDuration:   3000,
        confirmClear:    true,

        // Advanced
        exportFormat:    'pdf',
    };

    // ── Load Settings from localStorage ───────────────────────────────────────
    function loadSettings() {
        const saved = localStorage.getItem('cid-settings');
        if (saved) {
            try {
                return { ...DEFAULTS, ...JSON.parse(saved) };
            } catch (e) {
                return { ...DEFAULTS };
            }
        }
        return { ...DEFAULTS };
    }

    // ── Save Settings to localStorage ─────────────────────────────────────────
    function saveSettings() {
        localStorage.setItem('cid-settings', JSON.stringify(window.cidSettings));
    }

    // ── Initialize ────────────────────────────────────────────────────────────
    window.cidSettings = loadSettings();

    document.addEventListener('DOMContentLoaded', function () {

        initDrawer();
        initEditorSettings();
        initAnalysisSettings();
        initAppearanceSettings();
        initBehaviorSettings();
        initAdvancedSettings();
        applyAllSettings();
    });

    // ── Drawer Open/Close ─────────────────────────────────────────────────────
    function initDrawer() {
        const btn      = document.getElementById('settingsBtn');
        const drawer   = document.getElementById('settingsDrawer');
        const overlay  = document.getElementById('settingsOverlay');
        const closeBtn = document.getElementById('settingsClose');

        btn.addEventListener('click', function () {
            drawer.classList.add('active');
            overlay.classList.add('active');
        });

        function close() {
            drawer.classList.remove('active');
            overlay.classList.remove('active');
        }

        closeBtn.addEventListener('click', close);
        overlay.addEventListener('click', close);

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && drawer.classList.contains('active')) {
                close();
            }
        });
    }

    // ── Editor Settings ───────────────────────────────────────────────────────
    function initEditorSettings() {
        // Font Size Slider
        const fontSize = document.getElementById('setFontSize');
        const fontSizeValue = document.getElementById('fontSizeValue');
        fontSize.value = window.cidSettings.fontSize;
        fontSizeValue.textContent = fontSize.value + 'px';

        fontSize.addEventListener('input', function () {
            fontSizeValue.textContent = fontSize.value + 'px';
            window.cidSettings.fontSize = parseInt(fontSize.value);
            saveSettings();
            applyEditorSettings();
        });

        // Font Family
        const fontFamily = document.getElementById('setFontFamily');
        fontFamily.value = window.cidSettings.fontFamily;
        fontFamily.addEventListener('change', function () {
            window.cidSettings.fontFamily = fontFamily.value;
            saveSettings();
            applyEditorSettings();
        });

        // Tab Size
        const tabSize = document.getElementById('setTabSize');
        tabSize.value = window.cidSettings.tabSize;
        tabSize.addEventListener('change', function () {
            window.cidSettings.tabSize = parseInt(tabSize.value);
            saveSettings();
            applyEditorSettings();
        });

        // Word Wrap
        const wordWrap = document.getElementById('setWordWrap');
        wordWrap.checked = window.cidSettings.wordWrap;
        wordWrap.addEventListener('change', function () {
            window.cidSettings.wordWrap = wordWrap.checked;
            saveSettings();
            applyEditorSettings();
        });

        // Line Numbers
        const lineNumbers = document.getElementById('setLineNumbers');
        lineNumbers.checked = window.cidSettings.lineNumbers;
        lineNumbers.addEventListener('change', function () {
            window.cidSettings.lineNumbers = lineNumbers.checked;
            saveSettings();
            applyEditorSettings();
        });

        // Minimap
        const minimap = document.getElementById('setMinimap');
        minimap.checked = window.cidSettings.minimap;
        minimap.addEventListener('change', function () {
            window.cidSettings.minimap = minimap.checked;
            saveSettings();
            applyEditorSettings();
        });
    }

    // ── Apply Editor Settings ─────────────────────────────────────────────────
    function applyEditorSettings() {
        if (!window.monacoEditorInstance) return;

        window.monacoEditorInstance.updateOptions({
            fontSize:    window.cidSettings.fontSize,
            fontFamily:  window.cidSettings.fontFamily,
            tabSize:     window.cidSettings.tabSize,
            wordWrap:    window.cidSettings.wordWrap ? 'on' : 'off',
            lineNumbers: window.cidSettings.lineNumbers ? 'on' : 'off',
            minimap:     { enabled: window.cidSettings.minimap },
        });
    }

    // ── Analysis Settings ─────────────────────────────────────────────────────
    function initAnalysisSettings() {
        // Beginner Mode
        const beginner = document.getElementById('setBeginnerMode');
        beginner.checked = window.cidSettings.beginnerMode;
        beginner.addEventListener('change', function () {
            window.cidSettings.beginnerMode = beginner.checked;
            saveSettings();
        });

        // Default Language
        const lang = document.getElementById('setDefaultLanguage');
        lang.value = window.cidSettings.defaultLanguage;
        lang.addEventListener('change', function () {
            window.cidSettings.defaultLanguage = lang.value;
            saveSettings();
            // Also update the main language dropdown
            const mainLang = document.getElementById('languageSelect');
            if (mainLang) mainLang.value = lang.value;
        });

        // Default Mode
        const mode = document.getElementById('setDefaultMode');
        mode.value = window.cidSettings.defaultMode;
        mode.addEventListener('change', function () {
            window.cidSettings.defaultMode = mode.value;
            saveSettings();
            // Also activate the mode tab
            const tabs = document.querySelectorAll('.mode-tab');
            tabs.forEach(function (t) {
                t.classList.remove('active');
                if (t.getAttribute('data-mode') === mode.value) {
                    t.classList.add('active');
                }
            });
            window.currentAnalysisMode = mode.value;
        });

        // Auto Analyse
        const autoAnalyse = document.getElementById('setAutoAnalyse');
        autoAnalyse.checked = window.cidSettings.autoAnalyse;
        autoAnalyse.addEventListener('change', function () {
            window.cidSettings.autoAnalyse = autoAnalyse.checked;
            saveSettings();
        });

        // Response Detail
        const detail = document.getElementById('setResponseDetail');
        detail.value = window.cidSettings.responseDetail;
        detail.addEventListener('change', function () {
            window.cidSettings.responseDetail = detail.value;
            saveSettings();
        });
    }

    // ── Appearance Settings ───────────────────────────────────────────────────
    function initAppearanceSettings() {
        // Theme
        const theme = document.getElementById('setTheme');
        theme.value = window.cidSettings.theme;
        theme.addEventListener('change', function () {
            window.cidSettings.theme = theme.value;
            saveSettings();
            applyTheme();
        });

        // Accent Color
        const swatches = document.querySelectorAll('.accent-swatch');
        swatches.forEach(function (swatch) {
            if (swatch.getAttribute('data-color') === window.cidSettings.accentColor) {
                swatch.classList.add('active');
            } else {
                swatch.classList.remove('active');
            }

            swatch.addEventListener('click', function () {
                swatches.forEach(function (s) { s.classList.remove('active'); });
                swatch.classList.add('active');
                window.cidSettings.accentColor = swatch.getAttribute('data-color');
                saveSettings();
                applyAccentColor();
            });
        });

        // Glass Intensity
        const glass = document.getElementById('setGlassIntensity');
        glass.value = window.cidSettings.glassIntensity;
        glass.addEventListener('change', function () {
            window.cidSettings.glassIntensity = glass.value;
            saveSettings();
            applyGlassIntensity();
        });

        // Compact Mode
        const compact = document.getElementById('setCompactMode');
        compact.checked = window.cidSettings.compactMode;
        compact.addEventListener('change', function () {
            window.cidSettings.compactMode = compact.checked;
            saveSettings();
            applyCompactMode();
        });

        // Logo Animation Toggle
        const logoAnim = document.getElementById('setLogoAnimation');
        if (logoAnim) {
            logoAnim.checked = window.cidSettings.logoAnimation;
            logoAnim.addEventListener('change', function () {
                window.cidSettings.logoAnimation = logoAnim.checked;
                saveSettings();
                applyLogoAnimation();
            });
        }
        // Editor Theme
        const editorTheme = document.getElementById('setEditorTheme');
        if (editorTheme) {
            editorTheme.value = window.cidSettings.editorTheme;
            editorTheme.addEventListener('change', function () {
                window.cidSettings.editorTheme = editorTheme.value;
                saveSettings();
                applyEditorTheme();
            });
        }
    }

    function applyTheme() {
        const theme = window.cidSettings.theme;
        let actualTheme = theme;

        if (theme === 'auto') {
            actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark' : 'light';
        }

        document.documentElement.setAttribute('data-theme', actualTheme);
        localStorage.setItem('cid-theme', actualTheme);

        if (window.monacoEditorInstance) {
            const editorTheme = actualTheme === 'dark' ? 'cid-dark' : 'cid-light';
            monaco.editor.setTheme(editorTheme);
        }
    }

    function applyAccentColor() {
        const color = window.cidSettings.accentColor;
        // Convert hex to rgba for the soft version
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        const softColor = `rgba(${r}, ${g}, ${b}, 0.15)`;

        document.documentElement.style.setProperty('--accent', color);
        document.documentElement.style.setProperty('--accent-soft', softColor);
    }

    function applyGlassIntensity() {
        const intensity = window.cidSettings.glassIntensity;
        const blurMap = {
            'none':    '0px',
            'subtle':  '6px',
            'medium':  '12px',
            'strong':  '20px'
        };
        document.documentElement.style.setProperty('--glass-blur', blurMap[intensity]);

        // Apply to all glass elements
        const glassElements = document.querySelectorAll('.glass, .navbar, .settings-header, .overview-section');
        glassElements.forEach(function (el) {
            el.style.backdropFilter = 'blur(' + blurMap[intensity] + ')';
            el.style.webkitBackdropFilter = 'blur(' + blurMap[intensity] + ')';
        });
    }

    function applyCompactMode() {
        if (window.cidSettings.compactMode) {
            document.body.classList.add('compact-mode');
        } else {
            document.body.classList.remove('compact-mode');
        }
    }

    function applyLogoAnimation() {
        if (window.cidSettings.logoAnimation) {
            document.body.classList.remove('no-logo-animation');
        } else {
            document.body.classList.add('no-logo-animation');
        }
    }

    function applyEditorTheme() {
        if (!window.monacoEditorInstance) return;

        const themeName = window.cidSettings.editorTheme;
        const appTheme = document.documentElement.getAttribute('data-theme');

        // Define all themes
        const themes = {
            'cid-default': {
                base: appTheme === 'dark' ? 'cid-dark' : 'cid-light'
            },
            'dracula': {
                custom: {
                    base: 'vs-dark',
                    inherit: true,
                    rules: [
                        { token: 'comment', foreground: '6272A4' },
                        { token: 'string',  foreground: 'F1FA8C' },
                        { token: 'keyword', foreground: 'FF79C6' },
                        { token: 'number',  foreground: 'BD93F9' },
                        { token: 'type',    foreground: '8BE9FD' },
                    ],
                    colors: {
                        'editor.background':      '#282A36',
                        'editor.foreground':      '#F8F8F2',
                        'editorLineNumber.foreground': '#6272A4',
                        'editor.selectionBackground': '#44475A',
                        'editorCursor.foreground': '#F8F8F2',
                    }
                }
            },
            'monokai': {
                custom: {
                    base: 'vs-dark',
                    inherit: true,
                    rules: [
                        { token: 'comment', foreground: '75715E' },
                        { token: 'string',  foreground: 'E6DB74' },
                        { token: 'keyword', foreground: 'F92672' },
                        { token: 'number',  foreground: 'AE81FF' },
                        { token: 'type',    foreground: '66D9EF' },
                    ],
                    colors: {
                        'editor.background':      '#272822',
                        'editor.foreground':      '#F8F8F2',
                        'editorLineNumber.foreground': '#75715E',
                        'editorCursor.foreground': '#F8F8F0',
                    }
                }
            },
            'solarized-dark': {
                custom: {
                    base: 'vs-dark',
                    inherit: true,
                    rules: [
                        { token: 'comment', foreground: '586E75' },
                        { token: 'string',  foreground: '2AA198' },
                        { token: 'keyword', foreground: '859900' },
                        { token: 'number',  foreground: 'D33682' },
                    ],
                    colors: {
                        'editor.background':      '#002B36',
                        'editor.foreground':      '#839496',
                        'editorLineNumber.foreground': '#586E75',
                        'editorCursor.foreground': '#93A1A1',
                    }
                }
            },
            'solarized-light': {
                custom: {
                    base: 'vs',
                    inherit: true,
                    rules: [
                        { token: 'comment', foreground: '93A1A1' },
                        { token: 'string',  foreground: '2AA198' },
                        { token: 'keyword', foreground: '859900' },
                    ],
                    colors: {
                        'editor.background':      '#FDF6E3',
                        'editor.foreground':      '#657B83',
                        'editorLineNumber.foreground': '#93A1A1',
                        'editorCursor.foreground': '#586E75',
                    }
                }
            },
            'github-dark': {
                custom: {
                    base: 'vs-dark',
                    inherit: true,
                    rules: [
                        { token: 'comment', foreground: '8B949E' },
                        { token: 'string',  foreground: 'A5D6FF' },
                        { token: 'keyword', foreground: 'FF7B72' },
                        { token: 'number',  foreground: '79C0FF' },
                    ],
                    colors: {
                        'editor.background':      '#0D1117',
                        'editor.foreground':      '#C9D1D9',
                        'editorLineNumber.foreground': '#484F58',
                        'editorCursor.foreground': '#C9D1D9',
                    }
                }
            },
            'github-light': {
                custom: {
                    base: 'vs',
                    inherit: true,
                    rules: [
                        { token: 'comment', foreground: '6E7781' },
                        { token: 'string',  foreground: '0A3069' },
                        { token: 'keyword', foreground: 'CF222E' },
                    ],
                    colors: {
                        'editor.background':      '#FFFFFF',
                        'editor.foreground':      '#24292F',
                        'editorLineNumber.foreground': '#8C959F',
                        'editorCursor.foreground': '#24292F',
                    }
                }
            },
            'one-dark': {
                custom: {
                    base: 'vs-dark',
                    inherit: true,
                    rules: [
                        { token: 'comment', foreground: '5C6370', fontStyle: 'italic' },
                        { token: 'string',  foreground: '98C379' },
                        { token: 'keyword', foreground: 'C678DD' },
                        { token: 'number',  foreground: 'D19A66' },
                        { token: 'type',    foreground: 'E5C07B' },
                    ],
                    colors: {
                        'editor.background':      '#282C34',
                        'editor.foreground':      '#ABB2BF',
                        'editorLineNumber.foreground': '#4B5263',
                        'editorCursor.foreground': '#528BFF',
                    }
                }
            },
            'tokyo-night': {
                custom: {
                    base: 'vs-dark',
                    inherit: true,
                    rules: [
                        { token: 'comment', foreground: '565F89' },
                        { token: 'string',  foreground: '9ECE6A' },
                        { token: 'keyword', foreground: 'BB9AF7' },
                        { token: 'number',  foreground: 'FF9E64' },
                    ],
                    colors: {
                        'editor.background':      '#1A1B26',
                        'editor.foreground':      '#A9B1D6',
                        'editorLineNumber.foreground': '#3B4261',
                        'editorCursor.foreground': '#C0CAF5',
                    }
                }
            },
            'nord': {
                custom: {
                    base: 'vs-dark',
                    inherit: true,
                    rules: [
                        { token: 'comment', foreground: '4C566A' },
                        { token: 'string',  foreground: 'A3BE8C' },
                        { token: 'keyword', foreground: '81A1C1' },
                        { token: 'number',  foreground: 'B48EAD' },
                    ],
                    colors: {
                        'editor.background':      '#2E3440',
                        'editor.foreground':      '#D8DEE9',
                        'editorLineNumber.foreground': '#4C566A',
                        'editorCursor.foreground': '#D8DEE9',
                    }
                }
            },
            'ayu-mirage': {
                custom: {
                    base: 'vs-dark',
                    inherit: true,
                    rules: [
                        { token: 'comment', foreground: '5C6773', fontStyle: 'italic' },
                        { token: 'string',  foreground: 'BAE67E' },
                        { token: 'keyword', foreground: 'FFA759' },
                        { token: 'number',  foreground: 'FFCC66' },
                    ],
                    colors: {
                        'editor.background':      '#1F2430',
                        'editor.foreground':      '#CBCCC6',
                        'editorLineNumber.foreground': '#5C6773',
                        'editorCursor.foreground': '#FFCC66',
                    }
                }
            }
        };

        const themeConfig = themes[themeName];
        if (!themeConfig) return;

        // Use built-in theme if it's cid-default
        if (themeConfig.base) {
            monaco.editor.setTheme(themeConfig.base);
        } else if (themeConfig.custom) {
            // Define and apply custom theme
            monaco.editor.defineTheme(themeName, themeConfig.custom);
            monaco.editor.setTheme(themeName);
        }
    }

    // ── Behavior Settings ─────────────────────────────────────────────────────
    function initBehaviorSettings() {
        // Save History
        const saveHist = document.getElementById('setSaveHistory');
        saveHist.checked = window.cidSettings.saveHistory;
        saveHist.addEventListener('change', function () {
            window.cidSettings.saveHistory = saveHist.checked;
            saveSettings();
        });

        // Show Time
        const showTime = document.getElementById('setShowTime');
        showTime.checked = window.cidSettings.showTime;
        showTime.addEventListener('change', function () {
            window.cidSettings.showTime = showTime.checked;
            saveSettings();
            applyBadgeVisibility();
        });

        // Show Provider
        const showProv = document.getElementById('setShowProvider');
        showProv.checked = window.cidSettings.showProvider;
        showProv.addEventListener('change', function () {
            window.cidSettings.showProvider = showProv.checked;
            saveSettings();
            applyBadgeVisibility();
        });

        // Toast Duration
        const toastDur = document.getElementById('setToastDuration');
        toastDur.value = window.cidSettings.toastDuration;
        toastDur.addEventListener('change', function () {
            window.cidSettings.toastDuration = parseInt(toastDur.value);
            saveSettings();
        });

        // Confirm Clear
        const confClear = document.getElementById('setConfirmClear');
        confClear.checked = window.cidSettings.confirmClear;
        confClear.addEventListener('change', function () {
            window.cidSettings.confirmClear = confClear.checked;
            saveSettings();
        });
    }

    function applyBadgeVisibility() {
        const timeBadge = document.getElementById('timeBadge');
        const provBadge = document.getElementById('providerBadge');

        if (timeBadge) {
            timeBadge.style.display = window.cidSettings.showTime && timeBadge.textContent
                ? 'inline-block' : 'none';
        }
        if (provBadge) {
            provBadge.style.display = window.cidSettings.showProvider && provBadge.textContent
                ? 'inline-block' : 'none';
        }
    }

    // ── Advanced Settings ─────────────────────────────────────────────────────
    function initAdvancedSettings() {
        // Export Format
        const exportFmt = document.getElementById('setExportFormat');
        exportFmt.value = window.cidSettings.exportFormat;
        exportFmt.addEventListener('change', function () {
            window.cidSettings.exportFormat = exportFmt.value;
            saveSettings();
        });

        // Show Shortcuts
        const shortcutsBtn = document.getElementById('showShortcutsBtn');
        shortcutsBtn.addEventListener('click', showShortcutsPopup);

        // Show About
        const aboutBtn = document.getElementById('showAboutBtn');
        aboutBtn.addEventListener('click', showAboutPopup);

        // Clear All Data
        const clearBtn = document.getElementById('clearDataBtn');
        clearBtn.addEventListener('click', function () {
            if (confirm('This will clear all settings, history, and reload the page. Are you sure?')) {
                localStorage.clear();
                fetch('/api/history', { method: 'DELETE' })
                    .finally(function () {
                        location.reload();
                    });
            }
        });

        // Reset to Defaults
        const resetBtn = document.getElementById('settingsReset');
        resetBtn.addEventListener('click', function () {
            if (confirm('Reset all settings to defaults?')) {
                window.cidSettings = { ...DEFAULTS };
                saveSettings();
                location.reload();
            }
        });
    }

     // ── Shortcuts Popup ───────────────────────────────────────────────────────
    function showShortcutsPopup() {
        // Uses the improved popup from shortcuts.js
        if (window.showShortcutsHelp) {
            window.showShortcutsHelp();
        }
    }

    // ── About Popup ───────────────────────────────────────────────────────────
    function showAboutPopup() {
        const existing = document.getElementById('aboutPopup');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'info-popup-overlay';
        overlay.id = 'aboutPopup';

        overlay.innerHTML = `
            <div class="info-popup" style="text-align:center;">
                <div class="info-popup-header">
                    <span class="info-popup-title">ℹ️ About C.I.D</span>
                    <button class="info-popup-close" onclick="document.getElementById('aboutPopup').remove()">✕</button>
                </div>

                <div style="font-family:'JetBrains Mono',monospace;font-size:32px;font-weight:900;letter-spacing:6px;color:var(--accent);margin:16px 0 4px;">C.I.D</div>
                <div style="font-size:12px;color:var(--text-secondary);letter-spacing:2px;text-transform:uppercase;margin-bottom:20px;">Code Intelligent Debugger</div>

                <div style="text-align:left;padding:16px;background:var(--bg-elevated);border-radius:8px;border:1px solid var(--border);">
                    <div class="info-example-row"><span class="info-example-label">Version</span><span class="info-example-value">1.0.0</span></div>
                    <div class="info-example-row"><span class="info-example-label">Built by</span><span class="info-example-value">Danish Khan</span></div>
                    <div class="info-example-row"><span class="info-example-label">Year</span><span class="info-example-value">2025-2026</span></div>
                    <div class="info-example-row"><span class="info-example-label">Backend</span><span class="info-example-value">Python Flask</span></div>
                    <div class="info-example-row"><span class="info-example-label">AI Model</span><span class="info-example-value">LLaMA 3.3 70B</span></div>
                    <div class="info-example-row"><span class="info-example-label">Provider</span><span class="info-example-value">Groq API</span></div>
                    <div class="info-example-row"><span class="info-example-label">Editor</span><span class="info-example-value">Monaco Editor</span></div>
                </div>

                <p style="font-size:12px;color:var(--text-muted);margin-top:16px;">
                    C.I.D is a web-based AI platform that explains, debugs, optimises, and secures your code using Large Language Models.
                </p>
            </div>
        `;

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) overlay.remove();
        });

        document.body.appendChild(overlay);
    }

    // ── Apply All Settings on Load ────────────────────────────────────────────
    function applyAllSettings() {
        // Wait for Monaco to be ready
        const check = setInterval(function () {
            if (window.monacoEditorInstance) {
                clearInterval(check);
                applyEditorSettings();
            }
        }, 200);

        applyTheme();
        applyAccentColor();
        applyGlassIntensity();
        applyCompactMode();
        applyLogoAnimation();

         // Apply editor theme after Monaco is ready
        const themeCheck = setInterval(function () {
            if (window.monacoEditorInstance) {
                clearInterval(themeCheck);
                applyEditorTheme();
            }
        }, 200);

        // Apply default language and mode
        setTimeout(function () {
            const langSelect = document.getElementById('languageSelect');
            if (langSelect) langSelect.value = window.cidSettings.defaultLanguage;

            const tabs = document.querySelectorAll('.mode-tab');
            tabs.forEach(function (t) {
                t.classList.remove('active');
                if (t.getAttribute('data-mode') === window.cidSettings.defaultMode) {
                    t.classList.add('active');
                }
            });
        }, 500);
    }

})();