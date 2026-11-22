// 精简农历换算，覆盖 1900-2100 年
(function (global) {
  var lunarInfo = [
    0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
    0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
    0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
    0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
    0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
    0x06ca0,0x0b550,0x15355,0x04da0,0x0a5d0,0x14573,0x052d0,0x0a9a8,0x0e950,0x06aa0,
    0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
    0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b5a0,0x195a6,
    0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
    0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,
    0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
    0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
    0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
    0x05aa0,0x076a3,0x096d0,0x04bd7,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
    0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
    0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
    0x0a2e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
    0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
    0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
    0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,
    0x0d520
  ];
  var monthDays = [31,28,31,30,31,30,31,31,30,31,30,31];
  var cnNum = ['零','一','二','三','四','五','六','七','八','九','十'];
  var animals = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
  var gan = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var zhi = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

  function isLeap(y){ return (y%4===0 && y%100!==0)||y%400===0; }
  function lYearDays(y){
    var sum=348, i, info=lunarInfo[y-1900];
    for(i=0x8000;i>0x8;i>>=1) if(info&i) sum+=1;
    return sum + leapDays(y);
  }
  function leapDays(y){ return leapMonth(y)?((lunarInfo[y-1900]&0x10000)?30:29):0; }
  function leapMonth(y){ return lunarInfo[y-1900]&0xf; }
  function monthDaysL(y,m){ return (lunarInfo[y-1900]&(0x10000>>m))?30:29; }

  function toCnDay(d){
    if(d===10) return '初十';
    if(d===20) return '二十';
    if(d===30) return '三十';
    var prefix = d<10?'初':(d<20?'十':'廿');
    var rest = d%10;
    return prefix + (rest===0?'':cnNum[rest]);
  }
  function toCnMonth(m){ return m===1?'正月':(m===12?'腊月':cnNum[m]+'月'); }

  // 返回 {lunarMonth, lunarDay, isLeap, text, monthText, dayText}
  function solarToLunar(sy,sm,sd){
    if(sy<1900||sy>2100) return null;
    var baseDate = Date.UTC(1900,0,31);
    var objDate = Date.UTC(sy,sm-1,sd);
    var offset = Math.floor((objDate-baseDate)/86400000);
    var i, temp=0, y=1900;
    for(i=1900;i<2101 && offset>0;i++){
      temp = lYearDays(i);
      offset -= temp; y=i;
    }
    if(offset<0){ offset+=temp; y--; }
    var leap = leapMonth(y), isLeap=false, m=1;
    for(i=1;i<13 && offset>0;i++){
      if(leap>0 && i===leap+1 && !isLeap){
        --i; isLeap=true; temp=leapDays(y);
      } else {
        temp = monthDaysL(y,i);
      }
      if(isLeap && i===leap+1) isLeap=false;
      offset -= temp; m=i;
    }
    if(offset===0 && leap>0 && i===leap+1){ if(isLeap){isLeap=false;}else{isLeap=true;--i;m=i;} }
    if(offset<0){ offset+=temp; --i; --m; }
    var d = offset+1;
    return {
      year:y, month:m, day:d, isLeap:isLeap,
      monthText:(isLeap?'闰':'')+toCnMonth(m),
      dayText:toCnDay(d),
      text:(isLeap?'闰':'')+toCnMonth(m)+toCnDay(d),
      ganzhi: gan[(y-4)%10]+zhi[(y-4)%12],
      animal: animals[(y-4)%12]
    };
  }

  // 公历某日的农历字符串（MM-DD 形式，用于节日匹配）
  function lunarKey(sy,sm,sd){
    var l = solarToLunar(sy,sm,sd);
    return l ? String(l.month).padStart(2,'0')+'-'+String(l.day).padStart(2,'0') : '';
  }

  global.Lunar = { solarToLunar: solarToLunar, lunarKey: lunarKey };
})(window);
