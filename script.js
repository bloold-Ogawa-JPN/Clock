// --- 状態管理 (brightnessを追加) ---
let settings = { theme: 'dark', is24Hour: true, font: 'sans', color: '#ff9500', brightness: 100 };
let activeTab = 'clock';
let alarmTime = null;
let isAlarmSet = false;
let timerInterval = null;
let timerTimeLeft = 0;

// --- Web Audio API（アラーム音） ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playAlarmSound() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    osc.start();
    osc.stop(audioCtx.currentTime + 2.0);
}

// --- Notification API (Web通知機能) ---
function requestNotificationPermission() {
    if (!("Notification" in window)) {
        alert("このブラウザはWeb通知をサポートしていません。");
        return;
    }
    Notification.requestPermission().then(permission => {
        if (permission === "granted") alert("通知が許可されました！");
    });
}

function triggerNotification(title, message) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
            body: message,
            icon: "https://flaticon.com"
        });
    }
}

// --- 1. 全画面モード ---
function toggleFullscreen() {
    document.body.classList.toggle('fullscreen-mode');
    const isFull = document.body.classList.contains('fullscreen-mode');
    document.getElementById('fullscreen-guide').textContent = isFull ? "画面をタップしてメニューを表示" : "画面をタップして全画面表示";
}

// --- 2. タブ切り替え ---
function switchTab(tab) {
    activeTab = tab;
    document.getElementById('tab-clock').classList.toggle('active', tab === 'clock');
    document.getElementById('tab-alarm').classList.toggle('active', tab === 'alarm');
    document.getElementById('tab-timer').classList.toggle('active', tab === 'timer');
    document.getElementById('alarm-panel').style.display = (tab === 'alarm') ? 'flex' : 'none';
    document.getElementById('timer-panel').style.display = (tab === 'timer') ? 'flex' : 'none';
}

// --- 3. アラームロジック ---
function toggleAlarm() {
    const input = document.getElementById('alarm-time');
    const status = document.getElementById('alarm-status');
    const btn = document.getElementById('btn-alarm-toggle');

    if (!isAlarmSet) {
        if (!input.value) return alert('時間を入力してください');
        alarmTime = input.value;
        isAlarmSet = true;
        status.textContent = `${alarmTime} にセット中`;
        btn.textContent = '解除';
        btn.style.backgroundColor = '#ff3b30';
    } else {
        isAlarmSet = false;
        alarmTime = null;
        status.textContent = '未設定';
        btn.textContent = 'セット';
        btn.style.backgroundColor = 'var(--clock-color)';
    }
}

function checkAlarm(currentHHMM) {
    if (isAlarmSet && currentHHMM === alarmTime) {
        playAlarmSound();
        triggerNotification("⏰ アラーム", `${alarmTime} になりました！`);
        alert(`⏰ アラームの時間です！ (${alarmTime})`);
        toggleAlarm();
    }
}

// --- 4. タイマーロジック ---
function startTimer() {
    const min = parseInt(document.getElementById('timer-min').value) || 0;
    const sec = parseInt(document.getElementById('timer-sec').value) || 0;
    timerTimeLeft = (min * 60) + sec;
    if (timerTimeLeft <= 0) return;

    document.getElementById('timer-setup').style.display = 'none';
    document.getElementById('timer-countdown').style.display = 'flex';
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        timerTimeLeft--;
        updateTimerDisplay();
        if (timerTimeLeft <= 0) {
            clearInterval(timerInterval);
            playAlarmSound();
            triggerNotification("⏱️ タイマー完了", "設定した時間が経過しました。");
            alert('⏱️ タイマーの時間になりました！');
            resetTimer();
        }
    }, 1000);
}

function resetTimer() {
    clearInterval(timerInterval);
    document.getElementById('timer-setup').style.display = 'flex';
    document.getElementById('timer-countdown').style.display = 'none';
}

function updateTimerDisplay() {
    const m = String(Math.floor(timerTimeLeft / 60)).padStart(2, '0');
    const s = String(timerTimeLeft % 60).padStart(2, '0');
    document.getElementById('timer-display-text').textContent = `${m}:${s}`;
}

// --- 5. カラー変更ロジック ---
function changeClockColor(colorCode) {
    settings.color = colorCode;
    saveSettings();
    applyClockColor(colorCode);
}
function applyClockColor(colorCode) {
    document.documentElement.style.setProperty('--clock-color', colorCode);
    document.getElementById('clock-color-picker').value = colorCode;
    const actionBtns = document.querySelectorAll('.action-btn');
    actionBtns.forEach(btn => {
        if(btn.textContent !== '解除') btn.style.backgroundColor = colorCode;
    });
}

// --- 6. 明るさ変更（ディマー）ロジック ---
function changeBrightness(value) {
    settings.brightness = parseInt(value);
    saveSettings();
    applyBrightness(settings.brightness);
}
function applyBrightness(value) {
    // 0〜100 の値を 0.1〜1.0 の透明度に変換してCSS変数へ代入
    const opacity = value / 100;
    document.documentElement.style.setProperty('--clock-opacity', opacity);
    document.getElementById('brightness-slider').value = value;
}

// --- 7. 設定のロードと保存 ---
function loadSettings() {
    const saved = localStorage.getItem('clock_settings');
    if (saved) settings = JSON.parse(saved);
    applyTheme(settings.theme);
    applyFormat(settings.is24Hour);
    applyFont(settings.font);
    applyClockColor(settings.color || '#ff9500');
    applyBrightness(settings.brightness !== undefined ? settings.brightness : 100);
}
function saveSettings() { localStorage.setItem('clock_settings', JSON.stringify(settings)); }

function changeTheme(theme) { settings.theme = theme; saveSettings(); applyTheme(theme); }
function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    document.getElementById('btn-theme-dark').classList.toggle('active', theme === 'dark');
    document.getElementById('btn-theme-light').classList.toggle('active', theme === 'light');
}

function changeFormat(is24h) { settings.is24Hour = is24h; saveSettings(); applyFormat(is24h); updateClock(); }
function applyFormat(is24h) {
    document.getElementById('btn-format-24h').classList.toggle('active', is24h);
    document.getElementById('btn-format-12h').classList.toggle('active', !is24h);
}

// 5種のフォント切り替え
function changeFont(fontType) { settings.font = fontType; saveSettings(); applyFont(fontType); }
function applyFont(fontType) {
    document.body.setAttribute('data-font', fontType);
    document.getElementById('btn-font-sans').classList.toggle('active', fontType === 'sans');
    document.getElementById('btn-font-future').classList.toggle('active', fontType === 'future');
    document.getElementById('btn-font-pixel').classList.toggle('active', fontType === 'pixel');
    document.getElementById('btn-font-serif').classList.toggle('active', fontType === 'serif');
    document.getElementById('btn-font-mono').classList.toggle('active', fontType === 'mono');
}

// --- 8. メインクロック同期処理 ---
function updateClock() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const dayList = ['日', '月', '火', '水', '木', '金', '土'];
    document.getElementById('date').textContent = `${year}年${month}月${date}日 (${dayList[now.getDay()]})`;

    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const periodEl = document.getElementById('period');

    const currentHHMM = `${String(hours).padStart(2, '0')}:${minutes}`;
    checkAlarm(currentHHMM);

    if (settings.is24Hour) {
        periodEl.style.display = 'none';
        hours = String(hours).padStart(2, '0');
    } else {
        periodEl.style.display = 'inline-block';
        periodEl.textContent = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        hours = String(hours).padStart(2, '0');
    }

    document.getElementById('time-hours').textContent = hours;
    document.getElementById('time-minutes').textContent = minutes;
    document.getElementById('seconds').textContent = seconds;
}

// アプリケーション起動
loadSettings();
updateClock();
setInterval(updateClock, 1000);
