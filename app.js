const tg = window.Telegram.WebApp;

class LoyaltyProApp {
    constructor() {
        this.currentPage = 'auth';
        this.cart = [];
        this.userData = null;
        this.userPhone = null;
        this.isTelegram = !!tg.initData;
        this.isAuthenticated = false;
        this.users = [];
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

        // Загружаем данные пользователей
        await this.loadUsersData();
        
        // Загружаем сохраненные данные
        this.loadSavedUserData();
        this.loadUserData();

        // Если номер уже есть, пропускаем авторизацию
        if (this.userPhone) {
            this.isAuthenticated = true;
            this.showPage('home');
            this.loadPrivileges();
        } else {
            this.showPage('auth');
            this.initShareContactButton();
        }

        // Навигация только для авторизованных пользователей
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!this.isAuthenticated) {
                    this.showNotification('Требуется авторизация', 'Предоставьте номер телефона для доступа', 'warning');
                    this.showPage('auth');
                    return;
                }
                
                const targetPage = e.currentTarget.dataset.page;
                this.navigateTo(targetPage);
            });
        });
    }

    initShareContactButton() {
        const authPage = document.getElementById('page-auth');
        if (!authPage) return;

        if (this.isTelegram) {
            authPage.innerHTML = `
                <div class="auth-container">
                    <div class="auth-header">
                        <h2 class="auth-title">Добро пожаловать!</h2>
                        <p class="auth-subtitle">
                            Для доступа к бонусной программе необходимо подтвердить номер телефона
                        </p>
                    </div>
                    
                    <p class="auth-instruction">
                        Нажмите кнопку внизу экрана для предоставления номера
                    </p>
                </div>
            `;
            this.initMainButton();
        } else {
            // Для ПК версии обычная кнопка
            authPage.innerHTML = `
                <div class="auth-container">
                    <div class="auth-header">
                        <h2 class="auth-title">Добро пожаловать!</h2>
                        <p class="auth-subtitle">
                            Для доступа к бонусной программе необходимо подтвердить номер телефона
                        </p>
                    </div>
                    
                    <button id="share-contact-btn" class="share-contact-btn">
                        📱 Предоставить номер телефона
                    </button>

                    <div class="auth-footer">
                        Нажимая кнопку, вы соглашаетесь с условиями использования
                    </div>
                </div>
            `;

            document.getElementById('share-contact-btn').addEventListener('click', () => {
                this.shareContact();
            });
        }
    }

    initMainButton() {
        if (!this.isTelegram) return;

        // Настраиваем основную кнопку Telegram
        tg.MainButton.setText("📱 Предоставить номер");
        tg.MainButton.setColor("#3F75FB");
        tg.MainButton.show();
        
        // Обработчик клика
        tg.MainButton.onClick(() => {
            this.requestPhoneWithMainButton();
        });
    }

    requestPhoneWithMainButton() {
        if (!this.isTelegram) return;

        tg.requestContact((contact) => {
            console.log('Contact response:', contact);
            
            if (contact && contact.phone_number) {
                this.userPhone = contact.phone_number;
                console.log('✅ Номер получен:', this.userPhone);
                
                // Скрываем кнопку после успеха
                tg.MainButton.hide();
                
                this.processUserAuthentication(this.userPhone, contact);
            } else {
                console.log('❌ Номер не предоставлен');
                this.showNotification('Отменено', 'Номер не предоставлен', 'warning');
            }
        });
    }

    shareContact() {
        // Для ПК версии
        this.userPhone = '+79991234567';
        this.processUserAuthentication(this.userPhone, {
            first_name: 'Тестовый',
            last_name: 'Пользователь'
        });
    }

    async processUserAuthentication(phone, contactData = null) {
        this.userPhone = phone;
        
        // Сохраняем данные
        this.saveUserData();
        this.isAuthenticated = true;
        
        // Отправляем данные в бота
        await this.sendUserDataToBot(phone, contactData);
        
        this.showNotification('Успех', 'Номер подтвержден!', 'success');
        
        setTimeout(() => {
            this.showPage('home');
            this.loadPrivileges();
        }, 1000);
    }

    async sendUserDataToBot(phone, contactData = null) {
        if (!this.isTelegram) {
            console.log('Отправка данных в бота (ПК режим):', { phone });
            return;
        }

        try {
            const userData = {
                type: 'user_auth',
                phone: phone,
                firstName: contactData?.first_name || this.userData?.firstName,
                lastName: contactData?.last_name || this.userData?.lastName,
                userId: contactData?.user_id || this.userData?.id
            };

            tg.sendData(JSON.stringify(userData));
            console.log('Данные отправлены в бота:', userData);
        } catch (error) {
            console.error('Ошибка отправки данных в бота:', error);
        }
    }

    async loadUsersData() {
        try {
            const response = await fetch('./users.json');
            if (response.ok) {
                this.users = await response.json();
                console.log('Данные пользователей загружены:', this.users);
            } else {
                console.error('Ошибка загрузки users.json:', response.status);
                this.users = [];
            }
        } catch (error) {
            console.error('Ошибка загрузки users.json:', error);
            this.users = [];
        }
    }

    saveUserData() {
        const userData = {
            userData: this.userData,
            userPhone: this.userPhone
        };
        localStorage.setItem('loyaltyProUserData', JSON.stringify(userData));
        console.log('Данные пользователя сохранены');
    }

    loadSavedUserData() {
        const saved = localStorage.getItem('loyaltyProUserData');
        if (saved) {
            try {
                const userData = JSON.parse(saved);
                this.userData = userData.userData || this.userData;
                this.userPhone = userData.userPhone || this.userPhone;
                console.log('Данные пользователя загружены из localStorage:', this.userPhone);
            } catch (e) {
                console.error('Ошибка загрузки данных:', e);
            }
        }
    }

    loadUserData() {
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
    }

    showPage(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        
        const pageElement = document.getElementById(`page-${page}`);
        if (pageElement) {
            pageElement.classList.add('active');
        }
        
        if (page !== 'auth') {
            const navItem = document.querySelector(`[data-page="${page}"]`);
            if (navItem) {
                navItem.classList.add('active');
            }
        }

        this.currentPage = page;
        this.onPageChange(page);
    }

    navigateTo(page) {
        if (!this.isAuthenticated && page !== 'auth') {
            this.showNotification('Требуется авторизация', 'Предоставьте номер телефона для доступа', 'warning');
            this.showPage('auth');
            return;
        }
        this.showPage(page);
    }

    onPageChange(page) {
        console.log(`Перешли на страницу: ${page}`);
        
        if (!this.isAuthenticated && page !== 'auth') return;
        
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

    showNotification(title, message, type = 'info') {
        if (this.isTelegram) {
            tg.showPopup({
                title: title,
                message: message,
                buttons: [{ type: 'ok' }]
            });
        } else {
            alert(`${title}: ${message}`);
        }
    }


    loadPrivileges() {
        const container = document.getElementById('page-home');
        if (!container) return;

        const categories = [
            { id: 'all', name: 'Все' },
            { id: 'electronics', name: 'Электроника' },
            { id: 'home', name: 'Для дома' },
            { id: 'lifestyle', name: 'Образ жизни' }
        ];

        const products = [
            { id: 1, name: "Кофеварка автоматическая", description: "Приготовление кофе с таймером", price: "2500 бонусов", numericPrice: 2500, category: "home" },
            { id: 2, name: "Набор кухонных ножей", description: "6 предметов, керамическое покрытие", price: "1800 бонусов", numericPrice: 1800, category: "home" },
            { id: 3, name: "Bluetooth колонка", description: "Водонепроницаемая, 10W", price: "3200 бонусов", numericPrice: 3200, category: "electronics" },
            { id: 4, name: "Подарочная карта в магазин", description: "Номинал 1000 рублей", price: "1000 бонусов", numericPrice: 1000, category: "lifestyle" }
        ];

        const categoryNames = {
            electronics: "Электроника",
            home: "Для дома", 
            lifestyle: "Образ жизни"
        };

        container.innerHTML = `
            <div class="categories">
                ${categories.map(cat => `
                    <button class="category-btn ${cat.id === 'all' ? 'active' : ''}" data-category="${cat.id}">
                        ${cat.name}
                    </button>
                `).join('')}
            </div>
            <div class="products-grid">
                ${products.map(product => `
                    <div class="product-card" onclick="app.addToCart(${product.id})">
                        <span class="product-category">${categoryNames[product.category]}</span>
                        <h3>${product.name}</h3>
                        <p>${product.description}</p>
                        <div class="product-price">${product.price}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    addToCart(productId) {
        if (!this.userPhone) {
            this.showNotification('Требуется авторизация', 'Предоставьте номер телефона для добавления товара', 'warning');
            this.showPage('auth');
            return;
        }

        const products = {
            1: { name: "Кофеварка автоматическая", price: "2500 бонусов", numericPrice: 2500, category: "Бытовая техника" },
            2: { name: "Набор кухонных ножей", price: "1800 бонусов", numericPrice: 1800, category: "Кухонные принадлежности" },
            3: { name: "Bluetooth колонка", price: "3200 бонусов", numericPrice: 3200, category: "Электроника" },
            4: { name: "Подарочная карта в магазин", price: "1000 бонусов", numericPrice: 1000, category: "Подарочные карты" }
        };

        const product = products[productId];
        if (!product) return;

        this.cart.push({
            id: Date.now(),
            productId: productId,
            name: product.name,
            price: product.price,
            numericPrice: product.numericPrice,
            category: product.category
        });

        this.showNotification('Добавлено в корзину', `${product.name} добавлен в корзину`, 'success');
    }

    loadCart() {
        const container = document.getElementById('page-catalog');
        if (!container) return;

        if (this.cart.length === 0) {
            container.innerHTML = '<div class="loading">Корзина пуста</div>';
            return;
        }

        const total = this.cart.reduce((sum, item) => sum + item.numericPrice, 0);

        container.innerHTML = `
            ${this.cart.map(item => `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <h3>${item.name}</h3>
                        <div class="cart-item-price">${item.price}</div>
                    </div>
                    <button onclick="app.removeFromCart(${item.id})" class="delete-btn">
                        Удалить
                    </button>
                </div>
            `).join('')}
            <div class="cart-total">
                <h3>Общая сумма: ${total} бонусов</h3>
                <button onclick="app.checkout()" class="checkout-btn">
                    Оформить заказ
                </button>
            </div>
        `;
    }

    removeFromCart(itemId) {
        this.cart = this.cart.filter(item => item.id !== itemId);
        this.loadCart();
    }

    checkout() {
        if (this.cart.length === 0) {
            this.showNotification('Ошибка', 'Корзина пуста', 'error');
            return;
        }
        this.showNotification('Успех', 'Заказ оформлен!', 'success');
        this.cart = [];
        this.loadCart();
    }

    loadProfile() {
        const container = document.getElementById('page-cart');
        if (!container) return;

        container.innerHTML = `
            <div class="profile-info">
                <h3>${this.userData.firstName}</h3>
                <p><strong>Телефон:</strong> ${this.userPhone}</p>
                <p><strong>Бонусы:</strong> 5000</p>
            </div>
        `;
    }
}

// Создаем глобальный экземпляр приложения
const app = new LoyaltyProApp();

document.addEventListener('DOMContentLoaded', () => {
    console.log('Loyalty Pro App запущен!');
});