// app.js
// 新版 UI 的所有互動、試算、LocalStorage 與 RWD 行為
// 符合使用者要求的 6 大調整（單行 label+input、清除按鈕、漂亮 input、localStorage 全部欄位 + 20 天、visibility auto-refresh、不更新 localStorage when auto）


// -------------------- 常數 --------------------
const TAX_RATE = 0.00002;
const BIG_POINT_VALUE = 200;
const MINI_POINT_VALUE = 50;
const MICRO_POINT_VALUE = 10;

const STORAGE_KEY = 'futures_calculator_settings_v2';
const STORAGE_EXPIRY_DAYS = 20;


// -------------------- 小工具 --------------------
function formatCurrency(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 }).format(Math.round(num));
}

function onlyDigits(str) {
    return String(str || '').replace(/[^\d]/g, '');
}

function calculateSingleSideTax(index, pointValue) {
    return Math.ceil(index * pointValue * TAX_RATE);
}

function isTradingDay(date) {
    const d = new Date(date);
    const day = d.getDay();
    return day >= 1 && day <= 5;
}

function getPreviousTradingDay(date) {
    const prev = new Date(date);
    prev.setDate(prev.getDate() - 1);
    while (!isTradingDay(prev)) {
        prev.setDate(prev.getDate() - 1);
    }
    return prev;
}

function isSameDate(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}


// -------------------- 清除按鈕 --------------------
function clearInput(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = '';
    // 如果是數字欄位，觸發 input 事件以刷新格式化或其他互動
    el.dispatchEvent(new Event('input'));
}


// -------------------- 數字輸入格式化（顯示用） --------------------
// 針對具有 inputmode="numeric" 或 pattern 數字框做千分位顯示（不影響 date、radio、checkbox）
function attachNumericFormatting() {
    const numericInputs = Array.from(document.querySelectorAll('input[inputmode="numeric"], input[type="text"]')).filter(i => i.id && i.id.toLowerCase().includes('margin') || i.id.toLowerCase().includes('comm') || i.id.toLowerCase().includes('capital') || i.id.toLowerCase().includes('assumedindex') );
    // simpler: also include initialCapital / assumedIndex / margins / comms
    const explicitIds = ['initialCapital','assumedIndex','bigMargin','bigComm','miniMargin','miniComm','microMargin','microComm'];
    explicitIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', function(e){
            const start = this.selectionStart;
            let raw = this.value;
            // remove non-digit
            let digits = onlyDigits(raw);
            if (digits === '') {
                this.value = '';
                return;
            }
            const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            this.value = formatted;
            // naive caret reposition: put at end
            this.selectionStart = this.selectionEnd = this.value.length;
        });
    });
}


// -------------------- UI Toggle 行為 --------------------
function initToggles() {
    const outerHeader = document.getElementById('outerToggleHeader');
    const outerContent = document.getElementById('outerToggleContent');

    outerHeader.addEventListener('click', () => {
        outerHeader.classList.toggle('collapsed');
        outerHeader.classList.toggle('expanded');
        outerContent.classList.toggle('expanded');
        // scroll to top of settings when open (mobile friendly)
        if (outerContent.classList.contains('expanded')) {
            setTimeout(() => outerContent.scrollIntoView({behavior:'smooth', block:'start'}), 100);
        }
    });

    // inner blocks
    document.querySelectorAll('.input-block h3').forEach(h3 => {
        const content = h3.nextElementSibling;
        h3.addEventListener('click', () => {
            h3.classList.toggle('collapsed');
            h3.classList.toggle('expanded');
            content.classList.toggle('expanded');
        });
    });
}

// -------------------- LocalStorage --------------------
function saveToLocalStorage() {
    // collect all relevant fields
    const settings = {
        initialCapital: document.getElementById('initialCapital').value,
        assumedIndex: document.getElementById('assumedIndex').value,
        bigMargin: document.getElementById('bigMargin').value,
        bigComm: document.getElementById('bigComm').value,
        miniMargin: document.getElementById('miniMargin').value,
        miniComm: document.getElementById('miniComm').value,
        microMargin: document.getElementById('microMargin').value,
        microComm: document.getElementById('microComm').value,
        startDate: document.getElementById('startDate').value,

        modeB_pointsPerTrade: document.getElementById('modeB_pointsPerTrade').value,
        modeB_morningTrades: document.getElementById('modeB_morningTrades').value,
        modeB_nightTrades: document.getElementById('modeB_nightTrades').value,

        selectBig: document.getElementById('selectBig').checked,
        selectMini: document.getElementById('selectMini').checked,
        selectMicro: document.getElementById('selectMicro').checked,

    };

    const payload = {
        timestamp: Date.now(),
        settings
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    console.log('[LocalStorage] 設定已儲存 (手動計算或使用者動作)。');
}

function loadFromLocalStorage() {
    document.getElementById('storageExpiryInfo').innerText = '';
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    try {
        const data = JSON.parse(raw);
        const now = Date.now();
        const diffTime = now - data.timestamp;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        if (diffDays > STORAGE_EXPIRY_DAYS) {
            console.log('[LocalStorage] 資料已超過 20 天，清除');
            localStorage.removeItem(STORAGE_KEY);
            return false;
        }
        const s = data.settings || {};

        if (s.initialCapital) document.getElementById('initialCapital').value = s.initialCapital;
        if (s.assumedIndex) document.getElementById('assumedIndex').value = s.assumedIndex;
        if (s.bigMargin) document.getElementById('bigMargin').value = s.bigMargin;
        if (s.bigComm) document.getElementById('bigComm').value = s.bigComm;
        if (s.miniMargin) document.getElementById('miniMargin').value = s.miniMargin;
        if (s.miniComm) document.getElementById('miniComm').value = s.miniComm;
        if (s.microMargin) document.getElementById('microMargin').value = s.microMargin;
        if (s.microComm) document.getElementById('microComm') && (document.getElementById('microComm').value = s.microComm);
        if (s.startDate) document.getElementById('startDate').value = s.startDate;

        if (s.modeB_pointsPerTrade) document.getElementById('modeB_pointsPerTrade').value = s.modeB_pointsPerTrade;
        if (s.modeB_morningTrades) document.getElementById('modeB_morningTrades').value = s.modeB_morningTrades;
        if (s.modeB_nightTrades) document.getElementById('modeB_nightTrades').value = s.modeB_nightTrades;

        document.getElementById('selectBig').checked = !!s.selectBig;
        document.getElementById('selectMini').checked = !!s.selectMini;
        document.getElementById('selectMicro').checked = !!s.selectMicro;

        // 顯示 LocalStorage 有效期限 + 剩餘天數
        const expireDate = new Date(data.timestamp + STORAGE_EXPIRY_DAYS * 86400000);
        const y = expireDate.getFullYear();
        const m = String(expireDate.getMonth() + 1).padStart(2, '0');
        const d = String(expireDate.getDate()).padStart(2, '0');

        // 計算剩餘天數
        const nowDate = new Date();
        const msDiff = expireDate - nowDate;
        const remainDays = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

        document.getElementById('storageExpiryInfo').innerText =
            `有效期限：${y}/${m}/${d}（剩 ${remainDays} 天）`;

        console.log('[LocalStorage] 載入先前設定 (有效)。');
        return true;

    } catch (e) {
        console.error('[LocalStorage] 讀取失敗：', e);
        return false;
    }
}


// -------------------- visibilitychange: 回到前景自動 refresh（但不更新 localStorage） --------------------
function initVisibilityRefresh() {
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            // 只重新產生結果，但不儲存 localStorage
            console.log('[visibilitychange] 回到前景，重新產生（不更新 localStorage）。');
            startSimulation(true); // autoMode = true
        }
    });
}


// -------------------- 主試算邏輯 --------------------
function startSimulation(autoMode = false) {
    // autoMode === true 代表系統自動觸發（載入後或 visibility），不更新 localStorage 時間戳
    // 若是手動（例如按按鈕），則儲存設定（更新有效期限）
    if (!autoMode) {
        saveToLocalStorage();
    }

    // 讀取輸入（注意：金額欄位可能有千分號）
    const initialCapital = parseFloat(onlyDigits(document.getElementById('initialCapital').value)) || 0;
    const assumedIndex = parseFloat(onlyDigits(document.getElementById('assumedIndex').value)) || 27740;

    const selectBig = document.getElementById('selectBig').checked;
    const selectMini = document.getElementById('selectMini').checked;
    const selectMicro = document.getElementById('selectMicro').checked;

    if (!selectBig && !selectMini && !selectMicro) {
        alert('請至少選擇一個交易合約進行試算！');
        return;
    }

    const bigMargin = parseFloat(onlyDigits(document.getElementById('bigMargin').value)) || 0;
    const bigComm = parseFloat(onlyDigits(document.getElementById('bigComm').value)) || 0;
    const miniMargin = parseFloat(onlyDigits(document.getElementById('miniMargin').value)) || 0;
    const miniComm = parseFloat(onlyDigits(document.getElementById('miniComm').value)) || 0;
    const microMargin = parseFloat(onlyDigits(document.getElementById('microMargin').value)) || 0;
    const microComm = parseFloat(onlyDigits(document.getElementById('microComm').value)) || 0;

    let morningPointsTarget = 0, nightPointsTarget = 0, morningTradesCount = 0, nightTradesCount = 0;

    const pointsPer = parseFloat(document.getElementById('modeB_pointsPerTrade').value) || 0;
    morningTradesCount = parseFloat(document.getElementById('modeB_morningTrades').value) || 0;
    nightTradesCount = parseFloat(document.getElementById('modeB_nightTrades').value) || 0;
    morningPointsTarget = pointsPer * morningTradesCount;
    nightPointsTarget = pointsPer * nightTradesCount;

    const startDateStr = document.getElementById('startDate').value;
    if (!startDateStr) {
        alert('請選擇起始交易日期！');
        return;
    }

    // 決定今日 Highlight（依當下時間）
    const now = new Date();
    const currentHour = now.getHours();
    let highlightDate = null;
    let highlightSession = '';

    if (currentHour < 7) {
        highlightSession = '夜盤';
        highlightDate = getPreviousTradingDay(now);
    } else if (currentHour < 14) {
        highlightSession = '早盤';
        highlightDate = now;
    } else {
        highlightSession = '夜盤';
        highlightDate = now;
    }

    // 準備 Table
    const tbody = document.querySelector('#resultTable tbody');
    tbody.innerHTML = '';

    let currentCapital = initialCapital;
    // start from startDate but move to next trading day if weekend
    let currentSimulationDate = new Date(startDateStr + 'T00:00:00');
    while (!isTradingDay(currentSimulationDate)) {
        currentSimulationDate.setDate(currentSimulationDate.getDate() + 1);
    }

    // 20 個交易日
    for (let dayCounter = 1; dayCounter <= 20; dayCounter++) {
        const monthStr = String(currentSimulationDate.getMonth() + 1).padStart(2, '0');
        const dateStr = String(currentSimulationDate.getDate()).padStart(2, '0');
        const baseLabel = `<span class="desktop-only">${monthStr}-${dateStr}</span><span class="mobile-only">${monthStr}-${dateStr}<br></span>`;

        // 早盤
        const isMorningHighlight = isSameDate(currentSimulationDate, highlightDate) && highlightSession === '早盤';
        currentCapital = runSessionSimulation({
            dateLabel: `${baseLabel}(早)`,
            sessionName: '早盤',
            startCap: currentCapital,
            index: assumedIndex,
            bigContract: selectBig ? { margin: bigMargin, comm: bigComm, pointValue: BIG_POINT_VALUE, name: '大台' } : null,
            miniContract: selectMini ? { margin: miniMargin, comm: miniComm, pointValue: MINI_POINT_VALUE, name: '小台' } : null,
            microContract: selectMicro ? { margin: microMargin, comm: microComm, pointValue: MICRO_POINT_VALUE, name: '微台' } : null,
            targetPoints: morningPointsTarget,
            tradesCount: morningTradesCount,
            isHighlight: isMorningHighlight,
            dayIndex: dayCounter,
            sessionKey: 'morning',
            tbody
        });

        // 夜盤
        const isNightHighlight = isSameDate(currentSimulationDate, highlightDate) && highlightSession === '夜盤';
        currentCapital = runSessionSimulation({
            dateLabel: `${baseLabel}(夜)`,
            sessionName: '夜盤',
            startCap: currentCapital,
            index: assumedIndex,
            bigContract: selectBig ? { margin: bigMargin, comm: bigComm, pointValue: BIG_POINT_VALUE, name: '大台' } : null,
            miniContract: selectMini ? { margin: miniMargin, comm: miniComm, pointValue: MINI_POINT_VALUE, name: '小台' } : null,
            microContract: selectMicro ? { margin: microMargin, comm: microComm, pointValue: MICRO_POINT_VALUE, name: '微台' } : null,
            targetPoints: nightPointsTarget,
            tradesCount: nightTradesCount,
            isHighlight: isNightHighlight,
            dayIndex: dayCounter,
            sessionKey: 'night',
            tbody
        });

        // forward to next trading day
        const nextDay = new Date(currentSimulationDate);
        nextDay.setDate(currentSimulationDate.getDate() + 1);
        while (!isTradingDay(nextDay)) {
            nextDay.setDate(nextDay.getDate() + 1);
        }
        currentSimulationDate = nextDay;
    }

    // 更新 summary
    const totalProfit = currentCapital - initialCapital;
    const roi = initialCapital === 0 ? 0 : (totalProfit / initialCapital) * 100;

    document.getElementById('summaryInitial').innerText = formatCurrency(initialCapital);
    document.getElementById('summaryFinal').innerText = formatCurrency(currentCapital);
    const profitEl = document.getElementById('summaryProfit');
    profitEl.innerText = (totalProfit >= 0 ? '' : '-') + formatCurrency(Math.abs(totalProfit));
    profitEl.style.color = totalProfit >= 0 ? 'var(--green)' : 'var(--red)';
    const roiEl = document.getElementById('summaryROI');
    roiEl.innerText = roi.toFixed(2) + '%';
    roiEl.style.color = roi >= 0 ? 'var(--green)' : 'var(--red)';

    // 顯示結果區
    document.getElementById('resultSection').style.display = 'block';
}


// runSessionSimulation: 針對一個盤（早/夜）計算並直接把 row 寫入 tbody
function runSessionSimulation(opts) {
    const {
        dateLabel, sessionName, startCap, index,
        bigContract, miniContract, microContract,
        targetPoints, tradesCount, isHighlight,
        dayIndex, sessionKey, tbody
    } = opts;

    // 如果目標為 0 或 次數為 0，則直接輸出空白狀態
    if (targetPoints === 0 || tradesCount === 0) {
        generateTableRow({
            tbody, dateLabel, startCap, best: '-', contracts: 0, points: 0,
            tax: 0, comm: 0, netProfit: 0, endCap: startCap,
            isHighlight, dayIndex, sessionKey
        });
        return startCap;
    }

    // 檢視可交易合約
    const contractsToEval = [];
    if (bigContract) contractsToEval.push(bigContract);
    if (miniContract) contractsToEval.push(miniContract);
    if (microContract) contractsToEval.push(microContract);

    const canTradeAny = contractsToEval.some(c => Math.floor(startCap / c.margin) > 0);

    let bestContractName = '資金不足';
    let finalContracts = 0, finalTax = 0, finalComm = 0, finalNetProfit = 0;

    if (!canTradeAny) {
        bestContractName = '資金不足';
        finalNetProfit = 0;
    } else {
        let bestNet = -Infinity;
        for (const c of contractsToEval) {
            const currentContracts = Math.floor(startCap / c.margin);
            if (currentContracts <= 0) continue;
            const grossProfit = currentContracts * targetPoints * c.pointValue;
            const totalComm = currentContracts * c.comm * tradesCount;
            const singleSideTax = calculateSingleSideTax(index, c.pointValue);
            const totalTax = singleSideTax * 2 * currentContracts * tradesCount; // 買+賣
            const net = grossProfit - totalComm - totalTax;
            if (net > bestNet) {
                bestNet = net;
                bestContractName = c.name;
                finalContracts = currentContracts;
                finalTax = totalTax;
                finalComm = totalComm;
                finalNetProfit = net;
            }
        }
        if (bestNet <= 0 && contractsToEval.some(c => Math.floor(startCap / c.margin) > 0)) {
            // 若都不賺錢，則放棄交易（避免虧損）
            bestContractName = '放棄交易(虧損)';
            finalContracts = 0;
            finalTax = 0;
            finalComm = 0;
            finalNetProfit = 0;
        }
    }

    const endCap = startCap + finalNetProfit;

    generateTableRow({
        tbody, dateLabel, startCap, best: bestContractName, contracts: finalContracts, points: targetPoints,
        tax: finalTax, comm: finalComm, netProfit: finalNetProfit, endCap, isHighlight, dayIndex, sessionKey
    });

    return endCap;
}


// generateTableRow：負責製作 tr 並 append 到 tbody
function generateTableRow(opts) {
    const { tbody, dateLabel, startCap, best, contracts, points, tax, comm, netProfit, endCap, isHighlight, dayIndex, sessionKey } = opts;

    const tr = document.createElement('tr');

    // 樣式：若是夜盤，用 night-session class（保留未改動功能）
    if (sessionKey === 'night') tr.classList.add('night-session');

    // highlight
    if (isHighlight) tr.classList.add('highlight-row');

    // 每第五天在該天的下方（也就是夜盤那一列）加粗分隔線
    // dayIndex 為 1..20，如果 dayIndex % 5 === 0 且這列是 night，則加 border-strong
    if (dayIndex % 5 === 0 && sessionKey === 'night') {
        tr.classList.add('border-strong');
    }

    const profitClass = netProfit > 0 ? 'profit-positive' : (netProfit < 0 ? 'profit-negative' : '');

    tr.innerHTML = `
        <td>${dateLabel}</td>
        <td>${formatCurrency(startCap)}</td>
        <td class="best-contract">${best}</td>
        <td>${contracts} 口</td>
        <td class="${profitClass}">${formatCurrency(netProfit)}</td>
        <td class="final-capital-cell">${formatCurrency(endCap)}</td>
        <td>${points} 點</td>
        <td>${formatCurrency(tax)}</td>
        <td>${formatCurrency(comm)}</td>
    `;

    tbody.appendChild(tr);
}


// -------------------- 初始化與綁定事件 --------------------
document.addEventListener('DOMContentLoaded', () => {
    // 初始化 default date 為今天
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const defaultDate = `${y}-${m}-${d}`;
    const startDateEl = document.getElementById('startDate');
    if (startDateEl && !startDateEl.value) startDateEl.value = defaultDate;

    // 初始化 toggles & listeners
    initToggles();
    attachNumericFormatting();
    initVisibilityRefresh();

    // 綁定按鈕
    const calcBtn = document.getElementById('calculateBtn');
    if (calcBtn) calcBtn.addEventListener('click', () => startSimulation(false));

    // 嘗試從 LocalStorage 載入（若有則自動試算一次，但不更新 localStorage 時間戳）
    const loaded = loadFromLocalStorage();
    if (loaded) {
        // 若載入成功，自動展開設定（選擇性）
        // document.getElementById('outerToggleHeader').click();
        // 自動產生（不更新 localStorage）
        startSimulation(true);
    }

    // 連接清除按鈕（若想要支援動態新增，可用 event delegation，但目前按鈕在頁面為靜態）
    document.querySelectorAll('.clear-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // 透過 onclick handler 已處理，這是備援
            // 若 button 放在 .input-wrapper 裡，取 sibling input
            const wrapper = btn.parentElement;
            if (!wrapper) return;
            const input = wrapper.querySelector('input');
            if (!input) return;
            input.value = '';
            input.dispatchEvent(new Event('input'));
        });
    });

    // 防止表單在 mobile 上被瀏覽器自動填入後沒有格式化，手動觸發 format
    const explicitIds = ['initialCapital','assumedIndex','bigMargin','bigComm','miniMargin','miniComm','microMargin','microComm'];
    explicitIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.dispatchEvent(new Event('input'));
    });
});
