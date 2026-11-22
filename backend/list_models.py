from dotenv import load_dotenv
from google import genai
import os

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

print("\nAvailable Gemini models:\n")

for model in client.models.list():
    actions = model.supported_actions or []

    if "generateContent" in actions:
        print(model.name)