import {
    DEFAULT_LANG,
    SUPPORTED_LANGS,
    LANGUAGE_META,
    I18N
} from "./i18n.js";

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
            timezoneLine: document.getElementById("timezoneLine"),

            pageTitle: document.getElementById("pageTitle"),
            saveStatus: document.getElementById("saveStatus"),
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

    getTimezoneText() {
        return LANGUAGE_META[this.getLang()]?.timezoneText || "UTC+08:00";
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

        document.documentElement.lang = lang;
        document.title = this.t("app.documentTitle");
        this.els.languageSelect.value = lang;

        document.querySelectorAll("[data-i18n]").forEach((node) => {
            const key = node.dataset.i18n;
            node.textContent = this.t(key);
        });

        this.els.timezoneLine.textContent = this.t("settings.timezone", {
            timezone: this.getTimezoneText()
        });

        if (!this.saveTimer) {
            this.els.saveStatus.textContent = this.t("settings.saveLocal");
        }
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
            this.showSaved();
        }, 250);
    }

    saveDataNow() {
        clearTimeout(this.saveTimer);
        this.saveTimer = null;

        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.appData));
        this.showSaved();
    }

    showSaved() {
        this.els.saveStatus.textContent = this.t("settings.saved");

        clearTimeout(this.showSavedTimer);

        this.showSavedTimer = setTimeout(() => {
            this.els.saveStatus.textContent = this.t("settings.saveLocal");
        }, 900);
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
            return `
                <div class="${className}">
                    <div class="petal p1"></div>
                    <div class="petal p2"></div>
                    <div class="petal p3"></div>
                    <div class="bud"></div>
                    <div class="leaf-left"></div>
                    <div class="leaf-right"></div>
                    <div class="stem"></div>
                    <div class="soil"></div>
                </div>
            `;
        }

        return `
            <div class="${className}">
                <div class="crest"></div>
                <div class="head"></div>
                <div class="body"></div>
                <div class="tail"></div>
            </div>
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
        this.els.saveStatus.textContent = this.t("settings.clearedAndReset");

        clearTimeout(this.showSavedTimer);

        this.showSavedTimer = setTimeout(() => {
            this.els.saveStatus.textContent = this.t("settings.saveLocal");
        }, 1200);
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
