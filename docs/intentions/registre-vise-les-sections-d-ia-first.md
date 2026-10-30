# Intention : le registre et les intentions visent le fichier de `docs/ia-first/` qui porte la règle

**Statut** : réalisée et close le 2026-10-30 (journal, entrée « Le registre vise le fichier de section ») ; proposée le 2026-10-30 — limite non traitée de la clôture de `renvois-apres-decoupe` (journal
du 2026-10-30).

## Besoin

Le chantier `renvois-apres-decoupe` a fait viser à QUA-063 (la matrice de compatibilité dit ce qui est tenu,
outil par outil) et à QUA-068 (le lancement d'un chantier sous Gemini est dit dans la matrice) le fichier
`docs/ia-first/6-limits-and-tool-compatibility.md`, où vit la matrice depuis la découpe (QUA-190). D'autres
textes du dépôt visent encore le sommaire `docs/ia-first.md` : le renvoi passe par une étape de plus, et un
agent qui suit la **Source de vérité** d'un contrat ne tombe pas sur la règle.

1. QUA-069 (Copilot CLI enchaîne deux chantiers d'un seul sondage, essai réel attesté) : **Source de vérité**
   = `docs/ia-first.md` (matrice de compatibilité, ligne Copilot CLI), hors du cadrage du chantier.
2. D'autres contrats du registre citent « `docs/ia-first.md` (section 7) » ou « (section 8) », côté dépôt ou
   côté gabarit, en **Périmètre** ou en **Source de vérité** : QUA-153 (le `AGENTS.md` livré est un
   aiguillage de 100 lignes au plus), entre autres.
3. `docs/intentions/compatibilite-des-outils.md` parle de la « matrice de `docs/ia-first.md` ».

## Existant (relevé le 2026-10-30)

- `docs/contracts.md` : `grep -n "docs/ia-first.md" docs/contracts.md` compte 27 lignes ; celle
  de QUA-069 vise la matrice, les autres surtout la section 8 (`docs/ia-first/8-conduct-rules.md`) ou la
  section 7.
- QUA-190 prouve que chaque renvoi du **gabarit** à `docs/ia-first.md` mène à une section existante (le
  sommaire y mène) ; le registre `docs/contracts.md` est propre au dépôt, hors de ce test.
- QUA-069 est attesté par l'humain : changer son champ **Couvre** ferait tomber l'attestation ; sa **Source
  de vérité** n'est pas dans **Couvre**.

## Questions à trancher

- [décision] Réécrire seulement QUA-069 (demandé), ou tous les contrats qui citent `docs/ia-first.md (section
  N)` vers le fichier exact ?
- [décision] Étendre QUA-190 au registre du dépôt (un test refuse « `docs/ia-first.md` (section N) » dans
  `docs/contracts.md`), ou une réécriture unique ?
