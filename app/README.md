# Verktøyplanlegger

En mobil-først, delt verktøy- og handleliste for Raschs Vei og Østerliveien.

## Kjør lokalt

```bash
npm ci
npm run dev
```

Åpne `/verktoyplanlegger/?preview` for å teste grensesnittet med eksempeldata uten å logge inn eller skrive til Firestore.

```bash
npm run lint
npm run build
```

## Data og synk

- Verktøylisten og avatarene kan leses uten innlogging.
- Alle skriveoperasjoner krever Google-innlogging med en av de to godkjente kontoene i `src/store.tsx`.
- `firestore.rules` håndhever offentlig lesing og e-postbegrenset skriving i backend; reglene deployes med `firebase deploy --only firestore:rules`.
- Firestore-samlingen `tools` er sannhetskilden for v5-verktøymodellen, inkludert innkjøpskandidater og valgt produkt per hus.
- `src/migration.ts` normaliserer eldre dokumenter og beskytter mot spøkelseseksemplarer.
- Firestore bruker vedvarende flerfane-cache.
- Skjemaer redigerer lokale utkast og skriver først når brukeren lagrer.
- PWA-shell og service worker gjør appflaten tilgjengelig uten nett; Firestore køer endringer.

## Viktige brukerflyter

- `Alle`, `Handleliste` og `Har` med egne person-/hustoggles.
- `Handleliste` vises som kompakt tabell med små thumbnails, og et eget underfilter (`Alle` / `Kjøp` / `Flytt` / `Kjøp senere`) skiller det som skal kjøpes fra det som skal flyttes.
- `Kjøp senere` utsetter et gjøremål; det skjules fra den aktive listen til det hentes tilbake med `Til handlelisten`.
- Avatarbasert eierskap og behov i vanlig språk på kort og detaljark.
- Hurtigregistrering med eier, bilde, kategoriforslag og duplikatvern.
- Separat lese- og redigeringsmodus med bilde-URL-forhåndsvisning.
- Ett-trykks `Anskaffet`/`Flyttet ✓`, delbar handleliste og angre på mutasjoner.
- Kjøpsrader kan ekspanderes med produktkandidater fra Jula, Biltema, Maxbo og Coop Obs BYGG; valgt kandidat gir stykkpris og totalsum.
- Langtrykk eller duplikatvarselet starter sammenslåing; alle bilder, notater, behov og eksemplarer bevares.

## Innkjøpskandidater

Kandidater registreres helt i klienten uten Firebase Functions eller andre betalbare backend-tjenester. Brukeren limer inn produkt-URL-en, appen foreslår butikk fra domenet, og navn, pris og valgfritt bilde fylles inn manuelt. Valgt kandidat og summer lagres sammen med verktøyet i Firestore.
