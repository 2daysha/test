import os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes, MessageHandler
from telegram.ext import filters
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv('TOKEN')

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    web_app_url = "https://2daysha.github.io/test/"
    
    keyboard = [
        [InlineKeyboardButton("📱 Открыть приложение", web_app=WebAppInfo(url=web_app_url))],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text('Откройте приложение для управления.....', reply_markup=reply_markup)

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

def main() -> None:
    print("🔄 Запуск бота...")
    application = Application.builder().token(TOKEN).build()
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(button_handler))
    application.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, web_app_data))
    
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