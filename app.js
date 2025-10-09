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

        // Инициализируем навигацию
        this.initNavigation();
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
        
        // Назначаем обработчик кнопки авторизации
        const authButton = document.getElementById('auth-button');
        if (authButton) {
            authButton.addEventListener('click', () => {
                this.requestPhoneInTelegram();
            });
        }
    }

    requestPhoneInTelegram() {
        console.log('Запрос номера в Telegram...');
        
        // Используем новый SDK для запроса контакта
        if (window.telegramSDK && window.telegramSDK.requestContact) {
            this.requestContactWithSDK();
        } else {
            // Резервный метод через старый API
            this.requestContactLegacy();
        }
    }

    async requestContactWithSDK() {
        try {
            if (window.telegramSDK.requestContact.isAvailable()) {
                const result = await window.telegramSDK.requestContact();
                const phoneNumber = result.contact.phoneNumber;
                console.log('Номер телефона пользователя:', phoneNumber);
                this.handleAuthSuccess(phoneNumber, result.contact);
            } else {
                this.handleAuthError('Функция запроса контакта недоступна');
            }
        } catch (error) {
            console.error('Ошибка при получении номера телефона:', error);
            this.handleAuthError('Не удалось получить номер телефона');
        }
    }

    requestContactLegacy() {
        tg.requestContact()
            .then(contactData => {
                const phoneNumber = contactData.contact.phoneNumber;
                console.log('Номер телефона пользователя:', phoneNumber);
                this.handleAuthSuccess(phoneNumber, contactData.contact);
            })
            .catch((error) => {
                console.error('Ошибка при получении номера телефона:', error);
                this.handleAuthError('Не удалось получить номер телефона: ' + error.message);
            });
    }

    handleAuthSuccess(phone, contact) {
        console.log('✅ Успешная авторизация:', phone);
        
        this.userPhone = phone;
        this.isAuthenticated = true;
        
        // Сохраняем номер
        localStorage.setItem('userPhone', phone);
        
        // Обновляем данные пользователя
        if (contact && (contact.firstName || contact.first_name)) {
            this.userData = {
                firstName: contact.firstName || contact.first_name || 'Пользователь',
                lastName: contact.lastName || contact.last_name || '',
                username: 'Не указан',
                id: 'from_contact'
            };
        }
        
        // Показываем уведомление об успехе
        this.showNotification('Успех!', `Номер ${phone} подтвержден`, 'success');
        
        // Переходим в приложение
        setTimeout(() => {
            this.showMainApp();
        }, 1000);
    }

    handleAuthError(message) {
        console.log('❌ Ошибка авторизации:', message);
        this.showNotification('Ошибка', message, 'error');
    }

    showMainApp() {
        console.log('Показываем основное приложение');
        
        // Скрываем страницу авторизации
        document.getElementById('page-auth').classList.remove('active');
        
        // Показываем навигацию
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) bottomNav.style.display = 'flex';
        
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

        const products = [
            {
                id: 1, name: "Кофеварка автоматическая", description: "Приготовление кофе с таймером",
                price: "2500 бонусов", numericPrice: 2500
            },
            {
                id: 2, name: "Набор кухонных ножей", description: "6 предметов, керамическое покрытие",
                price: "1800 бонусов", numericPrice: 1800
            },
            {
                id: 3, name: "Bluetooth колонка", description: "Водонепроницаемая, 10W",
                price: "3200 бонусов", numericPrice: 3200
            },
            {
                id: 4, name: "Подарочная карта в магазин", description: "Номинал 1000 рублей",
                price: "1000 бонусов", numericPrice: 1000
            }
        ];

        container.innerHTML = `
            <div class="products-grid">
                ${products.map(product => `
                    <div class="product-card" onclick="app.addToCart(${product.id})">
                        <h3>${product.name}</h3>
                        <p>${product.description}</p>
                        <div class="product-price">${product.price}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    addToCart(productId) {
        if (!this.isAuthenticated) {
            this.showAuthRequired('добавления товара в корзину');
            return;
        }

        const products = {
            1: { name: "Кофеварка автоматическая", price: "2500 бонусов", numericPrice: 2500 },
            2: { name: "Набор кухонных ножей", price: "1800 бонусов", numericPrice: 1800 },
            3: { name: "Bluetooth колонка", price: "3200 бонусов", numericPrice: 3200 },
            4: { name: "Подарочная карта в магазин", price: "1000 бонусов", numericPrice: 1000 }
        };

        const product = products[productId];
        if (!product) return;

        this.cart.push({
            id: Date.now(),
            productId: productId,
            name: product.name,
            price: product.price,
            numericPrice: product.numericPrice
        });

        this.showNotification('Добавлено в корзину', `${product.name} добавлен в корзину`, 'success');
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
        this.showNotification('Удалено', 'Товар удален из корзины', 'success');
    }

    async checkout() {
        if (!this.isAuthenticated) {
            this.showAuthRequired('оформления заказа');
            return;
        }

        if (this.cart.length === 0) {
            this.showNotification('Ошибка', 'Корзина пуста', 'error');
            return;
        }

        const total = this.cart.reduce((sum, item) => sum + item.numericPrice, 0);
        const confirmed = await this.showConfirm('Подтверждение заказа', `Оформить заказ на ${total} бонусов?`);

        if (confirmed) {
            this.showNotification('Успех', 'Заказ успешно оформлен!', 'success');
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
            totalSpent: this.cart.reduce((sum, item) => sum + item.numericPrice, 0)
        };

        container.innerHTML = `
            <div class="profile-info">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="#3F75FB">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                    </svg>
                    <div>
                        <h3 style="margin: 0; font-size: 18px;">${this.userData.firstName}</h3>
                        <p style="margin: 0; color: #999; font-size: 14px;">Тариф: Premium</p>
                    </div>
                </div>
                <p><strong>Телефон:</strong> ${this.userPhone}</p>
                
                <button onclick="app.logout()" class="logout-btn">
                    Выйти из аккаунта
                </button>
            </div>
            
            <div class="profile-stats">
                <div class="stat-card">
                    <span class="stat-value">${stats.availableBonuses}</span>
                    <span class="stat-label">Доступно бонусов</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">${stats.totalOrders}</span>
                    <span class="stat-label">Заказов</span>
                </div>
            </div>
        `;
    }

    logout() {
        this.userPhone = null;
        this.isAuthenticated = false;
        localStorage.removeItem('userPhone');
        this.cart = [];
        
        this.showNotification('Выход', 'Вы вышли из системы', 'success');
        this.showAuthPage();
    }

    showAuthRequired(action) {
        this.showNotification('Требуется авторизация', `Для ${action} необходимо предоставить номер телефона`, 'error');
        setTimeout(() => {
            this.showAuthPage();
        }, 1500);
    }

    showNotification(title, message, type = 'success') {
        const notification = document.getElementById('notification');
        const notificationTitle = document.getElementById('notification-title');
        const notificationMessage = document.getElementById('notification-message');
        
        if (notification && notificationTitle && notificationMessage) {
            notificationTitle.textContent = title;
            notificationMessage.textContent = message;
            
            // Устанавливаем цвет в зависимости от типа
            if (type === 'error') {
                notification.style.backgroundColor = '#f44336';
            } else if (type === 'warning') {
                notification.style.backgroundColor = '#ff9800';
            } else {
                notification.style.backgroundColor = '#4CAF50';
            }
            
            notification.classList.add('show');
            
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        } else {
            // Fallback для мобильного Telegram
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
    }

    showConfirm(title, message) {
        return new Promise((resolve) => {
            const dialog = document.getElementById('confirm-dialog');
            const dialogTitle = document.getElementById('confirm-title');
            const dialogMessage = document.getElementById('confirm-message');
            const confirmOk = document.getElementById('confirm-ok');
            const confirmCancel = document.getElementById('confirm-cancel');
            
            if (dialog && dialogTitle && dialogMessage && confirmOk && confirmCancel) {
                dialogTitle.textContent = title;
                dialogMessage.textContent = message;
                dialog.classList.add('show');
                
                const cleanup = () => {
                    dialog.classList.remove('show');
                    confirmOk.removeEventListener('click', onOk);
                    confirmCancel.removeEventListener('click', onCancel);
                };
                
                const onOk = () => {
                    cleanup();
                    resolve(true);
                };
                
                const onCancel = () => {
                    cleanup();
                    resolve(false);
                };
                
                confirmOk.addEventListener('click', onOk);
                confirmCancel.addEventListener('click', onCancel);
            } else {
                // Fallback для мобильного Telegram
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
            }
        });
    }
}

// Инициализация приложения
const app = new LoyaltyProApp();

// Глобальный доступ
window.app = app;