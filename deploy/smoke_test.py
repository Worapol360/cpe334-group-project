"""Public deployment checks. Credentials/tokens are never printed.

WHAT THIS SCRIPT DOES
    Called by .github/workflows/deploy.yml after a deployment:
        python3 deploy/smoke_test.py SERVICE_URL [EXPECTED_VERSION]
    It checks the live service and exits non-zero (failing the workflow) if any
    check fails. Each public check is retried up to 5 times, 3 seconds apart, to
    tolerate Cloud Run cold starts.

    Checks (in order)
      1. GET /api/health      -> {"status": "ok", "version": "<expected_version>"} (asserts matching version when given)
      2. GET /api/ready       -> {"db": "connected"}   (proves the DB works)
      3. GET /                -> HTML page (the built React app is served)
      4. OPTIONAL login test  -> login, /api/auth/me, logout. Runs only if BOTH
         env vars SMOKE_EMAIL and SMOKE_PASSWORD are set (set both or neither).
         Session is managed via HTTP-only cookie (sid); login returns user JSON;
         logout returns 204. The session is always logged out, even if a check fails.

IMPORTANT
    Uses only the Python standard library (no pip install needed).
    Offline unit tests: deploy/tests/test_smoke.py

REFERENCES
    - urllib.request : https://docs.python.org/3/library/urllib.request.html
    - http.cookiejar : https://docs.python.org/3/library/http.cookiejar.html
    - unittest.mock  : https://docs.python.org/3/library/unittest.mock.html
"""
import http.cookiejar
import json
import os
import sys
import time
import urllib.error
import urllib.request


# --- HTTP helper with CookieJar for session support ---------------------------
# Returns the response body (bytes). Raises on HTTP errors / timeouts.
cookie_jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))


def request(base, path, data=None):
    headers = {}
    payload = None
    if data is not None:
        headers['Content-Type'] = 'application/json'
        payload = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(base + path, headers=headers, data=payload)
    with opener.open(req, timeout=30) as response:
        return response.read()


def check(base, expected_version=None):
    def health_ok(b):
        data = json.loads(b)
        if data.get('status') != 'ok':
            return False
        ver = data.get('version')
        if expected_version:
            return ver == expected_version
        return bool(ver)

    # --- Public checks for FeedbackLoop ---------------------------------------
    for path, predicate in (
        ('/api/health', health_ok),
        ('/api/ready', lambda b: json.loads(b).get('db') == 'connected'),
        ('/', lambda b: b'<html' in b.lower()),
    ):
        # Retry: a cold Cloud Run instance may need a few seconds to start.
        for attempt in range(5):
            try:
                if not predicate(request(base, path)):
                    raise ValueError('Unexpected response')
                break
            except (urllib.error.URLError, TimeoutError, ValueError):
                if attempt == 4:
                    raise RuntimeError('Smoke check failed: ' + path) from None
                time.sleep(3)
        if path == '/api/health' and expected_version:
            print(f'PASS {path} (version: {expected_version})')
        else:
            print('PASS ' + path)

    # --- Optional login check (only when both credentials are provided) -------
    email, password = os.getenv('SMOKE_EMAIL'), os.getenv('SMOKE_PASSWORD')
    if bool(email) != bool(password):
        raise RuntimeError('Set both SMOKE_EMAIL and SMOKE_PASSWORD, or neither.')
    if not email:
        print('SKIP login: optional smoke credentials not configured')
        return

    logged_in = False
    try:
        login_res = json.loads(request(base, '/api/auth/login', {'email': email, 'password': password}))
        if 'user' not in login_res:
            raise ValueError('Login response missing user')
        logged_in = True

        me_res = json.loads(request(base, '/api/auth/me'))
        if 'user' not in me_res:
            raise ValueError('/api/auth/me response missing user')
        print('PASS login and authenticated /api/auth/me')
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError):
        raise RuntimeError('Login smoke check failed') from None
    finally:
        # Always end the session, even when a check above failed.
        if logged_in:
            request(base, '/api/auth/logout', data={})
            print('PASS logout')


# --- Entry point ----------------------------------------------------------------
if __name__ == '__main__':
    if len(sys.argv) not in (2, 3):
        sys.exit('Usage: python3 deploy/smoke_test.py SERVICE_URL [EXPECTED_VERSION]')
    expected = sys.argv[2] if len(sys.argv) == 3 else os.getenv('EXPECTED_VERSION') or os.getenv('IMAGE_TAG')
    check(sys.argv[1].rstrip('/'), expected_version=expected)
