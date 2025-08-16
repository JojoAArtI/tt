document.addEventListener('DOMContentLoaded', init);

// --- DOM ELEMENTS ---
const elements = {
    appContainer: document.querySelector('.app-container'),
    tabs: document.querySelectorAll('.tab-button'),
    tabContents: document.querySelectorAll('.tab-content'),
    wordsDisplay: document.getElementById('words-display'),
    hiddenInput: document.getElementById('hidden-input'),
    wpmValue: document.getElementById('wpm-value'),
    accuracyValue: document.getElementById('accuracy-value'),
    timeValue: document.getElementById('time-value'),
    restartBtn: document.getElementById('restart-btn'),
    pauseOverlay: document.getElementById('pause-overlay'),
    resultsModal: document.getElementById('results-modal'),
    finalWpm: document.getElementById('final-wpm'),
    finalAccuracy: document.getElementById('final-accuracy'),
    finalTime: document.getElementById('final-time'),
    rawWpmDisplay: document.getElementById('raw-wpm-display'),
    errorHeatmap: document.getElementById('error-heatmap'),
    copyResultsBtn: document.getElementById('copy-results-btn'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    historyList: document.getElementById('history-list'),
    historyChart: document.getElementById('history-chart'),
    themeToggle: document.getElementById('theme-toggle'),
    highContrastToggle: document.getElementById('high-contrast-toggle'),
    strictModeToggle: document.getElementById('strict-mode-toggle'),
    punctuationToggle: document.getElementById('punctuation-toggle'),
    numbersToggle: document.getElementById('numbers-toggle'),
    cursorBtns: document.querySelectorAll('.cursor-btn'),
    soundToggle: document.getElementById('sound-toggle'),
};

// --- GLOBAL STATE ---
const state = {
    test: 'time',
    duration: 30,
    wordCount: 25,
    status: 'idle', // 'idle', 'running', 'paused', 'ended'
    startTime: 0,
    endTime: 0,
    timerInterval: null,
    words: [],
    typedWords: [],
    wordIndex: 0,
    charIndex: 0,
    correctChars: 0,
    incorrectChars: 0,
    errors: {}, // { 'char': count }
    lastResult: null,
    history: [],
    settings: {
        theme: 'light',
        highContrast: false,
        strictMode: false,
        punctuation: false,
        numbers: false,
        cursorStyle: 'block',
        sound: false,
    },
    isMobile: /Mobi|Android/i.test(navigator.userAgent),
};

// --- DATA ---
let wordList = [];
const QUOTES = [
    "The only way to do great work is to love what you do.",
    "Believe you can and you're halfway there.",
    "The future belongs to those who believe in the beauty of their dreams.",
    "The best way to predict the future is to create it.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts."
];

// --- INITIALIZATION ---
async function init() {
    await fetchWords();
    loadSettings();
    loadHistory();
    applySettings();
    attachEventListeners();
    renderWords();
}

async function fetchWords() {
    try {
        const response = await fetch('words.json');
        if (!response.ok) throw new Error('words.json not found');
        wordList = await response.json();
    } catch (e) {
        console.error("Failed to load words.json:", e);
        wordList = ["the", "quick", "brown", "fox", "jumps", "over", "the", "lazy", "dog"];
    }
}

function attachEventListeners() {
    // Tab navigation
    elements.tabs.forEach(tab => tab.addEventListener('click', handleTabClick));

    // Test mode and option selection
    document.querySelectorAll('.mode-btn').forEach(btn => btn.addEventListener('click', handleModeChange));
    document.getElementById('time-options').addEventListener('click', handleOptionClick);
    document.getElementById('words-options').addEventListener('click', handleOptionClick);
    
    // Test input and restart
    elements.wordsDisplay.addEventListener('click', focusInput);
    elements.hiddenInput.addEventListener('input', handleInput);
    elements.hiddenInput.addEventListener('keydown', handleKeydown);
    elements.restartBtn.addEventListener('click', restartTest);

    // Pause/Resume
    elements.appContainer.addEventListener('click', handlePauseResume);
    elements.appContainer.addEventListener('touchstart', handlePauseResume);

    // Modal
    elements.modalCloseBtn.addEventListener('click', hideResults);
    elements.copyResultsBtn.addEventListener('click', copyResults);

    // Settings
    elements.themeToggle.addEventListener('change', handleThemeToggle);
    elements.highContrastToggle.addEventListener('change', handleHighContrastToggle);
    elements.strictModeToggle.addEventListener('change', handleSettingToggle);
    elements.punctuationToggle.addEventListener('change', handleSettingToggle);
    elements.numbersToggle.addEventListener('change', handleSettingToggle);
    elements.cursorBtns.forEach(btn => btn.addEventListener('click', handleCursorChange));
    elements.soundToggle.addEventListener('change', handleSettingToggle);

    // Prevent scrolling while typing on mobile
    elements.wordsDisplay.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
}

// --- STATE MANAGEMENT & UI UPDATES ---

function handleTabClick(e) {
    const tab = e.target;
    if (tab.classList.contains('active')) return;

    elements.tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    elements.tabContents.forEach(content => content.classList.add('hidden'));
    document.getElementById(tab.dataset.tab).classList.remove('hidden');

    if (tab.dataset.tab === 'history') {
        renderHistory();
    }
    focusInput();
}

function handleModeChange(e) {
    const mode = e.target.dataset.mode;
    state.test = mode;

    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');

    if (mode === 'time') {
        document.getElementById('time-options').classList.remove('hidden');
        document.getElementById('words-options').classList.add('hidden');
        state.duration = parseInt(document.querySelector('#time-options .active').dataset.value);
    } else {
        document.getElementById('time-options').classList.add('hidden');
        document.getElementById('words-options').classList.remove('hidden');
        state.wordCount = parseInt(document.querySelector('#words-options .active').dataset.value);
    }
    restartTest();
}

function handleOptionClick(e) {
    if (!e.target.matches('button')) return;
    const value = parseInt(e.target.dataset.value);
    
    document.querySelectorAll(`#${e.currentTarget.id} button`).forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');

    if (state.test === 'time') {
        state.duration = value;
    } else {
        state.wordCount = value;
    }
    restartTest();
}

function focusInput() {
    elements.hiddenInput.focus();
    elements.wordsDisplay.classList.add('focused');
}

function blurInput() {
    elements.hiddenInput.blur();
    elements.wordsDisplay.classList.remove('focused');
}

function generateWords() {
    const sourceWords = wordList;
    const numWords = state.test === 'time' ? 200 : state.wordCount;
    const words = [];
    for (let i = 0; i < numWords; i++) {
        const randomIndex = Math.floor(Math.random() * sourceWords.length);
        words.push(sourceWords[randomIndex]);
    }
    state.words = words;
    state.typedWords = Array(words.length).fill('');
}

function renderWords() {
    elements.wordsDisplay.innerHTML = state.words.map((word, wordIndex) => {
        const isCurrentWord = wordIndex === state.wordIndex;
        return `<span class="word ${isCurrentWord ? 'current-word' : ''}">${
            word.split('').map((char, charIndex) => {
                const isCurrentChar = isCurrentWord && charIndex === state.charIndex;
                const typedChar = state.typedWords[wordIndex][charIndex];
                let charClass = '';

                if (typedChar !== undefined) {
                    charClass = typedChar === char ? 'correct' : 'incorrect';
                }

                if (isCurrentChar) {
                    charClass += ` current-char ${state.settings.cursorStyle}`;
                }

                return `<span class="char ${charClass}">${char}</span>`;
            }).join('')
        }</span>`;
    }).join('');
    
    // Scroll the display to keep the current word visible
    const currentWordEl = document.querySelector('.current-word');
    if (currentWordEl) {
        currentWordEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function handleInput(e) {
    if (state.status !== 'running') {
        startTest();
    }
    
    const input = e.target.value;
    const currentWord = state.words[state.wordIndex];
    state.typedWords[state.wordIndex] = input;

    // Check for word completion
    if (input.endsWith(' ')) {
        const typedWord = input.trim();
        const wordMatch = typedWord === currentWord;

        if (state.settings.strictMode && typedWord.length < currentWord.length) {
            // Do not move to next word if not fully typed in strict mode
            e.target.value = typedWord; // Clear the trailing space
            return;
        }

        if (wordMatch) {
            state.correctChars += currentWord.length + 1; // +1 for space
        } else {
            state.incorrectChars += currentWord.length + 1;
            trackErrors(currentWord, typedWord);
        }

        // Move to the next word
        state.wordIndex++;
        state.charIndex = 0;
        e.target.value = '';

    } else {
        // Handle character-by-character input
        const char = input.slice(-1);
        const expectedChar = currentWord[input.length - 1];
        
        if (char !== expectedChar) {
            state.incorrectChars++;
            state.errors[expectedChar] = (state.errors[expectedChar] || 0) + 1;
            if (state.settings.sound && 'vibrate' in navigator) {
                navigator.vibrate(20);
            }
        } else {
            state.correctChars++;
        }
        state.charIndex = input.length;
    }

    renderWords();
    updateMetrics();

    // End test conditions
    if (state.test === 'words' && state.wordIndex >= state.wordCount) {
        endTest();
    }
}

function handleKeydown(e) {
    // Handle backspace
    if (e.key === 'Backspace') {
        // Prevent strict mode backspace over previous words
        if (state.settings.strictMode && e.target.value.length === 0) {
            e.preventDefault();
        }
        // Allow backspace within current word
        if (e.target.value.length > 0) {
            // Correction logic is handled by the input event
        }
    }

    // Prevent space at start of word
    if (e.key === ' ' && e.target.value.length === 0) {
        e.preventDefault();
    }
}

function trackErrors(expected, typed) {
    const minLength = Math.min(expected.length, typed.length);
    for (let i = 0; i < minLength; i++) {
        if (expected[i] !== typed[i]) {
            state.errors[expected[i]] = (state.errors[expected[i]] || 0) + 1;
        }
    }
    if (typed.length > expected.length) {
        // Extra characters
        state.errors['+'] = (state.errors['+'] || 0) + (typed.length - expected.length);
    }
}

function startTest() {
    state.status = 'running';
    state.startTime = Date.now();
    elements.restartBtn.textContent = 'Restart';
    elements.hiddenInput.focus();
    elements.wordsDisplay.classList.add('focused');
    
    if (state.test === 'time') {
        state.timerInterval = setInterval(updateTimer, 1000);
        setTimeout(endTest, state.duration * 1000);
    }
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    const remaining = state.duration - elapsed;
    elements.timeValue.textContent = `${remaining}s`;
}

function updateMetrics() {
    const elapsedMinutes = (Date.now() - state.startTime) / 60000;
    const wpm = (state.correctChars / 5) / elapsedMinutes || 0;
    const accuracy = (state.correctChars / (state.correctChars + state.incorrectChars)) * 100 || 0;

    elements.wpmValue.textContent = Math.round(wpm);
    elements.accuracyValue.textContent = `${Math.round(accuracy)}%`;
}

function endTest() {
    clearInterval(state.timerInterval);
    state.status = 'ended';
    state.endTime = Date.now();
    
    // Final calculations
    const elapsedMinutes = (state.endTime - state.startTime) / 60000;
    const typedEntries = state.typedWords.slice(0, state.wordIndex + 1);
    
    let correctWords = 0;
    typedEntries.forEach((word, i) => {
        if (word.trim() === state.words[i]) {
            correctWords++;
        }
    });

    const finalWPM = Math.round((correctWords / elapsedMinutes) || 0);
    const accuracy = Math.round((state.correctChars / (state.correctChars + state.incorrectChars)) * 100 || 0);
    const rawWPM = Math.round(((state.correctChars + state.incorrectChars) / 5) / elapsedMinutes || 0);
    
    const result = {
        wpm: finalWPM,
        accuracy: accuracy,
        rawWPM: rawWPM,
        mode: state.test,
        value: state.test === 'time' ? state.duration : state.wordCount,
        timestamp: new Date().toISOString(),
        errors: state.errors,
    };
    state.lastResult = result;
    state.history.unshift(result);
    if (state.history.length > 20) {
        state.history.pop();
    }
    saveHistory();
    
    showResults(result);
    resetTestState();
}

function showResults(result) {
    elements.finalWpm.textContent = result.wpm;
    elements.finalAccuracy.textContent = `${result.accuracy}%`;
    elements.finalTime.textContent = `${state.test === 'time' ? state.duration : 'N/A'}`;
    elements.rawWpmDisplay.innerHTML = `Raw WPM: <span>${result.rawWPM}</span>`;
    
    renderHeatmap(result.errors);
    elements.resultsModal.classList.remove('hidden');
    blurInput();
}

function hideResults() {
    elements.resultsModal.classList.add('hidden');
    focusInput();
}

function renderHeatmap(errors) {
    elements.errorHeatmap.innerHTML = '';
    const sortedErrors = Object.entries(errors).sort(([, a], [, b]) => b - a);
    sortedErrors.forEach(([char, count]) => {
        const heatmapChar = document.createElement('div');
        const intensity = Math.min(8, Math.floor(count / 2) + 1); // Clamp intensity
        heatmapChar.className = `heatmap-char mistake-${intensity}`;
        heatmapChar.textContent = char === '+' ? 'extra' : char;
        elements.errorHeatmap.appendChild(heatmapChar);
    });
}

function copyResults() {
    if (!state.lastResult) return;
    const result = state.lastResult;
    const text = `TypeFast Test Results\nMode: ${result.mode === 'time' ? `${result.value}s` : `${result.value} words`}\nWPM: ${result.wpm}\nAccuracy: ${result.accuracy}%\nRaw WPM: ${result.rawWPM}\n`;
    navigator.clipboard.writeText(text).then(() => {
        elements.copyResultsBtn.textContent = 'Copied!';
        setTimeout(() => elements.copyResultsBtn.textContent = 'Copy Results', 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}

function restartTest() {
    resetTestState();
    generateWords();
    renderWords();
    focusInput();
}

function resetTestState() {
    clearInterval(state.timerInterval);
    state.status = 'idle';
    state.wordIndex = 0;
    state.charIndex = 0;
    state.correctChars = 0;
    state.incorrectChars = 0;
    state.errors = {};
    elements.hiddenInput.value = '';
    elements.wpmValue.textContent = '0';
    elements.accuracyValue.textContent = '0%';
    elements.timeValue.textContent = state.test === 'time' ? `${state.duration}s` : '--';
    elements.wordsDisplay.classList.remove('focused');
    elements.restartBtn.textContent = 'Restart';
}

function handlePauseResume(e) {
    // Only pause when clicking on the test area and not input field
    if (e.target.closest('#test') && !e.target.closest('#hidden-input')) {
        if (state.status === 'running') {
            state.status = 'paused';
            clearInterval(state.timerInterval);
            elements.pauseOverlay.classList.remove('hidden');
            blurInput();
        } else if (state.status === 'paused') {
            state.status = 'running';
            elements.pauseOverlay.classList.add('hidden');
            state.startTime = Date.now() - (state.endTime - state.startTime); // Adjust start time
            elements.hiddenInput.focus();
            if (state.test === 'time') {
                state.timerInterval = setInterval(updateTimer, 1000);
            }
        }
    }
}

// --- HISTORY & SETTINGS ---

function loadSettings() {
    const savedSettings = JSON.parse(localStorage.getItem('typefastSettings'));
    if (savedSettings) {
        Object.assign(state.settings, savedSettings);
    }
}

function saveSettings() {
    localStorage.setItem('typefastSettings', JSON.stringify(state.settings));
}

function applySettings() {
    // Theme
    document.body.dataset.theme = state.settings.highContrast ? 'high-contrast' : state.settings.theme;
    elements.themeToggle.checked = state.settings.theme === 'dark';
    elements.highContrastToggle.checked = state.settings.highContrast;

    // Toggles
    elements.strictModeToggle.checked = state.settings.strictMode;
    elements.punctuationToggle.checked = state.settings.punctuation;
    elements.numbersToggle.checked = state.settings.numbers;
    elements.soundToggle.checked = state.settings.sound;

    // Cursor
    elements.cursorBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.cursor === state.settings.cursorStyle);
    });
}

function handleThemeToggle(e) {
    state.settings.theme = e.target.checked ? 'dark' : 'light';
    state.settings.highContrast = false; // Disable high contrast when changing theme
    saveSettings();
    applySettings();
}

function handleHighContrastToggle(e) {
    state.settings.highContrast = e.target.checked;
    saveSettings();
    applySettings();
}

function handleSettingToggle(e) {
    const settingName = e.target.id.replace('-toggle', '');
    state.settings[settingName.replace(/-./g, x => x[1].toUpperCase())] = e.target.checked;
    saveSettings();
}

function handleCursorChange(e) {
    state.settings.cursorStyle = e.target.dataset.cursor;
    saveSettings();
    elements.cursorBtns.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    renderWords(); // Re-render to show new cursor style
}

function loadHistory() {
    const savedHistory = JSON.parse(localStorage.getItem('typefastHistory'));
    if (savedHistory) {
        state.history = savedHistory;
    }
}

function saveHistory() {
    localStorage.setItem('typefastHistory', JSON.stringify(state.history));
}

function renderHistory() {
    elements.historyList.innerHTML = '';
    elements.historyChart.innerHTML = '';

    if (state.history.length === 0) {
        elements.historyList.innerHTML = '<p>No test results yet. Start typing to see your history!</p>';
        return;
    }

    // Render list
    state.history.forEach(result => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `<strong>${result.wpm} WPM</strong> | ${result.accuracy}% accuracy | ${result.mode === 'time' ? `${result.value}s` : `${result.value} words`} on ${new Date(result.timestamp).toLocaleDateString()}`;
        elements.historyList.appendChild(item);
    });

    // Render chart
    const maxWpm = Math.max(...state.history.map(r => r.wpm));
    state.history.slice(0, 10).forEach(result => {
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        const barHeight = (result.wpm / maxWpm) * 100;
        bar.style.height = `${barHeight}%`;
        elements.historyChart.appendChild(bar);
    });
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').then(reg => {
            console.log('Service Worker registered! Scope:', reg.scope);
        }).catch(err => {
            console.error('Service Worker registration failed:', err);
        });
    });
}
