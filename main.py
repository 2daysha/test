import os
import json
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv("TOKEN")

USERS_FILE = "users.json"

def load_users():
    if not os.path.exists(USERS_FILE):
        with open(USERS_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f, ensure_ascii=False, indent=2)
        return []
    
    try:
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Ошибка загрузки users.json: {e}")
        return []

def save_users(users):
    try:
        with open(USERS_FILE, "w", encoding="utf-8") as f:
            json.dump(users, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"Ошибка сохранения users.json: {e}")
        return False

def find_user_by_telegram_id(telegram_id):
    """Поиск пользователя по Telegram ID."""
    users = load_users()
    for user in users:
        if user.get('telegramId') == str(telegram_id):
            return user
    return None

def create_user(user_data):
    """Создание нового пользователя."""
    users = load_users()
    
    new_user = {
        "id": str(len(users) + 1001),
        "phone": user_data.get('phone'),
        "firstName": user_data.get('firstName', 'Пользователь'),
        "lastName": user_data.get('lastName', ''),
        "username": user_data.get('username', ''),
        "telegramId": user_data.get('telegramId'),
        "registrationDate": user_data.get('registrationDate'),
        "bonuses": 5000,
        "level": "Standard",
        "orders": []
    }
    
    users.append(new_user)
    if save_users(users):
        return new_user
    return None

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /start — показывает кнопку для входа в приложение"""
    user = update.effective_user
    
    text = (
        f"👋 Добро пожаловать, {user.first_name}!\n\n"
        "Нажмите кнопку ниже, чтобы открыть приложение Loyalty Pro.\n"
        "В приложении вам нужно будет предоставить номер телефона "
        "для доступа к бонусной программе."
    )

    web_app_url = "https://2daysha.github.io/test/"
    
    keyboard = [
        [InlineKeyboardButton("📱 Открыть приложение", web_app=WebAppInfo(url=web_app_url))]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(text, reply_markup=reply_markup)

async def handle_web_app_data(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка данных из Web App - только для регистрации пользователя."""
    try:
        data = json.loads(update.effective_message.web_app_data.data)
        user = update.effective_user
        
        print(f"Получены данные от пользователя {user.id}: {data}")
        
        # Обработка только данных авторизации
        if data.get('type') == 'user_auth':
            phone = data.get('phone')
            
            # Создаем нового пользователя
            new_user = create_user({
                'phone': phone,
                'firstName': user.first_name,
                'lastName': user.last_name or '',
                'username': f"@{user.username}" if user.username else '',
                'telegramId': str(user.id),
                'registrationDate': update.effective_message.date.isoformat()
            })
            
            if new_user:
                await update.message.reply_text(
                    f"✅ Регистрация завершена!\n"
                    f"Теперь вы можете использовать все функции приложения.\n\n"
                    f"Нажмите кнопку ниже, чтобы продолжить:",
                    reply_markup=InlineKeyboardMarkup([
                        [InlineKeyboardButton("📱 Продолжить в приложении", web_app=WebAppInfo(url="https://2daysha.github.io/test/"))]
                    ])
                )
            else:
                await update.message.reply_text(
                    "❌ Ошибка регистрации. Попробуйте снова.",
                    reply_markup=InlineKeyboardMarkup([
                        [InlineKeyboardButton("🔄 Попробовать снова", web_app=WebAppInfo(url="https://2daysha.github.io/test/"))]
                    ])
                )
        else:
            # Для других типов данных просто подтверждаем получение
            await update.message.reply_text(
                "✅ Данные получены. Продолжайте работу в приложении.",
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton("📱 Вернуться в приложение", web_app=WebAppInfo(url="https://2daysha.github.io/test/"))]
                ])
            )
                
    except json.JSONDecodeError:
        await update.message.reply_text(
            "❌ Ошибка обработки данных. Попробуйте снова.",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("🔄 Попробовать снова", web_app=WebAppInfo(url="https://2daysha.github.io/test/"))]
            ])
        )
    except Exception as e:
        print(f"Ошибка в handle_web_app_data: {e}")
        await update.message.reply_text(
            "❌ Произошла ошибка. Попробуйте снова.",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("🔄 Попробовать снова", web_app=WebAppInfo(url="https://2daysha.github.io/test/"))]
            ])
        )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка обычных сообщений - перенаправляем в приложение."""
    await update.message.reply_text(
        "💬 Используйте приложение для работы с бонусной программой.\n\n"
        "Нажмите кнопку ниже, чтобы открыть приложение:",
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("📱 Открыть приложение", web_app=WebAppInfo(url="https://2daysha.github.io/test/"))]
        ])
    )

def main():
    print("🤖 Бот Loyalty Pro запущен...")
    app = Application.builder().token(TOKEN).build()
    
    # Обработчики команд
    app.add_handler(CommandHandler("start", start))
    
    # Обработчик данных из Web App
    app.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, handle_web_app_data))
    
    # Обработчик всех остальных сообщений
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    app.run_polling()

if __name__ == "__main__":
    main()