import os
import json
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import (
    Application, CommandHandler, MessageHandler, ContextTypes, filters
)
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv("TOKEN")

USERS_FILE = "users.json"

def load_users():
    """Загрузка списка пользователей из файла."""
    if not os.path.exists(USERS_FILE):
        return {}
    with open(USERS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_users(users):
    """Сохранение списка пользователей в файл."""
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, ensure_ascii=False, indent=2)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /start — проверяет регистрацию пользователя."""
    user = update.effective_user
    users = load_users()

    user_id = str(user.id)
    if user_id not in users:
        # Регистрируем нового пользователя
        users[user_id] = {
            "first_name": user.first_name,
            "last_name": user.last_name or "",
            "username": f"@{user.username}" if user.username else "",
            "phone": None
        }
        save_users(users)
        text = (
            f"👋 Добро пожаловать, {user.first_name}!\n\n"
            "Вы успешно зарегистрированы в системе. "
            "Теперь откройте мини-приложение, чтобы подтвердить номер телефона."
        )
    else:
        text = (
            f"С возвращением, {user.first_name}! 👋\n"
            "Вы уже зарегистрированы в системе."
        )

    web_app_url = "https://2daysha.github.io/test/"
    keyboard = [[InlineKeyboardButton("📱 Открыть приложение", web_app=WebAppInfo(url=web_app_url))]]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(text, reply_markup=reply_markup)

async def web_app_data(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Получает данные из mini-app (например, номер телефона)."""
    data = update.effective_message.web_app_data
    print(f"📩 Получены данные из WebApp: {data.data}")

    try:
        payload = json.loads(data.data)
    except Exception:
        payload = {}

    user_id = str(update.effective_user.id)
    users = load_users()

    if user_id in users:
        if "phone" in payload:
            users[user_id]["phone"] = payload["phone"]
            save_users(users)
            await update.message.reply_text("✅ Номер телефона сохранён.")
        else:
            await update.message.reply_text("⚠️ Данных о номере не получено.")
    else:
        await update.message.reply_text("⚠️ Пользователь не найден в базе. Отправьте /start")

async def show_users(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /users — показывает список зарегистрированных пользователей (для теста)."""
    users = load_users()
    if not users:
        await update.message.reply_text("📭 Пока нет зарегистрированных пользователей.")
        return

    msg = "📋 Список пользователей:\n\n"
    for uid, data in users.items():
        msg += f"• {data['first_name']} ({uid}) — {data.get('phone', '❌ нет телефона')}\n"
    await update.message.reply_text(msg)

def main():
    print("🤖 Бот запущен...")
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("users", show_users))
    app.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, web_app_data))
    app.run_polling()

if __name__ == "__main__":
    main()
