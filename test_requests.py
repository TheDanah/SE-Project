import requests
import requests
import time

URL = "http://localhost:3000/signup.html"

TOTAL_REQUESTS = 200
DELAY_SECONDS = 1

success = 0
fail = 0

for i in range(1, TOTAL_REQUESTS + 1):
    try:
        response = requests.get(URL)

        if response.status_code == 200:
            success += 1
            print(f"Request {i}: Success (Status {response.status_code})")
        else:
            fail += 1
            print(f"Request {i}: Failed (Status {response.status_code})")

    except Exception as e:
        fail += 1
        print(f"Request {i}: Error {e}")

    time.sleep(DELAY_SECONDS)

print("\n=== FINAL RESULT ===")
print("Success:", success)
print("Failed:", fail)