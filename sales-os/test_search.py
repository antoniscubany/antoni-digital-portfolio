from googlesearch import search
import sys

query = "małe biznesy z dużym potencjałem na sprzedanie usługi strony internetowej"
print(f"Testing query: {query}")

try:
    count = 0
    for url in search(query, num_results=5, lang="pl"):
        print(f"Found: {url}")
        count += 1
    print(f"Total results: {count}")
except Exception as e:
    print(f"Error: {e}")
