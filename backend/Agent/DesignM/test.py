# test.py
from dotenv import load_dotenv
load_dotenv()

from liaison_agent import run_liaison_agent

result = run_liaison_agent(
    description="Workshop React.js de 3h pour débutants, 80 participants",
    event_type="workshop",
    company="TPL (Tunisie Telecom Poste Logistique)"
)

print(result["instagram_caption"])
print(result["sponsoring_email"])
print(result["color_palette"])