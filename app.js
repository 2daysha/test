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

        // Имитация данных привилегий (в реальном приложении - API запрос)
        const privileges = [
            {
                id: 1,
                name: "Премиум подписка",
                description: "Доступ ко всем функциям на 1 месяц",
                price: "299 ₽"
            },
            {
                id: 2,
                name: "Золотая карта",
                description: "Скидка 15% на все покупки",
                price: "499 ₽"
            },
            {
                id: 3,
                name: "VIP статус",
                description: "Персональный менеджер и приоритетная поддержка",
                price: "999 ₽"
            },
            {
                id: 4,
                name: "Базовый пакет",
                description: "Основные функции лояльности",
                price: "149 ₽"
            }
        ];

        container.innerHTML = privileges.map(privilege => `
            <div class="privilege-card" onclick="app.addToCart(${privilege.id})">
                <h3>${privilege.name}</h3>
                <p>${privilege.description}</p>
                <div class="privilege-price">${privilege.price}</div>
            </div>
        `).join('');
    }

    addToCart(privilegeId) {
        // Имитация данных привилегий
        const privileges = {
            1: { name: "Премиум подписка", price: "299 ₽", numericPrice: 299 },
            2: { name: "Золотая карта", price: "499 ₽", numericPrice: 499 },
            3: { name: "VIP статус", price: "999 ₽", numericPrice: 999 },
            4: { name: "Базовый пакет", price: "149 ₽", numericPrice: 149 }
        };

        const privilege = privileges[privilegeId];
        if (!privilege) return;

        // Добавляем в корзину
        this.cart.push({
            id: Date.now(), // уникальный ID
            privilegeId: privilegeId,
            name: privilege.name,
            price: privilege.price,
            numericPrice: privilege.numericPrice
        });

        // Показываем уведомление
        tg.showPopup({
            title: 'Добавлено в корзину',
            message: `${privilege.name} добавлен в корзину`,
            buttons: [{ type: 'ok' }]
        });

        console.log('Товар добавлен в корзину:', privilege);
        console.log('Корзина:', this.cart);
    }

    loadCart() {
        const container = document.getElementById('page-catalog');
        if (!container) return;

        if (this.cart.length === 0) {
            container.innerHTML = `
                <div class="loading">Корзина пуста</div>
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
                    <button onclick="app.removeFromCart(${item.id})" style="
                        background: var(--tg-theme-destructive-text-color, #ff3b30);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        padding: 8px 12px;
                        font-size: 12px;
                        cursor: pointer;
                    ">Удалить</button>
                </div>
            `).join('')}
            <div class="cart-total">
                <h3>Общая сумма</h3>
                <div class="cart-total-price">${total} ₽</div>
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