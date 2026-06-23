"""TASKEZY CRM Admin – FastAPI backend.

Provides JWT-based auth and CRM endpoints (leads, properties, agents, analytics).
All routes prefixed with /api so the K8s ingress can route them correctly.
"""
from __future__ import annotations

import logging
import os
import random
import time
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

# ------------------------------ Config ---------------------------------------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRES_MIN = int(os.environ.get("JWT_EXPIRES_MIN", "1440"))
ADMIN_EMAIL = os.environ["ADMIN_EMAIL"].lower().strip()
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]
ADMIN_NAME = os.environ.get("ADMIN_NAME", "Admin")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("taskezy")

# ------------------------------ DB -------------------------------------------
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

users_col = db["users"]
leads_col = db["leads"]
properties_col = db["properties"]
agents_col = db["agents"]
activities_col = db["activities"]
campaigns_col = db["campaigns"]
notifications_col = db["notifications"]
reports_col = db["reports"]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
EMERGENT_PUSH_KEY = os.environ.get("EMERGENT_PUSH_KEY", "placeholder")
EMERGENT_PUSH_BASE_URL = "https://integrations.emergentagent.com"

# Simple in-process TTL cache for expensive LLM responses.
_cache: dict[str, tuple[float, Any]] = {}

def cache_get(key: str) -> Any | None:
    item = _cache.get(key)
    if not item:
        return None
    expires, val = item
    if expires < time.time():
        _cache.pop(key, None)
        return None
    return val


def cache_set(key: str, val: Any, ttl_seconds: int) -> None:
    _cache[key] = (time.time() + ttl_seconds, val)


# ------------------------------ App ------------------------------------------
app = FastAPI(title="TASKEZY CRM Admin API")
api = APIRouter(prefix="/api")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


# ------------------------------ Helpers --------------------------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


def hash_pw(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_pw(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(payload: dict[str, Any]) -> str:
    data = payload.copy()
    data["exp"] = now_utc() + timedelta(minutes=JWT_EXPIRES_MIN)
    return jwt.encode(data, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def current_user(token: Optional[str] = Depends(oauth2_scheme)) -> dict:
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired") from None
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token") from None
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = await users_col.find_one({"email": email}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ------------------------------ Models ---------------------------------------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str
    avatar: Optional[str] = None


class LeadCreate(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None
    source: str = "Website"
    interest: Optional[str] = None
    budget: Optional[float] = None
    property_id: Optional[str] = None
    notes: Optional[str] = None


class LeadUpdate(BaseModel):
    status: Optional[str] = None
    stage: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    is_hot: Optional[bool] = None
    next_followup_at: Optional[str] = None


# ------------------------------ Seed Data ------------------------------------
LEAD_STATUSES = ["New", "Contacted", "Qualified", "Site Visit", "Negotiation", "Booked", "Lost"]
LEAD_STAGES = ["New", "Contacted", "Qualified", "Site Visit", "Negotiation", "Booked"]
LEAD_SOURCES = ["Website", "Facebook Ads", "Google Ads", "Instagram", "Referral", "Walk-in", "Magic Bricks", "99acres"]
CITIES = ["Mumbai", "Bengaluru", "Pune", "Hyderabad", "Delhi NCR", "Chennai"]
BHK_TYPES = ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "Villa", "Penthouse"]

INDIAN_FIRST = ["Aarav", "Vihaan", "Ananya", "Diya", "Ishaan", "Reyansh", "Kabir", "Saanvi", "Aanya", "Aditya",
                "Arjun", "Riya", "Myra", "Aarohi", "Kiaan", "Vivaan", "Advait", "Ira", "Navya", "Rudra"]
INDIAN_LAST = ["Sharma", "Verma", "Patel", "Reddy", "Iyer", "Mehta", "Kapoor", "Singh", "Nair", "Rao",
               "Joshi", "Banerjee", "Chopra", "Malhotra", "Khanna", "Gupta", "Bose", "Pillai"]

PROPERTY_IMAGES = [
    "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&auto=format&fit=crop&q=70",
    "https://images.unsplash.com/photo-1628744448840-55bdb2497bd4?w=800&auto=format&fit=crop&q=70",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=70",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=70",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=70",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=70",
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&auto=format&fit=crop&q=70",
    "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&auto=format&fit=crop&q=70",
]

AVATAR_URLS = [
    "https://images.unsplash.com/photo-1600878459138-e1123b37cb30?w=200&q=70",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=70",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=70",
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=70",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=70",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=70",
]


def rand_name() -> str:
    return f"{random.choice(INDIAN_FIRST)} {random.choice(INDIAN_LAST)}"


def rand_phone() -> str:
    return "+91 " + "".join(str(random.randint(0, 9)) for _ in range(10))


async def seed_admin() -> None:
    existing = await users_col.find_one({"email": ADMIN_EMAIL})
    if existing:
        return
    doc = {
        "id": str(uuid.uuid4()),
        "email": ADMIN_EMAIL,
        "password_hash": hash_pw(ADMIN_PASSWORD),
        "name": ADMIN_NAME,
        "role": "admin",
        "avatar": AVATAR_URLS[0],
        "created_at": iso(now_utc()),
    }
    await users_col.insert_one(doc)
    log.info("Seeded admin user: %s", ADMIN_EMAIL)


async def seed_agents() -> list[dict]:
    if await agents_col.count_documents({}) > 0:
        return await agents_col.find({}, {"_id": 0}).to_list(100)
    agents = []
    for i in range(8):
        agents.append({
            "id": str(uuid.uuid4()),
            "name": rand_name(),
            "email": f"agent{i+1}@taskezy.com",
            "phone": rand_phone(),
            "avatar": AVATAR_URLS[i % len(AVATAR_URLS)],
            "role": "agent",
            "city": random.choice(CITIES),
            "joined_at": iso(now_utc() - timedelta(days=random.randint(60, 800))),
            "rating": round(random.uniform(3.8, 4.9), 2),
        })
    await agents_col.insert_many([a.copy() for a in agents])
    return agents


async def seed_properties() -> list[dict]:
    if await properties_col.count_documents({}) > 0:
        return await properties_col.find({}, {"_id": 0}).to_list(100)
    project_names = [
        "Skyline Heights", "Marina Residences", "Emerald Greens", "Imperial Towers",
        "Royal Palms", "Lakeview Crest", "Pinnacle Vista", "Crescent Bay",
        "Aurora Park", "Cedar Grove", "Westwind Enclave", "Ocean Pearl",
    ]
    builders = ["Prestige", "Sobha", "Lodha", "Godrej", "DLF", "Brigade", "Hiranandani", "Oberoi"]
    items: list[dict] = []
    for i, name in enumerate(project_names):
        city = random.choice(CITIES)
        price_min = random.randint(60, 250)  # Lakhs
        price_max = price_min + random.randint(20, 200)
        items.append({
            "id": str(uuid.uuid4()),
            "name": name,
            "builder": random.choice(builders),
            "city": city,
            "location": f"{random.choice(['Whitefield', 'Andheri', 'Bandra', 'Gachibowli', 'Koregaon Park', 'Sector 62', 'OMR'])}, {city}",
            "bhk": random.sample(BHK_TYPES, k=random.randint(2, 3)),
            "price_min": price_min,  # in lakhs
            "price_max": price_max,
            "area_min": random.randint(650, 1200),
            "area_max": random.randint(1500, 3500),
            "image": PROPERTY_IMAGES[i % len(PROPERTY_IMAGES)],
            "rera": f"RERA/{city[:3].upper()}/{1000+i}",
            "status": random.choice(["Under Construction", "Ready to Move", "New Launch"]),
            "amenities": random.sample(
                ["Swimming Pool", "Gym", "Clubhouse", "Garden", "24x7 Security", "Power Backup", "Kids Play Area", "Spa"],
                k=5,
            ),
            "leads_count": random.randint(20, 220),
            "site_visits": random.randint(8, 80),
            "bookings": random.randint(1, 25),
            "created_at": iso(now_utc() - timedelta(days=random.randint(30, 600))),
        })
    await properties_col.insert_many([p.copy() for p in items])
    return items


async def seed_leads(agents: list[dict], props: list[dict]) -> None:
    if await leads_col.count_documents({}) > 0:
        return
    leads: list[dict] = []
    for _ in range(120):
        created = now_utc() - timedelta(days=random.randint(0, 60), hours=random.randint(0, 23))
        status_choice = random.choices(
            LEAD_STATUSES,
            weights=[28, 22, 18, 12, 8, 7, 5],
            k=1,
        )[0]
        agent = random.choice(agents)
        prop = random.choice(props)
        is_hot = random.random() < 0.18
        leads.append({
            "id": str(uuid.uuid4()),
            "name": rand_name(),
            "phone": rand_phone(),
            "email": f"lead{random.randint(1000,9999)}@gmail.com",
            "source": random.choice(LEAD_SOURCES),
            "status": status_choice,
            "stage": status_choice if status_choice in LEAD_STAGES else "Lost",
            "interest": random.choice(BHK_TYPES),
            "budget": random.choice([50, 75, 100, 150, 200, 250, 350, 500]),
            "city": prop["city"],
            "property_id": prop["id"],
            "property_name": prop["name"],
            "assigned_to": agent["id"],
            "assigned_name": agent["name"],
            "assigned_avatar": agent["avatar"],
            "is_hot": is_hot,
            "score": random.randint(20, 99),
            "notes": random.choice([
                "Asked for floor plan",
                "Wants weekend site visit",
                "Comparing with competitor",
                "Loan pre-approved",
                "Negotiating price",
                "",
            ]),
            "next_followup_at": iso(now_utc() + timedelta(days=random.randint(-1, 5))),
            "created_at": iso(created),
            "updated_at": iso(created + timedelta(hours=random.randint(1, 48))),
        })
    await leads_col.insert_many([doc.copy() for doc in leads])


async def seed_activities() -> None:
    if await activities_col.count_documents({}) > 0:
        return
    leads = await leads_col.find({}, {"_id": 0}).to_list(60)
    if not leads:
        return
    actions = [
        ("call", "Called {name}"),
        ("whatsapp", "WhatsApp sent to {name}"),
        ("email", "Email sent to {name}"),
        ("site_visit", "Site visit scheduled with {name}"),
        ("status", "{name} moved to Qualified"),
        ("note", "Note added on {name}"),
    ]
    acts = []
    for _ in range(40):
        lead = random.choice(leads)
        kind, tmpl = random.choice(actions)
        acts.append({
            "id": str(uuid.uuid4()),
            "type": kind,
            "title": tmpl.format(name=lead["name"]),
            "lead_id": lead["id"],
            "lead_name": lead["name"],
            "agent_name": lead.get("assigned_name", "—"),
            "agent_avatar": lead.get("assigned_avatar"),
            "created_at": iso(now_utc() - timedelta(hours=random.randint(0, 96))),
        })
    await activities_col.insert_many(acts)


async def seed_campaigns() -> None:
    if await campaigns_col.count_documents({}) > 0:
        return
    items = []
    names = ["Festive Push - Mumbai", "Q1 Brand Awareness", "Bengaluru Luxury", "Pune Mid-Segment",
             "Hyderabad Retargeting", "Delhi NCR Premium"]
    channels = ["Facebook", "Google", "Instagram", "YouTube"]
    for n in names:
        spend = random.randint(50000, 500000)
        leads = random.randint(80, 900)
        clicks = leads * random.randint(8, 22)
        impressions = clicks * random.randint(12, 28)
        bookings = random.randint(1, 20)
        revenue = bookings * random.randint(40, 180) * 100000
        items.append({
            "id": str(uuid.uuid4()),
            "name": n,
            "channel": random.choice(channels),
            "status": random.choice(["Active", "Paused", "Completed"]),
            "spend": spend,
            "impressions": impressions,
            "clicks": clicks,
            "leads": leads,
            "bookings": bookings,
            "revenue": revenue,
            "cpl": round(spend / max(leads, 1), 2),
            "ctr": round(clicks / max(impressions, 1) * 100, 2),
            "roas": round(revenue / max(spend, 1), 2),
            "created_at": iso(now_utc() - timedelta(days=random.randint(10, 120))),
        })
    await campaigns_col.insert_many(items)


@app.on_event("startup")
async def on_startup() -> None:
    await users_col.create_index("email", unique=True)
    await seed_admin()
    agents = await seed_agents()
    props = await seed_properties()
    await seed_leads(agents, props)
    await seed_activities()
    await seed_campaigns()
    log.info("Seed complete.")


@app.on_event("shutdown")
async def on_shutdown() -> None:
    client.close()


# ------------------------------ Routes : Auth --------------------------------
@api.get("/")
async def root() -> dict:
    return {"app": "taskezy-crm-admin", "ok": True}


@api.post("/auth/login", response_model=TokenResponse)
async def login(payload: LoginRequest) -> Any:
    user = await users_col.find_one({"email": payload.email.lower().strip()})
    if not user or not verify_pw(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token({"email": user["email"], "role": user["role"], "sub": user["id"]})
    public = {k: v for k, v in user.items() if k not in {"_id", "password_hash"}}
    return {"access_token": token, "token_type": "bearer", "user": public}


@api.get("/auth/me")
async def me(user: dict = Depends(current_user)) -> dict:
    return user


# ------------------------------ Routes : Dashboard ---------------------------
@api.get("/dashboard/summary")
async def dashboard_summary(user: dict = Depends(current_user)) -> dict:
    total = await leads_col.count_documents({})
    new = await leads_col.count_documents({"status": "New"})
    qualified = await leads_col.count_documents({"status": "Qualified"})
    site_visits = await leads_col.count_documents({"status": "Site Visit"})
    booked = await leads_col.count_documents({"status": "Booked"})
    hot = await leads_col.count_documents({"is_hot": True})
    lost = await leads_col.count_documents({"status": "Lost"})
    conversion = round((booked / total) * 100, 1) if total else 0.0

    # Sales funnel counts in stage order
    funnel = []
    for stage in LEAD_STAGES:
        c = await leads_col.count_documents({"status": stage})
        funnel.append({"stage": stage, "count": c})

    # Lead source breakdown
    sources: dict[str, int] = {}
    async for doc in leads_col.find({}, {"_id": 0, "source": 1}):
        sources[doc["source"]] = sources.get(doc["source"], 0) + 1
    source_list = [{"source": k, "count": v} for k, v in sorted(sources.items(), key=lambda x: -x[1])]

    # Marketing perf - last 7 days lead counts
    today = now_utc().date()
    weekly = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        start = datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc)
        end = start + timedelta(days=1)
        c = await leads_col.count_documents({
            "created_at": {"$gte": iso(start), "$lt": iso(end)},
        })
        weekly.append({"day": day.strftime("%a"), "leads": c})

    # Executive attention - overdue follow-ups, hot leads, lost
    now_iso = iso(now_utc())
    overdue = await leads_col.count_documents({
        "next_followup_at": {"$lt": now_iso},
        "status": {"$nin": ["Booked", "Lost"]},
    })

    return {
        "kpis": {
            "total_leads": total,
            "new_leads": new,
            "qualified_leads": qualified,
            "site_visits": site_visits,
            "bookings": booked,
            "conversion_pct": conversion,
            "hot_leads": hot,
            "lost_leads": lost,
        },
        "attention": {
            "overdue_followups": overdue,
            "hot_leads": hot,
            "stalled_negotiations": await leads_col.count_documents({"status": "Negotiation"}),
        },
        "funnel": funnel,
        "sources": source_list,
        "weekly_leads": weekly,
    }


@api.get("/dashboard/top-properties")
async def top_properties(user: dict = Depends(current_user)) -> list[dict]:
    items = await properties_col.find({}, {"_id": 0}).sort("bookings", -1).limit(5).to_list(5)
    for it in items:
        leads = it.get("leads_count", 0)
        bookings = it.get("bookings", 0)
        it["conversion_pct"] = round((bookings / leads) * 100, 1) if leads else 0.0
    return items


@api.get("/dashboard/top-agents")
async def top_agents(user: dict = Depends(current_user)) -> list[dict]:
    agents = await agents_col.find({}, {"_id": 0}).to_list(50)
    results = []
    for a in agents:
        total = await leads_col.count_documents({"assigned_to": a["id"]})
        booked = await leads_col.count_documents({"assigned_to": a["id"], "status": "Booked"})
        results.append({
            **a,
            "leads": total,
            "bookings": booked,
            "conversion_pct": round((booked / total) * 100, 1) if total else 0.0,
        })
    results.sort(key=lambda x: (x["bookings"], x["conversion_pct"]), reverse=True)
    return results[:5]


@api.get("/dashboard/activities")
async def recent_activities(limit: int = 12, user: dict = Depends(current_user)) -> list[dict]:
    return await activities_col.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)


@api.get("/dashboard/followups")
async def followup_center(user: dict = Depends(current_user)) -> list[dict]:
    now_iso = iso(now_utc())
    items = await leads_col.find(
        {"next_followup_at": {"$lte": now_iso}, "status": {"$nin": ["Booked", "Lost"]}},
        {"_id": 0},
    ).sort("next_followup_at", 1).limit(15).to_list(15)
    return items


@api.get("/dashboard/insights")
async def ai_insights(user: dict = Depends(current_user)) -> list[dict]:
    total = await leads_col.count_documents({}) or 1
    hot = await leads_col.count_documents({"is_hot": True})
    booked = await leads_col.count_documents({"status": "Booked"})
    qualified = await leads_col.count_documents({"status": "Qualified"})
    site_visits = await leads_col.count_documents({"status": "Site Visit"})
    sources: dict[str, int] = {}
    async for doc in leads_col.find({}, {"_id": 0, "source": 1}):
        sources[doc["source"]] = sources.get(doc["source"], 0) + 1
    top_source = max(sources.items(), key=lambda x: x[1]) if sources else ("Website", 0)

    # campaigns aggregates
    best_camp = None
    async for c in campaigns_col.find({}, {"_id": 0}).sort("roas", -1).limit(1):
        best_camp = c

    summary = {
        "total_leads": total,
        "hot_leads": hot,
        "qualified": qualified,
        "site_visits": site_visits,
        "bookings": booked,
        "conversion_pct": round(booked / total * 100, 1),
        "top_source": {"name": top_source[0], "count": top_source[1]},
        "best_campaign": {
            "name": best_camp["name"] if best_camp else None,
            "roas": best_camp["roas"] if best_camp else None,
        },
    }

    fallback = [
        {
            "id": "i-conv",
            "title": "Conversion holding steady",
            "body": f"{summary['conversion_pct']}% of leads converted to bookings. Push Qualified leads to Site Visit faster.",
            "trend": "up",
            "icon": "trending-up",
        },
        {
            "id": "i-source",
            "title": f"{top_source[0]} is your #1 source",
            "body": f"{top_source[1]} leads originated from {top_source[0]}. Consider scaling spend by 15%.",
            "trend": "up",
            "icon": "target",
        },
        {
            "id": "i-hot",
            "title": f"{hot} hot leads need attention",
            "body": "Hot leads convert 3x better. Assign senior agents within 24 hours.",
            "trend": "warn",
            "icon": "flame",
        },
    ]

    if not EMERGENT_LLM_KEY:
        cache_set("dashboard_insights", fallback, 600)
        return fallback

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage  # type: ignore

        system = (
            "You are an executive CRM analyst for a real-estate sales team. "
            "Given a JSON summary of CRM KPIs, return EXACTLY 4 short, decisive insights for "
            "the head of sales. Each insight must be one sentence (<= 22 words), be data-grounded "
            "and end with a clear action. Respond ONLY with a JSON array of 4 objects, no prose, no "
            "code fences. Each object has: title (<=8 words), body (one sentence ending in action), "
            "trend ('up'|'down'|'warn'), icon (one of 'trending-up','target','flame','alert-triangle','sparkles')."
        )
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"insights-{uuid.uuid4()}",
            system_message=system,
        ).with_model("gemini", "gemini-3-flash-preview")

        msg = UserMessage(text=f"KPIs:\n{summary}\n\nReturn JSON only.")
        raw = await chat.send_message(msg)
        text = raw if isinstance(raw, str) else str(raw)
        # strip code fences if any
        text = text.strip()
        if text.startswith("```"):
            text = text.strip("`")
            if text.lower().startswith("json"):
                text = text[4:]
        import json as _json

        # find the first JSON array in the text
        start = text.find("[")
        end = text.rfind("]")
        if start == -1 or end == -1:
            return fallback
        items = _json.loads(text[start : end + 1])
        out = []
        for i, it in enumerate(items[:4]):
            if not isinstance(it, dict):
                continue
            out.append({
                "id": f"ai-{i}",
                "title": str(it.get("title", "")).strip()[:80] or fallback[i % len(fallback)]["title"],
                "body": str(it.get("body", "")).strip()[:240] or fallback[i % len(fallback)]["body"],
                "trend": it.get("trend", "up") if it.get("trend") in {"up", "down", "warn"} else "up",
                "icon": it.get("icon", "sparkles"),
                "ai": True,
            })
        result = out or fallback
        cache_set("dashboard_insights", result, 600)
        return result
    except Exception as e:
        log.warning("AI insights fell back: %s", e)
        cache_set("dashboard_insights", fallback, 60)
        return fallback


# ------------------------------ Routes : Leads -------------------------------
@api.get("/leads")
async def list_leads(
    q: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    source: Optional[str] = None,
    is_hot: Optional[bool] = None,
    limit: int = 100,
    user: dict = Depends(current_user),
) -> list[dict]:
    query: dict = {}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
        ]
    if status_filter and status_filter != "All":
        query["status"] = status_filter
    if source:
        query["source"] = source
    if is_hot is not None:
        query["is_hot"] = is_hot
    return await leads_col.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)


@api.get("/leads/pipeline")
async def leads_pipeline(user: dict = Depends(current_user)) -> dict:
    out: dict = {}
    for stage in LEAD_STAGES:
        items = await leads_col.find({"status": stage}, {"_id": 0}).sort("created_at", -1).limit(20).to_list(20)
        out[stage] = items
    return out


@api.get("/leads/{lead_id}")
async def lead_detail(lead_id: str, user: dict = Depends(current_user)) -> dict:
    lead = await leads_col.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    timeline = await activities_col.find({"lead_id": lead_id}, {"_id": 0}).sort("created_at", -1).to_list(30)
    if not timeline:
        # synthesize a small timeline
        timeline = [{
            "id": str(uuid.uuid4()),
            "type": "created",
            "title": f"Lead created from {lead['source']}",
            "lead_id": lead_id,
            "agent_name": lead.get("assigned_name"),
            "created_at": lead.get("created_at"),
        }]
    return {"lead": lead, "timeline": timeline}


@api.post("/leads")
async def create_lead(payload: LeadCreate, user: dict = Depends(current_user)) -> dict:
    doc = {
        "id": str(uuid.uuid4()),
        **payload.dict(),
        "status": "New",
        "stage": "New",
        "is_hot": False,
        "score": 50,
        "assigned_to": None,
        "assigned_name": None,
        "assigned_avatar": None,
        "created_at": iso(now_utc()),
        "updated_at": iso(now_utc()),
        "next_followup_at": iso(now_utc() + timedelta(days=1)),
    }
    await leads_col.insert_one(doc.copy())
    return doc


@api.patch("/leads/{lead_id}")
async def update_lead(lead_id: str, payload: LeadUpdate, user: dict = Depends(current_user)) -> dict:
    update = {k: v for k, v in payload.dict().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    update["updated_at"] = iso(now_utc())
    if "status" in update and "stage" not in update:
        update["stage"] = update["status"] if update["status"] in LEAD_STAGES else "Lost"
    res = await leads_col.find_one_and_update(
        {"id": lead_id}, {"$set": update}, return_document=True,
    )
    if not res:
        raise HTTPException(status_code=404, detail="Lead not found")
    # log activity
    await activities_col.insert_one({
        "id": str(uuid.uuid4()),
        "type": "status" if "status" in update else "update",
        "title": f"{res['name']} updated" if "status" not in update else f"{res['name']} moved to {update['status']}",
        "lead_id": lead_id,
        "lead_name": res["name"],
        "agent_name": res.get("assigned_name"),
        "agent_avatar": res.get("assigned_avatar"),
        "created_at": iso(now_utc()),
    })
    res.pop("_id", None)
    return res


# ------------------------------ Routes : Properties --------------------------
@api.get("/properties")
async def list_properties(
    q: Optional[str] = None,
    city: Optional[str] = None,
    bhk: Optional[str] = None,
    user: dict = Depends(current_user),
) -> list[dict]:
    query: dict = {}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"builder": {"$regex": q, "$options": "i"}},
            {"location": {"$regex": q, "$options": "i"}},
        ]
    if city and city != "All":
        query["city"] = city
    if bhk and bhk != "All":
        query["bhk"] = {"$in": [bhk]}
    items = await properties_col.find(query, {"_id": 0}).sort("bookings", -1).to_list(100)
    for it in items:
        leads = it.get("leads_count", 0) or 0
        bookings = it.get("bookings", 0) or 0
        it["conversion_pct"] = round((bookings / leads) * 100, 1) if leads else 0.0
    return items


@api.get("/properties/{property_id}")
async def property_detail(property_id: str, user: dict = Depends(current_user)) -> dict:
    p = await properties_col.find_one({"id": property_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Property not found")
    leads = p.get("leads_count", 0) or 0
    bookings = p.get("bookings", 0) or 0
    p["conversion_pct"] = round((bookings / leads) * 100, 1) if leads else 0.0
    # related leads
    related = await leads_col.find({"property_id": property_id}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    return {"property": p, "leads": related}


# ------------------------------ Routes : Analytics ---------------------------
@api.get("/analytics/overview")
async def analytics_overview(days: int = 30, user: dict = Depends(current_user)) -> dict:
    since = now_utc() - timedelta(days=days)
    since_iso = iso(since)

    total = await leads_col.count_documents({"created_at": {"$gte": since_iso}})
    booked = await leads_col.count_documents({"created_at": {"$gte": since_iso}, "status": "Booked"})
    site_visits = await leads_col.count_documents({"created_at": {"$gte": since_iso}, "status": "Site Visit"})

    # campaigns aggregates
    spend = 0
    revenue = 0
    leads = 0
    clicks = 0
    impressions = 0
    bookings_c = 0
    async for c in campaigns_col.find({}, {"_id": 0}):
        spend += c.get("spend", 0)
        revenue += c.get("revenue", 0)
        leads += c.get("leads", 0)
        clicks += c.get("clicks", 0)
        impressions += c.get("impressions", 0)
        bookings_c += c.get("bookings", 0)

    cpl = round(spend / max(leads, 1), 0)
    ctr = round(clicks / max(impressions, 1) * 100, 2)
    roas = round(revenue / max(spend, 1), 2)

    # Daily series
    series = []
    for i in range(days - 1, -1, -1):
        day = (now_utc() - timedelta(days=i)).date()
        s = datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc)
        e = s + timedelta(days=1)
        c = await leads_col.count_documents({"created_at": {"$gte": iso(s), "$lt": iso(e)}})
        b = await leads_col.count_documents({"created_at": {"$gte": iso(s), "$lt": iso(e)}, "status": "Booked"})
        series.append({"day": day.strftime("%d %b"), "leads": c, "bookings": b})

    # source breakdown
    src: dict[str, int] = {}
    async for doc in leads_col.find({"created_at": {"$gte": since_iso}}, {"_id": 0, "source": 1}):
        src[doc["source"]] = src.get(doc["source"], 0) + 1
    sources = [{"source": k, "count": v} for k, v in sorted(src.items(), key=lambda x: -x[1])]

    return {
        "kpis": {
            "total_leads": total,
            "bookings": booked,
            "site_visits": site_visits,
            "cpl": cpl,
            "ctr": ctr,
            "roas": roas,
            "spend": spend,
            "revenue": revenue,
        },
        "series": series,
        "sources": sources,
    }


@api.get("/analytics/campaigns")
async def campaigns_list(user: dict = Depends(current_user)) -> list[dict]:
    return await campaigns_col.find({}, {"_id": 0}).sort("spend", -1).to_list(50)


# ------------------------------ Routes : Team --------------------------------
@api.get("/agents")
async def list_agents(user: dict = Depends(current_user)) -> list[dict]:
    return await agents_col.find({}, {"_id": 0}).to_list(50)


async def seed_notifications() -> None:
    if await notifications_col.count_documents({}) > 0:
        return
    leads = await leads_col.find({}, {"_id": 0}).limit(20).to_list(20)
    types = [
        ("lead", "New hot lead assigned", "info"),
        ("followup", "Follow-up due today", "warn"),
        ("booking", "Booking confirmed", "success"),
        ("status", "Lead moved to Negotiation", "info"),
        ("alert", "Lead is going cold", "warn"),
        ("system", "Weekly executive report ready", "info"),
    ]
    notes = []
    for i in range(18):
        kind, title, sev = random.choice(types)
        lead = random.choice(leads) if leads else None
        notes.append({
            "id": str(uuid.uuid4()),
            "type": kind,
            "title": title,
            "body": f"{lead['name']} · {lead.get('property_name','')}" if lead else "",
            "severity": sev,
            "lead_id": lead["id"] if lead else None,
            "read": i > 4,
            "created_at": iso(now_utc() - timedelta(hours=random.randint(0, 96))),
        })
    await notifications_col.insert_many(notes)


async def seed_reports() -> None:
    if await reports_col.count_documents({}) > 0:
        return
    items = []
    titles = [
        ("Weekly Executive Summary", "weekly", "Performance digest with KPIs, conversion, and top campaigns."),
        ("Monthly Pipeline Review", "monthly", "Full funnel review with stage velocity and bottlenecks."),
        ("Q1 Marketing ROI", "quarterly", "CPL, CTR and ROAS breakdown by channel for Q1."),
        ("Agent Performance Scorecard", "monthly", "Top and bottom performers, with focus areas."),
        ("Property Performance Report", "monthly", "Lead and booking velocity per property."),
        ("Source Attribution Report", "weekly", "Lead-source share & conversion ranking."),
    ]
    for i, (t, cad, body) in enumerate(titles):
        items.append({
            "id": str(uuid.uuid4()),
            "title": t,
            "cadence": cad,
            "body": body,
            "kpis": {
                "leads": random.randint(80, 450),
                "bookings": random.randint(5, 40),
                "roas": round(random.uniform(2.1, 6.4), 2),
            },
            "created_at": iso(now_utc() - timedelta(days=i * 3 + 1)),
        })
    await reports_col.insert_many(items)


@app.on_event("startup")
async def on_startup_more() -> None:
    await seed_notifications()
    await seed_reports()


# ------------------------------ Routes : Notifications -----------------------
@api.get("/notifications")
async def list_notifications(user: dict = Depends(current_user)) -> list[dict]:
    return await notifications_col.find({}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)


@api.get("/notifications/unread-count")
async def unread_count(user: dict = Depends(current_user)) -> dict:
    n = await notifications_col.count_documents({"read": False})
    return {"unread": n}


@api.post("/notifications/{nid}/read")
async def mark_read(nid: str, user: dict = Depends(current_user)) -> dict:
    res = await notifications_col.update_one({"id": nid}, {"$set": {"read": True}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


@api.post("/notifications/read-all")
async def mark_all_read(user: dict = Depends(current_user)) -> dict:
    await notifications_col.update_many({"read": False}, {"$set": {"read": True}})
    return {"ok": True}


# ------------------------------ Routes : Reports -----------------------------
@api.get("/reports")
async def list_reports(user: dict = Depends(current_user)) -> list[dict]:
    return await reports_col.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)


@api.get("/reports/{rid}")
async def report_detail(rid: str, user: dict = Depends(current_user)) -> dict:
    r = await reports_col.find_one({"id": rid}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    return r


# ------------------------------ Routes : Campaigns (CRUD-lite) ---------------
class CampaignCreate(BaseModel):
    name: str
    channel: str = "Facebook"
    spend: float = 0
    leads: int = 0
    bookings: int = 0


@api.get("/campaigns")
async def campaigns_full(user: dict = Depends(current_user)) -> list[dict]:
    return await campaigns_col.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)


@api.get("/campaigns/{cid}")
async def campaign_detail(cid: str, user: dict = Depends(current_user)) -> dict:
    c = await campaigns_col.find_one({"id": cid}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return c


@api.post("/campaigns")
async def create_campaign(payload: CampaignCreate, user: dict = Depends(current_user)) -> dict:
    impressions = max(1, payload.leads * 18)
    clicks = max(1, payload.leads * 12)
    revenue = payload.bookings * 80 * 100000  # demo
    doc = {
        "id": str(uuid.uuid4()),
        **payload.dict(),
        "status": "Active",
        "impressions": impressions,
        "clicks": clicks,
        "revenue": revenue,
        "cpl": round(payload.spend / max(payload.leads, 1), 2),
        "ctr": round(clicks / impressions * 100, 2),
        "roas": round(revenue / max(payload.spend, 1), 2),
        "created_at": iso(now_utc()),
    }
    await campaigns_col.insert_one(doc.copy())
    return doc


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    channel: Optional[str] = None
    status: Optional[str] = None
    spend: Optional[float] = None
    leads: Optional[int] = None
    bookings: Optional[int] = None


@api.patch("/campaigns/{cid}")
async def update_campaign(cid: str, payload: CampaignUpdate, user: dict = Depends(current_user)) -> dict:
    update = {k: v for k, v in payload.dict().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    existing = await campaigns_col.find_one({"id": cid}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Campaign not found")
    merged = {**existing, **update}
    impressions = max(1, int(merged.get("leads", 0)) * 18)
    clicks = max(1, int(merged.get("leads", 0)) * 12)
    revenue = int(merged.get("bookings", 0)) * 80 * 100000
    update["impressions"] = impressions
    update["clicks"] = clicks
    update["revenue"] = revenue
    update["cpl"] = round(float(merged.get("spend", 0)) / max(int(merged.get("leads", 0)), 1), 2)
    update["ctr"] = round(clicks / impressions * 100, 2)
    update["roas"] = round(revenue / max(float(merged.get("spend", 0)), 1), 2)
    await campaigns_col.update_one({"id": cid}, {"$set": update})
    out = await campaigns_col.find_one({"id": cid}, {"_id": 0})
    return out  # type: ignore[return-value]


@api.delete("/campaigns/{cid}")
async def delete_campaign(cid: str, user: dict = Depends(current_user)) -> dict:
    res = await campaigns_col.delete_one({"id": cid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"ok": True}


# ------------------------------ Routes : Agents CRUD -------------------------
class AgentCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    city: str = "Mumbai"
    rating: float = 4.5


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    rating: Optional[float] = None


@api.post("/agents")
async def create_agent(payload: AgentCreate, user: dict = Depends(current_user)) -> dict:
    doc = {
        "id": str(uuid.uuid4()),
        **payload.dict(),
        "avatar": AVATAR_URLS[random.randint(0, len(AVATAR_URLS) - 1)],
        "role": "agent",
        "joined_at": iso(now_utc()),
    }
    await agents_col.insert_one(doc.copy())
    return doc


@api.patch("/agents/{aid}")
async def update_agent(aid: str, payload: AgentUpdate, user: dict = Depends(current_user)) -> dict:
    update = {k: v for k, v in payload.dict().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = await agents_col.find_one_and_update({"id": aid}, {"$set": update}, return_document=True)
    if not res:
        raise HTTPException(status_code=404, detail="Agent not found")
    res.pop("_id", None)
    return res


@api.delete("/agents/{aid}")
async def delete_agent(aid: str, user: dict = Depends(current_user)) -> dict:
    res = await agents_col.delete_one({"id": aid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"ok": True}


# ------------------------------ Routes : Profile + 2FA -----------------------
class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None  # accepts URL or data URI


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


@api.patch("/auth/me")
async def update_me(payload: ProfileUpdate, user: dict = Depends(current_user)) -> dict:
    update = {k: v for k, v in payload.dict().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = await users_col.find_one_and_update(
        {"id": user["id"]}, {"$set": update}, return_document=True,
    )
    if not res:
        raise HTTPException(status_code=404, detail="User not found")
    res.pop("_id", None)
    res.pop("password_hash", None)
    return res


@api.post("/auth/change-password")
async def change_password(payload: PasswordChange, user: dict = Depends(current_user)) -> dict:
    doc = await users_col.find_one({"id": user["id"]})
    if not doc or not verify_pw(payload.current_password, doc["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    await users_col.update_one(
        {"id": user["id"]}, {"$set": {"password_hash": hash_pw(payload.new_password)}},
    )
    return {"ok": True}


@api.post("/auth/2fa/setup")
async def twofa_setup(user: dict = Depends(current_user)) -> dict:
    import pyotp

    secret = pyotp.random_base32()
    otp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=user["email"], issuer_name="TASKEZY CRM",
    )
    await users_col.update_one(
        {"id": user["id"]}, {"$set": {"twofa_secret_pending": secret}},
    )
    return {"secret": secret, "otp_uri": otp_uri}


class TwoFAVerify(BaseModel):
    code: str


@api.post("/auth/2fa/enable")
async def twofa_enable(payload: TwoFAVerify, user: dict = Depends(current_user)) -> dict:
    import pyotp

    doc = await users_col.find_one({"id": user["id"]})
    secret = (doc or {}).get("twofa_secret_pending")
    if not secret:
        raise HTTPException(status_code=400, detail="No 2FA setup in progress. Call /setup first.")
    if not pyotp.TOTP(secret).verify(payload.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid code")
    await users_col.update_one(
        {"id": user["id"]},
        {"$set": {"twofa_secret": secret, "twofa_enabled": True},
         "$unset": {"twofa_secret_pending": ""}},
    )
    return {"ok": True, "enabled": True}


@api.post("/auth/2fa/disable")
async def twofa_disable(payload: TwoFAVerify, user: dict = Depends(current_user)) -> dict:
    import pyotp

    doc = await users_col.find_one({"id": user["id"]})
    secret = (doc or {}).get("twofa_secret")
    if not secret:
        raise HTTPException(status_code=400, detail="2FA is not enabled")
    if not pyotp.TOTP(secret).verify(payload.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid code")
    await users_col.update_one(
        {"id": user["id"]},
        {"$set": {"twofa_enabled": False}, "$unset": {"twofa_secret": ""}},
    )
    return {"ok": True, "enabled": False}


@api.get("/auth/2fa/status")
async def twofa_status(user: dict = Depends(current_user)) -> dict:
    doc = await users_col.find_one({"id": user["id"]})
    return {"enabled": bool((doc or {}).get("twofa_enabled", False))}


# ------------------------------ Routes : Push notifications (relay) ----------
import httpx  # noqa: E402

_push_client: httpx.AsyncClient | None = None


def _get_push_client() -> httpx.AsyncClient:
    global _push_client
    if _push_client is None:
        _push_client = httpx.AsyncClient(
            base_url=EMERGENT_PUSH_BASE_URL,
            headers={"X-Push-Key": EMERGENT_PUSH_KEY},
            timeout=10.0,
        )
    return _push_client


class RegisterPushBody(BaseModel):
    user_id: str
    platform: str  # 'android' | 'ios'
    device_token: str


@api.post("/register-push", status_code=201)
async def register_push(body: RegisterPushBody, user: dict = Depends(current_user)) -> dict:
    try:
        resp = await _get_push_client().post(
            "/api/v1/push/users/register", json=body.model_dump(),
        )
    except Exception as e:
        log.warning("register-push relay failed: %s", e)
        raise HTTPException(status_code=502, detail="Push provider unavailable") from None
    if resp.status_code == 401:
        raise HTTPException(status_code=500, detail="EMERGENT_PUSH_KEY missing or invalid")
    if resp.status_code >= 500:
        raise HTTPException(status_code=502, detail="Push provider unavailable")
    resp.raise_for_status()
    return {"status": "registered"}


async def send_push(recipients: list[str], data: dict, idempotency_key: Optional[str] = None) -> None:
    if not recipients:
        return
    if len(recipients) > 100:
        raise ValueError("max 100 recipients per /trigger call")
    if "title" not in data or "message" not in data:
        raise ValueError("data must include title and message")
    payload: dict = {"recipients": recipients, "data": data}
    if idempotency_key:
        payload["$idempotency_key"] = idempotency_key
    resp = await _get_push_client().post("/api/v1/push/trigger", json=payload)
    if resp.status_code == 401:
        raise RuntimeError("EMERGENT_PUSH_KEY missing or invalid")
    if resp.status_code >= 500:
        raise RuntimeError("Push provider unavailable")
    resp.raise_for_status()


# ------------------------------ Register router ------------------------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
