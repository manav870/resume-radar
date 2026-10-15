// ============================================
// Resume Radar — Settings Panel (API Key & LLM Manager)
//
// Shared across all pages. Injects settings gear
// into navbar, renders modal, saves to localStorage.
// All keys are strictly private to this browser session.
// ============================================

(function () {
    'use strict';

    const STORAGE_KEYS = {
        gemini: 'rr_api_key_gemini',
        openai: 'rr_api_key_openai',
        claude: 'rr_api_key_claude',
        provider: 'rr_llm_preferred_provider'
    };

    // ── Public API: window.RR_Settings ──
    window.RR_Settings = {
        getGeminiKey: () => (localStorage.getItem(STORAGE_KEYS.gemini) || '').trim(),
        getOpenAIKey: () => (localStorage.getItem(STORAGE_KEYS.openai) || '').trim(),
        getClaudeKey: () => (localStorage.getItem(STORAGE_KEYS.claude) || '').trim(),
        getPreferredProvider: () => localStorage.getItem(STORAGE_KEYS.provider) || 'auto',

        /**
         * Returns { apiKey, provider } based on user preference and entered keys.
         */
        getActiveConfig: () => {
            const preferred = localStorage.getItem(STORAGE_KEYS.provider) || 'auto';
            const gemini = (localStorage.getItem(STORAGE_KEYS.gemini) || '').trim();
            const openai = (localStorage.getItem(STORAGE_KEYS.openai) || '').trim();
            const claude = (localStorage.getItem(STORAGE_KEYS.claude) || '').trim();

            if (preferred === 'gemini' && gemini) return { provider: 'gemini', apiKey: gemini };
            if (preferred === 'openai' && openai) return { provider: 'openai', apiKey: openai };
            if (preferred === 'claude' && claude) return { provider: 'claude', apiKey: claude };

            // Auto-detect priority: Gemini -> OpenAI -> Claude
            if (gemini) return { provider: 'gemini', apiKey: gemini };
            if (openai) return { provider: 'openai', apiKey: openai };
            if (claude) return { provider: 'claude', apiKey: claude };

            // Return preferred or fallback even if no key entered (server may have fallback or user prompted)
            return { provider: preferred !== 'auto' ? preferred : 'gemini', apiKey: '' };
        },

        getActiveApiKey: () => {
            return window.RR_Settings.getActiveConfig().apiKey;
        },

        getActiveProvider: () => {
            return window.RR_Settings.getActiveConfig().provider;
        },

        hasAnyKey: () => {
            return !!(localStorage.getItem(STORAGE_KEYS.gemini)
                || localStorage.getItem(STORAGE_KEYS.openai)
                || localStorage.getItem(STORAGE_KEYS.claude));
        },

        open: () => openSettingsPanel(),
        close: () => closeSettingsPanel()
    };

    // ── Inject Settings Gear into Navbar ──
    function injectSettingsButton() {
        if (document.getElementById('settingsToggleBtn')) return;

        const navLinks = document.querySelector('.nav-links');
        if (!navLinks) return;

        const btn = document.createElement('button');
        btn.className = 'nav-settings-btn';
        btn.type = 'button';
        btn.id = 'settingsToggleBtn';
        btn.title = 'API Settings (Gemini / GPT / Claude)';
        btn.innerHTML = `
            <i class="fa-solid fa-gear"></i>
            <span class="settings-dot"></span>
        `;

        if (window.RR_Settings.hasAnyKey()) {
            btn.classList.add('has-key');
        }

        const themeBtn = document.getElementById('theme-toggle');
        if (themeBtn) {
            navLinks.insertBefore(btn, themeBtn);
        } else {
            navLinks.appendChild(btn);
        }

        btn.addEventListener('click', openSettingsPanel);
    }

    // ── Build Settings Modal HTML ──
    function buildSettingsModal() {
        if (document.getElementById('settingsOverlay')) return;

        const overlay = document.createElement('div');
        overlay.className = 'settings-overlay';
        overlay.id = 'settingsOverlay';

        const geminiVal = window.RR_Settings.getGeminiKey();
        const openaiVal = window.RR_Settings.getOpenAIKey();
        const claudeVal = window.RR_Settings.getClaudeKey();
        const currentProvider = window.RR_Settings.getPreferredProvider();

        overlay.innerHTML = `
            <div class="settings-panel">
                <div class="settings-header">
                    <h2><i class="fa-solid fa-gear"></i> API Settings</h2>
                    <button class="settings-close-btn" id="settingsCloseBtn" type="button" title="Close">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div class="settings-body">
                    <div class="settings-section-title">
                        <i class="fa-solid fa-brain"></i> Active LLM Provider
                    </div>
                    <select class="settings-provider-select" id="settingsActiveProvider">
                        <option value="auto" ${currentProvider === 'auto' ? 'selected' : ''}>Auto-Detect (Uses configured API key)</option>
                        <option value="gemini" ${currentProvider === 'gemini' ? 'selected' : ''}>Google Gemini (Gemini 2.0 / Flash)</option>
                        <option value="openai" ${currentProvider === 'openai' ? 'selected' : ''}>OpenAI (GPT-4o / GPT-4o-mini)</option>
                        <option value="claude" ${currentProvider === 'claude' ? 'selected' : ''}>Anthropic Claude (Claude 3.5 Sonnet / Haiku)</option>
                    </select>

                    <div class="settings-section-title">
                        <i class="fa-solid fa-key"></i> Your LLM API Keys
                    </div>

                    <!-- Gemini -->
                    <div class="settings-api-group">
                        <label class="settings-api-label" for="settingsGeminiKey">
                            <span class="provider-badge gemini">✦ Gemini</span>
                            Google Gemini API Key
                        </label>
                        <div class="settings-api-input-wrap">
                            <input type="password" 
                                   class="settings-api-input ${geminiVal ? 'has-value' : ''}" 
                                   id="settingsGeminiKey" 
                                   placeholder="AIza..." 
                                   value="${escapeAttr(geminiVal)}"
                                   autocomplete="off" spellcheck="false">
                            <button class="settings-toggle-vis" type="button" data-target="settingsGeminiKey" title="Toggle visibility">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                        </div>
                        <div class="settings-api-hint">
                            Get free API key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a>
                        </div>
                        <div class="settings-status-row ${geminiVal ? 'configured' : 'not-configured'}" id="settingsGeminiStatus">
                            <i class="fa-solid ${geminiVal ? 'fa-circle-check' : 'fa-circle-minus'}"></i>
                            ${geminiVal ? 'Configured' : 'Not configured'}
                        </div>
                    </div>

                    <!-- OpenAI -->
                    <div class="settings-api-group">
                        <label class="settings-api-label" for="settingsOpenAIKey">
                            <span class="provider-badge openai">◆ GPT</span>
                            OpenAI API Key
                        </label>
                        <div class="settings-api-input-wrap">
                            <input type="password" 
                                   class="settings-api-input ${openaiVal ? 'has-value' : ''}" 
                                   id="settingsOpenAIKey" 
                                   placeholder="sk-proj-..." 
                                   value="${escapeAttr(openaiVal)}"
                                   autocomplete="off" spellcheck="false">
                            <button class="settings-toggle-vis" type="button" data-target="settingsOpenAIKey" title="Toggle visibility">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                        </div>
                        <div class="settings-api-hint">
                            Get key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">OpenAI Platform</a>
                        </div>
                        <div class="settings-status-row ${openaiVal ? 'configured' : 'not-configured'}" id="settingsOpenAIStatus">
                            <i class="fa-solid ${openaiVal ? 'fa-circle-check' : 'fa-circle-minus'}"></i>
                            ${openaiVal ? 'Configured' : 'Not configured'}
                        </div>
                    </div>

                    <!-- Claude -->
                    <div class="settings-api-group">
                        <label class="settings-api-label" for="settingsClaudeKey">
                            <span class="provider-badge claude">◈ Claude</span>
                            Anthropic Claude API Key
                        </label>
                        <div class="settings-api-input-wrap">
                            <input type="password" 
                                   class="settings-api-input ${claudeVal ? 'has-value' : ''}" 
                                   id="settingsClaudeKey" 
                                   placeholder="sk-ant-..." 
                                   value="${escapeAttr(claudeVal)}"
                                   autocomplete="off" spellcheck="false">
                            <button class="settings-toggle-vis" type="button" data-target="settingsClaudeKey" title="Toggle visibility">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                        </div>
                        <div class="settings-api-hint">
                            Get key from <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">Anthropic Console</a>
                        </div>
                        <div class="settings-status-row ${claudeVal ? 'configured' : 'not-configured'}" id="settingsClaudeStatus">
                            <i class="fa-solid ${claudeVal ? 'fa-circle-check' : 'fa-circle-minus'}"></i>
                            ${claudeVal ? 'Configured' : 'Not configured'}
                        </div>
                    </div>
                </div>

                <div class="settings-footer">
                    <span class="settings-info">
                        <i class="fa-solid fa-shield-halved" style="color: var(--accent);"></i>
                        Saved in this browser only &mdash; never sent to Git
                    </span>
                    <div style="display: flex; gap: 8px;">
                        <button class="settings-clear-btn" id="settingsClearBtn" type="button">
                            <i class="fa-solid fa-trash-can"></i> Clear All
                        </button>
                        <button class="settings-save-btn" id="settingsSaveBtn" type="button">
                            <i class="fa-solid fa-check"></i> Save
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        attachSettingsListeners(overlay);
    }

    function escapeAttr(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // ── Event Listeners ──
    function attachSettingsListeners(overlay) {
        overlay.querySelector('#settingsCloseBtn').addEventListener('click', closeSettingsPanel);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeSettingsPanel();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('active')) {
                closeSettingsPanel();
            }
        });

        // Visibility toggles
        overlay.querySelectorAll('.settings-toggle-vis').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-target');
                const input = document.getElementById(targetId);
                if (!input) return;

                const icon = btn.querySelector('i');
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fa-solid fa-eye-slash';
                } else {
                    input.type = 'password';
                    icon.className = 'fa-solid fa-eye';
                }
            });
        });

        // Auto highlight input on type
        overlay.querySelectorAll('.settings-api-input').forEach(input => {
            input.addEventListener('input', () => {
                input.classList.toggle('has-value', !!input.value.trim());
            });
        });

        // Save button
        overlay.querySelector('#settingsSaveBtn').addEventListener('click', () => {
            saveSettingsFromModal();
            showSettingsToast('API settings saved securely in your browser!');
            closeSettingsPanel();
        });

        // Clear all button
        overlay.querySelector('#settingsClearBtn').addEventListener('click', () => {
            Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));

            const geminiInp = document.getElementById('settingsGeminiKey');
            const openaiInp = document.getElementById('settingsOpenAIKey');
            const claudeInp = document.getElementById('settingsClaudeKey');
            const providerSel = document.getElementById('settingsActiveProvider');

            if (geminiInp) { geminiInp.value = ''; geminiInp.classList.remove('has-value'); }
            if (openaiInp) { openaiInp.value = ''; openaiInp.classList.remove('has-value'); }
            if (claudeInp) { claudeInp.value = ''; claudeInp.classList.remove('has-value'); }
            if (providerSel) { providerSel.value = 'auto'; }

            updateStatusIndicators();
            updateNavDot();
            showSettingsToast('All saved API keys cleared.');
        });
    }

    function saveSettingsFromModal() {
        const geminiKey = (document.getElementById('settingsGeminiKey')?.value || '').trim();
        const openaiKey = (document.getElementById('settingsOpenAIKey')?.value || '').trim();
        const claudeKey = (document.getElementById('settingsClaudeKey')?.value || '').trim();
        const provider = document.getElementById('settingsActiveProvider')?.value || 'auto';

        if (geminiKey) localStorage.setItem(STORAGE_KEYS.gemini, geminiKey);
        else localStorage.removeItem(STORAGE_KEYS.gemini);

        if (openaiKey) localStorage.setItem(STORAGE_KEYS.openai, openaiKey);
        else localStorage.removeItem(STORAGE_KEYS.openai);

        if (claudeKey) localStorage.setItem(STORAGE_KEYS.claude, claudeKey);
        else localStorage.removeItem(STORAGE_KEYS.claude);

        localStorage.setItem(STORAGE_KEYS.provider, provider);

        updateStatusIndicators();
        updateNavDot();
    }

    function updateStatusIndicators() {
        const pairs = [
            { key: STORAGE_KEYS.gemini, statusId: 'settingsGeminiStatus' },
            { key: STORAGE_KEYS.openai, statusId: 'settingsOpenAIStatus' },
            { key: STORAGE_KEYS.claude, statusId: 'settingsClaudeStatus' },
        ];

        pairs.forEach(({ key, statusId }) => {
            const el = document.getElementById(statusId);
            if (!el) return;
            const hasVal = !!localStorage.getItem(key);
            el.className = `settings-status-row ${hasVal ? 'configured' : 'not-configured'}`;
            el.innerHTML = `
                <i class="fa-solid ${hasVal ? 'fa-circle-check' : 'fa-circle-minus'}"></i>
                ${hasVal ? 'Configured' : 'Not configured'}
            `;
        });
    }

    function updateNavDot() {
        const btn = document.getElementById('settingsToggleBtn');
        if (!btn) return;
        if (window.RR_Settings.hasAnyKey()) {
            btn.classList.add('has-key');
        } else {
            btn.classList.remove('has-key');
        }
    }

    function openSettingsPanel() {
        let overlay = document.getElementById('settingsOverlay');
        if (!overlay) {
            buildSettingsModal();
            overlay = document.getElementById('settingsOverlay');
        } else {
            const geminiInput = document.getElementById('settingsGeminiKey');
            const openaiInput = document.getElementById('settingsOpenAIKey');
            const claudeInput = document.getElementById('settingsClaudeKey');
            const providerSelect = document.getElementById('settingsActiveProvider');

            if (geminiInput) {
                geminiInput.value = window.RR_Settings.getGeminiKey();
                geminiInput.classList.toggle('has-value', !!geminiInput.value);
            }
            if (openaiInput) {
                openaiInput.value = window.RR_Settings.getOpenAIKey();
                openaiInput.classList.toggle('has-value', !!openaiInput.value);
            }
            if (claudeInput) {
                claudeInput.value = window.RR_Settings.getClaudeKey();
                claudeInput.classList.toggle('has-value', !!claudeInput.value);
            }
            if (providerSelect) {
                providerSelect.value = window.RR_Settings.getPreferredProvider();
            }
            updateStatusIndicators();
        }
        overlay.classList.add('active');
    }

    function closeSettingsPanel() {
        const overlay = document.getElementById('settingsOverlay');
        if (overlay) overlay.classList.remove('active');
    }

    function showSettingsToast(msg) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:var(--bg-card);border:1px solid var(--border);padding:14px 22px;border-radius:var(--radius-xs);box-shadow:var(--shadow-lg);display:flex;align-items:center;gap:10px;font-size:0.9rem;z-index:10001;animation:settingsPanelIn 0.25s ease;color:var(--text-dark);';
        toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--success);"></i> <span>${msg}</span>`;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(16px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    // ── Initialize on DOM Ready ──
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectSettingsButton);
    } else {
        injectSettingsButton();
    }
})();
