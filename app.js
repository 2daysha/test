const tg = window.Telegram?.WebApp || null;

class LoyaltyProApp {
    constructor() {
        this.currentPage = 'home';
        this.cart = [];
        this.orders = [];
        this.userData = null;
        this.products = [];
        this.categories = [];
        this.participant = null;
        this.userPhone = null;
        this.baseURL = 'http://localhost:3001';
        this.isAuthenticated = false;
        this.isTelegram = !!tg;
        this.authState = 'checking';
        this.init();
        
        // Исправляем обработчик клавиш
        this.handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                this.closeProductModal();
            }
        };
        document.addEventListener('keydown', this.handleKeyDown);

    }

    async init() { 
        if (!this.isTelegram || !tg) return;

        tg.expand();

        if (tg.disableClosingConfirmation) {
            tg.disableClosingConfirmation();
        }

        this.loadUserDataFromStorage();
        await this.checkAuthentication();
    }

    // Централизованная проверка аутентификации
    async checkAuthentication() {
        try {
            const linked = await this.checkTelegramLink();
            if (linked) {
                this.setAuthState('authenticated');
                return true;
            } else {
                this.setAuthState('unauthenticated');
                return false;
            }
        } catch (error) {
            this.setAuthState('unauthenticated');
            return false;
        }
    }

    // Установка состояния аутентификации
    setAuthState(state) {
        this.authState = state;
        this.isAuthenticated = state === 'authenticated';
        
        switch (state) {
            case 'authenticated':
                this.showMainApp();
                break;
            case 'unauthenticated':
                this.showAuthPage();
                break;
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
                return false;
            }

            if (!response.ok) {
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
                
                // Загружаем продукты и категории только если еще не загружены
                if (this.products.length === 0) {
                    await this.loadProducts();
                }
                if (this.categories.length === 0) {
                    await this.loadProductCategories();
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('Check telegram link error:', error);
            return false;
        }
    }

    async requestPhoneTelegram() {
        if (!tg || !tg.requestContact) {
            this.showNotification('Ошибка', 'Telegram API не поддерживает запрос контакта', 'error');
            return;
        }

        tg.requestContact(async (success) => {
            if (success) {
                this.showNotification('Успех', 'Номер телефона получен', 'success');
                
                try {
                    const linked = await this.pollTelegramLink(10000, 1000);
                    if (linked) {
                        this.setAuthState('authenticated');
                        this.showNotification('Успех', 'Номер телефона успешно привязан!', 'success');
                    } else {
                        this.showNotification('Ошибка', 'Не удалось привязать номер телефона', 'error');
                    }
                } catch (error) {
                    this.showNotification('Ошибка', 'Ошибка при проверке номера телефона', 'error');
                }
            } else {
                this.showNotification('Отменено', 'Доступ к номеру не предоставлен', 'warning');
            }
        });
    }

    async pollTelegramLink(timeout = 10000, interval = 1000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const poll = async () => {
                try {
                    const linked = await this.checkTelegramLink();
                    
                    if (linked) {
                        resolve(true);
                        return;
                    }
                    if (Date.now() - startTime >= timeout) {
                        resolve(false);
                        return;
                    }
                    setTimeout(poll, interval);
                } catch (error) {
                    if (Date.now() - startTime >= timeout) {
                        resolve(false);
                        return;
                    }
                    setTimeout(poll, interval);
                }
            };
            poll();
        });
    }

    logout() {
        this.isAuthenticated = false;
        this.authState = 'unauthenticated';
        this.userData = null;
        this.participant = null;
        this.userPhone = null;
        this.cart = [];
        this.products = [];
        this.categories = [];
        localStorage.removeItem('userData');
        localStorage.removeItem('participant');
        localStorage.removeItem('cart');

        const nav = document.querySelector('.bottom-nav');
        if (nav) nav.style.display = 'none';

        this.setAuthState('unauthenticated');
    }

    async loadProducts() {
        try {
            const response = await fetch(`${this.baseURL}/api/telegram/products/`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });
            if (response.ok) {
                this.products = await response.json();
                // После загрузки товаров обновляем отображение если на странице товаров
                if (this.currentPage === 'home') {
                    this.updateProductGrid('all');
                }
            }
        } catch (error) {
            console.error('Load products error:', error);
        }
    }

    async loadProductCategories() {
    try {
        const response = await fetch(`${this.baseURL}/api/telegram/product-categories/`, {
            method: 'GET',
            headers: this.getAuthHeaders()
        });
        
        if (response.status === 401) {
            this.showAuthPage();
            return;
        }
        
        if (response.ok) {
            this.categories = await response.json();
        }
    } catch (err) {
        console.error('Ошибка загрузки категорий', err);
    }
    }

    showAuthPage() {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('page-auth').classList.add('active');
        document.querySelector('.bottom-nav').style.display = 'none';
        document.querySelector('.app').classList.remove('authenticated');

        const requestBtn = document.getElementById('request-phone-btn');
        if (requestBtn) {
            requestBtn.onclick = () => this.requestPhoneTelegram();
        }
    }

    showMainApp() {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelector('.app').classList.add('authenticated');

        const nav = document.querySelector('.bottom-nav');
        if (nav) nav.style.display = 'flex';

        document.querySelectorAll('.nav-item').forEach(item => {
            item.onclick = (e) => this.navigateTo(e.currentTarget.dataset.page);
        });

        this.loadUserData();
        this.setupNavigation();
        this.showPage('home');
    }

setupNavigation() {
    const navContainer = document.querySelector('.nav-container');
    if (!navContainer) return;
    
    const oldIndicator = document.querySelector('.nav-indicator');
    if (oldIndicator) oldIndicator.remove();
    
    const indicator = document.createElement('div');
    indicator.className = 'nav-indicator';
    navContainer.appendChild(indicator);
    
    this.setupIndicatorStyles();
    
    setTimeout(() => this.updateNavIndicator(), 100);
}

    setupIndicatorStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .nav-indicator {
                position: absolute;
                bottom: -8px;
                width: 24px;
                height: 3px;
                background: #3F75FB;
                border-radius: 2px;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 3;
            }
        `;
        document.head.appendChild(style);
    }

    updateNavIndicator() {
        const activeNav = document.querySelector('.nav-item.active');
        const indicator = document.querySelector('.nav-indicator');
        if (!activeNav || !indicator) return;

        const navRect = activeNav.getBoundingClientRect();
        const containerRect = activeNav.parentElement.getBoundingClientRect();
        
        const left = navRect.left - containerRect.left + (navRect.width / 2) - 12;
        
        indicator.style.left = `${left}px`;
    }

    saveUserData() {
        localStorage.setItem('userData', JSON.stringify(this.userData));
        localStorage.setItem('participant', JSON.stringify(this.participant));
    }

    loadUserDataFromStorage() {
        const storedUser = localStorage.getItem('userData');
        const storedParticipant = localStorage.getItem('participant');
        const storedCart = localStorage.getItem('cart');
        
        if (storedUser) this.userData = JSON.parse(storedUser);
        if (storedParticipant) this.participant = JSON.parse(storedParticipant);
        if (storedCart) this.cart = JSON.parse(storedCart);
    }

    navigateTo(page) {
        if (!this.isAuthenticated) {
            this.showNotification('Ошибка', 'Требуется авторизация', 'error');
            return;
        }
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
        
        setTimeout(() => this.updateNavIndicator(), 10);
        
        this.onPageChange(page);
    }

    onPageChange(page) {
        switch (page) {
            case 'home': 
                this.renderProducts(); 
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

        this.userPhone = participant?.phone_number || null;
    }

    renderProducts() {
        const container = document.getElementById('page-home');
        if (!container) return;

        container.innerHTML = `
            <div class="search-container">
                <div class="search-box">
                    <img src="icons/search.svg" alt="Поиск" class="search-icon">
                    <input type="text" class="search-input" id="search-input" placeholder="Поиск товаров...">
                    <button class="search-clear" id="search-clear" style="display: none;">×</button>
                </div>
            </div>
            
            <div class="categories-dropdown">
                <button class="categories-toggle" id="categories-toggle">
                    <span class="categories-toggle-text">Категории</span>
                    <svg class="categories-arrow" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 10l5 5 5-5z"/>
                    </svg>
                </button>
                <div class="categories-menu" id="categories-menu">
                    <div class="categories-list" id="categories-list">
                        <!-- Категории будут добавляться динамически -->
                    </div>
                </div>
                <div class="categories-overlay" id="categories-overlay"></div>
            </div>
            
            <div class="products-grid" id="products-grid">
                <div class="no-products-message" style="display: none;">
                    Нет товаров в этой категории
                </div>
            </div>
        `;

        this.setupCategoriesDropdown();
        this.setupSearch();
        this.updateProductGrid('all');
    }

    setupCategoriesDropdown() {
        const categoriesToggle = document.getElementById('categories-toggle');
        const categoriesMenu = document.getElementById('categories-menu');
        const categoriesList = document.getElementById('categories-list');
        const categoriesOverlay = document.getElementById('categories-overlay');

        if (!categoriesToggle || !categoriesMenu || !categoriesList) return;

        // Создаем список категорий
        const categories = ['all', ...this.categories.map(c => c.slug || c.name.toLowerCase())];
        
        categoriesList.innerHTML = categories.map(cat => `
            <button class="category-item ${cat === 'all' ? 'active' : ''}" data-category="${cat}">
                ${cat === 'all' ? 'Все товары' : (cat[0].toUpperCase() + cat.slice(1))}
            </button>
        `).join('');

        // Переключение меню
        categoriesToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = categoriesMenu.classList.contains('active');
            
            if (isActive) {
                this.closeCategoriesMenu();
            } else {
                this.openCategoriesMenu();
            }
        });

        // Выбор категории
        categoriesList.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-item')) {
                const category = e.target.dataset.category;
                
                // Обновляем активную категорию
                categoriesList.querySelectorAll('.category-item').forEach(item => {
                    item.classList.remove('active');
                });
                e.target.classList.add('active');
                
                // Обновляем текст кнопки
                const categoryText = e.target.textContent;
                categoriesToggle.querySelector('.categories-toggle-text').textContent = categoryText;
                
                // Закрываем меню и обновляем товары
                this.closeCategoriesMenu();
                this.updateProductGrid(category);
            }
        });

        // Закрытие меню при клике вне
        categoriesOverlay.addEventListener('click', () => {
            this.closeCategoriesMenu();
        });

        // Закрытие меню при клике на документ
        document.addEventListener('click', (e) => {
            if (!categoriesToggle.contains(e.target) && !categoriesMenu.contains(e.target)) {
                this.closeCategoriesMenu();
            }
        });

        // Закрытие меню по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeCategoriesMenu();
            }
        });
    }

    openCategoriesMenu() {
        const categoriesToggle = document.getElementById('categories-toggle');
        const categoriesMenu = document.getElementById('categories-menu');
        const categoriesOverlay = document.getElementById('categories-overlay');

        categoriesToggle.classList.add('active');
        categoriesMenu.classList.add('active');
        categoriesOverlay.classList.add('active');
    }

    closeCategoriesMenu() {
        const categoriesToggle = document.getElementById('categories-toggle');
        const categoriesMenu = document.getElementById('categories-menu');
        const categoriesOverlay = document.getElementById('categories-overlay');

        categoriesToggle.classList.remove('active');
        categoriesMenu.classList.remove('active');
        categoriesOverlay.classList.remove('active');
    }

    setupSearch() {
        const searchInput = document.getElementById('search-input');
        const searchClear = document.getElementById('search-clear');

        if (!searchInput || !searchClear) return;

        // Поиск при вводе текста
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.trim().toLowerCase();
            
            if (searchTerm.length > 0) {
                searchClear.style.display = 'flex';
                this.performSearch(searchTerm);
            } else {
                searchClear.style.display = 'none';
                // Возвращаемся к текущей категории
                const activeCategory = document.querySelector('.category-btn.active')?.dataset.category || 'all';
                this.updateProductGrid(activeCategory);
            }
        });

        // Очистка поиска
        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            searchClear.style.display = 'none';
            const activeCategory = document.querySelector('.category-btn.active')?.dataset.category || 'all';
            this.updateProductGrid(activeCategory);
            searchInput.focus();
        });

        // Закрытие поиска по Escape
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                searchClear.style.display = 'none';
                const activeCategory = document.querySelector('.category-btn.active')?.dataset.category || 'all';
                this.updateProductGrid(activeCategory);
            }
        });
    }

    performSearch(searchTerm) {
        const grid = document.getElementById('products-grid');
        if (!grid) return;

        const filteredProducts = this.products.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            product.description?.toLowerCase().includes(searchTerm) ||
            product.category?.name.toLowerCase().includes(searchTerm)
        );

        const noProductsMessage = grid.querySelector('.no-products-message');
        
        const messageToKeep = grid.querySelector('.no-products-message');
        grid.innerHTML = '';
        if (messageToKeep) {
            grid.appendChild(messageToKeep);
        }
        
        if (filteredProducts.length === 0) {
            noProductsMessage.style.display = 'flex';
            noProductsMessage.textContent = 'По вашему запросу ничего не найдено';
        } else {
            noProductsMessage.style.display = 'none';
            
            filteredProducts.forEach(p => {
                const productCard = document.createElement('div');
                productCard.className = `product-card ${!p.is_available ? 'unavailable' : ''}`;
                if (p.is_available) {
                    productCard.onclick = () => this.openProductModal(p.guid);
                }
                
                productCard.innerHTML = `
                    <img src="${p.image_url || 'placeholder.png'}" alt="${p.name}">
                    <span class="product-category">${p.category?.name || 'Без категории'}</span>
                    <h3>${p.name}</h3>
                    <p>${p.stock || ''}</p>
                    <div class="product-price">${p.price} бонусов</div>
                `;
                grid.appendChild(productCard);
            });
        }
    }

    updateProductGrid(category) {
    const searchInput = document.getElementById('search-input');
    if (searchInput && searchInput.value.trim() !== '') {
        searchInput.value = '';
        const searchClear = document.getElementById('search-clear');
        if (searchClear) searchClear.style.display = 'none';
    }

    const grid = document.getElementById('products-grid');
    if (!grid) return;

    const products = category === 'all'
        ? this.products
        : this.products.filter(p => p.category?.slug === category || p.category?.name?.toLowerCase() === category);

    const noProductsMessage = grid.querySelector('.no-products-message');
    const messageToKeep = grid.querySelector('.no-products-message');
    grid.innerHTML = '';
    if (messageToKeep) {
        grid.appendChild(messageToKeep);
    }
    
    if (products.length === 0) {
        noProductsMessage.style.display = 'flex';
        noProductsMessage.textContent = 'Нет товаров в этой категории';
    } else {
        noProductsMessage.style.display = 'none';
        
        products.forEach(p => {
            const isUnavailable = !p.is_available;
            
            const productCard = document.createElement('div');
            productCard.className = `product-card ${isUnavailable ? 'unavailable' : ''}`;
            
            if (!isUnavailable) {
                productCard.onclick = () => this.openProductModal(p.guid);
            }
            
            productCard.innerHTML = `
                <img src="${p.image_url || 'placeholder.png'}" alt="${p.name}">
                <span class="product-category">${p.category?.name || 'Без категории'}</span>
                <h3>${p.name}</h3>
                <p>${p.stock || ''}</p>
                <div class="product-price">${p.price} бонусов</div>
                ${isUnavailable ? '<div class="product-unavailable">Недоступно</div>' : ''}
            `;
            grid.appendChild(productCard);
        });
    }
}

   addToCart(productGuid) {
    if (!this.isAuthenticated) {
        this.showNotification('Ошибка', 'Для добавления в корзину требуется авторизация', 'error');
        return;
    }

    const product = this.products.find(p => p.guid === productGuid);
    if (!product) return;

    if (!product.is_available) {
        this.showNotification('Недоступно', 'Этот товар временно отсутствует', 'warning');
        return;
    }

    const existing = this.cart.find(i => i.guid === productGuid);
    if (existing) {
        existing.quantity++;
    } else {
        this.cart.push({ ...product, quantity: 1 });
    }

    localStorage.setItem('cart', JSON.stringify(this.cart));
    this.showNotification('Добавлено', `Товар "${product.name}" добавлен в корзину`, 'success');
}

    loadCart() {
        const container = document.getElementById('page-catalog');
        if (!container) return;

        if (!this.cart || this.cart.length === 0) {
            container.innerHTML = `
                <div class="empty-cart">
                    <div class="empty-cart-icon">🛒</div>
                    <h2>Ваша корзина пуста</h2>
                    <p>Добавьте товары из каталога</p>
                    <button class="back-to-catalog" onclick="app.showPage('home')">
                        Вернуться в каталог
                    </button>
                </div>
            `;
            return;
        }

        const totalAmount = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);

        container.innerHTML = `
            <div class="cart-header">
                <h1>Корзина</h1>
                <span class="cart-count">${totalItems} товара</span>
            </div>
            
            <div class="cart-list">
                ${this.cart.map(item => `
                    <div class="cart-item">
                        <div class="cart-item-left">
                            <img src="${item.image_url || 'placeholder.png'}" alt="${item.name}">
                        </div>
                        <div class="cart-item-right">
                            <div class="cart-item-top">
                                <h3>${item.name}</h3>
                                <p class="cart-item-category">${item.category?.name || 'Без категории'}</p>
                            </div>
                            <div class="cart-item-bottom">
                                <div class="quantity-controls">
                                    <button class="quantity-btn" onclick="app.updateQuantity('${item.guid}', ${item.quantity - 1})">-</button>
                                    <span class="quantity">${item.quantity} шт.</span>
                                    <button class="quantity-btn" onclick="app.updateQuantity('${item.guid}', ${item.quantity + 1})">+</button>
                                </div>
                                <div class="item-total">
                                    <span class="cart-item-price">${item.price * item.quantity} бонусов</span>
                                    <button class="delete-btn" onclick="app.removeFromCart('${item.guid}')">
                                        Удалить
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="cart-total animate-card">
                <div class="cart-total-header">
                    <div class="total-info">
                        <h3 class="cart-total-title">Итого к оплате</h3>
                        <p class="total-items">${totalItems} товара на сумму</p>
                    </div>
                    <div class="cart-total-amount">
                        <span class="cart-total-price">${totalAmount}</span>
                        <span class="cart-total-currency">бонусов</span>
                    </div>
                </div>
                <button class="checkout-btn animate-btn" onclick="app.checkoutCart()">
                    <span class="checkout-text">Перейти к оплате</span>
                </button>
            </div>
        `;
    }

    async processOrder() {
    try {
        const totalAmount = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        if (this.participant?.balance < totalAmount) {
            this.showNotification('Ошибка', 'Недостаточно бонусов для оплаты', 'error');
            return;
        }

        const orderData = {
            items: this.cart.map(item => ({
                product: item.guid,
                quantity: item.quantity,
                price: item.price
            }))
        };

        console.log('Отправляем заказ:', orderData);

        const response = await fetch(`${this.baseURL}/api/telegram/create-order/`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(orderData)
        });

        if (response.status === 201) {
            const result = await response.json();
            
            this.cart = [];
            localStorage.removeItem('cart');
            
            this.showSuccessOverlay('Успешно!', 'Заказ создан и оплачен!');
            
            await this.checkTelegramLink();
            this.loadCart();
            
        } else if (response.status === 400) {
            const errorData = await response.json();
            const errorMessage = errorData.detail || 'Ошибка при создании заказа';
            this.showNotification('Ошибка', errorMessage, 'error');
            
        } else if (response.status === 401) {
            this.showNotification('Ошибка', 'Ошибка авторизации', 'error');
            await this.checkAuthentication();
            
        } else {
            this.showNotification('Ошибка', 'Ошибка сервера при создании заказа', 'error');
        }
        
    } catch (error) {
        console.error('Ошибка при создании заказа:', error);
        this.showNotification('Ошибка', 'Не удалось создать заказ', 'error');
    }
}

    openProductModal(productGuid) {
    const product = this.products.find(p => p.guid === productGuid);
    if (!product) return;

    const modal = document.getElementById('product-modal');
    if (!modal) return;

    document.getElementById('modal-product-image').src = product.image_url || 'placeholder.png';
    document.getElementById('modal-product-image').alt = product.name;
    document.getElementById('modal-product-category').textContent = product.category?.name || 'Без категории';
    document.getElementById('modal-product-name').textContent = product.name;
    document.getElementById('modal-product-stock').textContent = product.stock || '';
    document.getElementById('modal-product-description-text').textContent = product.description || 'Описание отсутствует';
    document.getElementById('modal-product-price').textContent = `${product.price} бонусов`;

    const addToCartBtn = document.getElementById('modal-add-to-cart');
    
    if (!product.is_available) {
        addToCartBtn.textContent = 'Недоступно';
        addToCartBtn.disabled = true;
        addToCartBtn.style.background = '#ccc';
        addToCartBtn.style.cursor = 'not-allowed';
    } else {
        addToCartBtn.textContent = 'Добавить в корзину';
        addToCartBtn.disabled = false;
        addToCartBtn.style.background = '#3F75FB';
        addToCartBtn.style.cursor = 'pointer';
        addToCartBtn.onclick = () => {
            this.addToCart(product.guid);
            this.closeProductModal();
        };
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

    closeProductModal() {
        const modal = document.getElementById('product-modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    updateQuantity(productGuid, newQuantity) {
        if (!this.isAuthenticated) return;

        if (newQuantity < 1) {
            this.removeFromCart(productGuid);
            return;
        }

        const item = this.cart.find(i => i.guid === productGuid);
        if (item) {
            item.quantity = newQuantity;
            localStorage.setItem('cart', JSON.stringify(this.cart));
            this.loadCart();
        }
    }

    removeFromCart(productGuid) {
        if (!this.isAuthenticated) return;

        this.cart = this.cart.filter(c => c.guid !== productGuid);
        localStorage.setItem('cart', JSON.stringify(this.cart));
        this.showNotification('Удалено', 'Товар удален из корзины', 'info');
        this.loadCart();
    }

    async checkoutCart() {
    if (!this.isAuthenticated) {
        this.showNotification('Ошибка', 'Для оплаты требуется авторизация', 'error');
        return;
    }

    if (!this.userPhone) {
        this.showNotification('Нужен телефон', 'Для оплаты требуется номер телефона', 'warning');
        return;
    }

    if (this.cart.length === 0) {
        this.showNotification('Корзина пуста', 'Добавьте товары в корзину', 'warning');
        return;
    }

    const totalAmount = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const userBalance = this.participant?.balance || 0;
    
    if (userBalance < totalAmount) {
        this.showNotification('Ошибка', 'Недостаточно бонусов для оплаты', 'error');
        return;
    }

    this.showConfirmDialog(totalAmount, userBalance);
}

showConfirmDialog(totalAmount, userBalance) {
    const balanceAfter = userBalance - totalAmount;
    const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);

    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog-overlay';
    dialog.innerHTML = `
        <div class="confirm-dialog">
            <div class="confirm-dialog-header">
                <h3>Подтверждение заказа</h3>
                <button class="dialog-close" onclick="this.closest('.confirm-dialog-overlay').remove()">×</button>
            </div>
            
            <div class="confirm-dialog-content">
                <div class="order-summary">
                    <p>Вы уверены, что хотите оплатить заказ?</p>
                    <div class="order-details">
                        <div class="detail-line">
                            <span>Товаров:</span>
                            <span>${totalItems} шт.</span>
                        </div>
                        <div class="detail-line">
                            <span>Сумма:</span>
                            <span>${totalAmount} бонусов</span>
                        </div>
                        <div class="detail-line">
                            <span>Баланс после оплаты:</span>
                            <span class="balance-after">${balanceAfter} бонусов</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="confirm-dialog-actions">
                <button class="btn-confirm" onclick="app.processOrder(); this.closest('.confirm-dialog-overlay').remove()">
                    Да, оплатить
                </button>
                <button class="btn-cancel" onclick="this.closest('.confirm-dialog-overlay').remove()">
                    Отмена
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);
    
    // Анимация появления
    setTimeout(() => {
        dialog.classList.add('active');
    }, 10);
}

        loadProfile() {
            const container = document.getElementById('page-cart');
            if (!container) return;

            const { firstName, lastName, username } = this.userData || {};
            const balance = this.participant?.balance || 0;
            const phone = this.userPhone ? this.formatPhoneNumber(this.userPhone) : 'Не привязан';

            container.innerHTML = `
                <div class="profile-info animate-card">
                    <p><strong>Имя:</strong> ${firstName} ${lastName}</p>
                    <p><strong>Логин:</strong> ${username}</p>
                    <p><strong>Телефон:</strong> ${phone}</p>
                </div>
                <div class="profile-stats">
                    <div class="stat-card animate-card">
                        <span class="stat-value">${balance}</span>
                        <span class="stat-label">Бонусы</span>
                    </div>
                    <div class="stat-card animate-card">
                        <span class="stat-value">${this.cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                        <span class="stat-label">В корзине</span>
                    </div>
                </div>
                
                <!-- Кнопка истории заказов -->
                <button class="orders-history-btn" onclick="app.showOrdersPage()">
                    <span class="orders-history-icon">📦</span>
                    История заказов
                </button>
                
                <button class="support-btn animate-btn" onclick="app.showNotification('Поддержка','Свяжитесь с поддержкой','info')">
                    Поддержка
                </button>
            `;
        }

        showOrdersPage() {
            this.showPage('orders');
            this.loadOrders();
        }

        async loadOrders() {
            const container = document.getElementById('orders-list');
            if (!container) return;

            container.innerHTML = '<div class="loading">Загрузка заказов...</div>';

            try {
                const response = await fetch(`${this.baseURL}/api/telegram/orders/`, {
                    method: 'GET',
                    headers: this.getAuthHeaders()
                });

                if (response.ok) {
                    this.orders = await response.json();
                    this.renderOrders();
                } else if (response.status === 401) {
                    this.showNotification('Ошибка', 'Требуется авторизация', 'error');
                    this.showAuthPage();
                } else {
                    this.showNotification('Ошибка', 'Не удалось загрузить заказы', 'error');
                    container.innerHTML = `
                        <div class="empty-orders">
                            <div class="empty-orders-icon">❌</div>
                            <h2>Ошибка загрузки</h2>
                            <p>Попробуйте позже</p>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('Load orders error:', error);
                this.showNotification('Ошибка', 'Ошибка при загрузке заказов', 'error');
                container.innerHTML = `
                    <div class="empty-orders">
                        <div class="empty-orders-icon">❌</div>
                        <h2>Ошибка загрузки</h2>
                        <p>Попробуйте позже</p>
                    </div>
                `;
            }
        }

        renderOrders() {
            const container = document.getElementById('orders-list');
            if (!container) return;

            if (!this.orders || this.orders.length === 0) {
                container.innerHTML = `
                    <div class="empty-orders">
                        <div class="empty-orders-icon">📦</div>
                        <h2>Заказов пока нет</h2>
                        <p>Совершите свой первый заказ в каталоге</p>
                    </div>
                `;
                return;
            }

            // Сортируем заказы по дате (новые сверху)
            const sortedOrders = [...this.orders].sort((a, b) => 
                new Date(b.created_at) - new Date(a.created_at)
            );

            container.innerHTML = sortedOrders.map(order => `
                <div class="order-card">
                    <div class="order-header">
                        <div class="order-info">
                            <h3>Заказ #${order.id || order.guid?.slice(-8) || 'N/A'}</h3>
                            <div class="order-date">${this.formatOrderDate(order.created_at)}</div>
                        </div>
                        <div class="order-status status-${order.status || 'pending'}">
                            ${this.getStatusText(order.status)}
                        </div>
                    </div>
                    
                    <div class="order-items">
                        ${order.items ? order.items.map(item => `
                            <div class="order-item">
                                <span class="item-name">${item.product_name || item.name || 'Товар'}</span>
                                <span class="item-quantity">${item.quantity} шт.</span>
                                <span class="item-price">${(item.price * item.quantity)} бонусов</span>
                            </div>
                        `).join('') : '<div class="order-item">Информация о товарах недоступна</div>'}
                    </div>
                    
                    <div class="order-footer">
                        <div class="order-total">Итого: ${order.total_amount || this.calculateOrderTotal(order)} бонусов</div>
                        <div class="order-id">ID: ${order.guid || order.id}</div>
                    </div>
                </div>
            `).join('');
        }

        // Вспомогательные методы
        formatOrderDate(dateString) {
            if (!dateString) return 'Дата не указана';
            
            try {
                const date = new Date(dateString);
                return date.toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (error) {
                return 'Неверная дата';
            }
        }

        getStatusText(status) {
            const statusMap = {
                'completed': 'Выполнен',
                'pending': 'В обработке',
                'cancelled': 'Отменен',
                'processing': 'Обрабатывается',
                'shipped': 'Отправлен',
                'delivered': 'Доставлен'
            };
            return statusMap[status] || 'В обработке';
        }

        calculateOrderTotal(order) {
            if (!order.items) return 0;
            return order.items.reduce((total, item) => total + (item.price * item.quantity), 0);
        }
    
    formatPhoneNumber(phone) {
        return phone.replace(/(\d{1})(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 ($2) $3-$4-$5');
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

    showSuccessOverlay(title, message) {
        const oldOverlay = document.querySelector('.success-overlay');
        if (oldOverlay) {
            oldOverlay.remove();
        }

        const overlay = document.createElement('div');
        overlay.className = 'success-overlay';
        overlay.innerHTML = `
            <div class="success-overlay-content">
                <div class="success-checkmark">
                    <div class="check-icon"></div>
                </div>
                <div class="success-overlay-title">${title}</div>
                <div class="success-overlay-message">${message}</div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        setTimeout(() => {
            overlay.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            overlay.classList.remove('show');
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.remove();
                }
            }, 300);
        }, 3000);
    }
}
window.app = new LoyaltyProApp();