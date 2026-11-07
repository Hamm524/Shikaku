# 資格ドリル

簿記2級・ITパスポート・HTML5プロフェッショナル(レベル2)の練習問題アプリ。ホーム画面に追加して使います。

- 1問ずつ解いて、答えを見て、○×を付ける。選択問題はその場で採点。記述問題は、書いてから模範解答と見比べる。
- 各問題に目安時間のタイマー。科目ごとに、受験日から逆算した学習計画。
- 記録は端末と、合言葉(10文字)で Firebase に自動保存。ログイン不要。別の端末では、合言葉で戻せる。
- パソコンではキーボードでも操作できる(1〜4で選択、Enterで答え、o/xで採点、←→で移動)。

## 構成
- `index.html` / `app.js` / `style.css` … アプリ本体
- `subjects/boki/` `subjects/itpass/` `subjects/html5/` … 科目ごとのフォルダ。問題データは各フォルダの `units.js`
- `sw.js` `manifest.webmanifest` … ホーム画面追加と、オフラインでの表示

## 公開
GitHub Pages(Settings → Pages → Branch: main / root)。
