import os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes, MessageHandler
from telegram.ext import filters
from dotenv import load_dotenv

from utils import link_tg_account

load_dotenv()
TOKEN = os.getenv('TOKEN')

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    web_app_url = os.getenv('WEB_APP_URL')
    
    keyboard = [
        [InlineKeyboardButton("❇️ Открыть приложение ❇️", web_app=WebAppInfo(url="https://2daysha.github.io/test/"))],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text('Чтобы открыть приложение нажми на кнопку', reply_markup=reply_markup)

async def web_app_data(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:

    data = update.effective_message.web_app_data
    print(f"Получены данные из Web App: {data.data}")
    await update.message.reply_text(f"Получены данные из приложения: {data.data}")

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    
    if query.data == 'help':
        await query.edit_message_text(text="Чем могу помочь?")
    else:
        await query.edit_message_text(text=f"Вы нажали: {query.data}")

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

def main() -> None:
    print("🔄 Запуск бота...")
    application = Application.builder().token(TOKEN).build()
    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, web_app_data))
    application.add_handler(MessageHandler(filters.CONTACT, handle_contact_message))
    
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