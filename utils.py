import os
import requests
from dotenv import load_dotenv

load_dotenv()

BASE_DOMAIN = os.getenv('BASE_DOMAIN')


def get_bot_access_token():
    request_url = f'{BASE_DOMAIN}/api/token/'
    payload = {
        'email': os.getenv('TG_BOT_SYSTEM_USER_EMAIL'),
        'password': os.getenv('TG_BOT_SYSTEM_USER_PASSWORD'),
    }

    response = requests.post(request_url, json=payload)

    if response.status_code == 200:
        data = response.json()
        return data.get('access')
    else:
        raise Exception(f'Ошибка получения токена: {response.status_code} {response.text}')
    

def link_tg_account(link_data):
    token = get_bot_access_token()

    request_url = f'{BASE_DOMAIN}/api/telegram/link-telegram/'
    headers = {
        'Authorization': f'Bearer {token}'
    }

    response = requests.post(request_url, json=link_data, headers=headers)
    return response

