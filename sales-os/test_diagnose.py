import requests
from duckduckgo_search import DDGS

print("--- Network Check ---")
try:
    r = requests.get("https://www.google.com", timeout=5)
    print(f"Google Reachable: {r.status_code}")
except Exception as e:
    print(f"Google Unreachable: {e}")

try:
    r = requests.get("https://duckduckgo.com", timeout=5)
    print(f"DDG Reachable: {r.status_code}")
except Exception as e:
    print(f"DDG Unreachable: {e}")

print("\n--- DDG Search Test (ver 8.x) ---")
try:
    ddgs = DDGS()
    # Try different query
    results = list(ddgs.text("test", max_results=3))
    print(f"Query 'test': {len(results)} results")
    for r in results:
        print(f" - {r.get('href', 'no-href')}")
        
    # User query
    u_query = "małe biznesy z dużym potencjałem na sprzedanie usługi strony internetowej"
    print(f"\nQuery '{u_query}' (region='pl-pl'):")
    results = list(ddgs.text(u_query, region="pl-pl", max_results=3))
    print(f"Found: {len(results)}")
    for r in results:
         print(f" - {r.get('href', 'no-href')}")

except Exception as e:
    print(f"DDG Error: {e}")
