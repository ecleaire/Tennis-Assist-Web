export const SOUND_CATALOG = [
  { key: "bell", label: "1. ベル", group: "基本の通知音" },
  { key: "chime", label: "2. チャイム", group: "基本の通知音" },
  { key: "digital", label: "3. デジタルビープ", group: "基本の通知音" },
  { key: "alarm", label: "4. 繰り返しアラーム", group: "基本の通知音" },
  { key: "doubleBell", label: "5. ダブルベル", group: "基本の通知音" },
  { key: "school", label: "6. スクールチャイム", group: "基本の通知音" },
  { key: "softPing", label: "7. ソフトピン", group: "基本の通知音" },
  { key: "siren", label: "8. 緊急サイレン", group: "基本の通知音" },
  { key: "pulse", label: "9. カウントダウンパルス", group: "基本の通知音" },
  { key: "robot", label: "10. ロボットシグナル", group: "基本の通知音" },

  { key: "stadiumHorn", label: "11. スタジアムホーン", group: "追加の通知音" },
  { key: "matchBuzzer", label: "12. 競技ブザー", group: "追加の通知音" },
  { key: "metallicBell", label: "13. メタルベル", group: "追加の通知音" },
  { key: "tripleChime", label: "14. トリプルチャイム", group: "追加の通知音" },
  { key: "warningBeep", label: "15. 警告ビープ", group: "追加の通知音" },
  { key: "lowAlarm", label: "16. 低音アラーム", group: "追加の通知音" },
  { key: "highAlarm", label: "17. 高音アラーム", group: "追加の通知音" },
  { key: "sciFi", label: "18. SFアラート", group: "追加の通知音" },
  { key: "retroGame", label: "19. レトロゲーム", group: "追加の通知音" },
  { key: "finalCall", label: "20. ファイナルコール", group: "追加の通知音" }
];

export const BUILT_IN_SOUND_KEYS = SOUND_CATALOG.map(sound => sound.key);
