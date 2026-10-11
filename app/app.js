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
const KEY = 'happycaddy.v1', LANG_KEY = 'happycaddy.lang';
const CLUBS_KEY = 'happycaddy.clubs', CLUBLIST_KEY = 'happycaddy.clublist';
const WEB = 'https://happy-caddy.vercel.app/app/', API = 'https://happy-caddy.vercel.app/api';
const DEF_NINE = [4, 4, 3, 5, 4, 4, 3, 4, 5];
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
  clubPh: ['골프장 이름이나 지역 (예: 스카이힐, 용인)', 'Club name or place (e.g. Sky Hill, Yongin)', 'ゴルフ場名か地域名（例: 済州）', '球场名称或地区（如 济州）'],
  clubHelp: ['이름 일부나 지역 이름(예: 용인, 가평, 제주)을 넣으면 전국 골프장에서 찾아 줍니다.', 'Type part of a club name, or a place such as Yongin or Jeju.', '名前の一部や地域名（例: 済州）で全国のゴルフ場を検索します。', '输入部分名称或地区名（如 济州）即可搜索全国球场。'],
  regionFind: ['📍 지역으로 찾기', '📍 Browse by region', '📍 地域から探す', '📍 按地区查找'],
  allArea: ['전체', 'All', 'すべて', '全部'],
  clubsIn: ['{x} 골프장 {n}곳', '{x}: {n} clubs', '{x}のゴルフ場 {n}件', '{x}球场 {n}个'],
  sortAsc: ['가→하 순', 'A → Z', '昇順', '升序'],
  sortDesc: ['하→가 순', 'Z → A', '降順', '降序'],
  recentDel: ['목록에서 지우기', 'Remove from list', 'リストから消す', '从列表删除'],
  clubNew: ['"{x}" 새 골프장으로 등록', 'Add "{x}" as a new club', '「{x}」を新しく登録', '将“{x}”登记为新球场'],
  clubLoading: ['전국 골프장 목록을 불러오는 중…', 'Loading golf clubs…', 'ゴルフ場一覧を読み込み中…', '正在加载球场列表…'],
  clubOffline: ['목록을 불러오지 못했어요. 이름을 넣고 새로 등록할 수 있습니다.', 'Could not load the list. You can still add a club by name.', '一覧を読み込めません。名前を入れて登録できます。', '无法加载列表，可输入名称新登记。'],
  clubNone: ['찾는 골프장이 없습니다.', 'No match.', '見つかりません。', '没有找到。'],
  recent: ['최근 골프장', 'Recent clubs', '最近のゴルフ場', '最近的球场'],
  clubChange: ['골프장 바꾸기', 'Change club', 'ゴルフ場を変更', '更换球场'],
  clubEdit: ['코스 등록·선택', 'Register / pick courses', 'コース登録・選択', '登记/选择球道'],
  site: ['골프장 홈페이지', 'Club homepage', 'ゴルフ場ホームページ', '球场主页'],
  sitePh: ['예: www.skyhill.co.kr', 'e.g. www.example-cc.co.kr', '例: www.example-cc.co.kr', '例: www.example-cc.co.kr'],
  siteHelp: ['홈페이지에서 골프장 사진을 먼저 찾고, 없으면 마스코트나 로고를 배경으로 씁니다. 사진은 저장하지 않고 홈페이지에서 바로 불러옵니다.', "We use the club's photo from its homepage, or its mascot or logo if there is none. Images load from the club's site and are not copied.", 'ホームページのゴルフ場写真、なければマスコットやロゴを背景にします（コピーせず直接読み込み）。', '优先使用主页上的球场照片，没有时用吉祥物或标志（直接从主页加载，不复制）。'],
  holesN: ['{n}홀', '{n} holes', '{n}ホール', '{n}洞'],
  ninesN: ['9홀 코스 {n}개', '{n} nines', '9ホール×{n}', '{n}个9洞球道'],
  sharedCourses: ['다른 사용자가 등록한 코스입니다. 실제와 다르면 코스 이름을 눌러 고쳐 주세요. 고치면 모두에게 반영됩니다.', 'These courses were registered by other users. Tap a course name to fix it; your fix is shared with everyone.', '他のユーザーが登録したコースです。違う場合は修正すると全員に反映されます。', '这些球道由其他用户登记，修改后会同步给所有人。'],
  sharedOk: ['저장했어요 · 다른 사용자와 공유됨', 'Saved · shared with everyone', '保存しました・共有済み', '已保存·已共享'],
  autoCourses: ['공개 지도 자료(OpenStreetMap)에 있는 홀별 파로 코스를 미리 넣어 두었습니다. 실제와 다르면 코스 이름을 눌러 고쳐 주세요.', 'Courses were pre-filled from OpenStreetMap hole data. Tap a course name to fix anything that differs.', '公開地図データのパーでコースを登録しました。違う場合はコース名を押して修正してください。', '已根据公开地图数据预先填入球道，如有不同请点击球道名称修改。'],
  clubStep: ['아래에서 이 골프장의 코스를 9홀씩 등록하세요. 코스 이름을 넣고(예: 동코스) 홀별 파를 눌러 맞춘 뒤 저장합니다.', 'Register this club\'s courses below, 9 holes each: name the course, tap each par, then save.', '下でこのゴルフ場のコースを9ホールずつ登録してください。', '请在下方按9洞登记该球场的球道。'],
  clubStepHas: ['오늘 칠 전반·후반 코스를 고르고 "이 코스로 정하기"를 누르세요. 코스를 더 등록할 수도 있습니다.', 'Pick today\'s front and back nine, then tap "Use these courses". You can add more courses below.', '今日の前半・後半コースを選んでください。', '请选择今天的前9洞和后9洞。'],
  clubPickHelp: ['오늘 칠 골프장을 검색해서 고르세요. 전에 고른 골프장은 아래 "최근 골프장"에서 바로 누를 수 있습니다.', 'Search for today\'s club, or tap one under Recent clubs.', '今日のゴルフ場を検索するか、最近のゴルフ場から選んでください。', '搜索今天的球场，或从最近的球场中选择。'],
  photoT: ['배경 사진', 'Background photo', '背景写真', '背景照片'],
  photoPick: ['홈페이지에서 찾은 사진입니다. 배경으로 쓸 사진을 눌러 고르세요.', 'Photos from the homepage. Tap one to use as the background.', 'ホームページの写真です。背景にする写真を選んでください。', '主页上的照片，点选一张作为背景。'],
  photoFind: ['홈페이지에서 사진을 찾는 중…', 'Looking for photos on the homepage…', 'ホームページの写真を探しています…', '正在主页上查找照片…'],
  noPhoto: ['홈페이지에서 사진을 찾지 못했습니다.', 'No photo found on the homepage.', 'ホームページに写真が見つかりません。', '主页上没有找到照片。'],
  coursesReg: ['등록된 코스', 'Registered courses', '登録済みコース', '已登记球道'],
  noCourses: ['아직 등록된 코스가 없습니다. 아래에서 9홀씩 추가하세요.', 'No courses yet. Add them below, 9 holes each.', 'まだコースがありません。下で9ホールずつ追加してください。', '还没有球道，请在下方按9洞添加。'],
  addCourse: ['코스 추가 (9홀)', 'Add a course (9 holes)', 'コース追加（9ホール）', '添加球道（9洞）'],
  editCourse: ['코스 고치기', 'Edit course', 'コース修正', '修改球道'],
  cnamePh: ['코스 이름 (예: 동코스, OUT)', 'Course name (e.g. East, OUT)', 'コース名（例: 東、OUT）', '球道名称（例: 东、OUT）'],
  saveC: ['이 코스 저장', 'Save course', 'コースを保存', '保存球道'],
  delC: ['삭제', 'Delete', '削除', '删除'],
  delSure: ['한 번 더 누르면 삭제', 'Tap again to delete', 'もう一度押すと削除', '再点一次删除'],
  front: ['전반 9홀', 'Front 9', '前半9ホール', '前9洞'],
  back9: ['후반 9홀', 'Back 9', '後半9ホール', '后9洞'],
  todayC: ['오늘 칠 코스', "Today's courses", '今日のコース', '今天打的球道'],
  useCourses: ['이 코스로 정하기', 'Use these courses', 'このコースで決定', '确定球道'],
  pickBoth: ['전반과 후반 코스를 골라 주세요', 'Pick the front and back courses', '前半と後半のコースを選んでください', '请选择前9洞和后9洞'],
  needCname: ['코스 이름을 넣어 주세요', 'Enter a course name', 'コース名を入力してください', '请输入球道名称'],
  savedOk: ['저장했어요', 'Saved', '保存しました', '已保存'],
  toSetup: ['← 돌아가기', '← Back', '← 戻る', '← 返回'],
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
  newGame: ['🏠 새 게임 · 골프장 바꾸기', '🏠 New game · change club', '🏠 新しいゲーム・ゴルフ場変更', '🏠 新游戏·更换球场'],
  newGameArm: ['한 번 더 누르면 새 게임 (지금 점수는 지워짐)', 'Tap again: new game (scores erased)', 'もう一度で新しいゲーム（スコア削除）', '再按一次开始新游戏（清除成绩）'],
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
    club: prev ? prev.club || '' : '', front: prev ? prev.front || '' : '', back: prev ? prev.back || '' : '', site: prev ? prev.site || '' : '',
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
/* ---------- 골프장 · 코스 ---------- */
// 내가 등록한 골프장: { 이름: { w: 홈페이지, r: 지역, cs: [{ n: 코스이름, p: [9홀 파] }], at: 마지막 사용 } }
function clubs() { try { return JSON.parse(ls.get(CLUBS_KEY)) || {}; } catch (e) { return {}; } }
function saveClubs(o) { ls.set(CLUBS_KEY, JSON.stringify(o)); }
function club(name = S.club) { const o = clubs(); return o[name] || null; }
function putClub(name, patch) { const o = clubs(); o[name] = Object.assign({ w: '', r: '', cs: [] }, o[name], patch, { at: Date.now() }); delete o[name].hid; saveClubs(o); return o[name]; }
function siteOf(name = S.club) { const c = club(name); return (c && c.w) || (name === S.club ? S.site : '') || ''; }
// 배경: 등록한 골프장의 홈페이지 첫 화면 사진만 씁니다(서버가 주소만 찾아 주고, 사진은 홈페이지에서 직접 불러옴).
function photoUrl() {
  if (!S.club) return VIEW && S.site ? API + '/photo?site=' + encodeURIComponent(S.site) : '';
  const c = club(), w = siteOf(); if (!w) return '';
  return c && c.img ? c.img : API + '/photo?site=' + encodeURIComponent(w);
}
const isMark = u => /logo|symbol|emblem|(^|[\/_-])[cb]i[_.\-]|mascot|character|chara[_.-]|\.svg/i.test(u || '');
function photoCss() { const u = photoUrl(); return u ? ` style="--hero:url('${u.replace(/'/g, '%27').replace(/"/g, '%22')}')"` : ''; }
// 화면 표시용 번역: 지역, 골프장 이름(영문 이름이 있으면), 코스 이름(동·서·남·북·코스)
const REGION = { 서울: ['Seoul', 'ソウル', '首尔'], 부산: ['Busan', '釜山', '釜山'], 대구: ['Daegu', '大邱', '大邱'], 인천: ['Incheon', '仁川', '仁川'],
  광주: ['Gwangju', '光州', '光州'], 대전: ['Daejeon', '大田', '大田'], 울산: ['Ulsan', '蔚山', '蔚山'], 세종: ['Sejong', '世宗', '世宗'],
  경기: ['Gyeonggi', '京畿', '京畿'], 강원: ['Gangwon', '江原', '江原'], 충북: ['Chungbuk', '忠北', '忠北'], 충남: ['Chungnam', '忠南', '忠南'],
  전북: ['Jeonbuk', '全北', '全北'], 전남: ['Jeonnam', '全南', '全南'], 경북: ['Gyeongbuk', '慶北', '庆北'], 경남: ['Gyeongnam', '慶南', '庆南'], 제주: ['Jeju', '済州', '济州'] };
const regionDisp = r => LANG === 'ko' || !REGION[r] ? r || '' : REGION[r][L() - 1];
// 지역 버튼 순서(지도 위에서 아래로)와 지역 이름의 다른 표기
const PROVS = ['서울', '경기', '인천', '강원', '충북', '충남', '대전', '세종', '전북', '전남', '광주', '경북', '경남', '대구', '울산', '부산', '제주'];
const PROV_ALIAS = { 서울: '서울특별시 서울시', 부산: '부산광역시 부산시', 대구: '대구광역시 대구시', 인천: '인천광역시 인천시', 광주: '광주광역시 광주시', 대전: '대전광역시 대전시',
  울산: '울산광역시 울산시', 세종: '세종특별자치시 세종시', 경기: '경기도', 강원: '강원도 강원특별자치도', 충북: '충청북도 충청북', 충남: '충청남도 충청남', 전북: '전라북도 전북특별자치도 전라북',
  전남: '전라남도 전라남', 경북: '경상북도 경상북', 경남: '경상남도 경상남', 제주: '제주도 제주특별자치도' };
let CITYNAMES = {};
const cityDisp = c => !c ? '' : LANG === 'ko' || !CITYNAMES[c] ? c : CITYNAMES[c][L() - 1] || c;
// 검색어가 지역(도·광역시) 또는 시·군·구 이름이면 그 지역을 돌려줍니다.
function placeMatch(q) {
  const n = String(q).toLowerCase().replace(/\s/g, ''), rs = new Set(), cs = new Set();
  if (n.length < 2 && !/[\u3040-\u30ff\u4e00-\u9fff]/.test(n)) return { rs, cs };
  const bare = x => String(x).toLowerCase().replace(/\s|-(si|gun|gu)$|(county|city|district)$/g, '');
  for (const r of PROVS) if (r === n || PROV_ALIAS[r].split(' ').includes(n) || (REGION[r] || []).some(x => bare(x) === n)) rs.add(r);
  for (const c of new Set((CLUBLIST || []).map(x => x.c).filter(Boolean))) {
    const base = c.replace(/(특례시|시|군|구)$/, '');
    if (c === n || (base === n && base.length >= 2) || (CITYNAMES[c] || []).some(x => bare(x) === n || bare(x).replace(/[市郡区區]$/, '') === n)) cs.add(c);
  }
  return { rs, cs };
}
const CWORD = { 동: ['East', '東', '东'], 서: ['West', '西', '西'], 남: ['South', '南', '南'], 북: ['North', '北', '北'], 코스: ['Course', 'コース', '球道'] };
function courseDisp(n) {
  if (LANG === 'ko' || !n) return n || '';
  return String(n).replace(/(동|서|남|북)(?=\s*코스|$)/g, m => CWORD[m][L() - 1] + (LANG === 'en' ? ' ' : '')).replace(/\s*코스/g, m => (LANG === 'en' ? ' ' : '') + CWORD['코스'][L() - 1]).replace(/\s+/g, ' ').trim();
}
function clubEn(n) { const c = club(n); if (c && c.en) return c.en; const k = (CLUBLIST || []).find(x => x.n === n); return k && k.en || ''; }
const clubDisp = n => LANG === 'ko' ? n : clubEn(n) || n;
function courseLabelDisp() {
  if (!S.club) return S.course;
  return clubDisp(S.club) + (S.front && S.back ? ' · ' + (S.front === S.back ? courseDisp(S.front) : courseDisp(S.front) + '→' + courseDisp(S.back)) : '');
}
function courseLabel() { return S.club ? S.club + (S.front && S.back ? ' · ' + (S.front === S.back ? S.front : S.front + '→' + S.back) : '') : ''; }

// 전국 골프장 목록 (OpenStreetMap 기반 data/clubs.json). 기기에 보관해 두고 하루에 한 번 새 목록이 있는지 봅니다.
let CLUBLIST = null, CLUBLIST_ERR = false, clubQ = '';
function clubList() {
  if (CLUBLIST) return CLUBLIST;
  try { const c = JSON.parse(ls.get(CLUBLIST_KEY)); if (c && c.list && c.list.length) { CLUBLIST = c.list; CITYNAMES = c.cities || {}; if (Date.now() - c.got < 864e5 && c.cities && Object.keys(c.cities).length) return CLUBLIST; } } catch (e) {}
  if (!clubList.busy) {
    clubList.busy = true;
    const get = u => fetch(u).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
    // 설치한 앱은 들어 있는 목록이 오래될 수 있으므로 인터넷의 새 목록을 먼저 봅니다.
    (IS_WEB ? get('data/clubs.json').catch(() => get(WEB + 'data/clubs.json')) : get(WEB + 'data/clubs.json').catch(() => get('data/clubs.json'))).then(d => {
      if (d.list && d.list.length) { CLUBLIST = d.list; CITYNAMES = d.cities || {}; ls.set(CLUBLIST_KEY, JSON.stringify({ got: Date.now(), list: d.list, cities: CITYNAMES })); }
      else if (!CLUBLIST) CLUBLIST_ERR = true;
    }).catch(() => { if (!CLUBLIST) CLUBLIST_ERR = true; }).finally(() => { clubList.busy = false; refreshClubRes(); });
  }
  return CLUBLIST;
}
const norm = s => String(s).toLowerCase().replace(/\s|\(.*?\)|골프클럽|골프장|컨트리클럽|골프앤리조트|골프&리조트|cc$|c\.c\.?$|gc$|g\.c\.?$/g, '');
// 이름 검색은 가장 비슷한 8곳, 지역 검색(지역 버튼이나 지역 이름)은 그 지역의 골프장 전부를 이름 순서로 보여 줍니다.
let clubR = '', clubC = '', clubSort = ls.get('happycaddy.clubsort') === '-1' ? -1 : 1, clubBrowse = false;
function clubPool() {
  const o = clubs(), list = clubList() || [];
  const mine = Object.keys(o).filter(k => !o[k].hid).map(k => { const kn = list.find(c => c.n === k) || {};
    return { n: k, r: o[k].r || kn.r, c: kn.c, en: o[k].en || kn.en, h: o[k].h || (o[k].cs.length * 9) || kn.h || 0, mine: true }; });
  return mine.concat(list.filter(c => !o[c.n] || o[c.n].hid));
}
const showName = c => LANG === 'ko' || !c.en ? c.n : c.en;
function searchClubs(q) {
  const n = norm(q || ''); let hit, browse = !!clubR;
  if (n) {
    const P = placeMatch(q); browse = browse || P.rs.size > 0 || P.cs.size > 0;
    hit = clubPool().filter(c => norm(c.n).includes(n) || (c.en && norm(c.en).includes(n)) || P.rs.has(c.r) || P.cs.has(c.c));
  } else hit = clubR ? clubPool() : [];
  if (clubR) hit = hit.filter(c => c.r === clubR);
  if (clubC) hit = hit.filter(c => c.c === clubC);
  if (browse) return hit.sort((a, b) => clubSort * showName(a).localeCompare(showName(b), LANG));
  hit.sort((a, b) => (b.mine ? 1 : 0) - (a.mine ? 1 : 0) || (norm(a.n).startsWith(n) ? 0 : 1) - (norm(b.n).startsWith(n) ? 0 : 1) || a.n.length - b.n.length);
  return hit.slice(0, 8);
}
function regionChips() {
  const list = clubList(), cnt = {}, ccnt = {};
  for (const c of list || []) { cnt[c.r] = (cnt[c.r] || 0) + 1; if (c.r === clubR && c.c) ccnt[c.c] = (ccnt[c.c] || 0) + 1; }
  const provs = list ? PROVS.filter(r => cnt[r]) : PROVS;
  const cities = Object.keys(ccnt).sort((a, b) => cityDisp(a).localeCompare(cityDisp(b), LANG));
  return `<span class="lbl">${t('regionFind')}</span>
    <div class="regions ${LANG === 'en' ? 'wide' : ''}">${provs.map(r => `<button class="chip ${clubR === r ? 'on' : ''}" data-act="clubRegion" data-v="${esc(r)}">${esc(regionDisp(r))}${cnt[r] ? `<small>${cnt[r]}</small>` : ''}</button>`).join('')}</div>
    ${clubR && cities.length > 1 ? `<div class="chips cities"><button class="chip small ${clubC ? '' : 'on'}" data-act="clubCity" data-v="">${t('allArea')}</button>${cities.map(c => `<button class="chip small ${clubC === c ? 'on' : ''}" data-act="clubCity" data-v="${esc(c)}">${esc(cityDisp(c))} <small>${ccnt[c]}</small></button>`).join('')}</div>` : ''}`;
}
function clubResHtml() {
  const q = clubQ.trim(), list = clubList(), hits = searchClubs(q);
  clubBrowse = !!clubR || (!!q && (placeMatch(q).rs.size > 0 || placeMatch(q).cs.size > 0));
  const chips = q ? '' : regionChips();
  if (!q && !clubR) return chips;
  const head = !list && !CLUBLIST_ERR ? `<p class="sub">${t('clubLoading')}</p>` : !list && CLUBLIST_ERR ? `<p class="sub">${t('clubOffline')}</p>` : !hits.length ? `<p class="sub">${t('clubNone')}</p>` : '';
  const exact = hits.some(h => norm(h.n) === norm(q));
  const P = q ? placeMatch(q) : null, one = P && P.rs.size + P.cs.size === 1 ? (P.rs.size ? regionDisp([...P.rs][0]) : cityDisp([...P.cs][0])) : '';
  const inOne = one && hits.every(h => P.rs.has(h.r) || P.cs.has(h.c));
  const where = clubC ? cityDisp(clubC) : clubR ? regionDisp(clubR) : inOne ? one : q;
  const bar = clubBrowse && hits.length ? `<div class="resbar"><b>${esc(t('clubsIn', { x: where, n: hits.length }))}</b><button class="chip small" data-act="clubSort">↕ ${t(clubSort > 0 ? 'sortAsc' : 'sortDesc')}</button></div>` : '';
  return chips + head + bar + `<div class="clubres">${hits.map(h => `<button class="clubhit" data-act="clubPick" data-n="${esc(h.n)}"><b>${esc(LANG === 'ko' || !h.en ? h.n : h.en + ' · ' + h.n)}</b><small>${[clubR ? '' : regionDisp(h.r), clubC ? '' : cityDisp(h.c), h.h ? t('holesN', { n: h.h }) : ''].filter(Boolean).map(esc).join(' · ')}</small>${h.mine ? '<small>⭐</small>' : ''}</button>`).join('')}
    ${!q || exact || (clubBrowse && hits.length) ? '' : `<button class="clubhit new" data-act="clubPick" data-n="${esc(q)}">➕ ${esc(t('clubNew', { x: q }))}</button>`}</div>`;
}
function refreshClubRes() { const el = document.getElementById('clubRes'); if (el) el.innerHTML = clubResHtml(); }
function pickClub(name) {
  name = String(name).trim().slice(0, 40); if (!name) return;
  const known = (clubList() || []).find(c => c.n === name), mine = club(name);
  // 지도 자료에 코스(홀별 파)가 있으면, 아직 등록한 코스가 없을 때 자동으로 넣어 줍니다.
  const auto = known && known.cs && !(mine && mine.cs && mine.cs.length) ? known.cs.map(x => ({ n: x.n, p: x.p.slice() })) : null;
  putClub(name, Object.assign({ w: (mine && mine.w) || (known && known.w) || '', r: (mine && mine.r) || (known && known.r) || '', h: (mine && mine.h) || (known && known.h) || 0, en: (mine && mine.en) || (known && known.en) || '' },
    auto ? { cs: auto, auto: true } : {}));
  S.club = name; S.site = siteOf(name); S.front = S.back = ''; S.course = name; clubQ = '';
  const cs = club(name).cs; if (cs.length === 1) S.front = S.back = cs[0].n; else if (cs.length >= 2) { S.front = cs[0].n; S.back = cs[1].n; }
  DRAFT = null; S.phase = 'club';
  loadShared(name);
}
// 다른 사용자가 등록해 둔 코스를 받아 옵니다(내가 직접 등록한 코스가 없을 때만).
function loadShared(name) {
  fetch(API + '/shared?club=' + encodeURIComponent(name)).then(r => r.json()).then(d => {
    const c = club(name); if (!c || !d || !d.cs || !d.cs.length) return;
    if (c.cs.length && !c.auto && !c.shared) return;
    putClub(name, { cs: d.cs, auto: false, shared: true });
    if (S.club !== name) return;
    const cs = d.cs; if (!cs.some(x => x.n === S.front)) S.front = cs[0].n; if (!cs.some(x => x.n === S.back)) S.back = (cs[1] || cs[0]).n;
    save();
    const typing = document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName);
    if (S.phase === 'club' && !typing) render();
  }).catch(() => {});
}
// 내가 등록·수정한 코스를 모두와 나눕니다.
function pushShared(name) {
  const c = club(name); if (!c || !c.cs.length) return;
  fetch(API + '/shared', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ club: name, cs: c.cs }) })
    .then(r => r.json()).then(d => { if (d && d.ok) toast(t('sharedOk')); }).catch(() => {});
}
function applyCourses() {
  const c = club(); if (!c) return false;
  const f = c.cs.find(x => x.n === S.front), b = c.cs.find(x => x.n === S.back);
  if (!f || !b) return false;
  S.pars = f.p.concat(b.p); S.course = courseLabel(); return true;
}
let DRAFT = null;   // 코스 추가·수정 중인 내용 { n, p[9], old }
function hero(slim, extra = '') {
  const langs = `<div class="langs">${LANGS.map(l => `<button class="${l === LANG ? 'on' : ''}" data-act="lang" data-v="${l}" aria-label="${l}">${LANG_BTN[l]}</button>`).join('')}</div>`;
  return `<header class="hero ${slim ? 'slim' : ''} ${!slim && isMark(photoUrl()) ? 'mark' : ''}"${slim ? '' : photoCss()}>${langs}
    <div class="brand"><img src="icons/icon-192.png" alt="">HAPPY <span>CADDY</span></div>
    <div class="date">${esc(fmtDate(S.date))}</div>
    <div class="course">${esc(courseLabelDisp() || t('sub'))}${courseLabelDisp() ? ' · ' + esc(t('sub')) : ''}</div>${extra}
    ${(S.phase === 'play' || S.phase === 'draw') && !VIEW ? `<button class="newgame ${armed === 'newGame' ? 'arm' : ''}" data-act="newGame">${t(armed === 'newGame' ? 'newGameArm' : 'newGame')}</button>` : ''}</header>`;
}
function parStrip(p) { return `<span class="parstrip">${p.map(x => `<i class="p${x}">${x}</i>`).join('')}<em>${p.reduce((a, b) => a + b, 0)}</em></span>`;
}
function rulesList() {
  const A = amt();
  const items = [t('rRank', { pot: short(A.pot), a: short(A.rank[0]), b: short(A.rank[1]), c: short(A.rank[2]), d: short(A.rank[3]) }), t('rTie'), t('rOrder')];
  if (S.mode === 'caddie') items.push(t('rB1', { pot: short(A.pot), k: short(A.k) }), t('rB2', { pot: short(A.pot), k: short(A.k) }), t('rOwnTip'));
  else items.push(t('rBNo', { pot: short(A.pot), k: short(A.k) }));
  items.push(t('rBTie'), t('rLeft', { left: short(A.left), each: short(A.left / 4) }));
  return `<ul class="rules">${items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
}

const IN_KAKAO = /KAKAOTALK/i.test(navigator.userAgent) && !window.HappyCaddyNative;
function kakaoCard() {
  return IN_KAKAO ? `<section class="card banner"><b>💬 ${t('kakaoT')}</b><span>${t('kakaoHelp')}</span><button class="btn" data-act="openExternal">${t('kakaoBtn')}</button></section>` : '';
}
function vSetup() {
  if (!VIEW) S.date = today();
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isMacSafari = /Macintosh/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/Chrome|Edg/.test(navigator.userAgent) && !isIOS;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const installCard = standalone || IS_APP || !IS_WEB ? '' : `<section class="card"><span class="lbl">${t('install')}</span>
    ${installEvt ? `<button class="btn ghost" data-act="install">⛳ ${t('install')}</button>` : ''}
    <p class="sub">${esc(isIOS ? t('installIOS') : isMacSafari ? t('installMac') : t('installOther'))}</p></section>`;
  return hero(false) + kakaoCard() + `
  <section class="card"><span class="lbl">${t('course')}</span>
    ${S.club ? `<div class="clubnow"><b>${esc(clubDisp(S.club))}</b>${S.front && S.back ? `<span>${esc(t('front'))}: ${esc(courseDisp(S.front))} · ${esc(t('back9'))}: ${esc(courseDisp(S.back))}</span>` : ''}</div>
    <div class="row"><button class="btn small" data-act="clubOpen">⛳ ${t('clubEdit')}</button><button class="btn ghost small" data-act="clubClear">🔄 ${t('clubChange')}</button></div>`
    : `<p class="sub">${t('clubPickHelp')}</p><input type="search" data-in="clubq" value="${esc(clubQ)}" placeholder="${esc(t('clubPh'))}" maxlength="40" autocomplete="off" enterkeyhint="search">
    <p class="sub">${t('clubHelp')}</p>${recentClubs()}<div id="clubRes">${clubResHtml()}</div>`}
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
    <p class="sub">${t('parTotal', { x: S.pars.reduce((a, b) => a + b, 0) })}</p>
  </section>
  <button class="btn" data-act="toDraw">${t('toDraw')}</button>
  ${installCard}`;
}

function recentClubs() {
  const o = clubs(), names = Object.keys(o).filter(k => !o[k].hid).sort((a, b) => (o[b].at || 0) - (o[a].at || 0)).slice(0, 6);
  return names.length ? `<span class="lbl">${t('recent')}</span><div class="chips">${names.map(n => `<span class="chipx"><button class="chip" data-act="clubPick" data-n="${esc(n)}">${esc(clubDisp(n))}</button><button class="x" data-act="recentDel" data-n="${esc(n)}" aria-label="${esc(t('recentDel'))}" title="${esc(t('recentDel'))}">✕</button></span>`).join('')}</div>` : '';
}
function vClub() {
  const c = club() || { w: '', r: '', cs: [] };
  if (!DRAFT) DRAFT = { n: '', p: DEF_NINE.slice(), old: null };
  const quick = (LANG === 'ko' ? ['동코스', '서코스', '남코스', '북코스'] : ['동', '서', '남', '북'].map(x => courseDisp(x + '코스'))).concat(['OUT', 'IN']);
  const pick = (which, cur) => `<div class="chips">${c.cs.map(x => `<button class="chip ${cur === x.n ? 'on' : ''}" data-act="${which}" data-n="${esc(x.n)}">${esc(courseDisp(x.n))}</button>`).join('')}</div>`;
  return hero(false) + `
  <section class="card"><div class="clubnow"><b>${esc(clubDisp(S.club))}</b><span>${[regionDisp(c.r), (c.h || c.cs.length * 9) ? t('holesN', { n: c.h || c.cs.length * 9 }) + ((c.h || c.cs.length * 9) > 9 && (c.h || c.cs.length * 9) % 9 === 0 ? ' · ' + t('ninesN', { n: (c.h || c.cs.length * 9) / 9 }) : '') : ''].filter(Boolean).map(esc).join(' · ')}</span></div>
    ${c.auto ? `<p class="note">🗺️ ${t('autoCourses')}</p>` : c.shared && c.cs.length ? `<p class="note">🤝 ${t('sharedCourses')}</p>` : ''}
    <p class="sub">${t(c.cs.length ? 'clubStepHas' : 'clubStep')}</p>
    <button class="btn ghost small" data-act="clubClear">🔄 ${t('clubChange')}</button></section>
  ${c.cs.length ? `<section class="card"><span class="lbl">${t('todayC')}</span>
    <span class="lbl">${t('front')}</span>${pick('cFront', S.front)}
    <span class="lbl">${t('back9')}</span>${pick('cBack', S.back)}
    ${S.front && S.back ? parStrip(c.cs.find(x => x.n === S.front).p.concat(c.cs.find(x => x.n === S.back).p)) : ''}
  </section>
  <button class="btn" data-act="cUse">${t('useCourses')}</button>` : ''}
  <section class="card" id="draft"><span class="lbl">${DRAFT.old != null ? t('editCourse') : t('addCourse')}</span>
    <input type="text" data-in="cname" value="${esc(DRAFT.n)}" placeholder="${esc(t('cnamePh'))}" maxlength="16">
    <div class="chips">${quick.map(q => `<button class="chip small" data-act="cQuick" data-n="${esc(q)}">${esc(q)}</button>`).join('')}</div>
    <span class="lbl">${t('pars')}</span>
    <div class="pars nine">${DRAFT.p.map((p, h) => `<button class="par p${p}" data-act="dpar" data-v="${h}"><small>${h + 1}</small><b>${p}</b></button>`).join('')}</div>
    <p class="sub">${t('parTotal', { x: DRAFT.p.reduce((a, b) => a + b, 0) })}</p>
    <button class="btn" data-act="cSave">💾 ${t('saveC')}</button>
  </section>
  ${c.cs.length ? `<section class="card"><span class="lbl">${t('coursesReg')}</span>
    ${c.cs.map((x, i) => `<div class="crow"><button class="cname" data-act="cEdit" data-v="${i}">${esc(courseDisp(x.n))}</button>${parStrip(x.p)}
      <button class="btn ghost small" data-act="cDel" data-v="${i}">${armed === 'cDel' + i ? t('delSure') : t('delC')}</button></div>`).join('')}
  </section>` : ''}
  <section class="card"><span class="lbl">📷 ${t('photoT')}</span>
    <label><span class="lbl">${t('site')}</span><input type="url" inputmode="url" data-in="site" value="${esc(c.w)}" placeholder="${esc(t('sitePh'))}" maxlength="120" autocomplete="off"></label>
    <p class="sub">${t('siteHelp')}</p><div id="photoNote">${photoPicker()}</div></section>
  <button class="btn ghost" data-act="back">${t('toSetup')}</button>`;
}
// 홈페이지에서 찾은 사진 후보를 보여 주고, 사용자가 배경으로 쓸 사진을 고릅니다.
let PHOTOS = { site: '', imgs: null };
function photoPicker() {
  const w = siteOf(), c = club() || {}; if (!w) return '';
  if (PHOTOS.site !== w || !PHOTOS.imgs) return `<p class="sub">${t('photoFind')}</p>`;
  if (!PHOTOS.imgs.length) return `<p class="sub">${t('noPhoto')}</p>`;
  const cur = c.img || PHOTOS.imgs[0];
  return `<p class="sub">${t('photoPick')}</p><div class="thumbs">${PHOTOS.imgs.map(u => `<button class="thumb ${u === cur ? 'on' : ''} ${isMark(u) ? 'mark' : ''}" data-act="pickImg" data-u="${esc(u)}"><img src="${esc(u)}" alt="" loading="lazy" referrerpolicy="no-referrer"></button>`).join('')}</div>`;
}
function checkPhoto() {
  const w = siteOf(); if (!w || (PHOTOS.site === w && PHOTOS.imgs)) return;
  PHOTOS = { site: w, imgs: null };
  fetch(API + '/photo?json=1&list=1&site=' + encodeURIComponent(w)).then(r => r.json()).catch(() => ({}))
    .then(d => {
      if (PHOTOS.site !== w) return; PHOTOS.imgs = d.imgs || (d.img ? [d.img] : []);
      // 아직 고른 사진이 없으면 첫 번째(골프장 사진 > 마스코트 > 로고)를 배경으로 씁니다.
      const el = document.getElementById('photoNote'); if (el) el.innerHTML = photoPicker();
      const c = club(); if (c && !c.img && PHOTOS.imgs.length) firstLoading(PHOTOS.imgs).then(u => {
        const c2 = club(); if (!u || !c2 || c2.img || siteOf() !== w) return;
        putClub(S.club, { img: u });
        // 입력 중인 칸이 있으면 화면 전체를 다시 그리지 않고 배경과 사진 목록만 바꿉니다.
        const h = document.querySelector('header.hero:not(.slim)'); if (h && (S.phase === 'club' || S.phase === 'setup')) h.outerHTML = hero(false);
        const e3 = document.getElementById('photoNote'); if (e3) e3.innerHTML = photoPicker();
      });
    });
}
// 후보 중 실제로 열리는 첫 사진을 찾습니다.
function firstLoading(list) {
  return list.reduce((pr, u) => pr.then(found => found || new Promise(res => {
    const im = new Image(); im.referrerPolicy = 'no-referrer';
    const tm = setTimeout(() => res(''), 6000);
    im.onload = () => { clearTimeout(tm); res(im.naturalWidth > 1 ? u : ''); }; im.onerror = () => { clearTimeout(tm); res(''); }; im.src = u;
  })), Promise.resolve(''));
}
// 열리지 않는 사진은 목록에서 숨깁니다.
document.addEventListener('error', e => { const b = e.target.closest && e.target.closest('.thumb'); if (b) b.remove(); }, true);

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
  const o = { c: S.code, d: S.date, n: S.course, w: S.site || undefined, p: S.players, h: S.holder, m: S.mode === 'caddie' ? 1 : 0, u: S.unit, f: S.caddieFee || 0, a: S.pars.join(''), o: S.order0,
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
  s.site = o.w || ''; s.unit = o.u; s.caddieFee = o.f; s.pars = o.a.split('').map(Number); s.order0 = o.o; s.phase = 'play'; s.tab = 'card';
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
  if (S.phase === 'club' && (VIEW || !S.club)) S.phase = 'setup';
  tabs.hidden = S.phase !== 'play';
  if (S.phase === 'setup') app.innerHTML = vSetup();
  else if (S.phase === 'draw') app.innerHTML = vDraw();
  else if (S.phase === 'club') { app.innerHTML = vClub(); checkPhoto(); }
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
document.addEventListener('input', e => {
  const k = e.target.dataset.in; if (!k || VIEW) return;
  if (k === 'name') { S.players[+e.target.dataset.i] = e.target.value.trim(); save(); document.querySelectorAll('[data-act=holder]').forEach((b, i) => b.textContent = nm(i)); }
  else if (k === 'clubq') { clubQ = e.target.value; clubR = clubC = ''; refreshClubRes(); }
  else if (k === 'cname') { DRAFT.n = e.target.value.trim(); }
  else if (k === 'caddieFee') { S.caddieFee = Math.max(0, parseInt(e.target.value) || 0); save(); const o = document.getElementById('feeOut'); if (o) o.textContent = S.caddieFee ? t('perPerson', { x: money(S.caddieFee / 4) }) : ''; }
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.isComposing) return;
  if (e.target.dataset.in === 'clubq') { e.preventDefault(); if (clubBrowse) { e.target.blur(); return; } const h = document.querySelector('.clubhit:not(.new)') || (CLUBLIST || CLUBLIST_ERR ? document.querySelector('.clubhit.new') : null); if (h) h.click(); }
  if (e.target.dataset.in === 'cname') { e.preventDefault(); e.target.blur(); }
});
document.addEventListener('change', e => {
  const k = e.target.dataset.in;
  if (k === 'site') {
    let w = e.target.value.trim().replace(/\s/g, ''); if (w && !/^https?:\/\//i.test(w)) w = 'https://' + w;
    putClub(S.club, { w, img: '' }); S.site = w; save(); render();
  }
});
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, v = +b.dataset.v; if (a !== 'reset' && a !== 'cDel' && a !== 'newGame') armed = null;
  switch (a) {
    case 'lang': LANG = b.dataset.v; ls.set(LANG_KEY, LANG); break;
    case 'holder': S.holder = v; break;
    case 'mode': S.mode = b.dataset.v; break;
    case 'unit': S.unit = v; break;
    case 'nick': { const used = new Set(S.players), pool = NICKS[LANG].filter(x => !used.has(x)); S.players[v] = pool[Math.floor(Math.random() * pool.length)]; break; }
    case 'par': S.pars[v] = S.pars[v] === 5 ? 3 : S.pars[v] + 1; break;
    case 'parHere': if (VIEW) return; S.pars[S.cur] = S.pars[S.cur] === 5 ? 3 : S.pars[S.cur] + 1; break;
    case 'clubPick': pickClub(b.dataset.n); break;
    case 'clubOpen': DRAFT = null; S.phase = 'club'; break;
    case 'clubRegion': clubR = clubR === b.dataset.v ? '' : b.dataset.v; clubC = ''; clubQ = ''; { const q = document.querySelector('[data-in=clubq]'); if (q) q.value = ''; } refreshClubRes(); return;
    case 'clubCity': clubC = b.dataset.v; refreshClubRes(); return;
    case 'clubSort': clubSort = -clubSort; ls.set('happycaddy.clubsort', String(clubSort)); refreshClubRes(); return;
    case 'recentDel': { const o = clubs(); if (o[b.dataset.n]) { o[b.dataset.n].hid = true; saveClubs(o); } render(); return; }
    case 'clubClear': S.club = S.front = S.back = S.site = ''; S.course = ''; clubQ = ''; clubR = clubC = ''; DRAFT = null; if (S.phase === 'club') S.phase = 'setup'; setTimeout(() => { const q = document.querySelector('[data-in=clubq]'); if (q) q.focus(); }, 50); break;
    case 'dpar': DRAFT.p[v] = DRAFT.p[v] === 5 ? 3 : DRAFT.p[v] + 1; break;
    case 'cQuick': DRAFT.n = b.dataset.n; break;
    case 'cEdit': { const x = club().cs[v]; DRAFT = { n: x.n, p: x.p.slice(), old: v }; save(); render(); document.getElementById('draft').scrollIntoView({ block: 'start' }); return; }
    case 'cDel': {
      if (armed !== 'cDel' + v) { armed = 'cDel' + v; render(); return; }
      const c = club(), gone = c.cs[v].n; c.cs.splice(v, 1); putClub(S.club, { cs: c.cs, auto: false, shared: false }); pushShared(S.club);
      if (S.front === gone) S.front = ''; if (S.back === gone) S.back = ''; armed = null; DRAFT = null; break;
    }
    case 'cSave': {
      const inp = document.querySelector('[data-in=cname]'); if (inp) DRAFT.n = inp.value.trim();
      if (!DRAFT.n) { toast(t('needCname')); return; }
      const c = club(), cs = c.cs.slice(), item = { n: DRAFT.n, p: DRAFT.p.slice() };
      const oldName = DRAFT.old != null && cs[DRAFT.old] ? cs[DRAFT.old].n : null;
      const same = cs.findIndex(x => x.n === item.n);
      if (DRAFT.old != null && cs[DRAFT.old]) { cs[DRAFT.old] = item; if (same >= 0 && same !== DRAFT.old) cs.splice(same, 1); }
      else if (same >= 0) cs[same] = item; else cs.push(item);
      putClub(S.club, { cs, auto: false, shared: false });
      pushShared(S.club);
      if (oldName) { if (S.front === oldName) S.front = item.n; if (S.back === oldName) S.back = item.n; }
      if (!S.front) S.front = item.n; else if (!S.back || S.back === S.front && cs.length === 2) S.back = item.n;
      if (!S.back) S.back = S.front;   // 코스가 하나뿐이면 전반·후반 모두 그 코스
      DRAFT = null; toast(t('savedOk')); break;
    }
    case 'pickImg': putClub(S.club, { img: b.dataset.u }); break;
    case 'cFront': S.front = b.dataset.n; break;
    case 'cBack': S.back = b.dataset.n; break;
    case 'cUse': { const c = club(); if (c && c.cs.length === 1) S.front = S.back = c.cs[0].n; if (!applyCourses()) { toast(t('pickBoth')); return; } S.phase = 'setup'; break; }
    case 'toDraw': S.phase = 'draw'; manual = null; break;
    case 'back': if (S.phase === 'club') applyCourses(); S.phase = 'setup'; manual = null; DRAFT = null; break;
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
    case 'newGame': {
      // 점수가 있으면 두 번 눌러야 새 게임이 됩니다. 이름·골프장·코스는 그대로 두고 첫 화면으로 갑니다.
      if (S.done.some(Boolean) && armed !== 'newGame') { armed = 'newGame'; render(); return; }
      armed = null; DRAFT = null; manual = null; S = fresh(S); break;
    }
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
  save(); render(); if (!['inc', 'dec', 'par', 'holder', 'parHere', 'nick', 'pick', 'lang', 'mode', 'unit', 'dpar', 'cQuick', 'cFront', 'cBack', 'cDel', 'pickImg'].includes(a)) window.scrollTo(0, 0);
});
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (S.phase === 'setup') render(); });

function boot() {
  const m = location.hash.match(/^#g=([A-Za-z0-9_-]+)/);
  if (m) {
    try { S = readShared(m[1]); VIEW = true; }
    catch (err) { VIEW = false; S = load() || fresh(); setTimeout(() => toast(t('badLink')), 50); }
  }
  // 지난 날짜에 시작만 하고 치지 않은 게임은 새 게임으로 바꿉니다.
  if (!VIEW && S.phase !== 'setup' && S.date !== today() && !S.done.some(Boolean)) S = fresh(S);
  render();
}
window.addEventListener('hashchange', boot);
boot();
