import {
    DEFAULT_LANG,
    SUPPORTED_LANGS,
    LANGUAGE_META,
    I18N
} from "./i18n.js?v=20261023o";
import { MatchBoard } from "./match.js?v=20261023o";

const STORAGE_KEY = "coin999_partner_calc_v10_multilang_timezone";

const RATES = {
    hatch: {
        tokens: 14500,
        score: 170000
    },
    farm: {
        tokens: 7500,
        score: 90000
    },
    goldFarm: {
        tokens: 47000,
        score: 1120000
    }
};

const MODES = {
    hatch: {
        rateType: "hatch",
        targetKey: "hatch",
        count: 4,
        isGold: false,
        creatureType: "hatch"
    },
    farm: {
        rateType: "farm",
        targetKey: "farm",
        count: 4,
        isGold: false,
        creatureType: "farm"
    },
    goldHatch: {
        rateType: "hatch",
        targetKey: "goldHatch",
        count: 2,
        isGold: true,
        creatureType: "hatch"
    },
    goldFarm: {
        rateType: "goldFarm",
        targetKey: "goldFarm",
        count: 2,
        isGold: true,
        creatureType: "farm"
    }
};

const DEFAULT_DATA = {
    mode: "hatch",
    lang: DEFAULT_LANG,
    self: {
        name: "",
        score: 0
    },
    targets: {
        hatch: 340000,
        farm: 180000,
        goldHatch: 1900000,
        goldFarm: 1120000
    },
    members: {
        hatch: [
            { id: "hatch-1", name: "", nameType: "normal", nameNumber: 1, selfScore: 0, score: 0, avatar: "😍" },
            { id: "hatch-2", name: "", nameType: "normal", nameNumber: 2, selfScore: 0, score: 0, avatar: "🥰" },
            { id: "hatch-3", name: "", nameType: "normal", nameNumber: 3, selfScore: 0, score: 0, avatar: "😘" },
            { id: "hatch-4", name: "", nameType: "normal", nameNumber: 4, selfScore: 0, score: 0, avatar: "🤩" }
        ],
        farm: [
            { id: "farm-1", name: "", nameType: "normal", nameNumber: 1, selfScore: 0, score: 0, avatar: "😍" },
            { id: "farm-2", name: "", nameType: "normal", nameNumber: 2, selfScore: 0, score: 0, avatar: "🥰" },
            { id: "farm-3", name: "", nameType: "normal", nameNumber: 3, selfScore: 0, score: 0, avatar: "😘" },
            { id: "farm-4", name: "", nameType: "normal", nameNumber: 4, selfScore: 0, score: 0, avatar: "🤩" }
        ],
        goldHatch: [
            { id: "goldHatch-1", name: "", nameType: "gold", nameNumber: 1, selfScore: 0, score: 0, avatar: "👑" },
            { id: "goldHatch-2", name: "", nameType: "gold", nameNumber: 2, selfScore: 0, score: 0, avatar: "🏆" }
        ],
        goldFarm: [
            { id: "goldFarm-1", name: "", nameType: "gold", nameNumber: 1, selfScore: 0, score: 0, avatar: "👑" },
            { id: "goldFarm-2", name: "", nameType: "gold", nameNumber: 2, selfScore: 0, score: 0, avatar: "🏆" }
        ]
    }
};

class Coin999PartnerCalculator {
    constructor() {
        this.appData = this.loadData();
        this.editingMemberId = null;
        this.saveTimer = null;

        this.els = this.getElements();

        this.init();
    }

    getElements() {
        return {
            languageSelect: document.getElementById("languageSelect"),

            pageTitle: document.getElementById("pageTitle"),
            modeButtons: document.querySelectorAll(".mode-btn"),

            hatchTarget: document.getElementById("hatchTarget"),
            farmTarget: document.getElementById("farmTarget"),
            goldHatchTarget: document.getElementById("goldHatchTarget"),
            goldFarmTarget: document.getElementById("goldFarmTarget"),

            teamRow: document.getElementById("teamRow"),
            teamTarget: document.getElementById("teamTarget"),
            teamProgress: document.getElementById("teamProgress"),
            clearAllBtn: document.getElementById("clearAllBtn"),

            detailPage: document.getElementById("detailPage"),
            detailBackBtn: document.getElementById("detailBackBtn"),
            closeDetailBtn: document.getElementById("closeDetailBtn"),

            detailTitle: document.getElementById("detailTitle"),
            detailCreatureStage: document.getElementById("detailCreatureStage"),

            selfNameView: document.getElementById("selfNameView"),
            selfScoreView: document.getElementById("selfScoreView"),
            friendNameView: document.getElementById("friendNameView"),
            friendAvatarView: document.getElementById("friendAvatarView"),
            friendScoreView: document.getElementById("friendScoreView"),

            selfScoreInput: document.getElementById("selfScoreInput"),
            friendScoreInput: document.getElementById("friendScoreInput"),

            needLine: document.getElementById("needLine"),

            detailTotalScore: document.getElementById("detailTotalScore"),
            detailTargetScore: document.getElementById("detailTargetScore"),
            detailRemainingScore: document.getElementById("detailRemainingScore"),
            detailNeedTokens: document.getElementById("detailNeedTokens"),
            detailResponsibilityScore: document.getElementById("detailResponsibilityScore"),
            detailResponsibilityTokens: document.getElementById("detailResponsibilityTokens")
        };
    }

    init() {
        this.appData.lang = this.normalizeLang(this.appData.lang);

        this.setupLanguageOptions();
        this.bindEvents();

        this.matchBoard = new MatchBoard({
            getLang: () => this.getLang(),
            getLocale: () => this.getLocale(),
            getMode: () => this.appData.mode,
            appT: (path, params) => this.t(path, params),
            escapeHtml: (value) => this.escapeHtml(value),
            getCreatureSvg: (mode, isGold) => MODES[mode]?.creatureType === "farm"
                ? this.getPlantSvg(isGold)
                : this.getLizardSvg(isGold)
        });

        this.render();
    }

    clone(data) {
        return JSON.parse(JSON.stringify(data));
    }

    numberValue(value, fallback = 0) {
        const num = Number(value);

        return Number.isFinite(num) && num >= 0
            ? num
            : fallback;
    }

    escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    normalizeLang(lang) {
        if (lang === "zh-TW") {
            return "zh-Hant";
        }

        return SUPPORTED_LANGS.includes(lang)
            ? lang
            : DEFAULT_LANG;
    }

    getLang() {
        return this.normalizeLang(this.appData.lang);
    }

    getLocale() {
        return LANGUAGE_META[this.getLang()]?.locale || "zh-Hant-TW";
    }

    formatNumber(num) {
        return Math.ceil(this.numberValue(num, 0)).toLocaleString(this.getLocale());
    }

    getByPath(obj, path) {
        return path.split(".").reduce((current, key) => {
            return current && current[key] !== undefined
                ? current[key]
                : undefined;
        }, obj);
    }

    t(path, params = {}) {
        let text = this.getByPath(I18N[this.getLang()] || I18N[DEFAULT_LANG], path);

        if (text === undefined || text === null) {
            text = this.getByPath(I18N[DEFAULT_LANG], path);
        }

        if (text === undefined || text === null) {
            text = path;
        }

        text = String(text);

        Object.entries(params).forEach(([key, value]) => {
            text = text.replaceAll(`{${key}}`, value);
        });

        return text;
    }

    setupLanguageOptions() {
        this.els.languageSelect.innerHTML = "";

        SUPPORTED_LANGS.forEach((lang) => {
            const option = document.createElement("option");

            option.value = lang;
            option.textContent = LANGUAGE_META[lang].label;

            this.els.languageSelect.appendChild(option);
        });
    }

    getMemberDisplayName(member) {
        const number = member.nameNumber || 1;
        const type = member.nameType || "normal";

        return this.t(`memberDefault.${type}`, {
            n: number
        });
    }

    applyI18n() {
        const lang = this.getLang();
        const year = new Date().getFullYear();

        document.documentElement.lang = lang;
        document.title = this.t("app.documentTitle");
        this.els.languageSelect.value = lang;

        document.querySelectorAll("[data-i18n]").forEach((node) => {
            const key = node.dataset.i18n;

            node.textContent = this.t(key, {
                year
            });
        });

        this.matchBoard?.applyI18n();
    }

    setLanguage(lang) {
        const normalized = this.normalizeLang(lang);

        this.appData.lang = normalized;
        this.applyI18n();
        this.render();
        this.saveData();
    }

    loadData() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);

            if (!saved) {
                return this.clone(DEFAULT_DATA);
            }

            const parsed = JSON.parse(saved);
            const defaults = this.clone(DEFAULT_DATA);

            return {
                ...defaults,
                ...parsed,
                lang: this.normalizeLang(parsed.lang),
                self: {
                    ...defaults.self,
                    ...(parsed.self || {}),
                    name: ""
                },
                targets: {
                    ...defaults.targets,
                    ...(parsed.targets || {})
                },
                members: this.mergeMembers(parsed.members)
            };
        } catch {
            return this.clone(DEFAULT_DATA);
        }
    }

    mergeMembers(savedMembers) {
        const defaults = this.clone(DEFAULT_DATA.members);
        const result = {};

        Object.keys(defaults).forEach((mode) => {
            const savedList = savedMembers && Array.isArray(savedMembers[mode])
                ? savedMembers[mode]
                : [];

            result[mode] = defaults[mode].map((member) => {
                const saved = savedList.find((item) => item.id === member.id);

                return saved
                    ? {
                        ...member,
                        ...saved,
                        name: "",
                        nameType: member.nameType,
                        nameNumber: member.nameNumber,
                        selfScore: this.numberValue(saved.selfScore, member.selfScore || 0),
                        score: this.numberValue(saved.score, member.score || 0)
                    }
                    : member;
            });
        });

        return result;
    }

    saveData() {
        clearTimeout(this.saveTimer);

        this.saveTimer = setTimeout(() => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.appData));
            this.saveTimer = null;
        }, 250);
    }

    saveDataNow() {
        clearTimeout(this.saveTimer);
        this.saveTimer = null;

        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.appData));
    }

    getModeConfig() {
        return MODES[this.appData.mode] || MODES.hatch;
    }

    isFarmMode() {
        return this.getModeConfig().creatureType === "farm";
    }

    getCurrentMembers() {
        return this.appData.members[this.appData.mode] || [];
    }

    getCurrentTarget() {
        const config = this.getModeConfig();

        return Math.max(
            1,
            this.numberValue(
                this.appData.targets[config.targetKey],
                DEFAULT_DATA.targets[config.targetKey]
            )
        );
    }

    getTokensNeeded(scoreAmount) {
        const config = this.getModeConfig();
        const rate = RATES[config.rateType];

        if (!rate || rate.score <= 0 || rate.tokens <= 0) {
            return 0;
        }

        return Math.ceil(this.numberValue(scoreAmount, 0) * rate.tokens / rate.score);
    }

    getMemberProgressParts(member) {
        const target = this.getCurrentTarget();
        const selfScore = this.numberValue(member.selfScore, 0);
        const friendScore = this.numberValue(member.score, 0);

        if (target <= 0) {
            return {
                selfPercent: 0,
                friendPercent: 0
            };
        }

        const totalScore = selfScore + friendScore;

        if (totalScore <= target) {
            return {
                selfPercent: (selfScore / target) * 100,
                friendPercent: (friendScore / target) * 100
            };
        }

        return {
            selfPercent: (selfScore / totalScore) * 100,
            friendPercent: (friendScore / totalScore) * 100
        };
    }

    render() {
        this.applyI18n();
        this.renderInputs();
        this.renderMode();
        this.renderMembers();
        this.renderSummary();

        if (this.editingMemberId) {
            this.updateDetailCalc();
        }
    }

    renderInputs() {
        this.els.hatchTarget.value = this.appData.targets.hatch;
        this.els.farmTarget.value = this.appData.targets.farm;
        this.els.goldHatchTarget.value = this.appData.targets.goldHatch;
        this.els.goldFarmTarget.value = this.appData.targets.goldFarm;
    }

    renderMode() {
        const config = this.getModeConfig();

        this.els.pageTitle.textContent = this.t(`pageTitle.${this.appData.mode}`);

        this.els.modeButtons.forEach((button) => {
            button.classList.toggle("active", button.dataset.mode === this.appData.mode);
        });

        this.els.teamRow.className = config.isGold
            ? "team-row gold"
            : "team-row normal";
    }

    getCreatureHtml(config, extraClass = "") {
        const goldClass = config.isGold ? "gold-creature" : "";
        const farmMode = this.isFarmMode();

        const className = `${farmMode ? "plant-creature" : "creature"} ${extraClass} ${goldClass}`.trim();

        if (farmMode) {
            return `<div class="${className}">${this.getPlantSvg(config.isGold)}</div>`;
        }

        return `<div class="${className}">${this.getLizardSvg(config.isGold)}</div>`;
    }

    // 孵化傘蜥 SVG：綠色小蜥蜴 + 紫色頸傘，坐在石台上，黃金模式換成金色配色
    getLizardSvg(isGold) {
        const c = isGold
            ? {
                id: "lg", outline: "#6b3a05", skinLight: "#fff27a", skinDark: "#d18d17",
                belly: "#fff8d6", frill: "#ffb733", frillDark: "#a8650f", spot: "#fff4cf",
                iris: "#8a4b12", rockLight: "#f3e2b8", rockDark: "#a88a52", rockOutline: "#6b5025"
            }
            : {
                id: "ln", outline: "#1d5a17", skinLight: "#a6ec3c", skinDark: "#3fa52a",
                belly: "#eaf98a", frill: "#c46ee6", frillDark: "#7b3aa3", spot: "#8fe3f0",
                iris: "#9a4a1c", rockLight: "#e4e0dc", rockDark: "#9a948e", rockOutline: "#5d5853"
            };
        const id = c.id;

        return `
            <svg viewBox="0 0 105 125" aria-hidden="true">
                <defs>
                    <linearGradient id="${id}-skin" x1="0" y1="0" x2="0.3" y2="1">
                        <stop offset="0" stop-color="${c.skinLight}"/>
                        <stop offset="1" stop-color="${c.skinDark}"/>
                    </linearGradient>
                    <linearGradient id="${id}-rock" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stop-color="${c.rockLight}"/>
                        <stop offset="1" stop-color="${c.rockDark}"/>
                    </linearGradient>
                    <radialGradient id="${id}-eye" cx="0.45" cy="0.4" r="0.6">
                        <stop offset="0" stop-color="#d98a3a"/>
                        <stop offset="0.6" stop-color="${c.iris}"/>
                        <stop offset="1" stop-color="#3a1606"/>
                    </radialGradient>
                </defs>

                <!-- 石台 -->
                <path d="M6 110 C8 100 30 97 52 97 C76 97 98 100 99 110 C98 120 76 124 52 124 C28 124 6 120 6 110 Z" fill="url(#${id}-rock)" stroke="${c.rockOutline}" stroke-width="2"/>
                <ellipse cx="50" cy="103" rx="38" ry="5" fill="#fff" opacity="0.35"/>

                <!-- 尾巴與背刺 -->
                <g fill="${c.frill}" stroke="${c.frillDark}" stroke-width="1.2" stroke-linejoin="round">
                    <path d="M70 96 L74 88 L77 96 Z"/>
                    <path d="M80 98 L85 90 L87 99 Z"/>
                    <path d="M89 99 L95 92 L95 101 Z"/>
                </g>
                <path d="M58 106 C72 108 88 106 96 100 C101 96 102 92 99 90 C99 96 90 101 76 100 C68 99 62 98 58 98 Z" fill="url(#${id}-skin)" stroke="${c.outline}" stroke-width="2" stroke-linejoin="round"/>

                <!-- 身體 -->
                <path d="M38 64 C32 78 28 96 34 106 C42 110 64 110 70 104 C74 94 70 76 64 64 Z" fill="url(#${id}-skin)" stroke="${c.outline}" stroke-width="2.2" stroke-linejoin="round"/>
                <path d="M44 66 C40 80 39 94 42 104 C48 106 58 106 62 103 C64 92 62 78 58 66 Z" fill="${c.belly}"/>
                <g stroke="${c.skinDark}" stroke-width="1" opacity="0.5" fill="none">
                    <path d="M43 76 Q51 79 60 76"/>
                    <path d="M42 86 Q51 89 62 86"/>
                    <path d="M42 96 Q51 99 62 96"/>
                </g>

                <!-- 前腳 -->
                <g fill="url(#${id}-skin)" stroke="${c.outline}" stroke-width="2" stroke-linejoin="round">
                    <path d="M36 88 C32 96 32 104 36 108 L46 108 C44 102 42 96 42 90 Z"/>
                    <path d="M68 88 C72 96 72 104 68 108 L58 108 C60 102 62 96 62 90 Z"/>
                </g>
                <g fill="${c.frill}" stroke="${c.frillDark}" stroke-width="1">
                    <ellipse cx="35" cy="108.5" rx="2.6" ry="2"/>
                    <ellipse cx="40" cy="109.5" rx="2.6" ry="2"/>
                    <ellipse cx="45" cy="109" rx="2.6" ry="2"/>
                    <ellipse cx="59" cy="109" rx="2.6" ry="2"/>
                    <ellipse cx="64" cy="109.5" rx="2.6" ry="2"/>
                    <ellipse cx="69" cy="108.5" rx="2.6" ry="2"/>
                </g>

                <!-- 頸傘 -->
                <path d="M40 18 Q36 6 26 12 Q14 8 14 20 Q4 22 9 32 Q2 40 11 45 Q8 56 20 55 Q24 62 34 56 L52 50 L70 56 Q80 62 84 55 Q96 56 93 45 Q102 40 95 32 Q100 22 90 20 Q90 8 78 12 Q68 6 64 18 Z" fill="${c.frill}" stroke="${c.frillDark}" stroke-width="2" stroke-linejoin="round"/>
                <g fill="${c.spot}">
                    <circle cx="17" cy="27" r="2.4"/>
                    <circle cx="15" cy="40" r="2.2"/>
                    <circle cx="24" cy="50" r="1.8"/>
                    <circle cx="87" cy="27" r="2.4"/>
                    <circle cx="89" cy="40" r="2.2"/>
                    <circle cx="80" cy="50" r="1.8"/>
                </g>

                <!-- 頭 -->
                <path d="M52 16 C70 16 82 26 82 40 C82 54 70 64 52 64 C34 64 22 54 22 40 C22 26 34 16 52 16 Z" fill="url(#${id}-skin)" stroke="${c.outline}" stroke-width="2.4"/>
                <path d="M30 52 C36 60 46 63 52 63 C58 63 68 60 74 52 C66 56 38 56 30 52 Z" fill="${c.belly}" opacity="0.7"/>
                <!-- 頭冠 -->
                <path d="M46 18 L49 9 L52 16 L55 8 L58 18 Z" fill="${c.frill}" stroke="${c.frillDark}" stroke-width="1.5" stroke-linejoin="round"/>

                <!-- 眼睛 -->
                <g stroke="${c.outline}" stroke-width="2">
                    <circle cx="40" cy="36" r="10.5" fill="#fff"/>
                    <circle cx="64" cy="36" r="10.5" fill="#fff"/>
                </g>
                <circle cx="41" cy="37" r="7.5" fill="url(#${id}-eye)"/>
                <circle cx="63" cy="37" r="7.5" fill="url(#${id}-eye)"/>
                <circle cx="41" cy="37" r="3.5" fill="#1a0a03"/>
                <circle cx="63" cy="37" r="3.5" fill="#1a0a03"/>
                <circle cx="38.5" cy="34" r="2.6" fill="#fff"/>
                <circle cx="60.5" cy="34" r="2.6" fill="#fff"/>
                <circle cx="44" cy="40" r="1.2" fill="#fff"/>
                <circle cx="66" cy="40" r="1.2" fill="#fff"/>
                <path d="M29 30 Q40 22 51 30" fill="none" stroke="${c.skinDark}" stroke-width="3" stroke-linecap="round"/>
                <path d="M53 30 Q64 22 75 30" fill="none" stroke="${c.skinDark}" stroke-width="3" stroke-linecap="round"/>

                <!-- 鼻孔與笑嘴 -->
                <circle cx="49" cy="48" r="1" fill="${c.outline}"/>
                <circle cx="55" cy="48" r="1" fill="${c.outline}"/>
                <path d="M32 50 Q52 60 72 50" fill="none" stroke="${c.outline}" stroke-width="2" stroke-linecap="round"/>
                <path d="M30 48 Q31 51 33 51 M74 48 Q73 51 71 51" fill="none" stroke="${c.outline}" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
        `;
    }

    // 食人花盆栽 SVG：綠色大嘴花 + 圖騰花盆，黃金模式換成金色配色
    getPlantSvg(isGold) {
        const c = isGold
            ? {
                id: "pg", outline: "#6b3a05", headLight: "#fff27a", headDark: "#d18d17",
                spot: "#ffe9a0", leafLight: "#ffe066", leafDark: "#b9770f",
                lip: "#ffd24c", lipDark: "#b36e0d", mouth: "#5a2a06", tongue: "#ff9f5a",
                potLight: "#f7c45a", potOutline: "#6b3a05", potDark: "#a8650f", band: "#fff4cf", rim: "#ffd27a"
            }
            : {
                id: "pn", outline: "#14501a", headLight: "#c4f25a", headDark: "#3f9d22",
                spot: "#e6ff9a", leafLight: "#6fcf3a", leafDark: "#1f6b1d",
                lip: "#ff6fae", lipDark: "#b1165a", mouth: "#4a0b22", tongue: "#ff4f86",
                potLight: "#c9774a", potOutline: "#3c1a0e", potDark: "#6e3418", band: "#f6e6d2", rim: "#e09a6c"
            };
        const id = c.id;

        return `
            <svg viewBox="0 0 105 125" aria-hidden="true">
                <defs>
                    <linearGradient id="${id}-head" x1="0" y1="0" x2="0.4" y2="1">
                        <stop offset="0" stop-color="${c.headLight}"/>
                        <stop offset="1" stop-color="${c.headDark}"/>
                    </linearGradient>
                    <linearGradient id="${id}-leaf" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stop-color="${c.leafLight}"/>
                        <stop offset="1" stop-color="${c.leafDark}"/>
                    </linearGradient>
                    <linearGradient id="${id}-pot" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0" stop-color="${c.potDark}"/>
                        <stop offset="0.35" stop-color="${c.potLight}"/>
                        <stop offset="1" stop-color="${c.potDark}"/>
                    </linearGradient>
                </defs>

                <!-- 莖 -->
                <path d="M53 92 C42 78 62 66 50 50" fill="none" stroke="${c.outline}" stroke-width="11" stroke-linecap="round"/>
                <path d="M53 92 C42 78 62 66 50 50" fill="none" stroke="${c.headDark}" stroke-width="7" stroke-linecap="round"/>
                <path d="M51 88 C42 77 59 67 49 53" fill="none" stroke="${c.headLight}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>

                <!-- 盆邊葉子 -->
                <g stroke="${c.outline}" stroke-width="2" stroke-linejoin="round" fill="url(#${id}-leaf)">
                    <path d="M50 92 C38 80 22 76 8 80 C20 84 32 90 44 94 Z"/>
                    <path d="M55 92 C66 79 82 74 98 76 C86 82 74 88 62 95 Z"/>
                    <path d="M48 93 C40 86 30 88 22 96 C32 94 40 95 47 96 Z"/>
                    <path d="M57 93 C66 86 76 88 84 95 C74 94 66 95 58 96 Z"/>
                </g>

                <!-- 花盆 -->
                <path d="M27 97 L78 97 L74 121 Q73 123 70 123 L35 123 Q32 123 31 121 Z" fill="url(#${id}-pot)" stroke="${c.potOutline}" stroke-width="2.5" stroke-linejoin="round"/>
                <rect x="29" y="103" width="47" height="9" fill="${c.band}"/>
                <path d="M29 103 L33 109 L37 103 L41 109 L45 103 L49 109 L53 103 L57 109 L61 103 L65 109 L69 103 L73 109 L76 104" fill="none" stroke="${c.potDark}" stroke-width="2" stroke-linejoin="round"/>
                <path d="M30 112 L75 112" stroke="${c.potDark}" stroke-width="2"/>
                <rect x="22" y="91" width="61" height="9" rx="3" fill="${c.rim}" stroke="${c.potOutline}" stroke-width="2.5"/>
                <path d="M26 94 L79 94" stroke="#fff" stroke-width="1.5" opacity="0.35" stroke-linecap="round"/>

                <!-- 頭後尖葉 -->
                <g fill="${c.leafDark}" stroke="${c.outline}" stroke-width="2" stroke-linejoin="round">
                    <path d="M30 52 L14 60 L34 58 Z"/>
                    <path d="M40 57 L34 70 L47 59 Z"/>
                    <path d="M22 42 L4 42 L22 50 Z"/>
                </g>

                <!-- 頭 -->
                <path d="M20 38 C14 16 38 2 60 6 C78 9 90 18 94 28 C86 50 62 62 40 58 C28 55 22 48 20 38 Z" fill="url(#${id}-head)" stroke="${c.outline}" stroke-width="2.5" stroke-linejoin="round"/>
                <g fill="${c.spot}" opacity="0.85">
                    <circle cx="34" cy="16" r="3.5"/>
                    <circle cx="27" cy="27" r="2.5"/>
                    <circle cx="48" cy="10" r="2.5"/>
                    <circle cx="31" cy="44" r="2.8"/>
                    <circle cx="25" cy="36" r="1.8"/>
                </g>
                <path d="M36 23 Q41 18 46 22" fill="none" stroke="${c.outline}" stroke-width="2.5" stroke-linecap="round"/>

                <!-- 嘴巴 -->
                <path d="M42 28 C58 15 84 12 101 16 C99 41 79 58 58 54 C47 50 41 40 42 28 Z" fill="${c.lip}" stroke="${c.lipDark}" stroke-width="2" stroke-linejoin="round"/>
                <path d="M47 29 C60 21 82 19 95 21 C93 38 77 50 60 47 C52 44 47 37 47 29 Z" fill="${c.mouth}"/>
                <path d="M48 29 C60 22 82 20 95 21 L93 27 C80 25 62 28 50 34 Z" fill="#fff"/>
                <path d="M55 25 L56 30 M62 23 L63 28 M70 21 L70 27 M78 21 L78 26 M86 21 L86 26" stroke="${c.mouth}" stroke-width="1" opacity="0.5"/>
                <path d="M55 45 C67 48 82 43 91 33 L88 31 C79 39 66 42 56 40 Z" fill="#fff"/>
                <ellipse cx="68" cy="39" rx="10" ry="4" fill="${c.tongue}"/>
                <path d="M46 25 C60 17 82 15 97 18" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.5" stroke-linecap="round"/>
            </svg>
        `;
    }

    renderMembers() {
        const config = this.getModeConfig();
        const members = this.getCurrentMembers();

        this.els.teamRow.innerHTML = "";

        members.forEach((member) => {
            const progressParts = this.getMemberProgressParts(member);

            const button = document.createElement("button");
            button.type = "button";
            button.className = "member-card";

            button.innerHTML = `
                <div class="member-name">${this.escapeHtml(this.getMemberDisplayName(member))}</div>

                <div class="avatar">
                    <div class="avatar-inner">${this.escapeHtml(member.avatar || "🧑")}</div>
                </div>

                ${this.getCreatureHtml(config)}

                <div class="progress-wrap" title="${this.escapeHtml(config.isGold ? this.t("progressBar.goldTitle") : this.t("progressBar.normalTitle"))}">
                    <div class="progress-stack">
                        <div class="progress-self" style="width:${progressParts.selfPercent}%"></div>
                        <div class="progress-friend ${config.isGold ? "gold-progress" : ""}" style="width:${progressParts.friendPercent}%"></div>
                    </div>
                </div>
            `;

            button.addEventListener("click", () => this.openDetail(member.id));
            this.els.teamRow.appendChild(button);
        });
    }

    renderSummary() {
        const members = this.getCurrentMembers();
        const target = this.getCurrentTarget();
        const totalTarget = target * members.length;

        const totalScore = members.reduce((sum, member) => {
            return sum
                + this.numberValue(member.selfScore, 0)
                + this.numberValue(member.score, 0);
        }, 0);

        const progress = totalTarget > 0
            ? Math.min((totalScore / totalTarget) * 100, 100)
            : 0;

        this.els.teamTarget.textContent = this.formatNumber(totalTarget);
        this.els.teamProgress.textContent = `${progress.toFixed(1)}${this.t("unit.percent")}`;
    }

    findEditingMember() {
        return this.getCurrentMembers().find((member) => member.id === this.editingMemberId);
    }

    openDetail(memberId) {
        this.editingMemberId = memberId;

        const member = this.findEditingMember();

        if (!member) {
            return;
        }

        this.els.selfScoreInput.value = member.selfScore || 0;
        this.els.friendScoreInput.value = member.score || 0;

        this.updateDetailCalc();
        this.els.detailPage.classList.add("open");
    }

    closeDetail() {
        if (this.editingMemberId) {
            this.autoSaveDetail();
            this.saveDataNow();
        }

        this.editingMemberId = null;
        this.els.detailPage.classList.remove("open");
    }

    updateDetailCalc() {
        const config = this.getModeConfig();
        const member = this.findEditingMember();

        if (!member) {
            return;
        }

        const selfName = this.t("person.selfDefault");
        const selfScore = this.numberValue(this.els.selfScoreInput.value, 0);
        const friendName = this.getMemberDisplayName(member);
        const friendScore = this.numberValue(this.els.friendScoreInput.value, 0);

        const target = this.getCurrentTarget();
        const totalScore = selfScore + friendScore;

        const remainingWholeScore = Math.max(target - totalScore, 0);
        const remainingWholeTokens = this.getTokensNeeded(remainingWholeScore);

        const responsibilityScore = remainingWholeScore / 2;
        const responsibilityTokens = this.getTokensNeeded(responsibilityScore);

        this.els.detailTitle.textContent = this.t(`detailTitle.${this.appData.mode}`);
        this.els.detailCreatureStage.innerHTML = this.getCreatureHtml(config, "big-creature");

        this.els.selfNameView.textContent = selfName;
        this.els.selfScoreView.textContent = this.formatNumber(selfScore);

        this.els.friendNameView.textContent = friendName;
        this.els.friendAvatarView.textContent = member.avatar || "🧑";
        this.els.friendScoreView.textContent = this.formatNumber(friendScore);

        this.els.needLine.textContent = remainingWholeScore > 0
            ? this.t("message.needLine", { score: this.formatNumber(remainingWholeScore) })
            : this.t("message.completedCanUpgrade");

        this.els.detailTotalScore.textContent = this.formatNumber(totalScore);
        this.els.detailTargetScore.textContent = this.formatNumber(target);

        this.els.detailRemainingScore.textContent = this.formatNumber(remainingWholeScore);
        this.els.detailNeedTokens.textContent = this.formatNumber(remainingWholeTokens);

        this.els.detailResponsibilityScore.textContent = this.formatNumber(responsibilityScore);
        this.els.detailResponsibilityTokens.textContent = this.formatNumber(responsibilityTokens);
    }

    autoSaveDetail() {
        const member = this.findEditingMember();

        if (!member) {
            return;
        }

        this.appData.self.name = "";
        member.name = "";

        member.selfScore = this.numberValue(this.els.selfScoreInput.value, 0);
        member.score = this.numberValue(this.els.friendScoreInput.value, 0);

        this.updateDetailCalc();
        this.renderMembers();
        this.renderSummary();
        this.saveData();
    }

    updateTarget(key, input, defaultValue) {
        this.appData.targets[key] = Math.max(1, this.numberValue(input.value, defaultValue));

        this.renderMode();
        this.renderMembers();
        this.renderSummary();

        if (this.editingMemberId) {
            this.updateDetailCalc();
        }

        this.saveData();
    }

    clearAllData() {
        const confirmed = confirm(this.t("message.clearConfirm"));

        if (!confirmed) {
            return;
        }

        const currentLang = this.getLang();

        clearTimeout(this.saveTimer);
        localStorage.removeItem(STORAGE_KEY);

        this.appData = this.clone(DEFAULT_DATA);
        this.appData.lang = currentLang;

        this.editingMemberId = null;
        this.els.detailPage.classList.remove("open");

        this.render();

        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.appData));
    }

    bindEvents() {
        this.els.languageSelect.addEventListener("change", () => {
            this.setLanguage(this.els.languageSelect.value);
        });

        this.els.modeButtons.forEach((button) => {
            button.addEventListener("click", () => {
                this.appData.mode = button.dataset.mode;
                this.closeDetail();
                this.render();
                this.saveData();
            });
        });

        this.els.hatchTarget.addEventListener("input", () => {
            this.updateTarget("hatch", this.els.hatchTarget, DEFAULT_DATA.targets.hatch);
        });

        this.els.farmTarget.addEventListener("input", () => {
            this.updateTarget("farm", this.els.farmTarget, DEFAULT_DATA.targets.farm);
        });

        this.els.goldHatchTarget.addEventListener("input", () => {
            this.updateTarget("goldHatch", this.els.goldHatchTarget, DEFAULT_DATA.targets.goldHatch);
        });

        this.els.goldFarmTarget.addEventListener("input", () => {
            this.updateTarget("goldFarm", this.els.goldFarmTarget, DEFAULT_DATA.targets.goldFarm);
        });

        [
            this.els.selfScoreInput,
            this.els.friendScoreInput
        ].forEach((input) => {
            input.addEventListener("input", () => this.autoSaveDetail());
        });

        this.els.closeDetailBtn.addEventListener("click", () => this.closeDetail());
        this.els.detailBackBtn.addEventListener("click", () => this.closeDetail());
        this.els.clearAllBtn.addEventListener("click", () => this.clearAllData());

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                this.closeDetail();
                this.matchBoard.close();
            }
        });

        window.addEventListener("beforeunload", () => {
            if (this.editingMemberId) {
                this.autoSaveDetail();
            }

            clearTimeout(this.saveTimer);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.appData));
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new Coin999PartnerCalculator();
});
