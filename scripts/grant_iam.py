"""
Дать аккаунту khmiadashviliniko@gmail.com роль Editor в проекте georgian-cars-crm
чтобы он мог создавать OAuth-клиенты через Cloud Console.
"""
import re, json, urllib.request, urllib.error

with open('C:/Авто/globuscar-rental/.env', 'r', encoding='utf-8') as f:
    content = f.read()

match = re.search(r'GOOGLE_PRIVATE_KEY="(.*?)"(?:\n|$)', content, re.DOTALL)
private_key = match.group(1).replace('\\n', '\n')

from google.oauth2 import service_account
import google.auth.transport.requests

creds = service_account.Credentials.from_service_account_info({
    'type': 'service_account',
    'project_id': 'georgian-cars-crm',
    'private_key': private_key,
    'client_email': 'globuscar-rental@georgian-cars-crm.iam.gserviceaccount.com',
    'token_uri': 'https://oauth2.googleapis.com/token',
}, scopes=['https://www.googleapis.com/auth/cloud-platform'])

creds.refresh(google.auth.transport.requests.Request())
token = creds.token
print('Token OK')

headers = {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
}

def api(method, url, body=None):
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        r = urllib.request.urlopen(req)
        return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

# 1. Получить текущую IAM политику проекта
print('\n1. Получаю текущую IAM политику...')
status, policy = api('POST',
    'https://cloudresourcemanager.googleapis.com/v1/projects/georgian-cars-crm:getIamPolicy',
    {}
)
print(f'Status: {status}')
if status != 200:
    print('Ошибка:', policy)
    exit(1)

print(f'Текущих binding-ов: {len(policy.get("bindings", []))}')

# 2. Добавить роль editor для khmiadashviliniko@gmail.com
TARGET_EMAIL = 'user:khmiadashviliniko@gmail.com'
TARGET_ROLE = 'roles/editor'

bindings = policy.get('bindings', [])
# Найти существующий binding для этой роли
role_binding = next((b for b in bindings if b['role'] == TARGET_ROLE), None)
if role_binding:
    if TARGET_EMAIL not in role_binding['members']:
        role_binding['members'].append(TARGET_EMAIL)
        print(f'Добавлен {TARGET_EMAIL} к существующей роли {TARGET_ROLE}')
    else:
        print(f'{TARGET_EMAIL} уже имеет роль {TARGET_ROLE}')
else:
    bindings.append({'role': TARGET_ROLE, 'members': [TARGET_EMAIL]})
    print(f'Создан новый binding: {TARGET_ROLE} → {TARGET_EMAIL}')

policy['bindings'] = bindings

# 3. Установить обновлённую политику
print('\n2. Устанавливаю обновлённую IAM политику...')
status2, result = api('POST',
    'https://cloudresourcemanager.googleapis.com/v1/projects/georgian-cars-crm:setIamPolicy',
    {'policy': policy}
)
print(f'Status: {status2}')
if status2 == 200:
    print('✅ Готово! khmiadashviliniko@gmail.com теперь Editor в проекте georgian-cars-crm')
    print('Обнови страницу Cloud Console в браузере.')
else:
    print('❌ Ошибка:', result)
