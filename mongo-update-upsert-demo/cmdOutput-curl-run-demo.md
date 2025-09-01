# Command Line Output -/run-demo

```sh
raghavan.muthu@Raghavans-MacBook-Pro mongo-update-upsert-demo % curl -X POST http://localhost:8080/run-demo | jq
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100   407  100   407    0     0  28453      0 --:--:-- --:--:-- --:--:-- 29071
{
  "ok": true,
  "results": {
    "updateExisting": {
      "matched": 1,
      "modified": 0,
      "upsertedId": null
    },
    "updateMissingNoUpsert": {
      "matched": 1,
      "modified": 0,
      "upsertedId": null
    },
    "upsertMissing": {
      "matched": 1,
      "modified": 0,
      "upsertedId": null
    },
    "finalDocs": [
      {
        "email": "aarti@shade.org.in",
        "city": "Chennai (Adyar)",
        "name": "Aarti"
      },
      {
        "email": "missing@example.com",
        "city": "Mumbai",
        "createdAt": "2025-08-31T17:24:16.468Z",
        "tags": [
          "Prospect"
        ]
      }
    ]
  }
}
raghavan.muthu@Raghavans-MacBook-Pro mongo-update-upsert-demo %
```

