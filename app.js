const tg = window.Telegram?.WebApp || null;
if (tg) {
    tg.expand();
    tg.enableClosingConfirmation();
    console.log('Telegram Web App инициализирован:', tg.initDataUnsafe);
} else {
    console.log('Запуск в обычном браузере');
}


class LoyaltyProApp {
    constructor() {
        this.currentPage = 'home';
        this.cart = [];
        this.userData = null;
        this.products = [];
        this.categories = [];
        this.participant = null;
        this.userPhone = null;
        this.baseURL = 'http://localhost:3001';
        this.isAuthenticated = false;
        this.isTelegram = !!window.Telegram?.WebApp;

        window.debugApp = this;

        this.init();
    }

    
    async init() { 
    console.log('🔧 DEBUG: === App init started ===');
    console.log('🔧 DEBUG: isTelegram:', this.isTelegram);
    console.log('🔧 DEBUG: tg available:', !!tg);
    
    if (this.isTelegram && tg) {
        tg.expand();
        tg.enableClosingConfirmation();
        console.log('🔧 DEBUG: Telegram WebApp initialized');
        console.log('🔧 DEBUG: initDataUnsafe user:', tg.initDataUnsafe?.user);
    }

    this.loadUserDataFromStorage();
    console.log('🔧 DEBUG: userData from storage:', this.userData);
    console.log('🔧 DEBUG: participant from storage:', this.participant);

    try {
        const linked = await this.checkTelegramLink();
        console.log('🔧 DEBUG: checkTelegramLink result:', linked);
        
        if (linked) {
            this.isAuthenticated = true;
            this.showMainApp();
        } else {
            this.showAuthPage();
        }
    } catch (err) {
        console.error('🔧 DEBUG: Init error:', err);
        this.showAuthPage();
    }
    }

    getAuthHeaders() {
    const initData = tg?.initData || '';
    return {
        'Authorization': `tma ${initData}`,
        'Content-Type': 'application/json'
    };
}

   
    async checkTelegramLink() {
    try {
        console.log('🔧 DEBUG: === checkTelegramLink started ===');
        console.log('🔧 DEBUG: userPhone before request:', this.userPhone);
        console.log('🔧 DEBUG: initData available:', !!tg?.initData);
        console.log('🔧 DEBUG: initData length:', tg?.initData?.length);
        console.log('🔧 DEBUG: Telegram user:', tg?.initDataUnsafe?.user);
        
        const response = await fetch(`${this.baseURL}/api/telegram/check-telegram-link/`, {
            method: 'POST',
            headers: this.getAuthHeaders()
        });
        
        console.log('🔧 DEBUG: Response status:', response.status);
        console.log('🔧 DEBUG: Response ok:', response.ok);
        
        if (response.status === 401) {
            console.log('🔧 DEBUG: 401 Unauthorized - showing auth page');
            this.showAuthPage();
            return false;
        }

        if (!response.ok) {
            console.log('🔧 DEBUG: Response not OK, throwing error');
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('🔧 DEBUG: Response data:', data);
        
        if (data.success && data.is_linked && data.participant) {
            console.log('🔧 DEBUG: Account is linked, participant:', data.participant);
            this.participant = data.participant;
            this.userPhone = this.participant.phone_number;
            console.log('🔧 DEBUG: Participant phone:', this.participant?.phone_number);
            await this.loadProducts();
            await this.loadProductCategories();
            return true;
        }
        
        console.log('🔧 DEBUG: Account not linked or other issue');
        console.log('🔧 DEBUG: success:', data.success);
        console.log('🔧 DEBUG: is_linked:', data.is_linked);
        console.log('🔧 DEBUG: has participant:', !!data.participant);
        
        return false;
    } catch (error) {
        console.error('🔧 DEBUG: Check telegram link error:', error);
        throw error;
    }
}


    async loadProducts() {
        try {
            const response = await fetch(`${this.baseURL}/api/telegram/products/`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });
            if (response.ok) this.products = await response.json();
        } catch (err) {
            console.error('Ошибка загрузки продуктов:', err);
        }
    }

    async loadProductCategories() {
        try {
            const response = await fetch(`${this.baseURL}/api/telegram/product-categories/`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });
            if (response.ok) this.categories = await response.json();
        } catch (err) {
            console.error('Ошибка загрузки категорий:', err);
        }
    }

    showAuthPage() {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('page-auth').classList.add('active');
        document.querySelector('.bottom-nav').style.display = 'none';
        document.querySelector('.app').classList.remove('authenticated');

        const requestBtn = document.getElementById('request-phone-btn');
        if (requestBtn) requestBtn.addEventListener('click', () => this.requestPhoneNumber());
    }

    showMainApp() {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelector('.bottom-nav').style.display = 'flex';
        document.querySelector('.app').classList.add('authenticated');

        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', e => this.navigateTo(e.currentTarget.dataset.page));
        });

        this.loadUserData();
        this.showPage('home');
    }

    requestPhoneNumber() {
        if (this.isTelegram) this.requestPhoneTelegram();
        else this.requestPhoneBrowser();
    }

    async requestPhoneTelegram() {
    try {
        if (!tg || !tg.requestContact) {
            this.showNotification('Ошибка', 'Функция запроса контакта недоступна', 'error');
            return;
        }

        tg.requestContact(async (contact) => {
            if (contact && contact.phone_number) {
                this.userPhone = contact.phone_number;
                console.log('Получен номер телефона:', this.userPhone);
                
                try {
                    const checkSuccess = await this.checkTelegramLink();
                    
                    if (checkSuccess) {
                        this.isAuthenticated = true;
                        this.showMainApp();
                        this.showNotification('Успех', 'Аккаунт успешно привязан', 'success');
                    } else {
                        this.showNotification('Ошибка', 'Не удалось привязать аккаунт', 'error');
                    }
                } catch (error) {
                    console.error('Ошибка при проверке привязки:', error);
                    this.showNotification('Ошибка', 'Ошибка сервера', 'error');
                }
            } else {
                this.showNotification('Контакт не предоставлен', 'Вы не предоставили номер телефона', 'error');
            }
        });
    } catch (err) {
        console.error('Ошибка в requestPhoneTelegram:', err);
        this.showNotification('Ошибка', 'Произошла непредвиденная ошибка', 'error');
    }
}

    requestPhoneBrowser() {
        this.userPhone = prompt("Введите номер телефона:");
        if (this.userPhone) {
            this.isAuthenticated = true;
            this.showMainApp();
        }
    }

    saveUserData() {
        localStorage.setItem('userData', JSON.stringify(this.userData));
        localStorage.setItem('participant', JSON.stringify(this.participant));
    }

    loadUserDataFromStorage() {
        const storedUser = localStorage.getItem('userData');
        const storedParticipant = localStorage.getItem('participant');
        if (storedUser) this.userData = JSON.parse(storedUser);
        if (storedParticipant) this.participant = JSON.parse(storedParticipant);
    }

    navigateTo(page) {
        if (!this.isAuthenticated) return this.showAuthPage();
        this.showPage(page);
    }

    showPage(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

        const pageEl = document.getElementById(`page-${page}`);
        if (pageEl) pageEl.classList.add('active');

        const navItem = document.querySelector(`[data-page="${page}"]`);
        if (navItem) navItem.classList.add('active');

        this.currentPage = page;
        this.onPageChange(page);
    }

    onPageChange(page) {
        switch (page) {
            case 'home': this.renderProducts(); break;
            case 'catalog': this.loadCart(); break;
            case 'cart': this.loadProfile(); break;
        }
    }

    loadUserData() {
    const tgUser = tg?.initDataUnsafe?.user;
    const participant = this.participant;
    const profile = participant?.telegram_profile || tgUser;

    if (profile) {
        this.userData = {
            firstName: profile.first_name || 'Пользователь',
            lastName: profile.last_name || '',
            username: profile.username ? `@${profile.username}` : 'Не указан',
            id: profile.id
        };
    } else {
        this.userData = { 
            firstName: 'Пользователь', 
            lastName: '', 
            username: 'Не указан', 
            id: 'unknown' 
        };
    }

    this.userPhone = participant?.phone_number || tgUser?.phone_number || null;
}



    checkPhoneNumber() {
        const initData = tg.initDataUnsafe;
        if (initData?.user?.phone_number) this.userPhone = initData.user.phone_number;
    }

    renderProducts() {
        const container = document.getElementById('page-home');
        if (!container) return;

        const categories = ['all', ...this.categories.map(c => c.slug || c.name.toLowerCase())];
        container.innerHTML = `
            <div class="categories">
                ${categories.map(cat => `
                    <button class="category-btn ${cat==='all'?'active':''}" data-category="${cat}">
                        ${cat[0].toUpperCase() + cat.slice(1)}
                    </button>
                `).join('')}
            </div>
            <div class="products-grid" id="products-grid"></div>
        `;

        this.updateProductGrid('all');

        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                const category = e.currentTarget.dataset.category;
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.updateProductGrid(category);
            });
        });
    }

    updateProductGrid(category) {
        const grid = document.getElementById('products-grid');
        if (!grid) return;

        const products = category === 'all' ? this.products : this.products.filter(p => p.category?.slug === category || p.category?.name?.toLowerCase() === category);
        if (products.length === 0) {
            grid.innerHTML = `<div class="loading">Нет товаров в этой категории</div>`;
            return;
        }

        grid.innerHTML = products.map(p => `
            <div class="product-card animate-card ${!p.is_available ? 'unavailable' : ''}" onclick="app.addToCart('${p.guid}')">
                <span class="product-category">${p.category?.name || 'Без категории'}</span>
                <h3>${p.name}</h3>
                <p>${p.stock || ''}</p>
                <div class="product-price">${p.price} бонусов</div>
                ${!p.is_available ? '<div class="product-unavailable">Недоступно</div>' : ''}
            </div>
        `).join('');
    }

    addToCart(productGuid) {
        this.checkPhoneBeforeAction('добавления товара', () => {
            const product = this.products.find(p => p.guid === productGuid);
            if (!product) return this.showNotification('Ошибка', 'Товар не найден', 'error');
            if (!product.is_available) return this.showNotification('Товар недоступен', 'Временно отсутствует', 'error');
            if (this.participant && product.price > this.participant.balance) return this.showNotification('Недостаточно бонусов', `У вас ${this.participant.balance}`, 'warning');

            const exists = this.cart.find(c => c.guid === product.guid);
            if (!exists) this.cart.push({ ...product, quantity: 1 });
            else exists.quantity++;

            this.showNotification('Добавлено', `Товар "${product.name}" добавлен в корзину`, 'success');
            this.saveUserData();
        });
    }

    loadCart() {
        const container = document.getElementById('page-catalog');
        if (!container) return;

        if (this.cart.length === 0) {
            container.innerHTML = `<div class="loading">Ваша корзина пуста</div>`;
            return;
        }

        container.innerHTML = this.cart.map(item => `
            <div class="cart-item animate-card">
                <div class="cart-item-header">
                    <div class="cart-item-info">
                        <span class="cart-item-category">${item.category?.name || 'Без категории'}</span>
                        <h3>${item.name}</h3>
                        <p>${item.stock || ''}</p>
                    </div>
                    <div class="cart-item-price">${item.price * item.quantity}</div>
                </div>
                <div class="cart-item-actions">
                    <button class="delete-btn animate-btn" onclick="app.removeFromCart('${item.guid}')">Удалить</button>
                </div>
            </div>
        `).join('') + `
            <div class="cart-total animate-card">
                <h3>Итого</h3>
                <div class="cart-total-price">${this.cart.reduce((sum, i) => sum + i.price * i.quantity, 0)}</div>
                <button class="checkout-btn animate-btn" onclick="app.checkoutCart()">Оплатить</button>
            </div>
        `;
    }

    removeFromCart(productGuid) {
        this.cart = this.cart.filter(c => c.guid !== productGuid);
        this.showNotification('Удалено', 'Товар удален из корзины', 'info');
        this.loadCart();
    }

    checkoutCart() {
        this.checkPhoneBeforeAction('оплаты', () => {
            this.cart = [];
            this.showNotification('Успешно', 'Оплата прошла успешно!', 'success');
            this.loadCart();
        });
    }

    loadProfile() {
        const container = document.getElementById('page-cart');
        if (!container) return;

        const { firstName, lastName, username } = this.userData || {};
        const balance = this.participant?.balance || 0;

        container.innerHTML = `
            <div class="profile-info animate-card">
                <p><strong>Имя:</strong> ${firstName} ${lastName}</p>
                <p><strong>Логин:</strong> ${username}</p>
                <p><strong>Бонусы:</strong> ${balance}</p>
            </div>
            <div class="profile-stats">
                <div class="stat-card animate-card">
                    <span class="stat-value">${balance}</span>
                    <span class="stat-label">Бонусы</span>
                </div>
                <div class="stat-card animate-card">
                    <span class="stat-value">${this.cart.length}</span>
                    <span class="stat-label">В корзине</span>
                </div>
            </div>
            <button class="tariff-btn animate-btn">Тарифы</button>
            <button class="support-btn animate-btn" onclick="app.showNotification('Поддержка','Свяжитесь с поддержкой','info')">Поддержка</button>
        `;
    }

    checkPhoneBeforeAction(action, callback) {
        if (!this.userPhone) {
            this.showNotification('Нужен телефон', `Для ${action} требуется номер телефона`, 'warning');
            this.showAuthPage();
            return;
        }
        callback();
    }

    showNotification(title, message, type = 'info') {
        const container = document.createElement('div');
        container.className = `notification show notification-${type}`;
        container.innerHTML = `
            <svg class="notification-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="currentColor"/>
            </svg>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
        `;
        document.body.appendChild(container);
        setTimeout(() => container.classList.remove('show'), 3000);
        setTimeout(() => container.remove(), 3500);
    }

    resetAllData() {
    this.cart = [];
    this.userData = null;
    this.participant = null;
    this.userPhone = null;
    this.isAuthenticated = false;
    
    localStorage.clear();
    sessionStorage.clear();
    
    this.showAuthPage();
    this.showNotification('Сброс', 'Все данные очищены', 'info');
    }
}

// создаём глобальный экземпляр
window.app = new LoyaltyProApp();
