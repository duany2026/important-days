/*
 * ============================================================
 * 重要日子插件 (Important Days Plugin)
 * ============================================================
 *
 * 插件功能：记录生活中的重要日子，支持纪念日、生日倒计时
 * 版本：1.3.1
 * 作者：duany
 * 许可证：MIT
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

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ImportantDaysPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// src/DateUtils.ts
// ==================== 日期工具模块 ====================

/** 星期名称数组 */
var WEEKDAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

/**
 * 计算距离目标日期的天数
 * @param targetDate - 目标日期
 * @returns 正数表示未来，负数表示过去
 */
function getDaysUntil(targetDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 获取日期是星期几
 * @param date - 日期对象或日期字符串
 * @returns 星期名称
 */
function getWeekDay(date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return WEEKDAY_NAMES[d.getDay()];
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
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * 计算已过天数
 * @param startDate - 开始日期
 * @returns 已过天数
 */
function getDaysPassed(startDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
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
 * 获取下一次生日日期
 * @param birthDate - 出生日期
 * @returns 下一次生日的日期对象
 */
function getNextBirthday(birthDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const birth = new Date(birthDate);
  const birthMonth = birth.getMonth();
  const birthDay = birth.getDate();
  
  // 判断是否是闰年2月29日生日
  const isLeapBirthday = isLeapDayBirthday(birthMonth + 1, birthDay);
  
  let nextBirthday;
  if (isLeapBirthday) {
    // 闰年2月29日生日
    const currentYear = today.getFullYear();
    
    // 检查今年是否是闰年
    if (isLeapYear(currentYear)) {
      nextBirthday = new Date(currentYear, 1, 29); // 2月29日
    } else {
      nextBirthday = new Date(currentYear, 1, 28); // 非闰年显示2月28日
    }
    
    // 如果已过，检查明年
    if (nextBirthday <= today) {
      const nextYear = currentYear + 1;
      if (isLeapYear(nextYear)) {
        nextBirthday = new Date(nextYear, 1, 29);
      } else {
        nextBirthday = new Date(nextYear, 1, 28);
      }
    }
  } else {
    // 普通生日
    nextBirthday = new Date(today.getFullYear(), birthMonth, birthDay);
    
    if (nextBirthday <= today) {
      nextBirthday.setFullYear(today.getFullYear() + 1);
    }
  }
  
  return nextBirthday;
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
      
      // 如果已过，计算下个月
      if (nextDate <= today) {
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
      
      // 如果已过，计算下个季度
      if (nextDate <= today) {
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
      
      // 如果已过，计算明年
      if (nextDate <= today) {
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
      const daysToAdd = daysUntilTarget === 0 ? 7 : daysUntilTarget;
      
      nextDate = new Date(today);
      nextDate.setDate(today.getDate() + daysToAdd);
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

// src/LunarCalendar.ts
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
  
  if (year < 1900 || year > 2100) {
    return null;
  }
  
  let offset = Math.floor((date.getTime() - new Date(1900, 0, 31).getTime()) / 86400000);
  let lunarYear = 1900;
  let daysInYear = getLunarYearDays(lunarYear);
  
  while (offset >= daysInYear) {
    offset -= daysInYear;
    lunarYear++;
    daysInYear = getLunarYearDays(lunarYear);
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
    
    if (month === startMonth && day >= startDay) return c.name;
    if (month === endMonth && day <= endDay) return c.name;
  }
  return "摩羯座";
}

// src/DayParser.ts
// ==================== 日子数据解析模块 ====================

/**
 * 解析日子数据
 * @param content - MD 文件内容
 * @returns 日子数组
 */
function parseDays(content) {
  const days = [];
  const lines = content.split("\n");
  let currentType = "anniversary"; // 默认类型
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // 检测 section 标题
    if (trimmed.startsWith("## ")) {
      const sectionName = trimmed.slice(3).trim();
      if (sectionName.includes("生日")) {
        currentType = "birthday";
      } else if (sectionName.includes("纪念日")) {
        currentType = "anniversary";
      } else if (sectionName.includes("周期")) {
        currentType = "cycle";
      }
      continue;
    }
    
    // 解析列表项
    if (trimmed.startsWith("- ")) {
      const item = trimmed.slice(2);
      const parts = item.split("|").map(p => p.trim());
      
      if (parts.length >= 2) {
        const name = parts[0];
        const dateStr = parts[1];
        const thirdField = parts[2] || "";
        const isLunar = thirdField.includes("农历");
        const isLeapMonth = thirdField.includes("闰");
        
        // 解析周期事件
        if (currentType === "cycle") {
          const cycleMatch = dateStr.match(/^(每月|每季度|每年|每周)\s+(.+)$/);
          if (cycleMatch) {
            const cycleTypeText = cycleMatch[1];
            const cycleValue = cycleMatch[2];
            
            let cycleType;
            if (cycleTypeText === "每月") cycleType = "monthly";
            else if (cycleTypeText === "每季度") cycleType = "quarterly";
            else if (cycleTypeText === "每年") cycleType = "yearly";
            else if (cycleTypeText === "每周") cycleType = "weekly";
            
            days.push({
              id: `${name}-${dateStr}`,
              name,
              type: "cycle",
              cycleType,
              cycleValue
            });
          }
        } else {
          // 解析日期
          const dateMatch = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
          if (dateMatch) {
            const year = parseInt(dateMatch[1]);
            const month = parseInt(dateMatch[2]);
            const day = parseInt(dateMatch[3]);
            
            days.push({
              id: `${name}-${dateStr}`,
              name,
              year,
              month,
              day,
              type: currentType,
              isLunar,
              isLeapMonth: isLunar && isLeapMonth
            });
          }
        }
      }
    }
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
      
      content += `- ${day.name} | ${cycleText} ${day.cycleValue}\n`;
    }
    content += "\n";
  }
  
  return content;
}

// src/ImportantDaysView.ts
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
    this.containerEl = this.contentEl.createDiv("important-days-container");
    await this.loadDays();
    this.render();
  }
  
  async loadDays() {
    const file = this.app.vault.getAbstractFileByPath(this.plugin.settings.dataFile);
    if (file instanceof import_obsidian.TFile) {
      const content = await this.app.vault.read(file);
      this.days = parseDays(content);
    } else {
      this.days = [];
    }
  }
  
  async saveDays() {
    const content = generateDaysContent(this.days);
    const file = this.app.vault.getAbstractFileByPath(this.plugin.settings.dataFile);
    if (file instanceof import_obsidian.TFile) {
      await this.app.vault.modify(file, content);
    } else {
      // 文件不存在，创建新文件
      // 先确保文件夹存在
      const folderPath = this.plugin.settings.dataFile.substring(0, this.plugin.settings.dataFile.lastIndexOf("/"));
      if (folderPath) {
        const folder = this.app.vault.getAbstractFileByPath(folderPath);
        if (!folder) {
          await this.app.vault.createFolder(folderPath);
        }
      }
      await this.app.vault.create(this.plugin.settings.dataFile, content);
    }
  }
  
  render() {
    this.containerEl.empty();
    
    // 检查文件是否存在
    const file = this.app.vault.getAbstractFileByPath(this.plugin.settings.dataFile);
    const fileExists = file instanceof import_obsidian.TFile;
    
    // 头部
    const header = this.containerEl.createDiv("id-header");
    const h2 = header.createEl("h2");
    h2.textContent = "重要日子";
    
    // 按钮组
    const btnGroup = header.createDiv("id-header-btns");
    
    const refreshBtn = btnGroup.createEl("button", { cls: "id-refresh-btn" });
    refreshBtn.textContent = "↻";
    refreshBtn.title = "刷新";
    refreshBtn.addEventListener("click", async () => {
      await this.loadDays();
      this.render();
    });
    
    const addBtn = btnGroup.createEl("button", { cls: "id-add-btn" });
    addBtn.title = "添加";
    addBtn.addEventListener("click", () => this.showAddModal());
    
    // 文件不存在提示
    if (!fileExists) {
      const empty = this.containerEl.createDiv("id-empty");
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
    const cardsContainer = this.containerEl.createDiv("id-cards-container");
    
    // 按倒计时排序
    const sortedDays = this.getSortedDays();
    
    for (const day of sortedDays) {
      this.renderCard(cardsContainer, day);
    }
    
    // 统一所有卡片高度
    this.uniformCardHeights(cardsContainer);
    
    // 空状态
    if (this.days.length === 0) {
      const empty = this.containerEl.createDiv("id-empty");
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
    
    // 延迟执行，等待渲染完成
    requestAnimationFrame(() => {
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
      const daysA = this.getDaysUntilNext(a);
      const daysB = this.getDaysUntilNext(b);
      return daysA - daysB;
    });
  }
  
  getDaysUntilNext(day) {
    if (day.type === "cycle") {
      const nextDate = getNextCycleDate(day.cycleType, day.cycleValue);
      return getDaysUntil(nextDate);
    } else if (day.type === "birthday") {
      const nextBirthday = this.getNextBirthday(day);
      return getDaysUntil(nextBirthday);
    } else {
      // 纪念日：计算下一次周年
      const today = new Date();
      const next = new Date(today.getFullYear(), day.month - 1, day.day);
      if (next < today) {
        next.setFullYear(today.getFullYear() + 1);
      }
      return getDaysUntil(next);
    }
  }
  
  getNextBirthday(day) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let nextYear = today.getFullYear();
    let nextMonth = day.month - 1;
    let nextDay = day.day;
    
    // 判断是否是闰年2月29日生日（公历）
    const isLeapBirthday = !day.isLunar && isLeapDayBirthday(day.month, day.day);
    
    // 如果是农历生日，需要转换
    if (day.isLunar) {
      // 检查是否是闰月生日
      const leapMonth = getLeapMonth(nextYear);
      const isLeapMonthBirthday = day.isLeapMonth && leapMonth === day.month;
      
      // 优先尝试闰月日期
      if (isLeapMonthBirthday) {
        // 当年有闰月，使用闰月日期
        const lunarDate = lunarToSolar(nextYear, day.month, day.day, true);
        if (lunarDate) {
          nextMonth = lunarDate.getMonth();
          nextDay = lunarDate.getDate();
        }
      } else {
        // 普通农历日期或无闰月年份
        const lunarDate = lunarToSolar(nextYear, day.month, day.day, false);
        if (lunarDate) {
          nextMonth = lunarDate.getMonth();
          nextDay = lunarDate.getDate();
        }
      }
    }
    
    let next = new Date(nextYear, nextMonth, nextDay);
    
    // 处理闰年2月29日生日
    if (isLeapBirthday) {
      if (!isLeapYear(nextYear)) {
        // 非闰年，使用2月28日
        next = new Date(nextYear, 1, 28);
      }
    }
    
    if (next <= today) {
      nextYear++;
      
      if (day.isLunar) {
        const leapMonth = getLeapMonth(nextYear);
        const isLeapMonthBirthday = day.isLeapMonth && leapMonth === day.month;
        
        if (isLeapMonthBirthday) {
          const lunarDate = lunarToSolar(nextYear, day.month, day.day, true);
          if (lunarDate) {
            next = lunarDate;
          }
        } else {
          const lunarDate = lunarToSolar(nextYear, day.month, day.day, false);
          if (lunarDate) {
            next = lunarDate;
          }
        }
      } else {
        next = new Date(nextYear, nextMonth, nextDay);
        
        // 处理闰年2月29日生日
        if (isLeapBirthday) {
          if (!isLeapYear(nextYear)) {
            next = new Date(nextYear, 1, 28);
          }
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
      
      // 长按编辑功能
      let pressTimer = null;
      card.addEventListener("touchstart", (e) => {
        pressTimer = setTimeout(() => {
          this.showEditModal(day);
        }, 500);
      });
      card.addEventListener("touchend", () => {
        if (pressTimer) clearTimeout(pressTimer);
      });
      card.addEventListener("touchmove", () => {
        if (pressTimer) clearTimeout(pressTimer);
      });
      
      // 电脑端双击编辑
      card.addEventListener("dblclick", () => {
        this.showEditModal(day);
      });
      
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
      
      // 年龄（即将达到的年龄）
      const age = getAge(solarDate) + 1;
      
      // 已出生天数
      const daysPassed = getDaysPassed(solarDate);
      
      // 原始日期是星期几
      const weekDayOriginal = getWeekDay(solarDate);
      
      // 属相星座（属相按农历年份计算）
      const lunarYear = lunarDate ? lunarDate.year : day.year;
      const zodiac = getZodiac(lunarYear);
      const constellation = getConstellation(day.month, day.day);
      
      // 判断是否是特殊生日
      const isLeapBirthday = !day.isLunar && isLeapDayBirthday(day.month, day.day);
      const isLeapMonthBirthday = day.isLunar && day.isLeapMonth;
      
      // 日期显示
      if (day.isLunar) {
        const lunarText = getLunarDateText({ year: day.year, month: day.month, day: day.day });
        const mainEl = dateRow.createDiv("id-card-date-main");
        let mainText = `农历 ${lunarText || day.month + "月" + day.day + "日"}`;
        if (isLeapMonthBirthday) {
          mainText += "（闰月）";
        }
        mainEl.textContent = `${mainText} · 属${zodiac} · ${constellation}`;
        const subEl = dateRow.createDiv("id-card-date-sub");
        subEl.textContent = `${solarDate.getFullYear()}年${solarDate.getMonth() + 1}月${solarDate.getDate()}日 ${weekDayOriginal} · 即将${age}岁`;
      } else {
        const mainEl = dateRow.createDiv("id-card-date-main");
        let mainText = `${day.year}年${day.month}月${day.day}日`;
        if (isLeapBirthday) {
          mainText += "（闰年生日）";
        }
        mainEl.textContent = `${mainText} ${weekDayOriginal} · 即将${age}岁`;
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
      
      // 闰年生日特殊提示
      if (isLeapBirthday && !isLeapYear(nextBirthday.getFullYear())) {
        nextText += "（今年2月28日）";
      }
      
      // 农历闰月生日特殊提示
      if (isLeapMonthBirthday) {
        const nextYearLeapMonth = getLeapMonth(nextBirthday.getFullYear());
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
      const originalDate = new Date(day.year, day.month - 1, day.day);
      
      // 已过天数和月数
      const daysPassed = getDaysPassed(originalDate);
      const monthsPassed = getMonthsPassed(originalDate);
      
      // 原始日期是星期几
      const weekDayOriginal = getWeekDay(originalDate);
      
      // 日期显示（含星期几）
      const mainEl = dateRow.createDiv("id-card-date-main");
      mainEl.textContent = `${day.year}年${day.month}月${day.day}日 ${weekDayOriginal}`;
      
      // 周年（即将达到的周年数）
      const years = getAnniversaryYears(originalDate) + 1;
      if (years > 0) {
        const infoRow = dateRow.createDiv("id-card-date-sub");
        infoRow.textContent = `即将${years}周年`;
      }
      
      // 已过天数和月数（单独一行）
      const daysRow = dateRow.createDiv("id-card-days");
      daysRow.textContent = `已相伴 ${daysPassed} 天（${monthsPassed}个月）`;
      
      // 下一次具体日期
      const next = new Date(today.getFullYear(), day.month - 1, day.day);
      if (next < today) {
        next.setFullYear(today.getFullYear() + 1);
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
    const overlay = document.createElement("div");
    overlay.className = "id-modal-overlay";
    
    const modal = document.createElement("div");
    modal.className = "id-modal";
    
    // 标题
    const title = document.createElement("h3");
    title.textContent = editDay ? "编辑日子" : "添加日子";
    modal.appendChild(title);
    
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
    modal.appendChild(nameGroup);
    
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
    modal.appendChild(typeGroup);
    
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
    
    // 根据周期类型更新输入框
    const updateCycleValueInput = () => {
      cycleValueContainer.innerHTML = "";
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
        daySelect.id = "cycle-value-input";
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
        monthSelect.id = "cycle-month-input";
        
        const daySelect = document.createElement("select");
        for (let d = 1; d <= 31; d++) {
          const opt = document.createElement("option");
          opt.value = String(d);
          opt.textContent = `${d}号`;
          daySelect.appendChild(opt);
        }
        daySelect.id = "cycle-day-input";
        
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
        monthSelect.id = "cycle-month-input";
        
        const daySelect = document.createElement("select");
        for (let d = 1; d <= 31; d++) {
          const opt = document.createElement("option");
          opt.value = String(d);
          opt.textContent = `${d}日`;
          daySelect.appendChild(opt);
        }
        daySelect.id = "cycle-day-input";
        
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
        weekSelect.id = "cycle-value-input";
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
    modal.appendChild(cycleGroup);
    
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
    for (let y = currentYear; y >= 1900; y--) {
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
      if (isLunarMode) {
        // 农历：每月最多30天
        daySelect.innerHTML = "";
        for (let d = 1; d <= 30; d++) {
          const opt = document.createElement("option");
          opt.value = String(d);
          opt.textContent = LUNAR_DAY_NAMES[d - 1] || `${d}日`;
          daySelect.appendChild(opt);
        }
      } else {
        // 公历：根据年月计算天数
        const year = parseInt(yearSelect.value);
        const month = parseInt(monthSelect.value);
        const daysInMonth = new Date(year, month, 0).getDate();
        const currentDay = daySelect.value ? parseInt(daySelect.value) : 1;
        daySelect.innerHTML = "";
        for (let d = 1; d <= daysInMonth; d++) {
          const opt = document.createElement("option");
          opt.value = String(d);
          opt.textContent = `${d}日`;
          daySelect.appendChild(opt);
        }
        if (currentDay <= daysInMonth) {
          daySelect.value = String(currentDay);
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
      leapMonthGroup.style.display = isLunar ? "block" : "none";
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
    modal.appendChild(dateGroup);
    modal.appendChild(lunarGroup);
    modal.appendChild(leapMonthGroup);
    // 农历说明
    const lunarHint = document.createElement("div");
    lunarHint.className = "id-modal-hint";
    lunarHint.textContent = "勾选后输入农历日期，系统会自动转换为公历显示";
    modal.appendChild(lunarHint);
    
    // ========== 类型切换逻辑 ==========
    const toggleInputMode = () => {
      const isCycle = typeSelect.value === "cycle";
      
      // 切换显示/隐藏
      cycleGroup.style.display = isCycle ? "block" : "none";
      dateGroup.style.display = isCycle ? "none" : "block";
      lunarGroup.style.display = isCycle ? "none" : "block";
      leapMonthGroup.style.display = isCycle ? "none" : (lunarCheck.checked ? "block" : "none");
      lunarHint.style.display = isCycle ? "none" : "block";
    };
    
    typeSelect.addEventListener("change", toggleInputMode);
    
    // 初始化周期事件输入
    if (editDay && editDay.type === "cycle") {
      cycleTypeSelect.value = editDay.cycleType;
      updateCycleValueInput();
      
      // 设置周期值
      setTimeout(() => {
        if (editDay.cycleType === "monthly") {
          const input = document.getElementById("cycle-value-input");
          if (input) input.value = editDay.cycleValue;
        } else if (editDay.cycleType === "quarterly" || editDay.cycleType === "yearly") {
          const parts = editDay.cycleValue.split("-");
          const monthInput = document.getElementById("cycle-month-input");
          const dayInput = document.getElementById("cycle-day-input");
          if (monthInput && parts[0]) monthInput.value = parts[0];
          if (dayInput && parts[1]) dayInput.value = parts[1];
        } else if (editDay.cycleType === "weekly") {
          const input = document.getElementById("cycle-value-input");
          if (input) input.value = editDay.cycleValue;
        }
      }, 0);
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
    modal.appendChild(btnGroup);
    
    // 删除按钮（仅编辑模式显示）
    let deleteBtn = null;
    if (editDay) {
      deleteBtn = document.createElement("button");
      deleteBtn.className = "id-modal-delete";
      deleteBtn.textContent = "删除";
      modal.appendChild(deleteBtn);
      
      deleteBtn.addEventListener("click", async () => {
        const confirmed = confirm(`确定删除「${editDay.name}」吗？`);
        if (!confirmed) return;
        
        this.days = this.days.filter(d => d.id !== editDay.id);
        await this.saveDays();
        this.render();
        overlay.remove();
        new import_obsidian.Notice("已删除");
      });
    }
    
    cancelBtn.addEventListener("click", () => {
      overlay.remove();
    });
    
    saveBtn.addEventListener("click", async () => {
      const name = nameInput.value.trim();
      const type = typeSelect.value;
      
      if (!name) {
        new import_obsidian.Notice("请填写名称");
        return;
      }
      
      if (type === "cycle") {
        // 处理周期事件
        const cycleType = cycleTypeSelect.value;
        let cycleValue = "";
        
        if (cycleType === "monthly") {
          const input = document.getElementById("cycle-value-input");
          cycleValue = input ? input.value : "1";
        } else if (cycleType === "quarterly" || cycleType === "yearly") {
          const monthInput = document.getElementById("cycle-month-input");
          const dayInput = document.getElementById("cycle-day-input");
          const month = monthInput ? monthInput.value : "1";
          const day = dayInput ? dayInput.value : "1";
          cycleValue = `${month}-${day}`;
        } else if (cycleType === "weekly") {
          const input = document.getElementById("cycle-value-input");
          cycleValue = input ? input.value : "1";
        }
        
        const cycleId = `${name}-${cycleType}-${cycleValue}`;
        
        if (editDay) {
          const index = this.days.findIndex(d => d.id === editDay.id);
          if (index >= 0) {
            this.days[index] = { 
              ...this.days[index], 
              name, 
              type, 
              cycleType, 
              cycleValue,
              id: cycleId
            };
          }
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
        
        const dateValue = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        
        if (editDay) {
          const index = this.days.findIndex(d => d.id === editDay.id);
          if (index >= 0) {
            this.days[index] = { ...this.days[index], name, type, year, month, day, isLunar, isLeapMonth };
          }
        } else {
          this.days.push({
            id: `${name}-${dateValue}`,
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
      overlay.remove();
      new import_obsidian.Notice(editDay ? "已更新" : "已添加");
    });
    
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
    
    // 将 modal 添加为 overlay 的子元素
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }
  
  async deleteDay(day) {
    const confirmed = confirm(`确定删除「${day.name}」吗？`);
    if (!confirmed) return;
    
    this.days = this.days.filter(d => d.id !== day.id);
    await this.saveDays();
    this.render();
    new import_obsidian.Notice("已删除");
  }
  
  async onClose() {
    // 清理
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
            
            const found = await scanForDataFile(this.app);
            if (found && found !== dataFile) {
              this.plugin.settings.dataFile = found;
              await this.plugin.saveSettings();
              this.display();
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
            
            const found = await scanForDataFile(this.app);
            if (found) {
              this.plugin.settings.dataFile = found;
              this.plugin.settings.autoScanned = true;
              await this.plugin.saveSettings();
              this.display();
              new import_obsidian2.Notice(`已找到：${found}`);
            } else {
              btn.setButtonText("扫描");
              btn.setDisabled(false);
              new import_obsidian2.Notice("未找到数据文件");
            }
          });
        });
    }
    
    // 操作提示
    new import_obsidian2.Setting(containerEl)
      .setName("操作提示")
      .setDesc("手机端长按卡片编辑，电脑端双击卡片编辑");
  }
};

// src/main.ts
var DEFAULT_SETTINGS = {
  dataFile: "",
  autoScanned: false
};

/**
 * 扫描 vault 中包含「# 重要日子」标题的文件
 * @param app - Obsidian App 实例
 * @returns 找到的文件路径，未找到返回 null
 */
async function scanForDataFile(app) {
  const files = app.vault.getMarkdownFiles();
  for (const file of files) {
    try {
      const content = await app.vault.cachedRead(file);
      if (content.includes("# 重要日子")) {
        return file.path;
      }
    } catch (e) {
      // 忽略读取错误
    }
  }
  return null;
}

/**
 * ============================================================
 * ImportantDaysPlugin - 重要日子插件主类
 * ============================================================
 */
var ImportantDaysPlugin = class extends import_obsidian2.Plugin {
  async onload() {
    await this.loadSettings();
    
    // 自动扫描数据文件
    if (!this.settings.dataFile || !this.settings.autoScanned) {
      const found = await scanForDataFile(this.app);
      if (found) {
        this.settings.dataFile = found;
        this.settings.autoScanned = true;
        await this.saveSettings();
      } else if (!this.settings.dataFile) {
        // 未找到，使用默认值
        this.settings.dataFile = "重要日子.md";
        await this.saveSettings();
      }
    }
    
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
    
    // 监听数据文件变更
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
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
        if (oldPath === this.settings.dataFile || (file instanceof import_obsidian2.TFile && file.path === this.settings.dataFile)) {
          this.refreshView();
        }
      })
    );
  }
  
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  
  async saveSettings() {
    await this.saveData(this.settings);
  }
  
  async activateView() {
    const { workspace } = this.app;
    const existingLeaf = workspace.getLeavesOfType(VIEW_TYPE_IMPORTANT_DAYS)[0];
    
    if (existingLeaf) {
      workspace.revealLeaf(existingLeaf);
      return;
    }
    
    const leaf = workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: VIEW_TYPE_IMPORTANT_DAYS });
      workspace.revealLeaf(leaf);
    }
  }
  
  refreshView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_IMPORTANT_DAYS);
    for (const leaf of leaves) {
      if (leaf.view instanceof ImportantDaysView) {
        leaf.view.loadDays().then(() => leaf.view.render());
      }
    }
  }
  
  onunload() {
    // 清理
  }
};

module.exports = ImportantDaysPlugin;
