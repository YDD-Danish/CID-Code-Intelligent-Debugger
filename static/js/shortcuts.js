// static/js/shortcuts.js
// ─────────────────────────────────────────────────────────────────────────────
// C.I.D — Keyboard Shortcuts Manager
// ─────────────────────────────────────────────────────────────────────────────

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {

        document.addEventListener('keydown', function (e) {

            const isCtrl = e.ctrlKey || e.metaKey;

            // ── Ctrl + Enter → Analyse Code ──────────────────────────────────
            if (isCtrl && e.key === 'Enter') {
                e.preventDefault();
                const btn = document.getElementById('analyseBtn');
                if (btn && !btn.disabled) {
                    btn.click();
                    showQuickToast('⚡ Analysing...');
                }
                return;
            }

            // ── Ctrl + R → Run Code ──────────────────────────────────────────
            if (isCtrl && (e.key === 'r' || e.key === 'R')) {
                e.preventDefault();
                const btn = document.getElementById('runCodeBtn');
                if (btn && !btn.disabled) {
                    btn.click();
                    showQuickToast('▶ Running code...');
                }
                return;
            }

            // ── Ctrl + K → Toggle Theme ──────────────────────────────────────
            if (isCtrl && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault();
                const btn = document.getElementById('themeToggle');
                if (btn) {
                    btn.click();
                    const theme = document.documentElement.getAttribute('data-theme');
                    showQuickToast(theme === 'dark' ? '🌙 Dark mode' : '☀️ Light mode');
                }
                return;
            }

            // ── Ctrl + , → Open Settings ─────────────────────────────────────
            if (isCtrl && e.key === ',') {
                e.preventDefault();
                const drawer = document.getElementById('settingsDrawer');
                if (drawer && drawer.classList.contains('active')) {
                    document.getElementById('settingsClose').click();
                } else {
                    document.getElementById('settingsBtn').click();
                }
                return;
            }

            // ── Ctrl + H → Open History ──────────────────────────────────────
            if (isCtrl && (e.key === 'h' || e.key === 'H')) {
                e.preventDefault();
                const drawer = document.getElementById('historyDrawer');
                if (drawer && drawer.classList.contains('active')) {
                    document.getElementById('historyClose').click();
                } else {
                    document.getElementById('historyBtn').click();
                }
                return;
            }

            // ── Ctrl + 1/2/3/4 → Switch Modes ────────────────────────────────
            if (isCtrl && ['1', '2', '3', '4'].includes(e.key)) {
                e.preventDefault();
                const modeMap = {
                    '1': 'explain',
                    '2': 'debug',
                    '3': 'optimize',
                    '4': 'security'
                };
                const targetMode = modeMap[e.key];
                const tab = document.querySelector('.mode-tab[data-mode="' + targetMode + '"]');
                if (tab) {
                    tab.click();
                    showQuickToast('Mode: ' + targetMode.charAt(0).toUpperCase() + targetMode.slice(1));
                }
                return;
            }

            // ── Ctrl + / → Show Shortcuts Help ───────────────────────────────
            if (isCtrl && e.key === '/') {
                e.preventDefault();
                if (window.showShortcutsHelp) {
                    window.showShortcutsHelp();
                }
                return;
            }

            // ── Escape → Close any open popup ───────────────────────────────
            if (e.key === 'Escape') {
                // Close any info popup
                const popups = document.querySelectorAll('.info-popup-overlay');
                popups.forEach(function (p) { p.remove(); });

                // Close run output
                const runOutput = document.getElementById('runOutputPanel');
                if (runOutput && runOutput.style.display !== 'none') {
                    runOutput.style.display = 'none';
                }

                // Close chat
                const chat = document.getElementById('chatSection');
                if (chat && chat.style.display !== 'none') {
                    chat.style.display = 'none';
                }
            }
        });
    });

    // ── Quick Toast for Shortcut Feedback ────────────────────────────────────
    function showQuickToast(message) {
        const existing = document.getElementById('quickShortcutToast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'quickShortcutToast';
        toast.className = 'quick-shortcut-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(function () {
            toast.classList.add('fade-out');
        }, 800);

        setTimeout(function () {
            if (toast.parentNode) toast.remove();
        }, 1200);
    }

    // Expose shortcuts popup globally so settings can trigger it too
    window.showShortcutsHelp = function () {
        const existing = document.getElementById('shortcutsPopup');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'info-popup-overlay';
        overlay.id = 'shortcutsPopup';

        overlay.innerHTML = `
            <div class="info-popup">
                <div class="info-popup-header">
                    <span class="info-popup-title">⌨️ Keyboard Shortcuts</span>
                    <button class="info-popup-close" onclick="document.getElementById('shortcutsPopup').remove()">✕</button>
                </div>

                <div style="display:flex;flex-direction:column;gap:6px;">
                    <div class="info-row">
                        <span class="info-badge good">Ctrl + Enter</span>
                        <div class="info-text">
                            <div class="info-text-title">Analyse Code</div>
                        </div>
                    </div>
                    <div class="info-row">
                        <span class="info-badge good">Ctrl + R</span>
                        <div class="info-text">
                            <div class="info-text-title">Run Code</div>
                        </div>
                    </div>
                    <div class="info-row">
                        <span class="info-badge good">Ctrl + K</span>
                        <div class="info-text">
                            <div class="info-text-title">Toggle Dark/Light Theme</div>
                        </div>
                    </div>
                    <div class="info-row">
                        <span class="info-badge good">Ctrl + ,</span>
                        <div class="info-text">
                            <div class="info-text-title">Open Settings</div>
                        </div>
                    </div>
                    <div class="info-row">
                        <span class="info-badge good">Ctrl + H</span>
                        <div class="info-text">
                            <div class="info-text-title">Open History</div>
                        </div>
                    </div>
                    <div class="info-row">
                        <span class="info-badge good">Ctrl + 1</span>
                        <div class="info-text">
                            <div class="info-text-title">Switch to Explain Mode</div>
                        </div>
                    </div>
                    <div class="info-row">
                        <span class="info-badge good">Ctrl + 2</span>
                        <div class="info-text">
                            <div class="info-text-title">Switch to Debug Mode</div>
                        </div>
                    </div>
                    <div class="info-row">
                        <span class="info-badge good">Ctrl + 3</span>
                        <div class="info-text">
                            <div class="info-text-title">Switch to Optimize Mode</div>
                        </div>
                    </div>
                    <div class="info-row">
                        <span class="info-badge good">Ctrl + 4</span>
                        <div class="info-text">
                            <div class="info-text-title">Switch to Security Mode</div>
                        </div>
                    </div>
                    <div class="info-row">
                        <span class="info-badge good">Ctrl + /</span>
                        <div class="info-text">
                            <div class="info-text-title">Show This Help</div>
                        </div>
                    </div>
                    <div class="info-row">
                        <span class="info-badge good">Escape</span>
                        <div class="info-text">
                            <div class="info-text-title">Close Any Popup / Panel</div>
                        </div>
                    </div>
                </div>

                <p style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:16px;">
                    On Mac use ⌘ Cmd instead of Ctrl
                </p>
            </div>
        `;

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) overlay.remove();
        });

        document.body.appendChild(overlay);
    };
})();