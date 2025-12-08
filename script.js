// --- 全域變數與狀態 ---

// [修改] 設定區域：分開設定網域與路徑，避免網址錯誤
// 1. 本地開發用 (預設)
// const BASE_URL = 'http://localhost:5000'; 
// 2. Ngrok 公開測試用 (請取消註解下方，並貼上您的 ngrok 網址，結尾不用加斜線)
const BASE_URL = 'https://9ee5f33b79e5.ngrok-free.app';

// 自動組合 API 網址 (自動加上 /api)
const API_URL = `${BASE_URL}/api`;

let currentUser = null;
let records = []; // 用於顯示清單
let viewIndex = 0; // 0: 日檢視, 1: 當月, 2: 年度
let selectedMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

// 輔助函式：取得本地 YYYY-MM-DD 字串 (比 toLocaleDateString 更穩健)
function getTodayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 新增: 日檢視的選擇日期 (格式 YYYY-MM-DD，預設今天)
let selectedDate = getTodayString(); 

let dateRange = {
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
};

// 類型設定資料 (Icon 與顏色)
const typeConfig = {
    diet: { icon: 'utensils', label: '飲食', color: 'text-orange-600 bg-orange-100', dot: 'bg-orange-500', unit: '大卡', categories: ['早餐', '午餐', '晚餐', '點心', '飲料'] },
    exercise: { icon: 'dumbbell', label: '運動', color: 'text-green-600 bg-green-100', dot: 'bg-green-500', unit: '分鐘', categories: ['跑步', '健身', '瑜珈', '散步', '球類'] },
    sleep: { icon: 'moon', label: '睡眠', color: 'text-indigo-600 bg-indigo-100', dot: 'bg-indigo-500', unit: '小時', categories: ['夜間睡眠', '午睡', '補眠'] },
    money: { icon: 'wallet', label: '花費', color: 'text-yellow-600 bg-yellow-100', dot: 'bg-yellow-500', unit: '元', categories: ['餐飲', '交通', '購物', '娛樂', '帳單'] }
};

// --- DOM 載入後執行 ---
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    lucide.createIcons();
});

function initApp() {
    document.getElementById('current-date').textContent = new Date().toLocaleDateString();
    
    // --- 動態注入日期選擇器 (針對日檢視) ---
    const filterContainer = document.getElementById('month-filter').parentNode;
    if (!document.getElementById('daily-filter')) {
        const dailyDiv = document.createElement('div');
        dailyDiv.id = 'daily-filter';
        dailyDiv.className = 'flex items-center bg-white px-2 py-1 rounded-lg shadow-sm border border-gray-200 ml-auto'; 
        dailyDiv.innerHTML = `
            <i data-lucide="calendar-days" width="14" class="text-gray-400 mr-2"></i>
            <input type="date" id="daily-date-input" class="bg-transparent text-sm font-medium text-gray-700 outline-none">
        `;
        filterContainer.appendChild(dailyDiv);
    }

    // 綁定事件
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Tab 切換
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => setView(parseInt(e.target.dataset.index)));
    });

    // Modal 操作
    document.getElementById('add-btn').addEventListener('click', openModal);
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-confirm').addEventListener('click', handleSubmitRecord);

    // 篩選器監聽
    // 1. 月份
    const monthInput = document.getElementById('month-input');
    monthInput.value = selectedMonth;
    monthInput.addEventListener('change', (e) => {
        selectedMonth = e.target.value;
        updateDashboard(); 
    });

    // 2. 日期 (日檢視)
    const dailyInput = document.getElementById('daily-date-input');
    dailyInput.value = selectedDate;
    dailyInput.addEventListener('change', (e) => {
        selectedDate = e.target.value;
        updateDashboard();
        renderList(); // 日期改變時，列表也要更新
    });

    // 3. 自訂範圍
    document.getElementById('date-start').value = dateRange.start;
    document.getElementById('date-end').value = dateRange.end;
    document.getElementById('date-start').addEventListener('change', (e) => { dateRange.start = e.target.value; updateDashboard(); });
    document.getElementById('date-end').addEventListener('change', (e) => { dateRange.end = e.target.value; updateDashboard(); });

    // 主畫面左右滑動切換 Tab
    setupMainSwipe();
    
    // 初始隱藏不需要的篩選器
    setView(0);
}

// --- API 呼叫 ---
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('login-error');

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        
        if (res.ok) {
            currentUser = data.user;
            document.getElementById('user-name').textContent = currentUser.name;
            document.getElementById('login-page').classList.add('hidden');
            document.getElementById('app-page').classList.remove('hidden');
            
            // 登入後載入資料
            fetchRecords(); 
            updateDashboard(); 
        } else {
            errorMsg.textContent = data.message;
            errorMsg.classList.remove('hidden');
        }
    } catch (err) {
        errorMsg.textContent = "連線失敗，請確認後端 Server 是否已啟動";
        errorMsg.classList.remove('hidden');
    }
}

function handleLogout() {
    currentUser = null;
    records = [];
    document.getElementById('app-page').classList.add('hidden');
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    
    // 重置背景色
    document.body.classList.remove('bg-orange-50');
    document.body.classList.add('bg-gray-50');
}

// 取得列表
async function fetchRecords() {
    if (!currentUser) return;
    try {
        const res = await fetch(`${API_URL}/records/${currentUser.id}`);
        records = await res.json();
        renderList(); // 更新列表 UI
    } catch (err) {
        console.error("Fetch records error", err);
    }
}

// 取得統計數據
async function fetchStatsApi(start, end) {
    if (!currentUser) return;
    try {
        const res = await fetch(`${API_URL}/stats/${currentUser.id}?startDate=${start}&endDate=${end}`);
        if (!res.ok) throw new Error('統計計算失敗');
        const stats = await res.json();
        
        animateValue('val-diet', stats.diet);
        animateValue('val-exercise', stats.exercise);
        animateValue('val-sleep', stats.sleep);
        animateValue('val-money', stats.money);

    } catch (err) {
        console.error("Fetch stats error", err);
    }
}

function animateValue(id, end) {
    const obj = document.getElementById(id);
    obj.textContent = end;
}

// [修改] 新增紀錄 API：支援指定日期
async function addRecordApi(record) {
    try {
        let submitDate = new Date(); // 預設為當下
        
        // 如果目前是日檢視模式，且有選擇日期，則使用選擇的日期
        if (viewIndex === 0 && selectedDate) {
            const [year, month, day] = selectedDate.split('-');
            const now = new Date();
            // 設定為該日期的目前時間 (保留時間順序)
            submitDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), now.getHours(), now.getMinutes(), now.getSeconds());
        }

        const res = await fetch(`${API_URL}/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // 將計算好的日期帶入
            body: JSON.stringify({ userId: currentUser.id, ...record, date: submitDate.toISOString() })
        });
        
        const savedRecord = await res.json();
        records.unshift(savedRecord); // 加到前端陣列最前面
        
        renderList(); // 重新渲染列表 (這時因為日期符合，就會顯示出來)
        updateDashboard(); // 更新統計數據
    } catch (err) {
        alert("新增失敗");
    }
}

async function deleteRecordApi(id) {
    try {
        await fetch(`${API_URL}/records/${id}`, { method: 'DELETE' });
        records = records.filter(r => r.id !== id);
        renderList();
        updateDashboard(); 
    } catch (err) {
        alert("刪除失敗");
    }
}

// --- 視圖邏輯 ---
function setView(index) {
    viewIndex = index;
    
    // 更新 Tab 按鈕
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const btnIndex = parseInt(btn.dataset.index);
        if (btnIndex === index) {
            btn.className = 'tab-btn flex-1 text-center py-2 text-sm rounded-lg transition-all font-bold bg-blue-600 text-white shadow-md';
        } else {
            btn.className = 'tab-btn flex-1 text-center py-2 text-sm rounded-lg transition-all text-gray-400 hover:text-gray-600';
        }
    });

    // 更新底部指示點
    const dots = document.getElementById('dots-container').children;
    Array.from(dots).forEach((dot, i) => {
        dot.className = `w-2 h-2 rounded-full ${i === index ? 'bg-gray-800' : 'bg-gray-300'}`;
    });

    // 更新篩選器 UI 可見性
    const dailyFilter = document.getElementById('daily-filter');
    if (dailyFilter) dailyFilter.style.display = index === 0 ? 'flex' : 'none';
    
    document.getElementById('month-filter').style.display = index === 1 ? 'flex' : 'none';
    document.getElementById('date-range-filter').style.display = index === 2 ? 'flex' : 'none';
    
    document.getElementById('view-title').textContent = ['日統計概覽', '當月平均概覽', '日期範圍概覽'][index];

    const listSection = document.getElementById('list-section');
    const trendInfo = document.getElementById('trend-info');

    if (viewIndex === 0) {
        listSection.classList.remove('hidden');
        trendInfo.classList.add('hidden');
    } else {
        listSection.classList.add('hidden');
        trendInfo.classList.remove('hidden');
    }

    updateDashboard();
    
    if (viewIndex === 0) renderList();
}

// 核心：根據視圖與選擇，計算日期範圍並處理背景色
function updateDashboard() {
    let start, end;
    let viewText = "";
    
    const body = document.body;
    // 使用新的 getTodayString 進行比對，更穩健
    const todayStr = getTodayString();
    const isPastDate = selectedDate !== todayStr;

    if (viewIndex === 0) { // 日檢視
        const targetDate = new Date(selectedDate);
        start = new Date(targetDate.setHours(0,0,0,0)).toISOString();
        end = new Date(targetDate.setHours(23,59,59,999)).toISOString();
        
        if (isPastDate) {
            body.classList.remove('bg-gray-50');
            body.classList.add('bg-orange-50'); 
            document.getElementById('view-title').textContent = `${selectedDate} 紀錄 (歷史)`;
        } else {
            body.classList.add('bg-gray-50');
            body.classList.remove('bg-orange-50');
            document.getElementById('view-title').textContent = '今日統計概覽';
        }

    } else { // 當月或自訂
        body.classList.add('bg-gray-50');
        body.classList.remove('bg-orange-50');

        if (viewIndex === 1) { // 當月
            const [year, month] = selectedMonth.split('-');
            start = new Date(year, month - 1, 1).toISOString(); 
            end = new Date(year, month, 0, 23, 59, 59).toISOString(); 
            viewText = `顯示 ${selectedMonth} 的平均數據`;
        } else { // 自訂範圍
            start = new Date(dateRange.start).toISOString();
            const endDate = new Date(dateRange.end);
            endDate.setHours(23, 59, 59);
            end = endDate.toISOString();
            viewText = `顯示 ${dateRange.start} 至 ${dateRange.end} 的平均數據`;
        }
        document.getElementById('trend-text').textContent = viewText;
    }

    fetchStatsApi(start, end);
}

function renderList() {
    const listContainer = document.getElementById('record-list');
    listContainer.innerHTML = '';

    let displayRecords = [];
    
    // 日檢視：只顯示選擇日期的資料
    if (viewIndex === 0) {
        displayRecords = records.filter(r => {
            const rDate = new Date(r.date);
            // 這裡也需要轉換為 YYYY-MM-DD 格式來比對
            const rYear = rDate.getFullYear();
            const rMonth = String(rDate.getMonth() + 1).padStart(2, '0');
            const rDay = String(rDate.getDate()).padStart(2, '0');
            const rDateStr = `${rYear}-${rMonth}-${rDay}`;
            
            return rDateStr === selectedDate;
        });
    }

    if (displayRecords.length === 0) {
        // 使用 getTodayString
        const todayStr = getTodayString();
        const emptyText = selectedDate === todayStr ? '尚無今日紀錄' : '該日無紀錄';
        listContainer.innerHTML = `<div class="p-8 text-center text-gray-400">${emptyText}</div>`;
        return;
    }

    displayRecords.forEach(item => {
        const config = typeConfig[item.type];
        
        const el = document.createElement('div');
        el.className = 'swipe-item-container border-b border-gray-100 last:border-none';
        
        el.innerHTML = `
            <div class="delete-bg"><i data-lucide="x"></i></div>
            <div class="swipe-content flex items-center justify-between p-4 bg-white relative z-10 transition-transform duration-300">
                <div class="flex items-center gap-3">
                    <div class="w-2 h-10 rounded-full ${config.dot}"></div>
                    <div>
                        <p class="font-bold text-gray-800">${item.category}</p>
                        <p class="text-xs text-gray-400">${config.label}</p>
                    </div>
                </div>
                <span class="font-mono font-bold text-lg text-gray-600">
                    ${item.amount}<span class="text-xs ml-1 text-gray-400">${config.unit}</span>
                </span>
            </div>
        `;

        listContainer.appendChild(el);
        // 重要：這裡綁定滑動刪除功能
        setupListItemSwipe(el, item.id);
    });
    
    lucide.createIcons();
}

// --- 手勢操作 ---

// 1. 列表項目左滑刪除
function setupListItemSwipe(element, id) {
    const content = element.querySelector('.swipe-content');
    const deleteBtn = element.querySelector('.delete-bg');
    let startX = 0;

    // --- 觸控事件 (Mobile) ---
    content.addEventListener('touchstart', (e) => {
        // 重要：阻止事件冒泡到 main-container，避免觸發 Tab 切換
        e.stopPropagation(); 
        startX = e.touches[0].clientX;
    });

    content.addEventListener('touchmove', (e) => {
        e.stopPropagation(); 
    });

    content.addEventListener('touchend', (e) => {
        e.stopPropagation(); 
        const endX = e.changedTouches[0].clientX;
        handleSwipe(startX, endX);
    });

    // --- 滑鼠事件 (Desktop Debugging) ---
    // 讓您在電腦上用滑鼠拖曳也能測試
    content.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        startX = e.clientX;
    });

    content.addEventListener('mouseup', (e) => {
        e.stopPropagation();
        const endX = e.clientX;
        handleSwipe(startX, endX);
    });

    // 統一處理滑動邏輯
    function handleSwipe(start, end) {
        const diff = end - start;
        // 左滑 > 50px 展開刪除
        if (diff < -50) {
            content.style.transform = 'translateX(-80px)';
        } 
        // 右滑 > 50px 收起
        else if (diff > 50) {
            content.style.transform = 'translateX(0)';
        }
    }

    // 點擊內容區收起
    content.addEventListener('click', (e) => {
        e.stopPropagation(); // 避免點擊穿透
        content.style.transform = 'translateX(0)';
    });

    // 點擊刪除按鈕
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if(confirm('確定要刪除這筆紀錄嗎？')) {
            deleteRecordApi(id);
        }
    });
}

// 2. 主畫面左右滑動切換 Tab
function setupMainSwipe() {
    const main = document.getElementById('main-container');
    let startX = 0;

    main.addEventListener('touchstart', (e) => startX = e.touches[0].clientX);
    
    main.addEventListener('touchend', (e) => {
        const endX = e.changedTouches[0].clientX;
        const diff = startX - endX;

        if (diff > 50 && viewIndex < 2) { // 左滑 (Next)
            setView(viewIndex + 1);
        } else if (diff < -50 && viewIndex > 0) { // 右滑 (Prev)
            setView(viewIndex - 1);
        }
    });
}

// --- Modal 邏輯 ---
let modalType = 'diet';
let modalCategory = '';

function openModal() {
    document.getElementById('modal-overlay').classList.remove('hidden');
    renderTypeSelector();
    setType('diet');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('amount-input').value = '';
}

function renderTypeSelector() {
    const container = document.getElementById('type-selector');
    container.innerHTML = Object.keys(typeConfig).map(key => {
        const t = typeConfig[key];
        return `
            <button type="button" class="type-btn flex flex-col items-center gap-2 p-2 rounded-xl transition-all opacity-60" onclick="setType('${key}')">
                <div class="p-3 rounded-full ${t.color}">
                    <i data-lucide="${t.icon}" width="24"></i>
                </div>
                <span class="text-xs font-medium text-gray-600">${t.label}</span>
            </button>
        `;
    }).join('');
    lucide.createIcons();
}

window.setType = function(type) {
    modalType = type;
    const config = typeConfig[type];

    document.querySelectorAll('.type-btn').forEach((btn, idx) => {
        const key = Object.keys(typeConfig)[idx];
        if (key === type) {
            btn.classList.remove('opacity-60');
            btn.classList.add('scale-110');
        } else {
            btn.classList.add('opacity-60');
            btn.classList.remove('scale-110');
        }
    });

    document.getElementById('unit-label').textContent = config.unit;

    const chipsContainer = document.getElementById('category-chips');
    chipsContainer.innerHTML = config.categories.map(cat => `
        <button class="cat-chip px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200" onclick="setCategory('${cat}')">${cat}</button>
    `).join('');

    modalCategory = '';
    checkForm();
};

window.setCategory = function(cat) {
    modalCategory = cat;
    document.querySelectorAll('.cat-chip').forEach(btn => {
        if (btn.textContent === cat) {
            btn.className = 'cat-chip px-4 py-2 rounded-full text-sm font-medium bg-gray-800 text-white shadow-lg';
        } else {
            btn.className = 'cat-chip px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200';
        }
    });
    checkForm();
};

document.getElementById('amount-input').addEventListener('input', checkForm);

function checkForm() {
    const amount = document.getElementById('amount-input').value;
    const btn = document.getElementById('modal-confirm');
    btn.disabled = !amount || !modalCategory;
}

function handleSubmitRecord() {
    const amount = document.getElementById('amount-input').value;
    if (!amount || !modalCategory) return;

    addRecordApi({
        type: modalType,
        amount: parseFloat(amount),
        category: modalCategory
    });
    closeModal();
}