// ============================================
// CONSTANTS & CONFIGURATION
// ============================================

const STORAGE_KEYS = {
  API_KEY: 'ai_assistant_api_key',
  API_URL: 'ai_assistant_api_url',
  CHATS: 'ai_assistant_chats',
  SETTINGS: 'ai_assistant_settings',
  CURRENT_CHAT: 'ai_assistant_current_chat'
};

const DEFAULT_CONFIG = {
  API_BASE_URL: 'https://openrouter.ai/api/v1'
};

// OpenRouter models with webSearch support
const MODELS = {
  'openai/gpt-5': {
    type: 'model',
    displayName: 'GPT-5',
    maxTokens: 16000,
    supportStreaming: true,
    supportWebSearch: true,
    supportReasoning: true,
    pricing: { input: 0.005, output: 0.015 }
  },
  'openai/gpt-4.5-preview': {
    type: 'model',
    displayName: 'GPT-4.5 preview',
    maxTokens: 16000,
    supportStreaming: true,
    supportWebSearch: true,
    pricing: { input: 0.0005, output: 0.0015 }
  },
  'openai/chatgpt-4o-latest': {
    type: 'model',
    displayName: 'chatgpt-4o-latest',
    maxTokens: 16000,
    supportStreaming: true,
    supportWebSearch: true,
    supportReasoning: true,
    pricing: { input: 0.003, output: 0.015 }
  },
  'openrouter/polaris-alpha': {
    type: 'model',
    displayName: 'GPT-5.1 Beta',
    maxTokens: 16000,
    supportStreaming: true,
    supportWebSearch: true,
    pricing: { input: 0.015, output: 0.075 }
  },
  'google/gemini-2.5-pro': {
    type: 'model',
    displayName: 'Gemini 2.5 Pro',
    maxTokens: 64000,
    supportStreaming: true,
    supportWebSearch: true,
    supportReasoning: true,
    pricing: { input: 0.00025, output: 0.00125 }
  },
  'google/gemini-2.5-flash': {
    type: 'model',
    displayName: 'Gemini 2.5 Flash',
    maxTokens: 64000,
    supportStreaming: true,
    supportWebSearch: true,
    supportReasoning: true,
    pricing: { input: 0.00025, output: 0.0005 }
  },
  'anthropic/claude-haiku-4.5': {
    type: 'model',
    displayName: 'Claude Haiku 4.5',
    maxTokens: 64000,
    supportStreaming: true,
    supportWebSearch: true,
    supportReasoning: true,
    pricing: { input: 0.0025, output: 0.0075 }
  },
  'anthropic/claude-sonnet-4.5': {
    type: 'model',
    displayName: 'Claude Sonnet 4.5',
    maxTokens: 64000,
    supportStreaming: true,
    supportWebSearch: true,
    supportReasoning: true,
    pricing: { input: 0.003, output: 0.009 }
  },
  'anthropic/claude-opus-4.1': {
    type: 'model',
    displayName: 'Claude Opus 4.1',
    maxTokens: 16000,
    supportStreaming: true,
    supportWebSearch: true,
    supportReasoning: true,
    pricing: { input: 0.0008, output: 0.0024 }
  },
  'nousresearch/hermes-3-llama-3.1-70b': {
    type: 'model',
    displayName: 'nousresearch',
    maxTokens: 16000,
    supportStreaming: true,
    supportWebSearch: true,
    pricing: { input: 0.00024, output: 0.00024 }
  },
  'deepseek/deepseek-v3.2-exp': {
    type: 'model',
    displayName: 'DeepSeek v3.2-exp',
    maxTokens: 16000,
    supportStreaming: true,
    supportWebSearch: true,
    pricing: { input: 0.00014, output: 0.00028 }
  }
};

const SYSTEM_PROMPTS = {
  default: 'You are a helpful AI assistant.',
  creative: 'You are a creative and imaginative AI assistant. Think outside the box and provide unique, innovative solutions.',
  technical: 'You are a technical expert AI assistant. Provide detailed, accurate technical information and code examples.',
  tutor: 'You are a patient and knowledgeable tutor. Explain concepts clearly and help users learn effectively.',
  custom: ''
};

// ============================================
// STREAMING RENDERER CLASS
// ============================================

class StreamingRenderer {
  constructor(element) {
    this.element = element;
    this.content = '';
    this.buffer = '';
    this.updateTimeout = null;
    this.lastUpdateTime = 0;
    this.UPDATE_INTERVAL = 50; // Update UI every 50ms
    this.isFinished = false;
  }

  addChunk(chunk) {
    this.buffer += chunk;
    this.scheduleUpdate();
  }

  scheduleUpdate() {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastUpdateTime;

    if (timeSinceLastUpdate >= this.UPDATE_INTERVAL) {
      this.updateNow();
    } else if (!this.updateTimeout) {
      this.updateTimeout = setTimeout(() => {
        this.updateNow();
      }, this.UPDATE_INTERVAL - timeSinceLastUpdate);
    }
  }

  updateNow() {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }

    if (this.buffer) {
      this.content += this.buffer;
      this.buffer = '';
      
      // Update content with streaming indicator
      const formattedContent = MarkdownRenderer.format(this.content);
      this.element.innerHTML = formattedContent + (this.isFinished ? '' : this.getStreamingIndicator());
      
      // Scroll to bottom
      const container = document.getElementById('messagesContainer');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
      
      this.lastUpdateTime = Date.now();
    }
  }

  getStreamingIndicator() {
    return '<span class="streaming-cursor">▊</span>';
  }

  finalize() {
    this.isFinished = true;
    // Final update
    if (this.buffer) {
      this.content += this.buffer;
      this.buffer = '';
    }
    
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }
    
    // Remove streaming indicator
    this.element.innerHTML = MarkdownRenderer.format(this.content);
  }
}

// ============================================
// STATE MANAGEMENT (Enhanced)
// ============================================

class AppState {
  constructor() {
    this.currentChatId = null;
    this.chats = [];
    this.messages = [];
    this.settings = {
      temperature: 0.6,
      topP: 0.93,
      systemPrompt: SYSTEM_PROMPTS.default,
      systemPromptPreset: 'default',
      maxTokens: 16000,
      webSearch: false // Added webSearch parameter
    };
    this.attachedFiles = [];
    this.isProcessingPaste = false;
    this.currentStreamController = null;
    this.editingMessageIndex = null;
    this.currentStreamingRenderer = null; // Track current streaming renderer
  }

  save() {
    localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(this.chats));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    localStorage.setItem(STORAGE_KEYS.CURRENT_CHAT, this.currentChatId);
  }

  load() {
    const chats = localStorage.getItem(STORAGE_KEYS.CHATS);
    const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const currentChat = localStorage.getItem(STORAGE_KEYS.CURRENT_CHAT);

    if (chats) this.chats = JSON.parse(chats);
    if (settings) {
      this.settings = { ...this.settings, ...JSON.parse(settings) };
    }
    
    if (currentChat) {
      this.currentChatId = currentChat;
      const chat = this.chats.find(c => c.id === currentChat);
      if (chat) {
        this.messages = chat.messages || [];
      }
    }
  }

  reset() {
    if (confirm('Вы уверены, что хотите удалить все данные, включая API ключ и историю чатов?')) {
      localStorage.clear();
      location.reload();
    }
  }
}

const state = new AppState();

// ============================================
// STORAGE & API CONFIGURATION
// ============================================

class ApiConfig {
  static get() {
    return {
      apiKey: localStorage.getItem(STORAGE_KEYS.API_KEY),
      apiUrl: localStorage.getItem(STORAGE_KEYS.API_URL) || DEFAULT_CONFIG.API_BASE_URL
    };
  }

  static set(apiKey, apiUrl) {
    localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
    localStorage.setItem(STORAGE_KEYS.API_URL, apiUrl || DEFAULT_CONFIG.API_BASE_URL);
  }

  static async validate(apiKey, apiUrl) {
    const response = await fetch(`${apiUrl}/models`, {
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'AI Assistant'
      }
    });
    
    if (!response.ok) {
      throw new Error('Неверный API ключ или URL');
    }
    
    return true;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

const Utils = {
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    if (diff < 86400000) return 'Сегодня';
    if (diff < 172800000) return 'Вчера';
    return date.toLocaleDateString('ru-RU');
  },

  adjustTextareaHeight(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  },

  async readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  },

  async readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  getFileExtension(filename) {
    return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
  },

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
};

// ============================================
// NOTIFICATION SYSTEM
// ============================================

class NotificationManager {
  static show(message, type = 'info') {
    let container = document.getElementById('notificationContainer');
    
    if (!container) {
      container = document.createElement('div');
      container.id = 'notificationContainer';
      container.className = 'notification-container';
      document.body.appendChild(container);
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;

    const icons = { success: '✓', error: '✗', info: 'ℹ' };
    notification.innerHTML = `
      <span class="notification-icon">${icons[type]}</span>
      <span class="notification-message">${message}</span>
    `;

    container.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  static error(message) {
    this.show(message, 'error');
  }

  static success(message) {
    this.show(message, 'success');
  }
}

// ============================================
// MARKDOWN & CODE HIGHLIGHTING
// ============================================

class MarkdownRenderer {
  static initialize() {
    marked.setOptions({
      highlight: (code, lang) => {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch (err) {
            console.error('Highlight error:', err);
          }
        }
        return hljs.highlightAuto(code).value;
      },
      breaks: true,
      gfm: true,
      tables: true,
      pedantic: false,
      sanitize: false,
      smartLists: true,
      smartypants: true
    });

    const renderer = new marked.Renderer();

    renderer.code = (code, language) => {
      const validLang = language && hljs.getLanguage(language) ? language : 'plaintext';
      const highlighted = hljs.highlight(code, { language: validLang }).value;
      return `
        <div class="code-block">
          <div class="code-header">
            <span class="code-language">${validLang}</span>
            <button class="copy-code-btn" onclick="copyCode(this)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" stroke-width="2"/>
              </svg>
              Копировать
            </button>
          </div>
          <pre><code class="hljs language-${validLang}">${highlighted}</code></pre>
        </div>
      `;
    };

    renderer.table = (header, body) => `
      <div class="table-wrapper">
        <table class="markdown-table">
          <thead>${header}</thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    `;

    renderer.link = (href, title, text) => {
      const titleAttr = title ? ` title="${title}"` : '';
      return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer" class="markdown-link">${text}</a>`;
    };

    marked.use({ renderer });
  }

  static format(content) {
    if (!content) return '';

    // Preserve LaTeX delimiters
    content = content.replace(/\\\$/g, '$');

    const mathBlocks = [];
    const mathInlines = [];

    // Extract block math ($$...$$) and \[...\]
    content = content.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
      mathBlocks.push(formula.trim());
      return `<!--MATH_BLOCK_${mathBlocks.length - 1}-->`;
    });

    content = content.replace(/\\\[([\s\S]+?)\\\]/g, (match, formula) => {
      mathBlocks.push(formula.trim());
      return `<!--MATH_BLOCK_${mathBlocks.length - 1}-->`;
    });

    // Extract inline math ($...$) and \(...\)
    content = content.replace(/\$([^\$\n]+?)\$/g, (match, formula) => {
      mathInlines.push(formula.trim());
      return `<!--MATH_INLINE_${mathInlines.length - 1}-->`;
    });

    content = content.replace(/\\\((.+?)\\\)/g, (match, formula) => {
      mathInlines.push(formula.trim());
      return `<!--MATH_INLINE_${mathInlines.length - 1}-->`;
    });

    // Convert markdown
    let formatted = marked.parse(content);

    // Restore block math
    formatted = formatted.replace(/<!--MATH_BLOCK_(\d+)-->/g, (match, index) => {
      const formula = mathBlocks[parseInt(index)];
      try {
        return `<div class="katex-display">${katex.renderToString(formula, {
          displayMode: true,
          throwOnError: false,
          trust: true,
          strict: false
        })}</div>`;
      } catch (e) {
        console.error('LaTeX block error:', e);
        return `<div class="math-error">Ошибка в формуле: ${Utils.escapeHtml(formula)}</div>`;
      }
    });

    // Restore inline math
    formatted = formatted.replace(/<!--MATH_INLINE_(\d+)-->/g, (match, index) => {
      const formula = mathInlines[parseInt(index)];
      try {
        return katex.renderToString(formula, {
          displayMode: false,
          throwOnError: false,
          trust: true,
          strict: false
        });
      } catch (e) {
        console.error('LaTeX inline error:', e);
        return `<span class="math-error">Ошибка: ${Utils.escapeHtml(formula)}</span>`;
      }
    });

    return formatted;
  }
}

// ============================================
// API CALLING WITH IMPROVED STREAMING
// ============================================

class AIService {
  static async call(message, files = [], onChunk = null, streamingElement = null) {
    const { apiKey, apiUrl } = ApiConfig.get();

    if (!apiKey) {
      throw new Error('API ключ не найден. Пожалуйста, перезагрузите страницу.');
    }

    const selectedModel = document.getElementById('modelSelect').value;
    const model = MODELS[selectedModel];

    if (!model) {
      throw new Error('Модель не найдена');
    }

    // Cancel any ongoing stream
    if (state.currentStreamController) {
      state.currentStreamController.abort();
    }

    state.currentStreamController = new AbortController();

    const messages = this.buildMessages(message, files);

    const requestBody = {
      model: selectedModel,
      messages,
      stream: true,
      temperature: state.settings.temperature,
      top_p: state.settings.topP,
      max_tokens: state.settings.maxTokens || model.maxTokens || 2048
    };

    if (model.supportReasoning) {
      requestBody.reasoning = {effort:"high"}
    }
    // Add webSearch parameter if model supports it and it's enabled
    if (model.supportWebSearch && state.settings.webSearch) {
      requestBody.plugins = [{ id: 'web' }];
      requestBody.web_search_options = {search_context_size:"high"}
    }

    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'AI Assistant'
      },
      body: JSON.stringify(requestBody),
      signal: state.currentStreamController.signal
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    // Create streaming renderer if element provided
    const streamingRenderer = streamingElement ? 
      new StreamingRenderer(streamingElement) : null;
    
    state.currentStreamingRenderer = streamingRenderer;

    return this.processStream(response, onChunk, model, streamingRenderer);
  }

  static async processStream(response, onChunk, model, streamingRenderer) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let totalContent = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines[lines.length - 1];

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (!line || line === 'data: [DONE]') continue;
          
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.choices?.[0]?.delta?.content) {
                const chunk = data.choices[0].delta.content;
                totalContent += chunk;
                
                // Update streaming renderer
                if (streamingRenderer) {
                  streamingRenderer.addChunk(chunk);
                }
                
                onChunk?.({ content: chunk, totalContent });
              }

              // Handle finish reason and usage
              if (data.choices?.[0]?.finish_reason === 'stop') {
                if (streamingRenderer) {
                  streamingRenderer.finalize();
                }
                
                if (data.usage) {
                  const usage = this.calculateUsage(data, model);
                  onChunk?.({ usage, finished: true });
                }
              }
            } catch (e) {
              console.warn('Failed to parse stream line:', line);
            }
          }
        }
      }
      
      // Finalize streaming
      if (streamingRenderer) {
        streamingRenderer.finalize();
      }
      
    } finally {
      reader.releaseLock();
      state.currentStreamController = null;
      state.currentStreamingRenderer = null;
    }

    return { content: totalContent, usage: null };
  }

  static calculateUsage(response, model) {
    const usage = {
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      totalTokens: 0,
      cost: 0
    };

    usage.totalTokens = response.usage?.total_tokens || (usage.inputTokens + usage.outputTokens);

    if (model.pricing) {
      usage.cost = (usage.inputTokens / 1000) * model.pricing.input +
                   (usage.outputTokens / 1000) * model.pricing.output;
    }

    return usage;
  }

  static buildMessages(message, files) {
    const messages = [];

    messages.push({
      role: 'system',
      content: state.settings.systemPrompt
    });

    // Add message history
    for (let i = 0; i < state.messages.length - 1; i++) {
      const msg = state.messages[i];

      if (msg.role === 'user') {
        let content = msg.content || '';

        // Add file contents to the message
        if (msg.files?.length) {
          msg.files.forEach(file => {
            if (file.type === 'text') {
              content += `\n\n[File: ${file.name}]\n${file.content}`;
            }
          });
        }

        messages.push({
          role: 'user',
          content: content
        });
      } else if (msg.role === 'assistant' && msg.content) {
        messages.push({
          role: 'assistant',
          content: msg.content
        });
      }
    }

    return messages;
  }
}

// ============================================
// FILE HANDLING
// ============================================

class FileHandler {
  static async processFile(file, fileName) {
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB

    if (file.size > MAX_SIZE) {
      NotificationManager.error('Файл слишком большой (макс 10MB)');
      throw new Error('File too large');
    }

    const extension = Utils.getFileExtension(fileName).toLowerCase();
    const fileInfo = {
      name: fileName,
      size: file.size,
      sizeFormatted: Utils.formatFileSize(file.size),
      extension: extension
    };

    // Handle images
    if (file.type.startsWith('image/')) {
      const dataUrl = await Utils.readFileAsDataURL(file);
      return { ...fileInfo, type: 'image', data: dataUrl, preview: dataUrl };
    }

    // Handle text files
    const textExtensions = ['txt', 'md', 'json', 'js', 'html', 'css', 'py', 'java', 'cpp', 'c', 'h', 'xml', 'yaml', 'yml', 'csv', 'log'];
    if (textExtensions.includes(extension) || file.type.startsWith('text/')) {
      const content = await Utils.readFileAsText(file);
      return { ...fileInfo, type: 'text', content: content, preview: 'text' };
    }

    // Handle PDFs
    if (extension === 'pdf' || file.type === 'application/pdf') {
      return { ...fileInfo, type: 'pdf', preview: 'pdf', note: 'PDF файлы отображаются как вложения' };
    }

    // Handle other documents
    const docExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
    if (docExtensions.includes(extension)) {
      return { ...fileInfo, type: 'document', preview: 'document', note: 'Документ прикреплен' };
    }

    return { ...fileInfo, type: 'unsupported', preview: 'file', note: 'Тип файла не поддерживается для чтения' };
  }

  static createPreviewItem(fileData) {
    const item = document.createElement('div');
    item.className = 'file-item';

    let previewContent = '';
    
    if (fileData.type === 'image') {
      previewContent = `<img src="${fileData.data}" alt="${fileData.name}" title="${fileData.name}">`;
    } else if (fileData.type === 'text') {
      previewContent = `
        <div class="file-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2"/>
            <path d="M14 2V8H20" stroke="currentColor" stroke-width="2"/>
            <path d="M16 13H8" stroke="currentColor" stroke-width="2"/>
            <path d="M16 17H8" stroke="currentColor" stroke-width="2"/>
            <path d="M10 9H8" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
      `;
    } else if (fileData.type === 'pdf') {
      previewContent = `
        <div class="file-icon pdf">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#DC2626" stroke-width="2"/>
            <path d="M14 2V8H20" stroke="#DC2626" stroke-width="2"/>
            <text x="7" y="16" fill="#DC2626" font-size="6" font-weight="bold">PDF</text>
          </svg>
        </div>
      `;
    } else {
      previewContent = `
        <div class="file-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path d="M13 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V9L13 2Z" stroke="currentColor" stroke-width="2"/>
            <path d="M13 2V9H20" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
      `;
    }

    const removeBtn = document.createElement('button');
    removeBtn.className = 'file-item-remove';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Удалить';
    removeBtn.onclick = () => {
      item.remove();
      state.attachedFiles = state.attachedFiles.filter(f => f !== fileData);
      NotificationManager.success('Файл удален');
    };

    const fileName = document.createElement('div');
    fileName.className = 'file-item-name';
    fileName.textContent = fileData.name.length > 20 ? fileData.name.substring(0, 17) + '...' : fileData.name;
    fileName.title = `${fileData.name} (${fileData.sizeFormatted})`;

    item.innerHTML = previewContent;
    item.appendChild(removeBtn);
    item.appendChild(fileName);

    return item;
  }

  static async handlePaste(e) {
    if (state.isProcessingPaste) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.includes('image')) {
        e.preventDefault();
        state.isProcessingPaste = true;

        const blob = item.getAsFile();
        if (blob) {
          const fileData = await this.processFile(blob, `Изображение_${Date.now()}.png`);
          const filePreview = document.getElementById('filePreview');
          const fileItem = this.createPreviewItem(fileData);
          filePreview.appendChild(fileItem);
          state.attachedFiles.push(fileData);
          NotificationManager.success('Изображение добавлено из буфера обмена');
        }

        setTimeout(() => state.isProcessingPaste = false, 100);
        break;
      }
    }
  }

  static handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('messagesContainer').classList.add('drag-over');
  }

  static handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('messagesContainer').classList.remove('drag-over');
  }

  static async handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    const container = document.getElementById('messagesContainer');
    container.classList.remove('drag-over');

    const files = e.dataTransfer?.files;
    if (!files?.length) return;

    let processedCount = 0;
    const filePreview = document.getElementById('filePreview');

    for (const file of files) {
      try {
        const fileData = await this.processFile(file, file.name);
        const fileItem = this.createPreviewItem(fileData);
        filePreview.appendChild(fileItem);
        state.attachedFiles.push(fileData);
        processedCount++;
      } catch (error) {
        console.error('Error processing file:', error);
      }
    }

    if (processedCount > 0) {
      NotificationManager.success(`Добавлено файлов: ${processedCount}`);
    }
  }

  static async handleFileSelect(e) {
    const files = Array.from(e.target.files);
    const filePreview = document.getElementById('filePreview');

    for (const file of files) {
      try {
        const fileData = await this.processFile(file, file.name);
        const fileItem = this.createPreviewItem(fileData);
        filePreview.appendChild(fileItem);
        state.attachedFiles.push(fileData);
      } catch (error) {
        console.error('Error processing file:', error);
      }
    }

    e.target.value = '';
  }
}

// ============================================
// CHAT MANAGEMENT (IMPROVED WITH STREAMING)
// ============================================

class ChatManager {
  static create() {
    if (state.currentChatId && state.messages.length > 0) {
      this.updateCurrent();
    }

    const chatId = Date.now().toString();
    const chat = {
      id: chatId,
      title: 'Новый чат',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    state.chats.unshift(chat);
    state.currentChatId = chatId;
    state.messages = [];

    state.save();
    UIManager.renderChatHistory();
    UIManager.renderMessages();

    document.getElementById('sidebar').classList.remove('active');
  }

  static load(chatId) {
    const chat = state.chats.find(c => c.id === chatId);
    if (!chat) return;

    state.currentChatId = chatId;
    state.messages = chat.messages || [];

    UIManager.renderMessages();
    UIManager.renderChatHistory();

    document.getElementById('sidebar').classList.remove('active');
  }

  static delete(chatId, event) {
    event?.stopPropagation();

    if (!confirm('Удалить этот чат?')) return;

    state.chats = state.chats.filter(c => c.id !== chatId);

    if (state.currentChatId === chatId) {
      if (state.chats.length > 0) {
        this.load(state.chats[0].id);
      } else {
        this.create();
      }
    }

    state.save();
    UIManager.renderChatHistory();
  }

  static updateCurrent() {
    if (!state.currentChatId) {
      this.create();
      return;
    }

    const chat = state.chats.find(c => c.id === state.currentChatId);
    if (!chat) return;

    chat.messages = [...state.messages];

    if (!chat.title || chat.title === 'Новый чат') {
      const firstUserMessage = state.messages.find(m => m.role === 'user');
      if (firstUserMessage?.content) {
        chat.title = firstUserMessage.content.substring(0, 50) +
          (firstUserMessage.content.length > 50 ? '...' : '');
      }
    }

    chat.updatedAt = new Date().toISOString();
    state.save();
    UIManager.renderChatHistory();
  }

  static async sendMessage(regenerate = false, editedMessage = null) {
    const messageInput = document.getElementById('messageInput');
    let message = editedMessage || messageInput.value.trim();

    if (regenerate) {
      // Remove last assistant message for regeneration
      if (state.messages.length > 0 && state.messages[state.messages.length - 1].role === 'assistant') {
        state.messages.pop();
      }
      // Get last user message
      const lastUserMessage = state.messages.filter(m => m.role === 'user').pop();
      if (lastUserMessage) {
        message = lastUserMessage.content;
        state.attachedFiles = lastUserMessage.files || [];
      }
    } else if (!regenerate && !editedMessage) {
      if (!message && !state.attachedFiles.length) return;

      const userMessage = {
        role: 'user',
        content: message,
        files: [...state.attachedFiles],
        timestamp: new Date().toISOString()
      };

      state.messages.push(userMessage);
    }

    UIManager.renderMessages();

    if (!editedMessage && !regenerate) {
      messageInput.value = '';
      messageInput.style.height = 'auto';
      document.getElementById('sendBtn').disabled = true;
      document.getElementById('filePreview').innerHTML = '';
      state.attachedFiles = [];
    }

    const assistantMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true
    };

    state.messages.push(assistantMessage);
    const assistantIndex = state.messages.length - 1;

    // Create streaming message element
    const container = document.getElementById('messagesContainer');
    const messageElement = UIManager.createStreamingMessageElement(assistantMessage, assistantIndex);
    
    container.appendChild(messageElement);
    container.scrollTop = container.scrollHeight;

    // Get the content div for streaming
    const contentDiv = messageElement.querySelector('.message-text');
    
    try {
      await AIService.call(message, state.attachedFiles, (chunk) => {
        if (chunk.content) {
          // Update state
          state.messages[assistantIndex].content += chunk.content;
        }
        
        if (chunk.finished) {
          // Streaming finished
          state.messages[assistantIndex].isStreaming = false;
        }
        
        if (chunk.usage) {
          state.messages[assistantIndex].usage = chunk.usage;
          // Add usage info
          const usageDiv = UIManager.createUsageBlock(chunk.usage);
          messageElement.querySelector('.message-content').appendChild(usageDiv);
        }
      }, contentDiv); // Pass element for streaming

      state.messages[assistantIndex].isStreaming = false;
      this.updateCurrent();
      state.save();
      
      // Add action buttons after streaming
      const actions = UIManager.createMessageActions(assistantMessage, assistantIndex);
      messageElement.querySelector('.message-content').appendChild(actions);

    } catch (error) {
      console.error('Error calling AI:', error);
      NotificationManager.error('Произошла ошибка: ' + error.message);
      state.messages.pop();
      UIManager.renderMessages();
    }
  }

  static editMessage(index) {
    const message = state.messages[index];
    if (message.role !== 'user') return;

    state.editingMessageIndex = index;
    UIManager.renderMessages();
  }

  static async saveEditedMessage(index, newContent) {
    if (index === -1 || !state.messages[index]) return;

    // Remove all messages after the edited one
    state.messages = state.messages.slice(0, index + 1);
    state.messages[index].content = newContent;
    
    state.editingMessageIndex = null;
    this.updateCurrent();

    // Send the edited message
    await this.sendMessage(false, newContent);
  }

  static cancelEdit() {
    state.editingMessageIndex = null;
    UIManager.renderMessages();
  }
}

// ============================================
// UI MANAGEMENT (ENHANCED WITH STREAMING)
// ============================================

class UIManager {
  static renderMessages() {
    const container = document.getElementById('messagesContainer');
    
    // Don't re-render if we're currently streaming
    if (state.currentStreamingRenderer) {
      return;
    }
    
    container.innerHTML = '';

    if (state.messages.length === 0) {
      container.innerHTML = `
        <div class="welcome-message">
          <div class="welcome-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="1.5"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="1.5"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="1.5"/>
            </svg>
          </div>
          <h2>Добро пожаловать!</h2>
          <p>Выберите модель и начните диалог с AI ассистентом</p>
        </div>
      `;
      return;
    }

    state.messages.forEach((msg, index) => {
      const messageDiv = this.createMessageElement(msg, index);
      container.appendChild(messageDiv);
    });

    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });

    state.save();
  }

  static createStreamingMessageElement(msg, index) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${msg.role} streaming`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = msg.role === 'user' ? 'Вы' : `
      <div class="avatar-with-indicator">
        AI
        <span class="streaming-indicator"></span>
      </div>
    `;

    const content = document.createElement('div');
    content.className = 'message-content';

    const textDiv = document.createElement('div');
    textDiv.className = 'message-text markdown-content';
    textDiv.innerHTML = '<span class="streaming-cursor">▊</span>';
    
    content.appendChild(textDiv);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);

    return messageDiv;
  }

  static createMessageElement(msg, index) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${msg.role}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = msg.role === 'user' ? 'Вы' : 'AI';

    const content = document.createElement('div');
    content.className = 'message-content';

    // Add file indicators for user messages
    if (msg.files?.length) {
      const filesDiv = document.createElement('div');
      filesDiv.className = 'message-files';
      
      msg.files.forEach(file => {
        const fileIndicator = document.createElement('div');
        fileIndicator.className = 'message-file-indicator';
        
        if (file.type === 'image') {
          fileIndicator.innerHTML = `
            <img src="${file.data}" alt="${file.name}" class="message-image" onclick="UIManager.openImageModal('${file.data}')">
          `;
        } else {
          const icon = file.type === 'text' ? '📄' : 
                       file.type === 'pdf' ? '📑' : 
                       file.type === 'document' ? '📋' : '📎';
          fileIndicator.innerHTML = `
            <div class="file-badge">
              <span class="file-icon">${icon}</span>
              <span class="file-name">${file.name}</span>
              <span class="file-size">(${file.sizeFormatted})</span>
            </div>
          `;
        }
        
        filesDiv.appendChild(fileIndicator);
      });
      
      content.appendChild(filesDiv);
    }

    // Add message text
    if (state.editingMessageIndex === index) {
      // Show edit form
      const editForm = document.createElement('div');
      editForm.className = 'message-edit-form';
      editForm.innerHTML = `
        <textarea class="edit-textarea" id="editTextarea">${msg.content}</textarea>
        <div class="edit-buttons">
          <button onclick="ChatManager.saveEditedMessage(${index}, document.getElementById('editTextarea').value)" class="edit-save-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2"/>
            </svg>
            Сохранить
          </button>
          <button onclick="ChatManager.cancelEdit()" class="edit-cancel-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2"/>
            </svg>
            Отмена
          </button>
        </div>
      `;
      content.appendChild(editForm);
      
      setTimeout(() => {
        const textarea = document.getElementById('editTextarea');
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(textarea.value.length, textarea.value.length);
          Utils.adjustTextareaHeight(textarea);
        }
      }, 0);
    } else if (msg.content) {
      const textDiv = document.createElement('div');
      textDiv.className = 'message-text markdown-content';
      textDiv.innerHTML = MarkdownRenderer.format(msg.content);
      content.appendChild(textDiv);
    }

    // Add action buttons
    if (!msg.isStreaming && state.editingMessageIndex === null) {
      const actions = this.createMessageActions(msg, index);
      content.appendChild(actions);
    }

    // Add usage info
    if (msg.usage?.cost > 0) {
      const usageDiv = this.createUsageBlock(msg.usage);
      content.appendChild(usageDiv);
    }

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);

    return messageDiv;
  }

  static createMessageActions(msg, index) {
    const actions = document.createElement('div');
    actions.className = 'message-actions';

    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'action-btn';
    copyBtn.title = 'Копировать';
    copyBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" stroke-width="2"/>
      </svg>
    `;
    copyBtn.onclick = () => this.copyMessage(msg.content);

    actions.appendChild(copyBtn);

    if (msg.role === 'user') {
      // Edit button for user messages
      const editBtn = document.createElement('button');
      editBtn.className = 'action-btn';
      editBtn.title = 'Редактировать';
      editBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" stroke-width="2"/>
          <path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" stroke-width="2"/>
        </svg>
      `;
      editBtn.onclick = () => ChatManager.editMessage(index);
      actions.appendChild(editBtn);
    }

    if (msg.role === 'assistant') {
      // Regenerate button for assistant messages
      const regenerateBtn = document.createElement('button');
      regenerateBtn.className = 'action-btn';
      regenerateBtn.title = 'Перегенерировать';
      regenerateBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M1 4V10H7" stroke="currentColor" stroke-width="2"/>
          <path d="M23 20V14H17" stroke="currentColor" stroke-width="2"/>
          <path d="M20.49 9C19.9828 7.56678 19.1209 6.28502 17.9845 5.27542C16.8482 4.26582 15.4745 3.56095 13.9917 3.22426C12.5089 2.88758 10.9652 2.92899 9.50481 3.34587C8.04437 3.76275 6.71475 4.54183 5.64 5.61L1 10M23 14L18.36 18.39C17.2853 19.4582 15.9556 20.2373 14.4952 20.6541C13.0348 21.071 11.4911 21.1124 10.0083 20.7757C8.52547 20.4391 7.1518 19.7342 6.01547 18.7246C4.87913 17.715 4.01717 16.4332 3.51 15" stroke="currentColor" stroke-width="2"/>
        </svg>
      `;
      regenerateBtn.onclick = () => ChatManager.sendMessage(true);
      actions.appendChild(regenerateBtn);
    }

    return actions;
  }

  static copyMessage(content) {
    navigator.clipboard.writeText(content).then(() => {
      NotificationManager.success('Сообщение скопировано');
    }).catch(err => {
      console.error('Ошибка копирования:', err);
      NotificationManager.error('Ошибка копирования');
    });
  }

  static createUsageBlock(usage) {
    const div = document.createElement('div');
    div.className = 'message-usage';
    div.innerHTML = `
      <span>📊 Токены: ${usage.totalTokens}</span>
      <span>📥 Вход: ${usage.inputTokens}</span>
      <span>📤 Выход: ${usage.outputTokens}</span>
      <span>💰 $${usage.cost.toFixed(4)}</span>
    `;
    return div;
  }

  static openImageModal(src) {
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
      <div class="image-modal-overlay" onclick="this.parentElement.remove()"></div>
      <div class="image-modal-content">
        <button class="image-modal-close" onclick="this.closest('.image-modal').remove()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
        <img src="${src}" alt="Увеличенное изображение">
      </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
  }

  static renderChatHistory() {
    const container = document.getElementById('chatHistory');

    if (state.chats.length === 0) {
      container.innerHTML = '<div class="empty-history">Нет сохраненных чатов</div>';
      return;
    }

    container.innerHTML = state.chats.map(chat => `
      <div class="chat-item ${chat.id === state.currentChatId ? 'active' : ''}" 
           onclick="ChatManager.load('${chat.id}')">
        <div class="chat-item-content">
          <div class="chat-title">${Utils.escapeHtml(chat.title)}</div>
          <div class="chat-date">${Utils.formatDate(chat.updatedAt || chat.createdAt)}</div>
        </div>
        <button class="chat-delete" onclick="ChatManager.delete('${chat.id}', event)" title="Удалить чат">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
      </div>
    `).join('');
  }
}

// ============================================
// SETTINGS MANAGEMENT (WITH WEB SEARCH)
// ============================================

class SettingsManager {
  static initialize() {
    const settingsBtn = document.getElementById('settingsBtn');
    const modal = document.getElementById('settingsModal');
    const closeBtn = document.getElementById('closeSettingsBtn');
    const closeOverlay = document.getElementById('closeSettings');
    const saveBtn = document.getElementById('saveSettings');

    // Add web search toggle HTML
    this.addWebSearchToggle();

    settingsBtn.addEventListener('click', () => {
      modal.classList.add('active');
      this.loadToUI();
    });

    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    closeOverlay.addEventListener('click', () => modal.classList.remove('active'));
    saveBtn.addEventListener('click', () => {
      this.save();
      modal.classList.remove('active');
    });

    // Initialize sliders
    this.initializeSliders();
    
    // Web search toggle
    const webSearchToggle = document.getElementById('webSearchToggle');
    if (webSearchToggle) {
      webSearchToggle.addEventListener('change', () => {
        this.updateWebSearchAvailability();
      });
    }
  }

  static addWebSearchToggle() {
    const settingsContent = document.querySelector('.settings-content');
    if (!settingsContent) return;

    // Check if web search toggle already exists
    if (document.getElementById('webSearchToggle')) return;

    const webSearchGroup = document.createElement('div');
    webSearchGroup.className = 'settings-group';
    webSearchGroup.innerHTML = `
      <label class="settings-label">
        <span>Web Search</span>
        <span class="settings-hint">Разрешить модели искать информацию в интернете (если поддерживается)</span>
      </label>
      <div class="web-search-control">
        <label class="toggle-switch">
          <input type="checkbox" id="webSearchToggle">
          <span class="toggle-slider"></span>
        </label>
        <span id="webSearchStatus" class="web-search-status">Выключено</span>
      </div>
    `;

    // Insert before system prompt group
    const systemPromptGroup = settingsContent.querySelector('.settings-group:last-child');
    if (systemPromptGroup) {
      settingsContent.insertBefore(webSearchGroup, systemPromptGroup);
    } else {
      settingsContent.appendChild(webSearchGroup);
    }
  }

  static updateWebSearchAvailability() {
    const selectedModel = document.getElementById('modelSelect').value;
    const model = MODELS[selectedModel];
    const webSearchToggle = document.getElementById('webSearchToggle');
    const webSearchStatus = document.getElementById('webSearchStatus');

    if (!webSearchToggle || !webSearchStatus) return;

    if (model && model.supportWebSearch) {
      webSearchToggle.disabled = false;
      webSearchStatus.textContent = webSearchToggle.checked ? 'Включено' : 'Выключено';
      webSearchStatus.className = webSearchToggle.checked ? 'web-search-status active' : 'web-search-status';
    } else {
      webSearchToggle.disabled = true;
      webSearchStatus.textContent = 'Недоступно для этой модели';
      webSearchStatus.className = 'web-search-status disabled';
    }
  }

  static initializeSliders() {
    // Temperature slider
    const tempSlider = document.getElementById('temperature');
    const tempValue = document.getElementById('tempValue');
    tempSlider.addEventListener('input', () => {
      tempValue.textContent = (tempSlider.value / 10).toFixed(1);
    });

    // Top-P slider
    const topPSlider = document.getElementById('topP');
    const topPValue = document.getElementById('topPValue');
    topPSlider.addEventListener('input', () => {
      topPValue.textContent = (topPSlider.value / 100).toFixed(2);
    });

    // Max tokens slider
    const maxTokensSlider = document.getElementById('maxTokens');
    const maxTokensValue = document.getElementById('maxTokensValue');
    maxTokensSlider.addEventListener('input', () => {
      maxTokensValue.textContent = maxTokensSlider.value;
    });

    // System prompt preset
    const presetSelect = document.getElementById('systemPromptPreset');
    const promptText = document.getElementById('systemPromptText');
    presetSelect.addEventListener('change', () => {
      const preset = presetSelect.value;
      if (preset !== 'custom') {
        promptText.value = SYSTEM_PROMPTS[preset];
        promptText.disabled = true;
      } else {
        promptText.disabled = false;
      }
    });
  }

  static loadToUI() {
    document.getElementById('temperature').value = state.settings.temperature * 10;
    document.getElementById('tempValue').textContent = state.settings.temperature.toFixed(1);
    document.getElementById('topP').value = state.settings.topP * 100;
    document.getElementById('topPValue').textContent = state.settings.topP.toFixed(2);
    document.getElementById('maxTokens').value = state.settings.maxTokens || 2048;
    document.getElementById('maxTokensValue').textContent = state.settings.maxTokens || 2048;
    document.getElementById('systemPromptPreset').value = state.settings.systemPromptPreset;
    document.getElementById('systemPromptText').value = state.settings.systemPrompt;
    
    // Web search
    const webSearchToggle = document.getElementById('webSearchToggle');
    if (webSearchToggle) {
      webSearchToggle.checked = state.settings.webSearch || false;
      this.updateWebSearchAvailability();
    }
  }

  static save() {
    state.settings.temperature = document.getElementById('temperature').value / 10;
    state.settings.topP = document.getElementById('topP').value / 100;
    state.settings.maxTokens = parseInt(document.getElementById('maxTokens').value);
    state.settings.systemPrompt = document.getElementById('systemPromptText').value;
    state.settings.systemPromptPreset = document.getElementById('systemPromptPreset').value;
    
    // Save web search setting
    const webSearchToggle = document.getElementById('webSearchToggle');
    if (webSearchToggle) {
      state.settings.webSearch = webSearchToggle.checked;
    }
    
    state.save();
    NotificationManager.success('Настройки сохранены');
  }
}

// ============================================
// MODEL SELECTOR (WITH WEB SEARCH INDICATOR)
// ============================================

class ModelSelector {
  static initialize() {
    const select = document.getElementById('modelSelect');
    select.innerHTML = '';

    Object.entries(MODELS).forEach(([modelId, model]) => {
      const option = document.createElement('option');
      option.value = modelId;
      option.textContent = model.displayName + (model.supportWebSearch ? ' 🔍' : '');
      select.appendChild(option);
    });

    select.value = 'openai/chatgpt-4o-latest';
    select.addEventListener('change', () => this.update());
    this.update();
  }

  static update() {
    const selectedModel = document.getElementById('modelSelect').value;
    const model = MODELS[selectedModel];
    if (model) {
      // Update max tokens slider max value if needed
      const maxTokensSlider = document.getElementById('maxTokens');
      if (maxTokensSlider) {
        maxTokensSlider.max = model.maxTokens || 4096;
      }
      
      // Update web search availability
      SettingsManager.updateWebSearchAvailability();
    }
  }
}

// ============================================
// SETUP SCREEN
// ============================================

class SetupScreen {
  static initialize() {
    const form = document.getElementById('setupForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSetup();
    });
  }

  static async handleSetup() {
    const apiKeyInput = document.getElementById('apiKeyInput');
    const apiUrlInput = document.getElementById('apiUrlInput');
    const errorDiv = document.getElementById('setupError');

    const apiKey = apiKeyInput.value.trim();
    const apiUrl = apiUrlInput.value.trim() || DEFAULT_CONFIG.API_BASE_URL;

    if (!apiKey) {
      this.showError(errorDiv, 'Пожалуйста, введите API ключ');
      return;
    }

    try {
      errorDiv.textContent = 'Проверка API ключа...';
      errorDiv.classList.add('show');
      errorDiv.style.color = '#D97757';

      await ApiConfig.validate(apiKey, apiUrl);
      ApiConfig.set(apiKey, apiUrl);

      // Initialize app
      state.load();
      MarkdownRenderer.initialize();
      this.setupMainApp();
      SettingsManager.initialize();
      ModelSelector.initialize();
      this.setupChat();

      // Hide setup screen
      document.getElementById('setupScreen').classList.remove('active');
      this.showMainApp();
    } catch (error) {
      this.showError(errorDiv, error.message || 'Ошибка проверки API ключа');
    }
  }

  static showError(errorDiv, message) {
    errorDiv.textContent = message;
    errorDiv.style.color = '#EF4444';
    errorDiv.classList.add('show');
  }

  static setupMainApp() {
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const newChatBtn = document.getElementById('newChatBtn');
    const changeApiKeyBtn = document.getElementById('changeApiKeyBtn');
    const clearDataBtn = document.getElementById('clearDataBtn');

    menuBtn.addEventListener('click', () => sidebar.classList.toggle('active'));
    newChatBtn.addEventListener('click', () => ChatManager.create());

    if (changeApiKeyBtn) {
      changeApiKeyBtn.addEventListener('click', () => {
        if (confirm('Вы хотите изменить API ключ? Текущий ключ будет удален.')) {
          localStorage.removeItem(STORAGE_KEYS.API_KEY);
          localStorage.removeItem(STORAGE_KEYS.API_URL);
          location.reload();
        }
      });
    }

    if (clearDataBtn) {
      clearDataBtn.addEventListener('click', () => state.reset());
    }

    // Close sidebar on click outside
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 &&
          !sidebar.contains(e.target) &&
          !menuBtn.contains(e.target)) {
        sidebar.classList.remove('active');
      }
    });
  }

  static setupChat() {
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const attachBtn = document.getElementById('attachBtn');
    const fileInput = document.getElementById('fileInput');
    const messagesContainer = document.getElementById('messagesContainer');

    messageInput.addEventListener('input', () => {
      Utils.adjustTextareaHeight(messageInput);
      sendBtn.disabled = !messageInput.value.trim() && state.attachedFiles.length === 0;
    });

    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !sendBtn.disabled) {
        e.preventDefault();
        ChatManager.sendMessage();
      }
    });

    messageInput.addEventListener('paste', (e) => FileHandler.handlePaste(e));

    messagesContainer.addEventListener('dragover', (e) => FileHandler.handleDragOver(e));
    messagesContainer.addEventListener('drop', (e) => FileHandler.handleDrop(e));
    messagesContainer.addEventListener('dragleave', (e) => FileHandler.handleDragLeave(e));

    sendBtn.addEventListener('click', () => ChatManager.sendMessage());
    attachBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => FileHandler.handleFileSelect(e));
  }

  static showMainApp() {
    document.getElementById('mainApp').classList.add('active');
    UIManager.renderChatHistory();
    UIManager.renderMessages();
  }
}

// ============================================
// GLOBAL FUNCTIONS (for onclick handlers)
// ============================================

window.copyCode = function(button) {
  const codeBlock = button.closest('.code-block');
  const code = codeBlock.querySelector('code').textContent;

  navigator.clipboard.writeText(code).then(() => {
    const originalText = button.innerHTML;
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2"/>
      </svg> Скопировано!
    `;
    button.classList.add('copied');

    setTimeout(() => {
      button.innerHTML = originalText;
      button.classList.remove('copied');
    }, 2000);
  }).catch(err => console.error('Ошибка копирования:', err));
};

window.UIManager = UIManager;
window.ChatManager = ChatManager;

// ============================================
// APPLICATION INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const { apiKey } = ApiConfig.get();

  if (!apiKey) {
    const setupScreen = document.getElementById('setupScreen');
    if (setupScreen) setupScreen.classList.add('active');
    SetupScreen.initialize();
  } else {
    state.load();
    MarkdownRenderer.initialize();
    SetupScreen.setupMainApp();
    SettingsManager.initialize();
    ModelSelector.initialize();
    SetupScreen.setupChat();
    SetupScreen.showMainApp();
  }

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
      .catch(err => console.error('Service Worker registration failed:', err));
  }
});
