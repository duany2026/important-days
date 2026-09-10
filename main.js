/*
 * ============================================================
 * 重要日子插件 (Important Days Plugin)
 * ============================================================
 *
 * 插件功能：记录生活中的重要日子，支持纪念日、生日倒计时
 * 版本：1.4.0
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
  return WEEKDAY_NAMES[date.getDay()];
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
  if (today.getDate() < start.getDate()) {
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
  const currentDay = today.getDate();
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
  return texts[cycleType] || "";
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
      return `每月${cycleValue}号`;
    case "quarterly": {
      const parts = cycleValue.split("-");
      return `每季度第${parts[0]}个月${parts[1]}号`;
    }
    case "yearly": {
      const parts = cycleValue.split("-");
      return `${parts[0]}月${parts[1]}日`;
    }
    case "weekly": {
      const weekDays = ["", "周一", "周二", "周三", "周四", "周五", "周六", "周日"];
      return weekDays[parseInt(cycleValue)];
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

/** 天干 */
var TIAN_GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];

/** 地支 */
var DI_ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

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
  19416, 19168, 42352, 21717, 53856, 55632, 91476, 22176, 39632, 21970,
  19168, 42422, 42192, 53840, 119381, 46400, 54944, 44450, 38320, 84343,
  18800, 42160, 46261, 27216, 27968, 109396, 11104, 38256, 21234, 18800,
  25958, 54432, 59984, 28309, 23248, 11104, 100067, 37600, 116951, 51536,
  54432, 120998, 46416, 22176, 107956, 9680, 37584, 53938, 43344, 46423,
  27808, 46416, 86869, 19872, 42448, 83315, 21200, 43432, 59728, 27296,
  44710, 43856, 19296, 43748, 42352, 21088, 62051, 55632, 23383, 22176,
  38608, 19925, 19152, 42192, 54484, 53840, 54616, 46400, 46496, 103846,
  38320, 18864, 43380, 42160, 45690, 27216, 27968, 44870, 43872, 38256,
  19189, 18800, 25776, 29859, 59984, 27480, 21952, 43872, 38613, 37600,
  51552, 55636, 54432, 55888, 30034, 22176, 43959, 9680, 37584, 51893,
  43344, 46240, 47780, 44368, 21977, 19360, 42416, 86390, 21168, 43312,
  31060, 27296, 44368, 23378, 19296, 42726, 42208, 53856, 60005, 54576,
  23200, 30371, 38608, 19415, 19152, 42192, 118966, 53840, 54560, 56645,
  46496, 22224, 21938, 18864, 42359, 42160, 43600, 111189, 27936, 44448,
  84835, 37744, 18936, 18800, 25776, 92326, 59984, 27424, 108228, 43744,
  41696, 53987, 51552, 54615, 54432, 55888, 23893, 22176, 42704, 21972,
  21200, 43448, 43344, 46240, 46758, 44368, 21920, 43940, 42416, 21168,
  45683, 26928, 29495, 27296, 44368, 84821, 19296, 42352, 21732, 53600,
  59752, 54560, 55968, 92838, 22224, 19168, 43476, 41680, 53584, 62034,
54560
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
  return LUNAR_INFO[year - 1900] & (65536 >> month) ? 30 : 29;
}

/**
 * 公历转农历
 * @param date - 公历日期
 * @returns 农历日期对象，超出范围返回 null
 */
function solarToLunar(date) {
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  let day = date.getDate();
  
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
  const monthName = LUNAR_MONTH_NAMES[lunarDate.month - 1];
  const monthText = lunarDate.isLeap ? `闰${monthName}月` : `${monthName}月`;
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
  return ZODIAC_ANIMALS[index >= 0 ? index : index + 12];
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
    new import_obsidian2.Notice("重要日子：数据文件中有个别行无法识别为有效条目，已忽略（详情见控制台）");
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
  // 代码块内的标题/列表行不参与解析
  let inCodeFence = false;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    // H1（含文件标题「# 重要日子」）重置类型：其后未进入 ## 小节前的行不解析
    if (trimmed.startsWith("# ")) {
      currentType = null;
      continue;
    }

    // 检测 section 标题：先重置、再按关键字赋值，未知小节解析结果为 null
    if (trimmed.startsWith("## ")) {
      const sectionName = trimmed.slice(3).trim();
      currentType = null;
      if (sectionName.includes("生日")) {
        currentType = "birthday";
      } else if (sectionName.includes("纪念日")) {
        currentType = "anniversary";
      } else if (sectionName.includes("周期")) {
        currentType = "cycle";
      }
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
      // 第三列只接受插件自身写入的「农历/农历闰」标记；第四列及之后（备注等）视为用户内容：
      // 这类行判为不识别行，原样保留不参与合并，避免备注被静默删除或被误读为农历标记
      if (parts.length > 3 || (parts.length === 3 && thirdField !== "农历" && thirdField !== "农历闰")) {
        continue;
      }
      const isLunar = thirdField === "农历" || thirdField === "农历闰";
      const isLeapMonth = thirdField === "农历闰";

        // 解析周期事件
        if (currentType === "cycle") {
          const cycleMatch = dateStr.match(/^(每月|每季度|每年|每周)\s+(.+)$/);
          if (cycleMatch) {
            const cycleTypeText = cycleMatch[1];
            const cycleValue = cycleMatch[2].trim();

            let cycleType;
            if (cycleTypeText === "每月") cycleType = "monthly";
            else if (cycleTypeText === "每季度") cycleType = "quarterly";
            else if (cycleTypeText === "每年") cycleType = "yearly";
            else if (cycleTypeText === "每周") cycleType = "weekly";

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
          const dateMatch = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
          if (dateMatch) {
            const year = parseInt(dateMatch[1]);
            const month = parseInt(dateMatch[2]);
            const day = parseInt(dateMatch[3]);

            // 校验日期合法性（月份 1-12，日 1-31，且 new Date 不滚动到下月）
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

            days.push({
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
            });
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
 * 生成日子数据文件内容
 * @param days - 日子数组
 * @returns MD 文件内容
 */
function generateDaysContent(days) {
  const birthdays = days.filter(d => d.type === "birthday");
  const anniversaries = days.filter(d => d.type === "anniversary");
  const cycles = days.filter(d => d.type === "cycle");
  
  let content = "# 重要日子\n\n";
  
  if (anniversaries.length > 0) {
    content += "## 纪念日\n";
    for (const day of anniversaries) {
      const dateStr = `${day.year}-${String(day.month).padStart(2, "0")}-${String(day.day).padStart(2, "0")}`;
      const lunarStr = day.isLunar ? " | 农历" : "";
      content += `- ${day.name} | ${dateStr}${lunarStr}\n`;
    }
    content += "\n";
  }
  
  if (birthdays.length > 0) {
    content += "## 生日\n";
    for (const day of birthdays) {
      const dateStr = `${day.year}-${String(day.month).padStart(2, "0")}-${String(day.day).padStart(2, "0")}`;
      let lunarStr = "";
      if (day.isLunar) {
        lunarStr = " | 农历";
        if (day.isLeapMonth) {
          lunarStr = " | 农历闰";
        }
      }
      content += `- ${day.name} | ${dateStr}${lunarStr}\n`;
    }
    content += "\n";
  }
  
  if (cycles.length > 0) {
    content += "## 周期事件\n";
    for (const day of cycles) {
      let cycleText;
      if (day.cycleType === "monthly") cycleText = "每月";
      else if (day.cycleType === "quarterly") cycleText = "每季度";
      else if (day.cycleType === "yearly") cycleText = "每年";
      else if (day.cycleType === "weekly") cycleText = "每周";
      else {
        // 未知 cycleType 跳过，避免写入 undefined 导致后续解析丢失
        console.warn("跳过未知周期类型:", day);
        continue;
      }

      content += `- ${day.name} | ${cycleText} ${day.cycleValue}\n`;
    }
    content += "\n";
  }

  return content;
}

/**
 * 将单条日子格式化为一行数据文本（与 generateDaysContent 的行格式一致）
 * @param day - 日子对象
 * @returns 列表行文本（不含换行符）
 */
function formatDayLine(day) {
  if (day.type === "cycle") {
    const cycleText = { monthly: "每月", quarterly: "每季度", yearly: "每年", weekly: "每周" }[day.cycleType] || "";
    return `- ${day.name} | ${cycleText} ${day.cycleValue}`;
  }
  const dateStr = `${day.year}-${String(day.month).padStart(2, "0")}-${String(day.day).padStart(2, "0")}`;
  let line = `- ${day.name} | ${dateStr}`;
  if (day.isLunar) {
    line += day.type === "birthday" && day.isLeapMonth ? " | 农历闰" : " | 农历";
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
  const dayLineText = (d) => formatDayLine(d) + (usesCRLF ? "\r" : "");
  const SECTION_LABELS = { anniversary: "纪念日", birthday: "生日", cycle: "周期事件" };

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
    throw new Error("数据文件已被外部修改，为避免覆盖手改内容未保存。请先刷新视图再重试");
  }

  // 计算每个小节的插入位置：小节标题行之后最后一条列表行的下一行；
  // 小节不存在时标记为追加新小节
  const insertAfter = /* @__PURE__ */ new Map(); // 行号 -> 待插入行文本数组
  const pendingByType = /* @__PURE__ */ new Map();
  for (const d of insertions) {
    if (!pendingByType.has(d.type)) pendingByType.set(d.type, []);
    pendingByType.get(d.type).push(dayLineText(d));
  }

  const sectionOf = (text) => {
    const t = text.trim();
    if (!t.startsWith("## ")) return null;
    const name = t.slice(3);
    if (name.includes("生日")) return "birthday";
    if (name.includes("纪念日")) return "anniversary";
    if (name.includes("周期")) return "cycle";
    return null;
  };

  for (const [type, entries] of pendingByType) {
    let headerIdx = -1;
    let lastEntryIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (sectionOf(lines[i]) === type) {
        headerIdx = i;
        lastEntryIdx = i;
        for (let j = i + 1; j < lines.length; j++) {
          const t = lines[j].trim();
          if (t.startsWith("## ")) break;
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

  // 文件缺「# 重要日子」H1（如对空文件新建小节曾遗漏）：补在最前，
  // 保证 IDY-4 的 H1 精确扫描此后仍能找到该数据文件。
  // 容忍首字符 BOM（个别编辑器写入），否则带 BOM 的文件会被误判缺 H1 而追加第二个标题；
  // 补写时剥离原 BOM，避免其滞留文件中间挂在原首行之前
  if (!/^(?:\uFEFF)?#\s*重要日子\s*$/m.test(result)) {
    result = `# 重要日子${eol}${eol}${result.replace(/^\uFEFF/, "")}`;
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
    return "重要日子";
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
      err.createEl("p").textContent = "视图初始化失败";
      const msg = err.createEl("p");
      msg.textContent = String(e && e.message ? e.message : e);
      msg.style.color = "var(--text-error)";
      msg.style.fontSize = "0.9em";
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
      this.rootEl.createDiv("id-loading").textContent = "加载中...";
    }
    // 后台异步加载最新数据（可能与缓存不同步，加载后刷新）
    try {
      await this.loadDays();
      this.plugin._daysCache = this.days.slice();
      this.render();
    } catch (e) {
      new import_obsidian.Notice("数据文件读取失败");
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
    const file = this.app.vault.getAbstractFileByPath(this.plugin.settings.dataFile);
    // 标记自身写入，避免 vault.modify 触发的 refreshView 重复渲染（调用方已主动 render）
    this.plugin._selfSaving = true;
    try {
      if (file instanceof import_obsidian.TFile) {
        // 原位合并：现场读取最新内容，只增删改解析时识别出的列表行，
        // frontmatter 与用户自建内容原样保留；行内容与解析时不一致（文件已被
        // 外部改动）时 applyDaysUpdate 抛错，整个写入被拒绝，避免覆盖手改
        const original = await this.app.vault.read(file);
        const newContent = applyDaysUpdate(original, this.days, this._baseDays);
        await this.app.vault.modify(file, newContent);
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
        const content = generateDaysContent(this.days);
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
      err.createEl("p").textContent = "视图渲染失败";
      const msg = err.createEl("p");
      msg.textContent = String(e && e.message ? e.message : e);
      msg.style.color = "var(--text-error)";
      msg.style.fontSize = "0.9em";
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
    h2.textContent = "重要日子";
    
    // 按钮组
    const btnGroup = header.createDiv("id-header-btns");
    
    const refreshBtn = btnGroup.createEl("button", { cls: "id-refresh-btn" });
    refreshBtn.textContent = "↻";
    refreshBtn.title = "刷新";
    refreshBtn.setAttribute("aria-label", "刷新");
    refreshBtn.addEventListener("click", async () => {
      // 显示加载提示，避免刷新期间用户以为卡住
      this.rootEl.empty();
      this.rootEl.createDiv("id-loading").textContent = "加载中...";
      try {
        await this.loadDays();
      } catch (e) {
        new import_obsidian.Notice("数据文件读取失败");
      }
      this.render();
    });
    
    const addBtn = btnGroup.createEl("button", { cls: "id-add-btn" });
    addBtn.title = "添加";
    // 添加按钮为纯 CSS 图形（无文字内容），读屏器依赖 aria-label
    addBtn.setAttribute("aria-label", "添加");
    addBtn.addEventListener("click", () => this.showAddModal());
    
    // 文件不存在提示
    if (!fileExists) {
      const empty = this.rootEl.createDiv("id-empty");
      const p1 = empty.createEl("p");
      p1.textContent = "数据文件不存在";
      p1.style.fontWeight = "bold";
      
      const p2 = empty.createEl("p");
      p2.textContent = `当前路径：${this.plugin.settings.dataFile}`;
      p2.style.color = "var(--text-muted)";
      p2.style.fontSize = "0.9em";
      
      const divider = empty.createEl("div");
      divider.style.margin = "16px 0";
      divider.style.borderTop = "1px solid var(--background-modifier-border)";
      
      const p3 = empty.createEl("p");
      p3.textContent = "解决方法：";
      p3.style.fontWeight = "bold";
      p3.style.marginBottom = "8px";
      
      const ul = empty.createEl("ul");
      ul.style.textAlign = "left";
      ul.style.paddingLeft = "20px";
      ul.style.color = "var(--text-muted)";
      ul.style.lineHeight = "1.8";
      
      const li1 = ul.createEl("li");
      li1.textContent = "在插件设置中点击「重新扫描」自动查找";
      
      const li2 = ul.createEl("li");
      li2.textContent = "或创建包含「# 重要日子」标题的 Markdown 文件";
      
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
      p1.textContent = "还没有记录任何日子";
      const p2 = empty.createEl("p");
      p2.textContent = "点击右上角「添加」开始记录";
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
      cancelAnimationFrame(this._heightRaf);
    }
    // 延迟执行，等待渲染完成
    this._heightRaf = requestAnimationFrame(() => {
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
      let next = createValidDate(year, day.month - 1, day.day);
      if (next < today) {
        // 2/29 跨到非闰年需钳制为 2/28；setFullYear 会产生非法日期滚动到 3/1
        next = createValidDate(year + 1, day.month - 1, day.day);
      }
      return getDaysUntil(next);
    }
  }
  
  getNextBirthday(day) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
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
  
  renderCard(container, day) {
    try {
      const card = container.createDiv("id-card");
      // 根据类型添加不同的类名
      card.addClass(day.type === "birthday" ? "id-card-birthday" : "id-card-anniversary");
      
      // 长按编辑：touchcancel（系统手势接管，如来电/下拉通知）也必须取消定时器
      let pressTimer = null;
      const cancelPress = () => {
        if (pressTimer) {
          clearTimeout(pressTimer);
          this._pressTimers.delete(pressTimer);
          pressTimer = null;
        }
      };
      card.addEventListener("touchstart", () => {
        cancelPress();
        pressTimer = setTimeout(() => {
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
      errorTitle.textContent = day.name + " (渲染错误)";
    }
  }
  
  renderBirthdayCard(card, day, dateRow, rightArea) {
    try {
      const today = new Date();
      
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
        mainEl.textContent = "日期无效";
        return;
      }
      
      // 计算农历日期
      const lunarDate = solarToLunar(solarDate);
      
      // 年龄文案：生日当天显示「今日N岁」，其余时间显示「即将N+1岁」
      // 当天判定与右侧倒计时同源（getNextBirthday），闰年 2/29 → 2/28 的约定也一致
      const nextBirthdayForAge = this.getNextBirthday(day);
      const isBirthdayToday = !!nextBirthdayForAge && !isNaN(nextBirthdayForAge.getTime()) && getDaysUntil(nextBirthdayForAge) === 0;
      const ageText = isBirthdayToday ? `今日${getAge(solarDate)}岁` : `即将${getAge(solarDate) + 1}岁`;
      
      // 已出生天数
      const daysPassed = getDaysPassed(solarDate);
      
      // 原始日期是星期几
      const weekDayOriginal = getWeekDay(solarDate);
      
      // 属相按农历年份，星座按公历月日计算（农历月日不能直接用于星座）
      const lunarYear = lunarDate ? lunarDate.year : day.year;
      const zodiac = getZodiac(lunarYear);
      const constellation = getConstellation(solarDate.getMonth() + 1, solarDate.getDate());
      
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
        let mainText = `农历 ${lunarText || day.month + "月" + day.day + "日"}`;
        if (hasRealLeapMonth) {
          mainText += "（闰月）";
        }
        mainEl.textContent = `${mainText} · 属${zodiac} · ${constellation}`;
        const subEl = dateRow.createDiv("id-card-date-sub");
        subEl.textContent = `${solarDate.getFullYear()}年${solarDate.getMonth() + 1}月${solarDate.getDate()}日 ${weekDayOriginal} · ${ageText}`;
      } else {
        const mainEl = dateRow.createDiv("id-card-date-main");
        let mainText = `${day.year}年${day.month}月${day.day}日`;
        if (isLeapBirthday) {
          mainText += "（闰年生日）";
        }
        mainEl.textContent = `${mainText} ${weekDayOriginal} · ${ageText}`;
        if (lunarDate) {
          const subEl = dateRow.createDiv("id-card-date-sub");
          subEl.textContent = `农历${getLunarDateText(lunarDate)} · 属${zodiac} · ${constellation}`;
        }
      }
      
      // 已出生天数（单独一行）
      const daysRow = dateRow.createDiv("id-card-days");
      daysRow.textContent = `已出生 ${daysPassed} 天`;
      
      // 右侧倒计时
      const nextBirthday = this.getNextBirthday(day);
      // 防御：nextBirthday 无效时不渲染倒计时，避免显示 NaN
      if (!nextBirthday || isNaN(nextBirthday.getTime())) {
        const countdownMain = rightArea.createDiv("id-card-countdown-main");
        countdownMain.textContent = "--";
        const nextRow = dateRow.createDiv("id-card-next");
        nextRow.textContent = "下一次日期无效";
        return;
      }
      const daysUntil = getDaysUntil(nextBirthday);
      const weekDayNext = getWeekDay(nextBirthday);
      const countdownMain = rightArea.createDiv("id-card-countdown-main");
      countdownMain.textContent = daysUntil === 0 ? "今" : Math.abs(daysUntil);

      // 临近时添加装饰（14天内）
      if (daysUntil >= 0 && daysUntil <= 14) {
        countdownMain.addClass("id-card-countdown-soon");
        rightArea.createDiv("id-card-countdown-decoration");
      }

      // 下一次生日日期
      const nextRow = dateRow.createDiv("id-card-next");
      let nextText = `下一次：${nextBirthday.getFullYear()}年${nextBirthday.getMonth() + 1}月${nextBirthday.getDate()}日 ${weekDayNext}`;
      
      // 闰年生日特殊提示：仅当下次生日所在年非闰年时才提示
      if (isLeapBirthday && !isLeapYear(nextBirthday.getFullYear())) {
        nextText += `（${nextBirthday.getFullYear()}年2月28日）`;
      }
      
      // 农历闰月生日特殊提示：按下一次生日所属农历年判断（农历年与公历年不同源），
      // 此前误用公历年份查闰月，春节前一个月的窗口会提示错误
      if (isLeapMonthBirthday) {
        const nextLunar = solarToLunar(nextBirthday);
        const nextYearLeapMonth = nextLunar ? getLeapMonth(nextLunar.year) : 0;
        if (nextYearLeapMonth !== day.month) {
          nextText += "（今年无闰月）";
        }
      }
      
      nextRow.textContent = nextText;
    } catch (e) {
      console.error("渲染生日卡片失败:", e);
      const mainEl = dateRow.createDiv("id-card-date-main");
      mainEl.textContent = "渲染错误";
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
      mainEl.textContent = `${day.year}年${day.month}月${day.day}日 ${weekDayOriginal}`;
      
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
        yearsText = `今日${completedYears}周年`;
      } else if (completedYears + 1 > 0) {
        yearsText = `即将${completedYears + 1}周年`;
      }
      if (yearsText) {
        const infoRow = dateRow.createDiv("id-card-date-sub");
        infoRow.textContent = yearsText;
      }
      
      // 已过天数和月数（单独一行）
      const daysRow = dateRow.createDiv("id-card-days");
      daysRow.textContent = `已相伴 ${daysPassed} 天（${monthsPassed}个月）`;
      
      // 下一次具体日期
      const nextYear = today.getFullYear();
      let next = createValidDate(nextYear, day.month - 1, day.day);
      if (next < today) {
        // 2/29 跨到非闰年需钳制为 2/28；setFullYear 会产生非法日期滚动到 3/1
        next = createValidDate(nextYear + 1, day.month - 1, day.day);
      }
      const weekDayNext = getWeekDay(next);
      const nextRow = dateRow.createDiv("id-card-next");
      nextRow.textContent = `下一次：${next.getFullYear()}年${next.getMonth() + 1}月${next.getDate()}日 ${weekDayNext}`;
      
      // 右侧倒计时
      const daysUntil = getDaysUntil(next);
      const countdownMain = rightArea.createDiv("id-card-countdown-main");
      countdownMain.textContent = daysUntil === 0 ? "今" : Math.abs(daysUntil);
      
      // 临近时添加装饰（14天内）
      if (daysUntil >= 0 && daysUntil <= 14) {
        countdownMain.addClass("id-card-countdown-soon");
        rightArea.createDiv("id-card-countdown-decoration");
      }
    } catch (e) {
      console.error("渲染纪念日卡片失败:", e);
      const mainEl = dateRow.createDiv("id-card-date-main");
      mainEl.textContent = "渲染错误";
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
        subEl.textContent = "周期值无效，请编辑修正";
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
      nextRow.textContent = `下一次：${nextDate.getFullYear()}年${nextDate.getMonth() + 1}月${nextDate.getDate()}日 ${weekDayNext}`;
      
      // 右侧倒计时
      const countdownMain = rightArea.createDiv("id-card-countdown-main");
      countdownMain.textContent = daysUntil === 0 ? "今" : Math.abs(daysUntil);
      
      // 临近时添加装饰（14天内）
      if (daysUntil >= 0 && daysUntil <= 14) {
        countdownMain.addClass("id-card-countdown-soon");
        rightArea.createDiv("id-card-countdown-decoration");
      }
    } catch (e) {
      console.error("渲染周期事件卡片失败:", e);
      const mainEl = dateRow.createDiv("id-card-date-main");
      mainEl.textContent = "渲染错误";
    }
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
    modal.modalEl.addClass("id-modal");
    modal.modalEl.style.padding = "0";
    modal.modalEl.style.width = "420px";
    modal.modalEl.style.maxWidth = "92vw";
    modal.contentEl.addClass("id-modal-content");
    const modalNode = modal.contentEl;
    const removeOverlay = () => modal.close();
    // 收掉框架自带的 X 关闭按钮与空头部占位（新版弹窗结构）；
    // 关闭按钮在 onOpen 后才挂载，rAF/100ms 延迟重试
    const sweepChrome = () => {
      modal.containerEl.querySelectorAll(".modal-header-button, .modal-close-button").forEach((el) => el.remove());
      const header = modal.modalEl.querySelector(":scope > .modal-header");
      if (header) header.remove();
    };
    sweepChrome();
    requestAnimationFrame(sweepChrome);
    setTimeout(sweepChrome, 100);

    // 标题
    const title = document.createElement("h3");
    title.textContent = editDay ? "编辑日子" : "添加日子";
    modalNode.appendChild(title);
    
    // 名称
    const nameGroup = document.createElement("div");
    nameGroup.className = "id-modal-group";
    const nameLabel = document.createElement("label");
    nameLabel.textContent = "名称";
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = "例如：结婚纪念日";
    if (editDay) nameInput.value = editDay.name;
    nameGroup.appendChild(nameLabel);
    nameGroup.appendChild(nameInput);
    modalNode.appendChild(nameGroup);
    
    // 类型
    const typeGroup = document.createElement("div");
    typeGroup.className = "id-modal-group";
    const typeLabel = document.createElement("label");
    typeLabel.textContent = "类型";
    const typeSelect = document.createElement("select");
    const optAnniversary = document.createElement("option");
    optAnniversary.value = "anniversary";
    optAnniversary.textContent = "纪念日";
    const optBirthday = document.createElement("option");
    optBirthday.value = "birthday";
    optBirthday.textContent = "生日";
    const optCycle = document.createElement("option");
    optCycle.value = "cycle";
    optCycle.textContent = "周期事件";
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
    const typeHint = document.createElement("div");
    typeHint.className = "id-modal-hint";
    typeHint.textContent = "纪念日显示倒计时和周年数，生日显示年龄、属相和星座，周期事件支持每月/每季度/每年/每周";
    typeGroup.appendChild(typeHint);
    modalNode.appendChild(typeGroup);
    
    // ========== 周期事件输入区域 ==========
    const cycleGroup = document.createElement("div");
    cycleGroup.className = "id-modal-group";
    const cycleLabel = document.createElement("label");
    cycleLabel.textContent = "周期";
    cycleGroup.appendChild(cycleLabel);
    
    const cyclePicker = document.createElement("div");
    cyclePicker.className = "id-date-picker";
    
    // 周期类型选择
    const cycleTypeSelect = document.createElement("select");
    const cycleTypes = [
      { value: "monthly", text: "每月" },
      { value: "quarterly", text: "每季度" },
      { value: "yearly", text: "每年" },
      { value: "weekly", text: "每周" }
    ];
    cycleTypes.forEach(ct => {
      const opt = document.createElement("option");
      opt.value = ct.value;
      opt.textContent = ct.text;
      cycleTypeSelect.appendChild(opt);
    });
    
    // 周期值输入容器
    const cycleValueContainer = document.createElement("div");
    cycleValueContainer.style.display = "flex";
    cycleValueContainer.style.gap = "8px";
    cycleValueContainer.style.marginTop = "8px";
    
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
        const daySelect = document.createElement("select");
        for (let d = 1; d <= 31; d++) {
          const opt = document.createElement("option");
          opt.value = String(d);
          opt.textContent = `${d}号`;
          daySelect.appendChild(opt);
        }
        cycleValueInput = daySelect;
        cycleValueContainer.appendChild(daySelect);
      } else if (cycleType === "quarterly") {
        // 每季度：选择月份（1-3）和日期
        const monthSelect = document.createElement("select");
        for (let m = 1; m <= 3; m++) {
          const opt = document.createElement("option");
          opt.value = String(m);
          opt.textContent = `第${m}个月`;
          monthSelect.appendChild(opt);
        }
        cycleMonthInput = monthSelect;

        const daySelect = document.createElement("select");
        for (let d = 1; d <= 31; d++) {
          const opt = document.createElement("option");
          opt.value = String(d);
          opt.textContent = `${d}号`;
          daySelect.appendChild(opt);
        }
        cycleDayInput = daySelect;

        cycleValueContainer.appendChild(monthSelect);
        cycleValueContainer.appendChild(daySelect);
      } else if (cycleType === "yearly") {
        // 每年：选择月份和日期
        const monthSelect = document.createElement("select");
        for (let m = 1; m <= 12; m++) {
          const opt = document.createElement("option");
          opt.value = String(m);
          opt.textContent = `${m}月`;
          monthSelect.appendChild(opt);
        }
        cycleMonthInput = monthSelect;

        const daySelect = document.createElement("select");
        // 日选项按所选月份动态生成（以闰年为基准，2月给到 29）：
        // 2-29 闰年精确、平年由 createValidDate 钳制为 2-28，与说明文案一致；
        // 此前固定 1-31，可选出「每年 2-29」这类校验器拒绝的组合，保存成功但条目消失
        const rebuildDays = () => {
          const m = parseInt(monthSelect.value) || 1;
          const maxDay = getDaysInMonth(2020, m - 1);
          const currentDay = daySelect.value ? parseInt(daySelect.value) : 1;
          daySelect.innerHTML = "";
          for (let d = 1; d <= maxDay; d++) {
            const opt = document.createElement("option");
            opt.value = String(d);
            opt.textContent = `${d}日`;
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
        const weekSelect = document.createElement("select");
        const weekDays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
        weekDays.forEach((wd, i) => {
          const opt = document.createElement("option");
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
    const cycleHint = document.createElement("div");
    cycleHint.className = "id-modal-hint";
    cycleHint.textContent = "如日期超出当月天数，自动调整为该月最后一天（如2月31号→2月28/29号）";
    cycleGroup.appendChild(cycleHint);
    modalNode.appendChild(cycleGroup);
    
    // ========== 日期选择器（年/月/日下拉框）==========
    const dateGroup = document.createElement("div");
    dateGroup.className = "id-modal-group";
    const dateLabel = document.createElement("label");
    dateLabel.textContent = "日期";
    dateGroup.appendChild(dateLabel);
    
    const datePicker = document.createElement("div");
    datePicker.className = "id-date-picker";
    
    // 年份选择
    const yearSelect = document.createElement("select");
    const currentYear = new Date().getFullYear();
    // 编辑回填时若 editDay.year 超出默认范围（< 1900 或 > currentYear），扩展上限/下限以容纳
    const yearLower = (editDay && editDay.year && editDay.year < 1900) ? editDay.year : 1900;
    const yearUpper = (editDay && editDay.year && editDay.year > currentYear) ? editDay.year : currentYear;
    for (let y = yearUpper; y >= yearLower; y--) {
      const opt = document.createElement("option");
      opt.value = String(y);
      opt.textContent = `${y}年`;
      yearSelect.appendChild(opt);
    }
    if (editDay) {
      yearSelect.value = String(editDay.year);
    }
    
    // 月份选择
    const monthSelect = document.createElement("select");
    for (let m = 1; m <= 12; m++) {
      const opt = document.createElement("option");
      opt.value = String(m);
      opt.textContent = `${m}月`;
      monthSelect.appendChild(opt);
    }
    if (editDay) {
      monthSelect.value = String(editDay.month);
    } else {
      monthSelect.value = String(new Date().getMonth() + 1);
    }
    
    // 日期选择
    const daySelect = document.createElement("select");
    const updateDays = (isLunarMode) => {
      // 保留当前已选日，切换模式后尽量恢复
      const currentDay = daySelect.value ? parseInt(daySelect.value) : 1;
      if (isLunarMode) {
        // 农历：每月最多30天
        daySelect.innerHTML = "";
        for (let d = 1; d <= 30; d++) {
          const opt = document.createElement("option");
          opt.value = String(d);
          opt.textContent = LUNAR_DAY_NAMES[d - 1] || `${d}日`;
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
          const opt = document.createElement("option");
          opt.value = String(d);
          opt.textContent = `${d}日`;
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
      monthSelect.innerHTML = "";
      for (let m = 1; m <= 12; m++) {
        const opt = document.createElement("option");
        opt.value = String(m);
        opt.textContent = isLunarMode ? LUNAR_MONTH_NAMES[m - 1] + "月" : `${m}月`;
        monthSelect.appendChild(opt);
      }
    };
    
    yearSelect.addEventListener("change", () => updateDays(lunarCheck.checked));
    monthSelect.addEventListener("change", () => updateDays(lunarCheck.checked));
    
    // 农历选项
    const lunarGroup = document.createElement("div");
    lunarGroup.className = "id-modal-checkbox";
    const lunarCheck = document.createElement("input");
    lunarCheck.type = "checkbox";
    lunarCheck.id = "lunar-check";
    const lunarLabel = document.createElement("span");
    lunarLabel.textContent = "农历日期";
    if (editDay && editDay.isLunar) lunarCheck.checked = true;
    lunarGroup.appendChild(lunarCheck);
    lunarGroup.appendChild(lunarLabel);
    
    // 闰月选项
    const leapMonthGroup = document.createElement("div");
    leapMonthGroup.className = "id-modal-checkbox";
    leapMonthGroup.style.marginTop = "8px";
    const leapMonthCheck = document.createElement("input");
    leapMonthCheck.type = "checkbox";
    leapMonthCheck.id = "leap-month-check";
    const leapMonthLabel = document.createElement("span");
    leapMonthLabel.textContent = "闰月（农历生日专用）";
    if (editDay && editDay.isLeapMonth) leapMonthCheck.checked = true;
    leapMonthGroup.appendChild(leapMonthCheck);
    leapMonthGroup.appendChild(leapMonthLabel);
    
    // 切换农历/公历时更新选项
    lunarCheck.addEventListener("change", () => {
      const isLunar = lunarCheck.checked;
      updateMonths(isLunar);
      updateDays(isLunar);
      dateLabel.textContent = isLunar ? "农历日期" : "日期";
      leapMonthGroup.style.display = isLunar && typeSelect.value === "birthday" ? "block" : "none";
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
        dateLabel.textContent = "农历日期";
        leapMonthGroup.style.display = "block";
      } else {
        leapMonthGroup.style.display = "none";
      }
    } else {
      // 新建时默认为今天
      const today = new Date();
      monthSelect.value = String(today.getMonth() + 1);
      updateDays(false);
      daySelect.value = String(today.getDate());
      leapMonthGroup.style.display = "none";
    }
    
    datePicker.appendChild(yearSelect);
    datePicker.appendChild(monthSelect);
    datePicker.appendChild(daySelect);
    dateGroup.appendChild(datePicker);
    // 日期说明
    const dateHint = document.createElement("div");
    dateHint.className = "id-modal-hint";
    dateHint.textContent = "选择日期的年、月、日";
    dateGroup.appendChild(dateHint);
    modalNode.appendChild(dateGroup);
    modalNode.appendChild(lunarGroup);
    modalNode.appendChild(leapMonthGroup);
    // 农历说明
    const lunarHint = document.createElement("div");
    lunarHint.className = "id-modal-hint";
    lunarHint.textContent = "勾选后输入农历日期，系统会自动转换为公历显示";
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
      leapMonthGroup.style.display = !isCycle && isBirthday && lunarCheck.checked ? "block" : "none";
      lunarHint.style.display = isCycle || !isBirthday ? "none" : "block";

      // 切到非生日类型时复位农历勾选与公历 UI：
      // 否则残留的勾选会在保存时把「| 农历」标记写进纪念日/周期条目
      if (!isBirthday) {
        if (lunarCheck.checked) {
          const keepMonth = monthSelect.value;
          lunarCheck.checked = false;
          updateMonths(false);
          if (keepMonth) monthSelect.value = keepMonth;
          updateDays(false);
          dateLabel.textContent = "日期";
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
        if (cycleValueInput) cycleValueInput.value = editDay.cycleValue;
      } else if (editDay.cycleType === "quarterly" || editDay.cycleType === "yearly") {
        const parts = editDay.cycleValue.split("-");
        if (cycleMonthInput && parts[0]) cycleMonthInput.value = parts[0];
        if (cycleDayInput && parts[1]) cycleDayInput.value = parts[1];
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
    const btnGroup = document.createElement("div");
    btnGroup.className = "id-modal-btns";
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "取消";
    const saveBtn = document.createElement("button");
    saveBtn.textContent = "保存";
    saveBtn.className = "id-modal-save";
    btnGroup.appendChild(cancelBtn);
    btnGroup.appendChild(saveBtn);
    modalNode.appendChild(btnGroup);
    
    // 删除按钮（仅编辑模式显示）
    let deleteBtn = null;
    if (editDay) {
      deleteBtn = document.createElement("button");
      deleteBtn.className = "id-modal-delete";
      deleteBtn.textContent = "删除";
      modalNode.appendChild(deleteBtn);
      
      deleteBtn.addEventListener("click", async () => {
        const confirmed = confirm(`确定删除「${editDay.name}」吗？`);
        if (!confirmed) return;

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
            throw new Error("该记录已被外部改动，请刷新后重试");
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
          new import_obsidian.Notice(e && e.message ? e.message : "删除失败");
        }
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
        new import_obsidian.Notice("请填写名称");
        saveBtn.disabled = false;
        return;
      }

      // 名称含 | 会破坏「- 名称 | 日期」的解析格式（保存后无法被重新识别）
      if (name.includes("|")) {
        new import_obsidian.Notice("名称不能包含 | 字符（会破坏数据文件格式）");
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
            new import_obsidian.Notice("已存在相同名称和周期的日子，请修改");
            saveBtn.disabled = false;
            return;
          }

          if (editDay) {
            const index = this.days.findIndex(d => d.id === editDay.id && d.type === editDay.type);
            if (index < 0) {
              // 目标条目已找不到：明确报错并关闭弹窗，不落盘、不提示「已更新」
              removeOverlay();
              throw new Error("该记录已被外部改动，请刷新后重试");
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
            new import_obsidian.Notice("日期无效，请重新选择");
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
            new import_obsidian.Notice("已存在相同名称和日期的日子，请修改");
            saveBtn.disabled = false;
            return;
          }

          if (editDay) {
            const index = this.days.findIndex(d => d.id === editDay.id && d.type === editDay.type);
            if (index < 0) {
              // 目标条目已找不到：明确报错并关闭弹窗，不落盘、不提示「已更新」
              removeOverlay();
              throw new Error("该记录已被外部改动，请刷新后重试");
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
        new import_obsidian.Notice(e && e.message ? e.message : "保存失败");
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
      if (this._activeModal === modal) this._activeModal = null;
    };
    // 无障碍：弹窗打开即聚焦保存按钮，键盘用户无需先 Tab 穿过被遮罩的视图内容
    saveBtn.focus();
  }
  
  async onClose() {
    // 清理未触发的长按定时器，避免关闭视图后仍弹出编辑窗口
    for (const t of this._pressTimers) {
      clearTimeout(t);
    }
    this._pressTimers.clear();
    // 清理：视图关闭时关闭仍打开的编辑弹窗（DOM 移除由 Modal 框架管理）
    if (this._activeModal) {
      this._activeModal.close();
      this._activeModal = null;
    }
  }
};

// ==================== 设置面板 ====================

var ImportantDaysSettingTab = class extends import_obsidian2.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  
  display() {
    const { containerEl } = this;
    containerEl.empty();
    
    containerEl.createEl("h2", { text: "重要日子设置" });

    // 手动指定数据文件路径（与自动扫描互补，README 所述「手动指定」对应此处）
    new import_obsidian2.Setting(containerEl)
      .setName("数据文件路径（手动指定）")
      .setDesc("通常用下方「重新扫描」自动查找即可。也可手动指定数据文件的库内路径（如：笔记/重要日子.md），修改后立即生效；文件不存在时，添加日子会自动创建")
      .addText((text) => {
        const prevValue = this.plugin.settings.dataFile;
        let pending = prevValue;
        text
          .setPlaceholder("例如：笔记/重要日子.md")
          .setValue(this.plugin.settings.dataFile)
          .onChange((value) => {
            // 按键过程只暂存规范化结果，不把半成品路径写进配置
            pending = value.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
          });
        text.inputEl.addEventListener("change", async () => {
          // 失焦/回车才提交：非空且以 .md 结尾才生效，否则回退旧值并提示
          if (pending !== prevValue) {
            if (pending && pending.endsWith(".md")) {
              this.plugin.settings.dataFile = pending;
              await this.plugin.saveSettings();
            } else {
              new import_obsidian2.Notice("路径需为以 .md 结尾的库内路径（如：笔记/重要日子.md），已保留原值");
              text.setValue(prevValue);
              pending = prevValue;
            }
          }
          // 重读数据并刷新视图，重绘设置页反映新路径状态
          this.plugin._preloadDays();
          this.plugin.refreshView();
          this.display();
        });
      });

    const dataFile = this.plugin.settings.dataFile;

    if (dataFile) {
      // 已有数据文件
      new import_obsidian2.Setting(containerEl)
        .setName("数据文件")
        .setDesc(dataFile)
        .addButton((btn) => {
          btn.setButtonText("重新扫描");
          btn.onClick(async () => {
            btn.setButtonText("...");
            btn.setDisabled(true);

            const hits = await scanForDataFiles(this.app);
            const found = hits.length > 0 ? hits[0] : null;
            if (hits.length > 1) {
              new import_obsidian2.Notice(`找到 ${hits.length} 个匹配文件，已使用第一个；其他候选可在「数据文件路径」中手动指定：${hits.slice(1, 4).join("、")}`);
            }
            if (found && found !== dataFile) {
              this.plugin.settings.dataFile = found;
              await this.plugin.saveSettings();
              this.display();
              this.plugin.refreshView();
              new import_obsidian2.Notice(`已找到：${found}`);
            } else if (found) {
              btn.setButtonText("重新扫描");
              btn.setDisabled(false);
              new import_obsidian2.Notice("当前文件已是最新");
            } else {
              btn.setButtonText("重新扫描");
              btn.setDisabled(false);
              new import_obsidian2.Notice("未找到其他数据文件");
            }
          });
        });
    } else {
      // 未找到数据文件
      new import_obsidian2.Setting(containerEl)
        .setName("数据文件")
        .setDesc("未找到数据文件，点击「添加日子」会自动创建")
        .addButton((btn) => {
          btn.setButtonText("扫描");
          btn.onClick(async () => {
            btn.setButtonText("...");
            btn.setDisabled(true);

            const hits = await scanForDataFiles(this.app);
            const found = hits.length > 0 ? hits[0] : null;
            if (hits.length > 1) {
              new import_obsidian2.Notice(`找到 ${hits.length} 个匹配文件，已使用第一个；其他候选可在「数据文件路径」中手动指定：${hits.slice(1, 4).join("、")}`);
            }
            if (found) {
              this.plugin.settings.dataFile = found;
              await this.plugin.saveSettings();
              this.display();
              this.plugin.refreshView();
              new import_obsidian2.Notice(`已找到：${found}`);
            } else {
              btn.setButtonText("扫描");
              btn.setDisabled(false);
              new import_obsidian2.Notice("未找到数据文件");
            }
          });
        });
    }
    
    // 操作提示（新用户引导）：编辑方式 + 数据文件可直接手编（本插件数据层的核心卖点）
    const tips = containerEl.createDiv("id-settings-tips");
    tips.createEl("h3", { text: "使用提示" });
    const tipList = tips.createEl("ul");
    for (const tip of [
      "手机端长按卡片编辑，电脑端双击卡片编辑；点击右上角「+」添加",
      "数据文件是普通 Markdown，可直接手动编辑：`- 名称 | 2026-01-01`，生日第三列标注「农历」或「农历闰」",
      "手改内容、条目备注与自建小节都会被保留；外部改动与插件保存冲突时会拒绝写入并提示刷新",
      "14 天内的事件倒计时会高亮显示",
    ]) {
      tipList.createEl("li", { text: tip });
    }
  }
};

var DEFAULT_SETTINGS = {
  dataFile: ""
};

/**
 * 扫描 vault 中以「# 重要日子」为 H1 标题的文件
 * 优先用 metadataCache 的 headings 判断（不读全文，大库不卡顿）；
 * 缓存缺失时回退读全文按 H1 行精确匹配。原实现的 includes 子串匹配会把
 * "## 重要日子" 或正文提及这四个字的任意笔记误判为命中
 * @param app - Obsidian App 实例
 * @returns 所有命中文件的路径列表（按 vault 顺序），未找到为空数组
 */
async function scanForDataFiles(app) {
  const H1_RE = /^#\s*重要日子\s*$/m;
  const hits = [];
  const files = app.vault.getMarkdownFiles();
  for (const file of files) {
    try {
      const cache = app.metadataCache.getFileCache(file);
      const headings = cache ? cache.headings : null;
      if (headings) {
        if (headings.some((h) => h.level === 1 && h.heading.trim() === "重要日子")) {
          hits.push(file.path);
        }
        continue;
      }
      // 缓存未就绪（新建/未索引）：回退读全文精确匹配 H1 行（容掉个别编辑器写入的 BOM）
      const content = (await app.vault.cachedRead(file)).replace(/^\uFEFF/, "");
      if (H1_RE.test(content)) {
        hits.push(file.path);
      }
    } catch (e) {
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
    await this.loadSettings();

    // 仅在用户未手动设置 dataFile 时才自动扫描，避免覆盖用户配置。
    // 先给默认路径让插件立即可用，扫描延迟到 onload 之后执行，避免大库首启阻塞
    if (!this.settings.dataFile) {
      this.settings.dataFile = "重要日子.md";
      await this.saveSettings();
      // 句柄留存以便 onunload 清理；扫描失败不产生 unhandled rejection
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
    this.addRibbonIcon("heart", "重要日子", () => {
      this.activateView();
    });
    
    // 添加命令
    this.addCommand({
      id: "open-important-days",
      name: "打开重要日子",
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
      new import_obsidian2.Notice("重要日子：无法打开视图，请重启 Obsidian 后重试", 3000);
    }
  }
  
  refreshView() {
    // 自身 saveDays 触发的 modify 事件已由调用处主动 render，这里跳过避免重复渲染
    if (this._selfSaving) return;

    // 防抖：外部连续写入（如同步工具批量更新）时只渲染最后一次
    if (this._refreshTimer) {
      clearTimeout(this._refreshTimer);
    }
    this._refreshTimer = setTimeout(() => {
      this._refreshTimer = null;
      const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_IMPORTANT_DAYS);
      for (const leaf of leaves) {
        if (leaf.view instanceof ImportantDaysView) {
          leaf.view.loadDays().then(() => {
            leaf.view.render();
            this._daysCache = leaf.view.days.slice();
          }).catch((e) => {
            console.error("刷新视图失败:", e);
            new import_obsidian2.Notice("数据文件读取失败");
          });
        }
      }
    }, 200);
  }

  onunload() {
    if (this._scanTimer) {
      clearTimeout(this._scanTimer);
      this._scanTimer = null;
    }
    if (this._refreshTimer) {
      clearTimeout(this._refreshTimer);
      this._refreshTimer = null;
    }
    // 关闭本插件的所有视图，避免禁用/重载后残留死视图
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_IMPORTANT_DAYS);
  }
};

module.exports = ImportantDaysPlugin;
