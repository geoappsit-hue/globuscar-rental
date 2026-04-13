"""
Включить Cloud Resource Manager API через Service Usage API
"""
import re, json, urllib.request, urllib.error, time

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

apis_to_enable = [
    'cloudresourcemanager.googleapis.com',
    'iamcredentials.googleapis.com',
]

project_number = '202955985531'

for api_name in apis_to_enable:
    print(f'Включаю {api_name}...')
    status, result = api('POST',
        f'https://serviceusage.googleapis.com/v1/projects/{project_number}/services/{api_name}:enable',
        {}
    )
    print(f'Status: {status}')
    if status == 200:
        print(f'✅ {api_name} включён (или уже был включён)')
    else:
        print(f'Ответ: {str(result)[:300]}')
    print()

print('Ждём 5 секунд для применения изменений...')
time.sleep(5)
print('Готово. Запусти grant_iam.py снова.')
