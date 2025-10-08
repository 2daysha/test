import os
import json
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv("TOKEN")

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /start — показывает кнопку для входа в приложение"""
    user = update.effective_user
    
    text = (
        f"👋 Добро пожаловать, {user.first_name}!\n\n"
        "Нажмите кнопку ниже, чтобы открыть приложение Loyalty Pro "
        "и начать использовать бонусную программу."
    )

    web_app_url = "https://2daysha.github.io/test/"
    
    keyboard = [
        [InlineKeyboardButton("🚀 Открыть приложение", web_app=WebAppInfo(url=web_app_url))]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(text, reply_markup=reply_markup)

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /help — справка по использованию"""
    help_text = (
        "🤖 **Loyalty Pro Bot**\n\n"
        "Доступные команды:\n"
        "/start - Запустить бота и открыть приложение\n"
        "/help - Показать эту справку\n\n"
        "После открытия приложения вам нужно будет "
        "предоставить номер телефона для доступа к бонусной программе."
    )
    await update.message.reply_text(help_text)

def main():
    print("🤖 Бот Loyalty Pro запущен...")
    app = Application.builder().token(TOKEN).build()
    
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    
    app.run_polling()

if __name__ == "__main__":
    main()