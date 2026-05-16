# 外部フォント置き場

このフォルダには、タイマー表示や UI 用に追加したい外部フォントを入れてください。

例:
- `seven_segment.ttf`
- `digital_timer.otf`
- `ui_japanese.ttf`

使い方:
- Godot の FileSystem でこのフォルダ内のフォントを選ぶ
- `FontFile` や `Theme` に割り当てる
- タイマー用と UI 用で分けたい場合は、必要に応じてサブフォルダを作る
