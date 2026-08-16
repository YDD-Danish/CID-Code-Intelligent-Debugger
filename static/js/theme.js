// static/js/theme.js
// ─────────────────────────────────────────────────────────────────────────────
// C.I.D — Dark/Light Theme Toggle
// ─────────────────────────────────────────────────────────────────────────────

(function () {
    'use strict';

    // Check saved preference or default to dark
    const savedTheme = localStorage.getItem('cid-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Wait for DOM to load before attaching button listener
    document.addEventListener('DOMContentLoaded', function () {
        const toggleBtn = document.getElementById('themeToggle');

        if (toggleBtn) {
            toggleBtn.addEventListener('click', function () {
                const current = document.documentElement.getAttribute('data-theme');
                const next = current === 'dark' ? 'light' : 'dark';

                document.documentElement.setAttribute('data-theme', next);
                localStorage.setItem('cid-theme', next);

                // Update Monaco Editor theme if editor exists
                if (window.monacoEditorInstance) {
                    const editorTheme = next === 'dark' ? 'cid-dark' : 'cid-light';
                    monaco.editor.setTheme(editorTheme);

                    // Force cursor colour update after theme change
                    setTimeout(function () {
                        updateCursorColor(next);
                    }, 100);

                    setTimeout(function () {
                        updateCursorColor(next);
                    }, 500);
                }
            });
        }
    });

    function updateCursorColor(theme) {
        const cursors = document.querySelectorAll('.monaco-editor .cursor');
        cursors.forEach(function (cursor) {
            if (theme === 'light') {
                cursor.style.background = '#1A1A1A';
                cursor.style.color = '#1A1A1A';
                cursor.style.borderColor = '#1A1A1A';
            } else {
                cursor.style.background = '';
                cursor.style.color = '';
                cursor.style.borderColor = '';
            }
        });
    }
})();