document.addEventListener('DOMContentLoaded', () => {
    const datePicker = document.getElementById('datePicker');
    const todayBtn = document.getElementById('today-btn');
    const selectedDateEl = document.getElementById('selected-date');
    const menuList = document.getElementById('menu-list');
    const nutritionInfo = document.getElementById('nutrition-info');
    const prevWeekBtn = document.getElementById('prev-week');
    const nextWeekBtn = document.getElementById('next-week');
    let currentWeekStart = new Date(); // 현재 표시 중인 주의 시작일
    let selectedMenuDate = ''; // 선택된 날짜 저장용 변수 추가
    const menuModal = document.getElementById('menuModal');
    const modalClose = document.querySelector('.modal-close');
    const modalTitle = document.querySelector('.modal-title');
    const modalMenuList = document.querySelector('.modal-menu-list');

    // Set today as default date
    const today = new Date();
    datePicker.valueAsDate = today;
    
    // Initial load with today's menu
    loadMenu(formatDate(today), true);

    // Event listeners
    datePicker.addEventListener('change', (e) => {
        loadMenu(formatDate(new Date(e.target.value)), true);
    });

    todayBtn.addEventListener('click', () => {
        datePicker.valueAsDate = new Date();
        loadMenu(formatDate(new Date()), true);
    });

    // 주간 이동 버튼 이벤트 리스너 수정
    prevWeekBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        loadWeeklyMenu(currentWeekStart);
    });

    nextWeekBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        loadWeeklyMenu(currentWeekStart);
    });

    // 모달 닫기 이벤트
    modalClose.addEventListener('click', () => {
        menuModal.classList.remove('show');
    });

    // 배경 클릭 시 모달 닫기
    menuModal.addEventListener('click', (e) => {
        if (e.target === menuModal) {
            menuModal.classList.remove('show');
        }
    });

    // 메뉴 아이템 클릭 이벤트 처리 함수
    function handleMenuClick(menuText, date) {
        modalTitle.textContent = date;
        modalMenuList.innerHTML = menuText
            .split('<br/>')
            .map(item => item.trim())
            .filter(item => item)
            .map(item => `<li>${item}</li>`)
            .join('');
        menuModal.classList.add('show');
    }

    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }

    function formatDisplayDate(dateStr) {
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        return `${year}년 ${month}월 ${day}일`;
    }

    // 날짜 포맷 함수 추가
    function formatShortDate(date) {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `(${month}/${day})`;
    }

    // 주간 메뉴만 로드하는 함수 수정
    async function loadWeeklyMenu(startDate) {
        const monday = new Date(startDate);
        monday.setDate(startDate.getDate() - startDate.getDay() + 1);
        currentWeekStart = new Date(monday);

        // 월요일부터 금요일까지의 메뉴 로드
        for (let i = 0; i < 5; i++) {
            const currentDate = new Date(monday);
            currentDate.setDate(monday.getDate() + i);
            const currentDateStr = formatDate(currentDate);
            
            const dayElement = document.querySelector(`.day-card:nth-child(${i + 1})`);
            const dateSpan = dayElement.querySelector('.date');
            dateSpan.textContent = formatShortDate(currentDate);
            
            // 오늘 날짜인지 확인하여 today 클래스 추가/제거
            const todayStr = formatDate(new Date());
            if (currentDateStr === todayStr) {
                dayElement.classList.add('today');
            } else {
                dayElement.classList.remove('today');
            }
            
            const dayUrl = `https://open.neis.go.kr/hub/mealServiceDietInfo?ATPT_OFCDC_SC_CODE=B10&SD_SCHUL_CODE=7130181&MLSV_YMD=${currentDateStr}`;
            try {
                const dayResponse = await fetch(dayUrl);
                const dayData = await dayResponse.text();
                const parser = new DOMParser();
                const dayXmlDoc = parser.parseFromString(dayData, "text/xml");
                
                const dayMealInfo = dayXmlDoc.querySelector('DDISH_NM');
                
                if (dayMealInfo) {
                    const dayMenuItems = dayMealInfo.textContent.split('<br/>');
                    const menuHtml = dayMenuItems
                        .map(item => {
                            const cleanText = item.replace(/\([^)]*\)/g, '').trim();
                            if (cleanText) {
                                // 특수문자 이스케이프 처리 추가
                                const escapedText = dayMealInfo.textContent
                                    .replace(/'/g, "\\'")
                                    .replace(/"/g, '\\"')
                                    .replace(/\n/g, '');
                                return `<li onclick='handleMenuClick("${escapedText}", "${formatDisplayDate(currentDateStr)}")'>${cleanText}</li>`;
                            }
                            ren '';
                        })
                        .filter(item => item)
                        .join('');
                    dayElement.querySelector('.daily-menu').innerHTML = menuHtml;
                } else {
                    dayElement.querySelector('.daily-menu').innerHTML = '<li class="no-menu">급식 정보가 없습니다.</li>';
                }
            } catch (error) {
                console.error('Error loading weekly menu:', error);
                dayElement.querySelector('.daily-menu').innerHTML = '<li class="no-menu">메뉴를 불러오는 중 오류가 발생했습니다.</li>';
            }
        }
    }

    async function loadMenu(dateStr, updateSelected = false) {
        try {
            if (updateSelected) {
                selectedMenuDate = dateStr; // 선택된 날짜 업데이트
            }

            // 선택된 날짜의 메뉴 로드
            const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?ATPT_OFCDC_SC_CODE=B10&SD_SCHUL_CODE=7130181&MLSV_YMD=${selectedMenuDate}`;
            const response = await fetch(url);
            const data = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data, "text/xml");

            // Update date display
            selectedDateEl.textContent = formatDisplayDate(selectedMenuDate);

            // Clear previous content
            menuList.innerHTML = '';
            nutritionInfo.innerHTML = '';

            // 메인 메뉴 로드 로직...
            const mealInfo = xmlDoc.querySelector('DDISH_NM');
            if (!mealInfo) {
                menuList.innerHTML = '<li class="no-menu">해당 날짜의 급식 정보가 없습니다.</li>';
            } else {
                // 기존 메뉴 표시 로직...
                const menuItems = mealInfo.textContent.split('<br/>');
                menuItems.forEach(item => {
                    if (item.trim()) {
                        const li = document.createElement('li');
                        const cleanText = item.replace(/\([^)]*\)/g, '').trim();
                        li.textContent = cleanText;
                        // 특수문자 이스케이프 처리 추가
                        const escapedText = cleanText
                            .replace(/&/g, '&amp;')
                            .replace(/"/g, '&quot;')
                            .replace(/'/g, '&#39;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;');
                        li.setAttribute('data-tooltip', escapedText);
                        menuList.appendChild(li);
                    }
                });

                // 영양 정보 표시 로직...
                const nutritionItems = [
                    { key: 'CAL_INFO', label: '칼로리' },
                    { key: 'PROT_INFO', label: '단백질' },
                    { key: 'FAT_INFO', label: '지방' },
                    { key: 'CARB_INFO', label: '탄수화물' },
                    { key: 'VITA_INFO', label: '비타민A' },
                    { key: 'VITC_INFO', label: '비타민C' },
                    { key: 'CALS_INFO', label: '칼슘' },
                    { key: 'IRON_INFO', label: '철분' }
                ];

                const nutritionTitle = document.createElement('h3');
                nutritionTitle.textContent = '영양 정보';
                nutritionInfo.appendChild(nutritionTitle);

                const nutritionGrid = document.createElement('div');
                nutritionGrid.className = 'nutrition-grid';

                nutritionItems.forEach(({ key, label }) => {
                    const value = xmlDoc.querySelector(key)?.textContent;
                    if (value) {
                        const div = document.createElement('div');
                        div.className = 'nutrition-item';
                        div.innerHTML = `
                            <strong>${label}</strong><br>
                            ${value}
                        `;
                        nutritionGrid.appendChild(div);
                    }
                });

                nutritionInfo.appendChild(nutritionGrid);
            }

            // 주간 메뉴 로드
            if (updateSelected) {
                const selectedDate = new Date(dateStr.substring(0, 4), 
                    parseInt(dateStr.substring(4, 6)) - 1, 
                    parseInt(dateStr.substring(6, 8)));
                await loadWeeklyMenu(selectedDate);
            }

        } catch (error) {
            console.error('Error loading menu:', error);
            menuList.innerHTML = '<li class="no-menu">메뉴를 불러오는 중 오류가 발생했습니다.</li>';
        }
    }
});
