const tg = window.Telegram.WebApp;

class LoyaltyProApp {
    constructor() {
        this.currentPage = 'home';
        this.cart = [];
        this.userData = null;
        this.userPhone = null;
        this.isTelegram = !!tg.initData;
        this.isAuthenticated = false;
        this.init();
    }

    init() {
        console.log('=== Loyalty Pro App Инициализация ===');
        
        if (this.isTelegram) {
            tg.expand();
            tg.enableClosingConfirmation();
            console.log('Telegram Web App:', tg.initDataUnsafe);
            
            // Автоматически получаем данные пользователя из Telegram
            this.loadTelegramUserData();
        } else {
            console.log('Запуск в браузере');
        }

        // Проверяем сохраненные данные
        this.loadSavedData();

        // Показываем соответствующий интерфейс
        if (this.isAuthenticated) {
            this.showMainApp();
        } else {
            this.showAuthPage();
        }
    }

    loadTelegramUserData() {
        const user = tg.initDataUnsafe?.user;
        if (user) {
            this.userData = {
                firstName: user.first_name || 'Пользователь',
                lastName: user.last_name || '',
                username: user.username ? `@${user.username}` : 'Не указан',
                id: user.id
            };
            
            // Если в Telegram есть номер - используем его
            if (user.phone_number) {
                this.userPhone = user.phone_number;
                this.isAuthenticated = true;
                localStorage.setItem('userPhone', this.userPhone);
                console.log('Номер из Telegram:', this.userPhone);
            }
            
            console.log('Данные пользователя:', this.userData);
        }
    }

    loadSavedData() {
        const savedPhone = localStorage.getItem('userPhone');
        if (savedPhone) {
            this.userPhone = savedPhone;
            this.isAuthenticated = true;
            console.log('Загружен сохраненный номер:', this.userPhone);
        }
    }

    showAuthPage() {
        console.log('Показываем страницу авторизации');
        
        // Скрываем все страницы кроме auth
        document.querySelectorAll('.page').forEach(page => {
            if (page.id === 'page-auth') {
                page.classList.add('active');
            } else {
                page.classList.remove('active');
            }
        });
        
        // Скрываем навигацию
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) bottomNav.style.display = 'none';
        
        // Создаем контент страницы авторизации
        this.createAuthPageContent();
    }

    createAuthPageContent() {
        const authPage = document.getElementById('page-auth');
        if (!authPage) return;

        authPage.innerHTML = `
            <div class="auth-container">
                <div class="auth-header">
                    <h1>Loyalty Pro</h1>
                    <p>Программа лояльности</p>
                </div>
                
                <div class="auth-content">
                    <div class="auth-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="#3F75FB">
                            <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57-.35-.11-.74-.03-1.02.24l-2.2 2.2c-2.83-1.44-5.15-3.75-6.59-6.59l2.2-2.21c.28-.26.36-.65.25-1C8.7 6.45 8.5 5.25 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1zM12 3v10l3-3h6V3h-9z"/>
                        </svg>
                    </div>
                    
                    <div class="auth-info">
                        <h2>Добро пожаловать! 👋</h2>
                        <p>Для доступа к программе лояльности необходимо предоставить номер телефона</p>
                    </div>
                    
                    <button id="auth-button" class="auth-button">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                        </svg>
                        Предоставить номер телефона
                    </button>
                    
                    <div class="auth-note">
                        <p>Мы запросим только номер телефона для идентификации в программе лояльности</p>
                    </div>
                </div>
            </div>
        `;

        // Назначаем обработчик кнопки
        document.getElementById('auth-button').addEventListener('click', () => {
            this.requestPhoneNumber();
        });
    }

    requestPhoneNumber() {
        if (this.isTelegram) {
            this.requestPhoneInTelegram();
        } else {
            this.requestPhoneInBrowser();
        }
    }

    requestPhoneInTelegram() {
    console.log('Запрос номера в Telegram...');
        
        miniApp.requestPhoneAccess()
        .then(() => miniApp.requestContact())
        .then(contactData => {
            const phoneNumber = contactData.contact.phoneNumber;
            console.log('Номер телефона пользователя:', phoneNumber);
        })
    .catch((error) => {
    console.error('Ошибка при получении номера телефона:', error);
    });
    }

 
    requestPhoneAccess() {
        console.log('Запрашиваем доступ к номеру...');
        
        // ПРАВИЛЬНЫЙ способ запроса номера в Telegram Mini Apps
        tg.requestPhoneAccess()
          .then(() => tg.requestContact())
          .then(contactData => {
              const phoneNumber = contactData.contact.phoneNumber;
              console.log('Номер телефона пользователя:', phoneNumber);
              
              // Обрабатываем успешное получение номера
              this.handleAuthSuccess(phoneNumber, contactData.contact);
          })
          .catch((error) => {
              console.error('Ошибка при получении номера телефона:', error);
              this.handleAuthError('Не удалось получить номер телефона');
          });
    }

    requestContact() {
        console.log('Вызываем requestContact...');
        
        // Проверяем доступен ли метод requestContact
        if (typeof tg.requestContact === 'function') {
            tg.requestContact()
                .then(contactData => {
                    console.log('Контакт получен:', contactData);
                    
                    if (contactData && contactData.contact && contactData.contact.phoneNumber) {
                        const phoneNumber = contactData.contact.phoneNumber;
                        console.log('Номер телефона:', phoneNumber);
                        
                        // Обрабатываем успешное получение номера
                        this.handleAuthSuccess(phoneNumber, contactData.contact);
                    } else {
                        this.handleAuthError('Номер телефона не найден в данных контакта');
                    }
                })
                .catch(error => {
                    console.error('Ошибка requestContact:', error);
                    this.handleAuthError('Не удалось получить контакт: ' + error.message);
                });
        } else {
            console.error('Метод requestContact не доступен в Telegram Web App');
            this.handleAuthError('Функция запроса контакта не доступна');
        }
    }

    requestPhoneInBrowser() {
        console.log('Запрос номера в браузере...');
        
        const phone = prompt('Введите номер телефона для тестирования (формат: +79991234567):', '+79991234567');
        if (phone && this.validatePhone(phone)) {
            this.handleAuthSuccess(phone, {
                first_name: 'Тестовый',
                last_name: 'Пользователь'
            });
        } else if (phone) {
            this.handleAuthError('Неверный формат номера');
        } else {
            this.handleAuthError('Номер не введен');
        }
    }

    validatePhone(phone) {
        return /^\+7\d{10}$/.test(phone);
    }

    handleAuthSuccess(phone, contact) {
        console.log('✅ Успешная авторизация:', phone);
        
        this.userPhone = phone;
        this.isAuthenticated = true;
        
        // Сохраняем номер
        localStorage.setItem('userPhone', phone);
        
        // Обновляем данные пользователя
        if (contact && (contact.firstName || contact.lastName || contact.first_name || contact.last_name)) {
            this.userData = {
                firstName: contact.firstName || contact.first_name || 'Пользователь',
                lastName: contact.lastName || contact.last_name || '',
                username: 'Не указан',
                id: 'from_contact'
            };
        }
        
        // Скрываем MainButton если он был показан
        if (this.isTelegram && tg.MainButton) {
            tg.MainButton.hide();
        }
        
        // Показываем уведомление об успехе
        this.showSimpleNotification('Успех!', `Номер ${phone} подтвержден`);
        
        // Переходим в приложение
        setTimeout(() => {
            this.showMainApp();
        }, 1000);
    }

    handleAuthError(message) {
        console.log('❌ Ошибка авторизации:', message);
        this.showSimpleNotification('Ошибка', message);
    }

    showMainApp() {
        console.log('Показываем основное приложение');
        
        // Скрываем страницу авторизации
        document.getElementById('page-auth').classList.remove('active');
        
        // Показываем навигацию
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) bottomNav.style.display = 'flex';
        
        // Инициализируем навигацию
        this.initNavigation();
        
        // Загружаем данные
        this.loadUserData();
        this.loadPrivileges();
        
        // Показываем домашнюю страницу
        this.showPage('home');
    }

    initNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const targetPage = e.currentTarget.dataset.page;
                this.navigateTo(targetPage);
            });
        });
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
        
        // Снимаем активность с кнопок навигации
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        
        // Показываем выбранную страницу
        const pageElement = document.getElementById(`page-${page}`);
        if (pageElement) {
            pageElement.classList.add('active');
        }
        
        // Активируем кнопку навигации
        const navItem = document.querySelector(`[data-page="${page}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }

        this.currentPage = page;
        this.onPageChange(page);
    }

    onPageChange(page) {
        console.log(`Переход на страницу: ${page}`);
        
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
        // Если данных еще нет, создаем базовые
        if (!this.userData) {
            this.userData = {
                firstName: 'Пользователь',
                lastName: '',
                username: 'Не указан',
                id: 'unknown'
            };
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
            {
                id: 1, name: "Кофеварка автоматическая", description: "Приготовление кофе с таймером",
                price: "2500 бонусов", numericPrice: 2500, category: "home"
            },
            {
                id: 2, name: "Набор кухонных ножей", description: "6 предметов, керамическое покрытие",
                price: "1800 бонусов", numericPrice: 1800, category: "home"
            },
            {
                id: 3, name: "Bluetooth колонка", description: "Водонепроницаемая, 10W",
                price: "3200 бонусов", numericPrice: 3200, category: "electronics"
            },
            {
                id: 4, name: "Подарочная карта в магазин", description: "Номинал 1000 рублей",
                price: "1000 бонусов", numericPrice: 1000, category: "lifestyle"
            },
            {
                id: 5, name: "Чемодан на колесах", description: "55л, 4 колеса, черный",
                price: "4500 бонусов", numericPrice: 4500, category: "lifestyle"
            },
            {
                id: 6, name: "Фитнес-браслет", description: "Мониторинг сна и активности",
                price: "2800 бонусов", numericPrice: 2800, category: "electronics"
            }
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
            <div class="products-grid" id="products-grid">
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

        // Обработчики категорий
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category;
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.filterProducts(category, products, categoryNames);
            });
        });
    }

    filterProducts(category, products, categoryNames) {
        const grid = document.getElementById('products-grid');
        const filteredProducts = category === 'all' ? products : products.filter(p => p.category === category);
        
        grid.innerHTML = filteredProducts.map(product => `
            <div class="product-card" onclick="app.addToCart(${product.id})">
                <span class="product-category">${categoryNames[product.category]}</span>
                <h3>${product.name}</h3>
                <p>${product.description}</p>
                <div class="product-price">${product.price}</div>
            </div>
        `).join('');
    }

    addToCart(productId) {
        if (!this.isAuthenticated) {
            this.showAuthRequired('добавления товара в корзину');
            return;
        }

        const products = {
            1: { name: "Кофеварка автоматическая", price: "2500 бонусов", numericPrice: 2500, category: "Бытовая техника" },
            2: { name: "Набор кухонных ножей", price: "1800 бонусов", numericPrice: 1800, category: "Кухонные принадлежности" },
            3: { name: "Bluetooth колонка", price: "3200 бонусов", numericPrice: 3200, category: "Электроника" },
            4: { name: "Подарочная карта в магазин", price: "1000 бонусов", numericPrice: 1000, category: "Подарочные карты" },
            5: { name: "Чемодан на колесах", price: "4500 бонусов", numericPrice: 4500, category: "Путешествия" },
            6: { name: "Фитнес-браслет", price: "2800 бонусов", numericPrice: 2800, category: "Здоровье" }
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

        this.showSimpleNotification('Добавлено в корзину', `${product.name} добавлен в корзину`);
        console.log('Корзина:', this.cart);
    }

    loadCart() {
        const container = document.getElementById('page-catalog');
        if (!container) return;

        if (this.cart.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #999;">
                    <h3>Корзина пуста</h3>
                    <p>Добавьте товары из каталога</p>
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
                        <div class="cart-item-price">${item.price}</div>
                    </div>
                    <button onclick="app.removeFromCart(${item.id})" class="delete-btn">
                        Удалить
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
        this.showSimpleNotification('Удалено', 'Товар удален из корзины');
    }

    async checkout() {
        if (!this.isAuthenticated) {
            this.showAuthRequired('оформления заказа');
            return;
        }

        if (this.cart.length === 0) {
            this.showSimpleNotification('Ошибка', 'Корзина пуста');
            return;
        }

        const total = this.cart.reduce((sum, item) => sum + item.numericPrice, 0);
        const confirmed = await this.showConfirm('Подтверждение заказа', `Оформить заказ на ${total} бонусов?`);

        if (confirmed) {
            this.showSimpleNotification('Успех', 'Заказ успешно оформлен!');
            this.cart = [];
            this.loadCart();
        }
    }

    loadProfile() {
        const container = document.getElementById('page-cart');
        if (!container) return;

        const stats = {
            availableBonuses: 5000,
            totalOrders: this.cart.length,
            totalSpent: this.cart.reduce((sum, item) => sum + item.numericPrice, 0),
            rate: "Premium"
        };

        container.innerHTML = `
            <div class="profile-info">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="#3F75FB">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                    </svg>
                    <div>
                        <h3 style="margin: 0; font-size: 18px;">${this.userData.firstName}</h3>
                        <p style="margin: 0; color: #999; font-size: 14px;">Тариф: ${stats.rate}</p>
                    </div>
                </div>
                <p><strong>Username:</strong> ${this.userData.username}</p>
                <p><strong>ID:</strong> ${this.userData.id}</p>
                <p><strong>Телефон:</strong> ${this.userPhone}</p>
                
                <button onclick="app.logout()" class="logout-btn">
                    Выйти из аккаунта
                </button>
            </div>
            
            <div class="profile-stats">
                <div class="stat-card">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#3F75FB">
                        <path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                    </svg>
                    <span class="stat-value">${stats.availableBonuses}</span>
                    <span class="stat-label">Доступно бонусов</span>
                </div>
                <div class="stat-card">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#3F75FB">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                    </svg>
                    <span class="stat-value">${stats.totalOrders}</span>
                    <span class="stat-label">Заказов</span>
                </div>
            </div>
            
            <button onclick="app.showSupport()" class="support-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                </svg>
                Связаться с поддержкой
            </button>
        `;
    }

    logout() {
        this.userPhone = null;
        this.isAuthenticated = false;
        localStorage.removeItem('userPhone');
        this.cart = [];
        
        this.showSimpleNotification('Выход', 'Вы вышли из системы');
        this.showAuthPage();
    }

    showAuthRequired(action) {
        this.showSimpleNotification('Требуется авторизация', `Для ${action} необходимо предоставить номер телефона`);
        setTimeout(() => {
            this.showAuthPage();
        }, 1500);
    }

    showSimpleNotification(title, message) {
        if (this.isTelegram && tg.showPopup) {
            tg.showPopup({
                title: title,
                message: message,
                buttons: [{ type: 'ok' }]
            });
        } else {
            alert(`${title}\n${message}`);
        }
    }

    showConfirm(title, message) {
        return new Promise((resolve) => {
            if (this.isTelegram && tg.showPopup) {
                tg.showPopup({
                    title: title,
                    message: message,
                    buttons: [
                        { type: 'ok', text: 'Да' },
                        { type: 'cancel', text: 'Нет' }
                    ]
                }, (buttonId) => {
                    resolve(buttonId === 'ok');
                });
            } else {
                resolve(confirm(`${title}\n${message}`));
            }
        });
    }

    showSupport() {
        this.showSimpleNotification('Поддержка', 'По всем вопросам обращайтесь к администратору программы лояльности');
    }
}

// Инициализация приложения
const app = new LoyaltyProApp();

// Глобальный доступ
window.app = app;