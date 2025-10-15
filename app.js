const tg = window.Telegram.WebApp;

class LoyaltyProApp {
    constructor() {
        this.currentPage = 'home';
        this.cart = [];
        this.userData = null;
        this.init();
    }

    init() {
        // Инициализация Telegram Web App
        tg.expand();
        tg.enableClosingConfirmation();
        
        console.log('Telegram Web App инициализирован:', tg.initDataUnsafe);

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

    navigateTo(page) {
        this.showPage(page);
    }

    showPage(page) {
        // Скрываем все страницы
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        
        // Убираем активный класс у всех кнопок навигации
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        
        // Показываем выбранную страницу
        const pageElement = document.getElementById(`page-${page}`);
        if (pageElement) {
            pageElement.classList.add('active');
        }
        
        // Активируем соответствующую кнопку навигации
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
    }

loadPrivileges() {
    const container = document.getElementById('page-home');
    if (!container) return;

    // Категории товаров с иконками
    const categories = [
        { 
            id: 'all', 
            name: 'Все',
            icon: `<svg class="category-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 13h1v7c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-7h1c.55 0 1-.45 1-1s-.45-1-1-1h-1V4c0-1.1-.9-2-2-2H6C4.9 2 4 2.9 4 4v7H3c-.55 0-1 .45-1 1s.45 1 1 1zm6-8h6v5H9V5zm-2 8h2v7H7v-7zm4 0h2v7h-2v-7zm4 0h2v7h-2v-7z"/>
                  </svg>`
        },
        { 
            id: 'electronics', 
            name: 'Электроника',
            icon: `<svg class="category-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 7h2v10H3V7zm4 0h2v10H7V7zm4 0h2v10h-2V7zm4 0h6v10h-6V7z"/>
                  </svg>`
        },
        { 
            id: 'home', 
            name: 'Для дома',
            icon: `<svg class="category-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z"/>
                  </svg>`
        },
        { 
            id: 'lifestyle', 
            name: 'Образ жизни',
            icon: `<svg class="category-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11 24h2v-2h-2v2zm-4 0h2v-2H7v2zm8 0h2v-2h-2v2zm2.71-18.29L12 0h-1v7.59L6.41 3 5 4.41 10.59 10 5 15.59 6.41 17 11 12.41V20h1l5.71-5.71-4.3-4.29 4.3-4.29z"/>
                  </svg>`
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
                    ${cat.icon}
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
        id: Date.now(), // уникальный ID
        productId: productId,
        name: product.name,
        description: product.description,
        price: product.price,
        numericPrice: product.numericPrice,
        category: product.category
    });

    // Показываем уведомление
    tg.showPopup({
        title: 'Добавлено в корзину',
        message: `${product.name} добавлен в корзину`,
        buttons: [{ type: 'ok' }]
    });

    console.log('Товар добавлен в корзину:', product);
    console.log('Корзина:', this.cart);
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
                <button onclick="app.removeFromCart(${item.id})" style="
                    background: var(--tg-theme-destructive-text-color, #ff3b30);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 8px 12px;
                    font-size: 12px;
                    cursor: pointer;
                    margin-top: 8px;
                    width: 100%;
                ">Удалить из корзины</button>
            </div>
        `).join('')}
        <div class="cart-total">
            <h3>Общая сумма</h3>
            <div class="cart-total-price">${total} бонусов</div>
            <button onclick="app.checkout()" style="
                background: var(--tg-theme-button-color, #50a8eb);
                color: var(--tg-theme-button-text-color, #ffffff);
                border: none;
                border-radius: 12px;
                padding: 12px 24px;
                font-size: 16px;
                font-weight: 600;
                margin-top: 16px;
                width: 100%;
                cursor: pointer;
            ">Оформить заказ</button>
        </div>
    `;
    }

    removeFromCart(itemId) {
        this.cart = this.cart.filter(item => item.id !== itemId);
        this.loadCart(); // Перезагружаем вид корзины
    }

    checkout() {
        if (this.cart.length === 0) {
            tg.showPopup({
                title: 'Ошибка',
                message: 'Корзина пуста',
                buttons: [{ type: 'ok' }]
            });
            return;
        }

        const total = this.cart.reduce((sum, item) => sum + item.numericPrice, 0);
        
        tg.showPopup({
            title: 'Подтверждение заказа',
            message: `Вы уверены, что хотите оформить заказ на сумму ${total} ₽?`,
            buttons: [
                { type: 'ok', text: 'Оформить' },
                { type: 'cancel', text: 'Отмена' }
            ]
        });

        // В реальном приложении здесь был бы вызов API для обработки заказа
        console.log('Оформление заказа:', this.cart);
    }

    loadProfile() {
    const container = document.getElementById('page-cart');
    if (!container) return;

    const stats = {
        totalOrders: this.cart.length,
        totalSpent: this.cart.reduce((sum, item) => sum + item.numericPrice, 0),
        availableBonuses: 5000, // Пример доступных бонусов
        level: "Gold" // Пример уровня
    };

    container.innerHTML = `
        <div class="profile-info">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="#3F75FB">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
                <div>
                    <h3 style="margin: 0; font-size: 18px;">${this.userData.firstName}</h3>
                    <p style="margin: 0; color: var(--tg-theme-hint-color, #999999); font-size: 14px;">Уровень: ${stats.level}</p>
                </div>
            </div>
            <p><strong>Username:</strong> ${this.userData.username}</p>
            <p><strong>ID:</strong> ${this.userData.id}</p>
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
        
        <button class="support-btn" onclick="app.showSupport()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
            </svg>
            Связаться с поддержкой
        </button>
    `;
    }

    showSupport() {
        tg.openTelegramLink('https://t.me/todaysha');
    }
}

// Создаем глобальный экземпляр приложения
const app = new LoyaltyProApp();

// Инициализация когда DOM загружен
document.addEventListener('DOMContentLoaded', () => {
    console.log('Loyalty Pro App запущен!');
});