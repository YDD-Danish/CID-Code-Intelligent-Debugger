// static/js/snippets.js
// ─────────────────────────────────────────────────────────────────────────────
// C.I.D — Snippets Library Manager
// ─────────────────────────────────────────────────────────────────────────────

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {

        const btn       = document.getElementById('snippetsBtn');
        const drawer    = document.getElementById('snippetsDrawer');
        const overlay   = document.getElementById('snippetsOverlay');
        const closeBtn  = document.getElementById('snippetsClose');
        const searchIn  = document.getElementById('snippetsSearch');
        const catFilter = document.getElementById('snippetsCategoryFilter');
        const body      = document.getElementById('snippetsBody');
        const saveCurr  = document.getElementById('saveCurrentBtn');

        const modal     = document.getElementById('saveSnippetOverlay');
        const modalClose= document.getElementById('saveSnippetClose');
        const modalCancel = document.getElementById('saveCancelBtn');
        const modalConfirm = document.getElementById('saveConfirmBtn');
        const nameInput = document.getElementById('snippetNameInput');
        const catInput  = document.getElementById('snippetCategoryInput');
        const descInput = document.getElementById('snippetDescriptionInput');

        if (!btn || !drawer) return;

        // ── Open Drawer ───────────────────────────────────────────────────────
        btn.addEventListener('click', function () {
            drawer.classList.add('active');
            overlay.classList.add('active');
            loadSnippets();
            loadCategories();
        });

        // ── Close Drawer ──────────────────────────────────────────────────────
        function closeDrawer() {
            drawer.classList.remove('active');
            overlay.classList.remove('active');
        }

        closeBtn.addEventListener('click', closeDrawer);
        overlay.addEventListener('click', closeDrawer);

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && drawer.classList.contains('active')) {
                closeDrawer();
            }
        });

        // ── Search + Filter ───────────────────────────────────────────────────
        let searchTimeout;
        searchIn.addEventListener('input', function () {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(loadSnippets, 300);
        });

        catFilter.addEventListener('change', loadSnippets);

        // ── Load Snippets ─────────────────────────────────────────────────────
        function loadSnippets() {
            const search = searchIn.value.trim();
            const cat = catFilter.value;
            let url = '/api/snippets';
            const params = [];
            if (search) params.push('search=' + encodeURIComponent(search));
            if (cat && cat !== 'all') params.push('category=' + encodeURIComponent(cat));
            if (params.length) url += '?' + params.join('&');

            body.innerHTML = '<div class="snippets-empty"><div class="snippets-empty-icon">⏳</div><div class="snippets-empty-text">Loading...</div></div>';

            fetch(url)
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (data.success && data.snippets.length > 0) {
                        renderSnippets(data.snippets);
                    } else {
                        body.innerHTML = `
                            <div class="snippets-empty">
                                <div class="snippets-empty-icon">📭</div>
                                <div class="snippets-empty-text">${search ? 'No matches found' : 'No snippets yet'}</div>
                                <div class="snippets-empty-sub">${search ? 'Try a different search' : 'Save your favorite code for quick access'}</div>
                            </div>`;
                    }
                });
        }

        // ── Load Categories ───────────────────────────────────────────────────
        function loadCategories() {
            fetch('/api/snippets/categories')
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (data.success) {
                        const current = catFilter.value;
                        catFilter.innerHTML = '<option value="all">All Categories</option>';
                        data.categories.forEach(function (c) {
                            const opt = document.createElement('option');
                            opt.value = c;
                            opt.textContent = c;
                            catFilter.appendChild(opt);
                        });
                        catFilter.value = current;
                    }
                });
        }

        // ── Render Snippets ───────────────────────────────────────────────────
        function renderSnippets(snippets) {
            let html = '';
            snippets.forEach(function (s) {
                const codePreview = (s.code || '').split('\n')[0].substring(0, 50);
                const date = new Date(s.updated_at);
                const timeStr = date.toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric'
                });

                html += `
                    <div class="snippet-item" data-id="${s.id}">
                        <div class="snippet-item-header">
                            <span class="snippet-name">${escapeHtml(s.name)}</span>
                            <span class="snippet-category-badge">${escapeHtml(s.category)}</span>
                        </div>
                        ${s.description ? `<div class="snippet-description">${escapeHtml(s.description)}</div>` : ''}
                        <div class="snippet-code-preview">${escapeHtml(codePreview)}</div>
                        <div class="snippet-footer">
                            <div>
                                <span class="snippet-language-tag">${s.language}</span>
                                <span class="snippet-time" style="margin-left:6px;">${timeStr}</span>
                            </div>
                            <button class="snippet-delete" data-id="${s.id}" title="Delete">🗑</button>
                        </div>
                    </div>`;
            });
            body.innerHTML = html;

            // Attach click handlers
            document.querySelectorAll('.snippet-item').forEach(function (item) {
                item.addEventListener('click', function (e) {
                    if (e.target.classList.contains('snippet-delete')) return;
                    loadSnippetIntoEditor(item.getAttribute('data-id'));
                });
            });

            document.querySelectorAll('.snippet-delete').forEach(function (btn) {
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    deleteSnippet(btn.getAttribute('data-id'));
                });
            });
        }

        // ── Load Snippet Into Editor ─────────────────────────────────────────
        function loadSnippetIntoEditor(id) {
            fetch('/api/snippets/' + id)
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (data.success && data.snippet) {
                        const s = data.snippet;
                        if (window.monacoEditorInstance) {
                            window.monacoEditorInstance.setValue(s.code);
                            window.isPlaceholder = false;
                        }
                        const langSelect = document.getElementById('languageSelect');
                        if (langSelect) langSelect.value = s.language;

                        closeDrawer();
                        if (window.showToastGlobal) {
                            window.showToastGlobal('Snippet loaded: ' + s.name, 'success');
                        }
                    }
                });
        }

        // ── Delete Snippet ────────────────────────────────────────────────────
        function deleteSnippet(id) {
            if (!confirm('Delete this snippet?')) return;

            fetch('/api/snippets/' + id, { method: 'DELETE' })
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (data.success) {
                        loadSnippets();
                        if (window.showToastGlobal) {
                            window.showToastGlobal('Snippet deleted', 'success');
                        }
                    }
                });
        }

        // ── Save Current Code Button ─────────────────────────────────────────
        saveCurr.addEventListener('click', function () {
            if (!window.monacoEditorInstance) return;
            const code = window.monacoEditorInstance.getValue().trim();
            if (!code || window.isPlaceholder) {
                if (window.showToastGlobal) {
                    window.showToastGlobal('No code to save', 'error');
                }
                return;
            }
            openSaveModal();
        });

        function openSaveModal() {
            modal.style.display = 'flex';
            nameInput.value = '';
            descInput.value = '';
            catInput.value = 'General';
            setTimeout(function () { nameInput.focus(); }, 100);
        }

        function closeSaveModal() {
            modal.style.display = 'none';
        }

        modalClose.addEventListener('click', closeSaveModal);
        modalCancel.addEventListener('click', closeSaveModal);

        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeSaveModal();
        });

        // ── Confirm Save ──────────────────────────────────────────────────────
        modalConfirm.addEventListener('click', function () {
            const name = nameInput.value.trim();
            if (!name) {
                alert('Please enter a name for the snippet');
                nameInput.focus();
                return;
            }

            if (!window.monacoEditorInstance) return;
            const code = window.monacoEditorInstance.getValue().trim();
            const language = document.getElementById('languageSelect').value;

            modalConfirm.disabled = true;
            modalConfirm.textContent = 'Saving...';

            fetch('/api/snippets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name:        name,
                    code:        code,
                    language:    language,
                    category:    catInput.value,
                    description: descInput.value.trim()
                })
            })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                modalConfirm.disabled = false;
                modalConfirm.textContent = 'Save Snippet';

                if (data.success) {
                    closeSaveModal();
                    if (window.showToastGlobal) {
                        window.showToastGlobal('Snippet saved: ' + name, 'success');
                    }
                    loadSnippets();
                    loadCategories();
                } else {
                    alert('Failed to save: ' + (data.error || 'Unknown error'));
                }
            })
            .catch(function () {
                modalConfirm.disabled = false;
                modalConfirm.textContent = 'Save Snippet';
                alert('Failed to save snippet');
            });
        });

        // ── Utility ───────────────────────────────────────────────────────────
        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    });
})();