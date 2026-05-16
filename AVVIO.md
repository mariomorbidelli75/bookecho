# BookEcho — Guida all'avvio

## Avviare l'app

Apri una finestra PowerShell nella cartella `bookecho` e digita:

```
npm run dev
```

Poi apri il browser su: **http://localhost:3000**

- **Landing page**: http://localhost:3000
- **App libreria**: http://localhost:3000/app
- **Scansiona libro**: http://localhost:3000/app/scan
- **Suggerimenti**: http://localhost:3000/app/suggest

---

## Modalità Demo (attiva per default)

L'app funziona subito con 5 libri di esempio (Eco, Levi, Lampedusa, Saviano, Giordano).
Non serve nessuna API key per testare l'interfaccia.

---

## Aggiungere le API Keys

Modifica il file `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...     # Per descrizioni AI, suggerimenti, annunci
ELEVENLABS_API_KEY=...            # Per i trailer audio in italiano
GOOGLE_BOOKS_API_KEY=...          # Per cercare dati dei libri online
NEXT_PUBLIC_DEMO_MODE=false       # Metti false per usare le API reali
```

Dopo aver aggiunto le key, riavvia il server.

---

## Funzionalità

| Funzione | Come si usa |
|----------|-------------|
| 📚 Libreria | Homepage dell'app con tutti i libri salvati |
| 📷 Scansiona | Fotografa la copertina → il libro viene riconosciuto |
| 🎧 Trailer Audio | Clicca su un libro → "Trailer Audio" → ascolta il riassunto |
| 📈 Valore mercato | Clicca su un libro → "Valore di mercato" → prezzi eBay/Catawiki/Vinted |
| 🛍️ Annuncio di vendita | Clicca su un libro → "Crea annuncio" → copia e incolla |
| ✨ Suggerimenti | Tab "Suggerimenti" → libri consigliati dall'AI |

---

## Deploy su Vercel

Assicurati che la policy PowerShell sia impostata (`RemoteSigned`), poi:

```
npx vercel login
npx vercel --prod
```

Imposta le variabili d'ambiente su Vercel Dashboard → Settings → Environment Variables.
