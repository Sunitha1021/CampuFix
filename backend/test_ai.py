
from ai_service import classify_issue

result = classify_issue(
    "Water leakage in classroom",
    "Water is leaking continuously from the ceiling near the classroom entrance."
)

print("\nAI Classification Result:")
print(result)
