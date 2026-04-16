import json, os, re
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from pathlib import Path
from datetime import datetime
from groq import Groq
from app.db.session import SessionLocal
from app.models.event import Event

app = FastAPI(title="CORE Architecte Agent", version="3.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

router = APIRouter()
client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))

BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "output"

with open(OUTPUT_DIR / "context_summary.json", encoding="utf-8") as f:
    CTX = json.load(f)

PROFILES    = CTX["category_profiles"]
CALENDAR    = {m["month"]: m for m in CTX["temporal_constraints"]["monthly_calendar"]}
RULES_R     = CTX["decision_rules"]["risk_mitigation"]
BENCHMARKS  = CTX["benchmarks"]

# ── EXAM CALENDAR ─────────────────────────────────────────────
# Exams every 5 months on the 25th: Jan, May, Jun, Oct, Feb
# Avoid full month if exam falls in it
# ── EXAM periods — partial or full month blocked for scheduling ──
EXAM_MONTHS = {1, 5}      # January (10-25), May (10-12)
EXAM_DATES  = {
    1: {"start": 10, "end": 25, "label": "Jan 10–25"},
    5: {"start": 10, "end": 12, "label": "Mai 10–12"},
}  # key = month number

# ── VACATION periods — university closed, rooms restricted ───────
VACATION_MONTHS = {6, 7, 8}   # June, July, August
VACATION_INFO = {
    6: {"label": "Juin (vacances d'été — debut)"},
    7: {"label": "Juillet (vacances d'été)"},
    8: {"label": "Août (vacances d'été)"},
}
MONTH_NAMES = {
    1:"January",2:"February",3:"March",4:"April",5:"May",6:"June",
    7:"July",8:"August",9:"September",10:"October",11:"November",12:"December"
}

# ── ROOMS AT ISSATKR ──────────────────────────────────────────
# closed_months: rooms unavailable these months (university vacation / maintenance)
# June=6 (exams), July=7 & August=8 (summer vacation) apply to lecture halls & labs
ROOMS = [
    {"name":"Amphitheatre A",   "capacity":400, "type":"lecture",  "has_projector":True,  "has_wifi":True,  "has_ac":True,  "suitable_for":["Conference","Hackathon"],            "closed_months":[6,7,8]},
    {"name":"Amphitheatre B",   "capacity":250, "type":"lecture",  "has_projector":True,  "has_wifi":True,  "has_ac":True,  "suitable_for":["Conference","Workshop","Hackathon"],  "closed_months":[6,7,8]},
    {"name":"Salle Info 1",     "capacity":40,  "type":"lab",      "has_projector":True,  "has_wifi":True,  "has_ac":True,  "suitable_for":["Workshop","Hackathon"],               "closed_months":[6,7,8]},
    {"name":"Salle Info 2",     "capacity":40,  "type":"lab",      "has_projector":True,  "has_wifi":True,  "has_ac":True,  "suitable_for":["Workshop","Hackathon"],               "closed_months":[6,7,8]},
    {"name":"Salle Info 3",     "capacity":40,  "type":"lab",      "has_projector":True,  "has_wifi":True,  "has_ac":True,  "suitable_for":["Workshop","Hackathon"],               "closed_months":[6,7,8]},
    {"name":"Salle Reunion",    "capacity":30,  "type":"meeting",  "has_projector":True,  "has_wifi":True,  "has_ac":False, "suitable_for":["Workshop"],                           "closed_months":[6]},
    {"name":"Hall Principal",   "capacity":600, "type":"hall",     "has_projector":False, "has_wifi":True,  "has_ac":False, "suitable_for":["Conference","Hackathon","Workshop"],  "closed_months":[]},
    {"name":"Salle Polyvalente","capacity":120, "type":"flexible", "has_projector":True,  "has_wifi":True,  "has_ac":True,  "suitable_for":["Workshop","Conference","Hackathon"],  "closed_months":[]},
]

def recommend_room(event_type: str, participants: int, event_month: int = 0) -> dict:
    
    suitable = [
        r for r in ROOMS
        if event_type in r["suitable_for"]
        and r["capacity"] >= participants
        and event_month not in r.get("closed_months", [])
    ]
    closed_warning = None
    if not suitable:
        # Try ignoring closed_months — report it as a warning
        suitable_any = [
            r for r in ROOMS
            if event_type in r["suitable_for"] and r["capacity"] >= participants
        ]
        if suitable_any and event_month in [6,7,8]:
            closed_warning = f"⚠️ Most rooms closed in {MONTH_NAMES.get(event_month,'this month')} (vacation). Hall Principal available as fallback."
            suitable = [r for r in suitable_any if not r.get("closed_months") or event_month not in r["closed_months"]]
        if not suitable:
            all_suitable = [r for r in ROOMS if event_type in r["suitable_for"]]
            return {
                "primary_room": None,
                "alternative_rooms": [r["name"] for r in all_suitable],
                "note": f"No single room fits {participants} people. Consider combining rooms or using Hall Principal.",
                "requires_combination": True,
                "closed_warning": closed_warning
            }
    suitable.sort(key=lambda r: r["capacity"] - participants)
    primary = suitable[0]
    return {
        "primary_room": primary["name"],
        "capacity": primary["capacity"],
        "type": primary["type"],
        "has_projector": primary["has_projector"],
        "has_wifi": primary["has_wifi"],
        "has_ac": primary["has_ac"],
        "alternative_rooms": [r["name"] for r in suitable[1:3]],
        "requires_combination": False,
        "closed_warning": closed_warning,
        "note": f"Best fit for {participants} participants ({primary['capacity']} capacity)."
    }

# ── EXACT DATE PICKER ─────────────────────────────────────────
# Safe days: avoid Fri (half-day), Sat, Sun + exam periods
import calendar as cal_module

def pick_exact_date(month_num: int, year: int = 2026, preferred_day: int = 0) -> dict:
    
    from datetime import date as _date
    today = _date.today()

    exam = EXAM_DATES.get(month_num)
    blocked_days = set()
    if exam:
        blocked_days = set(range(exam["start"], exam["end"]+1))

    # Advance year if month is in the past or current month has < 5 days left
    import calendar as _cal2
    _, _days_in_month = _cal2.monthrange(year, month_num)
    if year == today.year and month_num < today.month:
        year += 1   # month already passed
    elif year == today.year and month_num == today.month:
        remaining = _days_in_month - today.day
        if remaining < 5:
            year += 1   # fewer than 5 days left this month

    candidates = []
    _, days_in_month = cal_module.monthrange(year, month_num)
    for day in range(1, days_in_month+1):
        if day in blocked_days: continue
        weekday = cal_module.weekday(year, month_num, day)
        if weekday >= 5: continue   # skip Sat, Sun
        if weekday == 4: continue   # skip Friday
        # Skip past dates
        if _date(year, month_num, day) <= today: continue
        candidates.append({"day": day, "weekday": cal_module.day_name[weekday]})

    if not candidates:
        # Try next year
        return pick_exact_date(month_num, year+1, preferred_day)

    # If preferred_day given, pick closest available
    if preferred_day:
        best = min(candidates, key=lambda c: abs(c["day"]-preferred_day))
    else:
        mid = [c for c in candidates if 10 <= c["day"] <= 20] or candidates
        best = mid[len(mid)//2]

    return {
        "suggested_date": f"{year}-{month_num:02d}-{best['day']:02d}",
        "day_of_week": best["weekday"],
        "month_name": MONTH_NAMES[month_num],
        "year": year,
        "exam_blocked_range": exam["label"] if exam else "None",
        "total_safe_days": len(candidates),
        "note": f"Suggested: {best['weekday']} {best['day']} {MONTH_NAMES[month_num]} {year}"
    }
MONTH_MAP = {v.lower():k for k,v in MONTH_NAMES.items()}
# French month names
MONTH_MAP.update({
    "janvier":1, "fevrier":2, "février":2, "mars":3, "avril":4,
    "mai":5,     "juin":6,    "juillet":7, "aout":8, "août":8,
    "septembre":9,"octobre":10,"novembre":11,"decembre":12,"décembre":12,
    # Abbreviations EN
    "jan":1,"feb":2,"mar":3,"apr":4,"jun":6,"jul":7,
    "aug":8,"sep":9,"sept":9,"oct":10,"nov":11,"dec":12,
    # Abbreviations FR
    "janv":1,"fev":2,"juil":7,"aoû":8,
})
VALID_TYPES = {"workshop":"Workshop","conference":"Conference","hackathon":"Hackathon"}

# ── SESSION STORE (server-side memory) ────────────────────────
SESSION_STORE: dict = {}
PENDING_CONFIRMATIONS: dict = {}  # session_id -> {ctx, tool_results, budget_warning, reply}

EVENTS_FILE = OUTPUT_DIR / "saved_events.json"
EVENTS_FILE.parent.mkdir(parents=True, exist_ok=True)
if not EVENTS_FILE.exists():
    EVENTS_FILE.write_text("[]", encoding="utf-8")

def load_events() -> list:
    return json.loads(EVENTS_FILE.read_text(encoding="utf-8"))

def save_event(ctx: dict, tool_results: dict, budget_warning: str, session_id: str) -> dict:
    db = SessionLocal()
    try:
        # Get count for ID generation
        event_count = db.query(Event).count()
        event_id = f"EVT-{event_count+1:04d}"
        
        record = Event(
            id=event_id,
            session_id=session_id,
            event_type=ctx.get("event_type"),
            topic=ctx.get("topic"),
            participants=ctx.get("participants"),
            preferred_month=ctx.get("preferred_month"),
            user_budget=ctx.get("user_budget"),
            recommended_month=tool_results["date"].get("recommended_month"),
            estimated_budget=tool_results["budget"].get("estimated_budget_TND"),
            confidence=tool_results["budget"].get("confidence"),
            segment=tool_results["benchmark"].get("segment"),
            top_risk=tool_results["risk"]["risks"][0]["issue"] if tool_results["risk"].get("risks") else None,
            budget_guard=budget_warning,
            venue=tool_results.get("room",{}).get("primary_room"),
            venue_capacity=tool_results.get("room",{}).get("capacity"),
            exact_date=tool_results.get("exact_date",{}).get("suggested_date"),
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        
        # Also save to legacy JSON for backward compatibility
        events = load_events()
        json_record = {
            "id":              event_id,
            "saved_at":        datetime.now().isoformat(timespec="seconds"),
            "session_id":      session_id,
            "event_type":      ctx.get("event_type"),
            "topic":           ctx.get("topic"),
            "participants":    ctx.get("participants"),
            "preferred_month": ctx.get("preferred_month"),
            "user_budget":     ctx.get("user_budget"),
            "recommended_month": tool_results["date"].get("recommended_month"),
            "estimated_budget":  tool_results["budget"].get("estimated_budget_TND"),
            "confidence":        tool_results["budget"].get("confidence"),
            "segment":           tool_results["benchmark"].get("segment"),
            "top_risk":          tool_results["risk"]["risks"][0]["issue"] if tool_results["risk"].get("risks") else None,
            "budget_guard":      budget_warning,
            "venue":             tool_results.get("room",{}).get("primary_room"),
            "venue_capacity":    tool_results.get("room",{}).get("capacity"),
            "exact_date":        tool_results.get("exact_date",{}).get("suggested_date"),
        }
        events.append(json_record)
        EVENTS_FILE.write_text(json.dumps(events, ensure_ascii=False, indent=2), encoding="utf-8")
        
        return json_record
    finally:
        db.close()

def get_session(session_id: str) -> dict:
    if session_id not in SESSION_STORE:
        SESSION_STORE[session_id] = {
            "history":          [],
            "last_event":       None,
            "last_participants":None,
            "last_budget":      None,
        }
    return SESSION_STORE[session_id]

def update_session(session_id: str, user_msg: str, assistant_msg: str, ctx: dict):
    s = get_session(session_id)
    s["history"].append({"role":"user",      "content": user_msg})
    s["history"].append({"role":"assistant", "content": assistant_msg})
    s["history"] = s["history"][-20:]
    if ctx.get("event_type"):    s["last_event"]         = ctx["event_type"]
    if ctx.get("participants"):  s["last_participants"]  = ctx["participants"]
    if ctx.get("user_budget"):   s["last_budget"]        = ctx["user_budget"]
    if ctx.get("topic"):         s["last_topic"]         = ctx["topic"]
    if ctx.get("preferred_day"): s["preferred_day"]      = ctx["preferred_day"]

# ── PRE-LLM: CONTEXT EXTRACTOR ────────────────────────────────
def extract_context(text: str, session: dict) -> dict:
    t = text.lower()

    # ── Event type — text first, then session fallback ──
    event_type = next((v for k,v in VALID_TYPES.items() if k in t), None)
    if not event_type:
        event_type = session.get("last_event")

    # ── Participants ──
    # Priority 1: explicit label  e.g. "200 people" / "200 participants"
    # Priority 2: "for N" pattern e.g. "for 200"
    # Priority 3: standalone number only if the message is SHORT (≤4 words)
    #             and does NOT contain budget keywords — avoids "1000 tnd" false match
    # Priority 4: session memory fallback
    participants = None
    m1 = re.search(r'(\d+)\s*(people|participants|persons|p\b)', t)
    m2 = re.search(r'(?:for|avec|pour)\s+(\d+)', t)
    budget_in_text = bool(re.search(r'\d+\s*(tnd|budget|dinar)', t)) or \
                     bool(re.search(r'budget\s*(is|of|:)?\s*\d+', t))
    standalone     = re.fullmatch(r'\s*(\d+)\s*', t)   # ONLY digits in message
    if m1:
        participants = int(m1.group(1))
    elif m2:
        participants = int(m2.group(1))
    elif standalone and not budget_in_text:
        participants = int(standalone.group(1))
    elif len(t.split()) <= 3 and re.search(r'\d+', t) and not budget_in_text:
        # short message like "100" or "100 p" — safe to treat as participants
        nm = re.search(r'(\d+)', t)
        if nm: participants = int(nm.group(1))
    else:
        # Last text attempt: number NOT directly adjacent to tnd/dinar (within 5 chars)
        for match in re.finditer(r'(\d+)', t):
            start, end = match.start(), match.end()
            right_ctx = t[end:end+6]   # only look RIGHT for tnd/dinar
            left_ctx  = t[max(0,start-8):start]  # look LEFT for "budget"
            if not re.search(r'tnd|dinar', right_ctx) and not re.search(r'budget', left_ctx):
                participants = int(match.group(1))
                break
    if not participants:
        participants = session.get("last_participants")

    # Preferred day — "25 mars", "march 20", "le 15 avril"
    MONTH_RE = "mars|march|avril|april|aout|août|august|juillet|july|septembre|september|octobre|october|novembre|november|decembre|december|janvier|january|fevrier|february|juin|june"
    preferred_day_val = 0
    _dm = re.search(r"(\d{1,2})\s*(?:" + MONTH_RE + r")|(?:" + MONTH_RE + r")\s*(\d{1,2})", t)
    if _dm:
        raw = _dm.group(1) or _dm.group(2)
        if raw:
            d = int(raw)
            if 1 <= d <= 31: preferred_day_val = d
    if not preferred_day_val and session.get("preferred_day"):
        preferred_day_val = session["preferred_day"]

    # ── Budget — only match when budget keyword present ──
    bm = re.search(r'(\d+)\s*(tnd|dinar)', t)
    if not bm:
        bm = re.search(r'budget\s*(is\s*|of\s*|:\s*)?(\d+)', t)
        user_budget = int(bm.group(2)) if bm else None
    else:
        user_budget = int(bm.group(1))

    # ── Preferred month ──
    preferred_month = next((v for k,v in MONTH_MAP.items() if k in t), 0)

    # ── Avoid months ──
    avoid_months = []
    if any(w in t for w in ["avoid","not in","except","eviter","sauf"]):
        avoid_months = [v for k,v in MONTH_MAP.items() if k in t]

    wants_worst   = any(w in t for w in ["worst","bad month","lowest","pire"])
    wants_explain = any(w in t for w in ["why","explain","reason","how did","justify","pourquoi"])

    # Topic extraction — "sur X" / "on X" / "about X"
    topic = None
    tm = re.search(r'(?:sur|about|intitule|titled?|\bon\s)\s*([\w][\w\s]+?)(?:\s+for|\s+\d|$)', t)
    if tm:
        topic = tm.group(1).strip().title()
    if not topic:
        topic = session.get("last_topic")

    missing = []
    if not event_type:   missing.append("event_type")
    if not participants: missing.append("participants")

    return {
        "event_type":       event_type,
        "participants":     participants,
        "preferred_month":  preferred_month,
        "avoid_months":     avoid_months,
        "user_budget":      user_budget,
        "wants_worst":      wants_worst,
        "wants_explain":    wants_explain,
        "topic":            topic,
        "preferred_day":    preferred_day_val,
        "missing":          missing,
    }

# ── TOOL 1: BUDGET ────────────────────────────────────────────
def forecast_budget(event_type: str, expected_participants: int) -> dict:
    if event_type not in PROFILES:
        return {"error": f"Unknown: {event_type}"}
    p      = PROFILES[event_type]
    reg    = p["budget"]["regression"]
    floor_ = p["budget"]["edge_case_guard"]["floor_value"]
    margin = reg["prediction_interval_95_pct"]
    if expected_participants < p["participants"]["reliable_prediction_floor"]:
        return {
            "rule_applied":"BR-001","estimated_budget_TND":floor_,
            "min_budget_TND":floor_,"max_budget_TND":floor_+margin,
            "confidence":"LOW","floor_value":floor_,
            "warning":f"Participant count ({expected_participants}) below reliable floor ({p['participants']['reliable_prediction_floor']}). Min budget: {floor_} TND."
        }
    raw = reg["coef_participants"]*expected_participants+reg["intercept"]
    if expected_participants > p["participants"]["max"]:
        raw *= 1.15; confidence,rule = "MEDIUM","BR-003"
        note = f"Extrapolation above max ({p['participants']['max']}). +15% buffer."
    else:
        confidence,rule = reg["confidence"],"BR-002"
        note = f"Based on {p['event_count']} historical events. {reg['formula']}"
    return {
        "rule_applied":rule,"estimated_budget_TND":round(raw,2),
        "min_budget_TND":round(max(raw-margin,floor_),2),
        "max_budget_TND":round(raw+margin,2),
        "per_participant_avg_TND":p["budget"]["per_participant_avg"],
        "confidence":confidence,"note":note,"floor_value":floor_
    }

# ── TOOL 2: DATE ──────────────────────────────────────────────
def recommend_date(event_type: str, avoid_months: list=[], preferred_month: int=0, wants_worst: bool=False) -> dict:
    if event_type not in PROFILES:
        return {"error": f"Unknown: {event_type}"}
    from datetime import date as _d
    _today = _d.today()
    p = PROFILES[event_type]

    # Build a lookup from month_num → profile data
    month_profile = {m["month_num"]: m for m in p["satisfaction"]["best_months"]}

    # Iterate months in order: current month → Dec 2026, then Jan → Dec 2027
    # This guarantees we always pick the earliest valid 2026 date first
    ordered_months = list(range(_today.month, 13)) + list(range(1, _today.month))
    scored = []
    for m_num in ordered_months:
        m_data = month_profile.get(m_num)
        if not m_data:
            continue
        cal   = CALENDAR.get(m_num, {})
        flags, penalty = [], 0
        # Only penalize if it wraps to 2027 (second pass months)
        if m_num < _today.month:                          flags.append("NEXT_YEAR");    penalty += 5
        if m_num in EXAM_MONTHS:                          flags.append("EXAM_RISK");    penalty += 3
        if m_num in VACATION_MONTHS:                      flags.append("VACATION");     penalty += 1
        if cal.get("meeting_conflict_level")=="HIGH":     flags.append("MEETING_HIGH"); penalty += 1
        if m_num in avoid_months:                         flags.append("USER_BLOCKED"); penalty += 99
        scored.append({
            "month":m_data["month"],"month_num":m_num,
            "avg_satisfaction":m_data["avg_score"],
            "net_score":m_data["avg_score"]-penalty,
            "flags":flags,
            "planning_status":cal.get("planning_recommendation","NEUTRAL"),
            "events_sampled":m_data.get("events_sampled","N/A"),
            "exam_date": f"25th" if m_num in EXAM_MONTHS else None
        })
    scored.sort(key=lambda x: x["net_score"], reverse=not wants_worst)
    # If user preferred a month, respect it UNLESS it is an exam month
    # Past months ARE allowed if user explicitly requests them (they know it = next year)
    if preferred_month > 0 and preferred_month not in EXAM_MONTHS:
        forced = next((s for s in scored if s["month_num"]==preferred_month), None)
        if forced:
            scored = [forced] + [s for s in scored if s["month_num"]!=preferred_month]
    best   = scored[0]
    backup = scored[1] if len(scored)>1 else None

    # Preferred month analysis — check CALENDAR directly (not just best_months)
    preferred_info = None
    if preferred_month > 0:
        pref_cal   = CALENDAR.get(preferred_month, {})
        pref_flags = []
        if preferred_month in EXAM_MONTHS:                       pref_flags.append("EXAM_RISK")
        if pref_cal.get("meeting_conflict_level")=="HIGH":       pref_flags.append("MEETING_HIGH")
        if preferred_month in avoid_months:                      pref_flags.append("USER_BLOCKED")
        exam_note = (
            f" Exam period: {EXAM_DATES[preferred_month]['label']}." 
            if preferred_month in EXAM_MONTHS else ""
        )
        preferred_info = {
            "month": MONTH_NAMES[preferred_month],
            "flags": pref_flags,
            "avg_satisfaction": pref_cal.get("avg_satisfaction","N/A"),
            "planning_status": pref_cal.get("planning_recommendation","NEUTRAL"),
            "override_warning": (
                f"CRITICAL: {MONTH_NAMES[preferred_month]} has {pref_flags}.{exam_note} "
                f"Recommended alternative: {best['month']}."
            ) if pref_flags else f"{MONTH_NAMES[preferred_month]} is acceptable."
        }

    return {
        "recommended_month":  best["month"],
        "avg_satisfaction":   best["avg_satisfaction"],
        "flags":              best["flags"],
        "planning_status":    best["planning_status"],
        "backup_option":      backup["month"] if backup else None,
        "worst_months":       [m["month"] for m in p["satisfaction"]["worst_months"]],
        "events_sampled":     best["events_sampled"],
        "preferred_month_analysis": preferred_info,
        "exam_months_to_avoid": [MONTH_NAMES[m] for m in EXAM_MONTHS],
        "exam_dates_note": "Exam periods: Jan 10-25 | May 10-12 | June (full month)"
    }

# ── TOOL 3: RISKS ─────────────────────────────────────────────
def get_risk_profile(event_type: str) -> dict:
    if event_type not in PROFILES:
        return {"error": f"Unknown: {event_type}"}
    p = PROFILES[event_type]
    risks_out = []
    for risk in p["risk_profile"]["main_issues"]:
        rule = next((r for r in RULES_R if r["issue"]==risk["issue"]),None)
        triggered = risk["frequency_pct"] >= (rule["trigger_threshold_pct"] if rule else 40)
        risks_out.append({
            "issue":risk["issue"],"frequency_pct":risk["frequency_pct"],
            "rule_triggered":triggered,
            "auto_action":rule["auto_recommendation"] if (rule and triggered) else "Monitor",
            "escalation_path":rule["escalation"] if (rule and triggered) else None
        })
    return {
        "event_type":event_type,
        "total_events_analyzed":p["event_count"],
        "risks":risks_out,
        "secondary_issues":p["risk_profile"]["secondary_issues"],
        "overall_risk_level":"HIGH" if any(r["frequency_pct"]>=50 for r in p["risk_profile"]["main_issues"]) else "MEDIUM"
    }

# ── TOOL 4: BENCHMARK ─────────────────────────────────────────
def get_event_benchmark(event_type: str, expected_participants: int) -> dict:
    if event_type not in PROFILES:
        return {"error": f"Unknown: {event_type}"}
    p   = PROFILES[event_type]
    seg = BENCHMARKS["participant_segments"]
    if expected_participants<=200:   segment,sd="small", seg["small"]
    elif expected_participants<=450: segment,sd="medium",seg["medium"]
    else:                            segment,sd="large", seg["large"]
    return {
        "event_type":event_type,
        "your_participant_count":expected_participants,
        "segment":segment,"segment_range":sd["range"],
        "segment_avg_budget_TND":sd["avg_budget"],
        "segment_avg_satisfaction":sd["avg_satisfaction"],
        "category_overall_avg_satisfaction":p["satisfaction"]["overall_mean"],
        "category_avg_roi_pct":p["revenue"]["avg_roi_pct"]
    }

# ── POST-LLM: BUDGET GUARD ────────────────────────────────────
def budget_guard(user_budget: int, tool_result: dict) -> str:
    if user_budget is None:
        return ""
    floor_    = tool_result.get("floor_value", 0)
    estimated = tool_result.get("estimated_budget_TND", 0)
    if user_budget < floor_:
        return (
            f"BUDGET_INSUFFICIENT: User budget ({user_budget} TND) is BELOW the minimum floor "
            f"({floor_} TND). This event cannot be organized with this budget. "
            f"Minimum required: {floor_} TND."
        )
    if user_budget < estimated:
        return (
            f"BUDGET_TIGHT: User budget ({user_budget} TND) is below optimal estimate "
            f"({estimated} TND). Consider reducing participants or scope."
        )
    return f"BUDGET_OK: User budget ({user_budget} TND) covers estimated cost ({estimated} TND)."

# ── INTENT DETECTOR ───────────────────────────────────────────
GREETINGS = ["salam","hello","hi","hey","bonjour","bonsoir","salut","yo","cc","sup"]
FAREWELLS  = ["bye","cya","goodbye","au revoir","tchao","merci","thank","thanks"]
ABOUT_KW   = ["who are you","what are you","what can you do","what do you do",
               "tell me about","introduce","kesek","explain yourself","kif rak"]
HELP_KW    = ["help","aide","how to use","how does","what should i","comment utiliser"]

INTENT_RESPONSES = {
    "greeting": (
        "Salam! Je suis L'Architecte v3, agent de planification de CORE/VITAL.\n\n"
        "Types supportes : Workshop, Conference, Hackathon\n\n"
        "Je peux vous aider a :\n"
        "  - Estimer votre budget avec precision\n"
        "  - Trouver la meilleure date (examens pris en compte)\n"
        "  - Identifier les risques + actions preventives\n"
        "  - Comparer avec 300 evenements historiques ISSATKR\n\n"
        "Examens : Jan(10-25), Mai(10-12) | Vacances : Juin, Juillet, Aout (salles limitees)\n\n"
        "Quel evenement voulez-vous planifier ?"
    ),
    "farewell": "Bonne chance ! Revenez quand vous avez besoin d'un plan. -- L'Architecte",
    "about": (
        "Je suis L'Architecte v3 — Agent Strategique CORE/VITAL.\n\n"
        "Architecture : Pre-LLM validator + Groq synthesis + Post-LLM budget guard\n"
        "Donnees      : 300 evenements ISSATKR (Workshop / Conference / Hackathon)\n"
        "Memoire      : Session server-side — je me souviens de votre contexte\n"
        "Examens      : 25 de chaque 5 mois (Jan, Fev, Mai, Juin, Oct) — automatiquement evites"
    ),
    "help": (
        "Exemples :\n"
        "  Plan a Hackathon for 200 people, avoid January\n"
        "  Workshop pour 150 personnes en Avril\n"
        "  Conference for 500 people, budget 2000 TND\n"
        "  Why did you choose this budget ?\n\n"
        "Mois d'examens bloques : Jan 10-25 | Mai 10-12 | Juin complet"
    )
}

def detect_intent(text: str, has_history: bool=False):
    t = text.lower().strip(); words = t.split()
    # Farewell always triggers regardless of history
    if any(w in t for w in FAREWELLS) and len(words)<=4:   return "farewell"
    if has_history: return None
    if any(w in t for w in ABOUT_KW):                      return "about"
    if any(w in t for w in HELP_KW):                       return "help"
    if any(w in t for w in GREETINGS) and len(words)<=4:   return "greeting"
    return None

# ── SYSTEM PROMPT ─────────────────────────────────────────────
SYSTEM_PROMPT = (
    "You are L'Architecte v3, the Strategic Planning AI of CORE/VITAL for ISSATKR.\n\n"
    "YOUR ONLY JOB: Synthesize pre-computed tool results into a structured report.\n"
    "DO NOT invent numbers. ALL data is already computed and injected below.\n\n"

    "EXAM & VACATION CALENDAR:\n"
    "  EXAMS (hard avoid): Jan 10-25, May 10-12 — warn user if chosen.\n"
    "  VACANCES (soft avoid): June, July, August — university closed, limited rooms.\n"
    "    Vacation months CAN be used for events but warn about limited room availability.\n"
    "  In ⚠️ Alertes: say 'Mois de vacances — salles limitées' for June/July/Aug.\n"
    "  Say 'Période d'examens' ONLY for January and May.\n\n"

    "BUDGET RULES:\n"
    "  If budget_guard_result starts with BUDGET_INSUFFICIENT → tell user their budget is too low.\n"
    "  If budget_guard_result starts with BUDGET_TIGHT → warn but continue.\n"
    "  If budget_guard_result starts with BUDGET_OK → no warning needed.\n\n"

    "CONTEXT RULES:\n"
    "  You have full conversation history. If user references a previous event, use it.\n"
    "  If event_type was unknown and session provided a fallback, state the assumption.\n"
    "  For Event field: if no topic was given write only the type, NOT 'Workshop - None'. \n"
    "  Example: Event : Workshop (if no topic) or Event : Workshop - React (if topic given).\n\n"

    "OUTPUT FORMAT — use EXACTLY this, no extra fields, no technical jargon:\n"
    "CORE Event Intelligence Report\n"
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    "Evenement    : [type] — [topic if given, else omit the dash]\n"
    "Date         : [Day DD Month YYYY] (ex: Lundi 20 Avril 2026)\n"
    "Salle        : [room name] — capacite [N] personnes\n"
    "Budget       : [estimated] TND  (fourchette : [min] – [max] TND)\n"
    "Participants : [N] personnes — [small=petite/medium=moyenne/large=grande] jauge\n"
    "Risque       : [plain French sentence about the top risk and what to do]\n"
    "⚠️ Alertes   : [plain French warnings if any — budget insuffisant / mois d examens / extrapolation. Write Aucune if none]\n"
    "💡 Conseil   : [1 practical sentence about why this date and what to watch out for]\n"
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    "\n"
    "STRICT RULES for the format above:\n"
    "  - Date field: write the full human date like Mardi 15 Septembre 2026. NO ISO format.\n"
    "  - Salle field: plain room name + capacity only. NO flags (no has_projector/wifi/ac text).\n"
    "  - Budget field: show estimated + range only. NO confidence level, NO LOW/MEDIUM/HIGH words.\n"
    "  - Participants field: N personnes — petite/moyenne/grande jauge ONLY. NO segment code.\n"
    "  - Risque field: write one plain French sentence. NO percentages, NO code words.\n"
    "  - ⚠️ Alertes: plain French only. NO technical words like BUDGET_INSUFFICIENT/EXAM_RISK/LOW/HIGH.\n"
    "  - 💡 Conseil: one friendly sentence explaining the date choice in simple terms.\n"
    "  - FORBIDDEN FIELDS — never output these lines at all:\n"
    "      Date Reason, Confidence, Segment, Backup Date, Why, Best Date, rule_applied\n"
    "  - FORBIDDEN WORDS in output: avg_satisfaction, meeting_conflict_level, reliable_floor,\n"
    "      BR-001, BR-002, BR-003, NEUTRAL, LOW, HIGH, MEDIUM, EXAM_RISK, NEXT_YEAR, PAST\n"
    "  - The report must read like a clean professional summary — zero technical jargon.\n"
    "\n"
    "After the report, ALWAYS end with:\n"
    "Confirmer et sauvegarder ce plan ? (oui / non / modifier)"
)

# ── MAIN AGENT FUNCTION ───────────────────────────────────────
CONFIRM_YES = ["oui","yes","confirm","ok","yep","yea","sure","valider","save","sauvegarder","d'accord","ouais","yap"]
CONFIRM_NO  = ["non","no","nope","annuler","cancel","nah","nan"]
CONFIRM_MOD = ["modifier","modif","modifi","modify","change","edit","changer","update","modfify","mdoify","chagne"]

# Modification field detectors
MOD_FIELDS = {
    "type":         ["type","event type","genre","workshop","conference","hackathon","atelier","seminaire"],
    "participants": ["participants","personnes","people","nombre","count","effectif","combien"],
    "mois":         ["mois","month","quand","when","periode","mois prefere","la date","vers","changer la date","modifier la date","nouvelle date"],
    "jour":         ["jour","day","date","jours","specific day","le jour"],
    "topic":        ["sujet","topic","theme","titre","title","sur"],
}

def _build_modify_prompt(ctx: dict, field: str) -> str:
    current = {
        "type":         ctx.get("event_type","?"),
        "participants": ctx.get("participants","?"),
        "mois":         MONTH_NAMES.get(ctx.get("preferred_month",0),"not set"),
        "budget":       f"{ctx.get('user_budget','not set')} TND",
        "topic":        "not set",
    }
    prompts = {
        "type":         (
            f"Changer le type d'evenement (actuellement: {current['type']}).\n"
            "Choisissez : Workshop / Conference / Hackathon"
        ),
        "participants": (
            f"Changer le nombre de participants (actuellement: {current['participants']}).\n"
            "Entrez le nouveau nombre :"
        ),
        "mois":         (
            f"Changer le mois prefere (actuellement: {current['mois']}).\n"
            "Entrez un mois (ex: March, April, September)\n"
            "Mois d'examens a eviter : Jan(10-25), Mai(10-12), Juin(complet)"
        ),
        "jour":         (
            "Changer le jour prefere du mois.\n"
            "Entrez un numero de jour (ex: 15, 20, 25)\n"
            "Note: Le systeme choisira le jour disponible le plus proche."
        ),
        "topic":        (
            "Changer le sujet de l'evenement.\n"
            "Entrez le nouveau sujet :"
        ),
    }
    return prompts.get(field, "Que souhaitez-vous modifier ? (type / participants / mois / jour / sujet)")

def handle_confirmation(user_input: str, session_id: str) -> dict | None:
    
    pending = PENDING_CONFIRMATIONS.get(session_id)
    if not pending:
        return None

    t = user_input.lower().strip()

    # ── YES: save ─────────────────────────────────────────────
    if any(w in t for w in CONFIRM_YES):
        # Block save if confidence LOW + no forced confirmation yet
        budget_conf = pending["tool_results"]["budget"].get("confidence","")
        budget_warn = pending.get("budget_warning","")
        has_insuf   = "INSUFFICIENT" in budget_warn
        # Gate 1: LOW confidence warning (always show, regardless of budget)
        if budget_conf == "LOW" and not pending.get("low_conf_ack"):
            pending["low_conf_ack"] = True
            reply = (
                "⚠️  Attention : Confiance LOW — nombre de participants "
                f"({pending['ctx'].get('participants')}) en dessous du seuil fiable.\n"
                "Les estimations peuvent etre inexactes.\n\n"
                "Sauvegarder quand meme ? (oui / non / modifier)"
            )
            update_session(session_id, user_input, reply, {})
            return {"status":"low_conf_warning","recommendation":reply}
        # Gate 2: BUDGET_INSUFFICIENT warning
        if has_insuf and not pending.get("insuf_ack"):
            pending["insuf_ack"] = True
            reply = (
                f"⚠️  Attention : {budget_warn}\n\n"
                "Ce budget est insuffisant pour cet evenement.\n"
                "Sauvegarder quand meme ? (oui / non / modifier)"
            )
            update_session(session_id, user_input, reply, {})
            return {"status":"insuf_budget_warning","recommendation":reply}
        # Gate 3a: EXAM_RISK — only Jan & May
        pref_in_exam = pending["ctx"].get("preferred_month",0) in {1, 5}
        if pref_in_exam and not pending.get("exam_ack"):
            pending["exam_ack"] = True
            exam_label = {1:"Jan 10-25", 5:"Mai 10-12"}.get(pending["ctx"]["preferred_month"],"")
            reply = (
                f"⚠️  Attention : Votre mois prefere contient des examens ({exam_label}).\n"
                "Le systeme a choisi un autre mois automatiquement.\n\n"
                "Sauvegarder quand meme ? (oui / non / modifier)"
            )
            update_session(session_id, user_input, reply, {})
            return {"status":"exam_risk_warning","recommendation":reply}
        # Gate 3b: VACATION months — soft warning only
        pref_in_vacation = pending["ctx"].get("preferred_month",0) in {6, 7, 8}
        if pref_in_vacation and not pending.get("vacation_ack"):
            pending["vacation_ack"] = True
            vac_label = {6:"Juin",7:"Juillet",8:"Aout"}.get(pending["ctx"]["preferred_month"],"")
            reply = (
                f"ℹ️  Note : {vac_label} est un mois de vacances universitaires.\n"
                "Les salles principales peuvent etre limitees (Hall Principal disponible).\n\n"
                "Sauvegarder quand meme ? (oui / non / modifier)"
            )
            update_session(session_id, user_input, reply, {})
            return {"status":"vacation_warning","recommendation":reply}
        saved = save_event(
            pending["ctx"], pending["tool_results"],
            pending["budget_warning"], session_id
        )
        del PENDING_CONFIRMATIONS[session_id]
        event_name = f"{saved['event_type']}"
        if saved.get('topic'): event_name += f" — {saved['topic']}"
        
        reply = (
            f"✅ Plan sauvegardé avec succès dans Supabase !\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"ID           : {saved['id']}\n"
            f"Événement    : {event_name}\n"
            f"Participants : {saved['participants']} personnes\n"
            f"Date prévue  : {saved.get('exact_date','N/A')}\n"
            f"Lieu         : {saved.get('venue','N/A')} (cap. {saved.get('venue_capacity','N/A')})\n"
            f"Mois         : {saved.get('recommended_month','N/A')}\n"
            f"Budget estimé: {saved['estimated_budget']} TND\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"Le plan a été sécurisé dans votre base de données."
        )
        update_session(session_id, user_input, reply, {})
        return {"status":"saved","recommendation":reply,"saved_event_id":saved["id"]}

    # ── NO: cancel ────────────────────────────────────────────
    if any(w in t for w in CONFIRM_NO):
        del PENDING_CONFIRMATIONS[session_id]
        reply = (
            "Plan annule.\n\n"
            "Que souhaitez-vous faire ?\n"
            "  - Planifier un nouvel evenement\n"
            "  - Modifier un champ specifique (type / participants / mois / budget / sujet)"
        )
        update_session(session_id, user_input, reply, {})
        return {"status":"cancelled","recommendation":reply}

    # ── MODIFIER (generic) ────────────────────────────────────
    if any(w in t for w in CONFIRM_MOD) and not any(f in t for fields in MOD_FIELDS.values() for f in fields):
        # User said "modifier" without specifying what
        ctx = pending["ctx"]
        reply = (
            f"Que souhaitez-vous modifier ?\n\n"
            f"Plan actuel :\n"
            f"  Type         : {ctx.get('event_type','?')}\n"
            f"  Participants : {ctx.get('participants','?')}\n"
            f"  Mois prefere : {MONTH_NAMES.get(ctx.get('preferred_month',0),'non defini')}\n"
            f"\nRepondez avec : type / participants / mois / jour / sujet"
        )
        update_session(session_id, user_input, reply, {})
        # Keep pending — don't delete it yet
        PENDING_CONFIRMATIONS[session_id]["awaiting_field"] = True
        return {"status":"modify_prompt","recommendation":reply}

    # ── FIELD SPECIFIED (e.g. "type", "mois", "participants") ─
    if pending.get("awaiting_field") or any(w in t for w in CONFIRM_MOD):
        detected_field = None
        for field, keywords in MOD_FIELDS.items():
            if any(kw in t for kw in keywords):
                detected_field = field
                break

        if detected_field:
            # Check if the new value is ALSO in the message (e.g. "conference" or "april" or "300")
            ctx = pending["ctx"].copy()
            updated = False

            if detected_field == "type":
                new_type = next((v for k,v in VALID_TYPES.items() if k in t), None)
                if new_type:
                    ctx["event_type"] = new_type
                    updated = True

            elif detected_field == "participants":
                nm = re.search(r'(\d+)', t)
                if nm:
                    ctx["participants"] = int(nm.group(1))
                    updated = True

            elif detected_field == "mois":
                new_month = next((v for k,v in MONTH_MAP.items() if k in t), 0)
                if new_month:
                    ctx["preferred_month"] = new_month
                    updated = True


            elif detected_field == "jour":
                dm = re.search(r'(\d{1,2})', t)
                if dm:
                    day = int(dm.group(1))
                    if 1 <= day <= 31:
                        ctx["preferred_day"] = day
                        updated = True

            if updated:
                # Value provided in same message — re-run agent with updated ctx
                del PENDING_CONFIRMATIONS[session_id]
                session = get_session(session_id)
                session["last_event"]        = ctx.get("event_type")
                session["last_participants"] = ctx.get("participants")
                update_session(session_id, user_input, "", {})
                return None  # let run_architect_agent re-run with updated session
            else:
                # Field identified but no new value — ask for it
                pending["awaiting_field"] = True
                pending["target_field"]   = detected_field
                reply = _build_modify_prompt(pending["ctx"], detected_field)
                update_session(session_id, user_input, reply, {})
                return {"status":"modify_field_prompt","recommendation":reply,"field":detected_field}

        # ── Value reply for a pending field ───────────────────
        if pending.get("target_field"):
            field = pending["target_field"]
            ctx   = pending["ctx"].copy()
            updated = False

            if field == "type":
                new_type = next((v for k,v in VALID_TYPES.items() if k in t), None)
                if new_type: ctx["event_type"] = new_type; updated = True

            elif field == "participants":
                nm = re.search(r'(\d+)', t)
                if nm: ctx["participants"] = int(nm.group(1)); updated = True

            elif field == "mois":
                new_month = next((v for k,v in MONTH_MAP.items() if k in t), 0)
                if new_month:
                    ctx["preferred_month"] = new_month
                    # Also capture preferred day if given (e.g. "20 aout" → day 20)
                    dm = re.search(r'(\d{1,2})', t)
                    if dm:
                        day = int(dm.group(1))
                        if 1 <= day <= 31:
                            ctx["preferred_day"] = day
                    updated = True


            elif field == "jour":
                dm = re.search(r'(\d{1,2})', t)
                if dm:
                    day = int(dm.group(1))
                    if 1 <= day <= 31:
                        ctx["preferred_day"] = day
                        updated = True
                # Also capture month if user typed "15 juin" instead of just "15"
                new_month = next((v for k,v in MONTH_MAP.items() if k in t), 0)
                if new_month:
                    ctx["preferred_month"] = new_month
                    if not updated:  # even if no day was found, month alone is valid
                        updated = True

            if updated:
                del PENDING_CONFIRMATIONS[session_id]
                session = get_session(session_id)
                session["last_event"]        = ctx.get("event_type")
                session["last_participants"] = ctx.get("participants")
                # Re-run agent immediately with updated context
                _rerun_msg = f"Plan a {ctx['event_type']} for {ctx['participants']} participants"
                if ctx.get("preferred_month"): _rerun_msg += f" in {MONTH_NAMES[ctx['preferred_month']]}"
                if ctx.get("preferred_day"):   _rerun_msg += f" day {ctx['preferred_day']}"
                if ctx.get("user_budget"):     _rerun_msg += f" with budget {ctx['user_budget']} tnd"
                return run_architect_agent(_rerun_msg, session_id)
            else:
                reply = f"Je n'ai pas compris la nouvelle valeur. {_build_modify_prompt(pending['ctx'], field)}"
                update_session(session_id, user_input, reply, {})
                return {"status":"modify_field_retry","recommendation":reply}

    return None  # not a confirmation reply — continue normal flow


def run_architect_agent(user_input: str, session_id: str) -> dict:
    session = get_session(session_id)
    has_history = len(session["history"]) > 0

    # Step 0: Check if this is a confirmation reply
    conf = handle_confirmation(user_input, session_id)
    if conf is not None:
        return conf

    # Step 1: Intent detection
    intent = detect_intent(user_input, has_history)
    if intent:
        update_session(session_id, user_input, INTENT_RESPONSES[intent], {})
        return {"status":"success","recommendation":INTENT_RESPONSES[intent],"intent":intent}

    # Step 2: Extract context (pre-LLM deterministic)
    ctx = extract_context(user_input, session)

    # Step 3: Validate — if critical info missing, ask user
    if "event_type" in ctx["missing"]:
        reply = (
            "I could not identify the event type. "
            "Please specify: Workshop, Conference, or Hackathon.\n"
            "Example: Plan a Workshop for 150 people"
        )
        update_session(session_id, user_input, reply, {})
        return {"status":"needs_info","recommendation":reply,"missing":"event_type"}

    if "participants" in ctx["missing"]:
        reply = (
            f"Got it — you want to plan a {ctx['event_type']}. "
            "How many participants are you expecting?"
        )
        update_session(session_id, user_input, reply, ctx)
        return {"status":"needs_info","recommendation":reply,"missing":"participants"}

    # Step 4: Pre-call all tools deterministically
    budget_result    = forecast_budget(ctx["event_type"], ctx["participants"])
    date_result      = recommend_date(
        ctx["event_type"],
        ctx["avoid_months"],
        ctx["preferred_month"],
        ctx["wants_worst"]
    )
    risk_result      = get_risk_profile(ctx["event_type"])
    benchmark_result = get_event_benchmark(ctx["event_type"], ctx["participants"])
    # Exact date from recommended month
    rec_month_num = next(
        (k for k,v in MONTH_NAMES.items() if v == date_result.get("recommended_month","")), 0
    )
    exact_date_result = pick_exact_date(rec_month_num, preferred_day=ctx.get("preferred_day",0)) if rec_month_num else {"suggested_date":None,"note":"Month unknown"}
    room_result      = recommend_room(ctx["event_type"], ctx["participants"], rec_month_num)

    # Step 5: Budget guard (post-tool, pre-LLM)
    budget_warning = budget_guard(ctx["user_budget"], budget_result)

    # Step 6: Build LLM messages with all pre-computed data + history
    data_context = (
        f"=== PRE-COMPUTED TOOL RESULTS ===\n"
        f"budget_result: {json.dumps(budget_result)}\n"
        f"date_result: {json.dumps(date_result)}\n"
        f"exact_date_result: {json.dumps(exact_date_result)}\n"
        f"room_result: {json.dumps(room_result)}\n"
        f"risk_result: {json.dumps(risk_result)}\n"
        f"benchmark_result: {json.dumps(benchmark_result)}\n"
        f"budget_guard_result: {budget_warning}\n"
        f"user_context: event={ctx['event_type']}, topic={ctx.get('topic','not given')}, "
        f"participants={ctx['participants']}, "
        f"preferred_month={ctx['preferred_month']}, user_budget={ctx['user_budget']}\n"
        f"=== END TOOL RESULTS ===\n"
        f"Now synthesize the above into the report card format."
    )

    messages = [{"role":"system","content":SYSTEM_PROMPT}]
    for h in session["history"]:
        messages.append({"role":h["role"],"content":h["content"]})
    messages.append({"role":"user","content": user_input + "\n\n" + data_context})

    # Step 7: LLM synthesis only — no tool calls allowed
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        temperature=0.1,
        max_tokens=1024
    )
    reply = response.choices[0].message.content

    # ── Post-process: strip forbidden technical lines ──────────
    _FORBIDDEN_PREFIXES = (
        "Date Reason", "Confidence", "Backup Date", "Why ", "Why:",
        "Best Date", "Segment", "rule_applied", "Event Reason",
    )
    _FORBIDDEN_WORDS = [
        "avg_satisfaction", "meeting_conflict_level", "reliable_floor",
        "BR-001", "BR-002", "BR-003", "EXAM_RISK", "NEXT_YEAR",
        "has_projector", "has_wifi", "no_ac",
    ]
    _clean_lines = []
    for _ln in reply.splitlines():
        _stripped = _ln.strip()
        # Skip lines that start with forbidden field names
        if any(_stripped.startswith(_fp) for _fp in _FORBIDDEN_PREFIXES):
            continue
        # Skip lines that contain forbidden technical words
        if any(_fw in _ln for _fw in _FORBIDDEN_WORDS):
            continue
        _clean_lines.append(_ln)
    reply = "\n".join(_clean_lines)

    # Step 8: Update session
    update_session(session_id, user_input, reply, ctx)

    # Step 9: Store pending confirmation — do NOT save yet
    tool_results_bundle = {
        "budget": budget_result, "date": date_result,
        "risk": risk_result,     "benchmark": benchmark_result,
        "room": room_result,     "exact_date": exact_date_result
    }
    PENDING_CONFIRMATIONS[session_id] = {
        "ctx": ctx, "tool_results": tool_results_bundle,
        "budget_warning": budget_warning, "reply": reply
    }

    return {
        "status":           "pending_confirmation",
        "recommendation":   reply,
        "context_used":     ctx,
        "budget_guard":     budget_warning,
        "tool_results":     tool_results_bundle
    }

# ── SCHEMAS ───────────────────────────────────────────────────
class PlanRequest(BaseModel):
    user_input: str
    session_id: str = "default"

class DirectToolRequest(BaseModel):
    event_type: str
    expected_participants: int = 100
    avoid_months: list = []
    preferred_month: int = 0

# ── ENDPOINTS ─────────────────────────────────────────────────
@router.get("/")
def root():
    return {"agent":"L'Architecte v3 CORE/VITAL","status":"online","version":"3.0.0"}

@router.get("/health")
def health():
    return {
        "status":"healthy",
        "version":"3.0.0",
        "groq_key_set":bool(os.environ.get("GROQ_API_KEY")),
        "dataset_events":CTX["meta"]["total_events"],
        "categories":CTX["meta"]["categories"],
        "exam_months":list(EXAM_MONTHS),
        "exam_dates_note":"Jan 10-25 | May 10-12 | June full month"
    }

@router.post("/plan")
def plan_event(req: PlanRequest):
    if not req.user_input.strip():
        raise HTTPException(status_code=400, detail="user_input cannot be empty")
    if not os.environ.get("GROQ_API_KEY"):
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not set in .env")
    return run_architect_agent(req.user_input, req.session_id)

@router.delete("/session/{session_id}")
def clear_session(session_id: str):
    if session_id in SESSION_STORE:
        del SESSION_STORE[session_id]
    return {"status":"cleared","session_id":session_id}

@router.post("/tools/budget")
def tool_budget(req: DirectToolRequest):
    return forecast_budget(req.event_type, req.expected_participants)

@router.post("/tools/date")
def tool_date(req: DirectToolRequest):
    return recommend_date(req.event_type, req.avoid_months, req.preferred_month)

@router.post("/tools/risks")
def tool_risks(req: DirectToolRequest):
    return get_risk_profile(req.event_type)

@router.post("/tools/benchmark")
def tool_benchmark(req: DirectToolRequest):
    return get_event_benchmark(req.event_type, req.expected_participants)


# ── EVENTS CRUD ───────────────────────────────────────────────
@router.get("/events")
def get_all_events():
    db = SessionLocal()
    try:
        events = db.query(Event).order_by(Event.saved_at.desc()).all()
        return {
            "total": len(events),
            "events": [
                {
                    "id": e.id,
                    "event_type": e.event_type,
                    "topic": e.topic,
                    "participants": e.participants,
                    "exact_date": e.exact_date,
                    "venue": e.venue,
                    "estimated_budget": e.estimated_budget,
                    "saved_at": e.saved_at.isoformat()
                } for e in events
            ]
        }
    finally:
        db.close()


@router.get("/events/{event_id}")
def get_event(event_id: str):
    events = load_events()
    ev = next((e for e in events if e["id"] == event_id.upper()), None)
    if not ev:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")
    return ev


@router.patch("/events/{event_id}")
def update_event(event_id: str, updates: dict):
    db = SessionLocal()
    try:
        ev = db.query(Event).filter(Event.id == event_id.upper()).first()
        if not ev:
            raise HTTPException(status_code=404, detail=f"Event {event_id} not found")
        
        for key, value in updates.items():
            if hasattr(ev, key):
                setattr(ev, key, value)
        
        db.commit()
        db.refresh(ev)
        return {"status": "updated", "event": ev}
    finally:
        db.close()

@router.delete("/events/{event_id}")
def delete_event(event_id: str):
    events = load_events()
    filtered = [e for e in events if e["id"] != event_id.upper()]
    if len(filtered) == len(events):
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")
    EVENTS_FILE.write_text(json.dumps(filtered, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"status": "deleted", "event_id": event_id}


@router.delete("/events")
def clear_all_events():
    EVENTS_FILE.write_text("[]", encoding="utf-8")
    return {"status": "cleared"}

app.include_router(router)
