// Storage keys
const STORAGE_KEYS = {
    API_KEY: 'ai_assistant_api_key',
    API_URL: 'ai_assistant_api_url',
    CHATS: 'ai_assistant_chats',
    SETTINGS: 'ai_assistant_settings',
    CURRENT_CHAT: 'ai_assistant_current_chat'
};

// Default configuration
const DEFAULT_CONFIG = {
    API_BASE_URL: 'https://gptunnel.ru/v1'
};

// Model Configurations
const MODELS = {
    // Ассистенты
    'assistant-ai9507204': {
        type: 'assistant',
        assistantCode: 'ai9507204',
        displayName: 'Claude 4.5 Sonnet',
        supportStreaming: true,
        customParams: {'maxContext':20}
    },
    'assistant-ai1608255': {
        type: 'assistant',
        assistantCode: 'ai1608255',
        displayName: 'Mega Searcher',
        supportStreaming: true,
        customParams: {'maxContext':20}
    },
    
    // Обычные модели
    'gemini-2.5-pro': {
        type: 'model',
        provider: 'google',
        displayName: 'Gemini 2.5 Pro thinking',
        maxOutputTokens: 32000,
        maxContextTokens: 1048576,
        supportThinking: true,
        maxThinkingTokens: 100000,
        supportedParams: ['temperature', 'topP'],
        paramNames: {
            maxTokens: 'max_completion_tokens',
            temperature: 'temperature',
            topP: 'topP'
        },
        pricing: {
            input: 0.005,
            output: 0.02
        }
    },
    'gemini-2.5-flash': {
        type: 'model',
        provider: 'google',
        displayName: 'Gemini 2.5 Flash thinking',
        maxOutputTokens: 32000,
        maxContextTokens: 1048576,
        supportThinking: true,
        maxThinkingTokens: 80000,
        supportedParams: ['temperature', 'topP'],
        paramNames: {
            maxTokens: 'max_completion_tokens',
            temperature: 'temperature',
            topP: 'topP'
        },
        pricing: {
            input: 0.006,
            output: 0.0020
        }
    },
    'gpt-5-high': {
        type: 'model',
        provider: 'openAI',
        displayName: 'GPT-5 High Reasoning',
        maxOutputTokens: 16000,
        maxContextTokens: 400000,
        supportThinking: true,
        supportedParams: [],
        paramNames: {
            maxTokens: 'max_completion_tokens',
            temperature: 'temperature',
        },
        presetParams: {
            reasoning_effort: 'high',
            verbosity: 'high',
        },
        pricing: {
            input: 0.006,
            output: 0.0020
        }
    },
    'gpt-5-medium': {
        type: 'model',
        provider: 'openAI',
        displayName: 'GPT-5 Medium Reasoning',
        maxOutputTokens: 16000,
        maxContextTokens: 400000,
        supportThinking: true,
        supportedParams: [],
        paramNames: {
            maxTokens: 'max_completion_tokens',
            temperature: 'temperature',
        },
        presetParams: {
            reasoning_effort: 'medium',
            verbosity: 'medium'
        },
        pricing: {
            input: 0.006,
            output: 0.0020
        }
    },
};

// App State
const state = {
    currentChatId: null,
    chats: [],
    messages: [],
    settings: {
        temperature: 0.7,
        topP: 0.95,
        systemPrompt: 'You are a helpful AI assistant.',
        systemPromptPreset: 'default'
    },
    attachedFiles: [],
    isProcessingPaste: false,
    assistantChatIds: {}, // Хранение chatId для каждого ассистента
    lastUsage: {
        inputTokens: 0,
        outputTokens: 0,
        thinkingTokens: 0,
        cost: 0
    }
};

// System Prompts
const systemPrompts = {
    default: 'You are a helpful AI assistant.',
    creative: 'You are a creative and imaginative AI assistant. Think outside the box and provide unique, innovative solutions.',
    technical: 'You are a technical expert AI assistant. Provide detailed, accurate technical information and code examples.',
    tutor: 'You are a patient and knowledgeable tutor. Explain concepts clearly and help users learn effectively.',
    custom: ''
};

// Utility function to generate chat ID for assistants (similar to Python's random.randint)
function generateAssistantChatId() {
    // Генерируем случайное число от 24 до 36 цифр
    const numDigits = Math.floor(Math.random() * (36 - 24 + 1)) + 24;
    
    // Генерируем строку с нужным количеством случайных цифр
    let result = '';
    
    // Первая цифра не должна быть 0
    result += Math.floor(Math.random() * 9) + 1;
    
    // Остальные цифры могут быть любыми от 0 до 9
    for (let i = 1; i < numDigits; i++) {
        result += Math.floor(Math.random() * 10);
    }
    
    return result;
}

// Get API Configuration from localStorage
function getApiConfig() {
    const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
    const apiUrl = localStorage.getItem(STORAGE_KEYS.API_URL) || DEFAULT_CONFIG.API_BASE_URL;
    
    return {
        apiKey,
        apiUrl
    };
}

// Set API Configuration to localStorage
function setApiConfig(apiKey, apiUrl) {
    localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
    localStorage.setItem(STORAGE_KEYS.API_URL, apiUrl || DEFAULT_CONFIG.API_BASE_URL);
}

// Clear all data
function clearAllData() {
    if (confirm('Вы уверены, что хотите удалить все данные, включая API ключ и историю чатов?')) {
        localStorage.clear();
        location.reload();
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    updateHTMLForApiKey();
    initializeApp();
    registerServiceWorker();
});

function updateHTMLForApiKey() {
    // Find and update the login screen to setup screen
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen) {
        loginScreen.id = 'setupScreen';
        loginScreen.className = 'login-screen setup-screen';
        
        // Update the content
        const loginCard = loginScreen.querySelector('.login-card');
        if (loginCard) {
            loginCard.innerHTML = `
                <div class="logo-container">
                    <div class="logo-circle">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2"/>
                            <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2"/>
                            <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </div>
                </div>
                <h1>AI Assistant</h1>
                <p class="subtitle">Введите API ключ для начала работы</p>
                <form id="setupForm" class="login-form">
                    <div class="input-group">
                        <input type="password" id="apiKeyInput" placeholder="API ключ от GPTunnel" required>
                        <input type="url" id="apiUrlInput" placeholder="API URL (опционально)" value="https://gptunnel.ru/v1">
                        <button type="submit" class="btn-primary">
                            <span>Сохранить и начать</span>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </button>
                    </div>
                    <div id="setupError" class="error-message"></div>
                    <div class="setup-hint" style="margin-top: 24px; font-size: 13px; color: #A0A0A0; text-align: center;">
                        API ключ будет сохранен локально в вашем браузере
                    </div>
                </form>
            `;
        }
    }
    
    // Update logout button to API key change button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.id = 'changeApiKeyBtn';
        logoutBtn.className = 'api-key-btn';
        logoutBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M15.7 7.3L18 9.6M9 3H7C5.11438 3 4.17157 3 3.58579 3.58579C3 4.17157 3 5.11438 3 7V9C3 10.8856 3 11.8284 3.58579 12.4142C4.17157 13 5.11438 13 7 13H9C10.8856 13 11.8284 13 12.4142 12.4142C13 11.8284 13 10.8856 13 9V7C13 5.11438 13 4.17157 12.4142 3.58579C11.8284 3 10.8856 3 9 3Z" stroke="currentColor" stroke-width="2"/>
                <path d="M15 11V13C15 14.8856 15 15.8284 15.5858 16.4142C16.1716 17 17.1144 17 19 17C20.8856 17 21.8284 17 22.4142 16.4142C23 15.8284 23 14.8856 23 13C23 11.1144 23 10.1716 22.4142 9.58579C21.8284 9 20.8856 9 19 9C17.1144 9 16.1716 9 15.5858 9.58579C15 10.1716 15 11.1144 15 13Z" stroke="currentColor" stroke-width="2"/>
            </svg>
            Изменить API ключ
        `;
        
        // Add clear data button
        const sidebarFooter = logoutBtn.parentElement;
        if (sidebarFooter && !document.getElementById('clearDataBtn')) {
            const clearBtn = document.createElement('button');
            clearBtn.id = 'clearDataBtn';
            clearBtn.className = 'clear-data-btn';
            clearBtn.style.cssText = 'margin-top: 8px; width: 100%; padding: 16px; font-size: 14px; font-weight: 600; color: var(--text-secondary); background: transparent; border: 2px solid var(--border); border-radius: var(--radius-lg); cursor: pointer; transition: var(--transition-spring); display: flex; align-items: center; justify-content: center; gap: var(--spacing-sm);';
            clearBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M3 6H21M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M10 11V17M14 11V17M4 6L5 19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19L20 6" stroke="currentColor" stroke-width="2"/>
                </svg>
                Очистить данные
            `;
            sidebarFooter.appendChild(clearBtn);
        }
    }
}

function initializeApp() {
    const { apiKey } = getApiConfig();
    
    if (!apiKey) {
        showSetupScreen();
    } else {
        loadState();
        initializeMarkdown();
        setupMainApp();
        setupSettings();
        setupChat();
        setupModelSelector();
        showMainApp();
    }
}

function showSetupScreen() {
    const setupScreen = document.getElementById('setupScreen');
    const setupForm = document.getElementById('setupForm');
    
    if (setupScreen) {
        setupScreen.classList.add('active');
    }
    
    if (setupForm) {
        setupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleSetup();
        });
    }
}

async function handleSetup() {
    const apiKeyInput = document.getElementById('apiKeyInput');
    const apiUrlInput = document.getElementById('apiUrlInput');
    const errorDiv = document.getElementById('setupError');
    
    const apiKey = apiKeyInput.value.trim();
    const apiUrl = apiUrlInput.value.trim() || DEFAULT_CONFIG.API_BASE_URL;
    
    if (!apiKey) {
        errorDiv.textContent = 'Пожалуйста, введите API ключ';
        errorDiv.classList.add('show');
        return;
    }
    
    // Test API key
    try {
        errorDiv.textContent = 'Проверка API ключа...';
        errorDiv.classList.add('show');
        errorDiv.style.color = '#D97757';
        
        const testResponse = await fetch(`${apiUrl}/models`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });
        
        if (!testResponse.ok) {
            throw new Error('Неверный API ключ или URL');
        }
        
        // Save API configuration
        setApiConfig(apiKey, apiUrl);
        
        // Initialize app
        loadState();
        initializeMarkdown();
        setupMainApp();
        setupSettings();
        setupChat();
        setupModelSelector();
        
        // Hide setup screen and show main app
        document.getElementById('setupScreen').classList.remove('active');
        showMainApp();
        
    } catch (error) {
        errorDiv.textContent = error.message || 'Ошибка проверки API ключа';
        errorDiv.style.color = '#EF4444';
        errorDiv.classList.add('show');
    }
}

function showMainApp() {
    document.getElementById('mainApp').classList.add('active');
    const setupScreen = document.getElementById('setupScreen');
    if (setupScreen) {
        setupScreen.classList.remove('active');
    }
    loadUserSettings();
    renderChatHistory();
    // Исправление: отображаем сообщения при загрузке страницы
    renderMessages();
}

// Service Worker Registration
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('service-worker.js');
            console.log('Service Worker registered');
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
}

// Model Selector Setup
function setupModelSelector() {
    const modelSelect = document.getElementById('modelSelect');
    modelSelect.innerHTML = '';
    
    Object.entries(MODELS).forEach(([modelId, model]) => {
        const option = document.createElement('option');
        option.value = modelId;
        option.textContent = model.displayName;
        modelSelect.appendChild(option);
    });
    
    modelSelect.value = 'gemini-2.5-pro';
    modelSelect.addEventListener('change', updateModelSettings);
    updateModelSettings();
}

function updateModelSettings() {
    const selectedModel = document.getElementById('modelSelect').value;
    const model = MODELS[selectedModel];
    
    if (!model) return;
    
    // Скрываем настройки температуры и topP для ассистентов
    const tempGroup = document.getElementById('temperatureGroup');
    const topPGroup = document.getElementById('topPGroup');
    
    if (model.type === 'assistant') {
        // Для ассистентов скрываем все настройки параметров
        if (tempGroup) tempGroup.style.display = 'none';
        if (topPGroup) topPGroup.style.display = 'none';
    } else {
        // Для обычных моделей показываем в зависимости от поддержки
        if (tempGroup) {
            tempGroup.style.display = model.supportedParams?.includes('temperature') ? 'block' : 'none';
        }
        if (topPGroup) {
            topPGroup.style.display = model.supportedParams?.includes('topP') ? 'block' : 'none';
        }
    }
}

// Main App Setup
function setupMainApp() {
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const newChatBtn = document.getElementById('newChatBtn');
    const changeApiKeyBtn = document.getElementById('changeApiKeyBtn');
    const clearDataBtn = document.getElementById('clearDataBtn');
    
    menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
    
    newChatBtn.addEventListener('click', createNewChat);
    
    // Change API key handler
    if (changeApiKeyBtn) {
        changeApiKeyBtn.addEventListener('click', () => {
            if (confirm('Вы хотите изменить API ключ? Текущий ключ будет удален.')) {
                localStorage.removeItem(STORAGE_KEYS.API_KEY);
                localStorage.removeItem(STORAGE_KEYS.API_URL);
                location.reload();
            }
        });
    }
    
    // Clear data handler
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', clearAllData);
    }
    
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }
    });
}

// Settings
function setupSettings() {
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettings = document.getElementById('closeSettings');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const saveSettings = document.getElementById('saveSettings');
    
    if (!settingsBtn || !settingsModal) return;
    
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('active');
        loadSettingsToUI();
    });
    
    if (closeSettings) {
        closeSettings.addEventListener('click', () => {
            settingsModal.classList.remove('active');
        });
    }
    
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.classList.remove('active');
        });
    }
    
    const tempSlider = document.getElementById('temperature');
    const tempValue = document.getElementById('tempValue');
    if (tempSlider && tempValue) {
        tempSlider.addEventListener('input', () => {
            const value = tempSlider.value / 10;
            tempValue.textContent = value.toFixed(1);
        });
    }
    
    const topPSlider = document.getElementById('topP');
    const topPValue = document.getElementById('topPValue');
    if (topPSlider && topPValue) {
        topPSlider.addEventListener('input', () => {
            const value = topPSlider.value / 100;
            topPValue.textContent = value.toFixed(2);
        });
    }
    
    const presetSelect = document.getElementById('systemPromptPreset');
    const promptText = document.getElementById('systemPromptText');
    if (presetSelect && promptText) {
        presetSelect.addEventListener('change', () => {
            const preset = presetSelect.value;
            if (preset !== 'custom') {
                promptText.value = systemPrompts[preset];
                promptText.disabled = true;
            } else {
                promptText.disabled = false;
            }
        });
    }
    
    if (saveSettings) {
        saveSettings.addEventListener('click', () => {
            saveUserSettings();
            settingsModal.classList.remove('active');
        });
    }
}

function loadSettingsToUI() {
    document.getElementById('temperature').value = state.settings.temperature * 10;
    document.getElementById('tempValue').textContent = state.settings.temperature.toFixed(1);
    
    const topPSlider = document.getElementById('topP');
    if (topPSlider) {
        topPSlider.value = state.settings.topP * 100;
        document.getElementById('topPValue').textContent = state.settings.topP.toFixed(2);
    }
    
    document.getElementById('systemPromptPreset').value = state.settings.systemPromptPreset;
    document.getElementById('systemPromptText').value = state.settings.systemPrompt;
}

function saveUserSettings() {
    state.settings.temperature = document.getElementById('temperature').value / 10;
    
    const topPSlider = document.getElementById('topP');
    if (topPSlider) {
        state.settings.topP = topPSlider.value / 100;
    }
    
    state.settings.systemPrompt = document.getElementById('systemPromptText').value;
    state.settings.systemPromptPreset = document.getElementById('systemPromptPreset').value;
    saveState();
}

// Chat Functions
function setupChat() {
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const attachBtn = document.getElementById('attachBtn');
    const fileInput = document.getElementById('fileInput');
    
    messageInput.addEventListener('input', () => {
        adjustTextareaHeight(messageInput);
        sendBtn.disabled = messageInput.value.trim() === '';
    });
    
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!sendBtn.disabled) {
                sendMessage();
            }
        }
    });
    
    messageInput.addEventListener('paste', handlePaste);
    
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
        messagesContainer.addEventListener('dragover', handleDragOver);
        messagesContainer.addEventListener('drop', handleDrop);
        messagesContainer.addEventListener('dragleave', handleDragLeave);
    }
    
    sendBtn.addEventListener('click', sendMessage);
    attachBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
}

async function handlePaste(e) {
    if (state.isProcessingPaste) return;
    
    const items = e.clipboardData?.items;
    if (!items) return;
    
    let hasImage = false;
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        if (item.type.indexOf('image') !== -1) {
            e.preventDefault();
            hasImage = true;
            
            state.isProcessingPaste = true;
            
            const blob = item.getAsFile();
            if (blob) {
                await processImageFile(blob, `Изображение из буфера ${Date.now()}.png`);
            }
            
            setTimeout(() => {
                state.isProcessingPaste = false;
            }, 100);
            
            break;
        }
    }
    
    if (hasImage) {
        showNotification('Изображение добавлено из буфера обмена', 'success');
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const messagesContainer = document.getElementById('messagesContainer');
    messagesContainer.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const messagesContainer = document.getElementById('messagesContainer');
    messagesContainer.classList.remove('drag-over');
}

async function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const messagesContainer = document.getElementById('messagesContainer');
    messagesContainer.classList.remove('drag-over');
    
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    
    let imageCount = 0;
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
            await processImageFile(file, file.name);
            imageCount++;
        }
    }
    
    if (imageCount > 0) {
        showNotification(`Добавлено изображений: ${imageCount}`, 'success');
    }
}

async function processImageFile(file, fileName) {
    return new Promise((resolve, reject) => {
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            showNotification('Файл слишком большой (макс 10MB)', 'error');
            reject(new Error('File too large'));
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const filePreview = document.getElementById('filePreview');
            const fileItem = createFilePreviewItem(e.target.result, fileName);
            filePreview.appendChild(fileItem);
            
            state.attachedFiles.push({
                type: 'image',
                data: e.target.result,
                name: fileName,
                size: file.size
            });
            
            resolve();
        };
        
        reader.onerror = () => {
            showNotification('Ошибка чтения файла', 'error');
            reject(reader.error);
        };
        
        reader.readAsDataURL(file);
    });
}

function adjustTextareaHeight(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

function createNewChat() {
    if (state.currentChatId && state.messages.length > 0) {
        updateCurrentChat();
    }
    
    const chatId = Date.now().toString();
    const chat = {
        id: chatId,
        title: 'Новый чат',
        messages: [],
        assistantChatIds: {}, // Сохраняем chatId ассистентов для этого чата
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    state.chats.unshift(chat);
    state.currentChatId = chatId;
    state.messages = [];
    state.assistantChatIds = {}; // Очищаем chatId ассистентов для нового чата
    
    saveState();
    renderChatHistory();
    renderMessages();
    
    document.getElementById('sidebar').classList.remove('active');
}

async function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    
    for (const file of files) {
        if (file.type.startsWith('image/')) {
            await processImageFile(file, file.name);
        }
    }
    
    e.target.value = '';
}

function showNotification(message, type = 'info') {
    let notificationContainer = document.getElementById('notificationContainer');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notificationContainer';
        notificationContainer.className = 'notification-container';
        document.body.appendChild(notificationContainer);
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
    notification.innerHTML = `
        <span class="notification-icon">${icon}</span>
        <span class="notification-message">${message}</span>
    `;
    
    notificationContainer.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function createFilePreviewItem(src, name) {
    const item = document.createElement('div');
    item.className = 'file-item';
    
    const img = document.createElement('img');
    img.src = src;
    img.alt = name;
    img.title = name;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'file-item-remove';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Удалить';
    removeBtn.onclick = () => {
        item.remove();
        state.attachedFiles = state.attachedFiles.filter(f => f.data !== src);
        showNotification('Изображение удалено', 'info');
    };
    
    const fileName = document.createElement('div');
    fileName.className = 'file-item-name';
    fileName.textContent = name.length > 20 ? name.substring(0, 17) + '...' : name;
    fileName.title = name;
    
    item.appendChild(img);
    item.appendChild(removeBtn);
    item.appendChild(fileName);
    
    return item;
}

async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message && state.attachedFiles.length === 0) return;
    
    const userMessage = {
        role: 'user',
        content: message,
        files: [...state.attachedFiles],
        timestamp: new Date().toISOString()
    };
    
    state.messages.push(userMessage);
    renderMessages();
    
    messageInput.value = '';
    messageInput.style.height = 'auto';
    document.getElementById('sendBtn').disabled = true;
    document.getElementById('filePreview').innerHTML = '';
    state.attachedFiles = [];
    
    const assistantMessage = {
        role: 'assistant',
        content: '',
        thinking: '',
        usage: null,
        timestamp: new Date().toISOString()
    };
    
    state.messages.push(assistantMessage);
    const assistantIndex = state.messages.length - 1;
    showTypingIndicator();
    
    try {
        await callAI(message, userMessage.files, (chunk) => {
            if (chunk.thinking) {
                state.messages[assistantIndex].thinking = 
                    (state.messages[assistantIndex].thinking || '') + chunk.thinking;
            }
            if (chunk.content) {
                state.messages[assistantIndex].content = 
                    (state.messages[assistantIndex].content || '') + chunk.content;
            }
            if (chunk.usage) {
                state.messages[assistantIndex].usage = chunk.usage;
            }
            hideTypingIndicator();
            renderMessages();
        });
        
        hideTypingIndicator();
        renderMessages();
        updateCurrentChat();
        saveState();
        
        if (state.messages[assistantIndex] && state.messages[assistantIndex].usage) {
            showUsageInfo(state.messages[assistantIndex].usage);
        }
        
    } catch (error) {
        hideTypingIndicator();
        console.error('Error calling AI:', error);
        showError('Произошла ошибка: ' + error.message);
        state.messages.pop();
        renderMessages();
    }
}

async function callAI(message, files = [], onChunk = null) {
    const { apiKey, apiUrl } = getApiConfig();
    
    if (!apiKey) {
        throw new Error('API ключ не найден. Пожалуйста, перезагрузите страницу.');
    }
    
    const selectedModel = document.getElementById('modelSelect').value;
    const model = MODELS[selectedModel];
    
    if (!model) {
        throw new Error('Model not found');
    }
    
    // Обработка для ассистентов
    if (model.type === 'assistant') {
        return await callAssistantAPI(message, model, onChunk);
    }
    
    // Обработка для обычных моделей
    return await callModelAPI(message, files, model, onChunk);
}

async function callAssistantAPI(message, model, onChunk) {
    const { apiKey, apiUrl } = getApiConfig();
    
    // Получаем или генерируем chatId для этого ассистента
    if (!state.assistantChatIds[model.assistantCode]) {
        state.assistantChatIds[model.assistantCode] = generateAssistantChatId();
    }
    const chatId = state.assistantChatIds[model.assistantCode];
    
    const requestBody = {
        message: message,
        chatId: chatId,
        assistantCode: model.assistantCode,
        stream: true,
        thinkingMode: true
    };
    
    // Добавляем кастомные параметры если есть
    if (model.customParams) {
        Object.assign(requestBody, model.customParams);
    }
    
    console.log('Assistant API Request:', requestBody);
    
    const response = await fetch(`${apiUrl}/assistant/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': apiKey // Без Bearer для ассистентов, как в testAPI.py
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let totalContent = '';
    
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.trim() === '') continue;
                
                try {
                    const data = JSON.parse(line);
                    console.log('Assistant response chunk:', data);
                    
                    if (data.delta) {
                        totalContent += data.delta;
                        if (onChunk) {
                            onChunk({ content: data.delta });
                        }
                    }
                } catch (e) {
                    console.warn('Failed to parse assistant response line:', line, e);
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
    
    return {
        content: totalContent,
        thinking: '',
        usage: null
    };
}

async function callModelAPI(message, files, model, onChunk) {
    const { apiKey, apiUrl } = getApiConfig();
    
    const messages = [];
    
    // Добавляем system prompt
    const systemRole = model.provider === 'google' ? 'developer' : 'system';
    messages.push({
        role: systemRole,
        content: state.settings.systemPrompt
    });
    
    // Добавляем историю сообщений
    for (let i = 0; i < state.messages.length - 1; i++) {
        const msg = state.messages[i];
        
        if (msg.role === 'user') {
            const parts = [];
            
            if (msg.content) {
                parts.push({ type: 'text', text: msg.content });
            }
            
            if (msg.files && msg.files.length > 0) {
                msg.files.forEach(file => {
                    if (file.type === 'image') {
                        parts.push({
                            type: 'image_url',
                            image_url: { url: file.data }
                        });
                    }
                });
            }
            
            messages.push({
                role: 'user',
                content: parts.length > 1 ? parts : msg.content
            });
        } else if (msg.role === 'assistant' && msg.content) {
            messages.push({
                role: 'assistant',
                content: msg.content
            });
        }
    }
    
    const baseModelName = selectedModel.replace(/-high|-medium|-low/g, '');
    
    const requestBody = {
        model: model.provider === 'openAI' && model.supportThinking ? baseModelName : selectedModel,
        messages: messages,
        stream: false, // Для обычных моделей отключаем streaming
    };
    // Добавляем параметры модели
    if (model.supportedParams?.includes('temperature')) {
        requestBody[model.paramNames.temperature] = state.settings.temperature;
    }
    
    if (model.supportedParams?.includes('topP') && model.paramNames.topP) {
        requestBody[model.paramNames.topP] = state.settings.topP;
    }
    
    if (model.presetParams) {
        Object.assign(requestBody, model.presetParams);
    }
    console.log('Model API Request:', requestBody);
    const response = await fetch(`${apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Model API Response:', data);
    
    let content = '';
    let thinking = '';
    let usage = null;
    
    if (data.choices && data.choices[0]) {
        const choice = data.choices[0];
        
        if (choice.message) {
            content = choice.message.content || '';
            thinking = choice.message.reasoning || choice.message.thinking || '';
        }
    }
    
    if (data.usage) {
        if (data.usage.completion_tokens_details?.reasoning_tokens) {
            data.usage.thinking_tokens = data.usage.completion_tokens_details.reasoning_tokens;
        }
        usage = calculateUsage(data, model);
    }
    
    // Вызываем onChunk с полным ответом для обычных моделей
    if (onChunk) {
        if (thinking) onChunk({ thinking });
        if (content) onChunk({ content });
        if (usage) onChunk({ usage });
    }
    
    return {
        content,
        thinking,
        usage
    };
}

function updateCurrentChat() {
    if (!state.currentChatId) {
        const chatId = Date.now().toString();
        const chat = {
            id: chatId,
            title: 'Новый чат',
            messages: [...state.messages],
            assistantChatIds: {...state.assistantChatIds},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        state.chats.unshift(chat);
        state.currentChatId = chatId;
    }
    
    const chat = state.chats.find(c => c.id === state.currentChatId);
    if (chat) {
        chat.messages = [...state.messages];
        chat.assistantChatIds = {...state.assistantChatIds};
        
        if (!chat.title || chat.title === 'Новый чат') {
            const firstUserMessage = state.messages.find(m => m.role === 'user');
            if (firstUserMessage && firstUserMessage.content) {
                chat.title = firstUserMessage.content.substring(0, 50) + 
                    (firstUserMessage.content.length > 50 ? '...' : '');
            }
        }
        
        chat.updatedAt = new Date().toISOString();
        saveState();
        renderChatHistory();
    }
}

function loadChat(chatId) {
    const chat = state.chats.find(c => c.id === chatId);
    if (chat) {
        state.currentChatId = chatId;
        state.messages = chat.messages || [];
        state.assistantChatIds = chat.assistantChatIds || {};
        renderMessages();
        renderChatHistory();
        
        document.getElementById('sidebar').classList.remove('active');
    }
}

function deleteChat(chatId, event) {
    event.stopPropagation();
    
    if (confirm('Удалить этот чат?')) {
        state.chats = state.chats.filter(c => c.id !== chatId);
        
        if (state.currentChatId === chatId) {
            if (state.chats.length > 0) {
                loadChat(state.chats[0].id);
            } else {
                createNewChat();
            }
        }
        
        saveState();
        renderChatHistory();
    }
}

function renderChatHistory() {
    const historyContainer = document.getElementById('chatHistory');
    
    if (state.chats.length === 0) {
        historyContainer.innerHTML = '<div class="empty-history">Нет сохраненных чатов</div>';
        return;
    }
    
    historyContainer.innerHTML = state.chats.map(chat => `
        <div class="chat-item ${chat.id === state.currentChatId ? 'active' : ''}" 
             onclick="loadChat('${chat.id}')">
            <div class="chat-item-content">
                <div class="chat-title">${escapeHtml(chat.title)}</div>
                <div class="chat-date">${formatDate(chat.updatedAt || chat.createdAt)}</div>
            </div>
            <button class="chat-delete" onclick="deleteChat('${chat.id}', event)" title="Удалить чат">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2"/>
                </svg>
            </button>
        </div>
    `).join('');
}

function calculateUsage(response, model) {
    const usage = {
        inputTokens: 0,
        outputTokens: 0,
        thinkingTokens: 0,
        totalTokens: 0,
        cost: 0
    };
    
    if (response.usage) {
        usage.inputTokens = response.usage.prompt_tokens || 0;
        usage.outputTokens = response.usage.completion_tokens || 0;
        usage.totalTokens = response.usage.total_tokens || (usage.inputTokens + usage.outputTokens);
        
        if (response.usage.thinking_tokens) {
            usage.thinkingTokens = response.usage.thinking_tokens;
        } else if (response.usage.completion_tokens_details?.reasoning_tokens) {
            usage.thinkingTokens = response.usage.completion_tokens_details.reasoning_tokens;
        }
        
        // Для ассистентов не считаем стоимость, так как pricing не определен
        if (model.pricing) {
            const inputCost = (usage.inputTokens / 1000) * model.pricing.input;
            const outputCost = (usage.outputTokens / 1000) * model.pricing.output;
            usage.cost = inputCost + outputCost;
        } else {
            usage.cost = 0;
        }
    }
    
    return usage;
}

function showUsageInfo(usage) {
    if (!usage || usage.cost === 0) return; // Не показываем для ассистентов
    
    const usageDiv = document.createElement('div');
    usageDiv.className = 'usage-info';
    usageDiv.innerHTML = `
        <div style="background: var(--surface); border: 1px solid var(--border); padding: 12px; border-radius: 8px; font-size: 12px;">
            <div>Токены: ${usage.totalTokens} (вход: ${usage.inputTokens}, выход: ${usage.outputTokens}${usage.thinkingTokens > 0 ? `, мышление: ${usage.thinkingTokens}` : ''})</div>
            <div>Стоимость: $${usage.cost.toFixed(4)}</div>
        </div>
    `;
    usageDiv.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 999;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    `;
    document.body.appendChild(usageDiv);
    
    setTimeout(() => {
        usageDiv.style.transition = 'opacity 0.3s';
        usageDiv.style.opacity = '0';
        setTimeout(() => usageDiv.remove(), 300);
    }, 5000);
}

// Message Rendering
function renderMessages() {
    const messagesContainer = document.getElementById('messagesContainer');
    const typingIndicator = document.getElementById('typingIndicator');
    
    if (typingIndicator) {
        typingIndicator.style.display = 'none';
    }
    
    messagesContainer.innerHTML = '';
    
    if (state.messages.length === 0) {
        messagesContainer.innerHTML = `
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
        const messageDiv = createMessageElement(msg, index);
        messagesContainer.appendChild(messageDiv);
    });
    
    requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
    
    saveState();
}

window.openImageModal = function(src) {
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
};

function initializeMarkdown() {
    marked.setOptions({
        highlight: function(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return hljs.highlight(code, { language: lang }).value;
                } catch (err) {}
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
    
    renderer.code = function(code, language) {
        const validLang = language && hljs.getLanguage(language) ? language : 'plaintext';
        const highlighted = hljs.highlight(code, { language: validLang }).value;
        return `<div class="code-block">
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
        </div>`;
    };

    renderer.table = function(header, body) {
        return `<div class="table-wrapper">
            <table class="markdown-table">
                <thead>${header}</thead>
                <tbody>${body}</tbody>
            </table>
        </div>`;
    };

    renderer.link = function(href, title, text) {
        const titleAttr = title ? ` title="${title}"` : '';
        return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer" class="markdown-link">${text}</a>`;
    };

    marked.use({ renderer });
}

function formatMessage(content) {
    if (!content) return '';
    
    content = content.replace(/\\\$/g, '$');
    
    const mathBlocks = [];
    const mathInlines = [];
    
    content = content.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
        mathBlocks.push(formula.trim());
        return `<!--MATH_BLOCK_${mathBlocks.length - 1}-->`;
    });
    
    content = content.replace(/\\\[([\s\S]+?)\\\]/g, (match, formula) => {
        mathBlocks.push(formula.trim());
        return `<!--MATH_BLOCK_${mathBlocks.length - 1}-->`;
    });
    
    content = content.replace(/\$([^\$\n]+?)\$/g, (match, formula) => {
        mathInlines.push(formula.trim());
        return `<!--MATH_INLINE_${mathInlines.length - 1}-->`;
    });
    
    content = content.replace(/\\\((.+?)\\\)/g, (match, formula) => {
        mathInlines.push(formula.trim());
        return `<!--MATH_INLINE_${mathInlines.length - 1}-->`;
    });
    
    let formatted = marked.parse(content);
    
    formatted = formatted.replace(/<!--MATH_BLOCK_(\d+)-->/g, (match, index) => {
        const formula = mathBlocks[parseInt(index)];
        try {
            const rendered = katex.renderToString(formula, {
                displayMode: true,
                throwOnError: false,
                trust: true,
                strict: false,
                macros: {
                    "\\vec": "\\overrightarrow",
                    "\\nabla": "\\nabla"
                }
            });
            return `<div class="katex-display">${rendered}</div>`;
        } catch (e) {
            console.error('LaTeX block error:', e, 'Formula:', formula);
            return `<div class="math-error">Ошибка в формуле: ${escapeHtml(formula)}</div>`;
        }
    });
    
    formatted = formatted.replace(/<!--MATH_INLINE_(\d+)-->/g, (match, index) => {
        const formula = mathInlines[parseInt(index)];
        try {
            return katex.renderToString(formula, {
                displayMode: false,
                throwOnError: false,
                trust: true,
                strict: false,
                macros: {
                    "\\vec": "\\overrightarrow",
                    "\\nabla": "\\nabla"
                }
            });
        } catch (e) {
            console.error('LaTeX inline error:', e, 'Formula:', formula);
            return `<span class="math-error">Ошибка: ${escapeHtml(formula)}</span>`;
        }
    });
    
    formatted = formatted.replace(/<p>(<!--MATH_(BLOCK|INLINE)_\d+-->)<\/p>/g, '$1');
    
    return formatted;
}

function createMessageElement(msg, index) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${msg.role}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = msg.role === 'user' ? 'Вы' : 'AI';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    if (msg.files && msg.files.length > 0) {
        const imagesDiv = document.createElement('div');
        imagesDiv.className = 'message-images';
        msg.files.forEach(file => {
            if (file.type === 'image') {
                const img = document.createElement('img');
                img.src = file.data;
                img.alt = file.name;
                img.className = 'message-image';
                img.onclick = () => openImageModal(file.data);
                imagesDiv.appendChild(img);
            }
        });
        content.appendChild(imagesDiv);
    }
    
    if (msg.thinking && msg.thinking.trim()) {
        const thinkingContainer = document.createElement('div');
        thinkingContainer.className = 'thinking-container';
        
        const thinkingToggle = document.createElement('button');
        thinkingToggle.className = 'thinking-toggle';
        thinkingToggle.innerHTML = `
            <span class="thinking-icon">▶</span>
            <span>Процесс мышления (${msg.thinking.length} символов)</span>
        `;
        
        const thinkingContent = document.createElement('div');
        thinkingContent.className = 'thinking-content';
        thinkingContent.id = `thinking-${index}`;
        
        const thinkingText = document.createElement('div');
        thinkingText.className = 'thinking-text';
        thinkingText.textContent = msg.thinking;
        
        thinkingContent.appendChild(thinkingText);
        thinkingToggle.onclick = () => toggleThinking(`thinking-${index}`);
        
        thinkingContainer.appendChild(thinkingToggle);
        thinkingContainer.appendChild(thinkingContent);
        content.appendChild(thinkingContainer);
    }
    
    if (msg.content) {
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text markdown-content';
        textDiv.innerHTML = formatMessage(msg.content);
        content.appendChild(textDiv);
    }
    
    if (msg.usage && msg.usage.cost > 0) {
        const usageDiv = document.createElement('div');
        usageDiv.className = 'message-usage';
        usageDiv.innerHTML = `
            <span>📊 Токены: ${msg.usage.totalTokens}</span>
            <span>📥 Вход: ${msg.usage.inputTokens}</span>
            <span>📤 Выход: ${msg.usage.outputTokens}</span>
            ${msg.usage.thinkingTokens > 0 ? `<span>🧠 Мышление: ${msg.usage.thinkingTokens}</span>` : ''}
            <span>💰 $${msg.usage.cost.toFixed(4)}</span>
        `;
        content.appendChild(usageDiv);
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    
    return messageDiv;
}

window.copyCode = function(button) {
    const codeBlock = button.closest('.code-block');
    const code = codeBlock.querySelector('code').textContent;
    
    navigator.clipboard.writeText(code).then(() => {
        const originalText = button.innerHTML;
        button.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2"/>
        </svg> Скопировано!`;
        button.classList.add('copied');
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Ошибка копирования:', err);
    });
};

function showTypingIndicator() {
    const container = document.getElementById('messagesContainer');
    const indicator = document.createElement('div');
    indicator.className = 'message assistant typing-message';
    indicator.innerHTML = `
        <div class="message-avatar">AI</div>
        <div class="message-content">
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;
    container.appendChild(indicator);
    container.scrollTop = container.scrollHeight;
}

function hideTypingIndicator() {
    const indicator = document.querySelector('.typing-message');
    if (indicator) {
        indicator.remove();
    }
}

window.toggleThinking = function(id) {
    const element = document.getElementById(id);
    const button = element.previousElementSibling;
    const icon = button.querySelector('.thinking-icon');
    
    if (element.classList.contains('expanded')) {
        element.classList.remove('expanded');
        icon.style.transform = 'rotate(0deg)';
    } else {
        element.classList.add('expanded');
        icon.style.transform = 'rotate(90deg)';
    }
};

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 86400000) return 'Сегодня';
    if (diff < 172800000) return 'Вчера';
    return date.toLocaleDateString('ru-RU');
}

// State Management
function saveState() {
    localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(state.chats));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
    localStorage.setItem(STORAGE_KEYS.CURRENT_CHAT, state.currentChatId);
}

function loadState() {
    const chats = localStorage.getItem(STORAGE_KEYS.CHATS);
    const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const currentChat = localStorage.getItem(STORAGE_KEYS.CURRENT_CHAT);
    
    if (chats) {
        state.chats = JSON.parse(chats);
    }
    
    if (settings) {
        state.settings = JSON.parse(settings);
    }
    
    if (currentChat) {
        state.currentChatId = currentChat;
        const chat = state.chats.find(c => c.id === currentChat);
        if (chat) {
            state.messages = chat.messages || [];
            state.assistantChatIds = chat.assistantChatIds || {};
        }
    }
}

function loadUserSettings() {
    // Settings are already loaded in loadState()
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-toast';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #EF4444;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 1000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => errorDiv.remove(), 3000);
}

// Global functions
window.loadChat = loadChat;
window.deleteChat = deleteChat;
