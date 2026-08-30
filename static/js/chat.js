// static/js/chat.js
// ─────────────────────────────────────────────────────────────────────────────
// C.I.D — Chat Follow-up Interface (multi-turn)
// ─────────────────────────────────────────────────────────────────────────────

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {

        const toggleBtn = document.getElementById('chatToggleBtn');
        const section   = document.getElementById('chatSection');
        const closeBtn  = document.getElementById('chatClose');
        const input     = document.getElementById('chatInput');
        const sendBtn   = document.getElementById('chatSend');
        const messages  = document.getElementById('chatMessages');

        if (!toggleBtn || !section) return;

        // ── Conversation Memory ─────────────────────────────────────────────
        // The last 10 question/answer pairs of the current conversation.
        // Reset automatically when the editor's code changes (new session,
        // loaded snippet, pasted new code) so the model never mixes up
        // two different programs.
        const MAX_HISTORY_TURNS = 10;
        let chatHistory = [];      // [{ question: "...", answer: "..." }, ...]
        let historyCodeKey = null; // the code text this history belongs to

        function currentHistoryFor(code) {
            if (code !== historyCodeKey) {
                chatHistory = [];
                historyCodeKey = code;
            }
            return chatHistory;
        }

        function rememberTurn(question, answer) {
            chatHistory.push({ question: question, answer: answer });
            if (chatHistory.length > MAX_HISTORY_TURNS) {
                chatHistory = chatHistory.slice(-MAX_HISTORY_TURNS);
            }
        }

        // ── Toggle Chat ───────────────────────────────────────────────────────
        toggleBtn.addEventListener('click', function () {
            section.style.display = section.style.display === 'none' ? 'block' : 'none';
            if (section.style.display === 'block') {
                setTimeout(function () { input.focus(); }, 100);
            }
        });

        // ── Close Chat ────────────────────────────────────────────────────────
        closeBtn.addEventListener('click', function () {
            section.style.display = 'none';
        });

        // ── Auto Resize Textarea ──────────────────────────────────────────────
        input.addEventListener('input', function () {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 100) + 'px';
        });

        // ── Send on Enter (Shift+Enter for newline) ──────────────────────────
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // ── Send Button ───────────────────────────────────────────────────────
        sendBtn.addEventListener('click', sendMessage);

        // ── Send Message ──────────────────────────────────────────────────────
        function sendMessage() {
            const question = input.value.trim();
            if (!question) return;

            // Get current code from editor
            if (!window.monacoEditorInstance) return;
            const code = window.monacoEditorInstance.getValue().trim();

            if (!code || window.isPlaceholder) {
                addMessage('Please paste some code first, then ask a question about it.', 'ai');
                return;
            }

            const language = document.getElementById('languageSelect').value;
            const history  = currentHistoryFor(code);

            // Add user message
            addMessage(question, 'user');
            input.value = '';
            input.style.height = 'auto';

            // Show thinking indicator
            const thinking = addMessage('C.I.D is thinking...', 'thinking');

            // Disable send button
            sendBtn.disabled = true;

            // Call chat endpoint (with conversation history)
            fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code:     code,
                    question: question,
                    language: language,
                    history:  history
                })
            })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                thinking.remove();
                sendBtn.disabled = false;

                if (data.success && data.answer) {
                    addMessage(data.answer, 'ai');
                    rememberTurn(question, data.answer);
                } else {
                    addMessage('Sorry, I could not answer that. ' + (data.error || ''), 'ai');
                }
            })
            .catch(function (err) {
                thinking.remove();
                sendBtn.disabled = false;
                addMessage('Connection error. Please try again.', 'ai');
                console.error('Chat error:', err);
            });
        }

        // ── Add Message ───────────────────────────────────────────────────────
        function addMessage(text, type) {
            const msg = document.createElement('div');
            msg.className = 'chat-message ' + type;
            msg.textContent = text;
            messages.appendChild(msg);
            messages.scrollTop = messages.scrollHeight;
            return msg;
        }
    });
})();