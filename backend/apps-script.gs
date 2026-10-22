/**
 * Coin999 夥伴媒合平台 後端 (Google Apps Script + Google Sheet)
 *
 * 部署方式請見 README「媒合平台設定」。
 * 這支程式必須「綁定」在要存資料的 Google 試算表上
 * （試算表 → 擴充功能 → Apps Script），會自動建立 Posts / Comments 兩個工作表。
 */

const SHEET_POSTS = "Posts";
const SHEET_COMMENTS = "Comments";

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
    password: 30,
    name: 20,
    message: 200,
    tokens: 100000000
};

const POST_HEADERS = ["id", "createdAt", "mode", "team", "link", "tokens", "note", "passHash", "deleted"];
const COMMENT_HEADERS = ["id", "postId", "createdAt", "name", "message", "deleted"];

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
            default:
                throw userError_("badRequest");
        }
    });
}

/* ---------- actions ---------- */

function listPosts_() {
    const since = Date.now() - POST_TTL_DAYS * 24 * 60 * 60 * 1000;

    const posts = readRows_(getSheet_(SHEET_POSTS, POST_HEADERS), POST_HEADERS)
        .filter((row) => !isTrue_(row.deleted) && Number(row.createdAt) >= since)
        .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
        .slice(0, MAX_LIST_POSTS)
        .map(publicPost_);

    const postIds = new Set(posts.map((post) => post.id));
    const commentsByPost = {};

    readRows_(getSheet_(SHEET_COMMENTS, COMMENT_HEADERS), COMMENT_HEADERS)
        .filter((row) => !isTrue_(row.deleted) && postIds.has(String(row.postId)))
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

    const team = cleanText_(body.team, LIMITS.team);
    const link = cleanText_(body.link, LIMITS.link);
    const note = cleanText_(body.note, LIMITS.note);
    const password = String(body.password || "");
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

    if (password.length < 4 || password.length > LIMITS.password) {
        throw userError_("badPassword");
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
    const createdAt = Date.now();

    sheet.appendRow([
        id,
        createdAt,
        mode,
        sheetSafe_(team),
        sheetSafe_(link),
        tokens,
        sheetSafe_(note),
        hashPassword_(id, password),
        false
    ]);

    return {
        id: id
    };
}

function addComment_(body) {
    const postId = String(body.postId || "");
    const name = cleanText_(body.name, LIMITS.name);
    const message = cleanText_(body.message, LIMITS.message);

    if (!name) {
        throw userError_("badName");
    }

    if (!message) {
        throw userError_("badMessage");
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
        false
    ]);

    return {
        id: id
    };
}

function deletePost_(body) {
    const post = findPost_(String(body.postId || ""));

    if (!post || isTrue_(post.row.deleted)) {
        throw userError_("notFound");
    }

    if (hashPassword_(post.row.id, String(body.password || "")) !== String(post.row.passHash)) {
        throw userError_("wrongPassword");
    }

    const deletedCol = POST_HEADERS.indexOf("deleted") + 1;

    post.sheet.getRange(post.rowNumber, deletedCol).setValue(true);

    return {
        id: post.row.id
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
        note: String(row.note)
    };
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

function hashPassword_(id, password) {
    const bytes = Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        id + ":" + password,
        Utilities.Charset.UTF_8
    );

    return bytes.map((b) => ((b + 256) % 256).toString(16).padStart(2, "0")).join("");
}
