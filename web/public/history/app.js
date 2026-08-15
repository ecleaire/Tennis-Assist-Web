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
const $ = (id) => document.getElementById(id);
const text = (value) => String(value ?? "").trim();
const number = (value) => Number(text(value).replace(/[^\d.-]/g, "")) || 0;
const escapeHtml = (value) => text(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
function rowValue(row, name) { return row[session.columns.indexOf(name)] ?? ""; }
function normalizedPassword(value) { return text(value).toLowerCase().replace(/\s+/g, ""); }
function dateValue(value) { const parsed = new Date(text(value).replace(" ", "T")); return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime(); }
function periodSince() { const value = $("period").value; if (value === "all") return 0; return Date.now() - (value === "week" ? 7 : 31) * 86400000; }
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
  const since = periodSince();
  const filtered = rows.filter((row) => dateValue(rowValue(row, "日時")) >= since);
  const series = filtered.filter((row) => rowValue(row, "記録種別") === "試合結果");
  const matches = filtered.filter((row) => rowValue(row, "記録種別") === "マッチ");
  const teams = [...new Set(filtered.flatMap((row) => [rowValue(row, "チームA"), rowValue(row, "チームB")]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ja"));
  $("stat-series").textContent = series.length; $("stat-matches").textContent = matches.length; $("stat-teams").textContent = teams.length;
  $("stat-latest").textContent = filtered.length ? text(filtered.map((row) => rowValue(row, "日時")).sort().at(-1)).slice(0, 10) : "--";
  const selected = $("team-filter").value;
  if ($("team-filter").options.length !== teams.length + 1) { $("team-filter").innerHTML = `<option value="">すべて</option>${teams.map((team) => `<option>${escapeHtml(team)}</option>`).join("")}`; $("team-filter").value = selected; }
  renderStats(matches, teams, since); renderHistory(filtered.filter((row) => !selected || rowValue(row, "チームA") === selected || rowValue(row, "チームB") === selected));
}
function renderStats(matches, teams, since) {
  const body = $("team-stats");
  body.innerHTML = teams.map((team) => { const related = matches.filter((row) => rowValue(row, "チームA") === team || rowValue(row, "チームB") === team); const wins = related.filter((row) => rowValue(row, "マッチ勝者") === team || rowValue(row, "総合勝者") === team).length; const draws = related.filter((row) => rowValue(row, "マッチ勝者") === "引き分け").length; const purple = related.reduce((sum, row) => sum + (rowValue(row, "チームA") === team ? number(rowValue(row, "チームA紫")) : number(rowValue(row, "チームB紫"))), 0); const violations = related.reduce((sum, row) => sum + (rowValue(row, "チームA") === team ? number(rowValue(row, "チームA違反数")) : number(rowValue(row, "チームB違反数"))), 0); const losses = Math.max(0, related.length - wins - draws); const rate = related.length ? `${(wins / related.length * 100).toFixed(1)}%` : "0.0%"; return `<tr><td><strong>${escapeHtml(team)}</strong></td><td>${related.length}</td><td>${wins}</td><td>${draws}</td><td>${losses}</td><td>${rate}</td><td>${purple}</td><td>${violations}</td></tr>`; }).join("") || `<tr><td colspan="8" class="muted">該当する履歴がありません。</td></tr>`;
}
function renderHistory(filtered) {
  const list = $("history-list"); const latest = [...filtered].sort((a, b) => dateValue(rowValue(b, "日時")) - dateValue(rowValue(a, "日時"))).slice(0, 100);
  $("history-status").textContent = `${filtered.length}件中、最新${latest.length}件を表示`;
  list.innerHTML = latest.map((row) => { const a = rowValue(row, "チームA"); const b = rowValue(row, "チームB"); const winner = rowValue(row, "記録種別") === "試合結果" ? rowValue(row, "総合勝者") : rowValue(row, "マッチ勝者"); return `<article class="history-card"><h3>${escapeHtml(a)} <span class="muted">vs</span> ${escapeHtml(b)}</h3><p>${escapeHtml(rowValue(row, "日時"))} / ${escapeHtml(rowValue(row, "コート"))} / ${escapeHtml(rowValue(row, "種別"))} / 第${escapeHtml(rowValue(row, "マッチ番号") || "-")}マッチ</p><p class="winner">勝者: ${escapeHtml(winner || "未確定")}　得点 ${escapeHtml(rowValue(row, "チームA得点"))} - ${escapeHtml(rowValue(row, "チームB得点"))}　紫 ${escapeHtml(rowValue(row, "チームA紫"))} - ${escapeHtml(rowValue(row, "チームB紫"))}</p></article>`; }).join("") || `<p class="muted">履歴がありません。</p>`;
}
async function login(event) { event.preventDefault(); const password = normalizedPassword($("password").value); const account = managedAccounts[password]; if (!account) { $("login-status").textContent = "管理者パスワードを確認してください。"; return; } let apiKey = text($("api-key").value); if (!apiKey) { try { const saved = JSON.parse(localStorage.getItem("tennis-assist-admin-v1") || "{}"); apiKey = text(saved.apiKey) || password; } catch { apiKey = password; } } session = { account, apiKey, columns: [] }; $("login-status").textContent = "履歴を読み込んでいます..."; try { await loadHistory(); $("login-panel").classList.add("hidden"); $("viewer").classList.remove("hidden"); $("account-label").textContent = account.label; $("account-label").classList.remove("hidden"); $("logout").classList.remove("hidden"); $("login-status").textContent = ""; } catch (error) { session = null; $("login-status").textContent = `${error.message}。APIキーを入力して再試行してください。`; } }
function logout() { session = null; rows = []; $("viewer").classList.add("hidden"); $("login-panel").classList.remove("hidden"); $("account-label").classList.add("hidden"); $("logout").classList.add("hidden"); $("password").value = ""; }
$("login-form").addEventListener("submit", login); $("logout").addEventListener("click", logout); $("refresh").addEventListener("click", async () => { try { $("history-status").textContent = "再読み込み中..."; await loadHistory(); } catch (error) { $("history-status").textContent = error.message; } }); $("period").addEventListener("change", render); $("team-filter").addEventListener("change", render);
