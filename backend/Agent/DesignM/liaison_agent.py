
import os, json, re, random, time
from groq import Groq

# ── Creativity pools — picked randomly each generation ────────
HOOKS = [
    "Prêt à changer le jeu ?", "Le futur se construit maintenant.",
    "Une opportunité. Une seule.", "Tu attends quoi exactement ?",
    "Ça commence ici.", "L'histoire s'écrit à l'ISSATKR.",
    "Stop scroller. Lis ça.", "Ton niveau up commence maintenant.",
    "Ce que tu cherchais existe enfin.", "Pas de regrets. Juste de l'action.",
]
CLOSINGS = [
    "On t'attend. Sois là.", "Places limitées — agis vite.",
    "Rejoins la communauté qui construit.", "Le reste, c'est du bruit.",
    "Ta présence fait la différence.", "Ne rate pas ça.",
]
EMAIL_OPENERS = [
    "Dans un secteur en pleine mutation digitale,",
    "Les talents de demain se forment aujourd'hui —",
    "Kasserine est en train d'écrire une nouvelle page tech,",
    "L'innovation ne s'arrête pas aux grandes villes —",
    "Parce que les meilleures opportunités naissent là où on ne les attend pas,",
]
PALETTE_MOODS = [
    "moderne et audacieux", "sobre et professionnel", "vibrant et énergique",
    "minimaliste et épuré", "sombre et premium", "frais et dynamique",
]

# ── TPL Brand Colors ──────────────────────────────────────────
TPL_PALETTE = {
    "green":     {"name": "TPL Vert",         "hex": "#00C897", "usage": "Gradient start, CTA"},
    "blue":      {"name": "TPL Bleu",         "hex": "#00A8E8", "usage": "Gradient end, liens tech"},
    "orange":    {"name": "TPL Orange",       "hex": "#E8820C", "usage": "Variante chaude, hackathon"},
    "dark_red":  {"name": "TPL Rouge Sombre", "hex": "#8B1A00", "usage": "Backgrounds sombres"},
    "white":     {"name": "TPL Blanc",        "hex": "#FFFFFF", "usage": "Icônes, texte sur fond"},
    "off_white": {"name": "TPL Crème",        "hex": "#F5F0E8", "usage": "Texte doux sur fond sombre"},
    "dark":      {"name": "TPL Noir",         "hex": "#1A1A1A", "usage": "Texte principal"},
}

TPL_GRADIENTS = {
    "workshop":   ("from #00C897 to #00A8E8", "Vert → Bleu (éducatif)"),
    "conference": ("from #00A8E8 to #1A1A1A", "Bleu → Noir (pro)"),
    "hackathon":  ("from #E8820C to #8B1A00", "Orange → Rouge (intense)"),
    "tech":       ("from #00C897 to #00A8E8", "Vert → Bleu (défaut)"),
}

EVENT_TONE = {
    "workshop":   {"emoji_set": "🛠️⚡💻🔥✨", "vibe": "éducatif et motivant",    "cta": "Inscris-toi maintenant"},
    "conference": {"emoji_set": "🎤🌟💡🤝📢", "vibe": "professionnel et inspirant","cta": "Réserve ta place"},
    "hackathon":  {"emoji_set": "💻🚀⚡🏆🔐", "vibe": "intense et compétitif",    "cta": "Rejoins le défi"},
}

# ── System prompts ────────────────────────────────────────────
INSTAGRAM_SYSTEM = """
You are DesignM, the social media branding agent for VITAL. 
Your goal is to create high-energy, engaging Instagram post descriptions 
based on event details. Use emojis, hashtags, and a motivational tone.
"""

SPONSORING_SYSTEM = """
You are the VITAL Partnership Agent. Use the provided event data to draft 
a persuasive pitch for potential sponsors. Focus on visibility, impact, and prestige.
"""

COLOR_SYSTEM = """
Analyze the event theme and participants to suggest a premium color palette 
(hex codes) that aligns with the VITAL brand (Teal/Dark/White).
"""

# ── Core functions ────────────────────────────────────────────
def get_client():
    key = os.environ.get("GROQ_API_KEY", "")
    if not key:
        raise ValueError("GROQ_API_KEY not set")
    return Groq(api_key=key)

def _chat(client, system, user, temp=0.75):
    resp = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        temperature=temp,
        max_tokens=1024
    )
    return resp.choices[0].message.content.strip()

# ── Intent detection ─────────────────────────────────────────
INTENT_SYSTEM = """
You are the intent analyzer for VITAL.
Analyze the user input and determine their goal.
- If they greet you: {"intent": "greeting"}
- If they describe an event (even briefly): {"intent": "instagram", "event_description": "USER_DESCRIPTION"}
- If they ask for sponsorship help: {"intent": "sponsoring", "event_description": "USER_DESCRIPTION"}

CRITICAL: If the user provides ANY details about a hackathon, workshop, or event, DO NOT return 'unclear'. 
Extract the details into 'event_description'.

Return ONLY strict valid JSON.
"""

def detect_intent(client, user_input):
    raw = _chat(client, INTENT_SYSTEM, user_input, temp=0.1)
    # Remove markdown code blocks if AI adds them
    raw = raw.replace("```json", "").replace("```", "").strip()
    m = re.search(r"\{.*\}", raw, re.DOTALL)
    if m:
        try:
            data = json.loads(m.group())
            # Ensure we always have an intent if we have a description
            if data.get("event_description") and data.get("intent") == "unclear":
                data["intent"] = "instagram"
            return data
        except Exception:
            pass
    
    # Heuristic fallback: if input looks like a description (more than 3 words), assume it is
    words = user_input.split()
    if len(words) > 3:
        return {"intent": "instagram", "event_description": user_input}
        
    return {"intent": "unclear", "event_description": None, "missing": "description d'événement"}

GREET_REPLY = """
Hello! I am DesignM, your VITAL design and branding assistant. 
I can help you create Instagram posts or sponsoring pitches for your events. 
How can I assist you today?
"""

def run_liaison_agent(description, event_type="workshop", company="TPL — ISIMA"):
    client = get_client()

    # ── Step 1: Intent check ──────────────────────────────────
    intent_data = detect_intent(client, description)
    intent = intent_data.get("intent", "unclear")

    if intent == "greeting":
        return {"type": "greeting", "reply": GREET_REPLY}

    if intent == "question":
        return {"type": "question", "reply": "Je suis spécialisé dans la génération de contenu d'événements. Décris ton événement et je génère Instagram + email + palette 🎨"}

    if intent == "unclear" or not intent_data.get("event_description"):
        missing = intent_data.get("missing", "une description d'événement")
        return {
            "type": "unclear",
            "reply": (
                "Il me faut un peu plus de détails pour générer le contenu.\n\n"
                f"Il manque : **{missing}**\n\n"
                "Exemple valide :\n"
                "> *\"Workshop React.js pour débutants, 80 participants, ISSATKR\"*"
            )
        }

    # ── Step 2: Use cleaned description from intent ───────────
    clean_desc = intent_data.get("event_description") or description

    tone    = EVENT_TONE.get(event_type.lower(), EVENT_TONE["workshop"])
    grad    = TPL_GRADIENTS.get(event_type.lower(), TPL_GRADIENTS["tech"])
    tpl_ctx = ", ".join([v["hex"] + " " + v["name"] for v in TPL_PALETTE.values()])

    # Random creativity seeds — different every call
    hook    = random.choice(HOOKS)
    closing = random.choice(CLOSINGS)
    opener  = random.choice(EMAIL_OPENERS)
    mood    = random.choice(PALETTE_MOODS)
    seed    = random.randint(1000, 9999)

    caption = _chat(client, INSTAGRAM_SYSTEM,
        f"Événement: {clean_desc}\nType: {event_type}\nEmojis: {tone['emoji_set']}\nVibe: {tone['vibe']}\nCTA: {tone['cta']}\n"
        f"Hook suggéré: {hook}\nConclusion suggérée: {closing}\n"
        f"Seed créativité #{seed} — sois original, ne répète pas les formulations précédentes.",
        temp=0.92)

    email = _chat(client, SPONSORING_SYSTEM,
        f"Événement: {clean_desc}\nType: {event_type}\nEntreprise: {company}\n"
        f"Commence le premier paragraphe par: {opener}\n"
        f"Seed #{seed} — varie le style, le ton et les arguments à chaque fois.",
        temp=0.82)

    raw_palette = _chat(client, COLOR_SYSTEM,
        f"Couleurs TPL: {tpl_ctx}\nGradient: {grad[0]} ({grad[1]})\nÉvénement: {clean_desc}\nType: {event_type}\n"
        f"Mood recherché: {mood}\nSeed #{seed} — génère un nom de palette et une inspiration uniques.",
        temp=0.75)

    palette = {}
    m = re.search(r"\{.*\}", raw_palette, re.DOTALL)
    if m:
        try:
            palette = json.loads(m.group())
        except Exception:
            palette = {"error": "parse failed", "raw": raw_palette}
    else:
        palette = {"error": "no json", "raw": raw_palette}

    return {
        "type": "result",
        "instagram_caption": caption,
        "sponsoring_email":  email,
        "color_palette":     palette,
    }

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

router = APIRouter(prefix="/design-master", tags=["Design Master"])

class DesignRequest(BaseModel):
    description: str
    event_type: str = "workshop"
    company: str = "TPL — ISIMA"

@router.post("/generate")
async def generate(req: DesignRequest):
    description = req.description.strip()
    event_type = req.event_type.strip().lower()
    company = req.company.strip()
    
    if not description:
        return {"type": "unclear", "reply": "Entre une description d'événement pour commencer."}
    
    try:
        result = run_liaison_agent(description, event_type, company)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def health():
    return {"status": "ok", "agent": "La Liaison v1"}
