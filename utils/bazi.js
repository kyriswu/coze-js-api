import { Solar, LunarUtil } from 'lunar-javascript';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { astro, util as astroUtil } from 'iztro';
import commonUtils from './commonUtils.js';

// 初始化 dayjs 插件
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * 计算藏干
 */
function calc_cang_gan(ganList) {
    // 防止 ganList 为 null/undefined 导致 crash
    if (!Array.isArray(ganList)) {
        return [];
    }
    return ganList.map(gan => {
        const wuxing = LunarUtil.WU_XING_GAN[gan];
        return { gan: gan, wu_xing: wuxing };
    });
}

/**
 * 计算八字
 */
export const calc_ba_zi = {
    calc_ba_zi: async function (req, res) {
        try {
            // 获取参数: date (时间字符串), longitude (经度), timeZone (可选, 如 'Asia/Shanghai')
            let { year, month, day, hour, timeZone } = req.body;

            // 参数校验
            if (!year || !month || !day || hour === undefined || hour === null || hour === '') {
                return res.status(400).send({
                    code: 400,
                    msg: commonUtils.MESSAGE?.MISSING_PARAMETERS,
                });
            }
            // 确保参数是数字类型
            const y = parseInt(year), m = parseInt(month), d = parseInt(day), h = parseInt(hour);
            if (isNaN(y) || isNaN(m) || isNaN(d) || isNaN(h)) {
                return res.status(400).send({ code: 400, msg: 'Date parameters must be numbers' });
            }
            // 不传时区，默认东八区
            const targetTimeZone = timeZone || 'Asia/Shanghai';
            let dayjsDate = dayjs.tz(`${y}-${m}-${d} ${h}:00:00`, targetTimeZone);
            if (!dayjsDate.isValid()) {
                return res.status(400).send({ code: 400, msg: 'Invalid date format' });
            }
            let finalDateObj = dayjsDate.toDate();
            // 3. 根据时间生成 Solar 对象
            const solar = Solar.fromDate(finalDateObj);
            const lunar = solar.getLunar();
            const bazi = lunar.getEightChar();

            const resultData = {
                // 节气
                jie_qi: lunar.getJieQi(),
                // 出生日期 (阴历)
                birthday: `${lunar.toString()}${lunar.getTimeZhi()}时`,
                // 阳历 
                solar_time_used: dayjs(finalDateObj).format('YYYY-MM-DD HH:mm:ss'),
                // 四柱
                si_zhu: {
                    year: bazi.getYear(),
                    month: bazi.getMonth(),
                    day: bazi.getDay(),
                    time: bazi.getTime()
                },
                // 五行
                wu_xing: {
                    year: {
                        gan: LunarUtil.WU_XING_GAN[bazi.getYearGan()],
                        zhi: LunarUtil.WU_XING_ZHI[bazi.getYearZhi()],
                    },
                    month: {
                        gan: LunarUtil.WU_XING_GAN[bazi.getMonthGan()],
                        zhi: LunarUtil.WU_XING_ZHI[bazi.getMonthZhi()],
                    },
                    day: {
                        gan: LunarUtil.WU_XING_GAN[bazi.getDayGan()],
                        zhi: LunarUtil.WU_XING_ZHI[bazi.getDayZhi()],
                    },
                    time: {
                        gan: LunarUtil.WU_XING_GAN[bazi.getTimeGan()],
                        zhi: LunarUtil.WU_XING_ZHI[bazi.getTimeZhi()],
                    },
                },
                // 十神
                shi_shen: {
                    year: { gan: bazi.getYearShiShenGan(), zhi: bazi.getYearShiShenZhi() },
                    month: { gan: bazi.getMonthShiShenGan(), zhi: bazi.getMonthShiShenZhi() },
                    day: { gan: bazi.getDayShiShenGan(), zhi: bazi.getDayShiShenZhi() },
                    time: { gan: bazi.getTimeShiShenGan(), zhi: bazi.getTimeShiShenZhi() },
                },
                // 藏干
                cang_gang: {
                    year: calc_cang_gan(bazi.getYearHideGan()),
                    month: calc_cang_gan(bazi.getMonthHideGan()),
                    day: calc_cang_gan(bazi.getDayHideGan()),
                    time: calc_cang_gan(bazi.getTimeHideGan()),
                },
                // 纳音
                na_yin: {
                    year: bazi.getYearNaYin(),
                    month: bazi.getMonthNaYin(),
                    day: bazi.getDayNaYin(),
                    time: bazi.getTimeNaYin(),
                },
                // 旬
                xun: {
                    year: bazi.getYearXun(),
                    month: bazi.getMonthXun(),
                    day: bazi.getDayXun(),
                    time: bazi.getTimeXun(),
                },
                // 旬空
                xun_kong: {
                    year: bazi.getYearXunKong(),
                    month: bazi.getMonthXunKong(),
                    day: bazi.getDayXunKong(),
                    time: bazi.getTimeXunKong(),
                },
                // 地势
                di_shi: {
                    year: bazi.getYearDiShi(),
                    month: bazi.getMonthDiShi(),
                    day: bazi.getDayDiShi(),
                    time: bazi.getTimeDiShi()
                },
                // 胎元
                tai_yuan: bazi.getTaiYuan(),
                // 胎息
                tai_xi: bazi.getTaiXi(),
                // 命宫
                ming_gong: bazi.getMingGong(),
                // 身宫
                shen_gong: bazi.getShenGong(),

            };
            return res.send({
                code: 0,
                msg: 'Success',
                data: resultData
            });
        } catch (error) {
            console.error('BaZi Calculation Error:', error);
            return res.status(500).send({
                code: 500,
                msg: commonUtils.MESSAGE.SERVER_ERROR,
                error: error.message
            });
        }
    }
}

/**
 * 计算紫薇斗数星盘
 */
export const calc_zi_wei = {
    calc_zi_wei: async function (req, res) {
        try {
            const { birthday, gender, hour, isLunar } = req.body;
            // 1. 必填校验
            if (!birthday || hour === undefined || hour === null) {
                return res.status(400).send({
                    code: 400,
                    msg: commonUtils.MESSAGE?.MISSING_PARAMETERS,
                });
            }
            if (gender === undefined || gender === null || String(gender).trim() === '') {
                return res.status(400).send({
                    code: 400,
                    msg: 'Missing parameter: gender/性别 (1=Male/男, 0=Female/女)'
                });
            }
            // 增加 trim()，防止用户输入带空格
            const cleanDate = String(birthday).trim();
            // 校验日期格式 (简单正则 YYYY-MM-DD )
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(cleanDate)) {
                return res.status(400).send({ code: 400, msg: 'Invalid birthday format. Use YYYY-MM-DD.' });
            }

            const genderKey = String(gender).trim().toLowerCase();
            let finalGender = commonUtils.GENDER_MAP[genderKey];
            // 2. 性别校验
            if (!finalGender) {
                return res.status(400).send({ code: 400, msg: 'Invalid gender/性别. Use 1 for male/男, 0 for female/女.' });
            }
            // 24时转12时辰
            const hourIndex = astroUtil.timeToIndex(hour);
            // 布尔值处理，以防 isLunar 是字符串
            const isLunarBool = String(isLunar) === 'true';

            let astrolabe = null;
            // 是否是农历
            if (isLunarBool) {
                astrolabe = astro.byLunar(birthday, hourIndex, finalGender);
            } else {
                astrolabe = astro.bySolar(birthday, hourIndex, finalGender);
            }
            const resultData = {
                // 身主
                body: astrolabe.body,
                // 干支纪年日期
                chineseDate: astrolabe.chineseDate,
                // 性别
                gender: astrolabe.gender,
                // 农历日期
                lunarDate: astrolabe.lunarDate,
                // 星座
                sign: astrolabe.sign,
                // 公历日期
                solarDate: astrolabe.solarDate,
                // 原始日期数据
                rawDates: astrolabe.rawDates,
                // 时辰
                time: astrolabe.time,
                // 时辰对应的时间段
                timeRange: astrolabe.timeRange,
                // 命 主
                soul: astrolabe.soul,
                // 身宫地支
                earthlyBranchOfBodyPalace: astrolabe.earthlyBranchOfBodyPalace,
                // 命宫地支
                earthlyBranchOfSoulPalace: astrolabe.earthlyBranchOfSoulPalace,
                // 生肖
                zodiac: astrolabe.zodiac,
                // 五行局
                fiveElementsClass: astrolabe.fiveElementsClass,
                // 十二宫
                palaces: astrolabe.palaces
            };
            return res.send({
                code: 0,
                msg: 'Success',
                data: resultData
            });

        } catch (error) {
            console.error('ZiWei Calculation Error:', error);
            return res.status(500).send({
                code: 500,
                msg: commonUtils.MESSAGE.SERVER_ERROR,
                error: error.message
            });
        }
    }
}

export default { calc_ba_zi, calc_zi_wei };
