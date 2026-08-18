const managedAccounts = {
  hyogo: { label: "WRO兵庫", url: "https://script.google.com/macros/s/AKfycbw0wWKqqar4adDt9SXKmQdO82twKvUjomcrfYGvb7_2mi1cP5rVW7QR62Ijuc5uNpJRgQ/exec", sheet: "1pxTMvdcpTMFeSfroOeTyh2hziLgfAvLxe0Nh79sMk_0" },
  mie: { label: "WRO三重", url: "https://script.google.com/macros/s/AKfycbx6OkFR799hYZ3DaYWxfluCTuDKf6sE34HtVuzMHTfJQd5Hs0YcQujZiVxtEOxzvN5-/exec", sheet: "185jPLjc-nBri49aOr-CVw1baUI1qaxqjgcWLRS2-oxo" },
  mie_judge: { label: "WRO三重", url: "https://script.google.com/macros/s/AKfycbx6OkFR799hYZ3DaYWxfluCTuDKf6sE34HtVuzMHTfJQd5Hs0YcQujZiVxtEOxzvN5-/exec", sheet: "185jPLjc-nBri49aOr-CVw1baUI1qaxqjgcWLRS2-oxo" },
  nara: { label: "WRO奈良", url: "https://script.google.com/macros/s/AKfycbya7EhTdbZzvZIPR2HKMBha7ciFLpG-iFr1T5PZitsLgsWTXE-5lNbACIN9Bkgf_ZdE4g/exec", sheet: "1qaT1lLCqUjw__0jkR51KIqLXur3jO7EBoc8R0gWgnZ8" },
  judge: { label: "WRO共有確認用", url: "https://script.google.com/macros/s/AKfycbyniW9kgzwtMI0i5X5ZtDlnqGz1yaeuHnXZZ7s67fIS54tdzg1U__sZUzLDoLqUY8lt/exec", sheet: "1BTByUtO5IAdwdTYCMNhFUtqeRy2yIWpAnCZRQw_b0HU" },
  train: { label: "審判練習", url: "https://script.google.com/macros/s/AKfycbxd1h_jzSECSjtQIxKvoX-joGUEy2yHcJYc2nQ14-YHze9OpqXrfy9JsEg_6gi03KpA/exec", sheet: "1Bh5FpSOjkTRRV9feZ90dLXl86v3UNsG896DfhSPHst0" },
  practice: { label: "審判練習", url: "https://script.google.com/macros/s/AKfycbxd1h_jzSECSjtQIxKvoX-joGUEy2yHcJYc2nQ14-YHze9OpqXrfy9JsEg_6gi03KpA/exec", sheet: "1Bh5FpSOjkTRRV9feZ90dLXl86v3UNsG896DfhSPHst0" },
  rsam: { label: "自分", url: "https://script.google.com/macros/s/AKfycbwbs-mgIJNX-DkgtoLzpkQaTQNa75tWwijAfyudWbi4LvKJGkWSrC6y0PC_EY4kFUsa/exec", sheet: "1PKAZgb8HZFww-P9CZTkzVqleAtIOFgkl8Ngk6lZwcTA" },
  gas: { label: "自分", url: "https://script.google.com/macros/s/AKfycbwbs-mgIJNX-DkgtoLzpkQaTQNa75tWwijAfyudWbi4LvKJGkWSrC6y0PC_EY4kFUsa/exec", sheet: "1PKAZgb8HZFww-P9CZTkzVqleAtIOFgkl8Ngk6lZwcTA" },
  wrorsam: { label: "自分", url: "https://script.google.com/macros/s/AKfycbwbs-mgIJNX-DkgtoLzpkQaTQNa75tWwijAfyudWbi4LvKJGkWSrC6y0PC_EY4kFUsa/exec", sheet: "1PKAZgb8HZFww-P9CZTkzVqleAtIOFgkl8Ngk6lZwcTA" },
  shukugawa: { label: "夙川", url: "https://script.google.com/macros/s/AKfycbwZjAa77dzxEWivtFkZIWGzDdhynAFBjmn3zjdte_KO1eDbhLR0xidIv1mNTvCwwLfIzQ/exec", sheet: "1tOyTdp7DD1lFZr5XsYnB3Zc4JEM9rGeMoH_6B43Yeg4" },
};
let session = null;
let rows = [];
const loginStorageKey = "tennis-assist-history-login-v1";
const publicLinkGroups = [
  { title: "WROホームページ", links: [["WRO Japan", "https://www.wroj.org/action/2026", "WRO Japan 公式サイト"], ["WRO 国際", "https://wro-association.org/", "WRO International"]] },
  { title: "WRO公認予選会", links: [["WRO兵庫", "https://wro-hyogo.jp/", "公認予選会"]] },
  { title: "ルール関連", links: [["Japan決勝大会ルールPDF", "https://drive.google.com/file/d/1JMmggxMfSWABUcA5sbM9U3qffb-ZMb2U/view?usp=sharing", "公式ルール原文"], ["世界大会公式ルール", "https://wro-association.org/wp-content/uploads/WRO-2026-RoboSports-Double-Tennis-General-Rules.pdf", "WRO International"], ["Google翻訳ルール", "https://drive.google.com/file/d/16zFJ_bD8sfLZZF6QkRCWQ6azN_Dj3eUG/view", "翻訳版"], ["DeepL翻訳ルール", "https://drive.google.com/file/d/1z_Q7M7lP2Q55Zo3qZgzH-bN_QqhCx-wJ/view", "翻訳版"], ["公式Q&A", "https://wro-association.org/competition/questions-answers/", "ルール質問と回答"]] },
  { title: "その他", links: [["GitHubリポジトリ", "https://github.com/ecleaire/Tennis-Assist-Web", "アプリのソースコード"]] },
  { title: "公開URL QRコード", qr: true, links: [["generalを開く", "https://ecleaire.github.io/Tennis-Assist-Web/general/", "選手・練習用 general"]] },
];
const $ = (id) => document.getElementById(id);
const text = (value) => String(value ?? "").trim();
const number = (value) => Number(text(value).replace(/[^\d.-]/g, "")) || 0;
const escapeHtml = (value) => text(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
function finishEntryGlitch() { const overlay = $("entry-glitch"); if (!overlay) return; overlay.classList.add("is-finished"); window.setTimeout(() => overlay.remove(), 180); }
function showPublicPane(name) { const loggedInHome = name === "login-panel" && Boolean(session); document.querySelectorAll(".public-pane").forEach((pane) => pane.classList.toggle("hidden", loggedInHome || pane.id !== name)); $("viewer").classList.toggle("hidden", !loggedInHome); document.querySelectorAll(".public-nav button").forEach((button) => button.classList.toggle("active", button.id === `public-${name.replace("public-", "")}-tab`)); }
function renderPublicLinks() { $("public-links-list").innerHTML = publicLinkGroups.map((group) => `<section class="public-link-group"><h3>${escapeHtml(group.title)}</h3>${group.qr ? `<a class="public-qr-card" href="${group.links[0][1]}" target="_blank" rel="noopener"><img src="../assets/qr-general.png" alt="general公開URL QRコード" loading="lazy"><span><strong>${escapeHtml(group.links[0][0])}</strong><small>${escapeHtml(group.links[0][2])}</small><small>${escapeHtml(group.links[0][1])}</small></span></a>` : `<div class="public-link-grid">${group.links.map(([label, url, description]) => `<a class="public-link-card" href="${url}" target="_blank" rel="noopener"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(description)}</span><span>${escapeHtml(url)}</span></a>`).join("")}</div>`}</section>`).join(""); }
function rowValue(row, name) { return row[session.columns.indexOf(name)] ?? ""; }
function normalizedPassword(value) { return text(value).toLowerCase().replace(/\s+/g, ""); }
function dateValue(value) { const parsed = new Date(text(value).replace(" ", "T")); return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime(); }
function dateBounds() { const value = $("period").value; let from = value === "all" ? 0 : Date.now() - (value === "today" ? 1 : value === "week" ? 7 : 31) * 86400000; let to = Number.POSITIVE_INFINITY; if ($("date-from").value) from = Math.max(from, new Date(`${$("date-from").value}T00:00:00`).getTime()); if ($("date-to").value) to = new Date(`${$("date-to").value}T23:59:59.999`).getTime(); return { from, to }; }
function isUnsent(row) { const status = rowValue(row, "送信状態") || rowValue(row, "sendStatus"); return status === "pending" || status === "failed" || rowValue(row, "未送信") === "TRUE"; }
async function loadHistory() {
  const params = new URLSearchParams({ action: "history", api_key: session.apiKey, spreadsheet_id: session.account.sheet, sheet: "対戦履歴archive" });
  const response = await fetch(`${session.account.url}?${params}`);
  const data = await response.json();
  if (!response.ok || data.ok === false) throw new Error(data.error || "履歴の読み込みに失敗しました");
  session.columns = data.csv_columns || [];
  rows = (data.csv_rows || []).filter((row) => rowValue(row, "記録種別") === "試合結果" || rowValue(row, "記録種別") === "マッチ");
  render();
}
function render() {
  const bounds = dateBounds();
  const filtered = rows.filter((row) => { const stamp = dateValue(rowValue(row, "日時")); return stamp >= bounds.from && stamp <= bounds.to; });
  const series = filtered.filter((row) => rowValue(row, "記録種別") === "試合結果");
  const matches = filtered.filter((row) => rowValue(row, "記録種別") === "マッチ");
  const teams = [...new Set(filtered.flatMap((row) => [rowValue(row, "チームA"), rowValue(row, "チームB")]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ja"));
  $("stat-series").textContent = series.length; $("stat-matches").textContent = matches.length; $("stat-teams").textContent = teams.length;
  $("stat-latest").textContent = filtered.length ? text(filtered.map((row) => rowValue(row, "日時")).sort().at(-1)).slice(0, 10) : "--";
  const selected = $("team-filter").value;
  const statsTeam = $("stats-team").value;
  const optionsMarkup = `<option value="">すべてのチーム</option>${teams.map((team) => `<option value="${escapeHtml(team)}">${escapeHtml(team)}</option>`).join("")}`;
  if ($("team-filter").dataset.options !== teams.join("\u0000")) { $("team-filter").innerHTML = optionsMarkup; $("team-filter").value = selected; $("team-filter").dataset.options = teams.join("\u0000"); }
  if ($("stats-team").dataset.options !== teams.join("\u0000")) { $("stats-team").innerHTML = `<option value="">チームを選択</option>${teams.map((team) => `<option value="${escapeHtml(team)}">${escapeHtml(team)}</option>`).join("")}`; $("stats-team").value = statsTeam; $("stats-team").dataset.options = teams.join("\u0000"); }
  renderStats(matches, statsTeam ? [statsTeam] : teams); renderHistory(filtered);
}
function renderStats(matches, teams) {
  const body = $("team-stats");
  const metrics = $("selected-team-stats");
  const rows = $("stats-team").value ? teams.map((team) => {
    const related = matches.filter((row) => rowValue(row, "チームA") === team || rowValue(row, "チームB") === team);
    const wins = related.filter((row) => rowValue(row, "マッチ勝者") === team || rowValue(row, "総合勝者") === team).length;
    const draws = related.filter((row) => rowValue(row, "マッチ勝者") === "引き分け" || rowValue(row, "総合勝者") === "引き分け").length;
    const losses = Math.max(0, related.length - wins - draws);
    const purple = related.reduce((sum, row) => sum + (rowValue(row, "チームA") === team ? number(rowValue(row, "チームA紫")) : number(rowValue(row, "チームB紫"))), 0);
    const totalPurple = related.reduce((sum, row) => sum + number(rowValue(row, "チームA紫")) + number(rowValue(row, "チームB紫")), 0);
    const purpleRate = totalPurple ? `${(purple / totalPurple * 100).toFixed(1)}%` : "0.0%";
    const violations = related.reduce((sum, row) => sum + (rowValue(row, "チームA") === team ? number(rowValue(row, "チームA違反数")) : number(rowValue(row, "チームB違反数"))), 0);
    const rate = related.length ? `${(wins / related.length * 100).toFixed(1)}%` : "0.0%";
    return { team, related, wins, draws, losses, purpleRate, violations, rate };
  }) : [];
  const selected = $("stats-team").value ? rows[0] : null;
  metrics.innerHTML = selected ? [["マッチ数", selected.related.length], ["勝敗", `${selected.wins}勝 ${selected.losses}敗 ${selected.draws}分`], ["勝率", selected.rate], ["紫取得率", selected.purpleRate], ["違反数", selected.violations]].map(([label, value]) => `<article class="stat-card"><span>${label}</span><strong>${value}</strong></article>`).join("") : "";
  body.innerHTML = rows.map(({ team, related, wins, draws, losses, purpleRate, violations, rate }) => `<tr><td><strong>${escapeHtml(team)}</strong></td><td>${related.length}</td><td>${wins}勝 ${losses}敗 ${draws}分</td><td>${rate}</td><td>${purpleRate}</td><td>${violations}</td></tr>`).join("") || `<tr><td colspan="6" class="muted">チームを選択すると統計を表示します。</td></tr>`;
}
function renderHistory(filtered) {
  const team = $("team-filter").value; const result = $("result-filter").value; const kind = $("kind-filter").value; const reason = $("reason-filter").value;
  const visible = filtered.filter((row) => { if (team && rowValue(row, "チームA") !== team && rowValue(row, "チームB") !== team) return false; const recordKind = rowValue(row, "記録種別"); if (kind === "match" && recordKind !== "マッチ") return false; if (kind === "series" && recordKind !== "試合結果") return false; if (kind === "unsent" && !isUnsent(row)) return false; if (reason !== "all" && rowValue(row, "未送信理由") !== reason) return false; if (result !== "all") { const winner = recordKind === "試合結果" ? rowValue(row, "総合勝者") : rowValue(row, "マッチ勝者"); if (result === "draw" && winner !== "引き分け") return false; if (team && result === "win" && winner !== team) return false; if (team && result === "loss" && (winner === team || winner === "引き分け")) return false; } return true; });
  const ordered = [...visible].sort((a, b) => dateValue(rowValue(b, "日時")) - dateValue(rowValue(a, "日時"))); if ($("sort-filter").value === "old") ordered.reverse(); const latest = ordered.slice(0, 100); const list = $("history-list");
  $("history-status").textContent = `保存済み ${rows.length}件 / 確認用 0件 / 表示 ${visible.length}件`;
  list.innerHTML = latest.map((row) => { const a = rowValue(row, "チームA"); const b = rowValue(row, "チームB"); const winner = rowValue(row, "記録種別") === "試合結果" ? rowValue(row, "総合勝者") : rowValue(row, "マッチ勝者"); return `<article class="history-card"><h3>${escapeHtml(a)} <span class="muted">vs</span> ${escapeHtml(b)}</h3><p>${escapeHtml(rowValue(row, "日時"))} / ${escapeHtml(rowValue(row, "コート"))} / ${escapeHtml(rowValue(row, "種別"))} / 第${escapeHtml(rowValue(row, "マッチ番号") || "-")}マッチ</p><p class="winner">勝者: ${escapeHtml(winner || "未確定")}　得点 ${escapeHtml(rowValue(row, "チームA得点"))} - ${escapeHtml(rowValue(row, "チームB得点"))}　紫 ${escapeHtml(rowValue(row, "チームA紫"))} - ${escapeHtml(rowValue(row, "チームB紫"))}</p></article>`; }).join("") || `<p class="muted">履歴がありません。</p>`;
}
async function login(event) { event.preventDefault(); const password = normalizedPassword($("password").value); const account = managedAccounts[password]; if (!account) { $("login-status").textContent = "管理者パスワードを確認してください。"; return; } let apiKey = text($("api-key").value); if (!apiKey) { try { const saved = JSON.parse(localStorage.getItem("tennis-assist-admin-v1") || "{}"); apiKey = text(saved.apiKey); } catch { apiKey = ""; } } if (!apiKey) apiKey = password === "shukugawa" ? "GAS" : password; if ($("remember-login").checked) localStorage.setItem(loginStorageKey, JSON.stringify({ remember: true, password, apiKey })); else localStorage.removeItem(loginStorageKey); session = { account, apiKey, columns: [] }; $("login-status").textContent = "履歴を読み込んでいます..."; try { await loadHistory(); $("account-label").textContent = account.label; $("account-label").classList.remove("hidden"); $("logout").classList.remove("hidden"); $("login-status").textContent = ""; showPublicPane("login-panel"); } catch (error) { session = null; $("login-status").textContent = `${error.message}。APIキーを入力して再試行してください。`; } }
function logout() { session = null; rows = []; $("account-label").classList.add("hidden"); $("logout").classList.add("hidden"); showPublicPane("login-panel"); }
$("login-form").addEventListener("submit", login); $("logout").addEventListener("click", logout); $("refresh").addEventListener("click", async () => { try { $("history-status").textContent = "再読み込み中..."; await loadHistory(); } catch (error) { $("history-status").textContent = error.message; } }); ["period", "date-from", "date-to", "stats-team", "team-filter", "result-filter", "kind-filter", "reason-filter", "sort-filter"].forEach((id) => $(id).addEventListener("change", render));
$("public-login-tab").addEventListener("click", () => showPublicPane("login-panel")); $("public-links-tab").addEventListener("click", () => showPublicPane("public-links")); $("public-rules-tab").addEventListener("click", () => showPublicPane("public-rules")); document.querySelectorAll("[data-rule-pdf-src]").forEach((link) => link.addEventListener("click", (event) => { const source = link.dataset.rulePdfSrc; if (!source) return; event.preventDefault(); $("rule-pdf-frame").src = source; $("rule-pdf-note").textContent = "選択した公式ルールPDFを表示しています。表示されない場合はボタンを長押しして別タブで開いてください。"; })); $("rule-pdf-fullscreen").addEventListener("click", async () => { try { await $("rule-pdf-viewer").requestFullscreen(); } catch { window.open($("rule-pdf-frame").src, "_blank", "noopener"); } }); $("rule-search-button").addEventListener("click", () => { const query = $("rule-search").value.trim(); if (query) $("rule-pdf-frame").src = `https://drive.google.com/file/d/1JMmggxMfSWABUcA5sbM9U3qffb-ZMb2U/preview#search=${encodeURIComponent(query)}`; }); renderPublicLinks();
$("entry-glitch")?.addEventListener("animationend", (event) => { if (event.animationName === "entry-glitch-wipe") finishEntryGlitch(); }); window.setTimeout(finishEntryGlitch, 1400);
try { const savedLogin = JSON.parse(localStorage.getItem(loginStorageKey) || "null"); if (savedLogin && savedLogin.remember === true) { $("password").value = text(savedLogin.password); $("api-key").value = text(savedLogin.apiKey); $("remember-login").checked = true; } } catch { localStorage.removeItem(loginStorageKey); }
