# Demo-Daten: Nordlicht Gebäudetechnik

Ein erfundener Handwerksbetrieb mit vollständig beantwortetem Blueprint —
gedacht, um Bericht und Leitfaden an einem ganzen Fall zu sehen, ohne die
Daten eines echten Kunden dafür zu benutzen.

## Im Livesystem

Als Administrator unter **/admin/demo**: ein Knopf legt den Betrieb an, ein
zweiter entfernt ihn restlos. Dort werden **keine Benutzerkonten** angelegt —
ein Konto mit bekanntem Kennwort im Produktivsystem wäre eine offene Tür, und
für Bericht und Leitfaden braucht es keines.

Die Firma heißt dort `Nordlicht Gebäudetechnik GmbH (Demo)` und steht in der
Kundenliste zwischen den echten. Nach dem Ansehen wieder entfernen.

Die Logik dahinter liegt in `src/lib/demo/nordlicht.ts`.

## Lokal

Die Skripte hier laufen **nur gegen localhost** — `guard.ts` bricht sonst ab.
Sie legen Testdaten an und löschen vorhandene.

### Datenbank aufsetzen

```bash
su postgres -c "/usr/lib/postgresql/16/bin/initdb -D /var/lib/postgresql/okun/data"
su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/okun/data \
  -l /var/lib/postgresql/okun/log -o '-p 5433' start"
su postgres -c "/usr/lib/postgresql/16/bin/createuser -p 5433 -s okun"
su postgres -c "/usr/lib/postgresql/16/bin/createdb -p 5433 -O okun okun"
su postgres -c "/usr/lib/postgresql/16/bin/psql -p 5433 -c \"ALTER USER okun PASSWORD 'okun'\""

export DATABASE_URL="postgresql://okun:okun@127.0.0.1:5433/okun"
npx prisma db push
# Fragenkatalog und Lerninhalte einspielen (siehe package.json / Startbefehl)
```

### Skripte

| Datei | Zweck |
|---|---|
| `seed.ts` | Legt den Betrieb an (lokal, **mit** Demo-Benutzern) |
| `users.ts` | Legt Mitarbeiterkonten in allen Rollen an |
| `aktivierung.ts` | Spielt die Freischaltung nach Zahlungseingang durch |
| `report.ts` | Gibt die Auswertung auf der Konsole aus |
| `bericht-layout.ts` | Rendert den Kundenbericht mit Platzhaltertexten nach PDF |
| `leitfaden-pdf.ts` | Rendert den Leitfaden mit Platzhaltertexten nach PDF |
| `vollauf.ts` | **Echter Durchlauf** gegen das Modell: Bericht und Leitfaden |
| `pruefe-live-seed.ts` | Prüft `src/lib/demo/nordlicht.ts` (anlegen, zählen, entfernen) |

`vollauf.ts` braucht `ANTHROPIC_API_KEY`. Es geht an R2 und am Mailversand
vorbei — es entstehen nur zwei PDFs im angegebenen Verzeichnis.

```bash
DATABASE_URL="postgresql://okun:okun@127.0.0.1:5433/okun" \
  npx tsx scripts/demo/vollauf.ts /tmp
```

### Die Demo-Benutzer (nur lokal)

`felix@demo.local` (Admin), `clara@demo.local` (Closing),
`samuel@demo.local` (Strategiegespräch), `mira@demo.local` (beides) —
Kennwort `demo-nicht-produktiv`. Diese Konten entstehen ausschließlich über
`users.ts` und niemals im Livesystem.
