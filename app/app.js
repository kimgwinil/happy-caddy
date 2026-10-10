'use strict';
/* Happy Caddy · 골프 해피게임 (18홀 · 4인)
 * 규칙 요약
 *  - 1인 5만원(기본) × 4 = 20만원. 홀당 1만원: 1~4등 4천·3천·2천·1천원.
 *  - 게임비를 올리면(10만, 20만 …) 모든 금액이 같은 배수로 바뀐다.
 *  - 동타는 그 홀에서 나중에 티샷한 사람이 이긴다(첫 홀은 4번째 친 사람).
 *    다음 홀 티샷 순서 = 이번 홀 순위.
 *  - 캐디 있음: 게임의 첫 버디는 그 홀 1만원을 캐디팁으로 캐디에게 주고,
 *    다른 3명이 버디한 사람에게 각 1천원을 준다.
 *    두 번째 버디부터는 버디한 사람이 1만원을 독식하고 다른 3명에게 각 1천원을 준다.
 *  - 캐디 없음: 모든 버디가 '독식 + 3명에게 각 1천원'.
 *  - 18홀 후 남는 2만원은 4명이 5천원씩 나눈다.
 */
const KEY = 'happycaddy.v1', PHOTO_KEY = 'happycaddy.photo', COURSES_KEY = 'happycaddy.courses', LANG_KEY = 'happycaddy.lang';
const DEF_PARS = [4,4,3,5,4,4,3,4,5,4,4,3,5,4,4,3,4,5];
const BASE = { dep: 50000, pot: 10000, rank: [4000, 3000, 2000, 1000], k: 1000 };
const UNITS = [1, 2, 4, 8];            // 5만 → 10만 → 20만 → 40만 (2배수)
const LANGS = ['ko', 'en', 'ja', 'zh'];
const LANG_BTN = { ko: '한', en: 'EN', ja: '日', zh: '中' };
const LOCALE = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN' };

/* ---------- 다국어 ---------- */
const T = {
  sub: ['4인 · 18홀 · 해피게임', '4 players · 18 holes · Happy Game', '4人・18ホール・ハッピーゲーム', '4人·18洞·快乐游戏'],
  course: ['골프장', 'Golf course', 'ゴルフ場', '球场'],
  coursePh: ['골프장 이름 (예: 레이크사이드 서코스)', 'Course name', 'ゴルフ場名', '球场名称'],
  photo: ['배경 사진 고르기', 'Choose background photo', '背景写真を選ぶ', '选择背景照片'],
  photoDel: ['사진 지우기', 'Remove photo', '写真を削除', '删除照片'],
  photoHelp: ['골프장 사진을 고르면 첫 화면 배경으로 나옵니다.', 'Pick a photo of the course for the home screen.', 'ゴルフ場の写真が最初の画面の背景になります。', '所选球场照片将作为首页背景。'],
  saved: ['저장한 골프장', 'Saved courses', '保存したゴルフ場', '已保存球场'],
  saveCourse: ['이 골프장 파 저장', "Save this course's pars", 'このコースのパーを保存', '保存此球场标准杆'],
  savedOk: ['저장했어요', 'Saved', '保存しました', '已保存'],
  needName: ['골프장 이름을 먼저 넣어 주세요', 'Enter the course name first', 'ゴルフ場名を先に入力してください', '请先输入球场名称'],
  players: ['동반자 이름 (4명)', 'Players (4)', 'プレーヤー名（4人）', '球友姓名（4人）'],
  playersHelp: ['이름을 넣거나 🎲를 눌러 닉네임을 고르세요.', 'Type a name, or tap 🎲 for a nickname.', '名前を入力するか🎲でニックネームを選んでください。', '输入姓名，或点🎲选择昵称。'],
  holder: ['게임비 보관하는 분', 'Who holds the money', 'お金の預かり役', '保管人'],
  holderShort: ['보관', 'holder', '預かり', '保管'],
  mode: ['캐디', 'Caddie', 'キャディ', '球童'],
  modeCaddie: ['캐디 있음 (HG Caddy)', 'With caddie', 'キャディあり', '有球童'],
  modeNo: ['캐디 없음', 'No caddie', 'キャディなし', '无球童'],
  stake: ['1인 게임비', 'Stake per player', '1人あたりの参加費', '每人赌注'],
  stakeHelp: ['두 배씩 올라가며, 모든 상금이 같은 비율로 바뀝니다. 많이 딴 분이 식사를 대접하면 됩니다.', 'Doubles each step and every prize scales with it. The big winner buys the meal.', '2倍ずつ上がり、全ての賞金が同じ比率で変わります。一番勝った人が食事をおごりましょう。', '按两倍递增，所有奖金同比例变化。赢最多的人请吃饭。'],
  caddieFee: ['캐디피 (선택 · 현장에서 4명이 똑같이)', 'Caddie fee (optional, split 4 ways)', 'キャディフィー（任意・4人で均等）', '球童费（可选，四人均摊）'],
  perPerson: ['1인당 {x}', '{x} each', '1人 {x}', '每人 {x}'],
  rulesT: ['게임 규칙', 'Game rules', 'ゲームのルール', '游戏规则'],
  rRank: ['홀당 {pot}: 1등 {a} · 2등 {b} · 3등 {c} · 4등 {d}', 'Per hole {pot}: 1st {a} · 2nd {b} · 3rd {c} · 4th {d}', '1ホール {pot}：1位 {a}・2位 {b}・3位 {c}・4位 {d}', '每洞 {pot}：第1 {a}·第2 {b}·第3 {c}·第4 {d}'],
  rTie: ['동타면 그 홀에서 나중에 티샷한 분이 이깁니다. 첫 홀은 4번째로 친 분.', 'Ties go to whoever teed off later on that hole (on hole 1, the 4th hitter).', '同スコアはそのホールで後に打った人の勝ち。1番ホールは4番目の人。', '同杆时本洞后开球者获胜，第1洞为第4位开球者。'],
  rOrder: ['다음 홀 티샷 순서는 이번 홀 순위대로입니다.', "The next hole's tee order follows this hole's ranking.", '次のホールの打順はこのホールの順位どおり。', '下一洞开球顺序按本洞名次。'],
  rB1: ['첫 버디: 그 홀 {pot}은 캐디팁으로 캐디에게 드리고, 다른 세 분이 버디한 분에게 {k}씩 줍니다.', "First birdie: that hole's {pot} goes to the caddie as a tip, and the other three each give the birdie maker {k}.", '最初のバーディー：そのホールの{pot}はキャディへのチップ。他の3人がバーディーの人に{k}ずつ渡します。', '首个小鸟：本洞{pot}作为小费给球童，其他三人各给打小鸟者{k}。'],
  rB2: ['두 번째 버디부터: 버디한 분이 {pot}을 혼자 갖고, 다른 세 분에게 {k}씩 줍니다.', 'From the second birdie: the birdie maker takes the whole {pot} and gives the other three {k} each.', '2回目以降のバーディー：{pot}を独り占めし、他の3人に{k}ずつ渡します。', '第二个小鸟起：打小鸟者独得{pot}，并给其他三人各{k}。'],
  rBNo: ['버디: 버디한 분이 {pot}을 혼자 갖고, 다른 세 분에게 {k}씩 줍니다 (캐디팁 없음).', 'Birdie: the birdie maker takes the whole {pot} and gives the other three {k} each (no caddie tip).', 'バーディー：{pot}を独り占めし、他の3人に{k}ずつ渡します（チップなし）。', '小鸟：打小鸟者独得{pot}，并给其他三人各{k}（无小费）。'],
  rBTie: ['한 홀에 버디가 여럿이면 동타 규칙대로, 앞 홀에서 뒤진 분이 이깁니다. 이글은 버디보다 앞섭니다.', 'Several birdies on one hole follow the tie rule: whoever trailed on the last hole wins. An eagle beats a birdie.', '同じホールで複数バーディーなら同スコアのルールで、前のホールで負けていた人が勝ち。イーグルはバーディーより上。', '同洞多个小鸟按同杆规则，上一洞落后者获胜。老鹰优先于小鸟。'],
  rOwnTip: ['두 번째 버디부터 캐디팁을 주고 싶으면 본인 돈으로 따로 줍니다 (게임 돈과 별개).', 'From the second birdie on, any tip to the caddie comes from your own pocket, separate from the game.', '2回目以降にチップを渡したい場合は自分のお金で別に（ゲームとは別）。', '第二个小鸟起若想给小费，请自掏腰包（与游戏分开）。'],
  rLeft: ['18홀 뒤 남는 {left}은 네 분이 {each}씩 나눕니다.', 'The {left} left after 18 holes is shared, {each} each.', '18ホール後に残る{left}は4人で{each}ずつ分けます。', '18洞后剩余的{left}四人平分，每人{each}。'],
  pars: ['홀별 파 · 눌러서 3 → 4 → 5', 'Par per hole · tap to change 3 → 4 → 5', 'ホール別パー・タップで 3→4→5', '各洞标准杆 · 点按切换 3→4→5'],
  parTotal: ['합계 파 {x}', 'Total par {x}', '合計パー {x}', '总标准杆 {x}'],
  toDraw: ['티샷 순서 정하기', 'Set the tee order', '打順を決める', '确定开球顺序'],
  drawT: ['1번 홀 티샷 순서', 'Tee order for hole 1', '1番ホールの打順', '第1洞开球顺序'],
  drawHelp: ['돌리기로 정하거나, 실제로 정한 순서대로 이름을 차례로 누르세요.', 'Spin, or tap the names in the order you drew on the tee.', 'ルーレットで決めるか、実際の打順どおりに名前をタップしてください。', '转动决定，或按实际顺序依次点按姓名。'],
  spin: ['돌리기!', 'Spin!', '回す！', '转动！'],
  respin: ['다시 돌리기', 'Spin again', 'もう一度', '再转一次'],
  clear: ['지우기', 'Clear', 'クリア', '清除'],
  start: ['이 순서로 시작', 'Start with this order', 'この順で開始', '按此顺序开始'],
  back: ['설정', 'Settings', '設定', '设置'],
  tabHole: ['홀 입력', 'Scores', 'スコア入力', '记分'],
  tabCard: ['스코어카드', 'Scorecard', 'スコアカード', '记分卡'],
  tabSet: ['정산', 'Settle', '精算', '结算'],
  tabShare: ['공유', 'Share', '共有', '分享'],
  tee: ['티', 'tee', '打順', '开球'],
  parHint: ['눌러서 파 변경', 'tap to change', 'タップで変更', '点按修改'],
  thisHole: ['이 홀 결과', 'This hole', 'このホールの結果', '本洞结果'],
  lastHole: ['{h}번 홀 결과', 'Hole {h} result', '{h}番ホールの結果', '第{h}洞结果'],
  standing: ['지금까지 상금', 'Prize so far', 'これまでの賞金', '目前奖金'],
  bFirst: ['{name} 첫 버디! 이 홀 {pot}은 캐디팁으로 캐디에게, 다른 세 분이 {name}님께 {k}씩.', '{name} first birdie! This hole\'s {pot} goes to the caddie; the other three give {name} {k} each.', '{name} 最初のバーディー！{pot}はキャディへのチップ、他の3人が{k}ずつ。', '{name} 首个小鸟！本洞{pot}给球童作小费，其他三人各给{k}。'],
  bMore: ['{name} 버디! {pot}을 혼자 갖고 다른 세 분에게 {k}씩.', '{name} birdie! Takes the {pot} and gives the other three {k} each.', '{name} バーディー！{pot}を独り占めし、他の3人に{k}ずつ。', '{name} 小鸟！独得{pot}，给其他三人各{k}。'],
  ownTip: ['캐디팁을 따로 주고 싶으면 본인 돈으로 (게임 돈과 별개).', 'A tip to the caddie now is from your own pocket, separate from the game.', 'チップは自分のお金で別に（ゲームとは別）。', '如需给小费请自掏腰包（与游戏分开）。'],
  beforeFirst: ['아직 첫 버디 전입니다. 첫 버디 홀의 상금은 캐디팁이 됩니다.', 'No birdie yet. The first birdie hole\'s money becomes the caddie tip.', 'まだ最初のバーディー前。最初のバーディーのホールの賞金はチップになります。', '尚无小鸟。首个小鸟洞的奖金将作为球童小费。'],
  tieNote: ['동타 {n}명 → 나중에 친 {name} 승', '{n}-way tie → {name} teed off later and wins', '{n}人同スコア → 後に打った{name}の勝ち', '{n}人同杆 → 后开球的{name}获胜'],
  confirmNext: ['확정하고 다음 홀', 'Confirm, next hole', '確定して次へ', '确认，下一洞'],
  confirm18: ['18홀 확정 · 정산 보기', 'Confirm 18 · settle up', '18ホール確定・精算へ', '确认18洞 · 去结算'],
  saveEdit: ['수정 저장', 'Save changes', '修正を保存', '保存修改'],
  progress: ['진행 {n}/18홀', '{n}/18 holes', '進行 {n}/18', '进度 {n}/18洞'],
  caddieTip: ['캐디팁', 'Caddie tip', 'キャディチップ', '球童小费'],
  hole: ['홀', 'Hole', 'ホール', '洞'],
  total: ['합계', 'Total', '合計', '合计'],
  holeList: ['홀별 결과', 'Hole by hole', 'ホール別結果', '各洞结果'],
  noHoles: ['아직 끝난 홀이 없습니다.', 'No holes finished yet.', 'まだ終わったホールがありません。', '还没有完成的洞。'],
  winner: ['1등', 'Winner', '1位', '第1'],
  cardT: ['스코어카드 · {n}/18홀', 'Scorecard · {n}/18', 'スコアカード・{n}/18', '记分卡 · {n}/18'],
  finalSet: ['18홀 최종 정산', 'Final settlement', '18ホール最終精算', '18洞最终结算'],
  midSet: ['{n}홀까지 중간 정산', 'Settlement after {n} holes', '{n}ホールまでの途中精算', '前{n}洞中途结算'],
  spDetail: ['상금 {a} · 보관하신 분께 받을 돈 {b}', 'Prizes {a} · collect from holder {b}', '賞金 {a}・預かり役から受け取る {b}', '奖金 {a} · 从保管人处领取 {b}'],
  holdPot: ['보관금 {pot} ({dep} × 4)', 'Pot {pot} ({dep} × 4)', '預かり金 {pot}（{dep} × 4）', '保管金 {pot}（{dep} × 4）'],
  holdPaid: ['상금 지급 {x}', 'Prizes paid {x}', '賞金支払い {x}', '已付奖金 {x}'],
  holdTip: ['캐디팁 {x} (보관금에서 캐디에게)', 'Caddie tip {x} (from the pot to the caddie)', 'キャディチップ {x}（預かり金からキャディへ）', '球童小费 {x}（从保管金给球童）'],
  holdLeft: ['남은 돈 {left} → 네 분이 {each}씩 (동반 상금)', 'Left {left} → {each} each (shared prize)', '残り {left} → 4人で{each}ずつ', '剩余 {left} → 每人{each}（同伴奖金）'],
  holdFormula: ['받을 돈 = 상금 + {each} · 손익 = 받을 돈 − {dep}', 'Collect = prizes + {each} · Net = collect − {dep}', '受取額 = 賞金 + {each}・損益 = 受取額 − {dep}', '领取 = 奖金 + {each} · 盈亏 = 领取 − {dep}'],
  feeSplit: ['캐디피 {fee} → 1인당 {each} (현장에서 각자)', 'Caddie fee {fee} → {each} each (paid on site)', 'キャディフィー {fee} → 1人 {each}（現地で各自）', '球童费 {fee} → 每人 {each}（现场各付）'],
  again: ['같은 멤버로 새 게임', 'New game, same players', '同じメンバーで新しいゲーム', '同一组新游戏'],
  reset: ['처음부터', 'Start over', '最初から', '重新开始'],
  resetArm: ['한 번 더 누르면 삭제', 'Tap again to erase', 'もう一度で削除', '再按一次删除'],
  print: ['인쇄하기', 'Print', '印刷', '打印'],
  shareT: ['동반자와 결과 공유', 'Share with your partners', '同伴者と結果を共有', '与球友分享结果'],
  code: ['게임 번호', 'Game number', 'ゲーム番号', '游戏编号'],
  shareHelp: ['결과 보내기를 누르고 카카오톡 단톡방을 고르면, 지금까지의 순위와 정산이 글로 전달됩니다. 앱이 없는 분도 읽을 수 있습니다. 홀이 끝날 때마다 다시 보내면 최신 결과가 됩니다.', 'Tap Send and pick your KakaoTalk chat: the standings and settlement go as text anyone can read. Send again after each hole for the latest.', '「結果を送る」でトークを選ぶと、順位と精算が文章で届きます。アプリがない人も読めます。', '点“发送结果”并选择聊天，排名和结算以文字发送，没有应用的人也能看。'],
  openT: ['받은 결과 열기', 'Open shared results', '受け取った結果を開く', '打开收到的结果'],
  openHelp: ['동반자에게 받은 카톡 메시지를 길게 눌러 복사한 뒤, 아래 버튼을 누르세요.', 'Long-press the message from your partner, copy it, then tap below.', '受け取ったメッセージを長押しでコピーして、下のボタンを押してください。', '长按复制收到的消息，然后点下方按钮。'],
  openBtn: ['복사한 메시지로 결과 보기', 'Show results from copied message', 'コピーしたメッセージで結果を見る', '用复制的消息查看结果'],
  openPh: ['여기에 붙여넣어도 됩니다', 'Or paste here', 'ここに貼り付けても可', '也可粘贴到这里'],
  noCode: ['메시지에서 결과를 찾지 못했습니다.', 'No result found in the message.', 'メッセージに結果が見つかりません。', '消息中未找到结果。'],
  appView: ['Happy Caddy 앱에서 보기: 이 메시지를 복사 → 앱 공유 탭 → 받은 결과 열기', 'To view in the Happy Caddy app: copy this message → Share tab → Open shared results', 'アプリで見る：このメッセージをコピー → 共有タブ → 受け取った結果を開く', '在应用中查看：复制此消息 → 分享 → 打开收到的结果'],
  shareBtn: ['결과 보내기 (카톡·문자)', 'Send results (chat/SMS)', '結果を送る', '发送结果'],
  copyBtn: ['결과 복사', 'Copy results', '結果をコピー', '复制结果'],
  copied: ['복사했어요', 'Copied', 'コピーしました', '已复制'],
  liveNote: ['폰끼리 실시간 자동 연동은 서버가 있어야 해서 다음 단계에서 붙입니다.', 'Live auto-sync between phones needs a server and comes in the next step.', 'スマホ間のリアルタイム連動はサーバーが必要なため次の段階で追加します。', '手机间实时同步需要服务器，将在下一步加入。'],
  viewing: ['공유받은 결과 (보기 전용) · 게임 번호 {code}', 'Shared results (view only) · Game {code}', '共有された結果（閲覧のみ）・番号 {code}', '共享的结果（仅查看）· 编号 {code}'],
  exitView: ['내 게임 화면으로', 'Go to my own game', '自分のゲームへ', '回到我的游戏'],
  badLink: ['링크를 읽지 못했습니다.', 'Could not read this link.', 'リンクを読み込めませんでした。', '无法读取此链接。'],
  kakaoT: ['카카오톡 안에서 여셨네요', 'Opened inside KakaoTalk', 'カカオトーク内で開いています', '在KakaoTalk内打开'],
  kakaoHelp: ['카카오톡 화면에서는 앱 설치가 되지 않습니다. 아래 버튼을 누르면 Chrome이나 Safari로 열려서 설치할 수 있습니다.', 'Apps cannot be installed inside KakaoTalk. Tap below to open in Chrome or Safari and install.', 'カカオトーク内ではインストールできません。下のボタンでChromeやSafariで開いてください。', 'KakaoTalk内无法安装。点击下方按钮用Chrome或Safari打开后安装。'],
  kakaoBtn: ['Chrome·Safari로 열기', 'Open in Chrome/Safari', 'Chrome・Safariで開く', '用Chrome/Safari打开'],
  install: ['앱으로 설치', 'Install app', 'アプリをインストール', '安装应用'],
  installIOS: ['iPhone·iPad: Safari 아래쪽 공유 버튼 → "홈 화면에 추가"', 'iPhone/iPad: Safari Share button → "Add to Home Screen"', 'iPhone・iPad：Safariの共有ボタン →「ホーム画面に追加」', 'iPhone/iPad：Safari 分享按钮 →“添加到主屏幕”'],
  installMac: ['Mac Safari: 파일 메뉴 → "Dock에 추가"', 'Mac Safari: File menu → "Add to Dock"', 'Mac Safari：ファイル →「Dockに追加」', 'Mac Safari：文件 →“添加到程序坞”'],
  installOther: ['Chrome·Edge·삼성인터넷: 메뉴(⋮) → "앱 설치" 또는 "홈 화면에 추가"', 'Chrome/Edge/Samsung Internet: menu (⋮) → "Install app" or "Add to Home screen"', 'Chrome・Edge：メニュー(⋮) →「アプリをインストール」', 'Chrome/Edge：菜单(⋮) →“安装应用”'],
  gameDate: ['게임 날짜', 'Game date', 'ゲーム日', '比赛日期'],
  printTitle: ['Happy Caddy 해피게임 결과', 'Happy Caddy · Happy Game results', 'Happy Caddy ハッピーゲーム結果', 'Happy Caddy 快乐游戏结果'],
  net: ['손익', 'Net', '損益', '盈亏'],
  collect: ['받을 돈', 'Collect', '受取額', '领取'],
  prize: ['상금', 'Prizes', '賞金', '奖金'],
  strokes: ['타수', 'Strokes', '打数', '杆数'],
  modeLbl: ['방식', 'Mode', '方式', '方式'],
  stakeLbl: ['게임비', 'Stake', '参加費', '赌注'],
};
const SEASONS = { ko: ['봄', '여름', '가을', '겨울'], en: ['Spring', 'Summer', 'Autumn', 'Winter'], ja: ['春', '夏', '秋', '冬'], zh: ['春', '夏', '秋', '冬'] };
const NICKS = {
  ko: ['버디왕', '이글아이', '파세이버', '장타자', '퍼팅도사', '홀인원', '그린마스터', '벙커탈출', '나이스온', '굿샷', '해피캐디', '롱기스트'],
  en: ['Birdie King', 'Eagle Eye', 'Par Saver', 'Long Driver', 'Putt Master', 'Ace', 'Green Wizard', 'Sand Escape', 'Nice On', 'Good Shot', 'Happy Caddy', 'Longest'],
  ja: ['バーディ王', 'イーグルアイ', 'パーセーバー', '飛ばし屋', 'パット名人', 'ホールインワン', 'グリーンの達人', 'バンカー脱出', 'ナイスオン', 'グッドショット', 'ハッピーキャディ', 'ドラコン'],
  zh: ['小鸟王', '鹰眼', '保帕高手', '远距离王', '推杆大师', '一杆进洞', '果岭达人', '沙坑脱困', '好球上果岭', '好球', '快乐球童', '最远距离'],
};
const SCORE_LBL = {
  ko: ['알바트로스', '이글', '버디', '파', '보기', '더블', '트리플'],
  en: ['Albatross', 'Eagle', 'Birdie', 'Par', 'Bogey', 'Double', 'Triple'],
  ja: ['アルバトロス', 'イーグル', 'バーディー', 'パー', 'ボギー', 'ダブル', 'トリプル'],
  zh: ['信天翁', '老鹰', '小鸟', '标准杆', '柏忌', '双柏忌', '三柏忌'],
};

/* ---------- 상태 ---------- */
function newCode() { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)]; return s.slice(0, 3) + '-' + s.slice(3); }
function today() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function fresh(prev) {
  return {
    v: 2, phase: 'setup', code: newCode(), date: today(),
    players: prev ? prev.players.slice() : ['', '', '', ''], holder: prev ? prev.holder : 0,
    mode: prev ? prev.mode : 'caddie', unit: prev ? prev.unit : 1, caddieFee: prev ? prev.caddieFee : 0,
    course: prev ? prev.course : '', pars: prev ? prev.pars.slice() : DEF_PARS.slice(),
    order0: null, scores: Array(18).fill(null), done: Array(18).fill(false), cur: 0, tab: 'hole',
  };
}
const ls = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};
function load() { try { const s = JSON.parse(ls.get(KEY)); return s && s.v === 2 ? s : null; } catch (e) { return null; } }
let VIEW = false;                    // 공유 링크로 연 보기 전용 화면
let S = load() || fresh();
let LANG = ls.get(LANG_KEY) || 'ko';   // 기본은 한국어
if (!LANGS.includes(LANG)) LANG = 'ko';
function save() { if (!VIEW) ls.set(KEY, JSON.stringify(S)); }
let armed = null, drawView = null, manual = null, toastTimer = null, installEvt = null;

const L = () => LANGS.indexOf(LANG);
function t(key, vars) { const row = T[key]; let s = row ? (row[L()] || row[0]) : key; if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]); return s; }
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nm = i => S.players[i] || SEASONS[LANG][i];
function money(n) {
  n = Math.round(n); const a = Math.abs(n).toLocaleString(LOCALE[LANG]); const sg = n < 0 ? '−' : '';
  return LANG === 'ko' ? sg + a + '원' : sg + '₩' + a;
}
// 짧은 금액: 1만3천, −1천
function short(n) {
  if (LANG !== 'ko') return money(n);
  if (!n) return '0';
  const sg = n < 0 ? '−' : '', a = Math.abs(Math.round(n)), man = Math.floor(a / 10000), rest = a % 10000;
  let s = man ? man + '만' : '';
  if (rest) s += rest % 1000 === 0 ? rest / 1000 + '천' : rest.toLocaleString('ko-KR');
  return sg + s;
}
const signed = n => (n > 0 ? '+' : '') + short(n);
function scoreLabel(d) { const a = SCORE_LBL[LANG]; return d <= -3 ? a[0] : d === -2 ? a[1] : d === -1 ? a[2] : d === 0 ? a[3] : d === 1 ? a[4] : d === 2 ? a[5] : d === 3 ? a[6] : '+' + d; }
function rankLabel(i) { return LANG === 'ko' ? (i + 1) + '등' : LANG === 'en' ? ['1st', '2nd', '3rd', '4th'][i] : LANG === 'ja' ? (i + 1) + '位' : '第' + (i + 1); }
function fmtDate(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString(LOCALE[LANG], { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }); }
function amt(u = S.unit) { return { dep: BASE.dep * u, pot: BASE.pot * u, rank: BASE.rank.map(x => x * u), k: BASE.k * u, left: (BASE.dep * 4 - BASE.pot * 18) * u }; }

/* ---------- 핵심 계산 ---------- */
// order: 그 홀 티샷 순서 [선수번호…], sc: 타수, birdiesBefore: 이전 홀까지 버디가 나온 홀 수
function scoreHole(order, sc, par, birdiesBefore) {
  const A = amt(), pos = p => order.indexOf(p);
  // 타수 낮은 순, 동타면 나중에 티샷한 사람(앞 홀 후순위자)이 앞
  const rank = [0, 1, 2, 3].sort((a, b) => sc[a] - sc[b] || pos(b) - pos(a));
  const w = rank[0], birdie = sc[w] <= par - 1, pay = [0, 0, 0, 0];
  let kind = 'normal', tip = 0;
  if (birdie && S.mode === 'caddie' && birdiesBefore === 0) {
    kind = 'first'; tip = A.pot;                              // 이 홀 1만원 → 캐디팁
    rank.forEach(p => pay[p] = p === w ? 3 * A.k : -A.k);     // 세 명이 버디한 사람에게 1천원씩
  } else if (birdie) {
    kind = 'birdie';                                          // 독식 + 세 명에게 1천원씩
    rank.forEach(p => pay[p] = p === w ? A.pot - 3 * A.k : A.k);
  } else rank.forEach((p, i) => pay[p] = A.rank[i]);
  return { rank, pay, birdie, kind, tip };
}
function compute() {
  const holes = []; let order = S.order0, birdies = 0, played = 0, firstOpen = 18, tips = 0; const tot = [0, 0, 0, 0];
  for (let h = 0; h < 18; h++) {
    if (!order) { holes.push({ order: null }); continue; }
    if (!S.done[h] || !S.scores[h]) { holes.push({ order, birdiesBefore: birdies }); if (firstOpen === 18) firstOpen = h; order = null; continue; }
    const r = scoreHole(order, S.scores[h], S.pars[h], birdies);
    if (r.birdie) birdies++;
    r.pay.forEach((v, i) => tot[i] += v); tips += r.tip; played++;
    holes.push({ order, birdiesBefore: birdies - (r.birdie ? 1 : 0), ...r }); order = r.rank;
  }
  return { holes, tot, played, firstOpen, tips };
}
function settlement(C) {
  const A = amt(), pot = A.dep * 4, paid = C.tot.reduce((a, b) => a + b, 0), left = pot - paid - C.tips, each = left / 4;
  const back = C.tot.map(v => v + each), net = back.map(v => v - A.dep);
  return { A, pot, paid, left, each, back, net };
}

/* ---------- 화면 ---------- */
function photoCss() { const p = !VIEW && ls.get(PHOTO_KEY); return p ? ` style="--hero:url('${p}')"` : ''; }
function hero(slim, extra = '') {
  const langs = `<div class="langs">${LANGS.map(l => `<button class="${l === LANG ? 'on' : ''}" data-act="lang" data-v="${l}" aria-label="${l}">${LANG_BTN[l]}</button>`).join('')}</div>`;
  return `<header class="hero ${slim ? 'slim' : ''}"${slim ? '' : photoCss()}>${langs}
    <div class="brand"><img src="icons/icon-192.png" alt="">HAPPY <span>CADDY</span></div>
    <div class="date">${esc(fmtDate(S.date))}</div>
    <div class="course">${esc(S.course || t('sub'))}${S.course ? ' · ' + esc(t('sub')) : ''}</div>${extra}</header>`;
}
function rulesList() {
  const A = amt();
  const items = [t('rRank', { pot: short(A.pot), a: short(A.rank[0]), b: short(A.rank[1]), c: short(A.rank[2]), d: short(A.rank[3]) }), t('rTie'), t('rOrder')];
  if (S.mode === 'caddie') items.push(t('rB1', { pot: short(A.pot), k: short(A.k) }), t('rB2', { pot: short(A.pot), k: short(A.k) }), t('rOwnTip'));
  else items.push(t('rBNo', { pot: short(A.pot), k: short(A.k) }));
  items.push(t('rBTie'), t('rLeft', { left: short(A.left), each: short(A.left / 4) }));
  return `<ul class="rules">${items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
}
function courses() { try { return JSON.parse(ls.get(COURSES_KEY)) || []; } catch (e) { return []; } }

const IN_KAKAO = /KAKAOTALK/i.test(navigator.userAgent) && !window.HappyCaddyNative;
function kakaoCard() {
  return IN_KAKAO ? `<section class="card banner"><b>💬 ${t('kakaoT')}</b><span>${t('kakaoHelp')}</span><button class="btn" data-act="openExternal">${t('kakaoBtn')}</button></section>` : '';
}
function vSetup() {
  if (!VIEW) S.date = today();
  const cs = courses();
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isMacSafari = /Macintosh/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/Chrome|Edg/.test(navigator.userAgent) && !isIOS;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const installCard = standalone || IS_APP || !IS_WEB ? '' : `<section class="card"><span class="lbl">${t('install')}</span>
    ${installEvt ? `<button class="btn ghost" data-act="install">⛳ ${t('install')}</button>` : ''}
    <p class="sub">${esc(isIOS ? t('installIOS') : isMacSafari ? t('installMac') : t('installOther'))}</p></section>`;
  return hero(false) + kakaoCard() + `
  <section class="card"><span class="lbl">${t('course')}</span>
    <input type="text" data-in="course" value="${esc(S.course)}" placeholder="${esc(t('coursePh'))}" maxlength="30">
    <div class="photoRow">
      <label class="btn ghost small filebtn">📷 ${t('photo')}<input type="file" accept="image/*" data-in="photo"></label>
      ${ls.get(PHOTO_KEY) ? `<button class="btn ghost small" data-act="photoDel">${t('photoDel')}</button>` : ''}
    </div>
    <p class="sub">${t('photoHelp')}</p>
    ${cs.length ? `<span class="lbl">${t('saved')}</span><div class="chips">${cs.map((c, i) => `<button class="chip ${c.name === S.course ? 'on' : ''}" data-act="loadCourse" data-v="${i}">${esc(c.name)}</button>`).join('')}</div>` : ''}
  </section>
  <section class="card"><span class="lbl">${t('players')}</span>
    <p class="sub">${t('playersHelp')}</p>
    ${S.players.map((p, i) => `<div class="nameRow"><input type="text" data-in="name" data-i="${i}" placeholder="${esc(SEASONS[LANG][i])}" value="${esc(p)}" maxlength="10" aria-label="${i + 1}"><button class="dice" data-act="nick" data-v="${i}" aria-label="nickname">🎲</button></div>`).join('')}
    <span class="lbl">${t('holder')}</span>
    <div class="chips">${[0, 1, 2, 3].map(i => `<button class="chip ${S.holder === i ? 'on' : ''}" data-act="holder" data-v="${i}">${esc(nm(i))}</button>`).join('')}</div>
  </section>
  <section class="card"><span class="lbl">${t('mode')}</span>
    <div class="chips"><button class="chip ${S.mode === 'caddie' ? 'on' : ''}" data-act="mode" data-v="caddie">${t('modeCaddie')}</button>
    <button class="chip ${S.mode === 'nocaddie' ? 'on' : ''}" data-act="mode" data-v="nocaddie">${t('modeNo')}</button></div>
    <span class="lbl">${t('stake')}</span>
    <div class="chips">${UNITS.map(u => `<button class="chip ${S.unit === u ? 'on' : ''}" data-act="unit" data-v="${u}">${short(BASE.dep * u)}</button>`).join('')}</div>
    <p class="sub">${t('stakeHelp')}</p>
    ${S.mode === 'caddie' ? `<label><span class="lbl">${t('caddieFee')}</span><input type="number" inputmode="numeric" data-in="caddieFee" value="${S.caddieFee || ''}" placeholder="0" min="0" step="10000"></label>
    <p class="sub" id="feeOut">${S.caddieFee ? esc(t('perPerson', { x: money(S.caddieFee / 4) })) : ''}</p>` : ''}
    <span class="lbl">${t('rulesT')}</span>${rulesList()}
  </section>
  <section class="card"><span class="lbl">${t('pars')}</span>
    <div class="pars">${S.pars.map((p, h) => `<button class="par p${p}" data-act="par" data-v="${h}"><small>${h + 1}</small><b>${p}</b></button>`).join('')}</div>
    <div class="row" style="align-items:center"><p class="sub">${t('parTotal', { x: S.pars.reduce((a, b) => a + b, 0) })}</p>
    <button class="btn ghost small" data-act="saveCourse">💾 ${t('saveCourse')}</button></div>
  </section>
  <button class="btn" data-act="toDraw">${t('toDraw')}</button>
  ${installCard}`;
}

function slots(ord) { return [0, 1, 2, 3].map(i => ord[i] == null ? `<div class="slot empty"><span class="n">${i + 1}</span>…</div>` : `<div class="slot"><span class="n">${i + 1}</span>${esc(nm(ord[i]))}</div>`).join(''); }
function vDraw() {
  const ord = manual || drawView || S.order0 || [0, 1, 2, 3];
  const ready = manual ? manual.length === 4 : !!S.order0;
  return hero(true) + `
  <section class="card"><h2>${t('drawT')}</h2><p class="sub">${t('drawHelp')}</p>
    <div class="draw" id="draw">${slots(ord)}</div>
    <div class="chips">${[0, 1, 2, 3].map(i => `<button class="chip ${manual && manual.includes(i) ? 'on' : ''}" data-act="pick" data-v="${i}" ${manual && manual.includes(i) ? 'disabled' : ''}>${esc(nm(i))}</button>`).join('')}
    ${manual ? `<button class="chip" data-act="clearPick">${t('clear')}</button>` : ''}</div>
    <button class="btn ghost" data-act="spin" id="spinBtn">🎰 ${S.order0 && !manual ? t('respin') : t('spin')}</button></section>
  <div class="row"><button class="btn ghost" data-act="back">${t('back')}</button>
  <button class="btn" data-act="start" ${ready ? '' : 'disabled'}>${t('start')}</button></div>`;
}
function shuffle() { const a = [0, 1, 2, 3]; for (let i = 3; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function spin() {
  manual = null; const btn = document.getElementById('spinBtn'); if (btn) btn.disabled = true;
  let n = 0; const total = 14;
  const tick = () => {
    drawView = shuffle(); const el = document.getElementById('draw');
    if (el) { el.classList.add('spinning'); el.innerHTML = slots(drawView); }
    if (++n < total) setTimeout(tick, 60 + n * 12); else { S.order0 = drawView; drawView = null; save(); render(); }
  };
  tick();
}

function birdieBanner(r, H) {
  const A = amt(), bn = esc(nm(r.rank[0]));
  if (r.kind === 'first') return `<div class="banner">🐦 <b>${t('bFirst', { name: bn, pot: short(A.pot), k: short(A.k) })}</b><br>${esc(t('caddieTip'))} ${short(r.tip)} · ${bn} ${signed(r.pay[r.rank[0]])}</div>`;
  if (r.kind === 'birdie') return `<div class="banner">🐦 <b>${t('bMore', { name: bn, pot: short(A.pot), k: short(A.k) })}</b>${S.mode === 'caddie' ? `<br><span class="sub">${t('ownTip')}</span>` : ''}</div>`;
  return S.mode === 'caddie' && H.birdiesBefore === 0 ? `<p class="sub">${t('beforeFirst')}</p>` : '';
}
function previewRow(r) { return `<div class="preview">${r.rank.map((p, i) => `<div class="pv ${i === 0 ? 'first' : ''}"><div class="r">${rankLabel(i)}</div><div class="nm">${esc(nm(p))}</div><div class="m ${r.pay[p] < 0 ? 'neg' : ''}">${signed(r.pay[p])}</div></div>`).join('')}</div>`; }
function standings(C) {
  const ids = [0, 1, 2, 3].sort((a, b) => C.tot[b] - C.tot[a]);
  return `<div class="stand">${ids.map((p, i) => `<div class="st"><span class="rk">${i + 1}</span><span>${esc(nm(p))}</span><span class="v">${short(C.tot[p])}</span></div>`).join('')}</div>`;
}
function vHole() {
  const C = compute(); let h = S.cur; if (!C.holes[h] || !C.holes[h].order) { h = S.cur = Math.min(C.firstOpen, 17); }
  const H = C.holes[h];
  if (!S.scores[h]) { S.scores[h] = [S.pars[h], S.pars[h], S.pars[h], S.pars[h]]; save(); }
  const sc = S.scores[h], par = S.pars[h];
  const pv = scoreHole(H.order, sc, par, H.birdiesBefore);
  const nav = `<div class="holes">${S.pars.map((_, i) => `<button class="hn ${S.done[i] && C.holes[i].pay ? 'done' : ''} ${i === h ? 'cur' : ''}" data-act="go" data-v="${i}" ${C.holes[i].order ? '' : 'disabled'}>${i + 1}</button>`).join('')}</div>`;
  // 직전 홀 결과 (매 홀이 끝날 때마다 결과를 보여줌)
  const ph = h - 1, P = ph >= 0 ? C.holes[ph] : null;
  const lastCard = P && P.pay ? `<section class="card"><span class="lbl">✅ ${t('lastHole', { h: ph + 1 })}</span>${birdieBanner(P, P).replace(/<p class="sub">.*<\/p>/, '')}${previewRow(P)}
    <span class="lbl">${t('standing')}</span>${standings(C)}</section>` : '';
  const rows = H.order.map((p, i) => {
    const d = sc[p] - par; return `<div class="pl"><div class="tee"><b>${i + 1}</b>${t('tee')}</div>
    <div class="who"><div class="nm">${esc(nm(p))}</div><div class="tag ${d < 0 ? 'bd' : ''}">${scoreLabel(d)}</div></div>
    <div class="step"><button data-act="dec" data-v="${p}" aria-label="−">−</button><span class="v">${sc[p]}</span><button data-act="inc" data-v="${p}" aria-label="+">+</button></div></div>`;
  }).join('');
  const best = sc[pv.rank[0]], tied = pv.rank.filter(p => sc[p] === best);
  const ties = tied.length > 1 ? `<p class="sub">${esc(t('tieNote', { n: tied.length, name: nm(pv.rank[0]) }))}</p>` : '';
  const label = S.done[h] ? t('saveEdit') : h === 17 ? t('confirm18') : t('confirmNext');
  return `${nav}${S.done[h] ? '' : lastCard}<section class="card">
    <div class="holehead"><div><span class="lbl">${t('hole').toUpperCase()}</span><div class="big">${h + 1}</div></div>
    <div><button class="parbtn" data-act="parHere">PAR ${par}</button><div class="parhint">${t('parHint')}</div></div></div>
    <div>${rows}</div></section>
  <section class="card"><span class="lbl">${t('thisHole')}</span>${birdieBanner(pv, H)}${previewRow(pv)}${ties}</section>
  <button class="btn" data-act="confirm">${label}</button>
  <p class="sub" style="text-align:center">${t('progress', { n: C.played })} · ${esc(t('code'))} ${S.code}</p>`;
}

function cardTable(C) {
  const body = C.holes.map((H, h) => `<tr><td class="h">${h + 1}<br><small>P${S.pars[h]}</small></td>${[0, 1, 2, 3].map(p => {
    if (!H.pay) return '<td>·</td>'; const d = S.scores[h][p] - S.pars[h];
    return `<td class="${d < 0 ? 'bd' : ''}"><span class="s">${S.scores[h][p]}</span><span class="m ${H.pay[p] < 0 ? 'neg' : ''}">${signed(H.pay[p])}</span></td>`;
  }).join('')}<td>${H.tip ? short(H.tip) : ''}</td></tr>`).join('');
  const strokes = [0, 1, 2, 3].map(p => C.holes.reduce((a, H, h) => a + (H.pay ? S.scores[h][p] : 0), 0));
  return `<table><thead><tr><th>${t('hole')}</th>${[0, 1, 2, 3].map(p => `<th>${esc(nm(p))}</th>`).join('')}<th>${t('caddieTip')}</th></tr></thead>
  <tbody>${body}<tr class="tot"><td>${t('total')}</td>${[0, 1, 2, 3].map(p => `<td><span class="s">${strokes[p]}</span><span class="m">${money(C.tot[p])}</span></td>`).join('')}<td>${C.tips ? short(C.tips) : ''}</td></tr></tbody></table>`;
}
function holeList(C) {
  const items = C.holes.map((H, h) => H.pay ? `<div class="hli"><span class="t">${h + 1}${LANG === 'ko' ? '번 홀' : ''} · PAR ${S.pars[h]} · ${t('winner')} ${esc(nm(H.rank[0]))} ${H.birdie ? '🐦' : ''}</span>
    <span class="d">${H.rank.map(p => `${esc(nm(p))} ${S.scores[h][p]} (${signed(H.pay[p])})`).join(' · ')}${H.tip ? ` · ${t('caddieTip')} ${short(H.tip)}` : ''}</span></div>` : '').filter(Boolean).reverse();
  return items.length ? `<div class="hl">${items.join('')}</div>` : `<p class="sub">${t('noHoles')}</p>`;
}
function viewBar() { return VIEW ? kakaoCard() + `<div class="banner">👀 ${esc(t('viewing', { code: S.code }))}<br><button class="btn ghost small" data-act="exitView" style="margin-top:8px">${t('exitView')}</button></div>` : ''; }
function vCard() {
  const C = compute();
  return hero(true) + viewBar() + `<h2>${t('cardT', { n: C.played })}</h2>
  <section class="card"><div class="tw">${cardTable(C)}</div></section>
  <section class="card"><span class="lbl">${t('holeList')}</span>${holeList(C)}</section>
  <button class="btn ghost" data-act="print">🖨 ${t('print')}</button>`;
}
function vSet() {
  const C = compute(), X = settlement(C), A = X.A, final = C.played === 18;
  const list = [0, 1, 2, 3].sort((a, b) => X.back[b] - X.back[a]).map(p => `<div class="sp"><span class="nm">${esc(nm(p))}${p === S.holder ? ` <span class="sub">(${t('holderShort')})</span>` : ''}</span>
    <span class="net ${X.net[p] > 0 ? 'plus' : X.net[p] < 0 ? 'minus' : ''}">${X.net[p] > 0 ? '+' : ''}${money(X.net[p])}</span>
    <span class="d">${t('spDetail', { a: `<b>${money(C.tot[p])}</b>`, b: `<b>${money(X.back[p])}</b>` })}</span></div>`).join('');
  const fee = S.mode === 'caddie' && S.caddieFee ? `<br>${esc(t('feeSplit', { fee: money(S.caddieFee), each: money(S.caddieFee / 4) }))}` : '';
  return hero(true) + viewBar() + `<h2>${final ? t('finalSet') : t('midSet', { n: C.played })}</h2>
  <section class="card">${list}</section>
  <section class="card"><span class="lbl">${t('holder')} · ${esc(nm(S.holder))}</span><p class="hold">
    ${t('holdPot', { pot: `<b>${money(X.pot)}</b>`, dep: money(A.dep) })}<br>
    ${t('holdPaid', { x: `<b>${money(X.paid)}</b>` })}<br>
    ${C.tips ? t('holdTip', { x: `<b>${money(C.tips)}</b>` }) + '<br>' : ''}
    ${t('holdLeft', { left: `<b>${money(X.left)}</b>`, each: `<b>${money(X.each)}</b>` })}<br>
    ${esc(t('holdFormula', { each: money(X.each), dep: money(A.dep) }))}${fee}</p></section>
  <button class="btn ghost" data-act="print">🖨 ${t('print')}</button>
  ${VIEW ? '' : `<div class="row"><button class="btn ghost" data-act="again">${t('again')}</button>
  <button class="btn ${armed === 'reset' ? 'warn' : 'ghost'}" data-act="reset">${armed === 'reset' ? t('resetArm') : t('reset')}</button></div>`}`;
}

/* ---------- 결과 공유 (서버 없이 링크에 결과를 담음) ---------- */
function b64urlEncode(str) { const bytes = new TextEncoder().encode(str); let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b)); return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function b64urlDecode(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const bin = atob(s); return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))); }
const NATIVE = window.HappyCaddyNative || null;          // 안드로이드 앱 안에서 실행 중일 때
const IS_WEB = /^https?:$/.test(location.protocol);
const IS_APP = !!NATIVE || /Electron/i.test(navigator.userAgent);
function shareCode() {
  const o = { c: S.code, d: S.date, n: S.course, p: S.players, h: S.holder, m: S.mode === 'caddie' ? 1 : 0, u: S.unit, f: S.caddieFee || 0, a: S.pars.join(''), o: S.order0,
    s: S.scores.map((x, i) => S.done[i] && x ? x : 0) };
  return b64urlEncode(JSON.stringify(o));
}
function shareLink() { return IS_WEB ? location.origin + location.pathname + '#g=' + shareCode() : ''; }
function resultText() {
  const C = compute(), X = settlement(C), ids = [0, 1, 2, 3].sort((a, b) => X.net[b] - X.net[a]);
  const last = C.holes.map((H, h) => H.pay ? h : -1).filter(h => h >= 0).pop();
  const lines = ['⛳ Happy Caddy · ' + fmtDate(S.date), (S.course ? S.course + ' · ' : '') + t('code') + ' ' + S.code + ' · ' + t('progress', { n: C.played }), ''];
  ids.forEach((p, i) => lines.push(`${i + 1}. ${nm(p)}  ${X.net[p] > 0 ? '+' : ''}${money(X.net[p])}  (${t('prize')} ${money(C.tot[p])})`));
  if (last != null) { const H = C.holes[last]; lines.push('', t('lastHole', { h: last + 1 }) + ': ' + H.rank.map((p, i) => `${rankLabel(i)} ${nm(p)} ${S.scores[last][p]}`).join(', ') + (H.birdie ? ' 🐦' : '')); }
  if (C.tips) lines.push(t('caddieTip') + ' ' + money(C.tips));
  lines.push('', t('appView'), 'HC1:' + shareCode());
  const link = shareLink(); if (link) lines.push(link);
  return lines.join('\n');
}
function readShared(code) {
  const o = JSON.parse(b64urlDecode(code));
  const s = fresh(); s.code = o.c; s.date = o.d; s.course = o.n || ''; s.players = o.p; s.holder = o.h; s.mode = o.m ? 'caddie' : 'nocaddie';
  s.unit = o.u; s.caddieFee = o.f; s.pars = o.a.split('').map(Number); s.order0 = o.o; s.phase = 'play'; s.tab = 'card';
  s.scores = o.s.map(x => x || null); s.done = o.s.map(x => !!x);
  return s;
}
function openShared(text) {
  const m = String(text || '').match(/(?:HC1:|#g=)([A-Za-z0-9_-]{20,})/);
  if (!m) { toast(t('noCode')); return false; }
  try { S = readShared(m[1]); VIEW = true; armed = null; return true; } catch (e) { toast(t('noCode')); return false; }
}
async function copyText(text) {
  if (NATIVE) { NATIVE.copy(text); toast(t('copied')); return; }
  try { await navigator.clipboard.writeText(text); toast(t('copied')); } catch (err) { prompt(t('copyBtn'), text); }
}
async function readClipboard() {
  if (NATIVE) return NATIVE.paste();
  try { return await navigator.clipboard.readText(); } catch (e) { return ''; }
}
function vShare() {
  const link = shareLink();
  let qr = '';
  if (link) try { const q = qrcode(0, 'L'); q.addData(link); q.make(); qr = `<div class="qr">${q.createSvgTag({ cellSize: 4, margin: 2, scalable: true })}</div>`; } catch (e) {}
  return hero(true) + `<h2>${t('shareT')}</h2>
  <section class="card"><span class="lbl">${t('code')}</span><div class="code">${S.code}</div>${qr}
    <p class="sub">${t('shareHelp')}</p>
    <button class="btn" data-act="share">📤 ${t('shareBtn')}</button>
    <button class="btn ghost" data-act="copy">📋 ${t('copyBtn')}</button>
    <p class="sub">${t('liveNote')}</p></section>
  <section class="card"><span class="lbl">${t('openT')}</span><p class="sub">${t('openHelp')}</p>
    <button class="btn ghost" data-act="openPaste">📥 ${t('openBtn')}</button>
    <textarea id="pasteBox" rows="3" placeholder="${esc(t('openPh'))}" style="width:100%;font:inherit;padding:12px;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--ink)"></textarea></section>`;
}

/* ---------- 인쇄 ---------- */
function printView() {
  const C = compute(), X = settlement(C);
  const rows = [0, 1, 2, 3].map(p => `<tr><td>${esc(nm(p))}${p === S.holder ? ' (' + t('holderShort') + ')' : ''}</td><td>${C.holes.reduce((a, H, h) => a + (H.pay ? S.scores[h][p] : 0), 0)}</td><td>${money(C.tot[p])}</td><td>${money(X.back[p])}</td><td>${money(X.net[p])}</td></tr>`).join('');
  document.getElementById('print').innerHTML = `<h1>${esc(t('printTitle'))}</h1>
  <p>${esc(t('gameDate'))}: ${esc(fmtDate(S.date))} · ${esc(S.course)} · ${esc(t('code'))} ${S.code}</p>
  <p>${esc(t('modeLbl'))}: ${esc(S.mode === 'caddie' ? t('modeCaddie') : t('modeNo'))} · ${esc(t('stakeLbl'))}: ${money(amt().dep)}</p>
  <h2>${esc(t('tabCard'))}</h2>${cardTable(C)}
  <h2>${esc(C.played === 18 ? t('finalSet') : t('midSet', { n: C.played }))}</h2>
  <table><thead><tr><th></th><th>${t('strokes')}</th><th>${t('prize')}</th><th>${t('collect')}</th><th>${t('net')}</th></tr></thead><tbody>${rows}</tbody></table>
  <p>${t('holdPot', { pot: money(X.pot), dep: money(X.A.dep) })} · ${t('holdPaid', { x: money(X.paid) })}${C.tips ? ' · ' + t('holdTip', { x: money(C.tips) }) : ''} · ${t('holdLeft', { left: money(X.left), each: money(X.each) })}</p>`;
  if (NATIVE) NATIVE.print(); else window.print();
}

/* ---------- 렌더 ---------- */
function render() {
  document.documentElement.lang = LANG;
  const app = document.getElementById('app'), tabs = document.getElementById('tabs');
  tabs.hidden = S.phase !== 'play';
  if (S.phase === 'setup') app.innerHTML = vSetup();
  else if (S.phase === 'draw') app.innerHTML = vDraw();
  else {
    const list = VIEW ? ['card', 'set'] : ['hole', 'card', 'set', 'share'];
    if (!list.includes(S.tab)) S.tab = list[0];
    const names = { hole: 'tabHole', card: 'tabCard', set: 'tabSet', share: 'tabShare' };
    tabs.firstElementChild.innerHTML = list.map(v => `<button data-act="tab" data-v="${v}" class="${v === S.tab ? 'on' : ''}">${t(names[v])}</button>`).join('');
    app.innerHTML = S.tab === 'hole' ? hero(true) + vHole() : S.tab === 'card' ? vCard() : S.tab === 'set' ? vSet() : vShare();
  }
}
function toast(msg) {
  let el = document.querySelector('.toast'); if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => el.hidden = true, 1800);
}
function resizePhoto(file) {
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = () => {
    const max = 1280, s = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    if (!ls.set(PHOTO_KEY, c.toDataURL('image/jpeg', 0.8))) ls.set(PHOTO_KEY, c.toDataURL('image/jpeg', 0.5));
    render();
  };
  img.src = url;
}

document.addEventListener('input', e => {
  const k = e.target.dataset.in; if (!k || VIEW) return;
  if (k === 'name') { S.players[+e.target.dataset.i] = e.target.value.trim(); save(); document.querySelectorAll('[data-act=holder]').forEach((b, i) => b.textContent = nm(i)); }
  else if (k === 'course') { S.course = e.target.value.trim(); save(); }
  else if (k === 'caddieFee') { S.caddieFee = Math.max(0, parseInt(e.target.value) || 0); save(); const o = document.getElementById('feeOut'); if (o) o.textContent = S.caddieFee ? t('perPerson', { x: money(S.caddieFee / 4) }) : ''; }
});
document.addEventListener('change', e => {
  const k = e.target.dataset.in;
  if (k === 'photo' && e.target.files[0]) resizePhoto(e.target.files[0]);
  if (k === 'course') render();
});
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, v = +b.dataset.v; if (a !== 'reset') armed = null;
  switch (a) {
    case 'lang': LANG = b.dataset.v; ls.set(LANG_KEY, LANG); break;
    case 'holder': S.holder = v; break;
    case 'mode': S.mode = b.dataset.v; break;
    case 'unit': S.unit = v; break;
    case 'nick': { const used = new Set(S.players), pool = NICKS[LANG].filter(x => !used.has(x)); S.players[v] = pool[Math.floor(Math.random() * pool.length)]; break; }
    case 'par': S.pars[v] = S.pars[v] === 5 ? 3 : S.pars[v] + 1; break;
    case 'parHere': if (VIEW) return; S.pars[S.cur] = S.pars[S.cur] === 5 ? 3 : S.pars[S.cur] + 1; break;
    case 'photoDel': ls.del(PHOTO_KEY); break;
    case 'saveCourse': {
      if (!S.course) { toast(t('needName')); return; }
      const cs = courses().filter(c => c.name !== S.course); cs.unshift({ name: S.course, pars: S.pars.slice() }); ls.set(COURSES_KEY, JSON.stringify(cs.slice(0, 20))); toast(t('savedOk')); break;
    }
    case 'loadCourse': { const c = courses()[v]; if (c) { S.course = c.name; S.pars = c.pars.slice(); } break; }
    case 'toDraw': S.phase = 'draw'; manual = null; break;
    case 'back': S.phase = 'setup'; manual = null; break;
    case 'spin': spin(); return;
    case 'pick': manual = manual || []; if (!manual.includes(v)) manual.push(v); if (manual.length === 4) { S.order0 = manual.slice(); } break;
    case 'clearPick': manual = []; break;
    case 'start': if (manual && manual.length === 4) S.order0 = manual.slice(); manual = null; S.phase = 'play'; S.tab = 'hole'; S.date = S.done.some(Boolean) ? S.date : today(); S.cur = compute().firstOpen; break;
    case 'tab': S.tab = b.dataset.v; if (S.tab === 'hole' && S.done[S.cur]) S.cur = Math.min(compute().firstOpen, 17); break;
    case 'go': S.cur = v; break;
    case 'inc': S.scores[S.cur][v] = Math.min(15, S.scores[S.cur][v] + 1); break;
    case 'dec': S.scores[S.cur][v] = Math.max(1, S.scores[S.cur][v] - 1); break;
    case 'confirm': { const was = S.done[S.cur]; S.done[S.cur] = true; if (S.cur === 17 && !was) S.tab = 'set'; else if (!was) S.cur++; break; }
    case 'again': S = fresh(S); break;
    case 'reset': if (armed === 'reset') { S = fresh(); armed = null; } else armed = 'reset'; break;
    case 'print': printView(); return;
    case 'install': if (installEvt) { installEvt.prompt(); await installEvt.userChoice; installEvt = null; } break;
    case 'share': {
      const text = resultText();
      if (NATIVE) { NATIVE.share(text); return; }
      if (navigator.share) { try { await navigator.share({ text }); } catch (err) {} return; }
      await copyText(text); return;
    }
    case 'copy': await copyText(resultText()); return;
    case 'openPaste': {
      const box = document.getElementById('pasteBox'); const text = (box && box.value.trim()) || await readClipboard();
      if (!openShared(text)) return; break;
    }
    case 'openExternal': location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(location.href); return;
    case 'exitView': VIEW = false; try { history.replaceState(null, '', location.pathname); } catch (err) {} S = load() || fresh(); break;
  }
  save(); render(); if (!['inc', 'dec', 'par', 'holder', 'parHere', 'nick', 'pick', 'lang', 'mode', 'unit'].includes(a)) window.scrollTo(0, 0);
});
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (S.phase === 'setup') render(); });

function boot() {
  const m = location.hash.match(/^#g=([A-Za-z0-9_-]+)/);
  if (m) {
    try { S = readShared(m[1]); VIEW = true; }
    catch (err) { VIEW = false; S = load() || fresh(); setTimeout(() => toast(t('badLink')), 50); }
  }
  render();
}
window.addEventListener('hashchange', boot);
boot();
