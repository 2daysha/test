import os
import json
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo, ReplyKeyboardMarkup, KeyboardButton
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes, MessageHandler
from telegram.ext import filters
from dotenv import load_dotenv

from utils import link_tg_account

load_dotenv()
TOKEN = os.getenv('TOKEN')

# === Команда /start ===
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    web_app_url = os.getenv('WEB_APP_URL') or "https://2daysha.github.io/test/"
    
    keyboard = [
        [InlineKeyboardButton("📱 Открыть приложение", web_app=WebAppInfo(url=web_app_url))],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(
        'Откройте приложение для управления вашим аккаунтом 👇',
        reply_markup=reply_markup
    )

# === Обработка данных из WebApp ===
async def web_app_data(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    data = update.effective_message.web_app_data
    print(f"Получены данные из Web App: {data.data}", flush=True)

    try:
        payload = json.loads(data.data)
    except json.JSONDecodeError:
        await update.message.reply_text("⚠️ Некорректные данные от WebApp.")
        return

    # Если WebApp запросил номер телефона
    if payload.get("action") == "request_phone":
        keyboard = [
            [KeyboardButton("📱 Отправить мой номер телефона", request_contact=True)]
        ]
        reply_markup = ReplyKeyboardMarkup(keyboard, resize_keyboard=True, one_time_keyboard=True)
        await update.message.reply_text(
            "📞 Пожалуйста, отправьте свой номер телефона для авторизации:",
            reply_markup=reply_markup
        )
    else:
        await update.message.reply_text(f"Получены данные из приложения: {data.data}")

# === Обработка отправленного контакта ===
async def handle_contact_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    contact = update.message.contact
    link_data = {
        'phone_number': contact.phone_number,
        'telegram_id': contact.user_id
    }
    
    response = link_tg_account(link_data)
        
    if response.status_code != 200:
        try:
            data = response.json()
            print(data, flush=True)
        except ValueError:
            print("Ответ не в формате JSON")
        await update.message.reply_text("❌ Ошибка авторизации")
    else:
        await update.message.reply_text("✅ Телефон получен и успешно привязан!")

# === Обработка inline-кнопок (если будут нужны) ===
async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    
    if query.data == 'help':
        await query.edit_message_text(text="Чем могу помочь?")
    else:
        await query.edit_message_text(text=f"Вы нажали: {query.data}")

# === Точка входа ===
def main() -> None:
    print("🔄 Запуск бота...")
    application = Application.builder().token(TOKEN).build()

    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, web_app_data))
    application.add_handler(MessageHandler(filters.CONTACT, handle_contact_message))
    application.add_handler(CallbackQueryHandler(button_handler))
    
    print("✅ Бот успешно запущен!")
    print("🤖 Бот работает и ожидает сообщений...")
    print("⏹️  Для остановки нажмите Ctrl+C")
    
    application.run_polling()

if __name__ == '__main__':
    print("🚀 Начало работы программы...")
    try:
        main()
    except KeyboardInterrupt:
        print("\n❌ Бот остановлен пользователем")
    except Exception as e:
        print(f"💥 Произошла ошибка: {e}")
