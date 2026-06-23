"""TASKEZY CRM iteration-3 backend tests:
- Agents CRUD (POST/PATCH/DELETE, 404)
- Campaigns CRUD (POST/PATCH/DELETE, derived metrics)
- Profile PATCH /api/auth/me
- Change password
- 2FA setup/enable/disable/status (TOTP via pyotp)
- AI insights server-side cache (10 min) -- 2nd call should be much faster
- /api/register-push route exists & is auth-gated (placeholder key -> 502)
"""
import os
import time
import pytest
import requests
import pyotp

BASE_URL = (
    os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or "https://taskezy-crm-admin.preview.emergentagent.com"
).rstrip("/")
ADMIN_EMAIL = "admin@taskezy.com"
ADMIN_PASSWORD = "Admin@12345"


@pytest.fixture(scope="session")
def auth():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


# ---- Agents CRUD ----
class TestAgentsCRUD:
    created_id: str | None = None

    def test_create_agent(self, auth):
        payload = {
            "name": "TEST_Iter3 Agent",
            "email": "test_iter3_agent@taskezy.com",
            "phone": "+91 9000000031",
            "city": "Pune",
            "rating": 4.7,
        }
        r = requests.post(f"{BASE_URL}/api/agents", headers=auth, json=payload, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["id"]
        assert body["name"] == payload["name"]
        assert body["email"] == payload["email"]
        assert body["city"] == "Pune"
        assert "avatar" in body
        TestAgentsCRUD.created_id = body["id"]

    def test_update_agent(self, auth):
        aid = TestAgentsCRUD.created_id
        assert aid, "Run test_create_agent first"
        r = requests.patch(
            f"{BASE_URL}/api/agents/{aid}",
            headers=auth,
            json={"city": "Bengaluru", "rating": 4.9},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["city"] == "Bengaluru"
        assert body["rating"] == 4.9
        # verify via list
        lst = requests.get(f"{BASE_URL}/api/agents", headers=auth, timeout=30).json()
        match = next((a for a in lst if a["id"] == aid), None)
        assert match and match["city"] == "Bengaluru"

    def test_update_agent_404(self, auth):
        r = requests.patch(
            f"{BASE_URL}/api/agents/does-not-exist",
            headers=auth,
            json={"city": "X"},
            timeout=30,
        )
        assert r.status_code == 404

    def test_delete_agent(self, auth):
        aid = TestAgentsCRUD.created_id
        assert aid
        r = requests.delete(f"{BASE_URL}/api/agents/{aid}", headers=auth, timeout=30)
        assert r.status_code == 200
        # Verify deletion: agent no longer in list
        lst = requests.get(f"{BASE_URL}/api/agents", headers=auth, timeout=30).json()
        assert not any(a["id"] == aid for a in lst)

    def test_delete_agent_404(self, auth):
        r = requests.delete(f"{BASE_URL}/api/agents/does-not-exist", headers=auth, timeout=30)
        assert r.status_code == 404


# ---- Campaigns CRUD (iteration-3 PATCH/DELETE) ----
class TestCampaignsCRUDIter3:
    created_id: str | None = None

    def test_create(self, auth):
        payload = {
            "name": "TEST_Iter3 Campaign",
            "channel": "Meta",
            "spend": 50000,
            "leads": 100,
            "bookings": 2,
        }
        r = requests.post(f"{BASE_URL}/api/campaigns", headers=auth, json=payload, timeout=30)
        assert r.status_code == 200, r.text
        c = r.json()
        assert c["cpl"] == 500.0
        assert c["roas"] > 0
        TestCampaignsCRUDIter3.created_id = c["id"]

    def test_patch_recomputes_metrics(self, auth):
        cid = TestCampaignsCRUDIter3.created_id
        assert cid
        # double spend -> cpl doubles; bookings increase -> roas grows
        r = requests.patch(
            f"{BASE_URL}/api/campaigns/{cid}",
            headers=auth,
            json={"spend": 100000, "bookings": 10},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        c = r.json()
        # cpl = 100000 / 100 = 1000
        assert c["cpl"] == 1000.0
        # revenue = 10 * 80 * 100000 = 80_000_000 ; roas = 800
        assert c["roas"] == 800.0
        assert c["spend"] == 100000
        assert c["bookings"] == 10

    def test_patch_404(self, auth):
        r = requests.patch(
            f"{BASE_URL}/api/campaigns/nope",
            headers=auth,
            json={"spend": 1},
            timeout=30,
        )
        assert r.status_code == 404

    def test_delete(self, auth):
        cid = TestCampaignsCRUDIter3.created_id
        assert cid
        r = requests.delete(f"{BASE_URL}/api/campaigns/{cid}", headers=auth, timeout=30)
        assert r.status_code == 200
        g = requests.get(f"{BASE_URL}/api/campaigns/{cid}", headers=auth, timeout=30)
        assert g.status_code == 404

    def test_delete_404(self, auth):
        r = requests.delete(f"{BASE_URL}/api/campaigns/nope", headers=auth, timeout=30)
        assert r.status_code == 404


# ---- Profile PATCH /api/auth/me ----
class TestProfileUpdate:
    original_name: str | None = None

    def test_patch_me_excludes_password_hash(self, auth):
        me = requests.get(f"{BASE_URL}/api/auth/me", headers=auth, timeout=30).json()
        TestProfileUpdate.original_name = me.get("name")
        new_name = "TEST_Iter3 Admin"
        r = requests.patch(
            f"{BASE_URL}/api/auth/me",
            headers=auth,
            json={"name": new_name, "avatar": "https://example.com/a.png"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "password_hash" not in body
        assert body["name"] == new_name
        assert body["avatar"] == "https://example.com/a.png"
        # verify via GET /me
        me2 = requests.get(f"{BASE_URL}/api/auth/me", headers=auth, timeout=30).json()
        assert me2["name"] == new_name
        assert "password_hash" not in me2

    def test_restore_profile(self, auth):
        # restore original name
        if TestProfileUpdate.original_name:
            r = requests.patch(
                f"{BASE_URL}/api/auth/me",
                headers=auth,
                json={"name": TestProfileUpdate.original_name},
                timeout=30,
            )
            assert r.status_code == 200


# ---- Change password ----
class TestChangePassword:
    def test_wrong_current_password(self, auth):
        r = requests.post(
            f"{BASE_URL}/api/auth/change-password",
            headers=auth,
            json={"current_password": "wrongpass", "new_password": "NewPass@123"},
            timeout=30,
        )
        assert r.status_code == 400

    def test_short_new_password(self, auth):
        r = requests.post(
            f"{BASE_URL}/api/auth/change-password",
            headers=auth,
            json={"current_password": ADMIN_PASSWORD, "new_password": "short"},
            timeout=30,
        )
        assert r.status_code == 400

    def test_success_then_revert(self, auth):
        new_pw = "NewAdmin@9876"
        r = requests.post(
            f"{BASE_URL}/api/auth/change-password",
            headers=auth,
            json={"current_password": ADMIN_PASSWORD, "new_password": new_pw},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        # login with new
        l = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": new_pw},
            timeout=30,
        )
        assert l.status_code == 200
        new_token = l.json()["access_token"]
        # revert
        r2 = requests.post(
            f"{BASE_URL}/api/auth/change-password",
            headers={"Authorization": f"Bearer {new_token}"},
            json={"current_password": new_pw, "new_password": ADMIN_PASSWORD},
            timeout=30,
        )
        assert r2.status_code == 200
        # confirm old works again
        l2 = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=30,
        )
        assert l2.status_code == 200


# ---- 2FA TOTP ----
class TestTwoFA:
    secret: str | None = None

    def test_status_initially_disabled(self, auth):
        r = requests.get(f"{BASE_URL}/api/auth/2fa/status", headers=auth, timeout=30)
        assert r.status_code == 200
        # Could be true if prior run left enabled, but expected false
        # Either way, the key 'enabled' must be a bool
        assert isinstance(r.json().get("enabled"), bool)

    def test_setup_returns_secret(self, auth):
        r = requests.post(f"{BASE_URL}/api/auth/2fa/setup", headers=auth, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "secret" in body and len(body["secret"]) >= 16
        assert "otp_uri" in body and body["otp_uri"].startswith("otpauth://")
        TestTwoFA.secret = body["secret"]

    def test_enable_bad_code_400(self, auth):
        r = requests.post(
            f"{BASE_URL}/api/auth/2fa/enable",
            headers=auth,
            json={"code": "000000"},
            timeout=30,
        )
        assert r.status_code == 400

    def test_enable_valid_code(self, auth):
        assert TestTwoFA.secret, "Run setup first"
        code = pyotp.TOTP(TestTwoFA.secret).now()
        r = requests.post(
            f"{BASE_URL}/api/auth/2fa/enable",
            headers=auth,
            json={"code": code},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        s = requests.get(f"{BASE_URL}/api/auth/2fa/status", headers=auth, timeout=30).json()
        assert s["enabled"] is True

    def test_disable_bad_code(self, auth):
        r = requests.post(
            f"{BASE_URL}/api/auth/2fa/disable",
            headers=auth,
            json={"code": "111111"},
            timeout=30,
        )
        assert r.status_code == 400

    def test_disable_valid_code(self, auth):
        assert TestTwoFA.secret
        code = pyotp.TOTP(TestTwoFA.secret).now()
        r = requests.post(
            f"{BASE_URL}/api/auth/2fa/disable",
            headers=auth,
            json={"code": code},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        s = requests.get(f"{BASE_URL}/api/auth/2fa/status", headers=auth, timeout=30).json()
        assert s["enabled"] is False


# ---- AI insights cache ----
class TestInsightsCache:
    def test_cache_hit_is_much_faster(self, auth):
        # First call may take 30-120s (LLM); second within 10 min must be < 1s
        t0 = time.time()
        r1 = requests.get(f"{BASE_URL}/api/dashboard/insights", headers=auth, timeout=180)
        d1 = time.time() - t0
        assert r1.status_code == 200
        payload1 = r1.json()

        t1 = time.time()
        r2 = requests.get(f"{BASE_URL}/api/dashboard/insights", headers=auth, timeout=30)
        d2 = time.time() - t1
        assert r2.status_code == 200
        payload2 = r2.json()

        # Same content if cached
        assert payload1 == payload2, "Cache returned a different payload than first call"
        # Cache hit speed-up assertion
        assert d2 < 1.0, (
            f"Expected cache hit <1s, got {d2:.2f}s (first={d1:.2f}s). "
            "Likely cause: cache_get is never called in /api/dashboard/insights"
        )


# ---- Register Push ----
class TestRegisterPush:
    def test_requires_auth(self):
        r = requests.post(
            f"{BASE_URL}/api/register-push",
            json={"user_id": "x", "platform": "android", "device_token": "tok"},
            timeout=15,
        )
        # Endpoint exists -> not 404. Auth-gated -> 401/403
        assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}"

    def test_route_exists_with_auth(self, auth):
        r = requests.post(
            f"{BASE_URL}/api/register-push",
            headers=auth,
            json={"user_id": "u-1", "platform": "android", "device_token": "tok-123"},
            timeout=15,
        )
        # 201 success OR 502 (placeholder key upstream fail) OR 500 (key missing).
        # MUST NOT be 404.
        assert r.status_code != 404, "register-push route not registered"
        assert r.status_code in (201, 500, 502), f"unexpected {r.status_code}: {r.text}"

    def test_body_validation(self, auth):
        r = requests.post(
            f"{BASE_URL}/api/register-push",
            headers=auth,
            json={"platform": "android"},  # missing user_id, device_token
            timeout=15,
        )
        assert r.status_code == 422
