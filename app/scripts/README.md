# Import: Omars beholdning (Raschs Vei)

Omformaterer beholdningslisten «Hos meg» til appens v4-datamodell og
kategorier, deduplikerer mot eksisterende verktøy, og registrerer eksemplarer
på Raschs Vei.

## Filer

- `raschsvei-inventory.json` – den menneskelesbare planen (treff + nye verktøy).
- Importlogikken (samme plan) ligger i appen: `src/raschsveiImport.ts`.

## Kjøring

Importen kjøres direkte i appen mens Omar er innlogget:

1. Logg inn som `omar1490@gmail.com`.
2. Åpne profilmenyen (avataren øverst til høyre).
3. Trykk **«Importer beholdning (Raschs Vei)»**.

Knappen gjenbruker appens egen innlogging og Firestore-skriving, så du slipper
konsollen. Den er **idempotent**: den topper opp beholdningen på Raschs Vei til
måltallet i planen i stedet for å legge til blindt, så den er trygg å trykke på
flere ganger. En detaljert rapport logges til DevTools-konsollen.

## Omforming og dedup-logikk

- «Hos meg» → huset `raschsvei`. Antall → antall `ToolInstance` på Raschs Vei.
- Kommentarer om merke/farge/variant (f.eks. «Gult», «DeWalt») legges som
  `label` på eksemplaret; usikkerhet/estimat legges som `notes` på verktøyet.
- Fant vi verktøyet fra før (også under et annet navn), registrerer vi bare et
  eksemplar. Ellers opprettes nytt verktøy.
- Nye verktøy settes til `avansert` (trengs bare på Raschs Vei) slik at import
  av *Omars* beholdning ikke utilsiktet skaper «mangler»-behov på Østerliveien.

### Kategorikartlegging

Kildekategoriene mappes til appens faste kategorier (`categories.ts`):

| Kilde                         | App-kategori                                   |
|-------------------------------|------------------------------------------------|
| Måle- og merkeverktøy         | Måleverktøy / Merkeverktøy                      |
| Skrutrekkere, nøkler og bits  | Skrutrekkere og bits / Nøkler                  |
| Bor og boretilbehør           | Skrutrekkere og bits (jf. «Bits og borsett»)   |
| Sage-, skjære- og hullverktøy | Skjæreverktøy (+ Stiftepistol → Slagverktøy)   |
| Slag-, bryte- og klemmeverktøy| Slagverktøy / Åpne- og riveverktøy / Klemmer og tvinger |
| Elektro- og nettverksverktøy  | Elektrisk håndverktøy                          |
| Uidentifisert verktøy         | Annet (appens fallback-kategori)               |

To nye kategoristrenger innføres fordi appen mangler dekning:

- **Elektroverktøy** for maskiner (DeWalt drill/stikksag/eksentersliper).
  Appens eksisterende «Elektrisk håndverktøy» inneholder *elektrikerverktøy*
  (avisoleringstang, spenningstester …), ikke elektriske maskiner.
- **Annet** (fallback som `migration.ts`/`suggestCategory` allerede bruker) for
  det uidentifiserte verktøyet.

Ukjente kategorier sorteres bakerst i visningen (jf. kommentar i
`categories.ts`), så begge fungerer uten kodeendring.

### Treff mot eksisterende verktøy (annet navn)

| Kilde                              | Eksisterende verktøy        |
|------------------------------------|-----------------------------|
| Vater (langt)                      | Vater lang                  |
| Blyant / merkeblyant               | Snekkerblyant               |
| Kort skrutrekker / bitsholder      | Bitsholder med bitsett      |
| Sammenleggbart unbrakonøkkelsett   | Unbrakonøkkel               |
| Pipesett                           | Pipenøkkelsett              |
| Blandede løse bor + Metabo borsett | Bits og borsett (2 eksempl.)|
| Blikksaks                          | Platesaks                   |
| Hullsagsett + Stor hullsag         | Hullsag (2 eksemplarer)     |
| Snekkerhammer                      | Hammer                      |
| Flatmeisel / brytejern             | Meisel                      |
| Avisolerings-/krympetang           | Avisoleringstang            |

Tommestokk, Skyvelære, Vater lang og Skiftenøkkel hadde allerede eksemplar(er)
på Raschs Vei; top-up gjør at de forblir uendret i stedet for å dobbelttelles.
