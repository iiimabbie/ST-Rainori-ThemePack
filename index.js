import { saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

const settingsKey = 'ST-ThemePack';
const baseUrl = new URL('.', import.meta.url);
const scriptBlock = /<script\b[^>]*>([\s\S]*?)<\/script>/i;

let themes = [];
let activeLink = null;
let activeModule = null;
// 連續切換時，只讓最後一次的載入生效。
let loadId = 0;

async function unload() {
    activeLink?.remove();
    activeLink = null;
    const previous = activeModule;
    activeModule = null;
    try {
        await previous?.cleanup?.();
    } catch (error) {
        console.error('[ST-ThemePack]', error);
    }
}

// CSS 用 <link> 載入，主題資料夾裡的相對網址才找得到；<script> 區塊另外當模組執行。
async function load(themeId) {
    const id = ++loadId;
    await unload();
    const theme = themes.find(item => item.id === themeId);
    if (!theme || id !== loadId) return;

    const cssUrl = new URL(theme.css, baseUrl);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssUrl.href;
    document.head.append(link);
    activeLink = link;

    try {
        const response = await fetch(cssUrl, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        const code = (await response.text()).match(scriptBlock)?.[1];
        if (!code?.trim() || id !== loadId) return;
        const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
        try {
            const module = await import(url);
            if (id === loadId) activeModule = module;
            else await module.cleanup?.();
        } finally {
            URL.revokeObjectURL(url);
        }
    } catch (error) {
        console.error('[ST-ThemePack]', error);
        toastr.error(`${theme.name}：${error.message}`);
    }
}

function buildPanel() {
    const select = document.createElement('select');
    select.id = 'st-themes-select';
    select.className = 'text_pole';
    select.append(new Option('不使用', ''));
    for (const theme of themes) select.append(new Option(theme.name, theme.id));
    select.value = extension_settings[settingsKey].theme;
    select.addEventListener('change', () => {
        extension_settings[settingsKey].theme = select.value;
        saveSettingsDebounced();
        load(select.value);
    });

    const hint = document.createElement('small');
    hint.textContent = '選了這裡的主題，就不要再同時套用同一套主題的 JSON（客製 CSS 會重複載入）。';

    const drawer = document.createElement('div');
    drawer.className = 'inline-drawer';
    drawer.innerHTML = `
        <div class="inline-drawer-toggle inline-drawer-header">
            <b>ST-ThemePack</b>
            <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content"></div>`;
    drawer.querySelector('.inline-drawer-content').append(select, hint);
    document.getElementById('extensions_settings2').append(drawer);
}

extension_settings[settingsKey] ??= {};
extension_settings[settingsKey].theme ??= '';
themes = await (await fetch(new URL('themes.json', baseUrl))).json();
load(extension_settings[settingsKey].theme);
buildPanel();
