import json
import urllib.request


REQUEST = urllib.request.Request(
    "http://127.0.0.1:8000/api/auth/send-verification-code",
    data=json.dumps({"email": "elderemperor@yandex.ru"}).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST",
)


def main() -> None:
    with urllib.request.urlopen(REQUEST, timeout=60) as response:
        print(response.read().decode("utf-8"))


if __name__ == "__main__":
    main()
