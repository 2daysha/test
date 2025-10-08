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
            
            // Инициализируем кнопку поделиться контактом
            this.initShareContactButton();
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

    // Используем Main Button вместо обычной кнопки
    this.initMainButton();
}

initMainButton() {
    const tg = window.Telegram.WebApp;
    
    if (!this.isTelegram) {
        // Для ПК версии создаем обычную кнопку
        this.createFallbackButton();
        return;
    }

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
    const tg = window.Telegram.WebApp;
    
    tg.requestContact((contact) => {
        if (contact && contact.phone_number) {
            this.userPhone = contact.phone_number;
            console.log('✅ Номер получен через MainButton:', this.userPhone);
            
            // Скрываем кнопку после успеха
            tg.MainButton.hide();
            
            this.processUserAuthentication(this.userPhone, contact);
        } else {
            this.showNotification('Отменено', 'Номер не предоставлен', 'warning');
        }
    });
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

            // Отправляем данные в бота
            tg.sendData(JSON.stringify(userData));
            console.log('Данные отправлены в бота:', userData);
        } catch (error) {
            console.error('Ошибка отправки данных в бота:', error);
        }
    }

    // Загрузка данных пользователей из users.json
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

    // Поиск пользователя по номеру телефона
    findUserByPhone(phone) {
        return this.users.find(user => user.phone === phone);
    }

    // Создание нового пользователя
    createUser(userData) {
        const newUser = {
            id: Date.now().toString(),
            phone: userData.phone,
            firstName: userData.firstName || 'Пользователь',
            lastName: userData.lastName || '',
            username: userData.username || '',
            telegramId: userData.telegramId || null,
            registrationDate: new Date().toISOString(),
            bonuses: 5000, // Начальный бонусный баланс
            orders: [],
            level: 'Premium'
        };
        
        this.users.push(newUser);
        this.saveUsersData();
        return newUser;
    }

    // Обновление данных пользователя
    updateUser(phone, updates) {
        const userIndex = this.users.findIndex(user => user.phone === phone);
        if (userIndex !== -1) {
            this.users[userIndex] = { ...this.users[userIndex], ...updates };
            this.saveUsersData();
            return this.users[userIndex];
        }
        return null;
    }

    // Добавление заказа пользователю
    addUserOrder(phone, order) {
        const user = this.findUserByPhone(phone);
        if (user) {
            if (!user.orders) user.orders = [];
            user.orders.push({
                id: Date.now().toString(),
                date: new Date().toISOString(),
                items: order.items,
                total: order.total,
                status: 'completed'
            });
            
            // Вычитаем бонусы
            user.bonuses -= order.total;
            
            this.saveUsersData();
            return true;
        }
        return false;
    }


    // Обработка аутентификации пользователя
    processUserAuthentication(phone, contactData = null) {
        this.userPhone = phone;
        
        // Ищем пользователя в базе
        let user = this.findUserByPhone(phone);
        
        if (!user) {
            // Создаем нового пользователя
            user = this.createUser({
                phone: phone,
                firstName: contactData?.first_name || 'Пользователь',
                lastName: contactData?.last_name || '',
                telegramId: contactData?.user_id || null
            });
            console.log('Новый пользователь создан:', user);
        } else {
            console.log('Пользователь найден:', user);
        }

        // Обновляем данные приложения
        this.userData = {
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username ? `@${user.username}` : 'Не указан',
            id: user.telegramId || user.id,
            bonuses: user.bonuses,
            level: user.level
        };

        this.saveUserData();
        this.isAuthenticated = true;
        
        this.showNotification('Успех', 'Авторизация прошла успешно!', 'success');
        
        setTimeout(() => {
            this.showPage('home');
            this.loadPrivileges();
        }, 1000);
    }

    // Проверка телефона перед действием
    checkPhoneBeforeAction(actionName, callback) {
        if (!this.userPhone) {
            this.showNotification(
                'Требуется авторизация', 
                `Для ${actionName} необходимо предоставить номер телефона`, 
                'warning'
            );
            this.showPage('auth');
            return;
        }
        callback();
    }

    async processCheckout() {
        if (this.cart.length === 0) {
            this.showNotification('Ошибка', 'Корзина пуста', 'error');
            return;
        }

        const total = this.cart.reduce((sum, item) => sum + item.numericPrice, 0);
        
        // Проверяем достаточно ли бонусов
        const user = this.findUserByPhone(this.userPhone);
        if (user && user.bonuses < total) {
            this.showNotification(
                'Недостаточно бонусов', 
                `У вас ${user.bonuses} бонусов, требуется ${total}`, 
                'error'
            );
            return;
        }

        const confirmed = await this.showConfirm(
            'Подтверждение заказа',
            `Вы уверены, что хотите оформить заказ на сумму ${total} бонусов?`
        );

        if (confirmed) {
            // Добавляем заказ пользователю
            const orderSuccess = this.addUserOrder(this.userPhone, {
                items: this.cart,
                total: total
            });

            if (orderSuccess) {
                this.showNotification('Успех', 'Заказ успешно оформлен!', 'success');
                this.cart = [];
                this.loadCart();
                
                // Обновляем данные пользователя
                const updatedUser = this.findUserByPhone(this.userPhone);
                if (updatedUser) {
                    this.userData.bonuses = updatedUser.bonuses;
                    this.saveUserData();
                }
            } else {
                this.showNotification('Ошибка', 'Не удалось оформить заказ', 'error');
            }
        } else {
            this.showNotification('Отменено', 'Заказ отменен', 'warning');
        }
    }

    loadProfile() {
        const container = document.getElementById('page-cart');
        if (!container) return;

        const user = this.findUserByPhone(this.userPhone);
        const stats = {
            totalOrders: user?.orders?.length || 0,
            totalSpent: user?.orders?.reduce((sum, order) => sum + order.total, 0) || 0,
            availableBonuses: user?.bonuses || 0,
            rate: user?.level || 'Standard'
        };

        container.innerHTML = `
            <div class="profile-info">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="#3F75FB">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                    </svg>
                    <div>
                        <h3 style="margin: 0; font-size: 18px;">${this.userData.firstName}</h3>
                        <p style="margin: 0; color: var(--tg-theme-hint-color, #999999); font-size: 14px;">Тариф: ${stats.rate}</p>
                    </div>
                </div>
                <p><strong>Username:</strong> ${this.userData.username}</p>
                <p><strong>ID:</strong> ${this.userData.id}</p>
                <p><strong>Телефон:</strong> ${this.userPhone}</p>
                <p><strong>Бонусы:</strong> ${stats.availableBonuses}</p>
                <p><strong>Всего заказов:</strong> ${stats.totalOrders}</p>
                <p><strong>Потрачено бонусов:</strong> ${stats.totalSpent}</p>
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
                    <span class="stat-label">Заказов</span>
                </div>
            </div>
            
            <button class="tariff-btn" onclick="app.selectTariff()" style="width: 100%; padding: 12px 16px; background: #4CAF50; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; margin-bottom: 12px; display: flex; align-items: center; justify-content: center;">
                Выбрать тариф
            </button>
            
            <button class="support-btn" onclick="app.showSupport()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                </svg>
                Связаться с поддержкой
            </button>

            ${user?.orders?.length > 0 ? `
                <div class="orders-history" style="margin-top: 20px;">
                    <h3>История заказов</h3>
                    ${user.orders.map(order => `
                        <div class="order-item" style="border: 1px solid #ddd; padding: 10px; margin: 10px 0; border-radius: 8px;">
                            <p><strong>Заказ #${order.id.slice(-6)}</strong></p>
                            <p>Дата: ${new Date(order.date).toLocaleDateString()}</p>
                            <p>Сумма: ${order.total} бонусов</p>
                            <p>Статус: ${order.status}</p>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;
    }

    showPage(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        
        const pageElement = document.getElementById(`page-${page}`);
        if (pageElement) {
            pageElement.classList.add('active');
        }
        
        // Для навигационных кнопок (кроме auth)
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

    loadPrivileges() {
    const container = document.getElementById('page-home');
    if (!container) return;

    // Категории товаров без иконок
    const categories = [
        { 
            id: 'all', 
            name: 'Все'
        },
        { 
            id: 'electronics', 
            name: 'Электроника'
        },
        { 
            id: 'home', 
            name: 'Для дома'
        },
        { 
            id: 'lifestyle', 
            name: 'Образ жизни'
        }
    ];

    // Товары с категориями
    const products = [
        {
            id: 1,
            name: "Кофеварка автоматическая",
            description: "Приготовление кофе с таймером",
            price: "2500 бонусов",
            numericPrice: 2500,
            category: "home"
        },
        {
            id: 2,
            name: "Набор кухонных ножей",
            description: "6 предметов, керамическое покрытие",
            price: "1800 бонусов",
            numericPrice: 1800,
            category: "home"
        },
        {
            id: 3,
            name: "Bluetooth колонка",
            description: "Водонепроницаемая, 10W",
            price: "3200 бонусов",
            numericPrice: 3200,
            category: "electronics"
        },
        {
            id: 4,
            name: "Подарочная карта в магазин",
            description: "Номинал 1000 рублей",
            price: "1000 бонусов",
            numericPrice: 1000,
            category: "lifestyle"
        },
        {
            id: 5,
            name: "Чемодан на колесах",
            description: "55л, 4 колеса, черный",
            price: "4500 бонусов",
            numericPrice: 4500,
            category: "lifestyle"
        },
        {
            id: 6,
            name: "Фитнес-браслет",
            description: "Мониторинг сна и активности",
            price: "2800 бонусов",
            numericPrice: 2800,
            category: "electronics"
        },
        {
            id: 7,
            name: "Беспроводные наушники",
            description: "Зарядка от case, 20ч работы",
            price: "3500 бонусов",
            numericPrice: 3500,
            category: "electronics"
        },
        {
            id: 8,
            name: "Сертификат на ужин",
            description: "Ресторан на 2 персоны",
            price: "2000 бонусов",
            numericPrice: 2000,
            category: "lifestyle"
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
                <button class="category-btn ${cat.id === 'all' ? 'active' : ''}" 
                        data-category="${cat.id}">
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

    // Добавляем обработчики для категорий
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const category = e.currentTarget.dataset.category;
            
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            this.filterProducts(category, products, categoryNames);
        });
    });
}

addToCart(productId) {
    this.checkPhoneBeforeAction('добавления товара в корзину', () => {
        // Различные товары и услуги которые можно приобрести за бонусы
        const products = {
            1: { 
                name: "Кофеварка автоматическая", 
                description: "Приготовление кофе с таймером",
                price: "2500 бонусов", 
                numericPrice: 2500,
                category: "Бытовая техника"
            },
            2: { 
                name: "Набор кухонных ножей", 
                description: "6 предметов, керамическое покрытие",
                price: "1800 бонусов", 
                numericPrice: 1800,
                category: "Кухонные принадлежности"
            },
            3: { 
                name: "Bluetooth колонка", 
                description: "Водонепроницаемая, 10W",
                price: "3200 бонусов", 
                numericPrice: 3200,
                category: "Электроника"
            },
            4: { 
                name: "Подарочная карта в магазин", 
                description: "Номинал 1000 рублей",
                price: "1000 бонусов", 
                numericPrice: 1000,
                category: "Подарочные карты"
            },
            5: { 
                name: "Чемодан на колесах", 
                description: "55л, 4 колеса, черный",
                price: "4500 бонусов", 
                numericPrice: 4500,
                category: "Путешествия"
            },
            6: { 
                name: "Фитнес-браслет", 
                description: "Мониторинг сна и активности",
                price: "2800 бонусов", 
                numericPrice: 2800,
                category: "Здоровье"
            },
            7: { 
                name: "Беспроводные наушники", 
                description: "Зарядка от case, 20ч работы",
                price: "3500 бонусов", 
                numericPrice: 3500,
                category: "Аксессуары"
            },
            8: { 
                name: "Сертификат на ужин", 
                description: "Ресторан на 2 персоны",
                price: "2000 бонусов", 
                numericPrice: 2000,
                category: "Рестораны"
            }
        };

        const product = products[productId];
        if (!product) return;

        // Добавляем в корзину
        this.cart.push({
            id: Date.now(),
            productId: productId,
            name: product.name,
            description: product.description,
            price: product.price,
            numericPrice: product.numericPrice,
            category: product.category
        });

        // Показываем уведомление
        this.showNotification(
            'Добавлено в корзину', 
            `${product.name} добавлен в корзину`,
            'success'
        );

        console.log('Товар добавлен в корзину:', product);
        console.log('Корзина:', this.cart);
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
                        <div class="cart-item-price">${item.price}</div>
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
        this.loadCart(); // Перезагружаем вид корзины
        this.showNotification('Удалено', 'Товар удален из корзины', 'info');
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

    showConfirm(title, message) {
        return new Promise((resolve) => {
            if (this.isTelegram) {
                // Используем нативный confirm Telegram
                tg.showPopup({
                    title: title,
                    message: message,
                    buttons: [
                        { type: 'ok', text: 'Оформить' },
                        { type: 'cancel', text: 'Отмена' }
                    ]
                });
                // В Telegram нам нужно слушать события, но для простоты вернем true
                resolve(true);
            } else {
                // Показываем кастомный диалог для ПК
                this.showCustomConfirm(title, message).then(resolve);
            }
        });
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
}

// Создаем глобальный экземпляр приложения
const app = new LoyaltyProApp();

// Инициализация когда DOM загружен
document.addEventListener('DOMContentLoaded', () => {
    console.log('Loyalty Pro App запущен!');
});