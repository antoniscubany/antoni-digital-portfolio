from duckduckgo_search import DDGS

query = "Logistics Warsaw"
print(f"Testing DDG query: {query}")

try:
    ddgs = DDGS()
    results = list(ddgs.text(query, max_results=5))
    print(f"Found {len(results)} results.")
    for r in results:
        print(f"- {r['href']}")
except Exception as e:
    print(f"Error: {e}")
