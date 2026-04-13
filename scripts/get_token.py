import re, urllib.request

with open('C:/Авто/globuscar-rental/.env', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract private key - it uses \n as literal escape
match = re.search(r'GOOGLE_PRIVATE_KEY="(.*?)"(?:\n|$)', content, re.DOTALL)
raw_key = match.group(1)
# Replace literal \n with real newlines
private_key = raw_key.replace('\\n', '\n')
print('Key lines:', private_key.count('\n'))
print('Starts:', private_key[:40])

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
print('Token OK, length:', len(creds.token))

# Check existing OAuth brands/clients
r = urllib.request.urlopen(urllib.request.Request(
    'https://clientauthconfig.googleapis.com/v1/projects/georgian-cars-crm/brands',
    headers={'Authorization': 'Bearer ' + creds.token}
))
print('Brands status:', r.status)
print('Response:', r.read().decode()[:800])
