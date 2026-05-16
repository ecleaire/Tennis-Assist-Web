# WRO RoboSports Assist

Godot 4 ベースの `WRO RoboSports Double Tennis` 用サポートアプリです。

主な機能:
- 競技タイマー
- ボール配置ランダマイザー
- 試合記録
- ルールビューア
- ニュース
- リンク集

## Web公開向け構成

このプロジェクトは `GitHub Pages` で公開しやすいように、Web書き出し先を `docs/index.html` に設定しています。

Godot エディタでの手順:
1. `Project` -> `Export`
2. `Web` プリセットを選択
3. 書き出し先が `docs/index.html` になっていることを確認
4. `Export Project` を実行

書き出し後は `docs/` に以下のようなファイルができます。
- `index.html`
- `index.js`
- `index.wasm`
- `index.pck`

## GitHub で公開する手順

1. GitHub で新しい空リポジトリを作成
2. このプロジェクトをそのリポジトリへ push
3. GitHub の `Settings` -> `Pages`
4. `Deploy from a branch` を選択
5. Branch は `main`
6. Folder は `/docs`
7. 保存

しばらくすると GitHub Pages でブラウザ公開されます。

## ローカルGit初期化

このフォルダは `git init` 済みです。必要に応じて以下でリモートを追加できます。

```powershell
git remote add origin https://github.com/<your-account>/<repo-name>.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

## 補足

- この環境では Godot 実行ファイルが見つからなかったため、Web書き出し自体はまだ未実行です。
- タイマー数字には `DSEG`、通常の日本語UIには `Noto Sans JP` を使っています。
