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

    // Категории товаров
    const categories = [
        { id: 'all', name: 'Все' },
        { id: 'electronics', name: 'Электроника' },
        { id: 'home', name: 'Для дома' },
        { id: 'lifestyle', name: 'Образ жизни' }
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
            const category = e.target.dataset.category;
            
            // Обновляем активную кнопку
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            // Фильтруем товары
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
            totalSpent: this.cart.reduce((sum, item) => sum + item.numericPrice, 0)
        };

        container.innerHTML = `
            <div class="profile-info">
                <p><strong>Имя:</strong> ${this.userData.firstName}</p>
                <p><strong>Фамилия:</strong> ${this.userData.lastName || 'Не указана'}</p>
                <p><strong>Username:</strong> ${this.userData.username}</p>
                <p><strong>ID:</strong> ${this.userData.id}</p>
            </div>
            <div class="profile-stats">
                <div class="stat-card">
                    <span class="stat-value">${stats.totalOrders}</span>
                    <span class="stat-label">Заказов</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">${stats.totalSpent}</span>
                    <span class="stat-label">Потрачено</span>
                </div>
            </div>
            <button onclick="app.showSupport()" style="
                background: var(--tg-theme-button-color, #50a8eb);
                color: var(--tg-theme-button-text-color, #ffffff);
                border: none;
                border-radius: 12px;
                padding: 16px;
                font-size: 16px;
                font-weight: 600;
                width: 100%;
                cursor: pointer;
                margin-top: 16px;
            ">Связаться с поддержкой</button>
        `;
    }

    showSupport() {
        tg.openTelegramLink('https://t.me/loyaltypro_support');
    }
}

// Создаем глобальный экземпляр приложения
const app = new LoyaltyProApp();

// Инициализация когда DOM загружен
document.addEventListener('DOMContentLoaded', () => {
    console.log('Loyalty Pro App запущен!');
});