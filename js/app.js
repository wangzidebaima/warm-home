(function () {
  'use strict';
  var DATA_URL = 'data/content.json';
  var content = null;
  var photoTimer = null;
  var photoIdx = 0;
  var scrollers = [];

  function $(id) { return document.getElementById(id); }
  function pad(n) { return String(n).padStart(2, '0'); }

  // ---------- 加载内容 ----------
  function loadContent(cb) {
    fetch(DATA_URL + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) { content = d; renderAll(); if (cb) cb(); })
      .catch(function () {
        // 首次可能拿到缓存，仍尝试渲染
        if (!content && cb) cb();
      });
  }

  function renderAll() {
    if (!content) return;
    $('title').textContent = content.title || '温馨的小家';
    $('subtitle').textContent = content.subtitle || '';
    document.title = content.title || '温馨的小家';

    renderDate();
    renderCountdown();
    renderTheme();
    renderList('todos', (content.todos || []).map(function (t) {
      return typeof t === 'string' ? { text: t } : { text: t.text };
    }), 'todo');
    renderList('messages', (content.messages || []).map(function (m) {
      return { who: m.from, text: m.text };
    }), 'msg');
    var hw = content.homework || {};
    $('sonName').textContent = (hw.son && hw.son.name) || '儿子';
    $('daughterName').textContent = (hw.daughter && hw.daughter.name) || '女儿';
    renderList('sonHomework', ((hw.son && hw.son.items) || []).map(function (t) { return { text: t }; }), 'hw-son');
    renderList('daughterHomework', ((hw.daughter && hw.daughter.items) || []).map(function (t) { return { text: t }; }), 'hw-daughter');

    initPhotos();
    renderWeatherIcon(0);
    loadWeather();
  }

  // ---------- 日期 / 农历 ----------
  function renderDate() {
    var now = new Date();
    var weeks = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
    var main = (now.getMonth() + 1) + '月' + now.getDate() + '日 ' + weeks[now.getDay()];
    $('dateMain').textContent = main;
    var l = window.Lunar ? window.Lunar.solarToLunar(now.getFullYear(), now.getMonth() + 1, now.getDate()) : null;
    $('dateLunar').textContent = l ? ('农历' + l.text + ' · ' + l.ganzhi + l.animal + '年') : '';
  }

  // ---------- 倒计时 ----------
  function renderCountdown() {
    if (!content.examDate) { $('countdownBox').style.display = 'none'; return; }
    $('examLabel').textContent = '距' + (content.examLabel || '考试');
    var target = new Date(content.examDate + 'T00:00:00');
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var days = Math.round((target - today) / 86400000);
    $('countdownNum').textContent = days >= 0 ? days : 0;
  }

  // ---------- 每日主题 + 特殊日子 ----------
  function renderTheme() {
    var topics = content.loveTopics || [];
    if (topics.length) {
      var now = new Date();
      var dayKey = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
      $('themeText').textContent = topics[dayKey % topics.length];
    }
    var todayStr = pad(new Date().getMonth() + 1) + '-' + pad(new Date().getDate());
    var lunarKey = window.Lunar ? window.Lunar.lunarKey(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()) : '';
    var hits = [];
    (content.specialDays || []).forEach(function (s) {
      if (s.type === 'lunar' && s.lunar === lunarKey) hits.push(s.name);
      else if (s.type !== 'lunar' && s.date === todayStr) hits.push(s.name);
    });
    (content.birthdays || []).forEach(function (b) {
      if (b.date && b.date.slice(5) === todayStr) hits.push('🎂 ' + b.name + '生日');
    });
    $('specialDay').textContent = hits.length ? ('★ 今天是' + hits.join('、')) : '';
  }

  // ---------- 列表渲染 + 自动滚动 ----------
  function renderList(id, items, cls) {
    var track = $(id);
    if (!track) return;
    track.innerHTML = '';
    if (!items.length) {
      var empty = document.createElement('div');
      empty.className = 'item';
      empty.textContent = '暂无内容';
      empty.style.opacity = '.55';
      track.appendChild(empty);
      return;
    }
    items.forEach(function (it) {
      var div = document.createElement('div');
      div.className = 'item';
      if (it.who) {
        var w = document.createElement('span');
        w.className = 'who';
        w.textContent = it.who + '：';
        div.appendChild(w);
      }
      div.appendChild(document.createTextNode(it.text || ''));
      track.appendChild(div);
    });
    setupScroll(track);
  }

  function setupScroll(track) {
    var win = track.parentElement;
    // 重置动画
    track.style.transition = 'none';
    track.style.transform = 'translateY(0)';
    // 克隆一份用于无缝滚动
    var clones = track.querySelectorAll('.clone');
    clones.forEach(function (c) { c.remove(); });
    var originals = Array.prototype.slice.call(track.children);
    var contentH = track.scrollHeight;
    var viewH = win.clientHeight;
    if (contentH > viewH + 4) {
      originals.forEach(function (node) {
        var c = node.cloneNode(true);
        c.classList.add('clone');
        track.appendChild(c);
      });
      // 复制后总高 = 2*contentH + gap，一个周期 = contentH + gap
      var gap = parseFloat(getComputedStyle(track).gap) || 0;
      var cycle = contentH + gap;
      var speed = 26; // px/s
      var dist = cycle;
      var dur = dist / speed;
      var start = performance.now();
      function step(now) {
        var el = now - start;
        var y = -((el / 1000) * speed) % cycle;
        track.style.transform = 'translateY(' + y + 'px)';
        track._raf = requestAnimationFrame(step);
      }
      if (track._raf) cancelAnimationFrame(track._raf);
      track._raf = requestAnimationFrame(step);
    }
  }

  // ---------- 天气 ----------
  var WMO = {
    0:['晴','☀'],1:['晴间多云','☀'],2:['多云','⛅'],3:['阴','☁'],
    45:['有雾','☁'],48:['雾凇','☁'],
    51:['小毛毛雨','☂'],53:['毛毛雨','☂'],55:['大毛毛雨','☂'],
    61:['小雨','☂'],63:['中雨','☂'],65:['大雨','☂'],
    71:['小雪','❄'],73:['中雪','❄'],75:['大雪','❄'],77:['雪粒','❄'],
    80:['阵雨','☂'],81:['阵雨','☂'],82:['强阵雨','☂'],
    95:['雷阵雨','⚡'],96:['雷阵雨伴冰雹','⚡'],99:['强雷阵雨伴冰雹','⚡']
  };
  function loadWeather() {
    if (!content) return;
    var lat = content.latitude || 34.2706, lon = content.longitude || 108.9453;
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon +
      '&current=temperature_2m,weather_code&daily=precipitation_probability_max,temperature_2m_max,temperature_2m_min' +
      '&timezone=Asia%2FShanghai&forecast_days=1';
    fetch(url).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.current) return;
      var t = Math.round(d.current.temperature_2m);
      var code = d.current.weather_code;
      var info = WMO[code] || ['天气多变','☀'];
      var pop = (d.daily && d.daily.precipitation_probability_max && d.daily.precipitation_probability_max[0]) || 0;
      var tmax = d.daily && d.daily.temperature_2m_max ? Math.round(d.daily.temperature_2m_max[0]) : null;
      var tmin = d.daily && d.daily.temperature_2m_min ? Math.round(d.daily.temperature_2m_min[0]) : null;

      var dress;
      if (t >= 30) dress = '天气炎热，注意防暑';
      else if (t >= 25) dress = '短袖即可，注意防晒';
      else if (t >= 20) dress = '长袖薄衫正合适';
      else if (t >= 15) dress = '建议加件薄外套';
      else if (t >= 10) dress = '天气较凉，多穿一点';
      else dress = '天气寒冷，注意保暖';
      var umbrella = pop >= 50 ? '记得带伞' : '不用带伞';
      var range = (tmax !== null && tmin !== null) ? (' ' + tmin + '~' + tmax + '°') : '';
      $('weatherTemp').textContent = t + '° ' + info[0] + range;
      $('weatherTip').textContent = dress + ' · ' + umbrella;
      renderWeatherIcon(code);
    }).catch(function () {
      $('weatherTemp').textContent = '天气暂不可用';
      $('weatherTip').textContent = (content.city || '') + ' · 稍后自动重试';
    });
  }
  function renderWeatherIcon(code) {
    var icon = $('weatherIcon');
    if (!icon) return;
    var sunny = (code === 0 || code === 1 || code === 2);
    var rainy = (code >= 51 && code <= 67) || (code >= 80);
    var snowy = code >= 71 && code <= 77;
    var color = sunny ? '#f5b301' : (rainy ? '#5B9BD5' : (snowy ? '#9FB8CC' : '#B0B0B0'));
    var html = '<circle cx="20" cy="24" r="10" fill="' + color + '"/>';
    if (sunny) {
      html += '<path d="M24 8V4M24 44v-4M8 24H4M44 24h-4M13 13l-3-3M38 38l3 3M38 13l3-3M13 38l-3 3" stroke="' + color + '" stroke-width="2.4" stroke-linecap="round"/>';
    } else if (rainy || snowy) {
      html += '<ellipse cx="30" cy="18" rx="10" ry="7" fill="#E6E6E6"/>';
      html += '<circle cx="25" cy="16" r="6" fill="#E6E6E6"/><circle cx="34" cy="17" r="7" fill="#E6E6E6"/>';
      if (rainy) html += '<path d="M22 30l-2 6M30 30l-2 6M38 30l-2 6" stroke="#5B9BD5" stroke-width="2.6" stroke-linecap="round"/>';
      else html += '<circle cx="22" cy="34" r="1.6" fill="#9FB8CC"/><circle cx="30" cy="36" r="1.6" fill="#9FB8CC"/><circle cx="38" cy="34" r="1.6" fill="#9FB8CC"/>';
    }
    icon.innerHTML = html;
  }

  // ---------- 照片轮播 ----------
  function initPhotos() {
    var photos = content.photos || [];
    var img = $('photo');
    var empty = $('photoEmpty');
    if (!photos.length) {
      img.style.display = 'none';
      empty.style.display = 'block';
      if (photoTimer) { clearInterval(photoTimer); photoTimer = null; }
      return;
    }
    empty.style.display = 'none';
    img.style.display = 'block';
    var hours = content.photoIntervalHours || 3;
    var period = hours * 3600 * 1000;
    // 按当前时间确定起始位置，保证跨刷新也按节奏走
    photoIdx = Math.floor(Date.now() / period) % photos.length;
    function show() {
      img.src = photos[photoIdx % photos.length] + '?t=' + Math.floor(Date.now() / period);
      photoIdx++;
    }
    show();
    if (photoTimer) clearInterval(photoTimer);
    photoTimer = setInterval(show, period);
  }

  // ---------- 定时刷新 ----------
  function scheduleRefresh() {
    var lastVer = content ? content.version : 0;
    setInterval(function () {
      fetch(DATA_URL + '?t=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d && d.version !== lastVer) {
            lastVer = d.version;
            content = d;
            renderAll();
          }
        }).catch(function () {});
      // 每分钟校正日期/倒计时跨天
      renderDate();
      renderCountdown();
      renderTheme();
    }, 60000);
  }

  // ---------- 启动 ----------
  loadContent(function () { scheduleRefresh(); });
  // 每秒校正时钟相关的日期显示（跨零点）
  setInterval(function () { renderDate(); }, 30000);
})();
