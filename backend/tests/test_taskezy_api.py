"""TASKEZY CRM backend API integration tests."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://taskezy-crm-admin.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@taskezy.com"
ADMIN_PASSWORD = "Admin@12345"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ------- Auth -------
class TestAuth:
    def test_login_success(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data and data["access_token"]
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"

    def test_login_bad_password(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=30)
        assert r.status_code == 401

    def test_me_with_token(self, auth):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=auth, timeout=30)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_me_without_token(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", timeout=30)
        assert r.status_code == 401

    def test_me_invalid_token(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": "Bearer invalid.token.here"}, timeout=30)
        assert r.status_code == 401


# ------- Dashboard -------
class TestDashboard:
    def test_summary(self, auth):
        r = requests.get(f"{BASE_URL}/api/dashboard/summary", headers=auth, timeout=30)
        assert r.status_code == 200
        data = r.json()
        for key in ["kpis", "attention", "funnel", "sources", "weekly_leads"]:
            assert key in data
        assert "total_leads" in data["kpis"]
        assert isinstance(data["funnel"], list) and len(data["funnel"]) == 6
        assert isinstance(data["weekly_leads"], list) and len(data["weekly_leads"]) == 7

    def test_top_properties(self, auth):
        r = requests.get(f"{BASE_URL}/api/dashboard/top-properties", headers=auth, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        if data:
            assert "conversion_pct" in data[0]

    def test_top_agents(self, auth):
        r = requests.get(f"{BASE_URL}/api/dashboard/top-agents", headers=auth, timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_activities(self, auth):
        r = requests.get(f"{BASE_URL}/api/dashboard/activities", headers=auth, timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_followups(self, auth):
        r = requests.get(f"{BASE_URL}/api/dashboard/followups", headers=auth, timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_insights(self, auth):
        r = requests.get(f"{BASE_URL}/api/dashboard/insights", headers=auth, timeout=30)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) >= 3


# ------- Leads -------
class TestLeads:
    def test_list_leads(self, auth):
        r = requests.get(f"{BASE_URL}/api/leads", headers=auth, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert "id" in data[0] and "name" in data[0]

    def test_list_with_filters(self, auth):
        r = requests.get(f"{BASE_URL}/api/leads", headers=auth, params={"status": "New"}, timeout=30)
        assert r.status_code == 200
        for x in r.json():
            assert x["status"] == "New"

    def test_list_with_q(self, auth):
        r = requests.get(f"{BASE_URL}/api/leads", headers=auth, params={"q": "a"}, timeout=30)
        assert r.status_code == 200

    def test_list_hot_filter(self, auth):
        r = requests.get(f"{BASE_URL}/api/leads", headers=auth, params={"is_hot": "true"}, timeout=30)
        assert r.status_code == 200
        for x in r.json():
            assert x["is_hot"] is True

    def test_pipeline(self, auth):
        r = requests.get(f"{BASE_URL}/api/leads/pipeline", headers=auth, timeout=30)
        assert r.status_code == 200
        data = r.json()
        for stage in ["New", "Contacted", "Qualified", "Site Visit", "Negotiation", "Booked"]:
            assert stage in data
            assert isinstance(data[stage], list)

    def test_lead_detail(self, auth):
        leads = requests.get(f"{BASE_URL}/api/leads", headers=auth, timeout=30).json()
        lead_id = leads[0]["id"]
        r = requests.get(f"{BASE_URL}/api/leads/{lead_id}", headers=auth, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "lead" in data and "timeline" in data
        assert data["lead"]["id"] == lead_id

    def test_lead_detail_404(self, auth):
        r = requests.get(f"{BASE_URL}/api/leads/does-not-exist", headers=auth, timeout=30)
        assert r.status_code == 404

    def test_patch_lead_status_hot(self, auth):
        leads = requests.get(f"{BASE_URL}/api/leads", headers=auth, timeout=30).json()
        lead_id = leads[0]["id"]
        r = requests.patch(
            f"{BASE_URL}/api/leads/{lead_id}",
            headers=auth,
            json={"status": "Qualified", "is_hot": True},
            timeout=30,
        )
        assert r.status_code == 200
        updated = r.json()
        assert updated["status"] == "Qualified"
        assert updated["is_hot"] is True
        # Verify persistence via GET
        g = requests.get(f"{BASE_URL}/api/leads/{lead_id}", headers=auth, timeout=30)
        assert g.json()["lead"]["status"] == "Qualified"
        assert g.json()["lead"]["is_hot"] is True


# ------- Properties -------
class TestProperties:
    def test_list_properties(self, auth):
        r = requests.get(f"{BASE_URL}/api/properties", headers=auth, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) > 0
        assert "conversion_pct" in data[0]

    def test_property_detail(self, auth):
        props = requests.get(f"{BASE_URL}/api/properties", headers=auth, timeout=30).json()
        pid = props[0]["id"]
        r = requests.get(f"{BASE_URL}/api/properties/{pid}", headers=auth, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "property" in data and "leads" in data
        assert data["property"]["id"] == pid

    def test_property_filter_city(self, auth):
        r = requests.get(f"{BASE_URL}/api/properties", headers=auth, params={"city": "Mumbai"}, timeout=30)
        assert r.status_code == 200
        for p in r.json():
            assert p["city"] == "Mumbai"


# ------- Analytics -------
class TestAnalytics:
    def test_overview(self, auth):
        r = requests.get(f"{BASE_URL}/api/analytics/overview", headers=auth, params={"days": 30}, timeout=60)
        assert r.status_code == 200
        data = r.json()
        assert "kpis" in data and "series" in data and "sources" in data
        for k in ["cpl", "ctr", "roas", "spend", "revenue", "bookings", "site_visits", "total_leads"]:
            assert k in data["kpis"]
        assert len(data["series"]) == 30

    def test_campaigns(self, auth):
        r = requests.get(f"{BASE_URL}/api/analytics/campaigns", headers=auth, timeout=30)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) > 0
        assert "roas" in items[0]


# ------- Agents -------
class TestAgents:
    def test_list_agents(self, auth):
        r = requests.get(f"{BASE_URL}/api/agents", headers=auth, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) == 8
