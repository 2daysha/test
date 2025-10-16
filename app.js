const tg = window.Telegram.WebApp;

class LoyaltyProApp {
    constructor() {
        this.currentPage = 'home';
        this.cart = [];
        this.userData = null;
        this.products = [];
        this.categories = [];
        this.participant = null;
        this.baseURL = 'http://localhost:3001'; // Изменено на mock-сервер
        this.isAuthenticated = false;
        this.isTelegram = !!window.Telegram?.WebApp;
        this.init();
    }

    async init() {
        if (this.isTelegram) {
            tg.expand();
            tg.enableClosingConfirmation();
            console.log('Telegram Web App инициализирован:', tg.initDataUnsafe);
        } else {
            console.log('Запуск в браузере');
        }
        
        try {
            // Проверяем привязку через API
            await this.checkTelegramLink();
            
            if (this.participant) {
                console.log('Пользователь привязан:', this.participant);
                this.isAuthenticated = true;
                this.showMainApp();
            } else {
                this.showAuthPage();
            }
        } catch(error) {
            console.error('Ошибка в проверке привязки:', error);
            this.showAuthPage();
        }
    }

    getAuthHeaders() {
        const initData = tg.initData || 'test_init_data';
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

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Ответ проверки привязки:', data);
            
            if (data.success && data.is_linked && data.participant) {
                this.participant = data.participant;
                // Загружаем товары и категории
                await this.loadProducts();
                await this.loadProductCategories();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Ошибка при проверке привязки:', error);
            throw error;
        }
    }

    async loadProducts() {
        try {
            const response = await fetch(`${this.baseURL}/api/telegram/products/`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                this.products = await response.json();
                console.log('Товары загружены:', this.products);
            } else {
                console.error('Ошибка загрузки товаров:', response.status);
            }
        } catch (error) {
            console.error('Ошибка при загрузке товаров:', error);
        }
    }

    async loadProductCategories() {
        try {
            const response = await fetch(`${this.baseURL}/api/telegram/product-categories/`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                this.categories = await response.json();
                console.log('Категории загружены:', this.categories);
            }
        } catch (error) {
            console.error('Ошибка при загрузке категорий:', error);
        }
    }

    showAuthPage() {
        console.log('Показываем страницу аутентификации');
        // Показываем страницу аутентификации
        document.getElementById('page-auth').classList.add('active');
        document.querySelectorAll('.page').forEach(p => {
            if (p.id !== 'page-auth') p.classList.remove('active');
        });
        
        // Скрываем навигацию
        document.querySelector('.bottom-nav').style.display = 'none';
        
        // Назначаем обработчик для кнопки запроса номера
        const requestBtn = document.getElementById('request-phone-btn');
        if (requestBtn) {
            requestBtn.addEventListener('click', () => {
                this.requestPhoneNumber();
            });
        }
    }

    showMainApp() {
        console.log('Показываем основное приложение');
        // Скрываем страницу аутентификации
        document.getElementById('page-auth').classList.remove('active');
        
        // Показываем навигацию
        document.querySelector('.bottom-nav').style.display = 'flex';
        
        // Назначаем обработчики для кнопок навигации
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const targetPage = e.currentTarget.dataset.page;
                this.navigateTo(targetPage);
            });
        });

        // Загружаем начальные данные
        this.loadUserData();
        this.loadPrivileges();
        
        // Показываем начальную страницу
        this.showPage('home');
    }

    requestPhoneNumber() {
        if (this.isTelegram) {
            this.requestPhoneTelegram();
        } else {
            this.requestPhoneBrowser();
        }
    }

    async requestPhoneTelegram() {
        try {
            if (tg && tg.requestContact) {
                tg.requestContact((contact) => {
                    if (contact) {
                        console.log('Контакт получен:', contact);
                        // Здесь должна быть логика привязки номера к аккаунту
                        // Пока просто перезагружаем проверку
                        this.checkTelegramLink().then(success => {
                            if (success) {
                                this.isAuthenticated = true;
                                this.showMainApp();
                            }
                        });
                    } else {
                        console.log('Контакт не предоставлен');
                    }
                });
            }
        } catch (error) {
            console.log('Ошибка запроса контакта:', error);
        }
    }

    requestPhoneBrowser() {
        console.log('Запрос номера в браузере...');
        // Для браузера просто переходим в основное приложение
        this.isAuthenticated = true;
        this.showMainApp();
    }

    navigateTo(page) {
        if (!this.isAuthenticated) {
            this.showAuthPage();
            return;
        }
        this.showPage(page);
    }

    showPage(page) {
        if (!this.isAuthenticated) {
            this.showAuthPage();
            return;
        }

        // Скрываем все страницы
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        
        const pageElement = document.getElementById(`page-${page}`);
        if (pageElement) {
            pageElement.classList.add('active');
        }
        
        const navItem = document.querySelector(`[data-page="${page}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }

        this.currentPage = page;
        this.onPageChange(page);
    }

    onPageChange(page) {
        console.log(`Перешли на страницу: ${page}`);
        
        switch(page) {
            case 'home':
                this.loadPrivileges();
                break;
            case 'catalog':
                this.loadCart();
                break;
            case 'cart':
                this.loadProfile();
                break;
        }
    }

    loadUserData() {
        // Получаем данные пользователя из Telegram
        const user = tg.initDataUnsafe?.user;
        if (user) {
            this.userData = {
                firstName: user.first_name || 'Пользователь',
                lastName: user.last_name || '',
                username: user.username ? `@${user.username}` : 'Не указан',
                id: user.id
            };
            console.log('Данные пользователя:', this.userData);
        } else {
            this.userData = {
                firstName: 'Пользователь',
                lastName: '',
                username: 'Не указан',
                id: 'unknown'
            };
        }

        // Проверяем, есть ли номер телефона в initData
        this.checkPhoneNumber();
    }

    checkPhoneNumber() {
        const initData = tg.initDataUnsafe;
        if (initData && initData.user && initData.user.phone_number) {
            this.userPhone = initData.user.phone_number;
            console.log('Номер телефона из initData:', this.userPhone);
        }
    }

    loadPrivileges() {
        const container = document.getElementById('page-home');
        if (!container) return;

        // Используем реальные товары из API
        const productsToShow = this.products.length > 0 ? this.products : [
            {
                guid: '1',
                name: "Кофеварка автоматическая",
                stock: "Приготовление кофе с таймером",
                price: 2500,
                is_available: true,
                category: { name: "Для дома" }
            },
            {
                guid: '2',
                name: "Bluetooth колонка",
                stock: "Водонепроницаемая, 10W",
                price: 3200,
                is_available: true,
                category: { name: "Электроника" }
            }
        ];

        container.innerHTML = `
            <div class="categories">
                <button class="category-btn active" data-category="all">
                    Все
                </button>
                <button class="category-btn" data-category="electronics">
                    Электроника
                </button>
                <button class="category-btn" data-category="home">
                    Для дома
                </button>
                <button class="category-btn" data-category="lifestyle">
                    Образ жизни
                </button>
            </div>
            <div class="products-grid" id="products-grid">
                ${productsToShow.map(product => `
                    <div class="product-card ${!product.is_available ? 'unavailable' : ''}" 
                         onclick="app.addToCart('${product.guid}')">
                        <span class="product-category">${product.category?.name || 'Без категории'}</span>
                        <h3>${product.name}</h3>
                        <p>${product.stock || 'Нет описания'}</p>
                        <div class="product-price">${product.price} бонусов</div>
                        ${!product.is_available ? '<div class="product-unavailable">Недоступно</div>' : ''}
                    </div>
                `).join('')}
            </div>
        `;

        // Добавляем обработчики для категорий
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category;
                
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                this.filterProducts(category);
            });
        });
    }

    filterProducts(category) {
        const grid = document.getElementById('products-grid');
        
        if (category === 'all') {
            this.loadPrivileges();
            return;
        }
        
        const filteredProducts = this.products.filter(product => {
            const productCategory = product.category?.name?.toLowerCase();
            const filterCategory = this.getCategoryMapping(category);
            return productCategory === filterCategory;
        });
        
        grid.innerHTML = filteredProducts.map(product => `
            <div class="product-card ${!product.is_available ? 'unavailable' : ''}" 
                 onclick="app.addToCart('${product.guid}')">
                <span class="product-category">${product.category?.name || 'Без категории'}</span>
                <h3>${product.name}</h3>
                <p>${product.stock || 'Нет описания'}</p>
                <div class="product-price">${product.price} бонусов</div>
                ${!product.is_available ? '<div class="product-unavailable">Недоступно</div>' : ''}
            </div>
        `).join('');
    }

    getCategoryMapping(categoryId) {
        const mapping = {
            'electronics': 'электроника',
            'home': 'для дома', 
            'lifestyle': 'образ жизни'
        };
        return mapping[categoryId] || categoryId;
    }

    addToCart(productGuid) {
        this.checkPhoneBeforeAction('добавления товара в корзину', () => {
            const product = this.products.find(p => p.guid === productGuid);
            
            if (!product) {
                console.error('Товар не найден');
                this.showNotification('Ошибка', 'Товар не найден', 'error');
                return;
            }

            if (!product.is_available) {
                this.showNotification('Товар недоступен', 'Этот товар временно отсутствует', 'error');
                return;
            }

            // Проверяем баланс пользователя
            if (this.participant && product.price > this.participant.balance) {
                this.showNotification(
                    'Недостаточно бонусов', 
                    `У вас ${this.participant.balance} бонусов, а нужно ${product.price}`,
                    'error'
                );
                return;
            }

            // Добавляем в корзину
            this.cart.push({
                id: Date.now(),
                productGuid: product.guid,
                name: product.name,
                description: product.stock || '',
                price: product.price,
                numericPrice: product.price,
                category: product.category ? product.category.name : 'Без категории',
                image_url: product.image_url
            });

            this.showNotification(
                'Добавлено в корзину', 
                `${product.name} добавлен в корзину`,
                'success'
            );

            console.log('Товар добавлен в корзину:', product);
            console.log('Корзина:', this.cart);
        });
    }

    checkPhoneBeforeAction(actionName, actionCallback) {
        if (!this.userPhone && this.isTelegram) {
            this.showConfirm(
                'Требуется номер телефона',
                `Для ${actionName} необходимо предоставить номер телефона. Хотите продолжить?`
            ).then(wantsToContinue => {
                if (wantsToContinue) {
                    this.requestPhoneNumber();
                    // Действие выполнится после успешного получения номера
                }
            });
        } else {
            actionCallback();
        }
    }

    showNotification(title, message, type = 'info') {
        if (this.isTelegram && tg.showPopup) {
            tg.showPopup({
                title: title,
                message: message,
                buttons: [{ type: 'ok' }]
            });
        } else {
            alert(`${title}: ${message}`);
        }
    }

    showConfirm(title, message) {
        return new Promise((resolve) => {
            if (this.isTelegram && tg.showPopup) {
                tg.showPopup({
                    title: title,
                    message: message,
                    buttons: [
                        { type: 'ok', text: 'Продолжить' },
                        { type: 'cancel', text: 'Отмена' }
                    ]
                });
                // В реальном приложении нужно слушать события popupClosed
                resolve(true);
            } else {
                resolve(confirm(`${title}\n${message}`));
            }
        });
    }

    loadCart() {
        const container = document.getElementById('page-catalog');
        if (!container) return;

        if (this.cart.length === 0) {
            container.innerHTML = `
                <div class="loading" style="text-align: center; padding: 40px 20px; color: var(--tg-theme-hint-color, #999999);">
                    Корзина пуста
                </div>
            `;
            return;
        }

        const total = this.cart.reduce((sum, item) => sum + item.numericPrice, 0);

        container.innerHTML = `
            ${this.cart.map(item => `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <span class="cart-item-category">${item.category}</span>
                        <h3>${item.name}</h3>
                        <p>${item.description}</p>
                        <div class="cart-item-price">${item.price} бонусов</div>
                    </div>
                    <button onclick="app.removeFromCart(${item.id})" class="delete-btn">
                        Удалить из корзины
                    </button>
                </div>
            `).join('')}
            <div class="cart-total">
                <h3>Общая сумма</h3>
                <div class="cart-total-price">${total} бонусов</div>
                <button onclick="app.checkout()" class="checkout-btn">
                    Оформить заказ
                </button>
            </div>
        `;
    }

    removeFromCart(itemId) {
        this.cart = this.cart.filter(item => item.id !== itemId);
        this.loadCart();
        this.showNotification('Удалено', 'Товар удален из корзины', 'info');
    }

    checkout() {
        if (this.cart.length === 0) {
            this.showNotification('Ошибка', 'Корзина пуста', 'error');
            return;
        }

        const total = this.cart.reduce((sum, item) => sum + item.numericPrice, 0);
        
        this.showConfirm(
            'Подтверждение заказа',
            `Вы уверены, что хотите оформить заказ на сумму ${total} бонусов?`
        ).then(confirmed => {
            if (confirmed) {
                this.showNotification('Успех', 'Заказ успешно оформлен!', 'success');
                this.cart = [];
                this.loadCart();
                console.log('Заказ оформлен');
            } else {
                this.showNotification('Отменено', 'Заказ отменен', 'warning');
            }
        });
    }

    loadProfile() {
        const container = document.getElementById('page-cart');
        if (!container) return;

        const availableBonuses = this.participant ? this.participant.balance : 5000;
        const phoneNumber = this.participant ? this.participant.phone_number : (this.userPhone || 'Не указан');
        
        const stats = {
            totalOrders: this.cart.length,
            totalSpent: this.cart.reduce((sum, item) => sum + item.numericPrice, 0),
            availableBonuses: availableBonuses,
            rate: this.participant ? "Premium" : "Базовый"
        };

        container.innerHTML = `
            <div class="profile-info">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="#3F75FB">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                    </svg>
                    <div>
                        <h3 style="margin: 0; font-size: 18px;">${this.userData?.firstName || 'Пользователь'}</h3>
                        <p style="margin: 0; color: var(--tg-theme-hint-color, #999999); font-size: 14px;">Тариф: ${stats.rate}</p>
                    </div>
                </div>
                <p><strong>Username:</strong> ${this.userData?.username || 'Не указан'}</p>
                <p><strong>ID:</strong> ${this.userData?.id || 'unknown'}</p>
                <p><strong>Телефон:</strong> ${phoneNumber}</p>
                <p><strong>Баланс:</strong> ${availableBonuses} бонусов</p>
                
                ${!this.participant ? `
                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 12px; margin: 12px 0;">
                        <p style="margin: 0; color: #856404; font-size: 14px;">
                            🔗 Аккаунт привязан к системе лояльности
                        </p>
                    </div>
                ` : ''}
                
                <button onclick="app.logout()" style="background: #ff4444; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 14px; cursor: pointer; margin-top: 12px; width: 100%;">
                    Выйти
                </button>
            </div>
            
            <div class="profile-stats">
                <div class="stat-card">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#3F75FB" style="margin-bottom: 8px;">
                        <path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                    </svg>
                    <span class="stat-value">${stats.availableBonuses}</span>
                    <span class="stat-label">Доступно бонусов</span>
                </div>
                <div class="stat-card">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#3F75FB" style="margin-bottom: 8px;">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                    </svg>
                    <span class="stat-value">${stats.totalOrders}</span>
                    <span class="stat-label">Заказов в корзине</span>
                </div>
            </div>
            
            <button class="support-btn" onclick="app.showSupport()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                </svg>
                Связаться с поддержкой
            </button>
        `;
    }

    logout() {
        this.userPhone = null;
        this.isAuthenticated = false;
        this.participant = null;
        this.cart = [];
        this.showAuthPage();
    }

    showSupport() {
        this.showNotification('Поддержка', 'Функция связи с поддержкой в разработке', 'info');
    }

    selectTariff() {
        this.showNotification('Выбор тарифа', 'Функция выбора тарифа в разработке', 'info');
    }
}

// Создаем глобальный экземпляр приложения
const app = new LoyaltyProApp();

// Инициализация когда DOM загружен
document.addEventListener('DOMContentLoaded', () => {
    console.log('Loyalty Pro App запущен!');
});

// Глобальный доступ для отладки
window.app = app;
