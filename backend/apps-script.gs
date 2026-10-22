/**
 * Coin999 夥伴媒合平台 後端 (Google Apps Script + Google Sheet)
 *
 * 部署方式請見 README「媒合平台設定」。
 * 這支程式必須「綁定」在要存資料的 Google 試算表上
 * （試算表 → 擴充功能 → Apps Script），會自動建立 Posts / Comments / Reports / Bans 工作表。
 *
 * 身分：前端在每台裝置產生一組隨機金鑰 (ownerKey) 存在瀏覽器，
 * 後端只保存它的 SHA-256 (ownerId)。只有持有金鑰的裝置能刪除自己的貼文。
 */

const SHEET_POSTS = "Posts";
const SHEET_COMMENTS = "Comments";
const SHEET_REPORTS = "Reports";
const SHEET_BANS = "Bans";

// 貼文顯示天數，超過就不再列出（資料仍留在試算表）
const POST_TTL_DAYS = 3;
const MAX_LIST_POSTS = 100;

// 同一個交友連結發文後（就算刪除）要隔多久才能再發
const REPOST_COOLDOWN_HOURS = 24;

// 舉報通知寄到這個信箱；留空則寄給部署這支程式的帳號
const ADMIN_EMAIL = "";
const MAX_EMAILS_PER_DAY = 50;

// 上來找人至少要能完成一半：普通孵化 170,000 分 = 14,500 代幣、普通耕種 90,000 分 = 7,500 代幣
const MIN_TOKENS = {
    hatch: 14500,
    farm: 7500,
    goldHatch: 0,
    goldFarm: 0
};

// 每種模式的夥伴隻數（發文時點選已完成幾隻）
const CREATURE_COUNT = {
    hatch: 4,
    farm: 4,
    goldHatch: 2,
    goldFarm: 2
};

/**
 * 頻率限制：[次數, 秒數]。device 以裝置為單位，global 以全站為單位，
 * 避免有人用程式大量發文或洗留言拖垮試算表。
 */
const RATE_LIMITS = {
    create: { device: [3, 3600], global: [60, 600] },
    comment: { device: [5, 60], device2: [30, 3600], global: [200, 600] },
    report: { device: [10, 3600] },
    updateTokens: { device: [10, 3600] }
};

const LIMITS = {
    team: 20,
    link: 300,
    screenshot: 300,
    name: 20,
    message: 200,
    reason: 200,
    tokens: 100000000
};

// 只接受 Coin Master 官方交友連結，避免釣魚網站或亂填連結
const COIN_LINK_RE = /^https:\/\/(www\.)?getcoinmaster\.com\/~[A-Za-z0-9_-]{4,40}\/?(\?[A-Za-z0-9=&_%.-]*)?$/i;

// 截圖連結只接受常見圖床，避免被拿來放釣魚網址
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

// 留言、暱稱不可夾帶連結或網址（避免搶人、導向釣魚網站）
const LINK_IN_TEXT_RE = /(https?:\/\/|www\.|getcoinmaster|~[A-Za-z0-9]{6,}|\b[a-z0-9-]+\.(com|net|org|io|me|ly|gg|tw|cc|co|app|link|xyz|top|info)\b)/i;

// note 為舊版欄位（已改用 done），保留以相容舊資料
const POST_HEADERS = ["id", "createdAt", "mode", "team", "link", "tokens", "note", "ownerId", "deleted", "done", "screenshot", "updatedAt"];
const COMMENT_HEADERS = ["id", "postId", "createdAt", "name", "message", "deleted", "ownerId"];
const REPORT_HEADERS = ["id", "createdAt", "postId", "team", "link", "postOwnerId", "reason", "reporterId", "handled", "type", "commentId", "commentName", "commentOwnerId"];
const BAN_HEADERS = ["target", "note", "createdAt"];

const LIST_CACHE_KEY = "list_v2";
const LIST_CACHE_SECONDS = 20;

function doGet() {
    return respond_(() => listPostsCached_());
}

function doPost(e) {
    return respond_(() => {
        let body;

        try {
            body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
        } catch (err) {
            throw userError_("badRequest");
        }

        switch (body.action) {
            case "create":
                return withLock_(() => createPost_(body));
            case "comment":
                return withLock_(() => addComment_(body));
            case "delete":
                return withLock_(() => deletePost_(body));
            case "updateTokens":
                return withLock_(() => updateTokens_(body));
            case "report":
                return withLock_(() => reportPost_(body));
            case "reportComment":
                return withLock_(() => reportComment_(body));
            default:
                throw userError_("badRequest");
        }
    });
}

/* ---------- 試算表選單：管理員封鎖玩家 ---------- */

function onOpen() {
    SpreadsheetApp.getUi()
        .createMenu("媒合平台")
        .addItem("封鎖選取列的玩家", "banSelectedRows")
        .addItem("寄送測試通知信", "sendTestEmail")
        .addToUi();
}

/**
 * 在 Posts / Reports / Comments 工作表選取一列或多列後執行：
 * - Posts：封鎖發文者（交友連結＋作者ID），隱藏他的貼文
 * - Comments：封鎖留言者（作者ID），隱藏他的留言
 * - Reports：依舉報類型封鎖被舉報的發文者或留言者，並把該舉報標記為已處理
 * 解除封鎖：到 Bans 工作表刪除對應的列即可。
 */
function banSelectedRows() {
    const ui = SpreadsheetApp.getUi();
    const sheet = SpreadsheetApp.getActiveSheet();
    const sheetName = sheet.getName();
    const headersByName = {};

    headersByName[SHEET_POSTS] = POST_HEADERS;
    headersByName[SHEET_REPORTS] = REPORT_HEADERS;
    headersByName[SHEET_COMMENTS] = COMMENT_HEADERS;

    const headers = headersByName[sheetName];

    if (!headers) {
        ui.alert("請先到 Posts、Reports 或 Comments 工作表選取要封鎖的列。");
        return;
    }

    const range = sheet.getActiveRange();
    const firstRow = Math.max(range.getRow(), 2);
    const lastRow = range.getLastRow();

    if (lastRow < firstRow) {
        ui.alert("請選取資料列（不是標題列）。");
        return;
    }

    const rows = sheet.getRange(firstRow, 1, lastRow - firstRow + 1, headers.length).getValues().map((values) => {
        const row = {};

        headers.forEach((key, index) => {
            row[key] = values[index];
        });

        return row;
    });

    const targets = new Set();
    const postIds = new Set();
    const add = (value) => {
        if (value) {
            targets.add(normalizeLink_(value));
        }
    };

    rows.forEach((row) => {
        if (sheetName === SHEET_POSTS) {
            add(row.link);
            add(row.ownerId);
            postIds.add(String(row.id));
        } else if (sheetName === SHEET_COMMENTS) {
            // 留言的 postId 是別人的貼文，不能隱藏
            add(row.ownerId);
        } else if (String(row.type) === "comment") {
            add(row.commentOwnerId);
        } else {
            add(row.link);
            add(row.postOwnerId);
            postIds.add(String(row.postId));
        }
    });

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
        const bansSheet = getSheet_(SHEET_BANS, BAN_HEADERS);
        const existing = getBanSet_();
        const now = Date.now();
        let added = 0;

        targets.forEach((target) => {
            if (!existing.has(target)) {
                bansSheet.appendRow([sheetSafe_(target), "從 " + sheetName + " 封鎖", now]);
                added += 1;
            }
        });

        const postsSheet = getSheet_(SHEET_POSTS, POST_HEADERS);
        const deletedCol = POST_HEADERS.indexOf("deleted") + 1;
        let hidden = 0;

        readRows_(postsSheet, POST_HEADERS).forEach((row, index) => {
            const matches = postIds.has(String(row.id))
                || targets.has(normalizeLink_(row.link))
                || targets.has(String(row.ownerId));

            if (matches && !isTrue_(row.deleted)) {
                postsSheet.getRange(index + 2, deletedCol).setValue(true);
                hidden += 1;
            }
        });

        if (sheetName === SHEET_REPORTS) {
            const handledCol = REPORT_HEADERS.indexOf("handled") + 1;

            sheet.getRange(firstRow, handledCol, lastRow - firstRow + 1, 1)
                .setValues(rows.map(() => [true]));
        }

        clearListCache_();
        ui.alert("已加入封鎖 " + added + " 筆，隱藏貼文 " + hidden + " 篇。\n解除封鎖請到 Bans 工作表刪除對應的列。");
    } finally {
        lock.releaseLock();
    }
}

// 第一次使用前請在 Apps Script 編輯器執行一次，授權寄信權限
function sendTestEmail() {
    MailApp.sendEmail(
        getAdminEmail_(),
        "[媒合平台] 測試通知信",
        "收到這封信代表舉報通知已設定完成。\n試算表：" + SpreadsheetApp.getActiveSpreadsheet().getUrl()
    );
}

/* ---------- actions ---------- */

function listPostsCached_() {
    const cache = CacheService.getScriptCache();
    const cached = cache.get(LIST_CACHE_KEY);

    if (cached) {
        return JSON.parse(cached);
    }

    const data = listPosts_();

    try {
        cache.put(LIST_CACHE_KEY, JSON.stringify(data), LIST_CACHE_SECONDS);
    } catch (err) {
        // 資料超過快取上限時不快取
    }

    return data;
}

function clearListCache_() {
    CacheService.getScriptCache().remove(LIST_CACHE_KEY);
}

function listPosts_() {
    const since = Date.now() - POST_TTL_DAYS * 24 * 60 * 60 * 1000;
    const bans = getBanSet_();

    const postRows = readRows_(getSheet_(SHEET_POSTS, POST_HEADERS), POST_HEADERS)
        .filter((row) => {
            return !isTrue_(row.deleted)
                && Number(row.createdAt) >= since
                && !bans.has(normalizeLink_(row.link))
                && !bans.has(String(row.ownerId));
        })
        .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
        .slice(0, MAX_LIST_POSTS);

    // 被舉報次數以「交友連結」累計，刪文重發也不會歸零（被管理員駁回的不算）
    const reportCounts = {};

    readRows_(getSheet_(SHEET_REPORTS, REPORT_HEADERS), REPORT_HEADERS).forEach((row) => {
        if (String(row.type) !== "comment" && !isDismissed_(row.handled)) {
            const key = normalizeLink_(row.link);

            reportCounts[key] = (reportCounts[key] || 0) + 1;
        }
    });

    const posts = postRows.map((row) => {
        const post = publicPost_(row);

        post.reportCount = reportCounts[normalizeLink_(row.link)] || 0;
        return post;
    });

    const ownerByPost = {};

    posts.forEach((post) => {
        ownerByPost[post.id] = post.ownerId;
    });

    const commentsByPost = {};

    readRows_(getSheet_(SHEET_COMMENTS, COMMENT_HEADERS), COMMENT_HEADERS)
        .filter((row) => {
            return !isTrue_(row.deleted)
                && Object.prototype.hasOwnProperty.call(ownerByPost, String(row.postId))
                && !bans.has(String(row.ownerId));
        })
        .sort((a, b) => Number(a.createdAt) - Number(b.createdAt))
        .forEach((row) => {
            const postId = String(row.postId);

            (commentsByPost[postId] = commentsByPost[postId] || []).push({
                id: String(row.id),
                createdAt: Number(row.createdAt),
                name: String(row.name),
                message: String(row.message),
                ownerId: String(row.ownerId),
                // 發文者本人的留言，前端會加上「作者」標籤，避免被冒充
                isAuthor: Boolean(row.ownerId) && String(row.ownerId) === ownerByPost[postId]
            });
        });

    posts.forEach((post) => {
        post.comments = commentsByPost[post.id] || [];
    });

    return {
        posts: posts,
        ttlDays: POST_TTL_DAYS
    };
}

function createPost_(body) {
    const mode = String(body.mode || "");

    if (!Object.prototype.hasOwnProperty.call(MIN_TOKENS, mode)) {
        throw userError_("badMode");
    }

    const ownerId = ownerIdFrom_(body.ownerKey);
    const team = cleanText_(body.team, LIMITS.team);
    const link = cleanText_(body.link, LIMITS.link);
    const screenshot = cleanText_(body.screenshot, LIMITS.screenshot);
    const tokens = Number(body.tokens);
    const done = Number(body.done);

    if (!team) {
        throw userError_("badTeam");
    }

    if (LINK_IN_TEXT_RE.test(team)) {
        throw userError_("noLinks");
    }

    if (!COIN_LINK_RE.test(link)) {
        throw userError_("badLink");
    }

    if (screenshot && !isAllowedScreenshot_(screenshot)) {
        throw userError_("badScreenshot");
    }

    if (!Number.isInteger(tokens) || tokens < 0 || tokens > LIMITS.tokens) {
        throw userError_("badTokens");
    }

    if (tokens < MIN_TOKENS[mode]) {
        throw userError_("notEnoughTokens");
    }

    if (!Number.isInteger(done) || done < 0 || done > CREATURE_COUNT[mode]) {
        throw userError_("badDone");
    }

    const linkKey = normalizeLink_(link);
    const bans = getBanSet_();

    if (bans.has(linkKey) || bans.has(ownerId)) {
        throw userError_("banned");
    }

    const sheet = getSheet_(SHEET_POSTS, POST_HEADERS);
    const rows = readRows_(sheet, POST_HEADERS).filter((row) => normalizeLink_(row.link) === linkKey);
    const now = Date.now();
    const since = now - POST_TTL_DAYS * 24 * 60 * 60 * 1000;

    // 一個交友連結同時只能有一篇徵求（不分模式），避免用無痕視窗重複發文
    if (rows.some((row) => !isTrue_(row.deleted) && Number(row.createdAt) >= since)) {
        throw userError_("duplicateLink");
    }

    // 刪文後也要等冷卻時間才能重發，避免刪文洗掉舉報、重新置頂
    const lastPostAt = rows.reduce((max, row) => Math.max(max, Number(row.createdAt) || 0), 0);
    const cooldownMs = REPOST_COOLDOWN_HOURS * 60 * 60 * 1000;

    if (lastPostAt && now - lastPostAt < cooldownMs) {
        throw userError_("cooldown", {
            hours: Math.ceil((cooldownMs - (now - lastPostAt)) / 3600000)
        });
    }

    rateLimit_("create", ownerId);

    const id = Utilities.getUuid();

    sheet.appendRow([
        id,
        now,
        mode,
        sheetSafe_(team),
        sheetSafe_(link),
        tokens,
        "",
        ownerId,
        false,
        done,
        sheetSafe_(screenshot)
    ]);

    clearListCache_();

    return {
        id: id
    };
}

function addComment_(body) {
    const ownerId = ownerIdFrom_(body.ownerKey);
    const postId = String(body.postId || "");
    const name = cleanText_(body.name, LIMITS.name);
    const message = cleanText_(body.message, LIMITS.message);

    if (!name) {
        throw userError_("badName");
    }

    if (!message) {
        throw userError_("badMessage");
    }

    if (LINK_IN_TEXT_RE.test(name) || LINK_IN_TEXT_RE.test(message)) {
        throw userError_("noLinks");
    }

    if (getBanSet_().has(ownerId)) {
        throw userError_("banned");
    }

    const post = findPost_(postId);

    if (!post || isTrue_(post.row.deleted)) {
        throw userError_("notFound");
    }

    rateLimit_("comment", ownerId);

    const id = Utilities.getUuid();

    getSheet_(SHEET_COMMENTS, COMMENT_HEADERS).appendRow([
        id,
        postId,
        Date.now(),
        sheetSafe_(name),
        sheetSafe_(message),
        false,
        ownerId
    ]);

    clearListCache_();

    return {
        id: id
    };
}

function deletePost_(body) {
    const ownerId = ownerIdFrom_(body.ownerKey);
    const post = findPost_(String(body.postId || ""));

    if (!post || isTrue_(post.row.deleted)) {
        throw userError_("notFound");
    }

    if (String(post.row.ownerId) !== ownerId) {
        throw userError_("notOwner");
    }

    post.sheet.getRange(post.rowNumber, POST_HEADERS.indexOf("deleted") + 1).setValue(true);
    clearListCache_();

    return {
        id: post.row.id
    };
}

// 只有發文的裝置能修改自己貼文的代幣數量，規則與發文時相同
function updateTokens_(body) {
    const ownerId = ownerIdFrom_(body.ownerKey);
    const post = findPost_(String(body.postId || ""));
    const tokens = Number(body.tokens);

    if (!post || isTrue_(post.row.deleted)) {
        throw userError_("notFound");
    }

    if (String(post.row.ownerId) !== ownerId) {
        throw userError_("notOwner");
    }

    if (!Number.isInteger(tokens) || tokens < 0 || tokens > LIMITS.tokens) {
        throw userError_("badTokens");
    }

    if (tokens < (MIN_TOKENS[String(post.row.mode)] || 0)) {
        throw userError_("notEnoughTokens");
    }

    rateLimit_("updateTokens", ownerId);

    const now = Date.now();

    post.sheet.getRange(post.rowNumber, POST_HEADERS.indexOf("tokens") + 1).setValue(tokens);
    post.sheet.getRange(post.rowNumber, POST_HEADERS.indexOf("updatedAt") + 1).setValue(now);
    clearListCache_();

    return {
        id: String(post.row.id),
        tokens: tokens,
        updatedAt: now
    };
}

function reportPost_(body) {
    const reporterId = ownerIdFrom_(body.ownerKey);
    const postId = String(body.postId || "");
    const reason = cleanText_(body.reason, LIMITS.reason);

    if (!reason) {
        throw userError_("badReason");
    }

    const post = findPost_(postId);

    if (!post || isTrue_(post.row.deleted)) {
        throw userError_("notFound");
    }

    if (String(post.row.ownerId) === reporterId) {
        throw userError_("badRequest");
    }

    const sheet = getSheet_(SHEET_REPORTS, REPORT_HEADERS);
    const reports = readRows_(sheet, REPORT_HEADERS);

    const already = reports.some((row) => {
        return String(row.type) !== "comment"
            && String(row.postId) === postId
            && String(row.reporterId) === reporterId;
    });

    if (already) {
        throw userError_("alreadyReported");
    }

    rateLimit_("report", reporterId);

    sheet.appendRow([
        Utilities.getUuid(),
        Date.now(),
        postId,
        sheetSafe_(String(post.row.team)),
        sheetSafe_(String(post.row.link)),
        String(post.row.ownerId),
        sheetSafe_(reason),
        reporterId,
        false,
        "post",
        "",
        "",
        ""
    ]);

    const linkKey = normalizeLink_(post.row.link);
    const count = 1 + reports.filter((row) => {
        return String(row.type) !== "comment"
            && !isDismissed_(row.handled)
            && normalizeLink_(row.link) === linkKey;
    }).length;

    clearListCache_();
    notifyAdmin_("post:" + linkKey,
        "[媒合平台] 貼文被舉報：" + post.row.team + "（此連結累計 " + count + " 次）",
        [
            "暱稱：" + post.row.team,
            "交友連結：" + post.row.link,
            "舉報原因：" + reason,
            "此連結累計被舉報：" + count + " 次"
        ]);

    return {
        postId: postId
    };
}

function reportComment_(body) {
    const reporterId = ownerIdFrom_(body.ownerKey);
    const commentId = String(body.commentId || "");
    const reason = cleanText_(body.reason, LIMITS.reason);

    if (!reason) {
        throw userError_("badReason");
    }

    const comments = readRows_(getSheet_(SHEET_COMMENTS, COMMENT_HEADERS), COMMENT_HEADERS);
    const comment = comments.find((row) => String(row.id) === commentId);

    if (!comment || isTrue_(comment.deleted)) {
        throw userError_("notFound");
    }

    if (String(comment.ownerId) === reporterId) {
        throw userError_("badRequest");
    }

    const post = findPost_(String(comment.postId));
    const sheet = getSheet_(SHEET_REPORTS, REPORT_HEADERS);

    const already = readRows_(sheet, REPORT_HEADERS).some((row) => {
        return String(row.type) === "comment"
            && String(row.commentId) === commentId
            && String(row.reporterId) === reporterId;
    });

    if (already) {
        throw userError_("alreadyReported");
    }

    rateLimit_("report", reporterId);

    sheet.appendRow([
        Utilities.getUuid(),
        Date.now(),
        String(comment.postId),
        post ? sheetSafe_(String(post.row.team)) : "",
        post ? sheetSafe_(String(post.row.link)) : "",
        post ? String(post.row.ownerId) : "",
        sheetSafe_(reason),
        reporterId,
        false,
        "comment",
        commentId,
        sheetSafe_(String(comment.name)),
        String(comment.ownerId)
    ]);

    notifyAdmin_("comment:" + comment.ownerId,
        "[媒合平台] 留言被舉報：" + comment.name,
        [
            "留言者暱稱：" + comment.name,
            "留言內容：" + comment.message,
            "所在貼文：" + (post ? post.row.team + "（" + post.row.link + "）" : "已不存在"),
            "舉報原因：" + reason
        ]);

    return {
        commentId: commentId
    };
}

/* ---------- 防濫用 ---------- */

function rateLimit_(action, ownerId) {
    const rules = RATE_LIMITS[action];
    const cache = CacheService.getScriptCache();
    const now = Date.now();
    const hits = [];

    Object.keys(rules).forEach((scope) => {
        const limit = rules[scope][0];
        const seconds = rules[scope][1];
        const key = "rl:" + action + ":" + scope + ":" + (scope === "global" ? "all" : ownerId);
        const saved = JSON.parse(cache.get(key) || "null");
        const entry = saved && now - saved.start < seconds * 1000
            ? saved
            : { start: now, count: 0 };

        if (entry.count >= limit) {
            throw userError_("rateLimited", {
                minutes: Math.ceil((seconds * 1000 - (now - entry.start)) / 60000)
            });
        }

        hits.push({ key: key, entry: entry, seconds: seconds });
    });

    // 全部通過才計數，避免被擋下的請求也佔用額度
    hits.forEach((hit) => {
        const remaining = Math.max(1, Math.ceil((hit.seconds * 1000 - (now - hit.entry.start)) / 1000));

        hit.entry.count += 1;
        cache.put(hit.key, JSON.stringify(hit.entry), remaining);
    });
}

function notifyAdmin_(dedupeKey, subject, lines) {
    try {
        // 同一個對象 30 分鐘內只寄一次，避免被大量舉報灌爆信箱
        const cache = CacheService.getScriptCache();
        const cacheKey = "mail:" + sha256Hex_(dedupeKey);

        if (cache.get(cacheKey)) {
            return;
        }

        const props = PropertiesService.getScriptProperties();
        const dayKey = "mail_" + Utilities.formatDate(new Date(), "Asia/Taipei", "yyyyMMdd");
        const sent = Number(props.getProperty(dayKey) || 0);

        if (sent >= MAX_EMAILS_PER_DAY) {
            return;
        }

        MailApp.sendEmail(
            getAdminEmail_(),
            subject,
            lines.concat([
                "",
                "處理方式：到 Reports 工作表選取該列 → 媒合平台 → 封鎖選取列的玩家；",
                "若舉報不成立，把 handled 欄改成「駁回」。",
                "試算表：" + SpreadsheetApp.getActiveSpreadsheet().getUrl()
            ]).join("\n")
        );

        props.setProperty(dayKey, String(sent + 1));
        cache.put(cacheKey, "1", 1800);
    } catch (err) {
        // 寄信失敗（例如尚未授權）不影響舉報本身
        console.error(err);
    }
}

function getAdminEmail_() {
    return ADMIN_EMAIL || Session.getEffectiveUser().getEmail();
}

function isAllowedScreenshot_(url) {
    const match = String(url).match(/^https:\/\/([^\/?#\s]+)[^\s<>"']*$/i);

    if (!match) {
        return false;
    }

    const host = match[1].toLowerCase();

    return SCREENSHOT_HOSTS.some((allowed) => host === allowed || host.endsWith("." + allowed));
}

// 管理員在 Reports 的 handled 欄填「駁回」代表舉報不成立，不列入被舉報次數
function isDismissed_(value) {
    return /^(駁回|dismiss(ed)?)$/i.test(String(value).trim());
}

/* ---------- helpers ---------- */

function respond_(fn) {
    let out;

    try {
        out = {
            ok: true,
            data: fn()
        };
    } catch (err) {
        out = {
            ok: false,
            error: err && err.userCode ? err.userCode : "server"
        };

        if (err && err.detail) {
            out.detail = err.detail;
        }

        if (!err || !err.userCode) {
            console.error(err);
        }
    }

    return ContentService
        .createTextOutput(JSON.stringify(out))
        .setMimeType(ContentService.MimeType.JSON);
}

function withLock_(fn) {
    const lock = LockService.getScriptLock();

    if (!lock.tryLock(10000)) {
        throw userError_("busy");
    }

    try {
        return fn();
    } finally {
        lock.releaseLock();
    }
}

function userError_(code, detail) {
    const err = new Error(code);
    err.userCode = code;
    err.detail = detail;
    return err;
}

function getSheet_(name, headers) {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(name);

    if (!sheet) {
        sheet = spreadsheet.insertSheet(name);
        sheet.appendRow(headers);
        sheet.setFrozenRows(1);
        return sheet;
    }

    // 舊版工作表欄位不同時，更新標題列（資料依欄位順序讀取）
    const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];

    if (current.join("|") !== headers.join("|")) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    return sheet;
}

function readRows_(sheet, headers) {
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
        return [];
    }

    return sheet.getRange(2, 1, lastRow - 1, headers.length).getValues().map((values) => {
        const row = {};

        headers.forEach((key, index) => {
            row[key] = values[index];
        });

        return row;
    });
}

function getBanSet_() {
    return new Set(
        readRows_(getSheet_(SHEET_BANS, BAN_HEADERS), BAN_HEADERS)
            .map((row) => normalizeLink_(row.target))
            .filter(Boolean)
    );
}

/**
 * 交友連結比對用的正規化：網域小寫、去掉 # 與結尾斜線。
 * Coin Master 的 getcoinmaster.com/~代碼 連結只看代碼，忽略 ?u=c 這類參數，
 * 避免加參數繞過「一個連結一篇」與封鎖。非網址（例如作者ID）原樣回傳。
 */
function normalizeLink_(value) {
    const text = String(value === undefined || value === null ? "" : value).trim();
    const match = text.match(/^https?:\/\/([^\/?#]+)([^?#]*)(\?[^#]*)?/i);

    if (!match) {
        return text;
    }

    const host = match[1].toLowerCase().replace(/^www\./, "");
    const path = match[2].replace(/\/+$/, "");
    const query = /(^|\.)getcoinmaster\.com$/.test(host) && path.indexOf("/~") === 0
        ? ""
        : (match[3] || "");

    return "https://" + host + path + query;
}

function findPost_(postId) {
    if (!postId) {
        return null;
    }

    const sheet = getSheet_(SHEET_POSTS, POST_HEADERS);
    const rows = readRows_(sheet, POST_HEADERS);
    const index = rows.findIndex((row) => String(row.id) === postId);

    return index === -1
        ? null
        : {
            sheet: sheet,
            row: rows[index],
            rowNumber: index + 2
        };
}

function publicPost_(row) {
    const screenshot = String(row.screenshot || "");

    return {
        id: String(row.id),
        createdAt: Number(row.createdAt),
        mode: String(row.mode),
        team: String(row.team),
        link: String(row.link),
        tokens: Number(row.tokens),
        done: row.done === "" || row.done === null ? null : Number(row.done),
        total: CREATURE_COUNT[String(row.mode)] || 0,
        screenshot: isAllowedScreenshot_(screenshot) ? screenshot : "",
        updatedAt: Number(row.updatedAt) || null,
        ownerId: String(row.ownerId)
    };
}

function ownerIdFrom_(ownerKey) {
    const key = String(ownerKey || "");

    if (!/^[0-9a-f]{32,128}$/.test(key)) {
        throw userError_("noOwner");
    }

    return sha256Hex_(key);
}

function cleanText_(value, maxLength) {
    return String(value === undefined || value === null ? "" : value)
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .trim()
        .slice(0, maxLength);
}

// 避免使用者輸入被試算表當成公式執行
function sheetSafe_(text) {
    return /^[=+\-@]/.test(text)
        ? "'" + text
        : text;
}

function isTrue_(value) {
    return value === true || String(value).toUpperCase() === "TRUE";
}

function sha256Hex_(text) {
    const bytes = Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        text,
        Utilities.Charset.UTF_8
    );

    return bytes.map((b) => ((b + 256) % 256).toString(16).padStart(2, "0")).join("");
}
