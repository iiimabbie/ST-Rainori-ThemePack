import { saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';
import { power_user } from '../../../power-user.js';

const settingsKey = 'ST-Rainori-ThemePack';
const baseUrl = new URL('.', import.meta.url);

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
        console.error('[ST-Rainori-ThemePack]', error);
    }
}

// CSS 用 <link> 載入，主題資料夾裡的相對網址才找得到；JS 以模組載入，換掉時呼叫它的 cleanup。
async function load(themeId) {
    const id = ++loadId;
    await unload();
    const theme = themes.find(item => item.id === themeId);
    if (!theme || id !== loadId) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL(theme.css, baseUrl).href;
    document.head.append(link);
    activeLink = link;

    if (!theme.js) return;
    try {
        // 瀏覽器會快取已載入的模組，同一個網址第二次 import 不會再執行，所以每次載入加上不同的查詢字串。
        const url = new URL(theme.js, baseUrl);
        url.searchParams.set('load', String(id));
        const module = await import(url.href);
        if (id === loadId) activeModule = module;
        else await module.cleanup?.();
    } catch (error) {
        console.error('[ST-Rainori-ThemePack]', error);
        toastr.error(`${theme.name}：${error.message}`);
    }
}

// 主題指定的酒館設定，透過原生控制項觸發，讓酒館自己套用畫面和存檔。
const controls = {
    chat_display: { selector: '#chat_display', event: 'change' },
    expand_message_actions: { selector: '#expandMessageActions', event: 'input' },
};

function applySettings(values) {
    for (const [key, value] of Object.entries(values)) {
        const { selector, event } = controls[key];
        const element = $(selector);
        if (typeof value === 'boolean') element.prop('checked', value);
        else element.val(String(value));
        element.trigger(event);
    }
}

// 換主題時先還原上一個主題改掉的設定，再記下這個主題要改的原值。
function switchSettings(themeId) {
    const settings = extension_settings[settingsKey];
    applySettings(settings.restore ?? {});
    const values = themes.find(item => item.id === themeId)?.settings ?? {};
    settings.restore = Object.fromEntries(Object.keys(values).map(key => [key, power_user[key]]));
    applySettings(values);
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
        switchSettings(select.value);
        saveSettingsDebounced();
        load(select.value);
    });

    const hint = document.createElement('small');
    hint.textContent = '選了這裡的主題，就不要再同時套用同一套主題的 JSON（客製 CSS 會重複載入）。';

    const drawer = document.createElement('div');
    drawer.className = 'inline-drawer';
    drawer.innerHTML = `
        <div class="inline-drawer-toggle inline-drawer-header">
            <b>Rainori Themes 🪴</b>
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
