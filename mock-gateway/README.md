# Mock Payment Gateway

Service Node.js tanpa dependency eksternal yang meniru payment gateway: membangun payload,
menandatangani dengan HMAC-SHA256 per institusi, lalu mengirim webhook ke backend dengan retry.

Format payload, jenis event, kode respons, dan daftar skenario ada di **[docs/WEBHOOK.md](../docs/WEBHOOK.md)**.

## Menjalankan

Lewat Docker Compose (dari root repo), service ini sudah ikut jalan di `http://localhost:4000`.

Secara lokal (Node ≥ 22.9), konfigurasi dibaca dari `mock-gateway/.env` yang dibuat oleh
`./scripts/setup-env.sh` di root repo (secret HMAC otomatis sama dengan backend):

```bash
pnpm start                                                # UI di http://localhost:4000
pnpm send payment.success UCN UKT-20252-2023001 4500000   # atau CLI
```

| Env | Default | Keterangan |
| --- | --- | --- |
| `HMAC_SECRET_<KODE>` | – | Secret per institusi. Hanya institusi yang secret-nya diset yang bisa dipakai. |
| `WEBHOOK_URL` | – (wajib) | Target webhook, mis. `http://localhost:3000/api/v1/webhooks/payment-gateway`. |
| `MAX_RETRIES` | `3` | Retry untuk error jaringan / 5xx. |
| `RETRY_BASE_MS` | `1000` | Backoff awal (dikali 2 setiap retry). |
| `PORT` | `4000` | Port UI/API. |

## Struktur

```
src/gateway.mjs   inti: buildPayload, sign, deliver (retry), runScenario
src/server.mjs    HTTP server: UI (/), GET /api/config, POST /api/events, GET /api/deliveries
src/cli.mjs       picu webhook dari terminal
public/index.html UI sederhana
```
