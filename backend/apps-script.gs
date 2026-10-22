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

// 上來找人至少要能完成一半：普通孵化 170,000 分 = 14,500 代幣、普通耕種 90,000 分 = 7,500 代幣
const MIN_TOKENS = {
    hatch: 14500,
    farm: 7500,
    goldHatch: 0,
    goldFarm: 0
};

const LIMITS = {
    team: 30,
    link: 300,
    note: 200,
    name: 20,
    message: 200,
    reason: 200,
    tokens: 100000000
};

const POST_HEADERS = ["id", "createdAt", "mode", "team", "link", "tokens", "note", "ownerId", "deleted"];
const COMMENT_HEADERS = ["id", "postId", "createdAt", "name", "message", "deleted", "ownerId"];
const REPORT_HEADERS = ["id", "createdAt", "postId", "team", "link", "postOwnerId", "reason", "reporterId", "handled"];
const BAN_HEADERS = ["target", "note", "createdAt"];

function doGet() {
    return respond_(() => listPosts_());
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
            case "report":
                return withLock_(() => reportPost_(body));
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
        .addToUi();
}

/**
 * 在 Posts / Reports / Comments 工作表選取一列或多列後執行：
 * 會把該玩家的交友連結與作者ID加入 Bans，並隱藏相關貼文。
 * 解除封鎖：到 Bans 工作表刪除對應的列即可。
 */
function banSelectedRows() {
    const ui = SpreadsheetApp.getUi();
    const sheet = SpreadsheetApp.getActiveSheet();
    const headersByName = {};

    headersByName[SHEET_POSTS] = POST_HEADERS;
    headersByName[SHEET_REPORTS] = REPORT_HEADERS;
    headersByName[SHEET_COMMENTS] = COMMENT_HEADERS;

    const headers = headersByName[sheet.getName()];

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

    rows.forEach((row) => {
        [row.link, row.ownerId, row.postOwnerId].forEach((value) => {
            if (value) {
                targets.add(String(value));
            }
        });

        if (sheet.getName() === SHEET_POSTS && row.id) {
            postIds.add(String(row.id));
        }

        // Reports 的 postId 是被舉報的貼文；Comments 的 postId 是別人的貼文，不能隱藏
        if (sheet.getName() === SHEET_REPORTS && row.postId) {
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
                bansSheet.appendRow([sheetSafe_(target), "從 " + sheet.getName() + " 封鎖", now]);
                added += 1;
            }
        });

        const postsSheet = getSheet_(SHEET_POSTS, POST_HEADERS);
        const deletedCol = POST_HEADERS.indexOf("deleted") + 1;
        let hidden = 0;

        readRows_(postsSheet, POST_HEADERS).forEach((row, index) => {
            const matches = postIds.has(String(row.id))
                || targets.has(String(row.link))
                || targets.has(String(row.ownerId));

            if (matches && !isTrue_(row.deleted)) {
                postsSheet.getRange(index + 2, deletedCol).setValue(true);
                hidden += 1;
            }
        });

        ui.alert("已加入封鎖 " + added + " 筆，隱藏貼文 " + hidden + " 篇。\n解除封鎖請到 Bans 工作表刪除對應的列。");
    } finally {
        lock.releaseLock();
    }
}

/* ---------- actions ---------- */

function listPosts_() {
    const since = Date.now() - POST_TTL_DAYS * 24 * 60 * 60 * 1000;
    const bans = getBanSet_();

    const posts = readRows_(getSheet_(SHEET_POSTS, POST_HEADERS), POST_HEADERS)
        .filter((row) => {
            return !isTrue_(row.deleted)
                && Number(row.createdAt) >= since
                && !bans.has(String(row.link))
                && !bans.has(String(row.ownerId));
        })
        .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
        .slice(0, MAX_LIST_POSTS)
        .map(publicPost_);

    const postIds = new Set(posts.map((post) => post.id));
    const commentsByPost = {};

    readRows_(getSheet_(SHEET_COMMENTS, COMMENT_HEADERS), COMMENT_HEADERS)
        .filter((row) => {
            return !isTrue_(row.deleted)
                && postIds.has(String(row.postId))
                && !bans.has(String(row.ownerId));
        })
        .sort((a, b) => Number(a.createdAt) - Number(b.createdAt))
        .forEach((row) => {
            const postId = String(row.postId);

            (commentsByPost[postId] = commentsByPost[postId] || []).push({
                id: String(row.id),
                createdAt: Number(row.createdAt),
                name: String(row.name),
                message: String(row.message)
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
    const note = cleanText_(body.note, LIMITS.note);
    const tokens = Number(body.tokens);

    if (!team) {
        throw userError_("badTeam");
    }

    if (!/^https:\/\/[^\s<>"']+$/i.test(link)) {
        throw userError_("badLink");
    }

    if (!Number.isInteger(tokens) || tokens < 0 || tokens > LIMITS.tokens) {
        throw userError_("badTokens");
    }

    if (tokens < MIN_TOKENS[mode]) {
        throw userError_("notEnoughTokens");
    }

    const bans = getBanSet_();

    if (bans.has(link) || bans.has(ownerId)) {
        throw userError_("banned");
    }

    const sheet = getSheet_(SHEET_POSTS, POST_HEADERS);
    const since = Date.now() - POST_TTL_DAYS * 24 * 60 * 60 * 1000;

    const duplicate = readRows_(sheet, POST_HEADERS).some((row) => {
        return !isTrue_(row.deleted)
            && Number(row.createdAt) >= since
            && String(row.mode) === mode
            && String(row.link) === link;
    });

    if (duplicate) {
        throw userError_("duplicateLink");
    }

    const id = Utilities.getUuid();

    sheet.appendRow([
        id,
        Date.now(),
        mode,
        sheetSafe_(team),
        sheetSafe_(link),
        tokens,
        sheetSafe_(note),
        ownerId,
        false
    ]);

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

    if (getBanSet_().has(ownerId)) {
        throw userError_("banned");
    }

    const post = findPost_(postId);

    if (!post || isTrue_(post.row.deleted)) {
        throw userError_("notFound");
    }

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

    return {
        id: post.row.id
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

    const already = readRows_(sheet, REPORT_HEADERS).some((row) => {
        return String(row.postId) === postId && String(row.reporterId) === reporterId;
    });

    if (already) {
        throw userError_("alreadyReported");
    }

    sheet.appendRow([
        Utilities.getUuid(),
        Date.now(),
        postId,
        sheetSafe_(String(post.row.team)),
        sheetSafe_(String(post.row.link)),
        String(post.row.ownerId),
        sheetSafe_(reason),
        reporterId,
        false
    ]);

    return {
        postId: postId
    };
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

function userError_(code) {
    const err = new Error(code);
    err.userCode = code;
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
            .map((row) => String(row.target).trim())
            .filter(Boolean)
    );
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
    return {
        id: String(row.id),
        createdAt: Number(row.createdAt),
        mode: String(row.mode),
        team: String(row.team),
        link: String(row.link),
        tokens: Number(row.tokens),
        note: String(row.note),
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
