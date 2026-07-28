const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const appDir = path.resolve(__dirname, '..');
const codeSource = fs.readFileSync(path.join(appDir, 'Code.js'), 'utf8');
const clientHtml = fs.readFileSync(path.join(appDir, 'AppScript.html'), 'utf8');
const indexHtml = fs.readFileSync(path.join(appDir, 'Index.html'), 'utf8');
const clientSource = clientHtml.replace(/^\s*<script>\s*/, '').replace(/\s*<\/script>\s*$/, '');

new vm.Script(codeSource, { filename: 'Code.js' });
new vm.Script(clientSource, { filename: 'AppScript.html' });
assert.match(indexHtml, /data-service-url="<\?= serviceUrl \?>"/, '表示専用ページURLの基準URLをテンプレートから渡す');
assert.match(indexHtml, /id="loadingOverlay" class="loading-overlay" hidden/, '初回ログインを覆わないよう処理中表示は初期非表示');
assert.match(clientSource, /if \(!isEditing\(\)\) return;\s+var port = document\.createElement\('button'\)/, '閲覧表示では接続編集ボタンを生成しない');
assert.doesNotMatch(clientSource, /tournamentCountInputTimer/, '数値設定は入力ごとに独立したタイマーを使用する');
assert.match(clientSource, /requested < minimum \|\| requested > maximum/, '入力途中の範囲外値では画面を再描画しない');
assert.match(clientSource, /window\.matchMedia\('\(pointer: coarse\), \(max-width: 820px\)'\)/, 'スマホ・タブレットでは入力中の再描画を延期する');
assert.match(clientSource, /input\.addEventListener\('blur', commitValue\)/, 'スマホの数字キーボードを閉じた時に数値を反映する');

const properties = new Map();
const cache = new Map();
let uuidCounter = 0;
const makeUuid = () => (++uuidCounter).toString(16).padStart(32, '0').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
const webSafe = (buffer) => Buffer.from(buffer).toString('base64url');

const context = {
  console,
  Date,
  JSON,
  Math,
  PropertiesService: {
    getScriptProperties() {
      return {
        getProperty: (key) => properties.has(key) ? properties.get(key) : null,
        setProperty: (key, value) => { properties.set(key, String(value)); },
        deleteProperty: (key) => { properties.delete(key); }
      };
    }
  },
  CacheService: {
    getScriptCache() {
      return {
        get: (key) => cache.has(key) ? cache.get(key) : null,
        put: (key, value) => { cache.set(key, String(value)); },
        remove: (key) => { cache.delete(key); }
      };
    }
  },
  Utilities: {
    Charset: { UTF_8: 'UTF-8' },
    getUuid: makeUuid,
    computeHmacSha256Signature(value, secret) {
      return crypto.createHmac('sha256', secret).update(value, 'utf8').digest();
    },
    base64EncodeWebSafe(value) { return webSafe(value); },
    base64DecodeWebSafe(value) { return Buffer.from(value, 'base64url'); },
    newBlob(value) {
      return { getDataAsString: () => Buffer.from(value).toString('utf8') };
    }
  }
};
vm.createContext(context);
vm.runInContext(codeSource, context, { filename: 'Code.js' });

const target = { spreadsheetId: 'spreadsheet_identifier_1234567890', label: 'テスト大会', gasUrl: '' };
const access = context.createViewerAccess_(target);
assert.match(access.token, /^[a-f0-9]{64}$/i, '表示URLトークンは不透明な64桁トークン');
assert.equal(access.token.includes(target.spreadsheetId), false, 'トークンにスプレッドシートIDを含めない');
assert.deepEqual(JSON.parse(JSON.stringify(context.verifyViewerAccess_(access.token, access.signature))), target);

properties.delete(context.viewerRecordPropertyKey_(access.token));
assert.throws(() => context.verifyViewerAccess_(access.token, access.signature), /無効化/);

const revision = context.getViewerRevision_(target.spreadsheetId, true);
const legacyPayload = JSON.stringify({ spreadsheetId: target.spreadsheetId, label: target.label, revision, expiresAt: '' });
const legacyToken = Buffer.from(legacyPayload).toString('base64url');
const legacySignature = context.signViewerToken_(legacyToken, true);
assert.equal(context.verifyViewerAccess_(legacyToken, legacySignature).spreadsheetId, target.spreadsheetId, '旧署名URLとの互換性を維持');

const sessionToken = context.createEditorSession_(target, false);
assert.equal(context.readEditorSession_(sessionToken).spreadsheetId, target.spreadsheetId);
assert.equal(context.revokeEditorSession(sessionToken).success, true);
assert.throws(() => context.readEditorSession_(sessionToken), /有効期限/);

console.log('static regression: OK');
