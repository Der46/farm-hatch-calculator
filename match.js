import { MATCH_I18N } from "./match-i18n.js?v=20261023f";

// 部署 Apps Script 後，把「網頁應用程式」網址貼在這裡（見 README「媒合平台設定」）
const MATCH_API_URL = "https://script.google.com/macros/s/AKfycbyocp1bZSLy3IVUYbJ1r7596t_RqNj8_AvssK7pCckDCz6ICbVpga1LTOA3q1CvTIQYNg/exec";

const PROFILE_KEY = "coin999_match_profile_v1";
const OWNER_KEY = "coin999_match_owner_v1";

const MODE_ORDER = ["hatch", "farm", "goldHatch", "goldFarm"];

// 至少能完成一半才可以上來找人（需與 backend/apps-script.gs 的 MIN_TOKENS 一致）
const MIN_TOKENS = {
    hatch: 14500,
    farm: 7500,
    goldHatch: 0,
    goldFarm: 0
};

export class MatchBoard {
    constructor({ getLang, getLocale, getMode, appT, escapeHtml }) {
        this.getLang = getLang;
        this.getLocale = getLocale;
        this.getMode = getMode;
        this.appT = appT;
        this.escapeHtml = escapeHtml;

        this.posts = [];
        this.filter = "all";
        this.status = "idle";
        this.submitting = false;

        this.els = {
            openBtn: document.getElementById("matchOpenBtn"),
            page: document.getElementById("matchPage"),
            backBtn: document.getElementById("matchBackBtn"),
            notice: document.getElementById("matchNotice"),
            form: document.getElementById("matchForm"),
            mode: document.getElementById("matchMode"),
            team: document.getElementById("matchTeam"),
            link: document.getElementById("matchLink"),
            tokens: document.getElementById("matchTokens"),
            note: document.getElementById("matchNote"),
            rule: document.getElementById("matchRule"),
            formMsg: document.getElementById("matchFormMsg"),
            submit: document.getElementById("matchSubmit"),
            refresh: document.getElementById("matchRefresh"),
            filter: document.getElementById("matchFilter"),
            list: document.getElementById("matchList")
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
            throw new Error(json.error || "server");
        }

        return json.data;
    }

    errorText(err) {
        const code = err && err.message ? err.message : "server";
        const text = this.t(`error.${code}`, {
            min: this.formatNumber(MIN_TOKENS[this.els.mode.value] || 0)
        });

        return text === `error.${code}` ? this.t("error.server") : text;
    }

    async load() {
        if (!this.isConfigured()) {
            this.status = "notConfigured";
            this.render();
            return;
        }

        this.status = "loading";
        this.render();

        try {
            const data = await this.api();

            await this.ownerIdReady;
            this.posts = Array.isArray(data.posts) ? data.posts : [];
            this.ttlDays = data.ttlDays;
            this.status = "ready";
        } catch (err) {
            this.status = "error";
            this.loadError = this.errorText(err);
        }

        this.render();
    }

    /* ---------- form ---------- */

    updateRule() {
        const min = MIN_TOKENS[this.els.mode.value] || 0;

        this.els.rule.textContent = min > 0
            ? this.t("form.rule", { min: this.formatNumber(min) })
            : this.t("form.ruleNone");
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
        if (!team) {
            return "badTeam";
        }

        if (!/^https:\/\/[^\s<>"']+$/i.test(link)) {
            return "badLink";
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
        this.els.submit.disabled = true;
        this.els.submit.textContent = this.t("form.submitting");
        this.setFormMessage("");

        try {
            await this.api({
                action: "create",
                mode: this.els.mode.value,
                team: this.els.team.value.trim(),
                link: this.els.link.value.trim(),
                tokens: Number(this.els.tokens.value),
                note: this.els.note.value.trim()
            });

            this.saveProfile({
                team: this.els.team.value.trim(),
                link: this.els.link.value.trim()
            });

            this.els.note.value = "";
            this.setFormMessage(this.t("form.success"), "success");
            this.filter = "all";
            await this.load();
        } catch (err) {
            this.setFormMessage(this.errorText(err), "error");
        } finally {
            this.submitting = false;
            this.els.submit.disabled = false;
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

        button.disabled = true;
        msgEl.textContent = "";

        try {
            await this.api({ action: "comment", postId, name, message });
            this.saveProfile({ name });
            await this.load();
        } catch (err) {
            msgEl.textContent = this.errorText(err);
            button.disabled = false;
        }
    }

    async deletePost(postId) {
        if (!confirm(this.t("post.deleteConfirm"))) {
            return;
        }

        try {
            await this.api({ action: "delete", postId });
            await this.load();
        } catch (err) {
            alert(this.errorText(err));
        }
    }

    async reportPost(postId) {
        const reason = prompt(this.t("post.reportPrompt"));

        if (reason === null) {
            return;
        }

        if (!reason.trim()) {
            alert(this.t("error.badReason"));
            return;
        }

        try {
            await this.api({ action: "report", postId, reason: reason.trim() });
            alert(this.t("post.reported"));
        } catch (err) {
            alert(this.errorText(err));
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
            loading: this.t("loading"),
            error: this.loadError || this.t("error.server")
        }[this.status];

        this.els.notice.hidden = !notice;
        this.els.notice.textContent = notice || "";
        this.els.notice.className = `match-notice ${this.status}`;

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

        this.els.list.innerHTML = posts.map((post) => this.renderPost(post, profile)).join("");
    }

    renderPost(post, profile) {
        const esc = this.escapeHtml;
        const gold = String(post.mode).startsWith("gold");
        const safeLink = /^https:\/\//i.test(post.link) ? post.link : "";
        const isMine = Boolean(this.ownerId) && post.ownerId === this.ownerId;
        const comments = Array.isArray(post.comments) ? post.comments : [];

        const commentItems = comments.length
            ? comments.map((comment) => `
                <li>
                    <b>${esc(comment.name)}</b>
                    <span class="match-comment-text">${esc(comment.message)}</span>
                    <time>${esc(this.formatTimeAgo(comment.createdAt))}</time>
                </li>
            `).join("")
            : `<li class="match-no-comment">${esc(this.t("post.noComments"))}</li>`;

        return `
            <article class="match-post${gold ? " gold" : ""}">
                <div class="match-post-head">
                    <span class="match-badge">${esc(this.appT(`mode.${post.mode}`))}</span>
                    ${isMine ? `<span class="match-mine">${esc(this.t("post.mine"))}</span>` : ""}
                    <time>${esc(this.formatTimeAgo(post.createdAt))}</time>
                </div>

                <h3 class="match-team">${esc(post.team)}</h3>
                <div class="match-tokens">${esc(this.t("post.tokens", { n: this.formatNumber(post.tokens) }))}</div>
                ${post.note ? `<p class="match-note">${esc(post.note)}</p>` : ""}

                <div class="match-actions">
                    ${safeLink ? `<button type="button" class="match-link-btn" data-copy="${esc(safeLink)}">${esc(this.t("post.copyLink"))}</button>` : ""}
                    ${isMine
                        ? `<button type="button" class="match-delete-btn" data-delete="${esc(post.id)}">${esc(this.t("post.delete"))}</button>`
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
        this.els.mode.addEventListener("change", () => this.updateRule());

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
            const report = event.target.closest("[data-report]");
            const copy = event.target.closest("[data-copy]");

            if (del) {
                this.deletePost(del.dataset.delete);
            } else if (report) {
                this.reportPost(report.dataset.report);
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
