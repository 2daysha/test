from flask import Flask, jsonify, request
from flask_cors import CORS
import random

app = Flask(__name__)
CORS(app)

# ===== MOCK DATA =====
mock_participant = {
    "id": "b3e94e12-1eac-45fa-9df2-77081c23a90f",
    "phone_number": "+79991234567",
    "balance": 5000,
    "telegram_profile": {"id": "123456789"}
}

mock_categories = [
    {"guid": "1", "name": "Для дома"},
    {"guid": "2", "name": "Электроника"},
    {"guid": "3", "name": "Образ жизни"}
]

mock_products = [
    {
        "guid": "1",
        "name": "Кофеварка автоматическая",
        "stock": "Приготовление кофе с таймером",
        "image_url": "https://picsum.photos/200/200?random=1",
        "price": 2500,
        "is_available": True,
        "category": {"guid": "1", "name": "Для дома"}
    },
    {
        "guid": "2",
        "name": "Bluetooth колонка",
        "stock": "Водонепроницаемая, 10W",
        "image_url": "https://picsum.photos/200/200?random=2",
        "price": 3200,
        "is_available": True,
        "category": {"guid": "2", "name": "Электроника"}
    },
    {
        "guid": "3",
        "name": "Фитнес-браслет",
        "stock": "Мониторинг сна и активности",
        "image_url": "https://picsum.photos/200/200?random=3",
        "price": 2800,
        "is_available": False,
        "category": {"guid": "2", "name": "Электроника"}
    },
    {
        "guid": "4",
        "name": "Подарочная карта в магазин",
        "stock": "Номинал 1000 рублей",
        "image_url": "https://picsum.photos/200/200?random=4",
        "price": 1000,
        "is_available": True,
        "category": {"guid": "3", "name": "Образ жизни"}
    }
]


# ===== HELPERS =====

def check_auth_header():
    """Проверяет наличие корректного заголовка авторизации"""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("tma "):
        return False
    return True


def auth_error():
    return jsonify({"success": False, "message": "Ошибка Telegram-аутентификации"}), 401


# ===== API TOKEN (для бота) =====

@app.route("/api/token/", methods=["POST"])
def get_token():
    """Фейковая авторизация для Telegram-бота"""
    print("🔑 POST /api/token/")
    data = request.get_json() or {}
    username = data.get("username", "test_bot")
    password = data.get("password", "secret")

    # Симуляция успешного получения токена
    return jsonify({
        "access": f"mock_access_token_{username}",
        "refresh": f"mock_refresh_token_{password}",
        "expires_in": 3600
    })


# ===== TELEGRAM MINI APP ROUTES =====

@app.route("/api/telegram/check-telegram-link/", methods=["POST"])
def check_telegram_link():
    """Проверка привязки Telegram"""
    print("🔐 POST /api/telegram/check-telegram-link/")

    if not check_auth_header():
        return auth_error()

    # 🔧 Всегда считаем пользователя привязанным
    response = {
        "success": True,
        "is_linked": True,
        "participant": mock_participant
    }

    return jsonify(response)

@app.route("/api/telegram/link-telegram/", methods=["POST"])
def link_telegram_account():
    """Привязка Telegram-аккаунта к участнику"""
    print("🔗 POST /api/telegram/link-telegram/")
    data = request.get_json() or {}

    telegram_id = data.get("telegram_id", "unknown")
    phone_number = data.get("phone_number", "+79990000000")

    # Имитируем успешную привязку
    participant = {
        **mock_participant,
        "phone_number": phone_number,
        "telegram_profile": {"id": telegram_id}
    }

    return jsonify({
        "success": True,
        "message": "Telegram-аккаунт успешно привязан",
        "participant": participant
    }), 200


@app.route("/api/telegram/products/", methods=["GET"])
def get_products():
    """Получение списка товаров"""
    print("🛍️ GET /api/telegram/products/")

    if not check_auth_header():
        return auth_error()

    return jsonify(mock_products)


@app.route("/api/telegram/product-categories/", methods=["GET"])
def get_product_categories():
    """Получение категорий товаров"""
    print("📂 GET /api/telegram/product-categories/")

    if not check_auth_header():
        return auth_error()

    return jsonify(mock_categories)


# ===== GLOBAL HANDLERS =====

@app.errorhandler(500)
def handle_500(error):
    return jsonify({
        "success": False,
        "message": "Внутренняя ошибка сервера"
    }), 500


# ===== MAIN =====

if __name__ == "__main__":
    print("🚀 Mock-сервер Telegram Mini App запущен!")
    print("📡 Адрес: http://localhost:3001")
    print("\n📋 Доступные endpoints:")
    print("   POST /api/token/")
    print("   POST /api/telegram/check-telegram-link/")
    print("   GET  /api/telegram/products/")
    print("   GET  /api/telegram/product-categories/")
    print("\n⚡ Сервер готов к работе!")

    app.run(host="0.0.0.0", port=3001, debug=True)
