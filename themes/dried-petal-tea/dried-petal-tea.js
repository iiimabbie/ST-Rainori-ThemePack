const STORAGE_KEY = 'dried-petal-tea-mode';
const root = document.documentElement;
const host = document.getElementById('top-settings-holder');

function readMode() {
    try {
        return localStorage.getItem(STORAGE_KEY) === 'night' ? 'night' : 'day';
    } catch {
        return 'day';
    }
}

const button = document.createElement('button');
button.type = 'button';
button.id = 'dpt-mode-switch';
button.setAttribute('role', 'switch');
button.setAttribute('aria-label', '黑夜模式');

function applyMode(mode) {
    const isNight = mode === 'night';
    root.dataset.dptMode = mode;
    button.setAttribute('aria-checked', String(isNight));
    button.title = isNight ? '切換到白天模式' : '切換到黑夜模式';
}

function onClick() {
    const mode = root.dataset.dptMode === 'night' ? 'day' : 'night';
    applyMode(mode);
    try {
        localStorage.setItem(STORAGE_KEY, mode);
    } catch {
        // 無法儲存時，這次切換仍然有效
    }
}

function onStorage(event) {
    if (event.key === STORAGE_KEY) applyMode(readMode());
}

applyMode(readMode());
button.addEventListener('click', onClick);
window.addEventListener('storage', onStorage);
host?.appendChild(button);

export function cleanup() {
    button.removeEventListener('click', onClick);
    window.removeEventListener('storage', onStorage);
    button.remove();
    delete root.dataset.dptMode;
}
