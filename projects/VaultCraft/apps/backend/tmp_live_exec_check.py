import os, json
from fastapi.testclient import TestClient
from app.main import app

# Ensure live + sdk for this check (env already loaded via pydantic, but TestClient starts app anew)
os.environ.setdefault('ENABLE_LIVE_EXEC','1')
os.environ.setdefault('ENABLE_HYPER_SDK','1')

c = TestClient(app)
s = c.get('/api/v1/status').json()
print('STATUS', json.dumps(s))

# Place a very small order to validate exec path; vault id is logical tag
r = c.post('/api/v1/exec/open', params={'vault':'_global','symbol':'ETH','size':0.001,'side':'buy','leverage':5})
print('OPEN', r.status_code, json.dumps(r.json()))

ev = c.get('/api/v1/events/_global').json()
print('EVENTS', len(ev.get('events', [])))
print('TAIL', json.dumps(ev.get('events', [])[-3:]))

