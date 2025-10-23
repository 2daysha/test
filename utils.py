import os
import requests
from dotenv import load_dotenv

load_dotenv()

BASE_DOMAIN = os.getenv('BASE_DOMAIN')

#ПОТОМ УБРАТЬ!!!!!!!!!!!!!!!!!!!!!
def get_bot_access_token():
    # Для разработки - возвращаем заглушку
    print("⚠️  Режим разработки: используем заглушку для токена")
    return "dev_token_placeholder"

def link_tg_account(link_data):
    # Для разработки - имитируем успешную привязку
    print(f"⚠️  Режим разработки: имитация привязки для {link_data}")
    return {
        'success': True,
        'is_linked': True,
        'participant': {
            'phone_number': link_data['phone_number'],
            'balance': 1000,
            'telegram_profile': {
                'first_name': 'Test',
                'last_name': 'User',
                'username': 'testuser'
            }
        }
    }