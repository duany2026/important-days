/*
 * ============================================================
 * 重要日子插件 (Important Days Plugin)
 * ============================================================
 *
 * 插件功能：记录生活中的重要日子，支持纪念日、生日倒计时
 * 版本：1.5.0
 * 作者：duany
 * 许可证：MIT
 *
 * 源码说明：本文件即唯一源码，直接手工维护，没有构建步骤；
 * 文件内的 CommonJS 模块兼容层（__defProp / __export 等）仅供 Obsidian 加载使用，请勿删除。
 *
 * 功能特性：
 *   📅 纪念日记录 - 显示倒计时天数、周年数、已过天数/月数
 *   🎂 生日记录 - 显示年龄、农历公历互转、属相、星座
 *   🌙 农历支持 - 支持农历日期输入和显示
 *   📱 响应式设计 - 适配手机和电脑
 *   🌗 深色模式 - 自动适配 Obsidian 主题
 *   ⏰ 临近提醒 - 14天内倒计时高亮显示
 *
 * 数据格式：
 *   # 重要日子
 *   
 *   ## 纪念日
 *   - 结婚纪念日 | 2023-05-20
 *   - 恋爱纪念日 | 2020-02-14
 *   
 *   ## 生日
 *   - 妈妈生日 | 1965-08-15
 *   - 奶奶生日 | 1940-12-08 | 农历
 *
 * 代码架构：
 *
 * 1. DateUtils (日期工具模块)
 *    - getDaysUntil: 计算距离目标日期的天数
 *    - getWeekDay: 获取日期是星期几
 *    - getAge: 计算年龄
 *    - getDaysPassed: 计算已过天数
 *    - getMonthsPassed: 计算已过月数
 *    - getAnniversaryYears: 计算周年数
 *
 * 2. LunarCalendar (农历转换模块)
 *    - 内置1900-2100年农历数据
 *    - solarToLunar: 公历转农历
 *    - lunarToSolar: 农历转公历
 *    - getZodiac: 获取生肖（按农历年份）
 *    - getConstellation: 获取星座
 *    - getLunarDateText: 格式化农历日期文本
 *
 * 3. ImportantDaysView (主视图模块)
 *    - parseDays: 解析MD文件中的日子数据
 *    - render: 渲染卡片列表
 *    - renderCard: 渲染单个卡片
 *    - renderBirthdayCard: 渲染生日卡片
 *    - renderAnniversaryCard: 渲染纪念日卡片
 *    - showDayModal: 显示添加/编辑弹窗
 *    - uniformCardHeights: 统一卡片高度
 *
 * 4. ImportantDaysSettingTab (设置面板)
 *    - 数据文件扫描和设置
 *
 * 5. ImportantDaysPlugin (插件主类)
 *    - onload: 插件加载
 *    - activateView: 激活视图
 *    - scanForDataFile: 自动扫描数据文件
 *
 * ============================================================
 */

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ---- 模块导出：Obsidian 通过 module.exports.default 获取插件主类 ----
var main_exports = {};
__export(main_exports, {
  default: () => ImportantDaysPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// ==================== 国际化（i18n）====================
// - 界面语言跟随 Obsidian（不提供单独选项）：简体中文 / 繁体中文 / English，其余语言回退 English
// - zh-CN 是权威源语言，zh-TW / en 缺 key 时自动回退 zh-CN（不会白屏）
// - 只翻译「界面显示」。写进笔记的格式串（H1、小节标题、农历标记、周期关键字、默认文件名）见 DATA_FORMATS：
//   解析侧认全部语言写法（切语言不丢旧文件），新建文件跟随界面语言，往已有文件里写时沿用该文件自己的语言
// - 占位符统一 {token}
var I18N = {
  "zh-CN": {
    "cmd.open": "打开重要日子",
    "plugin.name": "重要日子",
    "notice.invalidLine": "重要日子：数据文件中有个别行无法识别为有效条目，已忽略（详情见控制台）",
    "notice.readFail": "数据文件读取失败",
    "notice.openFail": "重要日子：无法打开视图，请重启 Obsidian 后重试",
    "notice.deleteFail": "删除失败",
    "notice.saveFail": "保存失败",
    "notice.nameRequired": "请填写名称",
    "notice.namePipe": "名称不能包含 | 字符（会破坏数据文件格式）",
    "notice.dupCycle": "已存在相同名称和周期的日子，请修改",
    "notice.dupDay": "已存在相同名称和日期的日子，请修改",
    "notice.badDate": "日期无效，请重新选择",
    "error.conflict": "数据文件已被外部修改，为避免覆盖手改内容未保存。请先刷新视图再重试",
    "error.entryGone": "该记录已被外部改动，请刷新后重试",
    "view.initFail": "视图初始化失败",
    "view.renderFail": "视图渲染失败",
    "view.loading": "加载中...",
    "view.refresh": "刷新",
    "view.add": "添加",
    "empty.noFile": "数据文件不存在",
    "empty.path": "当前路径：{path}",
    "empty.fixTitle": "解决方法：",
    "empty.fixRescan": "在插件设置中点击「重新扫描」自动查找",
    "empty.fixCreate": "或创建包含「# 重要日子」标题的 Markdown 文件",
    "empty.noDays": "还没有记录任何日子",
    "empty.noDaysHint": "点击右上角「添加」开始记录，首次添加会自动创建数据文件",
    "card.renderErrorSuffix": " (渲染错误)",
    "card.renderError": "渲染错误",
    "card.invalidDate": "日期无效",
    "card.ageToday": "今日{n}岁",
    "card.ageSoon": "即将{n}岁",
    "card.lunarMain": "农历 {text}",
    "card.lunarSub": "农历{text}",
    "card.leapMonthTag": "（闰月）",
    "card.leapDayTag": "（闰年生日）",
    "card.zodiac": "属{z}",
    "card.bornDays": "已出生 {n} 天",
    "card.today": "今",
    "card.nextInvalid": "下一次日期无效",
    "card.next": "下一次：{date}",
    "card.leapDayNext": "（{date}）",
    "card.noLeapThisYear": "（今年无闰月）",
    "card.annivToday": "今日{n}周年",
    "card.annivSoon": "即将{n}周年",
    "card.together": "已相伴 {d} 天（{m}个月）",
    "card.cycleInvalid": "周期值无效，请编辑修正",
    "cycle.monthly": "每月",
    "cycle.quarterly": "每季度",
    "cycle.yearly": "每年",
    "cycle.weekly": "每周",
    "cycle.val.monthly": "每月{d}号",
    "cycle.val.quarterly": "每季度第{m}个月{d}号",
    "modal.addTitle": "添加日子",
    "modal.editTitle": "编辑日子",
    "modal.name": "名称",
    "modal.namePh": "例如：结婚纪念日",
    "modal.type": "类型",
    "modal.typeHint": "纪念日显示倒计时和周年数，生日显示年龄、属相和星座，周期事件支持每月/每季度/每年/每周",
    "modal.cycle": "周期",
    "modal.cycleHint": "如日期超出当月天数，自动调整为该月最后一天（如2月31号→2月28/29号）",
    "modal.date": "日期",
    "modal.lunarDate": "农历日期",
    "modal.leapMonth": "闰月（农历生日专用）",
    "modal.dateHint": "选择日期的年、月、日",
    "modal.lunarHint": "勾选后输入农历日期，系统会自动转换为公历显示；年份填农历年（腊月出生注意和公历年差一年）",
    "modal.cancel": "取消",
    "modal.save": "保存",
    "modal.delete": "删除",
    "modal.confirmDelete": "确定删除「{name}」吗？",
    "opt.year": "{y}年",
    "opt.month": "{m}月",
    "opt.day": "{d}日",
    "opt.dayOfMonth": "{d}号",
    "opt.monthOfQuarter": "第{m}个月",
    "type.anniversary": "纪念日",
    "type.birthday": "生日",
    "type.cycle": "周期事件",
    "settings.section": "数据文件",
    "settings.current": "当前：{path}",
    "settings.notFound": "未找到数据文件。点「重新扫描」自动查找；在视图里点「+」添加日子时也会自动创建",
    "settings.path.name": "文件路径",
    "settings.path.desc": "数据文件的库内路径（如：笔记/重要日子.md）。通常用下方「重新扫描」自动查找即可；手动指定后失焦或回车才生效，文件不存在时添加日子会自动创建",
    "settings.path.ph": "例如：笔记/重要日子.md",
    "settings.path.invalid": "路径需为以 .md 结尾且不含 .. 的库内路径（如：笔记/重要日子.md），已保留原值",
    "settings.scan.name": "自动扫描",
    "settings.scan.btn": "重新扫描",
    "settings.scan.busy": "扫描中…",
    "settings.scan.multi": "找到 {n} 个匹配文件，已使用第一个；其他候选可在「文件路径」中手动指定：{list}",
    "settings.scan.found": "已找到：{path}",
    "settings.scan.same": "当前文件已是最新",
    "settings.scan.none": "未找到数据文件",
    "list.sep": "、"
  },
  "zh-TW": {
    "cmd.open": "開啟重要日子",
    "plugin.name": "重要日子",
    "notice.invalidLine": "重要日子：資料檔中有個別行無法識別為有效條目，已忽略（詳情見主控台）",
    "notice.readFail": "資料檔讀取失敗",
    "notice.openFail": "重要日子：無法開啟視圖，請重新啟動 Obsidian 後再試",
    "notice.deleteFail": "刪除失敗",
    "notice.saveFail": "儲存失敗",
    "notice.nameRequired": "請填寫名稱",
    "notice.namePipe": "名稱不能包含 | 字元（會破壞資料檔格式）",
    "notice.dupCycle": "已存在相同名稱與週期的日子，請修改",
    "notice.dupDay": "已存在相同名稱與日期的日子，請修改",
    "notice.badDate": "日期無效，請重新選擇",
    "error.conflict": "資料檔已被外部修改，為避免覆蓋手動修改的內容而未儲存。請先重新整理視圖再試",
    "error.entryGone": "該記錄已被外部改動，請重新整理後再試",
    "view.initFail": "視圖初始化失敗",
    "view.renderFail": "視圖渲染失敗",
    "view.loading": "載入中...",
    "view.refresh": "重新整理",
    "view.add": "新增",
    "empty.noFile": "資料檔不存在",
    "empty.path": "目前路徑：{path}",
    "empty.fixTitle": "解決方法：",
    "empty.fixRescan": "在外掛設定中點擊「重新掃描」自動尋找",
    "empty.fixCreate": "或建立含「# 重要日子」標題的 Markdown 檔案",
    "empty.noDays": "還沒有記錄任何日子",
    "empty.noDaysHint": "點擊右上角「新增」開始記錄，首次新增會自動建立資料檔",
    "card.renderErrorSuffix": " (渲染錯誤)",
    "card.renderError": "渲染錯誤",
    "card.invalidDate": "日期無效",
    "card.ageToday": "今日{n}歲",
    "card.ageSoon": "即將{n}歲",
    "card.lunarMain": "農曆 {text}",
    "card.lunarSub": "農曆{text}",
    "card.leapMonthTag": "（閏月）",
    "card.leapDayTag": "（閏年生日）",
    "card.zodiac": "屬{z}",
    "card.bornDays": "已出生 {n} 天",
    "card.today": "今",
    "card.nextInvalid": "下一次日期無效",
    "card.next": "下一次：{date}",
    "card.leapDayNext": "（{date}）",
    "card.noLeapThisYear": "（今年無閏月）",
    "card.annivToday": "今日{n}週年",
    "card.annivSoon": "即將{n}週年",
    "card.together": "已相伴 {d} 天（{m}個月）",
    "card.cycleInvalid": "週期值無效，請編輯修正",
    "cycle.monthly": "每月",
    "cycle.quarterly": "每季",
    "cycle.yearly": "每年",
    "cycle.weekly": "每週",
    "cycle.val.monthly": "每月{d}號",
    "cycle.val.quarterly": "每季第{m}個月{d}號",
    "modal.addTitle": "新增日子",
    "modal.editTitle": "編輯日子",
    "modal.name": "名稱",
    "modal.namePh": "例如：結婚紀念日",
    "modal.type": "類型",
    "modal.typeHint": "紀念日顯示倒數與週年數，生日顯示年齡、生肖與星座，週期事件支援每月/每季/每年/每週",
    "modal.cycle": "週期",
    "modal.cycleHint": "如日期超出當月天數，自動調整為該月最後一天（如2月31號→2月28/29號）",
    "modal.date": "日期",
    "modal.lunarDate": "農曆日期",
    "modal.leapMonth": "閏月（農曆生日專用）",
    "modal.dateHint": "選擇日期的年、月、日",
    "modal.lunarHint": "勾選後輸入農曆日期，系統會自動轉換為公曆顯示；年份填農曆年（臘月出生注意與公曆年差一年）",
    "modal.cancel": "取消",
    "modal.save": "儲存",
    "modal.delete": "刪除",
    "modal.confirmDelete": "確定刪除「{name}」嗎？",
    "opt.year": "{y}年",
    "opt.month": "{m}月",
    "opt.day": "{d}日",
    "opt.dayOfMonth": "{d}號",
    "opt.monthOfQuarter": "第{m}個月",
    "type.anniversary": "紀念日",
    "type.birthday": "生日",
    "type.cycle": "週期事件",
    "settings.section": "資料檔",
    "settings.current": "目前：{path}",
    "settings.notFound": "未找到資料檔。點「重新掃描」自動尋找；在視圖裡點「+」新增日子時也會自動建立",
    "settings.path.name": "檔案路徑",
    "settings.path.desc": "資料檔在儲存庫內的路徑（如：筆記/重要日子.md）。通常用下方「重新掃描」自動尋找即可；手動指定後失焦或按 Enter 才生效，檔案不存在時新增日子會自動建立",
    "settings.path.ph": "例如：筆記/重要日子.md",
    "settings.path.invalid": "路徑需為以 .md 結尾且不含 .. 的儲存庫內路徑（如：筆記/重要日子.md），已保留原值",
    "settings.scan.name": "自動掃描",
    "settings.scan.btn": "重新掃描",
    "settings.scan.busy": "掃描中…",
    "settings.scan.multi": "找到 {n} 個符合的檔案，已使用第一個；其他候選可在「檔案路徑」中手動指定：{list}",
    "settings.scan.found": "已找到：{path}",
    "settings.scan.same": "目前檔案已是最新",
    "settings.scan.none": "未找到資料檔",
    "list.sep": "、"
  },
  "en": {
    "cmd.open": "Open view",
    "plugin.name": "Important Days",
    "notice.invalidLine": "Important Days: some lines in the data file could not be recognized and were skipped (see the console for details).",
    "notice.readFail": "Could not read the data file",
    "notice.openFail": "Important Days: could not open the view. Restart Obsidian and try again.",
    "notice.deleteFail": "Delete failed",
    "notice.saveFail": "Save failed",
    "notice.nameRequired": "Please enter a name",
    "notice.namePipe": "The name cannot contain \"|\" (it would break the data file format)",
    "notice.dupCycle": "A day with the same name and recurrence already exists",
    "notice.dupDay": "A day with the same name and date already exists",
    "notice.badDate": "Invalid date, please pick again",
    "error.conflict": "The data file was changed outside the plugin, so nothing was saved to avoid overwriting your edits. Refresh the view and try again.",
    "error.entryGone": "This entry was changed outside the plugin. Refresh and try again.",
    "view.initFail": "The view failed to load",
    "view.renderFail": "The view failed to render",
    "view.loading": "Loading...",
    "view.refresh": "Refresh",
    "view.add": "Add",
    "empty.noFile": "Data file not found",
    "empty.path": "Current path: {path}",
    "empty.fixTitle": "How to fix:",
    "empty.fixRescan": "Click \"Rescan\" in the plugin settings to find it automatically",
    "empty.fixCreate": "Or create a Markdown note with the heading \"# Important Days\"",
    "empty.noDays": "No days recorded yet",
    "empty.noDaysHint": "Click \"Add\" in the top-right corner to start. The data file is created automatically the first time.",
    "card.renderErrorSuffix": " (render error)",
    "card.renderError": "Render error",
    "card.invalidDate": "Invalid date",
    "card.ageToday": "Turns {n} today",
    "card.ageSoon": "Turning {n}",
    "card.lunarMain": "Lunar {text}",
    "card.lunarSub": "Lunar {text}",
    "card.leapMonthTag": " (leap month)",
    "card.leapDayTag": " (leap day)",
    "card.zodiac": "Year of the {z}",
    "card.bornDays": "{n} days since birth",
    "card.today": "Today",
    "card.nextInvalid": "Next date is invalid",
    "card.next": "Next: {date}",
    "card.leapDayNext": " ({date})",
    "card.noLeapThisYear": " (no leap month this year)",
    "card.annivToday": "{n} years today",
    "card.annivSoon": "{n} years coming up",
    "card.together": "Together for {d} days ({m} months)",
    "card.cycleInvalid": "Invalid recurrence. Edit the entry to fix it.",
    "cycle.monthly": "Monthly",
    "cycle.quarterly": "Quarterly",
    "cycle.yearly": "Yearly",
    "cycle.weekly": "Weekly",
    "cycle.val.monthly": "Day {d} of every month",
    "cycle.val.quarterly": "Day {d} of month {m} in each quarter",
    "modal.addTitle": "Add day",
    "modal.editTitle": "Edit day",
    "modal.name": "Name",
    "modal.namePh": "e.g. Wedding anniversary",
    "modal.type": "Type",
    "modal.typeHint": "Anniversaries show a countdown and the number of years; birthdays show age, Chinese zodiac and star sign; recurring events repeat monthly, quarterly, yearly or weekly.",
    "modal.cycle": "Repeats",
    "modal.cycleHint": "If the day is past the end of a month, the last day of that month is used (e.g. Feb 31 → Feb 28/29).",
    "modal.date": "Date",
    "modal.lunarDate": "Lunar date",
    "modal.leapMonth": "Leap month (lunar birthdays only)",
    "modal.dateHint": "Pick the year, month and day",
    "modal.lunarHint": "Enter the date in the Chinese lunar calendar; it is shown converted to the Gregorian calendar. Use the lunar year (for births in the 12th lunar month it can be one less than the Gregorian year).",
    "modal.cancel": "Cancel",
    "modal.save": "Save",
    "modal.delete": "Delete",
    "modal.confirmDelete": "Delete \"{name}\"?",
    "opt.year": "{y}",
    "opt.month": "{m}",
    "opt.day": "{d}",
    "opt.dayOfMonth": "Day {d}",
    "opt.monthOfQuarter": "Month {m}",
    "type.anniversary": "Anniversary",
    "type.birthday": "Birthday",
    "type.cycle": "Recurring event",
    "settings.section": "Data file",
    "settings.current": "Current: {path}",
    "settings.notFound": "No data file found. Click \"Rescan\" to look for one; it is also created automatically when you add a day with \"+\" in the view.",
    "settings.path.name": "File path",
    "settings.path.desc": "Vault path of the data note (e.g. Notes/Important Days.md). Usually \"Rescan\" below finds it for you. A manual value takes effect on blur or Enter; if the note does not exist, it is created when you add a day.",
    "settings.path.ph": "e.g. Notes/Important Days.md",
    "settings.path.invalid": "The path must be inside the vault, end with .md and contain no \"..\" (e.g. Notes/Important Days.md). The previous value was kept.",
    "settings.scan.name": "Auto scan",
    "settings.scan.btn": "Rescan",
    "settings.scan.busy": "Scanning…",
    "settings.scan.multi": "Found {n} matching notes and used the first. You can set another one under \"File path\": {list}",
    "settings.scan.found": "Found: {path}",
    "settings.scan.same": "The current file is already up to date",
    "settings.scan.none": "No data file found",
    "list.sep": ", "
  }
};

/** 当前界面语言（onload 里由 applyLanguage 定，随 Obsidian 设置）*/
var I18N_LANG = "zh-CN";

/**
 * 取词：I18N_LANG 缺该 key 时回退 zh-CN；两处都没有则返回 key 本身（便于发现漏翻）
 * @param key - 文案 key
 * @param vars - 占位值，如 { n: 3 } 替换 "{n}"
 */
function tr(key, vars) {
  var dict = I18N[I18N_LANG] || I18N["zh-CN"];
  var s = dict[key];
  if (s === undefined) s = I18N["zh-CN"][key];
  if (s === undefined) return key;
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, function (m0, name) {
    return vars[name] === undefined || vars[name] === null ? m0 : String(vars[name]);
  });
}

/**
 * 把 Obsidian 的界面语言码归一到本插件支持的三种：zh-CN / zh-TW / en
 * - 先取语族再判书写：带 hant/tw/hk/mo 的一律繁体，其余 zh 走简体
 * - 未收录或取不到的语言（ja/de/...）回退 en：数据文件的写法也随界面语言，
 *   非中文用户落到简中会同时拿到中文界面和中文数据格式，英文是更通用的兜底
 */
function resolveLanguage(code) {
  if (!code || typeof code !== "string") return "en";
  const lower = code.toLowerCase();
  if (lower.indexOf("zh") !== 0) return "en";
  if (/hant|tw|hk|mo/.test(lower)) return "zh-TW";
  return "zh-CN";
}

/**
 * 读 Obsidian 界面语言写入 I18N_LANG。
 * getLanguage 自 Obsidian 1.8.7 才有（minAppVersion 是 0.15.0），老版本退回系统语言
 */
function applyLanguage() {
  let code;
  try {
    code = typeof import_obsidian2.getLanguage === "function" ? import_obsidian2.getLanguage() : (navigator.language || "en");
  } catch {
    code = navigator.language || "en";
  }
  I18N_LANG = resolveLanguage(code);
  return I18N_LANG;
}

var MONTH_SHORT_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var WEEKDAY_NAMES_I18N = {
  "zh-TW": ["週日", "週一", "週二", "週三", "週四", "週五", "週六"],
  "en": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
};
/** 周一到周日（1-7）的长名，周期事件「每周 N」用 */
var WEEKDAY_LONG_I18N = {
  "zh-CN": ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
  "zh-TW": ["週一", "週二", "週三", "週四", "週五", "週六", "週日"],
  "en": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
};
var LUNAR_MONTH_NAMES_TW = ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "臘"];
var ZODIAC_I18N = {
  "zh-TW": ["鼠", "牛", "虎", "兔", "龍", "蛇", "馬", "羊", "猴", "雞", "狗", "豬"],
  "en": ["Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"]
};
/** 星座名：键为 CONSTELLATIONS 里的简体名 */
var CONSTELLATION_I18N = {
  "zh-TW": { "摩羯座": "摩羯座", "水瓶座": "水瓶座", "双鱼座": "雙魚座", "白羊座": "牡羊座", "金牛座": "金牛座", "双子座": "雙子座", "巨蟹座": "巨蟹座", "狮子座": "獅子座", "处女座": "處女座", "天秤座": "天秤座", "天蝎座": "天蠍座", "射手座": "射手座" },
  "en": { "摩羯座": "Capricorn", "水瓶座": "Aquarius", "双鱼座": "Pisces", "白羊座": "Aries", "金牛座": "Taurus", "双子座": "Gemini", "巨蟹座": "Cancer", "狮子座": "Leo", "处女座": "Virgo", "天秤座": "Libra", "天蝎座": "Scorpio", "射手座": "Sagittarius" }
};
function localizeConstellation(name) {
  const table = CONSTELLATION_I18N[I18N_LANG];
  return (table && table[name]) || name;
}

/** 公历年月日显示：中文「2026年5月20日」，英文「May 20, 2026」 */
function fmtYMD(y, m, d) {
  if (I18N_LANG === "en") return `${MONTH_SHORT_EN[m - 1]} ${d}, ${y}`;
  return `${y}年${m}月${d}日`;
}
/** 下拉框里的公历月份 */
function monthOption(m) {
  return I18N_LANG === "en" ? MONTH_SHORT_EN[m - 1] : tr("opt.month", { m });
}

/**
 * 数据文件的「格式语言」：写进笔记的格式串随界面语言走，解析侧三种写法全收。
 *   zh-CN：# 重要日子 / ## 纪念日 ## 生日 ## 周期事件 / | 农历 | 农历闰 / 每月 每季度 每年 每周
 *   zh-TW：# 重要日子 / ## 紀念日 ## 生日 ## 週期事件 / | 農曆 | 農曆閏 / 每月 每季 每年 每週
 *   en：   # Important Days / ## Anniversaries ## Birthdays ## Recurring Events / | lunar | lunar leap / monthly quarterly yearly weekly
 * 用户自定义的数据文件路径不受影响；file 只是首次没有任何数据文件时的默认名
 */
var DATA_FORMATS = {
  "zh-CN": {
    h1: "重要日子",
    sections: { anniversary: "纪念日", birthday: "生日", cycle: "周期事件" },
    lunar: "农历",
    lunarLeap: "农历闰",
    cycle: { monthly: "每月", quarterly: "每季度", yearly: "每年", weekly: "每周" },
    file: "重要日子.md"
  },
  "zh-TW": {
    h1: "重要日子",
    sections: { anniversary: "紀念日", birthday: "生日", cycle: "週期事件" },
    lunar: "農曆",
    lunarLeap: "農曆閏",
    cycle: { monthly: "每月", quarterly: "每季", yearly: "每年", weekly: "每週" },
    file: "重要日子.md"
  },
  "en": {
    h1: "Important Days",
    sections: { anniversary: "Anniversaries", birthday: "Birthdays", cycle: "Recurring Events" },
    lunar: "lunar",
    lunarLeap: "lunar leap",
    cycle: { monthly: "monthly", quarterly: "quarterly", yearly: "yearly", weekly: "weekly" },
    file: "Important Days.md"
  }
};
function dataFormat(lang) { return DATA_FORMATS[lang] || DATA_FORMATS["zh-CN"]; }

/** 周期关键字（三语，英文不分大小写）→ 周期类型 */
var CYCLE_WORD_TYPE = {
  "每月": "monthly", "每季度": "quarterly", "每季": "quarterly", "每年": "yearly", "每周": "weekly", "每週": "weekly",
  "monthly": "monthly", "quarterly": "quarterly", "yearly": "yearly", "weekly": "weekly"
};
var CYCLE_FIELD_RE = /^(每月|每季度|每季|每年|每周|每週|monthly|quarterly|yearly|weekly)\s+(.+)$/i;

/** H1 标题文字是否为数据文件标志（三语都认；英文不分大小写） */
function isDataH1Text(text) {
  const t = String(text || "").trim();
  return t === "重要日子" || t.toLowerCase() === "important days";
}
/** 已 trim 的一行是否为数据文件 H1（`# 重要日子` / `# Important Days`，# 后空格可省） */
function isDataH1Line(trimmed) {
  const m = /^#(?!#)\s*(.*)$/.exec(trimmed);
  return !!m && isDataH1Text(m[1]);
}
/** 小节标题文字 → 条目类型（三语都认，按关键字包含判断）；不认识返回 null */
function sectionTypeOf(name) {
  if (name.includes("生日") || /birthday/i.test(name)) return "birthday";
  if (name.includes("纪念日") || name.includes("紀念日") || /anniversar/i.test(name)) return "anniversary";
  if (name.includes("周期") || name.includes("週期") || /recurring/i.test(name)) return "cycle";
  return null;
}
/** 第三列农历标记（三语都认）：非标记返回 null，否则 { leap } */
function parseLunarMarker(field) {
  const f = String(field || "").trim();
  if (f === "农历" || f === "農曆") return { leap: false };
  if (f === "农历闰" || f === "農曆閏") return { leap: true };
  const en = f.toLowerCase().replace(/\s+/g, " ");
  if (en === "lunar") return { leap: false };
  if (en === "lunar leap") return { leap: true };
  return null;
}

/**
 * 推断已有数据文件用的是哪种语言写法，往里写新内容时沿用，同一文件不混排。
 * 逐行看能区分语言的格式串（小节标题、农历标记、周期关键字、英文 H1）计票；
 * 只出现简繁同字的写法（# 重要日子、## 生日、每月、每年）时只能确定是中文：
 * 界面是繁体就按繁体，否则按简体。空文件（无任何线索）跟随界面语言
 */
function detectDaysFileLang(content) {
  const lines = String(content || "").replace(/^\uFEFF/, "").split("\n");
  const fenced = fenceMask(lines);
  const score = { "zh-CN": 0, "zh-TW": 0, "en": 0 };
  let chinese = false;
  for (let i = 0; i < lines.length; i++) {
    if (fenced[i]) continue;
    const t = lines[i].trim();
    if (t.startsWith("# ") || /^#[^#\s]/.test(t)) {
      if (isDataH1Line(t)) {
        if (/[a-z]/i.test(t)) score.en++;
        else chinese = true;
      }
      continue;
    }
    if (t.startsWith("## ")) {
      const name = t.slice(3);
      if (name.includes("纪念日") || name.includes("周期")) score["zh-CN"]++;
      else if (name.includes("紀念日") || name.includes("週期")) score["zh-TW"]++;
      else if (name.includes("生日")) chinese = true;
      else if (sectionTypeOf(name)) score.en++;
      continue;
    }
    if (!lines[i].startsWith("- ")) continue;
    const parts = t.slice(2).split("|").map((p) => p.trim());
    if (parts.length < 2) continue;
    const marker = parts[2] || "";
    if (marker.startsWith("农历")) score["zh-CN"]++;
    else if (marker.startsWith("農曆")) score["zh-TW"]++;
    else if (/^lunar/i.test(marker)) score.en++;
    const cm = parts[1].match(CYCLE_FIELD_RE);
    if (cm) {
      const w = cm[1];
      if (w === "每周" || w === "每季度") score["zh-CN"]++;
      else if (w === "每週" || w === "每季") score["zh-TW"]++;
      else if (/^[a-z]/i.test(w)) score.en++;
      else chinese = true;
    }
  }
  const best = Math.max(score["zh-CN"], score["zh-TW"], score.en);
  if (best === 0) {
    if (chinese) return I18N_LANG === "zh-TW" ? "zh-TW" : "zh-CN";
    return I18N_LANG;
  }
  if (score[I18N_LANG] === best) return I18N_LANG;
  return ["zh-CN", "zh-TW", "en"].find((l) => score[l] === best);
}

// ==================== 日期工具模块 ====================

/** 星期名称数组 */
var WEEKDAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

/**
 * 计算距离目标日期的天数
 * @param targetDate - 目标日期
 * @returns 正数表示未来，负数表示过去
 */
function getDaysUntil(targetDate) {
  // 使用 UTC 时间计算，规避 DST 导致的 23/25 小时差引起的 ±1 天问题
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(targetDate);
  const targetUtc = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const diffTime = targetUtc - todayUtc;
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 获取日期是星期几
 * @param date - 日期对象
 * @returns 星期名称
 */
function getWeekDay(date) {
  // 仅接受 Date 对象：字符串会按 UTC 解析，在西半球时区会导致星期偏移一天
  return (WEEKDAY_NAMES_I18N[I18N_LANG] || WEEKDAY_NAMES)[date.getDay()];
}

/**
 * 计算年龄
 * @param birthDate - 出生日期
 * @returns 年龄
 */
function getAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  // 2/29 出生在非闰年按 2/28 视为生日已到达（与 getNextBirthday 的 2/28 钳制、
  // 周年数口径一致），否则当天卡片显示「今日N岁」而年龄少算一岁
  const birthDayThisYear = (birth.getMonth() === 1 && birth.getDate() === 29 && !isLeapYear(today.getFullYear()))
    ? 28
    : birth.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDayThisYear)) {
    age--;
  }
  // 生日误填为未来日期时钳制为 0，避免显示「今日-4岁」
  return Math.max(0, age);
}

/**
 * 计算已过天数
 * @param startDate - 开始日期
 * @returns 已过天数
 */
function getDaysPassed(startDate) {
  // 使用 UTC 时间计算，规避 DST 导致的 ±1 天问题
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(startDate);
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const diffTime = todayUtc - startUtc;
  // 起始日期误填为未来时钳制为 0，避免显示「已出生 -3 天」
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}

/**
 * 计算已过月数
 * @param startDate - 开始日期
 * @returns 已过月数
 */
function getMonthsPassed(startDate) {
  const today = new Date();
  const start = new Date(startDate);
  let months = (today.getFullYear() - start.getFullYear()) * 12;
  months += today.getMonth() - start.getMonth();
  // 起始日超过本月实际天数时按「月末等价」处理：1/31 起的条目在 2/28（或 29）
  // 就已满月，不因 today.getDate() < 31 多算一个月
  const daysInTodayMonth = getDaysInMonth(today.getFullYear(), today.getMonth());
  const effectiveStartDay = Math.min(start.getDate(), daysInTodayMonth);
  if (today.getDate() < effectiveStartDay) {
    months--;
  }
  return Math.max(0, months);
}

/**
 * 计算周年数
 * @param startDate - 开始日期
 * @returns 周年数（如果是整数周年）
 */
function getAnniversaryYears(startDate) {
  const today = new Date();
  const start = new Date(startDate);
  const years = today.getFullYear() - start.getFullYear();
  const monthDiff = today.getMonth() - start.getMonth();
  const dayDiff = today.getDate() - start.getDate();
  
  // 判断是否是整数周年（月份和日期相同）
  if (monthDiff === 0 && dayDiff === 0) {
    return years;
  }
  // 2/29 起始日的特例：非闰年 2/28 视为周年到达（与 createValidDate 月末钳制、
  // 倒计时「今」同口径），否则同一周年数会连续两年显示「今日N周年」
  if (start.getMonth() === 1 && start.getDate() === 29 &&
      today.getMonth() === 1 && today.getDate() === 28 &&
      !isLeapYear(today.getFullYear())) {
    return years;
  }
  // 判断是否已经过了今年的纪念日
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    return years - 1;
  }
  return years;
}

/**
 * 判断是否是闰年
 * @param year - 年份
 * @returns 是否是闰年
 */
function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * 判断是否是闰年2月29日生日
 * @param month - 月份（1-12）
 * @param day - 日期
 * @returns 是否是闰年2月29日
 */
function isLeapDayBirthday(month, day) {
  return month === 2 && day === 29;
}

/**
 * 格式化日期为 YYYY-MM-DD
 * @param date - 日期对象
 * @returns 格式化的日期字符串
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 获取月份的最大天数
 * @param year - 年份
 * @param month - 月份（0-11）
 * @returns 该月的天数
 */
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * 创建有效的日期对象（自动处理超出范围的情况）
 * @param year - 年份
 * @param month - 月份（0-11）
 * @param day - 日期
 * @returns 有效的日期对象
 */
function createValidDate(year, month, day) {
  const maxDay = getDaysInMonth(year, month);
  const validDay = Math.min(day, maxDay);
  return new Date(year, month, validDay);
}

/**
 * 计算周期事件的下次日期
 * @param cycleType - 周期类型：monthly/quarterly/yearly/weekly
 * @param cycleValue - 周期值
 * @returns 下次日期
 */
function getNextCycleDate(cycleType, cycleValue) {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 重置时间为当天开始
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDayOfWeek = today.getDay(); // 0-6, 0=周日
  
  let nextDate;
  
  switch (cycleType) {
    case "monthly": {
      // 每月固定日期
      const day = parseInt(cycleValue);
      nextDate = createValidDate(currentYear, currentMonth, day);
      
      // 若在今天之前才算已过（保留当天，倒计时显示「今」）
      if (nextDate < today) {
        nextDate = createValidDate(currentYear, currentMonth + 1, day);
      }
      break;
    }
    
    case "quarterly": {
      // 每季度的第N个月的第M天
      // 格式：M-D (如 3-15 表示每季度第3个月的15号)
      const parts = cycleValue.split("-");
      const quarterMonth = parseInt(parts[0]); // 1-3
      const day = parseInt(parts[1]);
      
      // 计算当前季度的月份
      const currentQuarter = Math.floor(currentMonth / 3); // 0-3
      const monthInQuarter = (quarterMonth - 1); // 0-2
      const targetMonth = currentQuarter * 3 + monthInQuarter;
      
      nextDate = createValidDate(currentYear, targetMonth, day);
      
      // 若在今天之前才算已过（保留当天，倒计时显示「今」）
      if (nextDate < today) {
        const nextQuarter = currentQuarter + 1;
        const nextTargetMonth = nextQuarter * 3 + monthInQuarter;
        nextDate = createValidDate(currentYear, nextTargetMonth, day);
      }
      break;
    }
    
    case "yearly": {
      // 每年固定日期
      // 格式：MM-DD
      const parts = cycleValue.split("-");
      const month = parseInt(parts[0]) - 1; // 0-11
      const day = parseInt(parts[1]);
      
      nextDate = createValidDate(currentYear, month, day);
      
      // 若在今天之前才算已过（保留当天，倒计时显示「今」）
      if (nextDate < today) {
        nextDate = createValidDate(currentYear + 1, month, day);
      }
      break;
    }
    
    case "weekly": {
      // 每周固定日期
      // 格式：1-7 (周一到周日)
      const targetDayOfWeek = parseInt(cycleValue); // 1-7
      const jsDayOfWeek = targetDayOfWeek === 7 ? 0 : targetDayOfWeek; // 转换为JS格式 0-6

      const daysUntilTarget = (jsDayOfWeek - currentDayOfWeek + 7) % 7;
      // daysUntilTarget 为 0 表示今天就是事件日，保留当天（倒计时显示「今」）
      const daysToAdd = daysUntilTarget;

      nextDate = new Date(today);
      nextDate.setDate(today.getDate() + daysToAdd);
      break;
    }

    default: {
      // 未知周期类型，回退到今天，避免返回 undefined 导致后续渲染崩溃
      console.warn("未知周期类型:", cycleType);
      nextDate = new Date(today);
      break;
    }
  }

  return nextDate;
}

/**
 * 获取周期类型的显示文本
 * @param cycleType - 周期类型
 * @returns 显示文本
 */
function getCycleTypeText(cycleType) {
  const texts = {
    monthly: "每月",
    quarterly: "每季度",
    yearly: "每年",
    weekly: "每周"
  };
  return texts[cycleType] ? tr("cycle." + cycleType) : "";
}

/**
 * 获取周期值的显示文本
 * @param cycleType - 周期类型
 * @param cycleValue - 周期值
 * @returns 显示文本
 */
function getCycleValueText(cycleType, cycleValue) {
  switch (cycleType) {
    case "monthly":
      return tr("cycle.val.monthly", { d: cycleValue });
    case "quarterly": {
      const parts = cycleValue.split("-");
      return tr("cycle.val.quarterly", { m: parts[0], d: parts[1] });
    }
    case "yearly": {
      const parts = cycleValue.split("-");
      if (I18N_LANG === "en") return `${MONTH_SHORT_EN[parseInt(parts[0]) - 1] || parts[0]} ${parseInt(parts[1])}`;
      return `${parts[0]}月${parts[1]}日`;
    }
    case "weekly": {
      const weekDays = WEEKDAY_LONG_I18N[I18N_LANG] || WEEKDAY_LONG_I18N["zh-CN"];
      return weekDays[parseInt(cycleValue) - 1] || "";
    }
    default:
      return cycleValue;
  }
}

// ==================== 农历转换模块 ====================

/** 农历月份名称 */
var LUNAR_MONTH_NAMES = [
  "正", "二", "三", "四", "五", "六",
  "七", "八", "九", "十", "冬", "腊"
];

/** 农历日期名称 */
var LUNAR_DAY_NAMES = [
  "初一", "初二", "初三", "初四", "初五",
  "初六", "初七", "初八", "初九", "初十",
  "十一", "十二", "十三", "十四", "十五",
  "十六", "十七", "十八", "十九", "二十",
  "廿一", "廿二", "廿三", "廿四", "廿五",
  "廿六", "廿七", "廿八", "廿九", "三十"
];



/** 生肖 */
var ZODIAC_ANIMALS = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];

/** 星座名称及日期范围 */
var CONSTELLATIONS = [
  { name: "摩羯座", start: [1, 1], end: [1, 19] },
  { name: "水瓶座", start: [1, 20], end: [2, 18] },
  { name: "双鱼座", start: [2, 19], end: [3, 20] },
  { name: "白羊座", start: [3, 21], end: [4, 19] },
  { name: "金牛座", start: [4, 20], end: [5, 20] },
  { name: "双子座", start: [5, 21], end: [6, 21] },
  { name: "巨蟹座", start: [6, 22], end: [7, 22] },
  { name: "狮子座", start: [7, 23], end: [8, 22] },
  { name: "处女座", start: [8, 23], end: [9, 22] },
  { name: "天秤座", start: [9, 23], end: [10, 23] },
  { name: "天蝎座", start: [10, 24], end: [11, 22] },
  { name: "射手座", start: [11, 23], end: [12, 21] },
  { name: "摩羯座", start: [12, 22], end: [12, 31] }
];

/** 农历数据（1900-2100年） */
var LUNAR_INFO = [
  48424,29984,59984,45733,25776,43440,109156,22176,46480,47778,29984,55894,45648,42160,107701,10960,
  22192,23378,55952,125223,59680,53840,53973,42336,11104,109908,27968,60048,62626,59680,27238,21168,
  42352,103781,46496,27968,95763,29840,110903,43312,21168,86454,43728,22176,121428,47680,46224,54450,
  43344,43735,21344,43728,109733,23328,55888,125475,54432,22872,43376,21856,22358,44368,27936,30036,
  59984,25760,25843,43440,44455,22176,46736,47909,46368,45648,45748,42160,43704,10960,22224,88726,
  55952,55584,59732,53840,58586,42336,11104,12118,27984,60048,62757,59680,53856,21219,42352,44392,
  13728,27984,46741,29840,26928,43444,21168,42416,43746,22176,56663,47680,46224,54581,43344,21200,
  21972,43856,47785,23840,55888,125094,54432,51536,43492,21856,43856,44450,27936,30294,29264,25776,
  25973,51888,21920,22243,46736,62763,46368,45648,118966,42160,19120,11189,23248,46752,55970,55584,
  59991,53840,42320,107733,19296,23376,93475,60560,63784,59680,53856,86374,42352,19808,79444,30032,
  29840,29875,26928,43703,21168,42416,43941,22176,46672,47780,46240,55640,43344,21200,22230,43856,
  23200,23892,55888,54432,58579,51552,52455,21856,43856,109861,27936,59984,29348,26800,27000,19120,
  21936,87398,46752,29984,47444,46160,43184,42226,19120
];

/**
 * 获取农历年的总天数
 */
function getLunarYearDays(year) {
  let sum = 348;
  const info = LUNAR_INFO[year - 1900];
  for (let i = 32768; i > 8; i >>= 1) {
    sum += info & i ? 1 : 0;
  }
  return sum + getLeapDays(year);
}

/**
 * 获取闰月天数
 */
function getLeapDays(year) {
  if (getLeapMonth(year)) {
    return LUNAR_INFO[year - 1900] & 65536 ? 30 : 29;
  }
  return 0;
}

/**
 * 获取闰月月份
 */
function getLeapMonth(year) {
  return LUNAR_INFO[year - 1900] & 15;
}

/**
 * 获取农历月天数
 */
function getLunarMonthDays(year, month) {
  return LUNAR_INFO[year - 1900] & (1 << (month + 3)) ? 30 : 29;
}

/**
 * 公历转农历
 * @param date - 公历日期
 * @returns 农历日期对象，超出范围返回 null
 */
function solarToLunar(date) {
  let year = date.getFullYear();
  
  // 上界放宽到 2101：农历 2100 年的冬月/腊月落在公历 2101 年初，
  // 与 lunarToSolar（允许农历年 2100）口径对齐；超出返回 null
  if (year < 1900 || year > 2101) {
    return null;
  }
  
  // 用 UTC 时间计算偏移天数，避免 DST 时区下本地时间与基准点相差非整天导致 offset 偏差 1 天
  // （与 monthly-tasks 的 solarToLunar 保持一致）
  const dateUtcMs = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const baseUtcMs = Date.UTC(1900, 0, 31);
  let offset = Math.floor((dateUtcMs - baseUtcMs) / 86400000);
  // 1900-01-31 之前 offset 为负，农历数据不可用，返回 null
  if (offset < 0) {
    return null;
  }
  let lunarYear = 1900;
  let daysInYear = getLunarYearDays(lunarYear);
  
  while (offset >= daysInYear) {
    offset -= daysInYear;
    lunarYear++;
    daysInYear = getLunarYearDays(lunarYear);
  }
  // 年份游标越过 2100 说明日期已超出数据表（2101 年内的越界部分），返回 null
  // 而非继续按 LUNAR_INFO 越界值（undefined）算出垃圾日期
  if (lunarYear > 2100) {
    return null;
  }
  
  const leapMonth = getLeapMonth(lunarYear);
  let isLeap = false;
  let lunarMonth = 1;
  
  for (let i = 0; i < 13; i++) {
    let daysInMonth;
    if (isLeap) {
      daysInMonth = getLeapDays(lunarYear);
    } else {
      daysInMonth = getLunarMonthDays(lunarYear, lunarMonth);
    }
    
    if (offset < daysInMonth) {
      break;
    }
    
    offset -= daysInMonth;
    
    if (!isLeap && leapMonth === lunarMonth) {
      isLeap = true;
    } else {
      isLeap = false;
      lunarMonth++;
    }
  }
  
  const lunarDay = offset + 1;
  const zhiIndex = (lunarYear - 4) % 12;
  
  return {
    year: lunarYear,
    month: lunarMonth,
    day: lunarDay,
    isLeap,
    zodiac: ZODIAC_ANIMALS[zhiIndex]
  };
}

/**
 * 农历转公历
 * @param year - 农历年
 * @param month - 农历月
 * @param day - 农历日
 * @param isLeap - 是否闰月
 * @returns 公历日期对象
 */
function lunarToSolar(year, month, day, isLeap = false) {
  if (year < 1900 || year > 2100) {
    return null;
  }
  // 月份/日期范围校验：非法输入直接返回 null（调用方有 null 兜底），
  // 避免此前静默环绕（如 (2024,13,5) 环绕成 2025-02-02）算出错误日期
  if (!(month >= 1 && month <= 12) || !(day >= 1 && day <= 30)) {
    console.warn("农历月份/日期超出范围:", year, month, day);
    return null;
  }
  
  // 计算从1900年正月初一到目标日期的天数
  let offset = 0;
  
  // 累加年份天数
  for (let y = 1900; y < year; y++) {
    offset += getLunarYearDays(y);
  }
  
  // 累加月份天数
  const leapMonth = getLeapMonth(year);
  for (let m = 1; m < month; m++) {
    offset += getLunarMonthDays(year, m);
    if (m === leapMonth) {
      offset += getLeapDays(year);
    }
  }
  
  // 如果是闰月，需要加上正常月的天数
  if (isLeap && leapMonth === month) {
    offset += getLunarMonthDays(year, month);
  }
  
  const maxDay = isLeap && leapMonth === month ? getLeapDays(year) : getLunarMonthDays(year, month);
  if (day > maxDay) day = maxDay;
  
  // 加上日期天数
  offset += day - 1;
  
  // 从1900年1月31日（农历1900年正月初一）开始计算
  const baseDate = new Date(1900, 0, 31);
  baseDate.setDate(baseDate.getDate() + offset);
  
  return baseDate;
}

/**
 * 获取农历日期文本
 * @param lunarDate - 农历日期对象
 * @returns 农历日期文本
 */
function getLunarDateText(lunarDate) {
  if (!lunarDate) return "";
  if (I18N_LANG === "en") return `${lunarDate.isLeap ? "leap " : ""}${lunarDate.month}/${lunarDate.day}`;
  const tw = I18N_LANG === "zh-TW";
  const monthName = (tw ? LUNAR_MONTH_NAMES_TW : LUNAR_MONTH_NAMES)[lunarDate.month - 1];
  const monthText = lunarDate.isLeap ? `${tw ? "閏" : "闰"}${monthName}月` : `${monthName}月`;
  const dayText = LUNAR_DAY_NAMES[lunarDate.day - 1];
  return `${monthText}${dayText}`;
}

/**
 * 获取属相
 * @param year - 年份
 * @returns 属相名称
 */
function getZodiac(year) {
  const index = (year - 4) % 12;
  return (ZODIAC_I18N[I18N_LANG] || ZODIAC_ANIMALS)[index >= 0 ? index : index + 12];
}

/**
 * 获取星座
 * @param month - 月份（1-12）
 * @param day - 日期
 * @returns 星座名称
 */
function getConstellation(month, day) {
  for (const c of CONSTELLATIONS) {
    const [startMonth, startDay] = c.start;
    const [endMonth, endDay] = c.end;
    
    if (startMonth === endMonth) {
      if (month === startMonth && day >= startDay && day <= endDay) return c.name;
    } else {
      if ((month === startMonth && day >= startDay) || (month === endMonth && day <= endDay)) return c.name;
    }
  }
  return "摩羯座";
}

// ==================== 日子数据解析模块 ====================

// 首次遇到无法识别的数据行时提示一次（数据文件是用户手编的 Markdown，
// 行格式写错时卡片会静默消失，普通用户不会去看控制台）
let invalidDayLineNoticeShown = false;
function warnInvalidDayLine(reason, line) {
  console.warn(`重要日子：跳过${reason}的行:`, line);
  if (!invalidDayLineNoticeShown) {
    invalidDayLineNoticeShown = true;
    new import_obsidian2.Notice(tr("notice.invalidLine"));
  }
}

/**
 * 校验手写周期值的合法范围
 * monthly: 1-31；quarterly: M(1-3)-D(1-31)；yearly: 月 1-12 且日 1-31；weekly: 1-7
 * （日超出当月天数的部分由 getNextCycleDate 的 createValidDate 钳制为当月最后一天，
 *  与弹窗说明「超出当月天数自动调整」及 monthly/quarterly 的处理一致）
 * @param cycleType - 周期类型
 * @param value - 周期值
 * @returns 是否合法
 */
function isValidCycleValue(cycleType, value) {
  const num = (s) => /^\d+$/.test(s) ? parseInt(s) : NaN;
  switch (cycleType) {
    case "monthly":
      return num(value) >= 1 && num(value) <= 31;
    case "quarterly": {
      const parts = value.split("-");
      return parts.length === 2 && num(parts[0]) >= 1 && num(parts[0]) <= 3 && num(parts[1]) >= 1 && num(parts[1]) <= 31;
    }
    case "yearly": {
      const parts = value.split("-");
      if (parts.length !== 2) return false;
      const m = num(parts[0]);
      const d = num(parts[1]);
      // 日校验到 31 为止（含 2-29 闰年生日式的合法组合），超月天数由钳制兜底；
      // 此前按 2001 平年天数拒绝 2-29，导致「弹窗可选 → 校验丢弃 → 提示成功但条目消失」
      return m >= 1 && m <= 12 && d >= 1 && d <= 31;
    }
    case "weekly":
      return num(value) >= 1 && num(value) <= 7;
    default:
      return false;
  }
}

/**
 * 代码围栏遮罩：返回与 lines 等长的布尔数组，true 表示该行在围栏内（含开闭行）。
 * 支持 ``` 与 ~~~、≥3 字符；闭围栏需同字符且长度不小于开围栏
 * （``` 无法关闭 ~~~ 或 ````，反之亦然）。
 * 反引号开栏行的其余部分不能再出现反引号（CommonMark 规则）：`` ```代码``` 说明 `` 这种
 * 行首的行内代码不是围栏，误当开栏会把它后面直到文件尾的条目全部藏掉。
 */
function fenceMask(lines) {
  const mask = new Array(lines.length).fill(false);
  let fence = null;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (fence) {
      mask[i] = true;
      const close = new RegExp(`^${fence.char}{${fence.length},}$`);
      if (close.test(t)) fence = null;
    } else {
      const open = t.match(/^(`{3,}|~{3,})(.*)$/);
      if (open && !(open[1][0] === "`" && open[2].includes("`"))) {
        fence = { char: open[1][0], length: open[1].length };
        mask[i] = true;
      }
    }
  }
  return mask;
}

/**
 * 解析日子数据
 * 每条记录附带 srcLine/srcText/srcType（在文件中的行位置与原始行文本）和 _key（行身份），
 * 供 saveDays 做原位行级合并与写冲突检测，避免整体重写覆盖文件中的其他内容
 * @param content - MD 文件内容
 * @returns 日子数组
 */
function parseDays(content) {
  const days = [];
  const lines = content.split("\n");
  // 未进入已知小节（## 生日/纪念日/周期…）前不解析任何列表行；
  // 未识别小节（如用户自建的 ## 待办事项）不继承上一个类型，其中的行原样保留、不参与合并
  let currentType = null;
  // 代码块内的标题/列表行不参与解析（``` 与 ~~~、含 4+ 字符围栏）
  const fenced = fenceMask(lines);

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const trimmed = line.trim();

    if (fenced[lineIdx]) continue;

    // H1（含文件标题「# 重要日子」）重置类型：其后未进入 ## 小节前的行不解析
    if (trimmed.startsWith("# ")) {
      currentType = null;
      continue;
    }

    // 检测 section 标题：先重置、再按关键字赋值，未知小节解析结果为 null
    if (trimmed.startsWith("## ")) {
      const sectionName = trimmed.slice(3).trim();
      // 三语都认：生日/Birthdays、纪念日/紀念日/Anniversaries、周期/週期/Recurring
      currentType = sectionTypeOf(sectionName);
      continue;
    }

    // 解析列表项：仅认行首无缩进的 - 行（缩进子列表、引用块里的列表不当数据）
    if (!line.startsWith("- ")) continue;
    if (!currentType) continue;
    const item = trimmed.slice(2);
    const parts = item.split("|").map(p => p.trim());

    if (parts.length >= 2) {
      const name = parts[0];
      const dateStr = parts[1];
      const thirdField = parts[2] || "";
      // 第三列只接受插件自身写入的农历标记（农历/農曆/lunar、农历闰/農曆閏/lunar leap）；第四列及之后（备注等）视为用户内容：
      // 这类行判为不识别行，原样保留不参与合并，避免备注被静默删除或被误读为农历标记
      const lunarMarker = parseLunarMarker(thirdField);
      if (parts.length > 3 || (parts.length === 3 && !lunarMarker)) {
        continue;
      }
      const isLunar = !!lunarMarker;
      const isLeapMonth = !!(lunarMarker && lunarMarker.leap);

        // 解析周期事件
        if (currentType === "cycle") {
          const cycleMatch = dateStr.match(CYCLE_FIELD_RE);
          if (!cycleMatch) {
            // 周期小节里的非「每X」行（如误写进来的生日）：与其他非法行同口径提示，
            // 否则条目被静默跳过，界面上凭空消失且无任何提示
            warnInvalidDayLine("无法识别周期写法", line);
            continue;
          }
          if (cycleMatch) {
            const cycleTypeText = cycleMatch[1];
            const cycleValue = cycleMatch[2].trim();

            const cycleType = CYCLE_WORD_TYPE[cycleTypeText.toLowerCase()];

            // 周期值范围校验：非法行跳过（与非法日期行同策略），
            // 避免手写「每周 8」「每月 -5」等值产生 "undefined" 文案或无意义日期
            if (!cycleType || !isValidCycleValue(cycleType, cycleValue)) {
              warnInvalidDayLine("非法/未知周期", line);
              continue;
            }

            days.push({
              id: `${name}-${cycleType}-${cycleValue}`,
              name,
              type: "cycle",
              cycleType,
              cycleValue,
              srcLine: lineIdx,
              srcText: trimmed,
              srcType: "cycle"
            });
          }
        } else {
          // 解析日期
          // 年份前不能紧贴数字（防「12020-01-05」被截成 2020 年）。这里用 (?:^|\D) 吃掉前一个
          // 非数字字符，不用后行断言 (?<!\d)：iOS 16.4 以下的内核不支持后行断言（官方审核工具
          // 的 regex-lookbehind 规则按 error 报），不支持的正则字面量是语法错误，整个 main.js
          // 都加载不了。被吃掉的那个字符在下面算备注前缀时补回去
          const dateMatch = dateStr.match(/(?:^|\D)(\d{4})-(\d{1,2})-(\d{1,2})(?!\d)/);
          if (dateMatch) {
            const year = parseInt(dateMatch[1]);
            const month = parseInt(dateMatch[2]);
            const day = parseInt(dateMatch[3]);

            // 校验日期合法性（年份限农历表覆盖区间 1900-2100，防「12020-01-05」
            // 这类笔误被截成 2020 年；月份 1-12，日 1-31，且 new Date 不滚动到下月）
            if (year < 1900 || year > 2100) {
              warnInvalidDayLine("年份超出支持范围（1900-2100）", line);
              continue;
            }
            if (month < 1 || month > 12 || day < 1 || day > 31) {
              warnInvalidDayLine("非法日期", line);
              continue;
            }
            const probe = new Date(year, month - 1, day);
            if (probe.getMonth() !== month - 1 || probe.getDate() !== day) {
              warnInvalidDayLine("滚动日期（如 2月30日）", line);
              continue;
            }

            // UI 仅允许生日使用农历；纪念日强制按公历处理，避免手动编辑「农历」标记后渲染错乱
            const effectiveIsLunar = currentType === "anniversary" ? false : isLunar;
            const effectiveIsLeapMonth = currentType === "anniversary" ? false : (isLunar && isLeapMonth);

            const dayObj = {
              id: `${name}-${dateStr}`,
              name,
              year,
              month,
              day,
              type: currentType,
              isLunar: effectiveIsLunar,
              isLeapMonth: effectiveIsLeapMonth,
              srcLine: lineIdx,
              srcText: trimmed,
              srcType: currentType
            };
            // 日期字段里日期前后的附加文本（如 `约1980-01-01`、`1980-01-01 备注`）
            // 是用户手写内容：记下来在重写时拼回，否则编辑一次该行尾部备注就被静默删掉
            const dateStart = dateMatch.index + (/^\D/.test(dateMatch[0]) ? 1 : 0);
            const datePrefix = dateStr.slice(0, dateStart);
            const dateSuffix = dateStr.slice(dateMatch.index + dateMatch[0].length);
            if (datePrefix) dayObj._datePrefix = datePrefix;
            if (dateSuffix) dayObj._dateSuffix = dateSuffix;
            days.push(dayObj);
          } else {
            warnInvalidDayLine("无法识别日期", line);
          }
        }
      }
  }

  // 手写文件可能出现完全相同的重复行：为重复 id 追加序号后缀，
  // 避免编辑/删除按 id+type 匹配时一次误伤多条；_key 在去重后生成，作为保存合并的行身份标识
  const seen = /* @__PURE__ */ new Map();
  for (const d of days) {
    const n = seen.get(d.id) || 0;
    seen.set(d.id, n + 1);
    if (n > 0) {
      d.id = `${d.id}#${n + 1}`;
    }
    d._key = `${d.id}|${d.type}`;
  }

  return days;
}

/**
 * 生成日子数据文件内容（新建文件用；格式串按 lang，默认跟随界面语言）
 * @param days - 日子数组
 * @param lang - 写法语言 zh-CN / zh-TW / en
 * @returns MD 文件内容
 */
function generateDaysContent(days, lang = I18N_LANG) {
  const fmt = dataFormat(lang);
  const birthdays = days.filter(d => d.type === "birthday");
  const anniversaries = days.filter(d => d.type === "anniversary");
  const cycles = days.filter(d => d.type === "cycle");
  
  let content = `# ${fmt.h1}\n\n`;
  
  const sections = [
    ["anniversary", anniversaries],
    ["birthday", birthdays],
    ["cycle", cycles]
  ];
  for (const [type, list] of sections) {
    const lines = [];
    for (const day of list) {
      if (type === "cycle" && !fmt.cycle[day.cycleType]) {
        // 未知 cycleType 跳过，避免写入 undefined 导致后续解析丢失
        console.warn("跳过未知周期类型:", day);
        continue;
      }
      lines.push(formatDayLine(day, lang));
    }
    if (list.length === 0) continue;
    content += `## ${fmt.sections[type]}\n`;
    for (const line of lines) content += `${line}\n`;
    content += "\n";
  }

  return content;
}

/**
 * 将单条日子格式化为一行数据文本（与 generateDaysContent 的行格式一致）
 * @param day - 日子对象
 * @param lang - 写法语言（往已有文件写时传该文件的语言，见 detectDaysFileLang）
 * @returns 列表行文本（不含换行符）
 */
function formatDayLine(day, lang = I18N_LANG) {
  const fmt = dataFormat(lang);
  if (day.type === "cycle") {
    const cycleText = fmt.cycle[day.cycleType] || "";
    // 类型由生日/纪念日改成周期事件时，原日期字段上的手写备注（_datePrefix/_dateSuffix）
    // 无处可放：并到名称字段保住文字，比静默丢掉强（周期值只认数字形态，不能挂备注）。
    // 一律接在名称后面、空格隔开：日期前的备注（如「约」）直接顶在名称前会读成「约妈妈」
    const cycleName = [day.name, (day._datePrefix || "").trim(), (day._dateSuffix || "").trim()]
      .filter(Boolean).join(" ");
    return `- ${cycleName} | ${cycleText} ${day.cycleValue}`;
  }
  const dateStr = `${day.year}-${String(day.month).padStart(2, "0")}-${String(day.day).padStart(2, "0")}`;
  // 手写的日期前后文（_datePrefix/_dateSuffix，见 parseDays）拼回，避免编辑时丢用户备注
  let line = `- ${day.name} | ${day._datePrefix || ""}${dateStr}${day._dateSuffix || ""}`;
  if (day.isLunar) {
    line += ` | ${day.type === "birthday" && day.isLeapMonth ? fmt.lunarLeap : fmt.lunar}`;
  }
  return line;
}

/**
 * 把当前日子列表原位合并进文件内容：只增删改解析时识别出的列表行，
 * frontmatter、其他小节、用户自建内容一律原样保留。
 *
 * 匹配机制：parseDays 为每条记录记录 srcLine（行号）/srcText（原始行文本）/srcType/_key；
 * 编辑弹窗以 {...old, ...} 展开替换条目，会保留这些字段（_key 保持旧值，id 可变）。
 * - srcLine 存在 → 已有条目：校验 srcText 与当前文件该行一致后原位替换；
 *   类型变更（如纪念日改成生日）则删旧行 + 插入到新类型小节；
 * - srcLine 不存在 → 新增条目：插入到对应小节最后一条列表行之后，小节不存在则在文末新建；
 * - 基线(baseDays)中有 _key 而当前列表无人认领 → 已删除：移除该行。
 * 任何一行的 srcText 与文件当前内容对不上（文件已被外部改动）→ 抛错拒绝整个写入。
 *
 * @param originalContent - 文件当前内容（调用方需现场读取，不能用缓存）
 * @param currentDays - 当前日子列表（view.days）
 * @param baseDays - 上次加载时的基线列表（view._baseDays）
 * @returns 合并后的完整文件内容
 */
function applyDaysUpdate(originalContent, currentDays, baseDays) {
  const lines = originalContent.split("\n");
  // CRLF 数据文件保持行尾一致：生成的行跟随文件主行尾补 \r，避免编辑后混入裸 \n
  const usesCRLF = originalContent.includes("\r\n");
  // 新写入的行、小节、H1 沿用文件自身的语言写法（同一文件不混排）；空文件跟随界面语言
  const fileLang = detectDaysFileLang(originalContent);
  const fileFmt = dataFormat(fileLang);
  const dayLineText = (d) => formatDayLine(d, fileLang) + (usesCRLF ? "\r" : "");
  const SECTION_LABELS = fileFmt.sections;
  // 代码块行遮罩（与 parseDays 的围栏识别同口径）：块内的 ## / # 行不算小节标题，
  // 新条目不能锚进代码块——否则保存后重新解析时该行被跳过，条目凭空消失
  const fencedLine = fenceMask(lines);

  // 每行的动作：null=原样保留；{day}=替换为该条目；"delete"=删除该行
  const action = new Array(lines.length).fill(null);
  const claimedKeys = /* @__PURE__ */ new Set();
  const insertions = []; // 新增/换小节的条目
  const conflicts = [];

  // 条目业务字段签名：与基线中同 _key 条目一致 → 未被编辑 → 保留原始行字节。
  // 不与 formatDayLine 的输出比对：月日不补零、管道两侧无空格等非规范写法在未编辑时不再被改写
  const daySignature = (d) => d.type === "cycle"
    ? `cycle|${d.name}|${d.cycleType}|${d.cycleValue}`
    : `day|${d.name}|${d.type}|${d.year}|${d.month}|${d.day}|${!!d.isLunar}|${!!d.isLeapMonth}`;
  const baseByKey = /* @__PURE__ */ new Map();
  for (const b of baseDays || []) {
    if (typeof b.srcLine === "number" && b._key) baseByKey.set(b._key, b);
  }

  for (const d of currentDays) {
    if (typeof d.srcLine === "number") {
      claimedKeys.add(d._key);
    } else {
      insertions.push(d);
    }
  }

  const markLine = (srcLine, srcText, act) => {
    if (srcLine < 0 || srcLine >= lines.length || lines[srcLine].trim() !== srcText) {
      conflicts.push(srcText || "(未知行)");
      return false;
    }
    action[srcLine] = act;
    return true;
  };

  // 删除：基线中存在但当前列表已无人认领的条目
  for (const b of baseDays || []) {
    if (typeof b.srcLine === "number" && b._key && !claimedKeys.has(b._key)) {
      markLine(b.srcLine, b.srcText, "delete");
    }
  }

  // 替换 / 类型变更
  for (const d of currentDays) {
    if (typeof d.srcLine !== "number") continue;
    if (d.srcType !== d.type) {
      // 类型变更：旧行删除，条目按新类型插入到对应小节
      if (markLine(d.srcLine, d.srcText, "delete")) {
        insertions.push(d);
      }
    } else {
      // 仅当业务字段相对基线发生变化时才改写该行；
      // 未编辑的条目（含非规范写法、CRLF 行）保留原始行字节
      const base = baseByKey.get(d._key);
      if (base && daySignature(d) === daySignature(base)) continue;
      markLine(d.srcLine, d.srcText, { day: d });
    }
  }

  if (conflicts.length > 0) {
    throw new Error(tr("error.conflict"));
  }

  // 已在文件中的行不重复插入：写队列里后到的快照可能仍带着先完成的写入已落盘的
  // 条目（无 srcLine → 这里会被当新增），按目标行文本判重跳过。UI 侧弹窗本就按
  // id+type 查重，被跳过的一定是「已落盘的同一条」，不会误伤用户想要的副本；
  // 判重排除已标记删除的行——删除行上的位置可以被同名新行接替
  const remainingLineTexts = new Set();
  for (let i = 0; i < lines.length; i++) {
    if (action[i] === "delete") continue;
    const t = lines[i].trim();
    if (t.startsWith("- ")) remainingLineTexts.add(t);
  }
  const dedupedInsertions = insertions.filter((d) => !remainingLineTexts.has(formatDayLine(d, fileLang).trim()));

  // 计算每个小节的插入位置：小节标题行之后最后一条列表行的下一行；
  // 小节不存在时标记为追加新小节
  const insertAfter = /* @__PURE__ */ new Map(); // 行号 -> 待插入行文本数组
  const pendingByType = /* @__PURE__ */ new Map();
  for (const d of dedupedInsertions) {
    if (!pendingByType.has(d.type)) pendingByType.set(d.type, []);
    pendingByType.get(d.type).push(dayLineText(d));
  }

  const sectionOf = (text) => {
    const t = text.trim();
    if (!t.startsWith("## ")) return null;
    return sectionTypeOf(t.slice(3));
  };

  for (const [type, entries] of pendingByType) {
    let headerIdx = -1;
    let lastEntryIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (fencedLine[i]) continue;
      if (sectionOf(lines[i]) === type) {
        headerIdx = i;
        lastEntryIdx = i;
        for (let j = i + 1; j < lines.length; j++) {
          if (fencedLine[j]) continue;
          const t = lines[j].trim();
          // 小节边界与 parseDays 同口径：H1 重置类型、## 进入下个小节，两处都要停，
          // 否则新条目可能锚进无关 H1 下的 - 行之后，保存后在该处不再被解析
          if (t.startsWith("# ") || t.startsWith("## ")) break;
          if (t.startsWith("- ")) lastEntryIdx = j;
        }
        break;
      }
    }
    if (headerIdx === -1) continue; // 小节不存在，走文末追加
    const at = lastEntryIdx > headerIdx ? lastEntryIdx : headerIdx;
    insertAfter.set(at, (insertAfter.get(at) || []).concat(entries));
    pendingByType.delete(type);
  }

  // 重建内容：跳过删除行、替换目标行、在标记行后插入新条目
  // （插入块在 delete 分支之后也执行：删除行上锚定的插入仍需落位）
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const a = action[i];
    if (a !== "delete") {
      out.push(a ? dayLineText(a.day) : lines[i]);
    }
    const ins = insertAfter.get(i);
    if (ins) out.push(...ins);
  }
  let result = out.join("\n");
  // 原文件为空或仅空白（且未保留任何内容）：从空串开始，避免新小节前留下无意义空行
  if (/^\s*$/.test(result)) result = "";

  // 剩余类型的小节在文件中不存在：追加到文末
  // 生成行全部跟随文件主行尾：条目行由 dayLineText 自带 \r（split("\n") 风格），
  // 因此条目后接裸 \n 恰好拼出 CRLF；标题行与空行用 eol 承担
  const eol = usesCRLF ? "\r\n" : "\n";
  for (const [type, entries] of pendingByType) {
    if (result.length > 0) {
      if (!result.endsWith("\n")) result += "\n";
      result += eol;
    }
    result += `## ${SECTION_LABELS[type] || type}${eol}${entries.join("\n")}\n`;
  }

  // 文件缺「# 重要日子」/「# Important Days」H1（如对空文件新建小节曾遗漏）：补在最前，
  // 保证 IDY-4 的 H1 精确扫描此后仍能找到该数据文件。
  // H1 检查同样跳过代码块（与 parseDays/小节定位同口径）：贴进文件的格式示例
  // 里的「# 重要日子」不算真实标题；逐行 trim 后匹配（trim 会剥掉 BOM 与 CRLF 的 \r）
  const h1Lines = result.split("\n");
  const h1Fence = fenceMask(h1Lines);
  let hasH1 = false;
  for (let i = 0; i < h1Lines.length; i++) {
    if (!h1Fence[i] && isDataH1Line(h1Lines[i].trim())) {
      hasH1 = true;
      break;
    }
  }
  if (!hasH1) {
    const body = result.replace(/^\uFEFF/, "");
    // 文件以 frontmatter（--- YAML 块）开头时标题必须插在其后，
    // 否则 YAML 被顶进正文、属性全部失效
    // 三条边界都不能省：不加 m（否则文件中间的两条 `---` 水平线会被当成
    // frontmatter 区间，拼接丢正文）；闭合行的 `---` 后必须紧跟行尾/文件尾
    // （否则 `---custom: v` 这类键会被当闭合行）；中间内容整体可选
    // （否则 `---\n---` 空属性区匹配不上，标题插到属性区上面）
    const fm = body.match(/^(---[ \t]*\r?\n(?:[\s\S]*?\r?\n)?---[ \t]*)(?=\r?\n|$)/);
    if (fm) {
      const after = body.slice(fm[1].length).replace(/^(\r?\n)+/, "");
      result = fm[1] + eol + `# ${fileFmt.h1}${eol}${eol}${after}`;
    } else {
      result = `# ${fileFmt.h1}${eol}${eol}${body}`;
    }
  }
  return result;
}

var import_obsidian = require("obsidian");

var VIEW_TYPE_IMPORTANT_DAYS = "important-days-view";

/**
 * ============================================================
 * ImportantDaysView - 重要日子视图
 * ============================================================
 * 显示卡片列表，支持添加、编辑、删除日子
 * ============================================================
 */
var ImportantDaysView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.days = [];
    // 上次加载的基线（含 srcLine 行位置），供 saveDays 做原位合并与删除检测
    this._baseDays = [];
    // 未触发的长按定时器集合，onClose 时统一清理
    this._pressTimers = new Set();
    // 当前打开的编辑弹窗（Obsidian Modal 实例），防重入与视图关闭时清理
    this._activeModal = null;
  }
  
  getViewType() {
    return VIEW_TYPE_IMPORTANT_DAYS;
  }
  
  getDisplayText() {
    return tr("plugin.name");
  }
  
  getIcon() {
    return "heart";
  }
  
  async onOpen() {
    // 整体兜底：任何初始化异常都以可见错误呈现，杜绝「视图打开但整片空白」无从排查
    try {
      await this._onOpenInner();
    } catch (e) {
      console.error("重要日子：视图初始化失败:", e);
      this.contentEl.empty();
      const err = this.contentEl.createDiv("id-empty");
      err.createEl("p").textContent = tr("view.initFail");
      const msg = err.createEl("p", { cls: "id-error-msg" });
      msg.textContent = String(e && e.message ? e.message : e);
    }
  }

  async _onOpenInner() {
    // 先清空再重建，避免重复 onOpen 时容器叠加。
    // 使用自有字段 rootEl，而非覆写 ItemView 基类的 containerEl（视图根元素）
    this.contentEl.empty();
    this.rootEl = this.contentEl.createDiv("important-days-container");
    // 优先使用 plugin 缓存，立即显示，避免白屏
    let usedCache = false;
    if (this.plugin._daysCache) {
      this.days = this.plugin._daysCache.slice();
      this._baseDays = this.plugin._daysCache.slice();
      this.render();
      usedCache = true;
    } else {
      // 缓存未就绪（首次安装/启动），显示加载提示
      this.rootEl.createDiv("id-loading").textContent = tr("view.loading");
    }
    // 后台异步加载最新数据（可能与缓存不同步，加载后刷新）
    try {
      await this.loadDays();
      this.plugin._daysCache = this.days.slice();
      this.render();
    } catch {
      new import_obsidian.Notice(tr("notice.readFail"));
      // 加载失败时：若已用缓存显示，保留缓存数据不清空；否则渲染空状态
      if (!usedCache) {
        this.days = [];
        this.render();
      }
    }
  }
  
  async loadDays() {
    const file = this.app.vault.getAbstractFileByPath(this.plugin.settings.dataFile);
    if (file instanceof import_obsidian.TFile) {
      // 读取失败时抛出异常，由调用方决定是否清空 this.days（保留旧数据 or 清空）
      const content = await this.app.vault.read(file);
      this.days = parseDays(content);
      this._baseDays = this.days.slice();
    } else {
      this.days = [];
      this._baseDays = [];
    }
  }

  async saveDays() {
    // 写操作串行化（与 monthly-tasks 的 writeQueue 同思路）：两个视图/弹窗并发保存时，
    // 后一个排队等前一个落盘，否则双方读同一份旧内容、后写方整段重建会把先写方的
    // 新增行盖掉。链尾挂 then(run, run)：前一个失败不影响后一个执行。
    // 快照待写状态：排队期间本视图的 days/_baseDays 可能被别的视图保存后的跨视图
    // 同步整体替换，若 run 执行时再读 this.days，排队前已并入的编辑会被冲掉
    const daysSnapshot = this.days.slice();
    const baseSnapshot = this._baseDays;
    const run = () => this._saveDaysImpl(daysSnapshot, baseSnapshot);
    const q = (this.plugin._writeQueue || Promise.resolve()).then(run, run);
    this.plugin._writeQueue = q;
    return q;
  }

  async _saveDaysImpl(days, baseDays) {
    const file = this.app.vault.getAbstractFileByPath(this.plugin.settings.dataFile);
    // 标记自身写入，避免 vault.modify 触发的 refreshView 重复渲染（调用方已主动 render）
    this.plugin._selfSaving = true;
    try {
      if (file instanceof import_obsidian.TFile) {
        // 原位合并：现场读取最新内容，只增删改解析时识别出的列表行，
        // frontmatter 与用户自建内容原样保留；行内容与解析时不一致（文件已被
        // 外部改动）时 applyDaysUpdate 抛错，整个写入被拒绝，避免覆盖手改
        let newContent;
        if (typeof this.app.vault.process === "function") {
          // vault.process：读-变换-写在同一回调里完成，无 read→modify 之间的竞态窗口
          newContent = await this.app.vault.process(file, (original) =>
            applyDaysUpdate(original, days, baseDays));
        } else {
          const original = await this.app.vault.read(file);
          newContent = applyDaysUpdate(original, days, baseDays);
          await this.app.vault.modify(file, newContent);
        }
        // 以落盘内容重建列表与基线：新加条目获得 srcLine，后续编辑走原位替换
        const fresh = parseDays(newContent);
        this.days = fresh.map((d) => ({ ...d }));
        this._baseDays = fresh;
      } else {
        // 文件不存在，创建新文件（完整结构，无历史内容需要保留）
        // 先确保文件夹存在（递归创建多层）
        const folderPath = this.plugin.settings.dataFile.substring(0, this.plugin.settings.dataFile.lastIndexOf("/"));
        if (folderPath) {
          await this.ensureFolderExists(folderPath);
        }
        const content = generateDaysContent(days);
        await this.app.vault.create(this.plugin.settings.dataFile, content);
        const fresh = parseDays(content);
        this.days = fresh.map((d) => ({ ...d }));
        this._baseDays = fresh;
      }
    } finally {
      this.plugin._selfSaving = false;
    }
    // 写入成功后更新缓存，保证下次打开视图立即显示最新数据
    this.plugin._daysCache = this.days.slice();
    // 多 leaf：保存期间 _selfSaving 令 refreshView 提前返回，其它视图不会再收到
    // 本次 modify 的刷新，这里主动同步，避免 B 视图停留在旧数据
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_IMPORTANT_DAYS)) {
      if (leaf.view !== this && leaf.view instanceof ImportantDaysView) {
        leaf.view.loadDays().then(() => leaf.view.render()).catch(() => {});
      }
    }
  }
  
  async ensureFolderExists(dirPath) {
    if (!dirPath) return;
    if (this.app.vault.getAbstractFileByPath(dirPath) instanceof import_obsidian.TFolder) return;
    const parent = dirPath.substring(0, dirPath.lastIndexOf("/"));
    if (parent) await this.ensureFolderExists(parent);
    if (!this.app.vault.getAbstractFileByPath(dirPath)) {
      await this.app.vault.createFolder(dirPath);
    }
  }
  
  render() {
    // 渲染兜底：任何异常都以可见的错误信息呈现，避免整块视图空白无从排查
    try {
      this._renderCards();
    } catch (e) {
      console.error("重要日子：视图渲染失败:", e);
      this.rootEl.empty();
      const err = this.rootEl.createDiv("id-empty");
      err.createEl("p").textContent = tr("view.renderFail");
      const msg = err.createEl("p", { cls: "id-error-msg" });
      msg.textContent = String(e && e.message ? e.message : e);
    }
  }

  _renderCards() {
    this.rootEl.empty();

    // 检查文件是否存在
    const file = this.app.vault.getAbstractFileByPath(this.plugin.settings.dataFile);
    const fileExists = file instanceof import_obsidian.TFile;

    // 头部
    const header = this.rootEl.createDiv("id-header");
    const h2 = header.createEl("h2");
    h2.textContent = tr("plugin.name");
    
    // 按钮组
    const btnGroup = header.createDiv("id-header-btns");
    
    const refreshBtn = btnGroup.createEl("button", { cls: "id-refresh-btn" });
    refreshBtn.textContent = "↻";
    refreshBtn.title = tr("view.refresh");
    refreshBtn.setAttribute("aria-label", tr("view.refresh"));
    refreshBtn.addEventListener("click", async () => {
      // 显示加载提示，避免刷新期间用户以为卡住
      this.rootEl.empty();
      this.rootEl.createDiv("id-loading").textContent = tr("view.loading");
      try {
        await this.loadDays();
      } catch {
        new import_obsidian.Notice(tr("notice.readFail"));
      }
      this.render();
    });
    
    const addBtn = btnGroup.createEl("button", { cls: "id-add-btn" });
    addBtn.title = tr("view.add");
    // 添加按钮为纯 CSS 图形（无文字内容），读屏器依赖 aria-label
    addBtn.setAttribute("aria-label", tr("view.add"));
    addBtn.addEventListener("click", () => this.showAddModal());
    
    // 文件不存在提示
    if (!fileExists) {
      const empty = this.rootEl.createDiv("id-empty");
      const p1 = empty.createEl("p", { cls: "id-empty-strong" });
      p1.textContent = tr("empty.noFile");

      const p2 = empty.createEl("p", { cls: "id-empty-path" });
      p2.textContent = tr("empty.path", { path: this.plugin.settings.dataFile });

      empty.createEl("div", { cls: "id-empty-divider" });

      // margin-bottom 8px 由 .id-empty p 的 margin:8px 0 承担，不再单独写
      const p3 = empty.createEl("p", { cls: "id-empty-strong" });
      p3.textContent = tr("empty.fixTitle");

      const ul = empty.createEl("ul", { cls: "id-empty-list" });
      
      const li1 = ul.createEl("li");
      li1.textContent = tr("empty.fixRescan");
      
      const li2 = ul.createEl("li");
      li2.textContent = tr("empty.fixCreate");
      
      return;
    }
    
    // 卡片列表
    // 入场动画只在首次渲染播放（配合 styles.css 的 .id-animating）：
    // 刷新/保存/跨午夜重渲染不再整屏重播 fadeIn
    const firstRender = !this._renderedOnce;
    this._renderedOnce = true;
    const cardsContainer = this.rootEl.createDiv("id-cards-container");
    if (firstRender) cardsContainer.addClass("id-animating");
    
    // 按倒计时排序
    const sortedDays = this.getSortedDays();
    
    for (const day of sortedDays) {
      this.renderCard(cardsContainer, day);
    }
    
    // 统一所有卡片高度
    this.uniformCardHeights(cardsContainer);
    
    // 空状态
    if (this.days.length === 0) {
      const empty = this.rootEl.createDiv("id-empty");
      const p1 = empty.createEl("p");
      p1.textContent = tr("empty.noDays");
      const p2 = empty.createEl("p");
      p2.textContent = tr("empty.noDaysHint");
    }
  }
  
  /**
   * 统一所有卡片高度
   */
  uniformCardHeights(container) {
    const cards = container.querySelectorAll(".id-card");
    if (cards.length === 0) return;
    
    // 先重置高度，获取自然高度
    cards.forEach(card => card.style.minHeight = "");
    
    // 取消上一帧尚未执行的回调：视图已重建后旧回调会操作脱离文档的节点
    if (this._heightRaf) {
      window.cancelAnimationFrame(this._heightRaf);
    }
    // 延迟执行，等待渲染完成
    this._heightRaf = window.requestAnimationFrame(() => {
      this._heightRaf = null;
      let maxHeight = 0;
      cards.forEach(card => {
        const height = card.getBoundingClientRect().height;
        if (height > maxHeight) maxHeight = height;
      });
      
      // 设置所有卡片为最大高度
      cards.forEach(card => card.style.minHeight = `${maxHeight}px`);
    });
  }
  
  getSortedDays() {
    return [...this.days].sort((a, b) => {
      // Number.isFinite 兜底：Infinity（无效日期）与理论不可达的 NaN 都排到末尾
      const daysA = this.getDaysUntilNext(a);
      const daysB = this.getDaysUntilNext(b);
      const na = Number.isFinite(daysA) ? daysA : Infinity;
      const nb = Number.isFinite(daysB) ? daysB : Infinity;
      return na - nb;
    });
  }
  
  getDaysUntilNext(day) {
    if (day.type === "cycle") {
      const nextDate = getNextCycleDate(day.cycleType, day.cycleValue);
      // 防御：cycleValue 畸形导致 nextDate 无效时返回 Infinity，排序时排到末尾
      if (!nextDate || isNaN(nextDate.getTime())) return Infinity;
      return getDaysUntil(nextDate);
    } else if (day.type === "birthday") {
      const nextBirthday = this.getNextBirthday(day);
      if (!nextBirthday || isNaN(nextBirthday.getTime())) return Infinity;
      return getDaysUntil(nextBirthday);
    } else {
      // 纪念日：计算下一次周年
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const year = today.getFullYear();
      // 起始日在未来（登记将来）：下一次就是起始日，锚到今年会落在起始年之前
      const startDate = createValidDate(day.year, day.month - 1, day.day);
      let next;
      if (startDate > today) {
        next = startDate;
      } else {
        next = createValidDate(year, day.month - 1, day.day);
        if (next < today) {
          // 2/29 跨到非闰年需钳制为 2/28；setFullYear 会产生非法日期滚动到 3/1
          next = createValidDate(year + 1, day.month - 1, day.day);
        }
      }
      return getDaysUntil(next);
    }
  }
  
  getNextBirthday(day) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 起始日在未来（登记将来，如预产期）：下一次生日就是起始日，
    // 锚到今年会落在起始日之前
    const startSolar = day.isLunar
      ? lunarToSolar(day.year, day.month, day.day, day.isLeapMonth && getLeapMonth(day.year) === day.month)
      : createValidDate(day.year, day.month - 1, day.day);
    if (startSolar && !isNaN(startSolar.getTime()) && startSolar > today) return startSolar;

    // 判断是否是闰年2月29日生日（公历）
    const isLeapBirthday = !day.isLunar && isLeapDayBirthday(day.month, day.day);
    
    // 农历生日按当前农历年计算（农历年与公历年可能不同，如春节前1月仍属上一个农历年）
    const todayLunar = day.isLunar ? solarToLunar(today) : null;
    let nextYear = todayLunar ? todayLunar.year : today.getFullYear();
    let nextMonth = day.month - 1;
    let nextDay = day.day;
    
    let next;
    if (day.isLunar) {
      // 检查是否是闰月生日
      const leapMonth = getLeapMonth(nextYear);
      const isLeapMonthBirthday = day.isLeapMonth && leapMonth === day.month;
      
      // 优先尝试闰月日期
      next = isLeapMonthBirthday
        ? lunarToSolar(nextYear, day.month, day.day, true)
        : lunarToSolar(nextYear, day.month, day.day, false);
      // lunarToSolar 返回 null（年份超范围等）时回退到公历近似，避免残留过去日期
      if (!next) {
        next = new Date(nextYear, day.month - 1, day.day);
      }
    } else {
      next = new Date(nextYear, nextMonth, nextDay);
      
      // 处理闰年2月29日生日
      if (isLeapBirthday && !isLeapYear(nextYear)) {
        // 非闰年，使用2月28日
        next = new Date(nextYear, 1, 28);
      }
    }
    
    // 若在今天之前才算已过（保留当天，倒计时显示「今」）
    if (next < today) {
      nextYear++;

      if (day.isLunar) {
        const leapMonth = getLeapMonth(nextYear);
        const isLeapMonthBirthday = day.isLeapMonth && leapMonth === day.month;

        if (isLeapMonthBirthday) {
          next = lunarToSolar(nextYear, day.month, day.day, true)
            || new Date(nextYear, day.month - 1, day.day);
        } else {
          next = lunarToSolar(nextYear, day.month, day.day, false)
            || new Date(nextYear, day.month - 1, day.day);
        }
      } else {
        next = new Date(nextYear, nextMonth, nextDay);

        // 处理闰年2月29日生日
        if (isLeapBirthday && !isLeapYear(nextYear)) {
          next = new Date(nextYear, 1, 28);
        }
      }
    }
    
    return next;
  }

  /**
   * 生日年龄（与倒计时/当天判定同源，以 getNextBirthday 为锚）：
   * 下一个生日到达的岁数 = 下一个生日所属农历年（农历生日）/公历年（公历生日）− 出生年；
   * 当天即为生日时该岁数已经到达，否则已满岁数为它减一。
   * 旧实现按出生公历日的周年翻转（getAge）：农历生日与该公历周年每年错开
   * 最多约一个月，窗口期内「今日N岁」/「即将N岁」会差一岁。
   * @param day - 日子对象（含 isLunar/year）
   * @param nextBirthday - getNextBirthday 的返回值
   * @returns { isToday, completedAge }；nextBirthday 无效时返回 null（调用方兜底）
   */
  getBirthdayAgeInfo(day, nextBirthday) {
    if (!nextBirthday || isNaN(nextBirthday.getTime())) return null;
    let anchorYear = nextBirthday.getFullYear();
    if (day.isLunar) {
      // 农历生日按所属农历年计（春节前的公历日期属上一个农历年）
      const nextLunar = solarToLunar(nextBirthday);
      if (nextLunar) anchorYear = nextLunar.year;
    }
    const nextAge = anchorYear - day.year;
    const isToday = getDaysUntil(nextBirthday) === 0;
    const completedAge = Math.max(0, isToday ? nextAge : nextAge - 1);
    return { isToday, completedAge };
  }

  renderCard(container, day) {
    try {
      const card = container.createDiv("id-card");
      // 根据类型添加不同的类名
      card.addClass(
        day.type === "birthday" ? "id-card-birthday"
        : day.type === "cycle" ? "id-card-cycle"
        : "id-card-anniversary"
      );
      
      // 长按编辑：touchcancel（系统手势接管，如来电/下拉通知）也必须取消定时器
      let pressTimer = null;
      const cancelPress = () => {
        if (pressTimer) {
          window.clearTimeout(pressTimer);
          this._pressTimers.delete(pressTimer);
          pressTimer = null;
        }
      };
      card.addEventListener("touchstart", () => {
        cancelPress();
        pressTimer = window.setTimeout(() => {
          this._pressTimers.delete(pressTimer);
          pressTimer = null;
          this.showEditModal(day);
        }, 500);
        this._pressTimers.add(pressTimer);
      });
      card.addEventListener("touchend", cancelPress);
      card.addEventListener("touchmove", cancelPress);
      card.addEventListener("touchcancel", cancelPress);
      
      // 电脑端双击编辑
      card.addEventListener("dblclick", () => {
        this.showEditModal(day);
      });

      // 阻止长按弹出系统上下文菜单（Android），避免与长按编辑手势冲突
      card.addEventListener("contextmenu", (e) => e.preventDefault());
      
      // 左侧内容区
      const leftArea = card.createDiv("id-card-left");
      
      // 卡片头部
      const header = leftArea.createDiv("id-card-header");
      const titleEl = header.createDiv("id-card-title");
      titleEl.textContent = day.name;
      
      // 日期行
      const dateRow = leftArea.createDiv("id-card-date");
      
      // 右侧倒计时区
      const rightArea = card.createDiv("id-card-right");
      
      if (day.type === "cycle") {
        this.renderCycleCard(card, day, dateRow, rightArea);
      } else if (day.type === "birthday") {
        this.renderBirthdayCard(card, day, dateRow, rightArea);
      } else {
        this.renderAnniversaryCard(card, day, dateRow, rightArea);
      }
    } catch (e) {
      console.error("渲染卡片失败:", e);
      const errorCard = container.createDiv("id-card");
      const errorTitle = errorCard.createDiv("id-card-title");
      errorTitle.textContent = day.name + tr("card.renderErrorSuffix");
    }
  }
  
  renderBirthdayCard(card, day, dateRow, rightArea) {
    try {
      // 计算公历日期
      let solarDate;
      if (day.isLunar) {
        solarDate = lunarToSolar(day.year, day.month, day.day, day.isLeapMonth);
      } else {
        solarDate = new Date(day.year, day.month - 1, day.day);
      }
      
      // 如果日期无效，显示错误
      if (!solarDate || isNaN(solarDate.getTime())) {
        const mainEl = dateRow.createDiv("id-card-date-main");
        mainEl.textContent = tr("card.invalidDate");
        return;
      }
      
      // 计算农历日期
      const lunarDate = solarToLunar(solarDate);
      
      // 年龄文案：生日当天显示「今日N岁」，其余时间显示「即将N+1岁」
      // 岁数与当天判定统一以 getNextBirthday 为锚（见 getBirthdayAgeInfo），
      // 闰年 2/29 → 2/28 的约定与农历口径一并覆盖
      const nextBirthdayForAge = this.getNextBirthday(day);
      const ageInfo = this.getBirthdayAgeInfo(day, nextBirthdayForAge);
      // 生日登记在将来（如预产期）：还没出生，不显示年龄和已出生天数——
      // 否则卡片上是「即将1岁」「已出生 0 天」，而倒计时指向的其实是出生那天
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const notBornYet = solarDate > todayStart;
      let ageText;
      if (notBornYet) {
        ageText = "";
      } else if (ageInfo) {
        ageText = ageInfo.isToday ? tr("card.ageToday", { n: ageInfo.completedAge }) : tr("card.ageSoon", { n: ageInfo.completedAge + 1 });
      } else {
        // 下一次生日无效（超农历表范围等）：退回公历周年口径
        ageText = tr("card.ageSoon", { n: getAge(solarDate) + 1 });
      }
      
      // 已出生天数
      const daysPassed = getDaysPassed(solarDate);
      
      // 原始日期是星期几
      const weekDayOriginal = getWeekDay(solarDate);
      
      // 属相按农历年份，星座按公历月日计算（农历月日不能直接用于星座）
      const lunarYear = lunarDate ? lunarDate.year : day.year;
      const zodiac = getZodiac(lunarYear);
      const constellation = localizeConstellation(getConstellation(solarDate.getMonth() + 1, solarDate.getDate()));
      
      // 判断是否是特殊生日
      const isLeapBirthday = !day.isLunar && isLeapDayBirthday(day.month, day.day);
      const isLeapMonthBirthday = day.isLunar && day.isLeapMonth;
      // 闰月标注仅在出生农历年确有该闰月时才有意义：
      // 年份无此闰月时 lunarToSolar 会静默按普通月处理，无条件标注会误导
      const hasRealLeapMonth = isLeapMonthBirthday && getLeapMonth(day.year) === day.month;
      
      // 日期显示
      if (day.isLunar) {
        const lunarText = getLunarDateText({ year: day.year, month: day.month, day: day.day, isLeap: day.isLeapMonth });
        const mainEl = dateRow.createDiv("id-card-date-main");
        const lunarFallback = I18N_LANG === "en" ? `${day.month}/${day.day}` : day.month + "月" + day.day + "日";
        let mainText = tr("card.lunarMain", { text: lunarText || lunarFallback });
        if (hasRealLeapMonth) {
          mainText += tr("card.leapMonthTag");
        }
        mainEl.textContent = `${mainText} · ${tr("card.zodiac", { z: zodiac })} · ${constellation}`;
        const subEl = dateRow.createDiv("id-card-date-sub");
        subEl.textContent = [`${fmtYMD(solarDate.getFullYear(), solarDate.getMonth() + 1, solarDate.getDate())} ${weekDayOriginal}`, ageText]
          .filter(Boolean).join(" · ");
      } else {
        const mainEl = dateRow.createDiv("id-card-date-main");
        let mainText = fmtYMD(day.year, day.month, day.day);
        if (isLeapBirthday) {
          mainText += tr("card.leapDayTag");
        }
        mainEl.textContent = [`${mainText} ${weekDayOriginal}`, ageText].filter(Boolean).join(" · ");
        if (lunarDate) {
          const subEl = dateRow.createDiv("id-card-date-sub");
          subEl.textContent = `${tr("card.lunarSub", { text: getLunarDateText(lunarDate) })} · ${tr("card.zodiac", { z: zodiac })} · ${constellation}`;
        }
      }
      
      // 已出生天数（单独一行；尚未出生时不显示）
      if (!notBornYet) {
        const daysRow = dateRow.createDiv("id-card-days");
        daysRow.textContent = tr("card.bornDays", { n: daysPassed });
      }
      
      // 右侧倒计时
      const nextBirthday = this.getNextBirthday(day);
      // 防御：nextBirthday 无效时不渲染倒计时，避免显示 NaN
      if (!nextBirthday || isNaN(nextBirthday.getTime())) {
        const countdownMain = rightArea.createDiv("id-card-countdown-main");
        countdownMain.textContent = "--";
        const nextRow = dateRow.createDiv("id-card-next");
        nextRow.textContent = tr("card.nextInvalid");
        return;
      }
      const daysUntil = getDaysUntil(nextBirthday);
      const weekDayNext = getWeekDay(nextBirthday);
      const countdownMain = rightArea.createDiv("id-card-countdown-main");
      countdownMain.textContent = daysUntil === 0 ? tr("card.today") : Math.abs(daysUntil);
      if (daysUntil === 0 && tr("card.today").length > 1) countdownMain.addClass("id-card-countdown-word");

      // 临近时添加装饰（14天内）
      if (daysUntil >= 0 && daysUntil <= 14) {
        countdownMain.addClass("id-card-countdown-soon");
        rightArea.createDiv("id-card-countdown-decoration");
      }

      // 下一次生日日期
      const nextRow = dateRow.createDiv("id-card-next");
      let nextText = tr("card.next", { date: `${fmtYMD(nextBirthday.getFullYear(), nextBirthday.getMonth() + 1, nextBirthday.getDate())} ${weekDayNext}` });
      
      // 闰年生日特殊提示：仅当下次生日所在年非闰年时才提示
      if (isLeapBirthday && !isLeapYear(nextBirthday.getFullYear())) {
        nextText += tr("card.leapDayNext", { date: fmtYMD(nextBirthday.getFullYear(), 2, 28) });
      }
      
      // 农历闰月生日特殊提示：按下一次生日所属农历年判断（农历年与公历年不同源），
      // 此前误用公历年份查闰月，春节前一个月的窗口会提示错误
      if (isLeapMonthBirthday) {
        const nextLunar = solarToLunar(nextBirthday);
        const nextYearLeapMonth = nextLunar ? getLeapMonth(nextLunar.year) : 0;
        if (nextYearLeapMonth !== day.month) {
          nextText += tr("card.noLeapThisYear");
        }
      }
      
      nextRow.textContent = nextText;
    } catch (e) {
      console.error("渲染生日卡片失败:", e);
      const mainEl = dateRow.createDiv("id-card-date-main");
      mainEl.textContent = tr("card.renderError");
    }
  }
  
  renderAnniversaryCard(card, day, dateRow, rightArea) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const originalDate = new Date(day.year, day.month - 1, day.day);
      
      // 已过天数和月数
      const daysPassed = getDaysPassed(originalDate);
      const monthsPassed = getMonthsPassed(originalDate);
      
      // 原始日期是星期几
      const weekDayOriginal = getWeekDay(originalDate);
      
      // 日期显示（含星期几）
      const mainEl = dateRow.createDiv("id-card-date-main");
      mainEl.textContent = `${fmtYMD(day.year, day.month, day.day)} ${weekDayOriginal}`;
      
      // 周年文案：当天显示「今日N周年」，其余时间显示「即将N+1周年」
      // getAnniversaryYears 返回已达成年数；起始日当天（completedYears 为 0）仍显示「即将1周年」
      // 「今」的判定提前用下一次日期计算（与右侧倒计时同源），2/29 纪念日在非闰年按 2/28
      // 显示「今」时文案不再错写为「即将N+1周年」
      const nextYearForAge = today.getFullYear();
      let nextForAge = createValidDate(nextYearForAge, day.month - 1, day.day);
      if (nextForAge < today) {
        nextForAge = createValidDate(nextYearForAge + 1, day.month - 1, day.day);
      }
      const completedYears = getAnniversaryYears(originalDate);
      const isAnniversaryToday = getDaysUntil(nextForAge) === 0;
      let yearsText = null;
      if (isAnniversaryToday && completedYears > 0) {
        yearsText = tr("card.annivToday", { n: completedYears });
      } else if (completedYears + 1 > 0) {
        yearsText = tr("card.annivSoon", { n: completedYears + 1 });
      }
      if (yearsText) {
        const infoRow = dateRow.createDiv("id-card-date-sub");
        infoRow.textContent = yearsText;
      }
      
      // 已过天数和月数（单独一行；起始日在将来时还没开始，不显示「已相伴 0 天」）
      if (originalDate <= today) {
        const daysRow = dateRow.createDiv("id-card-days");
        daysRow.textContent = tr("card.together", { d: daysPassed, m: monthsPassed });
      }
      
      // 下一次具体日期
      const nextYear = today.getFullYear();
      // 起始日在未来（登记将来）：下一次就是起始日，锚到今年会落在起始年之前
      const startDate = createValidDate(day.year, day.month - 1, day.day);
      let next;
      if (startDate > today) {
        next = startDate;
      } else {
        next = createValidDate(nextYear, day.month - 1, day.day);
        if (next < today) {
          // 2/29 跨到非闰年需钳制为 2/28；setFullYear 会产生非法日期滚动到 3/1
          next = createValidDate(nextYear + 1, day.month - 1, day.day);
        }
      }
      const weekDayNext = getWeekDay(next);
      const nextRow = dateRow.createDiv("id-card-next");
      nextRow.textContent = tr("card.next", { date: `${fmtYMD(next.getFullYear(), next.getMonth() + 1, next.getDate())} ${weekDayNext}` });
      
      // 右侧倒计时
      const daysUntil = getDaysUntil(next);
      const countdownMain = rightArea.createDiv("id-card-countdown-main");
      countdownMain.textContent = daysUntil === 0 ? tr("card.today") : Math.abs(daysUntil);
      if (daysUntil === 0 && tr("card.today").length > 1) countdownMain.addClass("id-card-countdown-word");
      
      // 临近时添加装饰（14天内）
      if (daysUntil >= 0 && daysUntil <= 14) {
        countdownMain.addClass("id-card-countdown-soon");
        rightArea.createDiv("id-card-countdown-decoration");
      }
    } catch (e) {
      console.error("渲染纪念日卡片失败:", e);
      const mainEl = dateRow.createDiv("id-card-date-main");
      mainEl.textContent = tr("card.renderError");
    }
  }
  
  renderCycleCard(card, day, dateRow, rightArea) {
    try {
      // 计算下次日期
      const nextDate = getNextCycleDate(day.cycleType, day.cycleValue);
      // 防御：cycleValue 畸形或 nextDate 无效时显示提示，避免出现 NaN
      if (!nextDate || isNaN(nextDate.getTime())) {
        const mainEl = dateRow.createDiv("id-card-date-main");
        mainEl.textContent = day.name;
        const subEl = dateRow.createDiv("id-card-date-sub");
        subEl.textContent = tr("card.cycleInvalid");
        return;
      }
      const daysUntil = getDaysUntil(nextDate);
      const weekDayNext = getWeekDay(nextDate);
      
      // 周期类型标签
      card.addClass("id-card-cycle");
      
      // 周期信息
      const mainEl = dateRow.createDiv("id-card-date-main");
      mainEl.textContent = getCycleValueText(day.cycleType, day.cycleValue);
      
      // 周期类型
      const subEl = dateRow.createDiv("id-card-date-sub");
      subEl.textContent = getCycleTypeText(day.cycleType);
      
      // 下一次具体日期
      const nextRow = dateRow.createDiv("id-card-next");
      nextRow.textContent = tr("card.next", { date: `${fmtYMD(nextDate.getFullYear(), nextDate.getMonth() + 1, nextDate.getDate())} ${weekDayNext}` });
      
      // 右侧倒计时
      const countdownMain = rightArea.createDiv("id-card-countdown-main");
      countdownMain.textContent = daysUntil === 0 ? tr("card.today") : Math.abs(daysUntil);
      if (daysUntil === 0 && tr("card.today").length > 1) countdownMain.addClass("id-card-countdown-word");
      
      // 临近时添加装饰（14天内）
      if (daysUntil >= 0 && daysUntil <= 14) {
        countdownMain.addClass("id-card-countdown-soon");
        rightArea.createDiv("id-card-countdown-decoration");
      }
    } catch (e) {
      console.error("渲染周期事件卡片失败:", e);
      const mainEl = dateRow.createDiv("id-card-date-main");
      mainEl.textContent = tr("card.renderError");
    }
  }
  
  // 收掉 Modal 框架自带的 X 关闭按钮与空头部占位（新版弹窗结构）；
  // 关闭按钮在 onOpen 后才挂载，调用方需 rAF/100ms 延迟重试
  sweepModalChrome(m) {
    m.containerEl.querySelectorAll(".modal-header-button, .modal-close-button").forEach((el) => el.remove());
    const header = m.modalEl.querySelector(":scope > .modal-header");
    if (header) header.remove();
  }

  showAddModal() {
    this.showDayModal(null);
  }
  
  showEditModal(day) {
    this.showDayModal(day);
  }
  
  showDayModal(editDay) {
    // 防重入：已有打开的弹窗先完整关闭
    if (this._activeModal) {
      this._activeModal.close();
    }
    // 使用 Obsidian Modal 基类（与 monthly-tasks 同款改造）：
    // 移动端系统返回键、ESC、点击遮罩关闭均由框架统一处理，内容构建在 contentEl 内
    const modal = new import_obsidian.Modal(this.app);
    modal.modalEl.addClass("id-modal", "id-modal-day");
    modal.contentEl.addClass("id-modal-content");
    const modalNode = modal.contentEl;
    const removeOverlay = () => modal.close();
    // 删除确认弹窗（叠加在本弹窗之上，见删除按钮）：本弹窗关闭时连带关闭，避免孤儿确认框
    let confirmModalRef = null;
    // 收掉框架自带的 X 关闭按钮与空头部占位（新版弹窗结构）；
    // 关闭按钮在 onOpen 后才挂载，rAF/100ms 延迟重试
    const sweepChrome = () => this.sweepModalChrome(modal);
    sweepChrome();
    window.requestAnimationFrame(sweepChrome);
    window.setTimeout(sweepChrome, 100);

    // 标题
    const title = activeDocument.createElement("h3");
    title.textContent = editDay ? tr("modal.editTitle") : tr("modal.addTitle");
    modalNode.appendChild(title);
    
    // 名称
    const nameGroup = activeDocument.createElement("div");
    nameGroup.className = "id-modal-group";
    const nameLabel = activeDocument.createElement("label");
    nameLabel.textContent = tr("modal.name");
    const nameInput = activeDocument.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = tr("modal.namePh");
    if (editDay) nameInput.value = editDay.name;
    nameGroup.appendChild(nameLabel);
    nameGroup.appendChild(nameInput);
    modalNode.appendChild(nameGroup);
    
    // 类型
    const typeGroup = activeDocument.createElement("div");
    typeGroup.className = "id-modal-group";
    const typeLabel = activeDocument.createElement("label");
    typeLabel.textContent = tr("modal.type");
    const typeSelect = activeDocument.createElement("select");
    const optAnniversary = activeDocument.createElement("option");
    optAnniversary.value = "anniversary";
    optAnniversary.textContent = tr("type.anniversary");
    const optBirthday = activeDocument.createElement("option");
    optBirthday.value = "birthday";
    optBirthday.textContent = tr("type.birthday");
    const optCycle = activeDocument.createElement("option");
    optCycle.value = "cycle";
    optCycle.textContent = tr("type.cycle");
    typeSelect.appendChild(optAnniversary);
    typeSelect.appendChild(optBirthday);
    typeSelect.appendChild(optCycle);
    if (editDay) {
      typeSelect.value = editDay.type;
    } else {
      typeSelect.value = "anniversary";
    }
    typeGroup.appendChild(typeLabel);
    typeGroup.appendChild(typeSelect);
    // 类型说明
    const typeHint = activeDocument.createElement("div");
    typeHint.className = "id-modal-hint";
    typeHint.textContent = tr("modal.typeHint");
    typeGroup.appendChild(typeHint);
    modalNode.appendChild(typeGroup);
    
    // ========== 周期事件输入区域 ==========
    const cycleGroup = activeDocument.createElement("div");
    cycleGroup.className = "id-modal-group";
    const cycleLabel = activeDocument.createElement("label");
    cycleLabel.textContent = tr("modal.cycle");
    cycleGroup.appendChild(cycleLabel);
    
    const cyclePicker = activeDocument.createElement("div");
    cyclePicker.className = "id-date-picker";
    
    // 周期类型选择
    const cycleTypeSelect = activeDocument.createElement("select");
    const cycleTypes = [
      { value: "monthly", text: tr("cycle.monthly") },
      { value: "quarterly", text: tr("cycle.quarterly") },
      { value: "yearly", text: tr("cycle.yearly") },
      { value: "weekly", text: tr("cycle.weekly") }
    ];
    cycleTypes.forEach(ct => {
      const opt = activeDocument.createElement("option");
      opt.value = ct.value;
      opt.textContent = ct.text;
      cycleTypeSelect.appendChild(opt);
    });
    
    // 周期值输入容器
    const cycleValueContainer = activeDocument.createElement("div");
    cycleValueContainer.className = "id-cycle-value";
    
    // 当前周期值输入引用（避免使用全局 getElementById）
    let cycleValueInput = null;
    let cycleMonthInput = null;
    let cycleDayInput = null;

    // 根据周期类型更新输入框
    const updateCycleValueInput = () => {
      cycleValueContainer.innerHTML = "";
      cycleValueInput = null;
      cycleMonthInput = null;
      cycleDayInput = null;
      const cycleType = cycleTypeSelect.value;

      if (cycleType === "monthly") {
        // 每月：选择日期（1-31）
        const daySelect = activeDocument.createElement("select");
        for (let d = 1; d <= 31; d++) {
          const opt = activeDocument.createElement("option");
          opt.value = String(d);
          opt.textContent = tr("opt.dayOfMonth", { d });
          daySelect.appendChild(opt);
        }
        cycleValueInput = daySelect;
        cycleValueContainer.appendChild(daySelect);
      } else if (cycleType === "quarterly") {
        // 每季度：选择月份（1-3）和日期
        const monthSelect = activeDocument.createElement("select");
        for (let m = 1; m <= 3; m++) {
          const opt = activeDocument.createElement("option");
          opt.value = String(m);
          opt.textContent = tr("opt.monthOfQuarter", { m });
          monthSelect.appendChild(opt);
        }
        cycleMonthInput = monthSelect;

        const daySelect = activeDocument.createElement("select");
        for (let d = 1; d <= 31; d++) {
          const opt = activeDocument.createElement("option");
          opt.value = String(d);
          opt.textContent = tr("opt.dayOfMonth", { d });
          daySelect.appendChild(opt);
        }
        cycleDayInput = daySelect;

        cycleValueContainer.appendChild(monthSelect);
        cycleValueContainer.appendChild(daySelect);
      } else if (cycleType === "yearly") {
        // 每年：选择月份和日期
        const monthSelect = activeDocument.createElement("select");
        for (let m = 1; m <= 12; m++) {
          const opt = activeDocument.createElement("option");
          opt.value = String(m);
          opt.textContent = monthOption(m);
          monthSelect.appendChild(opt);
        }
        cycleMonthInput = monthSelect;

        const daySelect = activeDocument.createElement("select");
        // 日选项按所选月份动态生成（以闰年为基准，2月给到 29）：
        // 2-29 闰年精确、平年由 createValidDate 钳制为 2-28，与说明文案一致；
        // 此前固定 1-31，可选出「每年 2-29」这类校验器拒绝的组合，保存成功但条目消失
        const rebuildDays = () => {
          const m = parseInt(monthSelect.value) || 1;
          const maxDay = getDaysInMonth(2020, m - 1);
          const currentDay = daySelect.value ? parseInt(daySelect.value) : 1;
          daySelect.innerHTML = "";
          for (let d = 1; d <= maxDay; d++) {
            const opt = activeDocument.createElement("option");
            opt.value = String(d);
            opt.textContent = tr("opt.day", { d });
            daySelect.appendChild(opt);
          }
          daySelect.value = String(Math.min(currentDay, maxDay));
        };
        rebuildDays();
        monthSelect.addEventListener("change", rebuildDays);

        cycleDayInput = daySelect;

        cycleValueContainer.appendChild(monthSelect);
        cycleValueContainer.appendChild(daySelect);
      } else if (cycleType === "weekly") {
        // 每周：选择星期几
        const weekSelect = activeDocument.createElement("select");
        const weekDays = WEEKDAY_LONG_I18N[I18N_LANG] || WEEKDAY_LONG_I18N["zh-CN"];
        weekDays.forEach((wd, i) => {
          const opt = activeDocument.createElement("option");
          opt.value = String(i + 1);
          opt.textContent = wd;
          weekSelect.appendChild(opt);
        });
        cycleValueInput = weekSelect;
        cycleValueContainer.appendChild(weekSelect);
      }
    };
    
    cycleTypeSelect.addEventListener("change", updateCycleValueInput);
    cyclePicker.appendChild(cycleTypeSelect);
    cycleGroup.appendChild(cyclePicker);
    cycleGroup.appendChild(cycleValueContainer);
    
    // 周期说明
    const cycleHint = activeDocument.createElement("div");
    cycleHint.className = "id-modal-hint";
    cycleHint.textContent = tr("modal.cycleHint");
    cycleGroup.appendChild(cycleHint);
    modalNode.appendChild(cycleGroup);
    
    // ========== 日期选择器（年/月/日下拉框）==========
    const dateGroup = activeDocument.createElement("div");
    dateGroup.className = "id-modal-group";
    const dateLabel = activeDocument.createElement("label");
    dateLabel.textContent = tr("modal.date");
    dateGroup.appendChild(dateLabel);
    
    const datePicker = activeDocument.createElement("div");
    datePicker.className = "id-date-picker";
    
    // 年份选择
    const yearSelect = activeDocument.createElement("select");
    const currentYear = new Date().getFullYear();
    // 编辑回填时若 editDay.year 超出默认范围（< 1900 或 > currentYear），扩展上限/下限以容纳
    const yearLower = (editDay && editDay.year && editDay.year < 1900) ? editDay.year : 1900;
    const yearUpper = (editDay && editDay.year && editDay.year > currentYear + 50) ? editDay.year : currentYear + 50;
    for (let y = yearUpper; y >= yearLower; y--) {
      const opt = activeDocument.createElement("option");
      opt.value = String(y);
      opt.textContent = tr("opt.year", { y });
      yearSelect.appendChild(opt);
    }
    // 选项按降序铺，第一个选项是 yearUpper；新增时不显式赋值会默认选到
    // 上限年（currentYear+50），不检查直接保存就把日子记到 50 年后
    yearSelect.value = String(editDay && editDay.year ? editDay.year : currentYear);
    
    // 月份选择
    const monthSelect = activeDocument.createElement("select");
    for (let m = 1; m <= 12; m++) {
      const opt = activeDocument.createElement("option");
      opt.value = String(m);
      opt.textContent = monthOption(m);
      monthSelect.appendChild(opt);
    }
    if (editDay) {
      monthSelect.value = String(editDay.month);
    } else {
      monthSelect.value = String(new Date().getMonth() + 1);
    }
    
    // 日期选择
    const daySelect = activeDocument.createElement("select");
    const updateDays = (isLunarMode) => {
      // 保留当前已选日，切换模式后尽量恢复
      const currentDay = daySelect.value ? parseInt(daySelect.value) : 1;
      if (isLunarMode) {
        // 农历：每月最多30天
        daySelect.innerHTML = "";
        for (let d = 1; d <= 30; d++) {
          const opt = activeDocument.createElement("option");
          opt.value = String(d);
          opt.textContent = I18N_LANG === "en" ? String(d) : (LUNAR_DAY_NAMES[d - 1] || `${d}日`);
          daySelect.appendChild(opt);
        }
        if (currentDay >= 1 && currentDay <= 30) {
          daySelect.value = String(currentDay);
        }
      } else {
        // 公历：根据年月计算天数
        const year = parseInt(yearSelect.value);
        const month = parseInt(monthSelect.value);
        const daysInMonth = new Date(year, month, 0).getDate();
        daySelect.innerHTML = "";
        for (let d = 1; d <= daysInMonth; d++) {
          const opt = activeDocument.createElement("option");
          opt.value = String(d);
          opt.textContent = tr("opt.day", { d });
          daySelect.appendChild(opt);
        }
        if (currentDay >= 1 && currentDay <= daysInMonth) {
          daySelect.value = String(currentDay);
        } else if (currentDay > daysInMonth) {
          // 已选日超出新月份天数（如从 31 天的月切到 2 月）：钳制为当月最后一天
          daySelect.value = String(daysInMonth);
        }
      }
    };
    
    // 更新月份选项（农历用农历月份名）
    const updateMonths = (isLunarMode) => {
      // 重建前保留已选值：不清的话农历/公历切换、编辑农历生日都会把月份静默重置成正月/1月
      const keepMonth = monthSelect.value;
      monthSelect.innerHTML = "";
      for (let m = 1; m <= 12; m++) {
        const opt = activeDocument.createElement("option");
        opt.value = String(m);
        opt.textContent = isLunarMode && I18N_LANG !== "en" ? (I18N_LANG === "zh-TW" ? LUNAR_MONTH_NAMES_TW : LUNAR_MONTH_NAMES)[m - 1] + "月" : monthOption(m);
        monthSelect.appendChild(opt);
      }
      if (keepMonth) monthSelect.value = keepMonth;
    };
    
    yearSelect.addEventListener("change", () => updateDays(lunarCheck.checked));
    monthSelect.addEventListener("change", () => updateDays(lunarCheck.checked));
    
    // 农历选项
    const lunarGroup = activeDocument.createElement("div");
    lunarGroup.className = "id-modal-checkbox";
    const lunarCheck = activeDocument.createElement("input");
    lunarCheck.type = "checkbox";
    lunarCheck.id = "lunar-check";
    const lunarLabel = activeDocument.createElement("span");
    lunarLabel.textContent = tr("modal.lunarDate");
    if (editDay && editDay.isLunar) lunarCheck.checked = true;
    lunarGroup.appendChild(lunarCheck);
    lunarGroup.appendChild(lunarLabel);
    
    // 闰月选项
    const leapMonthGroup = activeDocument.createElement("div");
    leapMonthGroup.className = "id-modal-checkbox id-leap-month";
    const leapMonthCheck = activeDocument.createElement("input");
    leapMonthCheck.type = "checkbox";
    leapMonthCheck.id = "leap-month-check";
    const leapMonthLabel = activeDocument.createElement("span");
    leapMonthLabel.textContent = tr("modal.leapMonth");
    if (editDay && editDay.isLeapMonth) leapMonthCheck.checked = true;
    leapMonthGroup.appendChild(leapMonthCheck);
    leapMonthGroup.appendChild(leapMonthLabel);
    
    // 切换农历/公历时更新选项
    lunarCheck.addEventListener("change", () => {
      const isLunar = lunarCheck.checked;
      updateMonths(isLunar);
      updateDays(isLunar);
      dateLabel.textContent = isLunar ? tr("modal.lunarDate") : tr("modal.date");
      leapMonthGroup.classList.toggle("is-visible", isLunar && typeSelect.value === "birthday");
    });
    
    lunarGroup.addEventListener("click", (e) => {
      if (e.target !== lunarCheck) {
        lunarCheck.checked = !lunarCheck.checked;
        lunarCheck.dispatchEvent(new Event("change"));
      }
    });
    
    leapMonthGroup.addEventListener("click", (e) => {
      if (e.target !== leapMonthCheck) {
        leapMonthCheck.checked = !leapMonthCheck.checked;
      }
    });
    
    // 初始化
    if (editDay) {
      monthSelect.value = String(editDay.month);
      updateDays(editDay.isLunar);
      daySelect.value = String(editDay.day);
      if (editDay.isLunar) {
        updateMonths(true);
        dateLabel.textContent = tr("modal.lunarDate");
        leapMonthGroup.classList.add("is-visible");
      } else {
        leapMonthGroup.classList.remove("is-visible");
      }
    } else {
      // 新建时默认为今天
      const today = new Date();
      monthSelect.value = String(today.getMonth() + 1);
      updateDays(false);
      daySelect.value = String(today.getDate());
      leapMonthGroup.classList.remove("is-visible");
    }
    
    datePicker.appendChild(yearSelect);
    datePicker.appendChild(monthSelect);
    datePicker.appendChild(daySelect);
    dateGroup.appendChild(datePicker);
    // 日期说明
    const dateHint = activeDocument.createElement("div");
    dateHint.className = "id-modal-hint";
    dateHint.textContent = tr("modal.dateHint");
    dateGroup.appendChild(dateHint);
    modalNode.appendChild(dateGroup);
    modalNode.appendChild(lunarGroup);
    modalNode.appendChild(leapMonthGroup);
    // 农历说明
    const lunarHint = activeDocument.createElement("div");
    lunarHint.className = "id-modal-hint";
    lunarHint.textContent = tr("modal.lunarHint");
    modalNode.appendChild(lunarHint);
    
    // ========== 类型切换逻辑 ==========
    const toggleInputMode = () => {
      const isCycle = typeSelect.value === "cycle";
      // UI 仅允许生日使用农历（纪念日/周期事件一律按公历处理），
      // 纪念日隐藏农历勾选，避免用户勾选后月日被当公历、语义被静默改变
      const isBirthday = typeSelect.value === "birthday";

      // 切换显示/隐藏
      cycleGroup.style.display = isCycle ? "block" : "none";
      dateGroup.style.display = isCycle ? "none" : "block";
      lunarGroup.style.display = isCycle || !isBirthday ? "none" : "block";
      // 闰月行的显隐统一走 is-visible 类（见 .id-leap-month）：这里若再写行内
      // display，会压过类，导致农历勾选变化时的 classList.toggle 失效
      leapMonthGroup.classList.toggle("is-visible", !isCycle && isBirthday && lunarCheck.checked);
      lunarHint.style.display = isCycle || !isBirthday ? "none" : "block";

      // 切到非生日类型时复位农历勾选与公历 UI：
      // 否则残留的勾选会在保存时把「| 农历」标记写进纪念日/周期条目
      if (!isBirthday) {
        if (lunarCheck.checked) {
          lunarCheck.checked = false;
          updateMonths(false);
          updateDays(false);
          dateLabel.textContent = tr("modal.date");
        }
        leapMonthCheck.checked = false;
      }
    };
    
    typeSelect.addEventListener("change", toggleInputMode);
    
    // 初始化周期事件输入
    if (editDay && editDay.type === "cycle") {
      cycleTypeSelect.value = editDay.cycleType;
      updateCycleValueInput();

      // 直接通过闭包引用回填，无需 setTimeout 和 getElementById
      if (editDay.cycleType === "monthly") {
        if (cycleValueInput) cycleValueInput.value = String(parseInt(editDay.cycleValue));
      } else if (editDay.cycleType === "quarterly" || editDay.cycleType === "yearly") {
        const parts = editDay.cycleValue.split("-");
        // 手写的补零值（如「每年 05-20」）要去零才能对上下拉项的 value（"5"），否则回填为空、保存写出「-20」
        if (cycleMonthInput && parts[0]) cycleMonthInput.value = String(parseInt(parts[0]));
        if (cycleDayInput && parts[1]) cycleDayInput.value = String(parseInt(parts[1]));
        // yearly 的日选项按月份动态生成：月份回填后触发重建，使日选项与所选月份匹配
        //（重建会保留当前已选日并按该月上限钳制）
        if (editDay.cycleType === "yearly" && cycleMonthInput) {
          cycleMonthInput.dispatchEvent(new Event("change"));
        }
      } else if (editDay.cycleType === "weekly") {
        if (cycleValueInput) cycleValueInput.value = editDay.cycleValue;
      }
    } else {
      updateCycleValueInput();
    }
    
    // 初始化显示模式
    toggleInputMode();
    
    // 按钮
    const btnGroup = activeDocument.createElement("div");
    btnGroup.className = "id-modal-btns";
    const cancelBtn = activeDocument.createElement("button");
    cancelBtn.textContent = tr("modal.cancel");
    const saveBtn = activeDocument.createElement("button");
    saveBtn.textContent = tr("modal.save");
    saveBtn.className = "id-modal-save";
    btnGroup.appendChild(cancelBtn);
    btnGroup.appendChild(saveBtn);
    modalNode.appendChild(btnGroup);
    
    // 删除按钮（仅编辑模式显示）
    let deleteBtn = null;
    if (editDay) {
      deleteBtn = activeDocument.createElement("button");
      deleteBtn.className = "id-modal-delete";
      deleteBtn.textContent = tr("modal.delete");
      modalNode.appendChild(deleteBtn);
      
      deleteBtn.addEventListener("click", () => {
        // 删除确认用 Obsidian Modal 而非原生 confirm：后者在部分移动端 WebView
        // 不弹窗/不阻塞（编辑弹窗正是因此迁移 Modal 基类）；确认弹窗叠加在编辑弹窗之上
        const doDelete = async () => {
          // 禁用按钮防止异步期间重复点击
          deleteBtn.disabled = true;
          saveBtn.disabled = true;
          // 保存快照，失败时回滚避免内存与文件不一致
          const snapshot = this.days.slice();
          try {
            const next = this.days.filter(d => !(d.id === editDay.id && d.type === editDay.type));
            // 目标条目已找不到（弹窗打开期间外部改动导致 days 被重建）：
            // 明确报错并关闭弹窗，不再落盘空操作、不提示「已删除」
            if (next.length === this.days.length) {
              removeOverlay();
              throw new Error(tr("error.entryGone"));
            }
            this.days = next;
            await this.saveDays();
            this.render();
            removeOverlay();
            // 卡片从列表消失即反馈，不再弹成功提示；失败路径的 Notice 保留
          } catch (e) {
            this.days = snapshot;
            deleteBtn.disabled = false;
            saveBtn.disabled = false;
            console.error("删除失败:", e);
            // 透出具体原因（如「数据文件已被外部修改」），便于用户理解被拒绝的原因
            new import_obsidian.Notice(e && e.message ? e.message : tr("notice.deleteFail"));
          }
        };

        const confirmModal = new import_obsidian.Modal(this.app);
        confirmModal.modalEl.addClass("id-modal", "id-modal-confirm");
        confirmModal.contentEl.addClass("id-modal-content");
        const sweepConfirm = () => this.sweepModalChrome(confirmModal);
        sweepConfirm();
        window.requestAnimationFrame(sweepConfirm);
        window.setTimeout(sweepConfirm, 100);
        const confirmMsg = activeDocument.createElement("p");
        confirmMsg.className = "id-confirm-msg";
        confirmMsg.textContent = tr("modal.confirmDelete", { name: editDay.name });
        confirmModal.contentEl.appendChild(confirmMsg);
        const confirmBtns = activeDocument.createElement("div");
        confirmBtns.className = "id-modal-btns";
        const confirmNo = activeDocument.createElement("button");
        confirmNo.textContent = tr("modal.cancel");
        const confirmYes = activeDocument.createElement("button");
        confirmYes.textContent = tr("modal.delete");
        confirmYes.className = "id-modal-danger";
        confirmBtns.appendChild(confirmNo);
        confirmBtns.appendChild(confirmYes);
        confirmModal.contentEl.appendChild(confirmBtns);
        confirmNo.addEventListener("click", () => confirmModal.close());
        confirmYes.addEventListener("click", () => {
          confirmModal.close();
          doDelete();
        });
        confirmModalRef = confirmModal;
        confirmModal.onClose = () => {
          if (confirmModalRef === confirmModal) confirmModalRef = null;
        };
        confirmModal.open();
        // 破坏性操作默认聚焦「取消」：误按回车不会直接删除
        confirmNo.focus();
      });
    }
    
    cancelBtn.addEventListener("click", () => {
      removeOverlay();
    });
    
    saveBtn.addEventListener("click", async () => {
      // 防止异步保存期间重复点击
      if (saveBtn.disabled) return;
      saveBtn.disabled = true;

      const name = nameInput.value.trim();
      const type = typeSelect.value;

      if (!name) {
        new import_obsidian.Notice(tr("notice.nameRequired"));
        saveBtn.disabled = false;
        return;
      }

      // 名称含 | 会破坏「- 名称 | 日期」的解析格式（保存后无法被重新识别）
      if (name.includes("|")) {
        new import_obsidian.Notice(tr("notice.namePipe"));
        saveBtn.disabled = false;
        return;
      }

      // 保存快照（必须在修改 this.days 之前），失败时回滚避免内存与文件不一致
      const snapshot = this.days.slice();
      try {
        if (type === "cycle") {
          // 处理周期事件
          const cycleType = cycleTypeSelect.value;
          let cycleValue = "";

          if (cycleType === "monthly") {
            cycleValue = cycleValueInput ? cycleValueInput.value : "1";
          } else if (cycleType === "quarterly" || cycleType === "yearly") {
            const month = cycleMonthInput ? cycleMonthInput.value : "1";
            const day = cycleDayInput ? cycleDayInput.value : "1";
            cycleValue = `${month}-${day}`;
          } else if (cycleType === "weekly") {
            cycleValue = cycleValueInput ? cycleValueInput.value : "1";
          }

          const cycleId = `${name}-${cycleType}-${cycleValue}`;

          // 检查重复（排除当前编辑项）
          const dupCycle = this.days.find(d =>
            d.id !== (editDay && editDay.id) &&
            d.type === "cycle" &&
            d.id === cycleId
          );
          if (dupCycle) {
            new import_obsidian.Notice(tr("notice.dupCycle"));
            saveBtn.disabled = false;
            return;
          }

          if (editDay) {
            const index = this.days.findIndex(d => d.id === editDay.id && d.type === editDay.type);
            if (index < 0) {
              // 目标条目已找不到：明确报错并关闭弹窗，不落盘、不提示「已更新」
              removeOverlay();
              throw new Error(tr("error.entryGone"));
            }
            this.days[index] = {
              ...this.days[index],
              name,
              type,
              cycleType,
              cycleValue,
              id: cycleId
            };
          } else {
            this.days.push({
              id: cycleId,
              name,
              type,
              cycleType,
              cycleValue
            });
          }
        } else {
          // 处理纪念日和生日
          const year = parseInt(yearSelect.value);
          const month = parseInt(monthSelect.value);
          const day = parseInt(daySelect.value);
          const isLunar = lunarCheck.checked;
          const isLeapMonth = isLunar && leapMonthCheck.checked;

          // 防御：editDay.day 超出当月天数时 daySelect.value 可能为空
          if (isNaN(year) || isNaN(month) || isNaN(day)) {
            new import_obsidian.Notice(tr("notice.badDate"));
            saveBtn.disabled = false;
            return;
          }

          const dateValue = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const newId = `${name}-${dateValue}`;

          // 检查重复（排除当前编辑项）
          const dupDay = this.days.find(d =>
            d.id !== (editDay && editDay.id) &&
            d.type === type &&
            d.id === newId
          );
          if (dupDay) {
            new import_obsidian.Notice(tr("notice.dupDay"));
            saveBtn.disabled = false;
            return;
          }

          if (editDay) {
            const index = this.days.findIndex(d => d.id === editDay.id && d.type === editDay.type);
            if (index < 0) {
              // 目标条目已找不到：明确报错并关闭弹窗，不落盘、不提示「已更新」
              removeOverlay();
              throw new Error(tr("error.entryGone"));
            }
            this.days[index] = { ...this.days[index], name, type, year, month, day, isLunar, isLeapMonth, id: newId };
          } else {
            this.days.push({
              id: newId,
              name,
              type,
              year,
              month,
              day,
              isLunar,
              isLeapMonth
            });
          }
        }

        await this.saveDays();
        this.render();
        removeOverlay();
        // 卡片出现/更新即反馈，不再弹成功提示；失败路径保留弹窗与提示
      } catch (e) {
        this.days = snapshot;
        saveBtn.disabled = false;
        console.error("保存失败:", e);
        // 透出具体原因（如「数据文件已被外部修改」），便于用户理解被拒绝的原因
        new import_obsidian.Notice(e && e.message ? e.message : tr("notice.saveFail"));
        // 失败时保留弹窗，便于用户重试（内存已回滚，render 未执行以避免覆盖弹窗输入）
      }
    });

    // 名称框按 Enter 直接保存（桌面键盘流）；中文输入法选词确认的 Enter 不提交
    nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) {
        saveBtn.click();
      }
    });

    // 打开弹窗并登记活动实例，供视图 onClose 统一清理（DOM 挂载由 Modal 框架管理）
    this._activeModal = modal;
    modal.open();
    modal.onClose = () => {
      // 编辑弹窗关闭时连带关闭未决的删除确认弹窗
      if (confirmModalRef) confirmModalRef.close();
      if (this._activeModal === modal) this._activeModal = null;
    };
    // 无障碍：弹窗打开即聚焦保存按钮，键盘用户无需先 Tab 穿过被遮罩的视图内容
    saveBtn.focus();
  }
  
  async onClose() {
    // 清理未触发的长按定时器，避免关闭视图后仍弹出编辑窗口
    for (const t of this._pressTimers) {
      window.clearTimeout(t);
    }
    this._pressTimers.clear();
    // 清理：视图关闭时关闭仍打开的编辑弹窗（DOM 移除由 Modal 框架管理）
    if (this._activeModal) {
      this._activeModal.close();
      this._activeModal = null;
    }
    // 取消未执行的高度均衡帧：回调里仍持有旧卡片节点，视图关闭后不必再跑
    if (this._heightRaf) {
      window.cancelAnimationFrame(this._heightRaf);
      this._heightRaf = null;
    }
  }
};

// ==================== 设置面板 ====================

// 官方原生分区：Obsidian 1.11+ 用 SettingGroup（组标题 + 组内分隔线都由宿主画），
// 返回"该往哪儿 append 设置行"的容器。旧版本没有 SettingGroup 时回退成
// Setting.setHeading() 标题行，行仍直接落在页面上，形状一致、不自己写 CSS。
// 四个插件共用同一段写法，改一处即可对齐。
function settingsSection(containerEl, title) {
  const Group = import_obsidian2.SettingGroup;
  if (typeof Group === "function") {
    const group = new Group(containerEl);
    group.setHeading(title);
    return group.listEl;
  }
  const heading = new import_obsidian2.Setting(containerEl).setName(title);
  if (typeof heading.setHeading === "function") heading.setHeading();
  return containerEl;
}

var ImportantDaysSettingTab = class extends import_obsidian2.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  
  display() {
    const { containerEl } = this;
    containerEl.empty();

    // 这个插件不按周期归档，全部设置只回答一件事：数据写在哪个文件。
    // 所以只有一个分区，两行——手填路径 / 自动扫描，是同一件事的两个入口
    const storageEl = settingsSection(containerEl, tr("settings.section"));

    const plugin = this.plugin;
    let pathText = null;
    let scanSetting = null;
    let committed = plugin.settings.dataFile;

    // 扫描结果只重绘这一行的说明文字，不再整页 display()：
    // 整页重绘会把输入框的光标、焦点和页面滚动位置一起丢掉
    function paintScanRow() {
      if (!scanSetting) return;
      const current = plugin.settings.dataFile;
      scanSetting.setDesc(current
        ? tr("settings.current", { path: current })
        : tr("settings.notFound"));
    }

    new import_obsidian2.Setting(storageEl)
      .setName(tr("settings.path.name"))
      .setDesc(tr("settings.path.desc"))
      .addText((text) => {
        pathText = text;
        let pending = committed;
        text
          .setPlaceholder(tr("settings.path.ph"))
          .setValue(committed)
          .onChange((value) => {
            // 按键过程只暂存规范化结果，不把半成品路径写进配置
            pending = value.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
          });
        text.inputEl.addEventListener("change", async () => {
          // 失焦/回车才提交：非空、以 .md 结尾且不含 .. 段才生效，否则回退旧值并提示。
          // .. 段能把路径指出库根目录（桌面端 file adapter 不做该防护）；.MD 大小写不敏感
          const pathOk = pending
            && pending.toLowerCase().endsWith(".md")
            && !pending.split("/").some((seg) => seg === "..");
          if (pending !== committed) {
            if (pathOk) {
              committed = pending;
              plugin.settings.dataFile = pending;
              await plugin.saveSettings();
            } else {
              new import_obsidian2.Notice(tr("settings.path.invalid"));
              text.setValue(committed);
              pending = committed;
            }
          }
          plugin._preloadDays();
          plugin.refreshView();
          paintScanRow();
        });
      });

    // 原来"已有文件"和"未找到文件"是两段近乎相同的代码，按钮文案还不一样
    //（「重新扫描」/「扫描」）——同一个动作不该因为当前状态换个名字。合成一段
    scanSetting = new import_obsidian2.Setting(storageEl)
      .setName(tr("settings.scan.name"))
      .addButton((btn) => {
        btn.setButtonText(tr("settings.scan.btn"));
        btn.onClick(async () => {
          btn.setButtonText(tr("settings.scan.busy"));
          btn.setDisabled(true);
          try {
            const hits = await scanForDataFiles(this.app);
            const found = hits.length > 0 ? hits[0] : null;
            if (hits.length > 1) {
              new import_obsidian2.Notice(tr("settings.scan.multi", { n: hits.length, list: hits.slice(1, 4).join(tr("list.sep")) }));
            }
            if (found && found !== plugin.settings.dataFile) {
              plugin.settings.dataFile = found;
              await plugin.saveSettings();
              // 手填框跟着走，否则扫描换了文件、框里还写着旧路径
              committed = found;
              if (pathText) pathText.setValue(found);
              plugin._preloadDays();
              plugin.refreshView();
              new import_obsidian2.Notice(tr("settings.scan.found", { path: found }));
            } else if (found) {
              new import_obsidian2.Notice(tr("settings.scan.same"));
            } else {
              new import_obsidian2.Notice(tr("settings.scan.none"));
            }
            paintScanRow();
          } finally {
            // 原来找到新文件时靠整页重绘换掉按钮，不重绘就会永远停在"..."且禁用
            btn.setButtonText(tr("settings.scan.btn"));
            btn.setDisabled(false);
          }
        });
      });
    paintScanRow();

    // 使用提示那四条已移到 README（编辑方式、手编格式、冲突保护、14 天高亮）：
    // 设置页只留设置，手机端打开不必先划一整屏才看到输入框
  }
};

var DEFAULT_SETTINGS = {
  dataFile: ""
};

/**
 * 扫描 vault 中以「# 重要日子」或「# Important Days」为 H1 标题的文件（三语写法都认，见 isDataH1Text）
 * 优先用 metadataCache 的 headings 判断（不读全文，大库不卡顿）；
 * 缓存缺失时回退读全文按 H1 行精确匹配。原实现的 includes 子串匹配会把
 * "## 重要日子" 或正文提及这四个字的任意笔记误判为命中
 * @param app - Obsidian App 实例
 * @returns 所有命中文件的路径列表（按 vault 顺序），未找到为空数组
 */
async function scanForDataFiles(app) {
  const hits = [];
  const files = app.vault.getMarkdownFiles();
  for (const file of files) {
    try {
      const cache = app.metadataCache.getFileCache(file);
      const headings = cache ? cache.headings : null;
      if (headings) {
        if (headings.some((h) => h.level === 1 && isDataH1Text(h.heading))) {
          hits.push(file.path);
        }
        continue;
      }
      // 缓存未就绪（新建/未索引）：回退读全文精确匹配 H1 行（容掉个别编辑器写入的 BOM）。
      // 与 metadataCache 的 headings 口径一致：代码块内的 H1 不算标题（逐行 trim 后匹配，
      // trim 会剥掉 BOM 与 CRLF 的 \r）
      const content = (await app.vault.cachedRead(file)).replace(/^\uFEFF/, "");
      const scanLines = content.split("\n");
      const scanFence = fenceMask(scanLines);
      let h1Found = false;
      for (let i = 0; i < scanLines.length; i++) {
        if (!scanFence[i] && isDataH1Line(scanLines[i].trim())) {
          h1Found = true;
          break;
        }
      }
      if (h1Found) {
        hits.push(file.path);
      }
    } catch {
      // 忽略读取错误
    }
  }
  return hits;
}

// 注意：调用方（设置页扫描、onload 自动扫描）均直接使用 scanForDataFiles 以获取完整命中列表

/**
 * ============================================================
 * ImportantDaysPlugin - 重要日子插件主类
 * ============================================================
 */
var ImportantDaysPlugin = class extends import_obsidian2.Plugin {
  async onload() {
    // 界面语言跟随 Obsidian（无单独选项），须在注册视图/命令前定下来
    applyLanguage();
    await this.loadSettings();

    // 仅在用户未手动设置 dataFile 时才自动扫描，避免覆盖用户配置。
    // 先给默认路径让插件立即可用，扫描延迟到 onload 之后执行，避免大库首启阻塞
    if (!this.settings.dataFile) {
      // 默认文件名随界面语言（重要日子.md / Important Days.md）；库里已有任一语言的默认文件则沿用它，
      // 切换界面语言不会另起一个新文件把数据分裂开
      const existingDefault = ["重要日子.md", "Important Days.md"]
        .find((p) => this.app.vault.getAbstractFileByPath(p) instanceof import_obsidian2.TFile);
      this.settings.dataFile = existingDefault || dataFormat(I18N_LANG).file;
      await this.saveSettings();
      // 等布局就绪再扫：冷启动时 metadataCache 未建好，立即扫会漏掉
      // 本可命中的数据文件；句柄留存以便 onunload 清理，扫描失败不产生 unhandled rejection
      this.app.workspace.onLayoutReady(() => {
        this._scanTimer = window.setTimeout(async () => {
          try {
            const hits = await scanForDataFiles(this.app);
            const found = hits.length > 0 ? hits[0] : null;
            if (found && found !== this.settings.dataFile) {
              this.settings.dataFile = found;
              await this.saveSettings();
              this._preloadDays();
              this.refreshView();
            }
          } catch (e) {
            console.error("自动扫描数据文件失败:", e);
          }
        }, 0);
      });
    }

    // 数据缓存：用于视图打开时立即显示，避免白屏等待
    this._daysCache = null;
    this._preloadDays();

    // 注册视图
    this.registerView(
      VIEW_TYPE_IMPORTANT_DAYS,
      (leaf) => new ImportantDaysView(leaf, this)
    );
    
    // 添加 Ribbon 图标
    this.addRibbonIcon("heart", tr("plugin.name"), () => {
      this.activateView();
    });
    
    // 添加命令
    this.addCommand({
      id: "open-view",
      name: tr("cmd.open"),
      callback: () => this.activateView()
    });
    
    // 添加设置面板
    this.addSettingTab(new ImportantDaysSettingTab(this.app, this));

    // 跨午夜自动刷新倒计时（每分钟检查，仅在日期变化时重渲染，几乎零开销）
    this._lastRenderDate = formatDate(new Date());
    this.registerInterval(window.setInterval(() => {
      const today = formatDate(new Date());
      if (today !== this._lastRenderDate) {
        this._lastRenderDate = today;
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_IMPORTANT_DAYS);
        for (const leaf of leaves) {
          if (leaf.view instanceof ImportantDaysView) {
            leaf.view.loadDays().then(() => leaf.view.render()).catch(() => {});
          }
        }
      }
    }, 60 * 1000));
    
    // 监听数据文件变更
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file instanceof import_obsidian2.TFile && file.path === this.settings.dataFile) {
          this.refreshView();
        }
      })
    );
    
    this.registerEvent(
      this.app.vault.on("create", (file) => {
        if (file instanceof import_obsidian2.TFile && file.path === this.settings.dataFile) {
          this.refreshView();
        }
      })
    );
    
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (file instanceof import_obsidian2.TFile && file.path === this.settings.dataFile) {
          this.refreshView();
        }
      })
    );
    
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (oldPath === this.settings.dataFile) {
          // 数据文件被重命名：跟随更新配置，避免插件指向已不存在的旧路径
          if (file instanceof import_obsidian2.TFile) {
            this.settings.dataFile = file.path;
            this.saveSettings();
          }
          this.refreshView();
        } else if (file instanceof import_obsidian2.TFile && file.path === this.settings.dataFile) {
          this.refreshView();
        }
      })
    );
  }
  
  async loadSettings() {
    const raw = await this.loadData();
    // 白名单取字段：旧版废弃键（如 autoScanned）不再被合并回配置反复写盘
    this.settings = {
      dataFile: raw && typeof raw.dataFile === "string" ? raw.dataFile : DEFAULT_SETTINGS.dataFile
    };
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  // 预读数据到缓存，使视图打开时能立即显示（不阻塞 onload）
  _preloadDays() {
    const file = this.app.vault.getAbstractFileByPath(this.settings.dataFile);
    if (file instanceof import_obsidian2.TFile) {
      this.app.vault.read(file).then((content) => {
        this._daysCache = parseDays(content);
      }).catch(() => {
        // 预读失败忽略，视图 onOpen 会重试
      });
    }
  }
  
  async activateView() {
    const { workspace } = this.app;
    const existingLeaf = workspace.getLeavesOfType(VIEW_TYPE_IMPORTANT_DAYS)[0];

    if (existingLeaf) {
      workspace.revealLeaf(existingLeaf);
      return;
    }

    // 移动端/无右侧栏布局下 getRightLeaf 可能返回 null，回退新建 leaf（新标签页打开）
    let leaf = workspace.getRightLeaf(false);
    if (!leaf) {
      leaf = workspace.getLeaf(true);
    }
    if (leaf) {
      await leaf.setViewState({ type: VIEW_TYPE_IMPORTANT_DAYS });
      workspace.revealLeaf(leaf);
    } else {
      new import_obsidian2.Notice(tr("notice.openFail"), 3000);
    }
  }
  
  refreshView() {
    // 自身 saveDays 触发的 modify 事件已由调用处主动 render，这里跳过避免重复渲染
    if (this._selfSaving) return;

    // 防抖：外部连续写入（如同步工具批量更新）时只渲染最后一次
    if (this._refreshTimer) {
      window.clearTimeout(this._refreshTimer);
    }
    this._refreshTimer = window.setTimeout(() => {
      this._refreshTimer = null;
      const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_IMPORTANT_DAYS);
      for (const leaf of leaves) {
        if (leaf.view instanceof ImportantDaysView) {
          leaf.view.loadDays().then(() => {
            leaf.view.render();
            this._daysCache = leaf.view.days.slice();
          }).catch((e) => {
            console.error("刷新视图失败:", e);
            new import_obsidian2.Notice(tr("notice.readFail"));
          });
        }
      }
    }, 200);
  }

  onunload() {
    if (this._scanTimer) {
      window.clearTimeout(this._scanTimer);
      this._scanTimer = null;
    }
    if (this._refreshTimer) {
      window.clearTimeout(this._refreshTimer);
      this._refreshTimer = null;
    }
    // 不 detachLeavesOfType：插件更新/重载时保留用户摆好的面板位置
    // （与 monthly-tasks 同口径；视图死叶在重新启用时会被重新激活渲染）
  }
};

module.exports = ImportantDaysPlugin;
