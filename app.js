const tg = window.Telegram.WebApp;

class LoyaltyProApp {
    constructor() {
        this.currentPage = 'home';
        this.cart = [];
        this.userData = null;
        this.userPhone = null;
        this.isTelegram = !!tg.initData;
        this.init();
    }

    init() {
        if (this.isTelegram) {
            tg.expand();
            tg.enableClosingConfirmation();
            console.log('Telegram Web App инициализирован:', tg.initDataUnsafe);
        } else {
            console.log('Запуск в браузере');
        }

        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const targetPage = e.currentTarget.dataset.page;
                this.navigateTo(targetPage);
            });
        });

        this.loadSavedUserData();
        this.loadUserData();
        this.loadPrivileges();
        
        this.showPage('home');
        
        this.requestPhoneOnStart();
    }

    async requestPhoneOnStart() {
        setTimeout(async () => {
            if (!this.userPhone) {
                console.log('Номера нет, запрашиваем при старте...');
                const shouldRequest = await this.showConfirm(
                    'Добро пожаловать!',
                    'Для работы с приложением требуется номер телефона. Предоставить его сейчас?'
                );
                
                if (shouldRequest) {
                    await this.requestPhoneNumber();
                } else {
                    this.showNotification('Информация', 'Вы можете предоставить номер позже в профиле', 'info');
                }
            }
        }, 1000);
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
            
            if (user.phone_number) {
                this.userPhone = user.phone_number;
                console.log('Номер телефона из initData:', this.userPhone);
                this.saveUserData();
            }
        } else {
            this.userData = {
                firstName: 'Пользователь',
                lastName: '',
                username: 'Не указан',
                id: 'unknown'
            };
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

    async requestPhoneNumber() {
        return new Promise((resolve) => {
            if (this.isTelegram) {
                tg.requestContact((contact) => {
                    if (contact && contact.phone_number) {
                        this.userPhone = contact.phone_number;
                        console.log('Получен номер телефона:', this.userPhone);
                        this.saveUserData();
                        this.showNotification('Успех', 'Номер телефона получен', 'success');
                        resolve(true);
                    } else {
                        console.log('Пользователь отменил запрос номера');
                        this.showNotification('Отменено', 'Номер телефона не предоставлен', 'warning');
                        resolve(false);
                    }
                });
            } else {
                this.userPhone = 'Нет';
                this.saveUserData();
                this.showNotification('Успех', 'Номер телефона получен (тестовый режим)', 'success');
                resolve(true);
            }
        });
    }


    async checkPhoneBeforeAction(actionName, actionCallback) {
        console.log('Проверка номера перед действием:', actionName, 'Номер:', this.userPhone);
        
        if (!this.userPhone) {
            const wantsToContinue = await this.showConfirm(
                'Требуется номер телефона',
                `Для ${actionName} необходимо предоставить номер телефона. Хотите продолжить?`
            );
            
            if (wantsToContinue) {
                const success = await this.requestPhoneNumber();
                if (success) {
                    actionCallback();
                }
            }
        } else {
            actionCallback();
        }
    }

    navigateTo(page) {
        this.showPage(page);
    }

    showPage(page) {
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
            
            // Пытаемся получить номер телефона из initData
            if (user.phone_number) {
                this.userPhone = user.phone_number;
                console.log('Номер телефона из initData:', this.userPhone);
                this.saveUserData();
            } else {
                console.log('Номер телефона не найден в initData');
            }
        } else {
            this.userData = {
                firstName: 'Пользователь',
                lastName: '',
                username: 'Не указан',
                id: 'unknown'
            };
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

    // Универсальная функция показа уведомлений
    showNotification(title, message, type = 'info') {
        if (this.isTelegram) {
            tg.showPopup({
                title: title,
                message: message,
                buttons: [{ type: 'ok' }]
            });
        } else {
            this.showCustomNotification(title, message, type);
        }
    }

    showConfirm(title, message) {
        return new Promise((resolve) => {
            if (this.isTelegram) {
                tg.showPopup({
                    title: title,
                    message: message,
                    buttons: [
                        { type: 'ok', text: 'Да', id: 'confirm_ok' },
                        { type: 'cancel', text: 'Отмена', id: 'confirm_cancel' }
                    ]
                }, (buttonId) => {
                    resolve(buttonId === 'confirm_ok');
                });
            } else {
                this.showCustomConfirm(title, message).then(resolve);
            }
        });
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
        const filteredProducts = category === 'all' 
            ? products 
            : products.filter(product => product.category === category);
        
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
        this.checkPhoneBeforeAction('добавления товара в корзину', () => {
            const products = {
                1: { name: "Кофеварка автоматическая", description: "Приготовление кофе с таймером", price: "2500 бонусов", numericPrice: 2500, category: "Бытовая техника" },
                2: { name: "Набор кухонных ножей", description: "6 предметов, керамическое покрытие", price: "1800 бонусов", numericPrice: 1800, category: "Кухонные принадлежности" },
                3: { name: "Bluetooth колонка", description: "Водонепроницаемая, 10W", price: "3200 бонусов", numericPrice: 3200, category: "Электроника" },
                4: { name: "Подарочная карта в магазин", description: "Номинал 1000 рублей", price: "1000 бонусов", numericPrice: 1000, category: "Подарочные карты" },
                5: { name: "Чемодан на колесах", description: "55л, 4 колеса, черный", price: "4500 бонусов", numericPrice: 4500, category: "Путешествия" },
                6: { name: "Фитнес-браслет", description: "Мониторинг сна и активности", price: "2800 бонусов", numericPrice: 2800, category: "Здоровье" },
                7: { name: "Беспроводные наушники", description: "Зарядка от case, 20ч работы", price: "3500 бонусов", numericPrice: 3500, category: "Аксессуары" },
                8: { name: "Сертификат на ужин", description: "Ресторан на 2 персоны", price: "2000 бонусов", numericPrice: 2000, category: "Рестораны" }
            };

            const product = products[productId];
            if (!product) return;

            this.cart.push({
                id: Date.now(),
                productId: productId,
                name: product.name,
                description: product.description,
                price: product.price,
                numericPrice: product.numericPrice,
                category: product.category
            });

            this.showNotification('Добавлено в корзину', `${product.name} добавлен в корзину`, 'success');
            console.log('Товар добавлен в корзину:', product);
            console.log('Корзина:', this.cart);
        });
    }

    checkPhoneNumber() {
        const initData = tg.initDataUnsafe;
        if (initData && initData.user && initData.user.phone_number) {
            this.userPhone = initData.user.phone_number;
            console.log('Номер телефона из initData:', this.userPhone);
            this.saveUserData();
        }
    }

    formatPhoneNumber(phone) {
        if (!phone) return 'Не указан';
        
        const cleaned = phone.replace(/\D/g, '');
        
        if (cleaned.length === 11 && (cleaned.startsWith('7') || cleaned.startsWith('8'))) {
            return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9)}`;
        } 
        else if (cleaned.length === 10) {
            return `+7 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 8)}-${cleaned.slice(8)}`;
        }
        else if (cleaned.length === 12 && cleaned.startsWith('7')) {
            return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9)}`;
        }
        
        return phone;
    }

    async requestPhoneNumber() {
        return new Promise((resolve) => {
            if (this.isTelegram) {
                tg.showPopup({
                    title: 'Предоставьте номер телефона',
                    message: 'Для продолжения необходимо предоставить номер телефона',
                    buttons: [
                        { type: 'default', text: 'Предоставить номер', id: 'share_phone' },
                        { type: 'cancel', text: 'Отмена' }
                    ]
                }, (buttonId) => {
                    if (buttonId === 'share_phone') {
                        tg.requestContact((contact) => {
                            if (contact && contact.phone_number) {
                                this.userPhone = contact.phone_number;
                                console.log('Получен номер телефона:', this.userPhone);
                                this.saveUserData();
                                if (this.currentPage === 'cart') {
                                    this.loadProfile();
                                }
                                this.showNotification('Успех', 'Номер телефона получен', 'success');
                                resolve(true);
                            } else {
                                this.showNotification('Отменено', 'Вы не предоставили номер телефона', 'warning');
                                resolve(false);
                            }
                        });
                    } else {
                        this.showNotification('Отменено', 'Вы не предоставили номер телефона', 'warning');
                        resolve(false);
                    }
                });
            } else {
                this.userPhone = 'Нет';
                this.saveUserData();
                if (this.currentPage === 'cart') {
                    this.loadProfile();
                }
                this.showNotification('Успех', 'Номер телефона получен (тестовый режим)', 'success');
                resolve(true);
            }
        });
    }

    async checkPhoneBeforeAction(actionName, actionCallback) {
        console.log('checkPhoneBeforeAction: userPhone =', this.userPhone);
        
        if (!this.userPhone) {
            const wantsToContinue = await this.showConfirm(
                'Требуется номер телефона',
                `Для ${actionName} необходимо предоставить номер телефона. Хотите продолжить?`
            );
            
            if (wantsToContinue) {
                await this.requestPhoneNumber();
                if (this.userPhone) {
                    actionCallback();
                } else {
                    this.showNotification('Отменено', 'Действие отменено - номер телефона не предоставлен', 'warning');
                }
            }
        } else {
            actionCallback();
        }
    }

    async checkout() {
        this.checkPhoneBeforeAction('оформления заказа', () => {
            this.processCheckout();
        });
    }

    async processCheckout() {
        if (this.cart.length === 0) {
            this.showNotification('Ошибка', 'Корзина пуста', 'error');
            return;
        }

        const total = this.cart.reduce((sum, item) => sum + item.numericPrice, 0);
        
        const confirmed = await this.showConfirm(
            'Подтверждение заказа',
            `Вы уверены, что хотите оформить заказ на сумму ${total} бонусов?`
        );

        if (confirmed) {
            this.showNotification('Успех', 'Заказ успешно оформлен!', 'success');
            this.cart = []; 
            this.loadCart(); 
            console.log('Заказ оформлен');
        } else {
            this.showNotification('Отменено', 'Заказ отменен', 'warning');
        }
    }

    // Кастомное уведомление для ПК
    showCustomNotification(title, message, type = 'info') {
        const notification = document.getElementById('notification');
        const titleEl = document.getElementById('notification-title');
        const messageEl = document.getElementById('notification-message');
        const icon = notification.querySelector('.notification-icon');

        titleEl.textContent = title;
        messageEl.textContent = message;

        notification.className = `notification notification-${type}`;
        
        switch(type) {
            case 'success':
                icon.innerHTML = '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>';
                break;
            case 'error':
                icon.innerHTML = '<path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>';
                break;
            case 'warning':
                icon.innerHTML = '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>';
                break;
            default:
                icon.innerHTML = '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>';
        }

        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    showCustomConfirm(title, message) {
        return new Promise((resolve) => {
            const dialog = document.getElementById('confirm-dialog');
            const titleEl = document.getElementById('confirm-title');
            const messageEl = document.getElementById('confirm-message');
            const okBtn = document.getElementById('confirm-ok');
            const cancelBtn = document.getElementById('confirm-cancel');

            titleEl.textContent = title;
            messageEl.textContent = message;

            dialog.classList.add('show');

            const handleOk = () => {
                cleanup();
                resolve(true);
            };

            const handleCancel = () => {
                cleanup();
                resolve(false);
            };

            const cleanup = () => {
                dialog.classList.remove('show');
                okBtn.removeEventListener('click', handleOk);
                cancelBtn.removeEventListener('click', handleCancel);
            };

            okBtn.addEventListener('click', handleOk);
            cancelBtn.addEventListener('click', handleCancel);
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
        this.loadCart();
        this.showNotification('Удалено', 'Товар удален из корзины', 'info');
    }

    loadProfile() {
        const container = document.getElementById('page-cart');
        if (!container) return;

        const stats = {
            totalOrders: this.cart.length,
            totalSpent: this.cart.reduce((sum, item) => sum + item.numericPrice, 0),
            availableBonuses: 5000,
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
                        <p style="margin: 0; color: var(--tg-theme-hint-color, #999999); font-size: 14px;">Тариф: ${stats.rate}</p>
                    </div>
                </div>
                <p><strong>Username:</strong> ${this.userData.username}</p>
                <p><strong>ID:</strong> ${this.userData.id}</p>
                <p><strong>Телефон:</strong> ${this.userPhone ? this.formatPhoneNumber(this.userPhone) : 
                    '<button onclick="app.requestPhoneNumber()" style="background: #3F75FB; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">Получить номер</button>'}</p>
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
                    <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 3.5C14.8 3.4 14.6 3.4 14.4 3.5L8.4 7L3 4V9C3 9.6 3.4 10 4 10H9V20C9 20.6 9.4 21 10 21H14C14.6 21 15 20.6 15 20V10H20C20.6 10 21 9.6 21 9Z"/>
                </svg>
                Выбрать тариф
            </button>
            
            <button class="support-btn" onclick="app.showSupport()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                </svg>
                Связаться с поддержкой
            </button>
        `;
    }

    selectTariff() {
        this.showNotification('Выбор тарифа', 'Функция выбора тарифа в разработке', 'info');
    }

    showSupport() {
        this.showNotification('Поддержка', 'Связь с поддержкой в разработке', 'info');
    }
}

const app = new LoyaltyProApp();

document.addEventListener('DOMContentLoaded', () => {
    console.log('Loyalty Pro App запущен!');
});