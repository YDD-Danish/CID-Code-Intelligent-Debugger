// static/js/history.js
// ─────────────────────────────────────────────────────────────────────────────
// C.I.D — History Drawer Manager
// ─────────────────────────────────────────────────────────────────────────────

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {

        const btn          = document.getElementById('historyBtn');
        const drawer       = document.getElementById('historyDrawer');
        const overlay      = document.getElementById('historyOverlay');
        const closeBtn     = document.getElementById('historyClose');
        const refreshBtn   = document.getElementById('historyRefresh');
        const clearBtn     = document.getElementById('historyClearAll');
        const filterMode   = document.getElementById('historyFilterMode');
        const body         = document.getElementById('historyBody');

        if (!btn || !drawer) return;

        // ── Open ──────────────────────────────────────────────────────────────
        btn.addEventListener('click', function () {
            drawer.classList.add('active');
            overlay.classList.add('active');
            loadHistory();
        });

        // ── Close ─────────────────────────────────────────────────────────────
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

        // ── Refresh ───────────────────────────────────────────────────────────
        refreshBtn.addEventListener('click', loadHistory);
        filterMode.addEventListener('change', loadHistory);

        // ── Clear All ─────────────────────────────────────────────────────────
        clearBtn.addEventListener('click', function () {
            if (!confirm('Delete all history? This cannot be undone.')) return;

            fetch('/api/history', { method: 'DELETE' })
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (data.success) {
                        loadHistory();
                        if (window.showToastGlobal) {
                            window.showToastGlobal('History cleared', 'success');
                        }
                    }
                });
        });

        // ── Load History ──────────────────────────────────────────────────────
        function loadHistory() {
            const modeFilter = filterMode.value;
            let url = '/api/history?per_page=50';
            if (modeFilter) url += '&mode=' + modeFilter;

            body.innerHTML = '<div class="history-empty"><div class="history-empty-icon">⏳</div><div class="history-empty-text">Loading...</div></div>';

            fetch(url)
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (data.success && data.sessions.length > 0) {
                        renderHistory(data.sessions);
                    } else {
                        body.innerHTML = `
                            <div class="history-empty">
                                <div class="history-empty-icon">📭</div>
                                <div class="history-empty-text">No history yet</div>
                                <div class="history-empty-sub">Your analyses will appear here</div>
                            </div>`;
                    }
                })
                .catch(function () {
                    body.innerHTML = `
                        <div class="history-empty">
                            <div class="history-empty-icon">⚠️</div>
                            <div class="history-empty-text">Failed to load</div>
                            <div class="history-empty-sub">Please try again</div>
                        </div>`;
                });
        }

        // ── Render History ────────────────────────────────────────────────────
        function renderHistory(sessions) {
            let html = '';

            sessions.forEach(function (s) {
                const codePreview = (s.code_input || '').split('\n')[0].substring(0, 60);
                const date        = new Date(s.created_at);
                const timeStr     = date.toLocaleString('en-US', {
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });

                html += `
                    <div class="history-item" data-id="${s.id}">
                        <div class="history-item-header">
                            <span class="history-mode-badge ${s.mode}">${s.mode}</span>
                            <span class="history-lang-tag">${s.language}</span>
                        </div>
                        <div class="history-item-preview">${escapeHtml(codePreview)}</div>
                        <div class="history-item-footer">
                            <span class="history-item-time">${timeStr}</span>
                            <button class="history-item-delete" data-id="${s.id}">🗑</button>
                        </div>
                    </div>`;
            });

            body.innerHTML = html;

            // Attach click handlers
            document.querySelectorAll('.history-item').forEach(function (item) {
                item.addEventListener('click', function (e) {
                    if (e.target.classList.contains('history-item-delete')) return;
                    const id = item.getAttribute('data-id');
                    loadSession(id);
                });
            });

            // Attach delete handlers
            document.querySelectorAll('.history-item-delete').forEach(function (btn) {
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    const id = btn.getAttribute('data-id');
                    deleteSession(id);
                });
            });
        }

        // ── Load One Session ──────────────────────────────────────────────────
        function loadSession(id) {
            fetch('/api/history/' + id)
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (data.success && data.session) {
                        const s = data.session;

                        // Set code in editor
                        if (window.monacoEditorInstance) {
                            window.monacoEditorInstance.setValue(s.code_input);
                            window.isPlaceholder = false;
                        }

                        // Set language
                        const langSelect = document.getElementById('languageSelect');
                        if (langSelect) langSelect.value = s.language;

                        // Set mode tab
                        const tabs = document.querySelectorAll('.mode-tab');
                        tabs.forEach(function (t) {
                            t.classList.remove('active');
                            if (t.getAttribute('data-mode') === s.mode) {
                                t.classList.add('active');
                            }
                        });

                        // Render the saved result
                        if (window.renderSavedResult && s.result_json) {
                            try {
                                const result = JSON.parse(s.result_json);
                                window.renderSavedResult({
                                    result:   result,
                                    mode:     s.mode,
                                    language: s.language,
                                    provider: s.llm_provider_used,
                                    response_time: s.response_time_seconds,
                                });
                            } catch (e) {
                                console.error('Failed to parse result:', e);
                            }
                        }

                        close();

                        if (window.showToastGlobal) {
                            window.showToastGlobal('Session loaded', 'success');
                        }
                    }
                });
        }

        // ── Delete Session ────────────────────────────────────────────────────
        function deleteSession(id) {
            fetch('/api/history/' + id, { method: 'DELETE' })
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (data.success) {
                        loadHistory();
                        if (window.showToastGlobal) {
                            window.showToastGlobal('Session deleted', 'success');
                        }
                    }
                });
        }

        // ── Utility ───────────────────────────────────────────────────────────
        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    });
})();