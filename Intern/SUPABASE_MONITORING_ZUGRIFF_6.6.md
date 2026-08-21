# Sicherer Lesezugriff für die Auftragsprüfung 6.6

Die Edge Function `order-monitor-read` gibt ausschließlich den bereits
datensparsam erzeugten Datensatz aus `order_monitor_state` zurück.

## Sicherheitsregeln

- Der Service-Role-Key bleibt ausschließlich in Supabase.
- Der Zugriffsschlüssel darf niemals in GitHub oder im Kalkulator stehen.
- Die Funktion erlaubt nur `GET` und liefert Antworten mit `no-store`.
- Der Schlüssel kann als `Authorization: Bearer ...` übergeben werden.
- Der URL-Parameter `?token=...` ist nur für Clients vorgesehen, die keine
  eigenen HTTP-Header setzen können. Die URL muss wie ein Passwort behandelt
  werden.

## Benötigte Supabase-Secrets

- `ORDER_MONITOR_TOKEN`: zufälliger, langer Zugriffsschlüssel
- `ORDER_MONITOR_USER_ID`: UUID des Kalkulator-Benutzers

`SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` stellt Supabase Edge Functions
automatisch bereit.

## Bereitstellung

```text
supabase functions deploy order-monitor-read --no-verify-jwt
```

`--no-verify-jwt` ist erforderlich, weil die Funktion ihren eigenen, eng
begrenzten Zugriffsschlüssel prüft. Ohne gültigen Schlüssel liefert sie 401.

## Test

Bevorzugt mit Header:

```text
GET https://PROJECT_REF.supabase.co/functions/v1/order-monitor-read
Authorization: Bearer ORDER_MONITOR_TOKEN
```

Alternativ als geheime URL:

```text
https://PROJECT_REF.supabase.co/functions/v1/order-monitor-read?token=ORDER_MONITOR_TOKEN
```
