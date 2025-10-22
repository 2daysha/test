const tg = window.Telegram?.WebApp || null;

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
        this.isTelegram = !!tg;
        this.init();
    }

    async init() { 
        if (!this.isTelegram || !tg) return;

        tg.expand();
        tg.enableClosingConfirmation();

        this.loadUserDataFromStorage();

        try {
            const linked = await this.checkTelegramLink();
            if (linked) {
                this.isAuthenticated = true;
                this.showMainApp();
            } else {
                this.showAuthPage();
            }
        } catch {
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
            const response = await fetch(`${this.baseURL}/api/telegram/check-telegram-link/`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });

            if (response.status === 401) {
                this.logout();
                this.showAuthPage();
                return false;
            }

            const data = await response.json();

            if (data.success && data.is_linked && data.participant) {
                this.participant = data.participant;
                this.userPhone = data.participant.phone_number || null;
                this.userData = {
                    ...this.userData,
                    ...data.participant.telegram_profile
                };
                this.saveUserData();
                await this.loadProducts();
                await this.loadProductCategories();
                return true;
            } else {
                this.showAuthPage();
                return false;
            }
        } catch {
            this.showNotification('Ошибка', 'Не удалось проверить привязку', 'error');
            this.showAuthPage();
            return false;
        }
    }

    logout() {
        this.isAuthenticated = false;
        this.userData = null;
        this.participant = null;
        this.userPhone = null;
        this.cart = [];
        localStorage.removeItem('userData');
        localStorage.removeItem('participant');
        this.showAuthPage();
    }

    async loadProducts() {
        try {
            const response = await fetch(`${this.baseURL}/api/telegram/products/`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });
            if (response.ok) this.products = await response.json();
        } catch {}
    }

    async loadProductCategories() {
        try {
            const response = await fetch(`${this.baseURL}/api/telegram/product-categories/`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });
            if (response.ok) this.categories = await response.json();
        } catch {}
    }

    showAuthPage() {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-auth').classList.add('active');
    document.querySelector('.bottom-nav').style.display = 'none';
    document.querySelector('.app').classList.remove('authenticated');

    const requestBtn = document.getElementById('request-phone-btn');
    if (requestBtn) requestBtn.addEventListener('click', () => this.requestPhoneTelegram());
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

    requestPhoneTelegram() {
        if (!tg) {
            this.showNotification('Ошибка', 'Telegram WebApp недоступен', 'error');
            return;
        }

        tg.sendData(JSON.stringify({ action: 'request_phone' }));

        this.showNotification('Телефон', 'Проверьте чат с ботом — он запросил номер телефона.', 'info');
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

    renderProducts() {
        const container = document.getElementById('page-home');
        if (!container) return;

        const categories = ['all', ...this.categories.map(c => c.slug || c.name.toLowerCase())];

        container.innerHTML = `
            <div class="categories">
                ${categories.map(cat => `
                    <button class="category-btn ${cat === 'all' ? 'active' : ''}" data-category="${cat}">
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

        const products = category === 'all'
            ? this.products
            : this.products.filter(p => p.category?.slug === category || p.category?.name?.toLowerCase() === category);

        if (products.length === 0) {
            grid.innerHTML = `<div class="loading">Нет товаров в этой категории</div>`;
            return;
        }

        grid.innerHTML = products.map(p => `
            <div class="product-card" onclick="app.addToCart('${p.guid}')">
                <img src="${p.image_url || 'placeholder.png'}" alt="${p.name}">
                <span class="product-category">${p.category?.name || 'Без категории'}</span>
                <h3>${p.name}</h3>
                <p>${p.stock || ''}</p>
                <div class="product-price">${p.price} бонусов</div>
                ${!p.is_available ? '<div class="product-unavailable">Недоступно</div>' : ''}
            </div>
        `).join('');
    }

    addToCart(productGuid) {
        const product = this.products.find(p => p.guid === productGuid);
        if (!product) return;

        const existing = this.cart.find(i => i.guid === productGuid);
        if (existing) existing.quantity++;
        else this.cart.push({ ...product, quantity: 1 });

        localStorage.setItem('cart', JSON.stringify(this.cart));
        this.showNotification('Добавлено', `Товар "${product.name}" добавлен в корзину`, 'success');
    }

    loadCart() {
        const container = document.getElementById('page-catalog');
        if (!container) return;

        if (this.cart.length === 0) {
            container.innerHTML = `<div class="loading">Ваша корзина пуста</div>`;
            return;
        }

        container.innerHTML = `
            <div class="cart-list">
                ${this.cart.map(item => `
                    <div class="cart-item">
                        <div class="cart-item-left">
                            <img src="${item.image_url || 'placeholder.png'}" alt="${item.name}">
                        </div>
                        <div class="cart-item-right">
                            <h3>${item.name}</h3>
                            <p>${item.category?.name || 'Без категории'}</p>
                            <div class="cart-item-bottom">
                                <span class="cart-item-price">${item.price} бонусов</span>
                                <button class="delete-btn" onclick="app.removeFromCart('${item.guid}')">Удалить</button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="cart-total animate-card">
                <div class="cart-total-header">
                    <h3 class="cart-total-title">Итого</h3>
                    <div class="cart-total-amount">
                        <span class="cart-total-price">${this.cart.reduce((s, i) => s + i.price * i.quantity, 0)}</span>
                        <span class="cart-total-currency">бонусов</span>
                    </div>
                </div>
                <button class="checkout-btn animate-btn" onclick="app.checkoutCart()">
                    <span class="checkout-text">Оплатить</span>
                    <span class="checkout-arrow">→</span>
                </button>
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
}

window.app = new LoyaltyProApp();
