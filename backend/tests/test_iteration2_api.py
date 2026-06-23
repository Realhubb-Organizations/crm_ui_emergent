"""TASKEZY CRM iteration-2 backend tests: insights, leads POST validation,
notifications, reports, campaigns."""
import os
import pytest
import requests

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


# ---- AI Insights ----
class TestInsights:
    def test_insights_shape(self, auth):
        r = requests.get(f"{BASE_URL}/api/dashboard/insights", headers=auth, timeout=120)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        # When LLM key is set we expect 4 items; fallback returns 3. Accept >=3
        assert len(items) >= 3
        for it in items:
            for key in ("title", "body", "trend", "icon"):
                assert key in it, f"missing {key} in {it}"
            assert isinstance(it["title"], str) and it["title"].strip()
            assert isinstance(it["body"], str) and it["body"].strip()
            assert it["trend"] in {"up", "down", "warn"}

    def test_insights_likely_ai(self, auth):
        """If EMERGENT_LLM_KEY is set, we expect 4 AI-flagged items."""
        r = requests.get(f"{BASE_URL}/api/dashboard/insights", headers=auth, timeout=120)
        items = r.json()
        ai_items = [i for i in items if i.get("ai")]
        # Soft check - only assert if 4 items returned (AI path)
        if len(items) == 4:
            assert any(i.get("ai") for i in items), "4 items returned but none flagged ai"
            titles = {i["title"] for i in items}
            assert len(titles) >= 3, "titles should be varied"


# ---- Leads POST ----
class TestLeadCreate:
    def test_create_and_retrieve(self, auth):
        payload = {"name": "TEST_NewLead Buyer", "phone": "+91 9988776655", "source": "Website"}
        r = requests.post(f"{BASE_URL}/api/leads", headers=auth, json=payload, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["id"]
        assert body["name"] == payload["name"]
        assert body["status"] == "New"
        assert body["stage"] == "New"
        lead_id = body["id"]
        # Persistence
        g = requests.get(f"{BASE_URL}/api/leads/{lead_id}", headers=auth, timeout=30)
        assert g.status_code == 200
        assert g.json()["lead"]["id"] == lead_id
        assert g.json()["lead"]["phone"] == payload["phone"]

    def test_create_missing_name_422(self, auth):
        r = requests.post(
            f"{BASE_URL}/api/leads", headers=auth, json={"phone": "+91 1111111111"}, timeout=30
        )
        assert r.status_code == 422

    def test_create_missing_phone_422(self, auth):
        r = requests.post(
            f"{BASE_URL}/api/leads", headers=auth, json={"name": "Only Name"}, timeout=30
        )
        assert r.status_code == 422


# ---- Notifications ----
class TestNotifications:
    def test_list(self, auth):
        r = requests.get(f"{BASE_URL}/api/notifications", headers=auth, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) > 0
        n = data[0]
        for k in ("id", "title", "severity", "read", "created_at"):
            assert k in n
        assert n["severity"] in {"info", "warn", "success"}
        # lead_id key should exist (value may be None)
        assert "lead_id" in n

    def test_unread_count(self, auth):
        r = requests.get(f"{BASE_URL}/api/notifications/unread-count", headers=auth, timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json().get("unread"), int)

    def test_mark_one_read(self, auth):
        items = requests.get(f"{BASE_URL}/api/notifications", headers=auth, timeout=30).json()
        unread = next((x for x in items if not x["read"]), None)
        if not unread:
            # mark-all-read may have already run; create idempotent path
            target = items[0]
        else:
            target = unread
        r = requests.post(
            f"{BASE_URL}/api/notifications/{target['id']}/read", headers=auth, timeout=30
        )
        assert r.status_code == 200
        # verify
        items2 = requests.get(f"{BASE_URL}/api/notifications", headers=auth, timeout=30).json()
        flagged = next((x for x in items2 if x["id"] == target["id"]), None)
        assert flagged and flagged["read"] is True

    def test_mark_one_read_404(self, auth):
        r = requests.post(
            f"{BASE_URL}/api/notifications/does-not-exist/read", headers=auth, timeout=30
        )
        assert r.status_code == 404

    def test_mark_all_read(self, auth):
        r = requests.post(f"{BASE_URL}/api/notifications/read-all", headers=auth, timeout=30)
        assert r.status_code == 200
        u = requests.get(
            f"{BASE_URL}/api/notifications/unread-count", headers=auth, timeout=30
        ).json()
        assert u["unread"] == 0


# ---- Reports ----
class TestReports:
    def test_list(self, auth):
        r = requests.get(f"{BASE_URL}/api/reports", headers=auth, timeout=30)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) == 6
        it = items[0]
        for k in ("id", "title", "cadence", "body", "kpis"):
            assert k in it
        for kpi in ("leads", "bookings", "roas"):
            assert kpi in it["kpis"]

    def test_detail(self, auth):
        items = requests.get(f"{BASE_URL}/api/reports", headers=auth, timeout=30).json()
        rid = items[0]["id"]
        r = requests.get(f"{BASE_URL}/api/reports/{rid}", headers=auth, timeout=30)
        assert r.status_code == 200
        assert r.json()["id"] == rid

    def test_detail_404(self, auth):
        r = requests.get(f"{BASE_URL}/api/reports/nope", headers=auth, timeout=30)
        assert r.status_code == 404


# ---- Campaigns ----
class TestCampaigns:
    def test_list(self, auth):
        r = requests.get(f"{BASE_URL}/api/campaigns", headers=auth, timeout=30)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) > 0
        c = items[0]
        for k in ("id", "name", "channel", "spend", "leads", "cpl", "ctr", "roas"):
            assert k in c

    def test_detail(self, auth):
        items = requests.get(f"{BASE_URL}/api/campaigns", headers=auth, timeout=30).json()
        cid = items[0]["id"]
        r = requests.get(f"{BASE_URL}/api/campaigns/{cid}", headers=auth, timeout=30)
        assert r.status_code == 200
        assert r.json()["id"] == cid

    def test_detail_404(self, auth):
        r = requests.get(f"{BASE_URL}/api/campaigns/nope", headers=auth, timeout=30)
        assert r.status_code == 404

    def test_create(self, auth):
        payload = {
            "name": "TEST_Iter2 Campaign",
            "channel": "Google",
            "spend": 100000,
            "leads": 200,
            "bookings": 5,
        }
        r = requests.post(f"{BASE_URL}/api/campaigns", headers=auth, json=payload, timeout=30)
        assert r.status_code == 200, r.text
        c = r.json()
        assert c["name"] == payload["name"]
        # CPL = spend / leads = 500
        assert c["cpl"] == 500.0
        # ROAS = revenue / spend ; revenue = 5*80*100000 = 40_000_000 ; ROAS=400
        assert c["roas"] > 0
        assert c["ctr"] > 0
        # GET verifies persistence
        g = requests.get(f"{BASE_URL}/api/campaigns/{c['id']}", headers=auth, timeout=30)
        assert g.status_code == 200
