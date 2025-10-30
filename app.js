/* app.js
   Полностью рабочая версия LoyaltyProApp, совместимая с index.html и OpenAPI:
   - Базовый URL берётся из window.APP_CONFIG.API_URL (http://localhost:3001)
   - Все запросы используют заголовок: Authorization: tma <initData>
   - Эндпоинты соответствуют OpenAPI: /api/telegram/check-telegram-link/, /products/, /product-categories/, /create-order/, /orders/
   - Поддержан workflow с tg.requestContact + pollTelegramLink (как у тебя)
   - Безопасные проверки DOM, защита от дублирования style/listeners
*/

class LoyaltyProApp {
    constructor() {
        // Конфигурация
        this.baseURL = (window.APP_CONFIG && window.APP_CONFIG.API_URL) ? window.APP_CONFIG.API_URL : 'http://localhost:3001';
        this.tg = window.Telegram?.WebApp || null;

        // Состояние
        this.currentPage = 'auth'; // 'auth' | 'home' | 'catalog' | 'profile' | 'orders'
        this.authState = 'checking'; // 'checking' | 'authenticated' | 'unauthenticated'
        this.isAuthenticated = false;

        this.products = [];
        this.categories = [];
        this.cart = JSON.parse(localStorage.getItem('cart') || '[]');
        this.participant = JSON.parse(localStorage.getItem('participant') || 'null');
        this.userData = JSON.parse(localStorage.getItem('userData') || 'null');
        this.userPhone = this.participant?.phone_number || null;

        // Bindings
        this.handleKeyDown = this.handleKeyDown.bind(this);

        // Init
        this.init();
    }

    /* ------------------------
       Initialization
       ------------------------ */
    async init() {
        // Setup basic listeners
        document.addEventListener('keydown', this.handleKeyDown);

        this.setupNavItems();
        this.setupGlobalUI();

        // If Telegram available, do Telegram-specific init
        if (this.tg) {
            try {
                if (typeof this.tg.expand === 'function') this.tg.expand();
                if (typeof this.tg.disableClosingConfirmation === 'function') {
                    this.tg.disableClosingConfirmation();
                }
            } catch (err) {
                console.warn('Telegram WebApp init warning:', err);
            }
        }

        // Load persisted data
        this.loadUserDataFromStorage();

        // Start authentication check
        await this.checkAuthentication();
    }

    /* ------------------------
       Auth & Telegram helpers
       ------------------------ */
    getAuthHeaders() {
        const initData = this.tg?.initData || '';
        return {
            'Authorization': `tma ${initData}`,
            'Content-Type': 'application/json'
        };
    }

    async checkAuthentication() {
        this.setAuthState('checking');

        // If tg not available then show auth page (user must still interact)
        if (!this.tg) {
            this.setAuthState('unauthenticated');
            return false;
        }

        try {
            const linked = await this.checkTelegramLink();
            if (linked) {
                this.setAuthState('authenticated');
                return true;
            } else {
                this.setAuthState('unauthenticated');
                return false;
            }
        } catch (err) {
            console.error('checkAuthentication error:', err);
            this.setAuthState('unauthenticated');
            return false;
        }
    }

    setAuthState(state) {
        this.authState = state;
        this.isAuthenticated = state === 'authenticated';

        if (state === 'authenticated') {
            this.showMainApp();
        } else if (state === 'unauthenticated') {
            this.showAuthPage();
        } else {
            // checking - keep auth page hidden/neutral
            this.showAuthPage();
        }
    }

    async checkTelegramLink() {
        // POST /api/telegram/check-telegram-link/
        try {
            const resp = await fetch(`${this.baseURL}/api/telegram/check-telegram-link/`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });

            if (resp.status === 401) {
                return false;
            }
            if (!resp.ok) {
                return false;
            }

            const data = await resp.json();

            // Expect data.success, data.is_linked, data.participant
            if (data && data.success && data.is_linked && data.participant) {
                this.participant = data.participant;
                this.userPhone = data.participant.phone_number || null;

                // Merge telegram_profile if present
                this.userData = {
                    ...(this.userData || {}),
                    ...(data.participant.telegram_profile || {})
                };

                // Persist
                this.saveUserData();
                // Lazy load products & categories
                if (this.products.length === 0) await this.loadProducts();
                if (this.categories.length === 0) await this.loadProductCategories();

                return true;
            }

            return false;
        } catch (err) {
            console.error('checkTelegramLink error:', err);
            return false;
        }
    }

    // Phone request flow (uses tg.requestContact as in your snippet)
    requestPhoneTelegram() {
        if (!this.tg || !this.tg.requestContact) {
            this.showNotification('Ошибка', 'Telegram API не поддерживает запрос контакта', 'error');
            return;
        }

        // Using the same callback style you provided
        try {
            this.tg.requestContact(async (success) => {
                if (success) {
                    this.showNotification('Успех', 'Номер телефона получен', 'success');

                    try {
                        const linked = await this.pollTelegramLink(15000, 1000); // 15s timeout
                        if (linked) {
                            this.setAuthState('authenticated');
                            this.showNotification('Успех', 'Номер телефона успешно привязан!', 'success');
                        } else {
                            this.showNotification('Ошибка', 'Не удалось привязать номер телефона', 'error');
                        }
                    } catch (err) {
                        console.error('pollTelegramLink error:', err);
                        this.showNotification('Ошибка', 'Ошибка при проверке номера телефона', 'error');
                    }
                } else {
                    this.showNotification('Отменено', 'Доступ к номеру не предоставлен', 'warning');
                }
            });
        } catch (err) {
            console.error('requestContact call error:', err);
            this.showNotification('Ошибка', 'Не удалось запросить контакт', 'error');
        }
    }

    pollTelegramLink(timeout = 10000, interval = 1000) {
        return new Promise((resolve, reject) => {
            const start = Date.now();

            const poll = async () => {
                try {
                    const linked = await this.checkTelegramLink();
                    if (linked) {
                        resolve(true);
                        return;
                    }
                    if (Date.now() - start >= timeout) {
                        resolve(false);
                        return;
                    }
                    setTimeout(poll, interval);
                } catch (err) {
                    if (Date.now() - start >= timeout) {
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
        localStorage.removeItem('userData');
        localStorage.removeItem('participant');
        localStorage.removeItem('cart');

        const nav = document.querySelector('.bottom-nav');
        if (nav) nav.style.display = 'none';

        this.setAuthState('unauthenticated');
    }

    /* ------------------------
       UI setup & helpers
       ------------------------ */
    setupGlobalUI() {
        // Hook button on auth page
        const requestBtn = document.getElementById('request-phone-btn');
        if (requestBtn) {
            requestBtn.onclick = () => this.requestPhoneTelegram();
        }

        // Category dropdown close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeCategoriesMenu();
                this.closeProductModal();
                this.closeConfirmDialog();
            }
        });

        // Setup nav indicator styles (only once)
        if (!document.querySelector('style[data-nav-indicator]')) {
            const style = document.createElement('style');
            style.dataset.navIndicator = 'true';
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
    }

    handleKeyDown(e) {
        if (e.key === 'Escape') {
            this.closeProductModal();
        }
    }

    setupNavItems() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.onclick = (e) => {
                const page = e.currentTarget.dataset.page;
                // map nav 'catalog' -> page-catalog, 'profile' -> page-profile, 'home' -> page-home
                if (!this.isAuthenticated) {
                    this.showNotification('Ошибка', 'Требуется авторизация', 'error');
                    return;
                }
                this.showPage(page);
            };
        });

        // Show bottom nav if participant exists
        if (this.participant) {
            const nav = document.querySelector('.bottom-nav');
            if (nav) nav.style.display = 'flex';
        }
    }

    saveUserData() {
        try {
            localStorage.setItem('userData', JSON.stringify(this.userData));
            localStorage.setItem('participant', JSON.stringify(this.participant));
            localStorage.setItem('cart', JSON.stringify(this.cart || []));
        } catch (err) {
            console.warn('saveUserData error:', err);
        }
    }

    loadUserDataFromStorage() {
        try {
            const storedUser = localStorage.getItem('userData');
            const storedParticipant = localStorage.getItem('participant');
            const storedCart = localStorage.getItem('cart');

            if (storedUser) this.userData = JSON.parse(storedUser);
            if (storedParticipant) this.participant = JSON.parse(storedParticipant);
            if (storedCart) this.cart = JSON.parse(storedCart);

            this.userPhone = this.participant?.phone_number || null;
        } catch (err) {
            console.warn('loadUserDataFromStorage error:', err);
        }
    }

    showAuthPage() {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const authPage = document.getElementById('page-auth');
        if (authPage) authPage.classList.add('active');

        const nav = document.querySelector('.bottom-nav');
        if (nav) nav.style.display = 'none';

        this.currentPage = 'auth';
    }

    showMainApp() {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const nav = document.querySelector('.bottom-nav');
        if (nav) nav.style.display = 'flex';
        this.showPage('home');

        // Attach navigation item click handlers (already set in setupNavItems but ensure active update)
        document.querySelectorAll('.nav-item').forEach(item => {
            item.onclick = (e) => {
                const page = e.currentTarget.dataset.page;
                this.showPage(page);
            };
        });

        // Load user data and UI
        this.loadUserData();
        this.setupIndicator();
    }

    setupIndicator() {
        const navContainer = document.querySelector('.nav-container');
        if (!navContainer) return;

        if (!document.querySelector('.nav-indicator')) {
            const indicator = document.createElement('div');
            indicator.className = 'nav-indicator';
            navContainer.appendChild(indicator);
        }
        setTimeout(() => this.updateNavIndicator(), 150);
    }

    updateNavIndicator() {
        const activeNav = document.querySelector('.nav-item.active');
        const indicator = document.querySelector('.nav-indicator');
        if (!activeNav || !indicator) return;

        const navRect = activeNav.getBoundingClientRect();
        const containerRect = activeNav.parentElement.getBoundingClientRect();
        const left = navRect.left - containerRect.left + (navRect.width / 2) - (indicator.offsetWidth / 2);
        indicator.style.left = `${left}px`;
    }

    showPage(page) {
        // page is 'home' | 'catalog' | 'profile' | 'orders'
        // Map nav data-page 'catalog' -> element id 'page-catalog'
        const idMap = {
            home: 'page-home',
            catalog: 'page-catalog',
            profile: 'page-profile',
            orders: 'page-orders'
        };

        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const el = document.getElementById(idMap[page] || idMap['home']);
        if (el) el.classList.add('active');

        // set active nav item style
        document.querySelectorAll('.nav-item').forEach(n => {
            if (n.dataset.page === page) n.classList.add('active');
            else n.classList.remove('active');
        });

        this.currentPage = page;
        setTimeout(() => this.updateNavIndicator(), 50);

        // Trigger page-specific rendering
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
            case 'profile':
                this.loadProfile();
                break;
            case 'orders':
                this.loadOrders();
                break;
            default:
                this.renderProducts();
        }
    }

    loadUserData() {
        const tgUser = this.tg?.initDataUnsafe?.user;
        const participant = this.participant;
        const profile = participant?.telegram_profile || tgUser;

        if (profile) {
            this.userData = {
                firstName: profile.first_name || 'Пользователь',
                lastName: profile.last_name || '',
                username: profile.username ? `@${profile.username}` : 'Не указан',
                id: profile.id || profile.user_id || 'unknown'
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
        this.saveUserData();
    }

    /* ------------------------
       Products & Categories
       ------------------------ */
    async loadProducts() {
        try {
            const resp = await fetch(`${this.baseURL}/api/telegram/products/`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (resp.status === 401) {
                console.warn('loadProducts: unauthorized');
                return;
            }

            if (resp.ok) {
                const data = await resp.json();
                // Expect an array of Product
                this.products = Array.isArray(data) ? data : (data.products || []);
                // Re-render if on home
                if (this.currentPage === 'home') this.updateProductGrid('all');
            } else {
                console.error('loadProducts: response not ok', resp.status);
            }
        } catch (err) {
            console.error('loadProducts error:', err);
        }
    }

    async loadProductCategories() {
        try {
            const resp = await fetch(`${this.baseURL}/api/telegram/product-categories/`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (resp.status === 401) {
                this.showAuthPage();
                return;
            }

            if (resp.ok) {
                const data = await resp.json();
                this.categories = Array.isArray(data) ? data : (data.categories || []);
                // When categories loaded, if on home, rebuild categories menu
                if (this.currentPage === 'home') this.renderProducts();
            }
        } catch (err) {
            console.error('loadProductCategories error:', err);
        }
    }

    renderProducts() {
        const container = document.getElementById('page-home');
        if (!container) return;

        // We'll rebuild products-grid, categories list, search handlers
        const grid = document.getElementById('products-grid');
        if (!grid) return;

        // Categories
        this.setupCategoriesDropdown();

        // Search
        this.setupSearch();

        // Show all products by default
        this.updateProductGrid('all');
    }

    setupCategoriesDropdown() {
        const categoriesToggle = document.getElementById('categories-toggle');
        const categoriesMenu = document.getElementById('categories-menu');
        const categoriesList = document.getElementById('categories-list');

        if (!categoriesToggle || !categoriesMenu || !categoriesList) return;

        // Build categories array: 'all' + category slugs or names
        const cats = ['all', ...this.categories.map(c => (c.slug || (c.name || '').toLowerCase()))];

        categoriesList.innerHTML = cats.map((cat, idx) => {
            const active = idx === 0 ? 'active' : '';
            const label = cat === 'all' ? 'Все товары' : (cat[0].toUpperCase() + cat.slice(1));
            return `<button class="category-item ${active}" data-category="${cat}">${label}</button>`;
        }).join('');

        // Toggle
        const onToggle = (e) => {
            e.stopPropagation();
            const isActive = categoriesMenu.classList.contains('active');
            if (isActive) this.closeCategoriesMenu();
            else this.openCategoriesMenu();
        };

        categoriesToggle.removeEventListener('click', onToggle);
        categoriesToggle.addEventListener('click', onToggle);

        // Select category
        categoriesList.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('category-item')) {
                const category = e.target.dataset.category;
                // Update active
                categoriesList.querySelectorAll('.category-item').forEach(it => it.classList.remove('active'));
                e.target.classList.add('active');
                // Update button text
                const categoryText = e.target.textContent;
                categoriesToggle.querySelector('.categories-toggle-text').textContent = categoryText;
                // Close and update grid
                this.closeCategoriesMenu();
                this.updateProductGrid(category);
            }
        });

        // Close overlay clicks outside
        document.addEventListener('click', (e) => {
            const clickedInside = categoriesToggle.contains(e.target) || categoriesMenu.contains(e.target);
            if (!clickedInside) {
                this.closeCategoriesMenu();
            }
        });
    }

    openCategoriesMenu() {
        const categoriesToggle = document.getElementById('categories-toggle');
        const categoriesMenu = document.getElementById('categories-menu');

        if (!categoriesToggle || !categoriesMenu) return;
        categoriesToggle.classList.add('active');
        categoriesMenu.classList.add('active');
    }

    closeCategoriesMenu() {
        const categoriesToggle = document.getElementById('categories-toggle');
        const categoriesMenu = document.getElementById('categories-menu');

        if (!categoriesToggle || !categoriesMenu) return;
        categoriesToggle.classList.remove('active');
        categoriesMenu.classList.remove('active');
    }

    setupSearch() {
        const searchInput = document.getElementById('search-input');
        const searchClear = document.getElementById('search-clear');
        if (!searchInput || !searchClear) return;

        // Input event
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.trim().toLowerCase();
            if (term.length > 0) {
                searchClear.style.display = 'flex';
                this.performSearch(term);
            } else {
                searchClear.style.display = 'none';
                const activeCategory = document.querySelector('.category-item.active')?.dataset.category || 'all';
                this.updateProductGrid(activeCategory);
            }
        });

        // Clear
        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            searchClear.style.display = 'none';
            const activeCategory = document.querySelector('.category-item.active')?.dataset.category || 'all';
            this.updateProductGrid(activeCategory);
            searchInput.focus();
        });

        // Escape key on search
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                searchClear.style.display = 'none';
                const activeCategory = document.querySelector('.category-item.active')?.dataset.category || 'all';
                this.updateProductGrid(activeCategory);
            }
        });
    }

    performSearch(searchTerm) {
        const grid = document.getElementById('products-grid');
        if (!grid) return;

        const filteredProducts = this.products.filter(product =>
            (product.name && product.name.toLowerCase().includes(searchTerm)) ||
            (product.description && product.description.toLowerCase().includes(searchTerm)) ||
            (product.category && product.category.name && product.category.name.toLowerCase().includes(searchTerm))
        );

        // Preserve no-products-message element if present
        const noMessage = grid.querySelector('.no-products-message') || document.createElement('div');
        noMessage.className = 'no-products-message';
        grid.innerHTML = '';
        grid.appendChild(noMessage);

        if (filteredProducts.length === 0) {
            noMessage.style.display = 'flex';
            noMessage.textContent = 'По вашему запросу ничего не найдено';
            return;
        } else {
            noMessage.style.display = 'none';
        }

        filteredProducts.forEach(p => {
            const card = document.createElement('div');
            const isUnavailable = !p.is_available;
            card.className = `product-card ${isUnavailable ? 'unavailable' : ''}`;
            if (p.is_available) {
                card.onclick = () => this.openProductModal(p.guid);
            }
            card.innerHTML = `
                <img src="${p.image_url || 'placeholder.png'}" alt="${this.escapeHtml(p.name)}">
                <span class="product-category">${this.escapeHtml(p.category?.name || 'Без категории')}</span>
                <h3>${this.escapeHtml(p.name)}</h3>
                <p>${this.escapeHtml(p.stock || '')}</p>
                <div class="product-price">${p.price}</div>
                ${isUnavailable ? '<div class="product-unavailable">Недоступно</div>' : ''}
            `;
            grid.appendChild(card);
        });
    }

    updateProductGrid(category = 'all') {
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
            : this.products.filter(p => (p.category?.slug === category) || (p.category?.name?.toLowerCase() === category));

        const noProductsMessage = grid.querySelector('.no-products-message') || document.createElement('div');
        noProductsMessage.className = 'no-products-message';
        grid.innerHTML = '';
        grid.appendChild(noProductsMessage);

        if (!products || products.length === 0) {
            noProductsMessage.style.display = 'flex';
            noProductsMessage.textContent = 'Нет товаров в этой категории';
            return;
        } else {
            noProductsMessage.style.display = 'none';
        }

        products.forEach(p => {
            const isUnavailable = !p.is_available;
            const productCard = document.createElement('div');
            productCard.className = `product-card ${isUnavailable ? 'unavailable' : ''}`;
            if (!isUnavailable) {
                productCard.onclick = () => this.openProductModal(p.guid);
            }

            productCard.innerHTML = `
                <img src="${p.image_url || 'placeholder.png'}" alt="${this.escapeHtml(p.name)}">
                <span class="product-category">${this.escapeHtml(p.category?.name || 'Без категории')}</span>
                <h3>${this.escapeHtml(p.name)}</h3>
                <p>${this.escapeHtml(p.stock || '')}</p>
                <div class="product-price">${p.price} </div>
                ${isUnavailable ? '<div class="product-unavailable">Недоступно</div>' : ''}
            `;
            grid.appendChild(productCard);
        });
    }

    escapeHtml(str = '') {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /* ------------------------
       Cart
       ------------------------ */
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
            this.cart.push({ guid: product.guid, name: product.name, price: product.price, image_url: product.image_url, category: product.category, quantity: 1 });
        }

        localStorage.setItem('cart', JSON.stringify(this.cart));
        this.showNotification('Добавлено', `Товар "${product.name}" добавлен в корзину`, 'success');

        // Update cart count in UI
        const cartCount = document.getElementById('cart-count');
        if (cartCount) cartCount.textContent = `${this.cart.reduce((s, i) => s + i.quantity, 0)} товара`;
    }

    loadCart() {
        const container = document.getElementById('page-catalog');
        const emptyCart = document.getElementById('empty-cart');
        const cartList = document.getElementById('cart-list');
        const cartTotal = document.getElementById('cart-total');
        const cartCount = document.getElementById('cart-count');
        const totalItemsText = document.getElementById('total-items-text');
        const cartTotalPrice = document.getElementById('cart-total-price');

        if (!container || !emptyCart || !cartList || !cartTotal || !cartCount || !cartTotalPrice) return;

        if (!this.cart || this.cart.length === 0) {
            container.style.display = 'none';
            emptyCart.style.display = 'block';
            cartCount.textContent = `0 товара`;
            return;
        }

        container.style.display = 'block';
        emptyCart.style.display = 'none';

        const totalAmount = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);

        cartCount.textContent = `${totalItems} товара`;

        cartList.innerHTML = this.cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-left">
                    <img src="${item.image_url || 'placeholder.png'}" alt="${this.escapeHtml(item.name)}">
                </div>
                <div class="cart-item-right">
                    <div class="cart-item-top">
                        <h3>${this.escapeHtml(item.name)}</h3>
                        <p class="cart-item-category">${this.escapeHtml(item.category?.name || 'Без категории')}</p>
                    </div>
                    <div class="cart-item-bottom">
                        <div class="quantity-controls">
                            <button class="quantity-btn" data-guid="${item.guid}" data-action="decrease">-</button>
                            <span class="quantity">${item.quantity} шт.</span>
                            <button class="quantity-btn" data-guid="${item.guid}" data-action="increase">+</button>
                        </div>
                        <div class="item-total">
                            <span class="cart-item-price">${item.price * item.quantity}</span>
                            <button class="delete-btn" data-guid="${item.guid}">
                                Удалить
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Attach handlers
        cartList.querySelectorAll('.quantity-btn').forEach(btn => {
            btn.onclick = (e) => {
                const guid = e.currentTarget.dataset.guid;
                const action = e.currentTarget.dataset.action;
                const item = this.cart.find(i => i.guid === guid);
                if (!item) return;
                if (action === 'decrease') this.updateQuantity(guid, item.quantity - 1);
                else this.updateQuantity(guid, item.quantity + 1);
            };
        });

        cartList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.onclick = (e) => {
                const guid = e.currentTarget.dataset.guid;
                this.removeFromCart(guid);
            };
        });

        totalItemsText.textContent = `${totalItems} товара на сумму`;
        cartTotalPrice.textContent = totalAmount;
        cartTotal.style.display = 'block';
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

    /* ------------------------
       Checkout / Orders
       ------------------------ */
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
            this.showNotification('Ошибка', 'Недостаточно средств для оплаты', 'error');
            return;
        }

        this.showConfirmDialog(totalAmount, userBalance);
    }

    showConfirmDialog(totalAmount, userBalance) {
        const balanceAfter = userBalance - totalAmount;
        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);

        const dialogTotalItems = document.getElementById('dialog-total-items');
        const dialogTotalAmount = document.getElementById('dialog-total-amount');
        const dialogBalanceAfter = document.getElementById('dialog-balance-after');
        const commentInput = document.getElementById('order-comment');
        const commentCounter = document.getElementById('comment-chars');

        if (dialogTotalItems) dialogTotalItems.textContent = `${totalItems} шт.`;
        if (dialogTotalAmount) dialogTotalAmount.textContent = `${totalAmount}`;
        if (dialogBalanceAfter) dialogBalanceAfter.textContent = `${balanceAfter}`;

        if (commentInput) {
            commentInput.value = '';
            commentCounter.textContent = '0';
            commentInput.addEventListener('input', function () {
                commentCounter.textContent = this.value.length;
            });
        }

        const dialog = document.getElementById('confirm-dialog-overlay');
        if (!dialog) return;
        dialog.style.display = 'flex';
        setTimeout(() => dialog.classList.add('active'), 10);
    }

    closeConfirmDialog() {
        const dialog = document.getElementById('confirm-dialog-overlay');
        if (!dialog) return;
        dialog.classList.remove('active');
        setTimeout(() => { if (dialog.parentNode) dialog.style.display = 'none'; }, 300);
    }

    async processOrder() {
        try {
            const totalAmount = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            if (this.participant?.balance < totalAmount) {
                this.showNotification('Ошибка', 'Недостаточно средств для оплаты', 'error');
                return;
            }

            const commentInput = document.getElementById('order-comment');
            const commentary = commentInput ? commentInput.value.trim() : '';

            // Build items in format required by OpenAPI: { product: uuid, quantity, price }
            const items = this.cart.map(item => ({
                product: item.guid,
                quantity: item.quantity,
                price: item.price
            }));

            const orderData = {
                items,
                commentary: commentary || ""
            };

            const response = await fetch(`${this.baseURL}/api/telegram/create-order/`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(orderData)
            });

            if (response.status === 201) {
                const result = await response.json();
                // Reset cart
                this.cart = [];
                localStorage.removeItem('cart');

                this.showSuccessOverlay('Успешно!', 'Заказ создан и оплачен!');

                this.closeConfirmDialog();

                // Refresh participant & orders
                await this.checkTelegramLink();
                this.loadCart();
                this.loadOrders();

            } else if (response.status === 400) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.detail || 'Ошибка при создании заказа';
                this.showNotification('Ошибка', errorMessage, 'error');
            } else if (response.status === 401) {
                this.showNotification('Ошибка', 'Ошибка авторизации', 'error');
                await this.checkAuthentication();
            } else {
                this.showNotification('Ошибка', 'Ошибка сервера при создании заказа', 'error');
            }
        } catch (error) {
            console.error('processOrder error:', error);
            this.showNotification('Ошибка', 'Не удалось создать заказ', 'error');
        }
    }

    /* ------------------------
       Product Modal
       ------------------------ */
    openProductModal(productGuid) {
        const product = this.products.find(p => p.guid === productGuid);
        if (!product) return;

        const modal = document.getElementById('product-modal');
        if (!modal) return;

        const img = document.getElementById('modal-product-image');
        const categoryEl = document.getElementById('modal-product-category');
        const nameEl = document.getElementById('modal-product-name');
        const stockEl = document.getElementById('modal-product-stock');
        const descEl = document.getElementById('modal-product-description-text');
        const priceEl = document.getElementById('modal-product-price');
        const addBtn = document.getElementById('modal-add-to-cart');

        if (img) { img.src = product.image_url || 'placeholder.png'; img.alt = product.name; }
        if (categoryEl) categoryEl.textContent = product.category?.name || 'Без категории';
        if (nameEl) nameEl.textContent = product.name;
        if (stockEl) stockEl.textContent = product.stock || '';
        if (descEl) descEl.textContent = product.description || 'Описание отсутствует';
        if (priceEl) priceEl.textContent = `${product.price}`;

        if (addBtn) {
            if (!product.is_available) {
                addBtn.textContent = 'Недоступно';
                addBtn.disabled = true;
                addBtn.style.background = '#ccc';
                addBtn.style.cursor = 'not-allowed';
                addBtn.onclick = null;
            } else {
                addBtn.textContent = 'Добавить в корзину';
                addBtn.disabled = false;
                addBtn.style.background = '';
                addBtn.style.cursor = '';
                addBtn.onclick = () => {
                    this.addToCart(product.guid);
                    this.closeProductModal();
                };
            }
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

    /* ------------------------
       Orders history
       ------------------------ */
    async loadOrders() {
        const container = document.getElementById('orders-list');
        if (!container) return;
        container.innerHTML = '<div class="loading">Загрузка заказов...</div>';

        try {
            const resp = await fetch(`${this.baseURL}/api/telegram/orders/`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (resp.ok) {
                const data = await resp.json();
                this.orders = Array.isArray(data) ? data : (data.orders || []);
                this.renderOrders();
            } else if (resp.status === 401) {
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
        } catch (err) {
            console.error('loadOrders error:', err);
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

        const sortedOrders = [...this.orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        container.innerHTML = sortedOrders.map(order => `
            <div class="order-card animate-card">
                <div class="order-header">
                    <div class="order-info">
                        <h3>Заказ ${order.order_number || order.id}</h3>
                        <div class="order-date">${this.formatOrderDate(order.created_at)}</div>
                    </div>
                    <div class="order-status status-${order.order_status}">
                        ${this.getStatusText(order.order_status)}
                    </div>
                </div>

                <div class="order-items">
                    ${order.items.map(item => `
                        <div class="order-item">
                            <span class="item-name">${this.escapeHtml(item.product.name || item.product)}</span>
                            <span class="item-quantity">${item.quantity} шт.</span>
                            <span class="item-price">${item.price * item.quantity}</span>
                        </div>
                    `).join('')}
                </div>

                ${order.commentary ? `
                    <div class="order-comment">
                        <strong>Комментарий:</strong> ${this.escapeHtml(order.commentary)}
                    </div>
                ` : ''}

                <div class="order-footer">
                    <div class="order-total">Итого: ${this.calculateOrderTotal(order)} </div>
                </div>
            </div>
        `).join('');
    }

    formatOrderDate(dateString) {
        if (!dateString) return 'Дата не указана';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU', {
                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        } catch (err) {
            return 'Неверная дата';
        }
    }

    getStatusText(status) {
        const statusMap = { new: 'Новый', accepted: 'Принят', done: 'Выполнен', cancelled: 'Отменен' };
        return statusMap[status] || status;
    }

    calculateOrderTotal(order) {
        return order.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    /* ------------------------
       Profile
       ------------------------ */
    loadProfile() {
        const container = document.getElementById('page-profile');
        if (!container) return;

        const { firstName, lastName, username } = this.userData || {};
        const balance = this.participant?.balance || 0;
        const phone = this.userPhone ? this.formatPhoneNumber(this.userPhone) : 'Не привязан';

        const infoEl = document.getElementById('profile-info');
        const statsEl = document.getElementById('profile-stats');

        if (infoEl) {
            infoEl.innerHTML = `
                <p><strong>Имя:</strong> ${this.escapeHtml(firstName || '')} ${this.escapeHtml(lastName || '')}</p>
                <p><strong>Логин:</strong> ${this.escapeHtml(username || '')}</p>
                <p><strong>Телефон:</strong> ${this.escapeHtml(phone)}</p>
            `;
        }

        if (statsEl) {
            statsEl.innerHTML = `
                <div class="stat-card animate-card">
                    <span class="stat-value">${balance}</span>
                    <span class="stat-label">Бонусы</span>
                </div>
                <div class="stat-card animate-card">
                    <span class="stat-value">${this.cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                    <span class="stat-label">В корзине</span>
                </div>
            `;
        }
    }

    showOrdersPage() {
        this.showPage('orders');
        this.loadOrders();
    }

    /* ------------------------
       Utilities & Notifications
       ------------------------ */
    formatPhoneNumber(phone) {
        if (!phone) return phone || '';
        const digits = phone.replace(/\D/g, '');
        // handle +7 or 8 leading
        if (digits.length === 11) {
            // if starts with 8 or 7, show +7 format
            const replaced = digits.replace(/^8|^7/, '');
            return `+7 (${replaced.slice(0,3)}) ${replaced.slice(3,6)}-${replaced.slice(6,8)}-${replaced.slice(8,10)}`;
        } else if (digits.length === 10) {
            return `+7 (${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6,8)}-${digits.slice(8,10)}`;
        }
        return phone;
    }

    showNotification(title, message, type = 'info') {
        try {
            const container = document.createElement('div');
            container.className = `notification show notification-${type}`;
            container.innerHTML = `
                <svg class="notification-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" fill="currentColor"/>
                </svg>
                <div class="notification-content">
                    <div class="notification-title">${this.escapeHtml(title)}</div>
                    <div class="notification-message">${this.escapeHtml(message)}</div>
                </div>
            `;
            document.body.appendChild(container);
            setTimeout(() => container.classList.remove('show'), 3000);
            setTimeout(() => { if (container.parentNode) container.remove(); }, 3500);
        } catch (err) {
            console.warn('showNotification error:', err);
        }
    }

    showSuccessOverlay(title, message) {
        const old = document.querySelector('.success-overlay');
        if (old) old.remove();

        const overlay = document.createElement('div');
        overlay.className = 'success-overlay';
        overlay.innerHTML = `
            <div class="success-overlay-content">
                <div class="success-checkmark">
                    <div class="check-icon">✔</div>
                </div>
                <div class="success-overlay-title">${this.escapeHtml(title)}</div>
                <div class="success-overlay-message">${this.escapeHtml(message)}</div>
            </div>
        `;
        document.body.appendChild(overlay);

        setTimeout(() => overlay.classList.add('show'), 10);
        setTimeout(() => {
            overlay.classList.remove('show');
            setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 300);
        }, 3000);
    }
}


window.addEventListener('DOMContentLoaded', () => {
    window.app = new LoyaltyProApp();
});
