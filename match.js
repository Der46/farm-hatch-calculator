import { MATCH_I18N } from "./match-i18n.js?v=20261023j";

// 部署 Apps Script 後，把「網頁應用程式」網址貼在這裡（見 README「媒合平台設定」）
const MATCH_API_URL = "https://script.google.com/macros/s/AKfycbyocp1bZSLy3IVUYbJ1r7596t_RqNj8_AvssK7pCckDCz6ICbVpga1LTOA3q1CvTIQYNg/exec";

const PROFILE_KEY = "coin999_match_profile_v1";
const OWNER_KEY = "coin999_match_owner_v1";

const MODE_ORDER = ["hatch", "farm", "goldHatch", "goldFarm"];

// 每種模式的夥伴隻數（需與 backend/apps-script.gs 的 CREATURE_COUNT 一致）
const CREATURE_COUNT = {
    hatch: 4,
    farm: 4,
    goldHatch: 2,
    goldFarm: 2
};

// 以下規則需與 backend/apps-script.gs 一致（前端先擋，後端仍會再檢查）
const COIN_LINK_RE = /^https:\/\/(www\.)?getcoinmaster\.com\/~[A-Za-z0-9_-]{4,40}\/?(\?[A-Za-z0-9=&_%.-]*)?$/i;
const LINK_IN_TEXT_RE = /(https?:\/\/|www\.|getcoinmaster|~[A-Za-z0-9]{6,}|\b[a-z0-9-]+\.(com|net|org|io|me|ly|gg|tw|cc|co|app|link|xyz|top|info)\b)/i;
const SCREENSHOT_HOSTS = [
    "imgur.com",
    "ibb.co",
    "imgbb.com",
    "postimg.cc",
    "postimages.org",
    "photos.app.goo.gl",
    "photos.google.com",
    "drive.google.com"
];

function isAllowedScreenshot(url) {
    const match = String(url).match(/^https:\/\/([^\/?#\s]+)[^\s<>"']*$/i);

    if (!match) {
        return false;
    }

    const host = match[1].toLowerCase();

    return SCREENSHOT_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

// 至少能完成一半才可以上來找人（需與 backend/apps-script.gs 的 MIN_TOKENS 一致）
const MIN_TOKENS = {
    hatch: 14500,
    farm: 7500,
    goldHatch: 0,
    goldFarm: 0
};

export class MatchBoard {
    constructor({ getLang, getLocale, getMode, appT, escapeHtml, getCreatureSvg }) {
        this.getLang = getLang;
        this.getLocale = getLocale;
        this.getMode = getMode;
        this.appT = appT;
        this.escapeHtml = escapeHtml;
        this.getCreatureSvg = getCreatureSvg;

        this.posts = [];
        this.filter = "all";
        this.status = "idle";
        this.submitting = false;
        this.done = 0;
        this.loadSeq = 0;
        this.refreshing = false;

        this.els = {
            openBtn: document.getElementById("matchOpenBtn"),
            page: document.getElementById("matchPage"),
            backBtn: document.getElementById("matchBackBtn"),
            notice: document.getElementById("matchNotice"),
            form: document.getElementById("matchForm"),
            mode: document.getElementById("matchMode"),
            team: document.getElementById("matchTeam"),
            link: document.getElementById("matchLink"),
            screenshot: document.getElementById("matchScreenshot"),
            tokens: document.getElementById("matchTokens"),
            donePicker: document.getElementById("matchDonePicker"),
            doneHint: document.getElementById("matchDoneHint"),
            rule: document.getElementById("matchRule"),
            formMsg: document.getElementById("matchFormMsg"),
            submit: document.getElementById("matchSubmit"),
            refresh: document.getElementById("matchRefresh"),
            filter: document.getElementById("matchFilter"),
            list: document.getElementById("matchList"),
            progress: document.getElementById("matchProgress"),
            toast: document.getElementById("matchToast")
        };

        this.bindEvents();
        this.restoreProfile();

        this.ownerKey = this.getOwnerKey();
        this.ownerIdReady = this.sha256Hex(this.ownerKey)
            .then((id) => {
                this.ownerId = id;
            })
            .catch(() => {
                // 非 https 環境沒有 crypto.subtle，只是無法辨識自己的貼文
            });
    }

    isConfigured() {
        return /^https:\/\//.test(MATCH_API_URL);
    }

    t(path, params = {}) {
        const lookup = (lang) => path.split(".").reduce((cur, key) => {
            return cur && cur[key] !== undefined ? cur[key] : undefined;
        }, MATCH_I18N[lang]);

        let text = lookup(this.getLang());

        if (text === undefined) {
            text = lookup("zh-Hant");
        }

        text = String(text === undefined ? path : text);

        Object.entries(params).forEach(([key, value]) => {
            text = text.replaceAll(`{${key}}`, value);
        });

        return text;
    }

    formatNumber(num) {
        return Number(num || 0).toLocaleString(this.getLocale());
    }

    formatTimeAgo(ms) {
        const diffSec = Math.round((Number(ms) - Date.now()) / 1000);
        const rtf = new Intl.RelativeTimeFormat(this.getLocale(), { numeric: "auto" });
        const units = [
            ["day", 86400],
            ["hour", 3600],
            ["minute", 60]
        ];

        for (const [unit, size] of units) {
            if (Math.abs(diffSec) >= size) {
                return rtf.format(Math.round(diffSec / size), unit);
            }
        }

        return rtf.format(0, "minute");
    }

    /* ---------- 裝置身分：只有發文的裝置能刪除自己的貼文 ---------- */

    getOwnerKey() {
        try {
            const saved = localStorage.getItem(OWNER_KEY);

            if (/^[0-9a-f]{64}$/.test(saved || "")) {
                return saved;
            }
        } catch {
            // 無法存取 localStorage 時改用本次頁面的暫時金鑰
        }

        const bytes = crypto.getRandomValues(new Uint8Array(32));
        const key = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

        try {
            localStorage.setItem(OWNER_KEY, key);
        } catch {
            // 同上
        }

        return key;
    }

    async sha256Hex(text) {
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));

        return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
    }

    /* ---------- open / close ---------- */

    open() {
        this.els.mode.value = this.getMode();
        this.updateRule();
        this.renderDonePicker();
        this.els.page.classList.add("open");
        document.body.classList.add("match-open");
        this.load();
    }

    close() {
        this.els.page.classList.remove("open");
        document.body.classList.remove("match-open");
    }

    isOpen() {
        return this.els.page.classList.contains("open");
    }

    /* ---------- 等待後端時的狀態 ---------- */

    // 按鈕顯示轉圈並鎖住，直到整個操作（含重新載入列表）完成
    setBusy(button, busy) {
        if (!button) {
            return;
        }

        button.disabled = busy;
        button.classList.toggle("is-busy", busy);
        button.setAttribute("aria-busy", String(busy));
    }

    setFormLocked(form, locked) {
        form.querySelectorAll("input, select, textarea, button").forEach((field) => {
            field.disabled = locked;
        });
    }

    showToast(text, type = "success") {
        const toast = this.els.toast;

        toast.textContent = text;
        toast.className = `match-toast ${type} show`;

        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => {
            toast.classList.remove("show");
        }, 2600);
    }

    /* ---------- api ---------- */

    async api(payload) {
        let response;

        try {
            response = payload
                ? await fetch(MATCH_API_URL, {
                    method: "POST",
                    // text/plain 可避免 CORS 預檢，Apps Script 才收得到
                    headers: { "Content-Type": "text/plain;charset=utf-8" },
                    body: JSON.stringify({ ...payload, ownerKey: this.ownerKey })
                })
                : await fetch(`${MATCH_API_URL}?t=${Date.now()}`);
        } catch {
            throw new Error("network");
        }

        let json;

        try {
            json = await response.json();
        } catch {
            throw new Error("server");
        }

        if (!json.ok) {
            const err = new Error(json.error || "server");

            err.detail = json.detail || {};
            throw err;
        }

        return json.data;
    }

    errorText(err, mode = this.els.mode.value) {
        const code = err && err.message ? err.message : "server";
        const detail = (err && err.detail) || {};
        const text = this.t(`error.${code}`, {
            min: this.formatNumber(MIN_TOKENS[mode] || 0),
            hours: detail.hours || 24,
            minutes: detail.minutes || 1
        });

        return text === `error.${code}` ? this.t("error.server") : text;
    }

    async load() {
        if (!this.isConfigured()) {
            this.status = "notConfigured";
            this.render();
            return;
        }

        // 只採用最後一次載入的結果，避免連點時舊資料蓋掉新資料
        const seq = ++this.loadSeq;

        if (this.status !== "ready") {
            this.status = "loading";
        }

        this.setRefreshing(true);
        this.render();

        try {
            const data = await this.api();

            await this.ownerIdReady;

            if (seq !== this.loadSeq) {
                return;
            }

            this.posts = Array.isArray(data.posts) ? data.posts : [];
            this.ttlDays = data.ttlDays;
            this.status = "ready";
        } catch (err) {
            if (seq !== this.loadSeq) {
                return;
            }

            if (this.status === "ready") {
                // 已有列表時只提示錯誤，不清空畫面
                this.showToast(this.errorText(err), "error");
            } else {
                this.status = "error";
                this.loadError = this.errorText(err);
            }
        }

        this.setRefreshing(false);
        this.render();
    }

    setRefreshing(refreshing) {
        this.refreshing = refreshing;
        this.els.progress.hidden = !refreshing;
        this.els.list.classList.toggle("refreshing", refreshing && this.status === "ready");
        this.setBusy(this.els.refresh, refreshing);
    }

    /* ---------- form ---------- */

    updateRule() {
        const min = MIN_TOKENS[this.els.mode.value] || 0;

        this.els.rule.textContent = min > 0
            ? this.t("form.rule", { min: this.formatNumber(min) })
            : this.t("form.ruleNone");
    }

    getTotal(mode) {
        return CREATURE_COUNT[mode] || 0;
    }

    // 已完成隻數的小圖示列：完成的彩色、未完成的灰色
    renderCreatureIcons(mode, done, interactive) {
        const isGold = String(mode).startsWith("gold");
        const svg = this.getCreatureSvg(mode, isGold);

        return Array.from({ length: this.getTotal(mode) }, (_, index) => {
            const n = index + 1;
            const state = n <= done ? "done" : "todo";

            return interactive
                ? `<button type="button" class="match-creature ${state}" data-done="${n}" aria-pressed="${n <= done}" aria-label="${n}">${svg}</button>`
                : `<span class="match-creature ${state}">${svg}</span>`;
        }).join("");
    }

    renderDonePicker() {
        const mode = this.els.mode.value;
        const total = this.getTotal(mode);

        this.done = Math.min(this.done, total);
        this.els.donePicker.innerHTML = this.renderCreatureIcons(mode, this.done, true);
        this.els.doneHint.textContent = this.t("form.doneHint", { done: this.done, total });
    }

    // 點第 n 隻 = 完成 n 隻；再點同一隻則取消這一隻
    setDone(n) {
        this.done = this.done === n ? n - 1 : n;
        this.renderDonePicker();
    }

    setFormMessage(text, type = "") {
        this.els.formMsg.textContent = text;
        this.els.formMsg.className = `match-form-msg ${type}`.trim();
    }

    validateForm() {
        const mode = this.els.mode.value;
        const team = this.els.team.value.trim();
        const link = this.els.link.value.trim();
        const tokensText = this.els.tokens.value.trim();
        const tokens = Number(tokensText);
        const screenshot = this.els.screenshot.value.trim();

        if (!team) {
            return "badTeam";
        }

        if (LINK_IN_TEXT_RE.test(team)) {
            return "noLinks";
        }

        if (!COIN_LINK_RE.test(link)) {
            return "badLink";
        }

        if (screenshot && !isAllowedScreenshot(screenshot)) {
            return "badScreenshot";
        }

        if (!tokensText || !Number.isInteger(tokens) || tokens < 0) {
            return "badTokens";
        }

        if (tokens < (MIN_TOKENS[mode] || 0)) {
            return "notEnoughTokens";
        }

        return "";
    }

    async submitPost() {
        if (this.submitting) {
            return;
        }

        if (!this.isConfigured()) {
            this.setFormMessage(this.t("notConfigured"), "error");
            return;
        }

        const invalid = this.validateForm();

        if (invalid) {
            this.setFormMessage(this.errorText(new Error(invalid)), "error");
            return;
        }

        // 普通模式送出前再次提醒：需能自己完成一半，缺一兩顆的人優先幫忙
        const min = MIN_TOKENS[this.els.mode.value] || 0;

        if (min > 0 && !confirm(this.t("form.confirmNormal", { min: this.formatNumber(min) }))) {
            return;
        }

        this.submitting = true;
        this.setFormLocked(this.els.form, true);
        this.setBusy(this.els.submit, true);
        this.els.submit.textContent = this.t("form.submitting");
        this.setFormMessage("");

        try {
            await this.api({
                action: "create",
                mode: this.els.mode.value,
                team: this.els.team.value.trim(),
                link: this.els.link.value.trim(),
                tokens: Number(this.els.tokens.value),
                done: this.done,
                screenshot: this.els.screenshot.value.trim()
            });

            this.saveProfile({
                team: this.els.team.value.trim(),
                link: this.els.link.value.trim()
            });

            this.filter = "all";
            await this.load();
            this.setFormMessage(this.t("form.success"), "success");
            this.showToast(this.t("form.success"));
        } catch (err) {
            this.setFormMessage(this.errorText(err), "error");
        } finally {
            this.submitting = false;
            this.setFormLocked(this.els.form, false);
            this.setBusy(this.els.submit, false);
            this.els.submit.textContent = this.t("form.submit");
        }
    }

    async submitComment(form) {
        const postId = form.dataset.postId;
        const nameInput = form.querySelector("[name=name]");
        const messageInput = form.querySelector("[name=message]");
        const msgEl = form.querySelector(".match-comment-msg");
        const button = form.querySelector("button");
        const name = nameInput.value.trim();
        const message = messageInput.value.trim();

        if (!name || !message) {
            msgEl.textContent = this.t(!name ? "error.badName" : "error.badMessage");
            return;
        }

        if (LINK_IN_TEXT_RE.test(name) || LINK_IN_TEXT_RE.test(message)) {
            msgEl.textContent = this.t("error.noLinks");
            return;
        }

        this.setFormLocked(form, true);
        this.setBusy(button, true);
        msgEl.textContent = "";

        try {
            await this.api({ action: "comment", postId, name, message });
            this.saveProfile({ name });
            // 留言已送出，重新載入時不要再還原草稿
            messageInput.value = "";
            await this.load();
        } catch (err) {
            msgEl.textContent = this.errorText(err);
            this.setFormLocked(form, false);
            this.setBusy(button, false);
        }
    }

    async deletePost(postId, button) {
        if (!confirm(this.t("post.deleteConfirm"))) {
            return;
        }

        const card = button.closest(".match-post");

        this.setBusy(button, true);
        card.classList.add("busy");

        try {
            await this.api({ action: "delete", postId });
            await this.load();
            this.showToast(this.t("post.deleted"));
        } catch (err) {
            this.showToast(this.errorText(err), "error");
            this.setBusy(button, false);
            card.classList.remove("busy");
        }
    }

    // 發文者修改自己貼文的代幣數量（門檻與發文時相同）
    async editTokens(postId, button) {
        const post = this.posts.find((item) => item.id === postId);

        if (!post) {
            return;
        }

        const input = prompt(this.t("post.editTokensPrompt"), String(post.tokens));

        if (input === null) {
            return;
        }

        const tokens = Number(input.trim());

        if (!input.trim() || !Number.isInteger(tokens) || tokens < 0) {
            this.showToast(this.t("error.badTokens"), "error");
            return;
        }

        if (tokens < (MIN_TOKENS[post.mode] || 0)) {
            this.showToast(this.errorText(new Error("notEnoughTokens"), post.mode), "error");
            return;
        }

        if (tokens === post.tokens) {
            return;
        }

        this.setBusy(button, true);

        try {
            await this.api({ action: "updateTokens", postId, tokens });
            await this.load();
            this.showToast(this.t("post.tokensUpdated"));
        } catch (err) {
            this.showToast(this.errorText(err, post.mode), "error");
            this.setBusy(button, false);
        }
    }

    async reportPost(postId, button) {
        const reason = prompt(this.t("post.reportPrompt"));

        if (reason === null) {
            return;
        }

        if (!reason.trim()) {
            this.showToast(this.t("error.badReason"), "error");
            return;
        }

        this.setBusy(button, true);

        try {
            await this.api({ action: "report", postId, reason: reason.trim() });
            this.showToast(this.t("post.reported"));
        } catch (err) {
            this.showToast(this.errorText(err), "error");
        } finally {
            this.setBusy(button, false);
        }
    }

    async reportComment(commentId, button) {
        const reason = prompt(this.t("post.reportCommentPrompt"));

        if (reason === null) {
            return;
        }

        if (!reason.trim()) {
            this.showToast(this.t("error.badReason"), "error");
            return;
        }

        this.setBusy(button, true);

        try {
            await this.api({ action: "reportComment", commentId, reason: reason.trim() });
            this.showToast(this.t("post.reported"));
        } catch (err) {
            this.showToast(this.errorText(err), "error");
        } finally {
            this.setBusy(button, false);
        }
    }

    async copyLink(button) {
        const link = button.dataset.copy;
        let copied = false;

        try {
            await navigator.clipboard.writeText(link);
            copied = true;
        } catch {
            // 舊瀏覽器或剪貼簿權限被擋時改用隱藏文字框複製
            const area = document.createElement("textarea");

            area.value = link;
            area.setAttribute("readonly", "");
            area.style.position = "fixed";
            area.style.opacity = "0";
            document.body.appendChild(area);
            area.select();

            try {
                copied = document.execCommand("copy");
            } catch {
                copied = false;
            }

            area.remove();
        }

        if (!copied) {
            prompt(this.t("post.copyManual"), link);
            return;
        }

        button.textContent = this.t("post.copied");
        button.classList.add("copied");

        clearTimeout(button.copyTimer);
        button.copyTimer = setTimeout(() => {
            button.textContent = this.t("post.copyLink");
            button.classList.remove("copied");
        }, 1500);
    }

    /* ---------- profile (只存在這台裝置) ---------- */

    readProfile() {
        try {
            return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {};
        } catch {
            return {};
        }
    }

    saveProfile(patch) {
        try {
            localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...this.readProfile(), ...patch }));
        } catch {
            // 無法存取 localStorage 時略過
        }
    }

    restoreProfile() {
        const profile = this.readProfile();

        this.els.team.value = profile.team || "";
        this.els.link.value = profile.link || "";
    }

    /* ---------- render ---------- */

    applyI18n() {
        document.querySelectorAll("[data-match-i18n]").forEach((node) => {
            node.textContent = this.t(node.dataset.matchI18n);
        });

        document.querySelectorAll("[data-match-i18n-placeholder]").forEach((node) => {
            node.placeholder = this.t(node.dataset.matchI18nPlaceholder);
        });

        const selected = this.els.mode.value || this.getMode();

        this.els.mode.innerHTML = MODE_ORDER.map((mode) => {
            return `<option value="${mode}">${this.escapeHtml(this.appT(`mode.${mode}`))}</option>`;
        }).join("");
        this.els.mode.value = selected;

        if (!this.submitting) {
            this.els.submit.textContent = this.t("form.submit");
        }

        this.updateRule();
        this.renderDonePicker();
        this.render();
    }

    renderFilter() {
        const counts = { all: this.posts.length };

        this.posts.forEach((post) => {
            counts[post.mode] = (counts[post.mode] || 0) + 1;
        });

        this.els.filter.innerHTML = ["all", ...MODE_ORDER].map((mode) => {
            const label = mode === "all" ? this.t("filter.all") : this.appT(`mode.${mode}`);
            const gold = mode.startsWith("gold") ? " gold" : "";
            const active = this.filter === mode ? " active" : "";

            return `
                <button type="button" class="match-chip${gold}${active}" data-filter="${mode}">
                    ${this.escapeHtml(label)} <span>${counts[mode] || 0}</span>
                </button>
            `;
        }).join("");
    }

    render() {
        this.renderFilter();

        const notice = {
            notConfigured: this.t("notConfigured"),
            error: this.loadError || this.t("error.server")
        }[this.status];

        this.els.notice.hidden = !notice;
        this.els.notice.textContent = notice || "";
        this.els.notice.className = `match-notice ${this.status}`;

        if (this.status === "loading") {
            this.els.list.innerHTML = this.renderSkeleton();
            return;
        }

        if (this.status !== "ready") {
            this.els.list.innerHTML = "";
            return;
        }

        const posts = this.filter === "all"
            ? this.posts
            : this.posts.filter((post) => post.mode === this.filter);

        if (!posts.length) {
            this.els.list.innerHTML = `<p class="match-empty">${this.escapeHtml(this.t("empty", { days: this.ttlDays || 3 }))}</p>`;
            return;
        }

        const profile = this.readProfile();
        const drafts = this.collectCommentDrafts();

        this.els.list.innerHTML = posts.map((post) => this.renderPost(post, profile)).join("");
        this.restoreCommentDrafts(drafts);
    }

    renderSkeleton() {
        const card = `
            <div class="match-post match-skeleton" aria-hidden="true">
                <span class="sk sk-badge"></span>
                <span class="sk sk-title"></span>
                <span class="sk sk-line"></span>
                <span class="sk sk-button"></span>
            </div>
        `;

        return `<p class="match-sr-only" role="status">${this.escapeHtml(this.t("loading"))}</p>${card}${card}`;
    }

    // 重新載入列表時保留正在輸入的留言
    collectCommentDrafts() {
        const drafts = {};

        this.els.list.querySelectorAll(".match-comment-form").forEach((form) => {
            const name = form.querySelector("[name=name]").value;
            const message = form.querySelector("[name=message]").value;

            if (message) {
                drafts[form.dataset.postId] = { name, message };
            }
        });

        return drafts;
    }

    restoreCommentDrafts(drafts) {
        this.els.list.querySelectorAll(".match-comment-form").forEach((form) => {
            const draft = drafts[form.dataset.postId];

            if (draft) {
                form.querySelector("[name=name]").value = draft.name;
                form.querySelector("[name=message]").value = draft.message;
            }
        });
    }

    renderPost(post, profile) {
        const esc = this.escapeHtml;
        const gold = String(post.mode).startsWith("gold");
        const safeLink = /^https:\/\//i.test(post.link) ? post.link : "";
        const isMine = Boolean(this.ownerId) && post.ownerId === this.ownerId;
        const comments = Array.isArray(post.comments) ? post.comments : [];

        const safeScreenshot = post.screenshot && isAllowedScreenshot(post.screenshot) ? post.screenshot : "";
        const reportCount = Number(post.reportCount) || 0;

        const commentItems = comments.length
            ? comments.map((comment) => {
                const canReport = Boolean(this.ownerId) && comment.ownerId !== this.ownerId;

                return `
                    <li class="${comment.isAuthor ? "author" : ""}">
                        <b>${esc(comment.name)}</b>
                        ${comment.isAuthor ? `<span class="match-author-badge">${esc(this.t("post.author"))}</span>` : ""}
                        <span class="match-comment-text">${esc(comment.message)}</span>
                        <div class="match-comment-meta">
                            <time>${esc(this.formatTimeAgo(comment.createdAt))}</time>
                            ${canReport ? `<button type="button" class="match-comment-report" data-report-comment="${esc(comment.id)}">${esc(this.t("post.report"))}</button>` : ""}
                        </div>
                    </li>
                `;
            }).join("")
            : `<li class="match-no-comment">${esc(this.t("post.noComments"))}</li>`;

        return `
            <article class="match-post${gold ? " gold" : ""}">
                <div class="match-post-head">
                    <span class="match-badge">${esc(this.appT(`mode.${post.mode}`))}</span>
                    ${isMine ? `<span class="match-mine">${esc(this.t("post.mine"))}</span>` : ""}
                    <time>${esc(this.formatTimeAgo(post.createdAt))}</time>
                </div>

                <h3 class="match-team">${esc(post.team)}</h3>
                ${reportCount > 0 ? `<div class="match-report-count">${esc(this.t("post.reportCount", { n: reportCount }))}</div>` : ""}
                <div class="match-tokens">
                    ${esc(this.t("post.tokens", { n: this.formatNumber(post.tokens) }))}
                    ${post.updatedAt ? `<span class="match-edited">${esc(this.t("post.edited", { time: this.formatTimeAgo(post.updatedAt) }))}</span>` : ""}
                </div>
                ${Number.isInteger(post.done) && post.total ? `
                    <div class="match-done-row">
                        <div class="match-done-icons">${this.renderCreatureIcons(post.mode, post.done, false)}</div>
                        <span class="match-done-text">${esc(this.t("post.done", { done: post.done, total: post.total }))}</span>
                    </div>
                ` : ""}

                ${safeScreenshot ? `<a class="match-screenshot-link" href="${esc(safeScreenshot)}" target="_blank" rel="noopener noreferrer nofollow">${esc(this.t("post.viewScreenshot"))}</a>` : ""}

                <div class="match-actions">
                    ${safeLink ? `<button type="button" class="match-link-btn" data-copy="${esc(safeLink)}">${esc(this.t("post.copyLink"))}</button>` : ""}
                    ${isMine
                        ? `<button type="button" class="match-edit-btn" data-edit-tokens="${esc(post.id)}">${esc(this.t("post.editTokens"))}</button>
                           <button type="button" class="match-delete-btn" data-delete="${esc(post.id)}">${esc(this.t("post.delete"))}</button>`
                        : `<button type="button" class="match-report-btn" data-report="${esc(post.id)}">${esc(this.t("post.report"))}</button>`}
                </div>

                <div class="match-comments">
                    <div class="match-comments-title">${esc(this.t("post.comments", { n: comments.length }))}</div>
                    <ul>${commentItems}</ul>

                    <form class="match-comment-form" data-post-id="${esc(post.id)}" novalidate>
                        <input name="name" type="text" maxlength="20" value="${esc(profile.name || "")}" placeholder="${esc(this.t("post.namePlaceholder"))}" aria-label="${esc(this.t("post.namePlaceholder"))}">
                        <input name="message" type="text" maxlength="200" placeholder="${esc(this.t("post.messagePlaceholder"))}" aria-label="${esc(this.t("post.messagePlaceholder"))}">
                        <button type="submit">${esc(this.t("post.send"))}</button>
                        <p class="match-comment-msg" role="status"></p>
                    </form>
                </div>
            </article>
        `;
    }

    /* ---------- events ---------- */

    bindEvents() {
        this.els.openBtn.addEventListener("click", () => this.open());
        this.els.backBtn.addEventListener("click", () => this.close());
        this.els.refresh.addEventListener("click", () => this.load());
        this.els.mode.addEventListener("change", () => {
            this.updateRule();
            this.renderDonePicker();
        });

        this.els.donePicker.addEventListener("click", (event) => {
            const item = event.target.closest("[data-done]");

            if (item) {
                this.setDone(Number(item.dataset.done));
            }
        });

        this.els.form.addEventListener("submit", (event) => {
            event.preventDefault();
            this.submitPost();
        });

        this.els.filter.addEventListener("click", (event) => {
            const chip = event.target.closest("[data-filter]");

            if (chip) {
                this.filter = chip.dataset.filter;
                this.render();
            }
        });

        this.els.list.addEventListener("click", (event) => {
            const del = event.target.closest("[data-delete]");
            const editTokens = event.target.closest("[data-edit-tokens]");
            const report = event.target.closest("[data-report]");
            const copy = event.target.closest("[data-copy]");
            const reportComment = event.target.closest("[data-report-comment]");

            if (editTokens) {
                this.editTokens(editTokens.dataset.editTokens, editTokens);
            } else if (reportComment) {
                this.reportComment(reportComment.dataset.reportComment, reportComment);
            } else if (del) {
                this.deletePost(del.dataset.delete, del);
            } else if (report) {
                this.reportPost(report.dataset.report, report);
            } else if (copy) {
                this.copyLink(copy);
            }
        });

        this.els.list.addEventListener("submit", (event) => {
            const form = event.target.closest(".match-comment-form");

            if (form) {
                event.preventDefault();
                this.submitComment(form);
            }
        });
    }
}
