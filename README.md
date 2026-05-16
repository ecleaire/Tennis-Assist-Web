# WRO RoboSports Assist

Godot 4 で作成した、WRO 2026 RoboSports Double Tennis 向けの大会運営サポートアプリです。

## 主な機能

- 試合タイマー
- ボール配置ランダマイザー
- 試合記録
- ルールビューア
- ニュース表示
- 関連リンク集

## Web 公開

このプロジェクトは GitHub Pages で公開しやすいように、Web 書き出し先を `docs/index.html` に設定しています。

Godot エディタでの書き出し手順:

1. `Project` -> `Export` を開く
2. `Web` プリセットを選択する
3. 書き出し先が `docs/index.html` になっていることを確認する
4. `Export Project` を実行する

書き出し後、`docs/` には主に次のファイルが生成されます。

- `index.html`
- `index.js`
- `index.wasm`
- `index.pck`

## GitHub Pages の設定

1. GitHub で新しいリポジトリを作成する
2. このプロジェクトをリポジトリへ push する
3. GitHub の `Settings` -> `Pages` を開く
4. `Deploy from a branch` を選択する
5. Branch は `main` を選ぶ
6. Folder は `/docs` を選ぶ
7. 保存する

しばらくすると、GitHub Pages でブラウザ公開されます。

## ローカル Git 初期設定

このフォルダは `git init` 済みです。必要に応じてリモートを追加してください。

```powershell
git remote add origin https://github.com/<your-account>/<repo-name>.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

## ライセンスと素材

- 数字表示には DSEG フォントを使用しています。ライセンスは `assets/fonts/fonts-DSEG_v046/DSEG-LICENSE.txt` を確認してください。
- 日本語 UI には Noto Sans JP を使用しています。ライセンスは `assets/fonts/Noto_Sans_JP/OFL.txt` を確認してください。
- WRO 公式資料の利用条件は、各資料の配布元と WRO の案内を確認してください。
