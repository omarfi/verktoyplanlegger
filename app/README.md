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

- Google-innlogging er begrenset til de to godkjente kontoene i `src/store.tsx`.
- Firestore-samlingen `tools` er sannhetskilden for v4-verktøymodellen.
- `src/migration.ts` normaliserer eldre dokumenter og beskytter mot spøkelseseksemplarer.
- Firestore bruker vedvarende flerfane-cache. Headeren viser `Lagrer`, `Lagret`, `Frakoblet` eller `Synkfeil`.
- Skjemaer redigerer lokale utkast og skriver først når brukeren lagrer.
- PWA-shell og service worker gjør appflaten tilgjengelig uten nett; Firestore køer endringer.

## Viktige brukerflyter

- `Alle`, `Handleliste` og `Har` med egne person-/hustoggles.
- Avatarbasert eierskap og behov i vanlig språk på kort og detaljark.
- Hurtigregistrering med eier, bilde, kategoriforslag og duplikatvern.
- Separat lese- og redigeringsmodus med bilde-URL-forhåndsvisning.
- Ett-trykks `Kjøpt ✓`, delbar handleliste og angre på mutasjoner.
- Langtrykk eller profilmeny for sammenslåing; alle bilder, notater, behov og eksemplarer bevares.
