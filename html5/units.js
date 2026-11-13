/* HTML5プロフェッショナル認定試験 レベル2の問題データ(サンプル。順に増やします)。レベル1は units-l1.js。
   c=選択肢、k=正解の番号(0始まり)。code=記述問題の模範解答(別解も正解になり得ます) */
var HTML5 = [
{id:"h1",group:"レベル2",lv:"Lv2",lvc:"l2",lvn:"レベル2のサンプル問題",name:"要素と文書構造",dm:3,ps:[
{t:"nav要素",q:"nav要素の用途として適切なものはどれか。",c:["ページ内の主要なナビゲーションリンクのまとまり","ページの主題から外れた補足情報","文書の著作権表示","ページの主要なコンテンツ"],k:0,e:"nav要素は、主要なナビゲーションリンクのまとまりに使います。2番目はaside、3番目はfooter、4番目はmainの説明です。"},
{t:"main要素",q:"main要素について正しいものはどれか。",c:["1つの文書に、何個でも使える","文書の主要なコンテンツを表し、1つの文書に1つだけ(hidden でないもの)使う","ヘッダーの中にだけ置ける","画像の説明に使う"],k:1,e:"main要素は、文書の主要なコンテンツを表します。表示される main 要素は、1つの文書に1つだけにします。"},
{t:"alt属性",q:"画像の代替テキストを指定する属性はどれか。",c:["title","alt","caption","label"],k:1,e:"img要素のalt属性で、画像の代替テキストを指定します。画像が表示できないときや、読み上げで使われます。"},
{t:"フォームの記述",q:"見出し「お問い合わせ」(h2)の下に、「氏名」というラベルが付いた、必須のテキスト入力欄(id・name はどちらも user)を記述しなさい。",code:"<h2>お問い合わせ</h2>\n<label for=\"user\">氏名</label>\n<input type=\"text\" id=\"user\" name=\"user\" required>",e:"label の for と、input の id を同じにして関連付けます。必須は required 属性です。input を label で囲む書き方でも正解です。",m:5},
{t:"figure要素",q:"画像 photo.jpg(幅400、高さ300、代替テキスト「夕焼け」)に、「夕焼けの海」というキャプションを付けて記述しなさい。",code:"<figure>\n  <img src=\"photo.jpg\" alt=\"夕焼け\" width=\"400\" height=\"300\">\n  <figcaption>夕焼けの海</figcaption>\n</figure>",e:"図表とキャプションは、figure と figcaption を使います。width と height は、レイアウトのずれを防ぐために指定します。",m:5}
]},
{id:"h2",group:"レベル2",lv:"Lv2",lvc:"l2",lvn:"レベル2のサンプル問題",name:"フォーム・CSS・JavaScript",dm:3,ps:[
{t:"input type",q:"日付を選択させる入力欄を作る、input要素の type 属性の値はどれか。",c:["calendar","date","datetime-text","day"],k:1,e:"type=\"date\" で、日付を選択する入力欄になります。"},
{t:"pattern属性",q:"フォームの入力値の形式を、正規表現で制限する属性はどれか。",c:["pattern","format","regex","match"],k:0,e:"pattern属性に正規表現を指定して、入力値の形式を制限します。"},
{t:"子孫セレクタ",q:"CSSの「nav a { color: red; }」が表すものはどれか。",c:["nav要素の直接の子であるa要素","nav要素の子孫であるa要素すべて","nav要素とa要素のどちらか","a要素の子孫であるnav要素"],k:1,e:"半角スペースで区切ると、子孫セレクタです。nav要素の中にあるa要素を、階層の深さにかかわらずすべて選びます。直接の子だけを選ぶなら nav > a と書きます。"},
{t:"box-sizing",q:"クラス box の要素を、幅300px、内側の余白20px、枠線1px・実線・色#999にし、余白と枠線を含めた幅が300pxになるように、CSSを記述しなさい。",code:".box {\n  box-sizing: border-box;\n  width: 300px;\n  padding: 20px;\n  border: 1px solid #999;\n}",e:"box-sizing: border-box を指定すると、width に padding と border が含まれます。プロパティの順番は問いません。",m:5},
{t:"イベント処理",q:"id が btn のボタンをクリックしたとき、id が msg の要素のテキストを「こんにちは」に変えるJavaScriptを、addEventListener を使って記述しなさい。",code:"document.getElementById(\"btn\").addEventListener(\"click\", function () {\n  document.getElementById(\"msg\").textContent = \"こんにちは\";\n});",e:"getElementById で要素を取り、addEventListener(\"click\", ...) で処理を登録します。アロー関数や querySelector を使う書き方でも正解です。",m:5}
]}
];
/* レベル1を先に、レベル2を後に並べる */
if (typeof HTML5_L1 !== "undefined") HTML5 = HTML5_L1.concat(HTML5);
