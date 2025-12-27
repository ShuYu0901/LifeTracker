// --- 全域變數與狀態 ---

// const BASE_URL = 'http://localhost:5000'; 
const BASE_URL = 'https://fa3d0a4caa7d.ngrok-free.app';
const API_URL = `${BASE_URL}/api`;

const AUTH_KEY = 'life_tracker_auth'; 
const AUTH_EXPIRY_DAYS = 30; 
const THEME_KEY = 'life_tracker_theme';

const COLORS = [
    { name: 'blue', hex: '#2563eb', bg: '#eff6ff' },   
    { name: 'green', hex: '#16a34a', bg: '#f0fdf4' },  
    { name: 'orange', hex: '#ea580c', bg: '#fff7ed' }, 
    { name: 'purple', hex: '#9333ea', bg: '#faf5ff' }, 
    { name: 'pink', hex: '#db2777', bg: '#fdf2f8' }    
];

let currentThemeBg = '#f9fafb'; 
let currentUser = null;
let records = []; 
let viewIndex = 0; 
let selectedMonth = new Date().toISOString().slice(0, 7); 

function getTodayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

let selectedDate = getTodayString(); 

let dateRange = {
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
};

const typeConfig = {
    diet: { icon: 'utensils', label: '飲食', color: 'text-orange-600 bg-orange-100', dot: 'bg-orange-500', unit: '大卡', categories: ['早餐', '午餐', '晚餐', '點心', '飲料'] },
    exercise: { icon: 'dumbbell', label: '運動', color: 'text-green-600 bg-green-100', dot: 'bg-green-500', unit: '分鐘', categories: ['跑步', '健身', '瑜珈', '散步', '球類'] },
    sleep: { icon: 'moon', label: '睡眠', color: 'text-indigo-600 bg-indigo-100', dot: 'bg-indigo-500', unit: '小時', categories: ['夜間睡眠', '午睡', '補眠'] },
    money: { icon: 'wallet', label: '花費', color: 'text-yellow-600 bg-yellow-100', dot: 'bg-yellow-500', unit: '元', categories: ['餐飲', '交通', '購物', '娛樂', '帳單'] },
    weight: { icon: 'scale', label: '體重', color: 'text-blue-600 bg-blue-100', dot: 'bg-blue-500', unit: 'kg', categories: ['晨間', '睡前', '空腹'] }
};

document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    checkAutoLogin();
    initApp();
    setupAIDrawerDrag(); // [新增] 初始化拖曳功能
    lucide.createIcons();
});

// [新增] AI 抽屜控制
function openAIDrawer() {
    const drawer = document.getElementById('ai-drawer');
    const overlay = document.getElementById('ai-drawer-overlay');
    if (drawer && overlay) {
        overlay.classList.remove('hidden');
        // 延遲一點點讓 display: block 生效後再跑動畫
        setTimeout(() => {
            drawer.classList.remove('translate-y-full');
        }, 10);
    }
}

function closeAIDrawer() {
    const drawer = document.getElementById('ai-drawer');
    const overlay = document.getElementById('ai-drawer-overlay');
    if (drawer && overlay) {
        drawer.classList.add('translate-y-full');
        // 等動畫跑完再隱藏 overlay
        setTimeout(() => {
            overlay.classList.add('hidden');
        }, 300);
    }
}

// [新增] 抽屜拖曳邏輯
function setupAIDrawerDrag() {
    const handle = document.getElementById('ai-drag-handle');
    const drawer = document.getElementById('ai-drawer');
    const overlay = document.getElementById('ai-drawer-overlay');
    
    if (!handle || !drawer) return;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    // 關閉遮罩點擊
    if (overlay) {
        overlay.addEventListener('click', closeAIDrawer);
    }

    handle.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        isDragging = true;
        drawer.style.transition = 'none'; // 拖曳時移除過渡動畫以求跟手
    });

    handle.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const touchY = e.touches[0].clientY;
        const diff = touchY - startY;
        
        // 只能往下拉
        if (diff > 0) {
            e.preventDefault(); // 防止滾動
            currentY = diff;
            drawer.style.transform = `translateY(${currentY}px)`;
        }
    });

    handle.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        drawer.style.transition = 'transform 0.3s ease-out'; // 恢復動畫

        // 如果拉動超過 150px 則關閉，否則回彈
        if (currentY > 150) {
            drawer.style.transform = ''; // 清除 inline style
            closeAIDrawer();
        } else {
            drawer.style.transform = ''; // 清除 inline style，CSS class 會接手讓它回到 0
            drawer.classList.remove('translate-y-full');
        }
        currentY = 0;
    });
}

// 呼叫 AI 總結 (修改版)
async function generateAISummary() {
    if (!currentUser) return;

    const btn = document.getElementById('ai-generate-btn');
    const loading = document.getElementById('ai-loading');
    const content = document.getElementById('ai-content');

    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-not-allowed');
    loading.classList.remove('hidden');
    loading.classList.add('flex');
    
    // 清空舊內容
    content.textContent = "";

    try {
        const res = await fetch(`${API_URL}/ai-summary`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ userId: currentUser.id })
        });

        const data = await res.json();

        if (res.ok) {
            content.textContent = data.response;
            openAIDrawer(); // [新增] 成功後打開抽屜
        } else {
            content.textContent = `錯誤: ${data.message || '無法取得回應'}\n${data.detail || ''}`;
            openAIDrawer(); // 顯示錯誤
        }

    } catch (err) {
        content.textContent = "連線失敗，請確認本地伺服器與 Ollama 是否正在執行。";
        openAIDrawer();
    } finally {
        loading.classList.add('hidden');
        loading.classList.remove('flex');
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

function loadTheme() {
    const savedColor = localStorage.getItem(THEME_KEY);
    if (savedColor) {
        applyTheme(savedColor);
    }
}

function applyTheme(colorHex) {
    document.documentElement.style.setProperty('--primary-color', colorHex);
    
    const theme = COLORS.find(c => c.hex === colorHex);
    if (theme) {
        currentThemeBg = theme.bg;
    } else {
        let r = 0, g = 0, b = 0;
        if (colorHex.length === 7) {
            r = parseInt(colorHex.slice(1, 3), 16);
            g = parseInt(colorHex.slice(3, 5), 16);
            b = parseInt(colorHex.slice(5, 7), 16);
        }
        currentThemeBg = `rgba(${r}, ${g}, ${b}, 0.05)`;
    }

    if (!document.body.classList.contains('bg-orange-50')) {
        document.body.classList.remove('bg-gray-50'); 
        document.body.style.backgroundColor = currentThemeBg;
    }
    
    localStorage.setItem(THEME_KEY, colorHex);
}

function checkAutoLogin() {
    const storedData = localStorage.getItem(AUTH_KEY);
    if (storedData) {
        try {
            const { user, expiry } = JSON.parse(storedData);
            if (new Date().getTime() < expiry) {
                currentUser = user;
                const userNameEl = document.getElementById('user-name');
                const loginPage = document.getElementById('login-page');
                const appPage = document.getElementById('app-page');
                
                if (userNameEl) userNameEl.textContent = currentUser.name;
                if (loginPage) loginPage.classList.add('hidden');
                if (appPage) appPage.classList.remove('hidden');
                
                fetchRecords();
                updateDashboard();
            } else {
                localStorage.removeItem(AUTH_KEY);
            }
        } catch (e) {
            console.error("Auto login parse error", e);
            localStorage.removeItem(AUTH_KEY);
        }
    }
}

function initApp() {
    const currentDateEl = document.getElementById('current-date');
    if (currentDateEl) {
        currentDateEl.textContent = new Date().toLocaleDateString();
    }
    
    const filterContainer = document.getElementById('month-filter')?.parentNode;
    if (filterContainer && !document.getElementById('daily-filter')) {
        const dailyDiv = document.createElement('div');
        dailyDiv.id = 'daily-filter';
        dailyDiv.className = 'flex items-center bg-white px-2 py-1 rounded-lg shadow-sm border border-gray-200 ml-auto'; 
        dailyDiv.innerHTML = `
            <i data-lucide="calendar-days" width="14" class="text-gray-400 mr-2"></i>
            <input type="date" id="daily-date-input" class="bg-transparent text-sm font-medium text-gray-700 outline-none">
        `;
        filterContainer.appendChild(dailyDiv);
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => setView(parseInt(e.target.dataset.index)));
    });

    const addBtn = document.getElementById('add-btn');
    if (addBtn) addBtn.addEventListener('click', openModal);
    
    const modalCancel = document.getElementById('modal-cancel');
    if (modalCancel) modalCancel.addEventListener('click', closeModal);
    
    const modalConfirm = document.getElementById('modal-confirm');
    if (modalConfirm) modalConfirm.addEventListener('click', handleSubmitRecord);

    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const settingsClose = document.getElementById('settings-close');
    const colorContainer = document.getElementById('color-options');

    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.remove('hidden');
        });
        
        settingsClose.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
        });

        if (colorContainer && colorContainer.children.length === 0) {
            COLORS.forEach(c => {
                const btn = document.createElement('button');
                btn.className = 'w-10 h-10 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform';
                btn.style.backgroundColor = c.hex;
                btn.addEventListener('click', () => {
                    applyTheme(c.hex);
                    btn.classList.add('ring-2', 'ring-offset-2', 'ring-gray-300');
                    setTimeout(() => btn.classList.remove('ring-2', 'ring-offset-2', 'ring-gray-300'), 200);
                });
                colorContainer.appendChild(btn);
            });

            const customBtnWrapper = document.createElement('div');
            customBtnWrapper.className = 'relative w-10 h-10 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform overflow-hidden';
            customBtnWrapper.style.background = 'conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)';
            customBtnWrapper.title = '自選顏色';
            
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.className = 'absolute inset-0 w-full h-full opacity-0 cursor-pointer';
            colorInput.addEventListener('input', (e) => {
                applyTheme(e.target.value);
            });

            customBtnWrapper.appendChild(colorInput);
            colorContainer.appendChild(customBtnWrapper);
        }
    }

    const monthInput = document.getElementById('month-input');
    if (monthInput) {
        monthInput.value = selectedMonth;
        monthInput.addEventListener('change', (e) => {
            selectedMonth = e.target.value;
            updateDashboard(); 
        });
    }

    const dailyInput = document.getElementById('daily-date-input');
    if (dailyInput) {
        dailyInput.value = selectedDate;
        dailyInput.addEventListener('change', (e) => {
            selectedDate = e.target.value;
            updateDashboard();
            renderList(); 
        });
    }

    const dateStart = document.getElementById('date-start');
    if (dateStart) {
        dateStart.value = dateRange.start;
        dateStart.addEventListener('change', (e) => { dateRange.start = e.target.value; updateDashboard(); });
    }
    
    const dateEnd = document.getElementById('date-end');
    if (dateEnd) {
        dateEnd.value = dateRange.end;
        dateEnd.addEventListener('change', (e) => { dateRange.end = e.target.value; updateDashboard(); });
    }

    const aiBtn = document.getElementById('ai-generate-btn');
    if (aiBtn) aiBtn.addEventListener('click', generateAISummary);

    setupMainSwipe();
    setView(0);
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('login-error');

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        
        if (res.ok) {
            currentUser = data.user;
            
            const expiryTime = new Date().getTime() + (AUTH_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
            localStorage.setItem(AUTH_KEY, JSON.stringify({ user: currentUser, expiry: expiryTime }));

            document.getElementById('user-name').textContent = currentUser.name;
            document.getElementById('login-page').classList.add('hidden');
            document.getElementById('app-page').classList.remove('hidden');
            
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
    
    localStorage.removeItem(AUTH_KEY);

    document.getElementById('app-page').classList.add('hidden');
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    
    document.body.classList.remove('bg-orange-50');
    document.body.style.backgroundColor = ''; 
    document.body.classList.add('bg-gray-50');
}

async function fetchRecords() {
    if (!currentUser) return;
    try {
        const res = await fetch(`${API_URL}/records/${currentUser.id}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Server returned ${res.status}: ${text}`);
        }

        records = await res.json();
        renderList(); 
    } catch (err) {
        console.error("Fetch records error", err);
    }
}

async function fetchWeightTrend(days = 7) {
    if (!currentUser) return;
    try {
        const today = new Date();
        const pastDate = new Date();
        pastDate.setDate(today.getDate() - days);
        
        const start = pastDate.toISOString();
        const end = today.toISOString();

        const res = await fetch(`${API_URL}/stats/${currentUser.id}?startDate=${start}&endDate=${end}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });

        if (!res.ok) return;

        const stats = await res.json();
        
        if (stats.weight > 0 && stats.weightAvg > 0) {
            const trend = parseFloat((stats.weight - stats.weightAvg).toFixed(1));
            const trendEl = document.getElementById('val-weight-trend');
            
            if (trendEl) {
                if (trend > 0) {
                    trendEl.textContent = `+${trend} kg`;
                    trendEl.className = 'text-sm font-bold text-red-500';
                } else if (trend < 0) {
                    trendEl.textContent = `${trend} kg`;
                    trendEl.className = 'text-sm font-bold text-green-500';
                } else {
                    trendEl.textContent = '持平';
                    trendEl.className = 'text-sm font-bold text-gray-400';
                }
            }
        }
    } catch (err) {
        console.error("Fetch weight trend error", err);
    }
}

async function fetchStatsApi(start, end) {
    if (!currentUser) return;
    try {
        const res = await fetch(`${API_URL}/stats/${currentUser.id}?startDate=${start}&endDate=${end}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Server returned ${res.status}: ${text}`);
        }

        const stats = await res.json();
        
        animateValue('val-diet', stats.diet);
        animateValue('val-exercise', stats.exercise);
        animateValue('val-sleep', stats.sleep);
        animateValue('val-money', stats.money);
        
        const defaultView = document.getElementById('weight-default-view');
        const statsView = document.getElementById('weight-stats-view');
        const trendLabelEl = document.getElementById('label-weight-trend');

        if (viewIndex === 0) {
            if (defaultView) {
                defaultView.classList.remove('hidden');
                defaultView.classList.add('flex');
            }
            if (statsView) {
                statsView.classList.remove('flex');
                statsView.classList.add('hidden');
            }

            animateValue('val-weight', stats.weight);
            
            if (trendLabelEl) trendLabelEl.textContent = '過去一周';
            
            const trendEl = document.getElementById('val-weight-trend');
            if (trendEl) {
                trendEl.textContent = '--';
                trendEl.className = 'text-sm font-bold text-gray-400';
            }

        } else {
            if (defaultView) {
                defaultView.classList.remove('flex');
                defaultView.classList.add('hidden');
            }
            if (statsView) {
                statsView.classList.remove('hidden');
                statsView.classList.add('flex');
            }

            animateValue('val-weight-avg', stats.weightAvg);
            animateValue('val-weight-max', stats.weightMax);
            animateValue('val-weight-min', stats.weightMin);
        }

    } catch (err) {
        console.error("Fetch stats error", err);
    }
}

function animateValue(id, end) {
    const obj = document.getElementById(id);
    if(obj) obj.textContent = end;
}

async function addRecordApi(record) {
    try {
        let submitDate = new Date(); 
        
        if (viewIndex === 0 && selectedDate) {
            const [year, month, day] = selectedDate.split('-').map(Number);
            const now = new Date();
            submitDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
        }

        const res = await fetch(`${API_URL}/records`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ userId: currentUser.id, ...record, date: submitDate.toISOString() })
        });
        
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Server returned ${res.status}: ${text}`);
        }

        const savedRecord = await res.json();

        records.unshift(savedRecord); 
        
        renderList(); 
        updateDashboard(); 
    } catch (err) {
        alert("新增失敗: " + err.message);
    }
}

async function deleteRecordApi(id) {
    try {
        await fetch(`${API_URL}/records/${id}`, { 
            method: 'DELETE',
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        records = records.filter(r => r.id !== id);
        renderList();
        updateDashboard(); 
    } catch (err) {
        alert("刪除失敗");
    }
}

function setView(index) {
    viewIndex = index;
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const btnIndex = parseInt(btn.dataset.index);
        if (btnIndex === index) {
            btn.className = 'tab-btn flex-1 text-center py-2 text-sm rounded-lg transition-all font-bold bg-primary text-white shadow-md';
        } else {
            btn.className = 'tab-btn flex-1 text-center py-2 text-sm rounded-lg transition-all text-gray-400 hover:text-gray-600';
        }
    });

    const dots = document.getElementById('dots-container').children;
    Array.from(dots).forEach((dot, i) => {
        dot.className = `w-2 h-2 rounded-full ${i === index ? 'bg-gray-800' : 'bg-gray-300'}`;
    });

    const dailyFilter = document.getElementById('daily-filter');
    if (dailyFilter) dailyFilter.style.display = index === 0 ? 'flex' : 'none';
    
    const monthFilter = document.getElementById('month-filter');
    if (monthFilter) monthFilter.style.display = index === 1 ? 'flex' : 'none';

    const rangeFilter = document.getElementById('date-range-filter');
    if (rangeFilter) rangeFilter.style.display = index === 2 ? 'flex' : 'none';
    
    const viewTitle = document.getElementById('view-title');
    if (viewTitle) viewTitle.textContent = ['日統計概覽', '當月平均概覽', '日期範圍概覽'][index];

    const listSection = document.getElementById('list-section');
    const trendInfo = document.getElementById('trend-info');
    
    const dashboardView = document.getElementById('dashboard-view');
    const aiSection = document.getElementById('ai-section');
    const addBtn = document.getElementById('add-btn');

    if (index === 3) {
        // AI View
        if (dashboardView) dashboardView.classList.add('hidden');
        if (aiSection) {
            aiSection.classList.remove('hidden');
            aiSection.classList.add('flex');
        }
        if (addBtn) addBtn.style.display = 'none';
    } else {
        // Normal View
        if (dashboardView) dashboardView.classList.remove('hidden');
        if (aiSection) {
            aiSection.classList.add('hidden');
            aiSection.classList.remove('flex');
        }
        if (addBtn) addBtn.style.display = 'flex';

        if (index === 0) {
            if (listSection) {
                listSection.classList.remove('hidden');
            }
            if (trendInfo) {
                trendInfo.classList.add('hidden');
            }
        } else {
            if (listSection) {
                listSection.classList.add('hidden');
            }
            if (trendInfo) {
                trendInfo.classList.remove('hidden');
            }
        }
        updateDashboard();
        if (index === 0) renderList();
    }
}

function updateDashboard() {
    let start, end;
    let viewText = "";
    
    const body = document.body;
    const todayStr = getTodayString();
    const isPastDate = selectedDate !== todayStr;

    if (viewIndex === 0) { 
        const [y, m, d] = selectedDate.split('-').map(Number);
        
        const startLocal = new Date(y, m - 1, d, 0, 0, 0, 0);
        const endLocal = new Date(y, m - 1, d, 23, 59, 59, 999);
        
        start = startLocal.toISOString();
        end = endLocal.toISOString();
        
        const viewTitle = document.getElementById('view-title');
        
        if (isPastDate) {
            body.style.backgroundColor = '';
            body.classList.remove('bg-gray-50');
            body.classList.add('bg-orange-50'); 
            if (viewTitle) viewTitle.textContent = `${selectedDate} 紀錄 (歷史)`;
        } else {
            body.classList.remove('bg-orange-50');
            body.classList.remove('bg-gray-50');
            body.style.backgroundColor = currentThemeBg;
            if (viewTitle) viewTitle.textContent = '今日統計概覽';
        }

    } else { 
        body.classList.remove('bg-orange-50');
        body.classList.remove('bg-gray-50');
        body.style.backgroundColor = currentThemeBg;

        if (viewIndex === 1) { 
            const [year, month] = selectedMonth.split('-');
            start = new Date(year, month - 1, 1).toISOString(); 
            end = new Date(year, month, 0, 23, 59, 59).toISOString(); 
            viewText = `顯示 ${selectedMonth} 的平均數據`;
        } else { 
            start = new Date(dateRange.start).toISOString();
            const endDate = new Date(dateRange.end);
            endDate.setHours(23, 59, 59);
            end = endDate.toISOString();
            viewText = `顯示 ${dateRange.start} 至 ${dateRange.end} 的平均數據`;
        }
        const trendText = document.getElementById('trend-text');
        if (trendText) trendText.textContent = viewText;
    }

    fetchStatsApi(start, end).then(() => {
        if (viewIndex === 0) {
            fetchWeightTrend(7); 
        }
    });
}

function renderList() {
    const listContainer = document.getElementById('record-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    let displayRecords = [];
    
    if (viewIndex === 0) {
        displayRecords = records.filter(r => {
            if (!r.date) return false;
            
            const rDate = new Date(r.date);
            const rYear = rDate.getFullYear();
            const rMonth = String(rDate.getMonth() + 1).padStart(2, '0');
            const rDay = String(rDate.getDate()).padStart(2, '0');
            const rDateStr = `${rYear}-${rMonth}-${rDay}`;
            
            return rDateStr === selectedDate;
        });
    }

    if (displayRecords.length === 0) {
        const todayStr = getTodayString();
        const emptyText = selectedDate === todayStr ? '尚無今日紀錄' : '該日無紀錄';
        listContainer.innerHTML = `<div class="p-8 text-center text-gray-400">${emptyText}</div>`;
        return;
    }

    displayRecords.forEach(item => {
        const config = typeConfig[item.type];
        
        if (!config) return;

        const el = document.createElement('div');
        el.className = 'swipe-item-container relative overflow-hidden border-b border-gray-100 last:border-none select-none';
        
        el.innerHTML = `
            <div class="delete-action-area absolute inset-y-0 right-0 w-24 flex items-center justify-center z-0">
                <button class="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white shadow-sm hover:bg-red-600 transition-colors">
                    <i data-lucide="x" width="20"></i>
                </button>
            </div>
            
            <div class="swipe-content relative z-10 bg-white flex items-center justify-between p-4 transition-transform duration-300 ease-out w-full">
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
        setupListItemSwipe(el, item.id);
    });
    
    lucide.createIcons();
}

function setupListItemSwipe(element, id) {
    const content = element.querySelector('.swipe-content');
    const deleteBtn = element.querySelector('.delete-action-area button');
    let startX = 0;

    content.addEventListener('touchstart', (e) => {
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

    content.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        startX = e.clientX;
    });

    content.addEventListener('mouseup', (e) => {
        e.stopPropagation();
        const endX = e.clientX;
        handleSwipe(startX, endX);
    });

    function handleSwipe(start, end) {
        const diff = end - start;
        if (diff < -50) {
            content.style.transform = 'translateX(-80px)';
        } else if (diff > 50) {
            content.style.transform = 'translateX(0)';
        }
    }

    content.addEventListener('click', (e) => {
        e.stopPropagation();
        content.style.transform = 'translateX(0)';
    });

    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if(confirm('確定要刪除這筆紀錄嗎？')) {
                deleteRecordApi(id);
            }
        });
    }
}

function setupMainSwipe() {
    const main = document.getElementById('main-container');
    let startX = 0;

    main.addEventListener('touchstart', (e) => startX = e.touches[0].clientX);
    
    main.addEventListener('touchend', (e) => {
        const endX = e.changedTouches[0].clientX;
        const diff = startX - endX;

        if (diff > 50 && viewIndex < 2) { 
            setView(viewIndex + 1);
        } else if (diff < -50 && viewIndex > 0) { 
            setView(viewIndex - 1);
        }
    });
}

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