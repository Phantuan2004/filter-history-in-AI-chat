/**
 * AI Chat TOC & Navigator - Chrome Extension (Manifest V3)
 * Senior Developer Standard Implementation
 * 
 * Features:
 * 1. 100% Non-intrusive Overlay UI: Rendered inside Shadow DOM (Open), zero CSS collision with host web.
 * 2. Does not touch or shrink host page layout (pure floating drawer overlay).
 * 3. Click-Outside to Dismiss: Clicking anywhere outside the sidebar (on the host page) auto-minimizes the drawer so reading is never obstructed.
 * 4. Multi-platform Adapters: ChatGPT (chatgpt.com, chat.openai.com) and Google Gemini (gemini.google.com).
 * 5. ScrollSpy: Automatically highlights the currently active prompt while reading/scrolling.
 * 6. Draggable Floating Trigger: Easily drag the launcher button vertically if it obstructs host page buttons.
 * 7. One-click Export TOC: Copy all prompts to clipboard formatted as Markdown list.
 * 8. Debounced MutationObserver: High performance, no lag even during long streaming responses.
 * 9. SPA Route Change Detection: Automatically refreshes TOC when switching chats without page reload.
 * 10. Smooth Scroll + Glowing Target Pulse: Accurately jumps to the message and highlights it.
 * 11. Realtime Filter/Search: Instant search through prompt history.
 */

(function () {
  'use strict';

  // Prevent duplicate injection
  if (window.__AI_CHAT_TOC_INITIALIZED__) return;
  window.__AI_CHAT_TOC_INITIALIZED__ = true;

  /* ==========================================================================
     1. ADAPTERS (Tách biệt logic bóc tách DOM của từng nền tảng)
     ========================================================================== */

  class BaseAdapter {
    constructor(name) {
      this.name = name;
    }
    match() {
      return false;
    }
    getUserPrompts() {
      return [];
    }
    extractText(element) {
      return (element.textContent || '').trim().replace(/\s+/g, ' ');
    }
    getObserveTarget() {
      return document.body;
    }
  }

  // --- Adapter cho ChatGPT (chatgpt.com / chat.openai.com) ---
  class ChatGPTAdapter extends BaseAdapter {
    constructor() {
      super('ChatGPT');
    }

    match() {
      const host = window.location.hostname;
      return host.includes('chatgpt.com') || host.includes('chat.openai.com');
    }

    getUserPrompts() {
      // 1. Selector tiêu chuẩn của ChatGPT
      let nodes = Array.from(document.querySelectorAll('[data-message-author-role="user"]'));

      // 2. Fallback: Thẻ article không chứa assistant role
      if (nodes.length === 0) {
        nodes = Array.from(document.querySelectorAll('article')).filter(article => {
          return !article.querySelector('[data-message-author-role="assistant"]');
        });
      }

      // 3. Fallback: Các container mang class user message
      if (nodes.length === 0) {
        nodes = Array.from(document.querySelectorAll('.font-user-message, div[class*="user-message"]'));
      }

      return nodes;
    }

    extractText(element) {
      const textNode = element.querySelector('.whitespace-pre-wrap') || element;
      const rawText = textNode.innerText || textNode.textContent || '';
      return rawText.trim().replace(/\s+/g, ' ');
    }

    getObserveTarget() {
      return document.querySelector('main') || document.body;
    }
  }

  // --- Adapter cho Google Gemini (gemini.google.com) ---
  class GeminiAdapter extends BaseAdapter {
    constructor() {
      super('Gemini');
    }

    match() {
      return window.location.hostname.includes('gemini.google.com');
    }

    getUserPrompts() {
      const selectors = [
        'user-query',
        '.user-query-container',
        '[data-test-id="user-query"]',
        'div.query-text',
        'div[class*="user-query"]',
        '.query-content',
        '.user-query-text'
      ];

      for (const sel of selectors) {
        const nodes = Array.from(document.querySelectorAll(sel));
        if (nodes.length > 0) {
          return nodes;
        }
      }

      const turns = Array.from(document.querySelectorAll('message-turn, .conversation-turn'));
      const found = [];
      turns.forEach(turn => {
        const queryEl = turn.querySelector('.query-text, user-query, [data-test-id*="user"]');
        if (queryEl) found.push(queryEl);
      });

      return found;
    }

    extractText(element) {
      const textContainer = element.querySelector('.query-text, .text-content') || element;
      const rawText = textContainer.innerText || textContainer.textContent || '';
      return rawText.trim().replace(/\s+/g, ' ');
    }

    getObserveTarget() {
      return document.querySelector('chat-window, main, .conversation-container') || document.body;
    }
  }

  /* ==========================================================================
     2. SHADOW DOM CSS (Được đóng gói 100%, không xung đột với host page)
     ========================================================================== */

  const SHADOW_STYLES = `
    :host {
      --ai-toc-primary: #3b82f6;
      --ai-toc-primary-hover: #2563eb;
      --ai-toc-primary-light: rgba(59, 130, 246, 0.12);
      --ai-toc-bg: rgba(255, 255, 255, 0.94);
      --ai-toc-bg-card: rgba(243, 244, 246, 0.85);
      --ai-toc-bg-card-hover: rgba(229, 231, 235, 1);
      --ai-toc-border: rgba(209, 213, 219, 0.7);
      --ai-toc-text: #1f2937;
      --ai-toc-text-secondary: #6b7280;
      --ai-toc-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      --ai-toc-font: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-family: var(--ai-toc-font);
      color: var(--ai-toc-text);
      font-size: 13px;
      line-height: 1.4;
      box-sizing: border-box;
      pointer-events: none;
    }

    :host(.dark-theme) {
      --ai-toc-primary: #60a5fa;
      --ai-toc-primary-hover: #3b82f6;
      --ai-toc-primary-light: rgba(96, 165, 250, 0.15);
      --ai-toc-bg: rgba(24, 24, 27, 0.94);
      --ai-toc-bg-card: rgba(39, 39, 42, 0.85);
      --ai-toc-bg-card-hover: rgba(63, 63, 70, 0.95);
      --ai-toc-border: rgba(82, 82, 91, 0.6);
      --ai-toc-text: #f4f4f5;
      --ai-toc-text-secondary: #a1a1aa;
      --ai-toc-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    /* Invisible Backdrop (Bắt sự kiện click ra ngoài để đóng sidebar tự động) */
    .toc-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: transparent;
      z-index: 2147483646;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .toc-backdrop.open {
      pointer-events: auto;
      opacity: 1;
    }

    /* Floating Toggle Trigger Button (Draggable) */
    .toc-trigger-btn {
      pointer-events: auto;
      position: fixed;
      right: 18px;
      bottom: 24px;
      z-index: 2147483646;
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 10px 14px;
      background: var(--ai-toc-bg);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid var(--ai-toc-border);
      border-radius: 9999px;
      box-shadow: var(--ai-toc-shadow);
      cursor: grab;
      color: var(--ai-toc-text);
      font-weight: 600;
      transition: border-color 0.25s, box-shadow 0.25s, background-color 0.25s;
      user-select: none;
    }

    .toc-trigger-btn:active {
      cursor: grabbing;
    }

    .toc-trigger-btn:hover {
      border-color: var(--ai-toc-primary);
      box-shadow: 0 12px 28px -5px rgba(59, 130, 246, 0.3);
    }

    .toc-badge {
      background: var(--ai-toc-primary);
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 9999px;
      min-width: 18px;
      text-align: center;
    }

    /* Floating Overlay Drawer (Đè lên giao diện web) */
    .toc-drawer {
      pointer-events: auto;
      position: fixed;
      top: 16px;
      right: 16px;
      bottom: 16px;
      width: 340px;
      max-width: calc(100vw - 32px);
      background: var(--ai-toc-bg);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      border: 1px solid var(--ai-toc-border);
      border-radius: 16px;
      box-shadow: var(--ai-toc-shadow);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 2147483647;
      transform: translateX(400px);
      opacity: 0;
      transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
    }

    .toc-drawer.open {
      transform: translateX(0);
      opacity: 1;
    }

    /* Drawer Header */
    .toc-header {
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--ai-toc-border);
      gap: 8px;
    }

    .toc-title-area {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .toc-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--ai-toc-text);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .toc-platform-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 6px;
      background: rgba(59, 130, 246, 0.15);
      color: var(--ai-toc-primary);
      text-transform: uppercase;
    }

    .toc-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .toc-icon-btn {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: var(--ai-toc-text-secondary);
      cursor: pointer;
      transition: all 0.2s;
    }

    .toc-icon-btn:hover {
      background: var(--ai-toc-bg-card);
      color: var(--ai-toc-text);
    }

    /* Search Input Bar */
    .toc-search-box {
      padding: 10px 14px;
      border-bottom: 1px solid var(--ai-toc-border);
      position: relative;
    }

    .toc-search-input {
      width: 100%;
      padding: 7px 10px 7px 30px;
      border-radius: 8px;
      border: 1px solid var(--ai-toc-border);
      background: var(--ai-toc-bg-card);
      color: var(--ai-toc-text);
      font-size: 12px;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .toc-search-input:focus {
      border-color: var(--ai-toc-primary);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    .toc-search-icon {
      position: absolute;
      left: 22px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--ai-toc-text-secondary);
      pointer-events: none;
      display: flex;
    }

    /* List Container */
    .toc-list {
      flex: 1;
      overflow-y: auto;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    /* Custom Sleek Scrollbar */
    .toc-list::-webkit-scrollbar {
      width: 5px;
    }
    .toc-list::-webkit-scrollbar-track {
      background: transparent;
    }
    .toc-list::-webkit-scrollbar-thumb {
      background: var(--ai-toc-border);
      border-radius: 10px;
    }

    /* Prompt Item Card */
    .toc-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 9px 11px;
      background: var(--ai-toc-bg-card);
      border: 1px solid transparent;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    }

    .toc-item:hover {
      background: var(--ai-toc-bg-card-hover);
      border-color: var(--ai-toc-border);
      transform: translateY(-1px);
    }

    /* ScrollSpy Active State */
    .toc-item.active {
      border-color: var(--ai-toc-primary);
      background: var(--ai-toc-primary-light);
    }

    .toc-item-index {
      font-size: 11px;
      font-weight: 700;
      color: var(--ai-toc-primary);
      background: rgba(59, 130, 246, 0.1);
      padding: 2px 6px;
      border-radius: 6px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .toc-item.active .toc-item-index {
      background: var(--ai-toc-primary);
      color: #ffffff;
    }

    .toc-item-text {
      flex: 1;
      font-size: 12px;
      color: var(--ai-toc-text);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      word-break: break-word;
      line-height: 1.35;
    }

    /* Empty state */
    .toc-empty {
      padding: 40px 16px;
      text-align: center;
      color: var(--ai-toc-text-secondary);
      font-size: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    /* Toast Notification inside Drawer */
    .toc-toast {
      position: absolute;
      bottom: 48px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: #10b981;
      color: #ffffff;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      opacity: 0;
      pointer-events: none;
      transition: all 0.25s ease;
      z-index: 10;
    }

    .toc-toast.show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }

    /* Footer info */
    .toc-footer {
      padding: 9px 14px;
      border-top: 1px solid var(--ai-toc-border);
      font-size: 11px;
      color: var(--ai-toc-text-secondary);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(0, 0, 0, 0.02);
    }

    .toc-shortcut-hint {
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }

    kbd {
      background: var(--ai-toc-bg-card);
      border: 1px solid var(--ai-toc-border);
      border-radius: 4px;
      padding: 1px 4px;
      font-size: 10px;
      font-family: inherit;
    }
  `;

  /* ==========================================================================
     3. HIGHLIGHT ENGINE (Inject animation class vào document để highlight tin nhắn)
     ========================================================================== */

  function injectHostHighlightStyle() {
    const styleId = 'ai-chat-toc-highlight-keyframes';
    if (document.getElementById(styleId)) return;

    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = `
      @keyframes aiChatTocPulse {
        0% {
          outline: 3px solid #3b82f6;
          box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
          background-color: rgba(59, 130, 246, 0.12);
        }
        50% {
          outline: 3px solid #3b82f6;
          box-shadow: 0 0 0 12px rgba(59, 130, 246, 0);
          background-color: rgba(59, 130, 246, 0.08);
        }
        100% {
          outline: 2px solid transparent;
          box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
          background-color: transparent;
        }
      }
      .ai-chat-toc-targeted-prompt {
        animation: aiChatTocPulse 1.8s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
        border-radius: 12px !important;
        transition: outline 0.3s, background-color 0.3s;
      }
    `;
    document.head.appendChild(styleEl);
  }

  /* ==========================================================================
     4. CONTROLLER & UI (Shadow DOM Isolation)
     ========================================================================== */

  class TOCController {
    constructor() {
      this.adapters = [new ChatGPTAdapter(), new GeminiAdapter()];
      this.currentAdapter = this.adapters.find(a => a.match()) || null;

      this.prompts = []; // { id, element, text, index }
      this.isOpen = false;
      this.searchTerm = '';
      this.debounceTimer = null;
      this.activePromptIndex = null;
      this.lastUrl = window.location.href;

      if (!this.currentAdapter) {
        console.log('[AI Chat TOC] No matching AI chat platform detected.');
        return;
      }

      console.log(`[AI Chat TOC] Active Adapter: ${this.currentAdapter.name}`);
      this.init();
    }

    init() {
      injectHostHighlightStyle();
      this.createShadowUI();
      this.scanPrompts();
      this.setupObserver();
      this.setupSpaRoutingWatcher();
      this.setupKeyboardShortcuts();
      this.setupDraggableTrigger();
      this.setupScrollSpy();
      this.setupClickOutside();
      this.syncTheme();
    }

    createShadowUI() {
      this.hostEl = document.createElement('div');
      this.hostEl.id = 'ai-chat-toc-overlay-host';
      this.hostEl.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 2147483647;
      `;
      document.body.appendChild(this.hostEl);

      this.shadowRoot = this.hostEl.attachShadow({ mode: 'open' });

      const style = document.createElement('style');
      style.textContent = SHADOW_STYLES;
      this.shadowRoot.appendChild(style);

      this.wrapper = document.createElement('div');
      this.wrapper.innerHTML = `
        <!-- Invisible Backdrop để bắt click ra ngoài -->
        <div class="toc-backdrop" id="toc-backdrop"></div>

        <!-- Floating Trigger Button -->
        <button class="toc-trigger-btn" id="toc-trigger-btn" title="Mục lục Chat (Alt + T hoặc Kéo thả)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
          <span>Mục lục</span>
          <span class="toc-badge" id="toc-badge">0</span>
        </button>

        <!-- Floating Overlay Drawer -->
        <div class="toc-drawer" id="toc-drawer">
          <div class="toc-header">
            <div class="toc-title-area">
              <span class="toc-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Lịch sử đoạn chat
              </span>
              <span class="toc-platform-badge">${this.currentAdapter.name}</span>
            </div>
            <div class="toc-actions">
              <button class="toc-icon-btn" id="toc-copy-btn" title="Sao chép toàn bộ mục lục (Markdown)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
              <button class="toc-icon-btn" id="toc-refresh-btn" title="Quét lại nội dung">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                </svg>
              </button>
              <button class="toc-icon-btn" id="toc-close-btn" title="Thu gọn (Alt + T)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          <!-- Quick Search Bar -->
          <div class="toc-search-box">
            <span class="toc-search-icon">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input type="text" class="toc-search-input" id="toc-search-input" placeholder="Lọc câu hỏi nhanh...">
          </div>

          <!-- Prompt Items List -->
          <div class="toc-list" id="toc-list"></div>

          <!-- Toast notification -->
          <div class="toc-toast" id="toc-toast">Đã sao chép vào clipboard!</div>

          <!-- Footer -->
          <div class="toc-footer">
            <span id="toc-count-label">0 câu hỏi</span>
            <span class="toc-shortcut-hint">Đóng/Mở: <kbd>Alt</kbd> + <kbd>T</kbd></span>
          </div>
        </div>
      `;
      this.shadowRoot.appendChild(this.wrapper);

      // Cache DOM Elements inside Shadow Root
      this.backdropEl = this.shadowRoot.getElementById('toc-backdrop');
      this.drawerEl = this.shadowRoot.getElementById('toc-drawer');
      this.triggerBtn = this.shadowRoot.getElementById('toc-trigger-btn');
      this.badgeEl = this.shadowRoot.getElementById('toc-badge');
      this.listEl = this.shadowRoot.getElementById('toc-list');
      this.countLabel = this.shadowRoot.getElementById('toc-count-label');
      this.searchInput = this.shadowRoot.getElementById('toc-search-input');
      this.closeBtn = this.shadowRoot.getElementById('toc-close-btn');
      this.refreshBtn = this.shadowRoot.getElementById('toc-refresh-btn');
      this.copyBtn = this.shadowRoot.getElementById('toc-copy-btn');
      this.toastEl = this.shadowRoot.getElementById('toc-toast');

      // Bind events
      this.triggerBtn.addEventListener('click', () => {
        if (!this.wasDragging) this.toggleDrawer();
      });
      this.closeBtn.addEventListener('click', () => this.closeDrawer());
      this.refreshBtn.addEventListener('click', () => this.scanPrompts());
      this.copyBtn.addEventListener('click', () => this.exportMarkdownTOC());
      this.backdropEl.addEventListener('click', () => this.closeDrawer());

      this.searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value.toLowerCase().trim();
        this.renderList();
      });
    }

    // Tự động thu nhỏ khi click bất kỳ vùng nào bên ngoài Sidebar
    setupClickOutside() {
      // 1. Bắt sự kiện pointerdown ở tầng window để đảm bảo tương tác ngay lập tức
      window.addEventListener('pointerdown', (e) => {
        if (!this.isOpen) return;

        // e.composedPath() xuyên qua Shadow DOM boundary
        const path = e.composedPath();
        const clickedInsideDrawer = path.includes(this.drawerEl);
        const clickedTriggerBtn = path.includes(this.triggerBtn);

        // Nếu click ngoài Drawer và ngoài nút mở -> Tự động thu nhỏ để người dùng đọc nội dung
        if (!clickedInsideDrawer && !clickedTriggerBtn) {
          this.closeDrawer();
        }
      }, { capture: true });
    }

    // Cho phép người dùng kéo thả nút bấm nổi nếu bị che bởi nút của web gốc
    setupDraggableTrigger() {
      let isDragging = false;
      let startY = 0;
      let startBottom = 24;

      const savedBottom = localStorage.getItem('ai_chat_toc_trigger_bottom');
      if (savedBottom) {
        this.triggerBtn.style.bottom = `${savedBottom}px`;
      }

      this.triggerBtn.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        isDragging = true;
        this.wasDragging = false;
        startY = e.clientY;
        const computed = parseInt(window.getComputedStyle(this.triggerBtn).bottom, 10) || 24;
        startBottom = computed;
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const deltaY = startY - e.clientY;
        if (Math.abs(deltaY) > 4) {
          this.wasDragging = true;
        }
        let newBottom = startBottom + deltaY;
        newBottom = Math.max(16, Math.min(window.innerHeight - 70, newBottom));
        this.triggerBtn.style.bottom = `${newBottom}px`;
      });

      window.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          const currentBottom = parseInt(this.triggerBtn.style.bottom, 10);
          if (!isNaN(currentBottom)) {
            localStorage.setItem('ai_chat_toc_trigger_bottom', currentBottom);
          }
        }
      });
    }

    // ScrollSpy: Tự động highlight mục đang xem khi cuộn trang
    setupScrollSpy() {
      const handleScroll = () => {
        if (!this.prompts.length) return;

        const viewportCenter = window.innerHeight / 3;
        let closestIndex = null;
        let minDistance = Infinity;

        this.prompts.forEach((p, idx) => {
          const rect = p.element.getBoundingClientRect();
          const dist = Math.abs(rect.top - viewportCenter);
          if (dist < minDistance && rect.bottom > 0 && rect.top < window.innerHeight) {
            minDistance = dist;
            closestIndex = idx + 1;
          }
        });

        if (closestIndex !== this.activePromptIndex) {
          this.activePromptIndex = closestIndex;
          this.updateActiveItemClass();
        }
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      const target = this.currentAdapter.getObserveTarget();
      if (target) {
        target.addEventListener('scroll', handleScroll, { passive: true });
      }
    }

    updateActiveItemClass() {
      const items = this.listEl.querySelectorAll('.toc-item');
      items.forEach(el => {
        const itemIdx = parseInt(el.getAttribute('data-index'), 10);
        if (itemIdx === this.activePromptIndex) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });
    }

    exportMarkdownTOC() {
      if (!this.prompts.length) return;
      const mdLines = this.prompts.map(p => `${p.index}. ${p.text}`);
      const textToCopy = `### Mục lục hội thoại (${this.currentAdapter.name})\n\n` + mdLines.join('\n');

      navigator.clipboard.writeText(textToCopy).then(() => {
        this.showToast('Đã copy danh sách mục lục (Markdown)!');
      }).catch(() => {
        this.showToast('Lỗi khi sao chép!');
      });
    }

    showToast(msg) {
      this.toastEl.textContent = msg;
      this.toastEl.classList.add('show');
      setTimeout(() => {
        this.toastEl.classList.remove('show');
      }, 2000);
    }

    toggleDrawer() {
      this.isOpen ? this.closeDrawer() : this.openDrawer();
    }

    openDrawer() {
      this.isOpen = true;
      this.drawerEl.classList.add('open');
      this.backdropEl.classList.add('open');
      this.syncTheme();
      setTimeout(() => this.searchInput.focus(), 150);
    }

    closeDrawer() {
      this.isOpen = false;
      this.drawerEl.classList.remove('open');
      this.backdropEl.classList.remove('open');
    }

    syncTheme() {
      const isDark = 
        document.documentElement.classList.contains('dark') ||
        document.documentElement.getAttribute('data-theme') === 'dark' ||
        document.body.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;

      if (isDark) {
        this.hostEl.classList.add('dark-theme');
      } else {
        this.hostEl.classList.remove('dark-theme');
      }
    }

    scanPrompts() {
      if (!this.currentAdapter) return;

      const rawElements = this.currentAdapter.getUserPrompts();
      const validPrompts = [];

      rawElements.forEach((el, idx) => {
        const text = this.currentAdapter.extractText(el);
        if (text && text.length > 0) {
          validPrompts.push({
            id: `prompt-turn-${idx + 1}`,
            element: el,
            text: text,
            index: idx + 1
          });
        }
      });

      this.prompts = validPrompts;
      this.badgeEl.textContent = this.prompts.length;
      this.countLabel.textContent = `${this.prompts.length} câu hỏi`;

      this.renderList();
    }

    renderList() {
      this.listEl.innerHTML = '';

      const filtered = this.prompts.filter(item => {
        if (!this.searchTerm) return true;
        return item.text.toLowerCase().includes(this.searchTerm);
      });

      if (filtered.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'toc-empty';
        emptyDiv.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          <span>${this.searchTerm ? 'Không tìm thấy câu hỏi phù hợp' : 'Chưa có câu hỏi nào trong phiên chat này'}</span>
        `;
        this.listEl.appendChild(emptyDiv);
        return;
      }

      filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = `toc-item ${item.index === this.activePromptIndex ? 'active' : ''}`;
        card.setAttribute('data-index', item.index);
        card.title = item.text;
        card.innerHTML = `
          <span class="toc-item-index">#${item.index}</span>
          <span class="toc-item-text">${this.escapeHtml(item.text)}</span>
        `;

        card.addEventListener('click', () => {
          this.scrollToPrompt(item.element);
        });

        this.listEl.appendChild(card);
      });
    }

    scrollToPrompt(targetElement) {
      if (!targetElement) return;

      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });

      targetElement.classList.remove('ai-chat-toc-targeted-prompt');
      void targetElement.offsetWidth;
      targetElement.classList.add('ai-chat-toc-targeted-prompt');

      setTimeout(() => {
        targetElement.classList.remove('ai-chat-toc-targeted-prompt');
      }, 2000);
    }

    setupObserver() {
      const target = this.currentAdapter.getObserveTarget();
      if (!target) return;

      const observer = new MutationObserver(() => {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.scanPrompts();
        }, 400);
      });

      observer.observe(target, {
        childList: true,
        subtree: true
      });
    }

    setupSpaRoutingWatcher() {
      const checkUrlChange = () => {
        const currentUrl = window.location.href;
        if (currentUrl !== this.lastUrl) {
          this.lastUrl = currentUrl;
          console.log('[AI Chat TOC] Chat URL changed, rescanning...');
          setTimeout(() => {
            this.scanPrompts();
          }, 600);
        }
      };

      const originalPushState = history.pushState;
      history.pushState = function () {
        originalPushState.apply(this, arguments);
        checkUrlChange();
      };

      const originalReplaceState = history.replaceState;
      history.replaceState = function () {
        originalReplaceState.apply(this, arguments);
        checkUrlChange();
      };

      window.addEventListener('popstate', checkUrlChange);
      setInterval(checkUrlChange, 1200);
    }

    setupKeyboardShortcuts() {
      window.addEventListener('keydown', (e) => {
        if (e.altKey && (e.key === 't' || e.key === 'T')) {
          e.preventDefault();
          this.toggleDrawer();
        }
        if (e.key === 'Escape' && this.isOpen) {
          this.closeDrawer();
        }
      });
    }

    escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
  }

  // Khởi động khi DOM đã tải xong
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new TOCController());
  } else {
    new TOCController();
  }
})();
