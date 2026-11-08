# Intention : reporter dans le document de compatibilité ce que chaque outil montre de l'accueil de session

**Statut** : à cadrer — notée le 2026-11-08, limite hors cadre du chantier `drwil-serve`. Priorité proposée : P3.

## Besoin

Ce que chaque outil fait du message d'accueil de `drwil serve` n'est relevé que dans une fiche de chantier, qui disparaîtra à
la clôture. Un adoptant doit le trouver dans le document de compatibilité livré.

## Existant

Observé en réel : Claude Code seul. Gemini CLI, Codex, Copilot CLI et Cursor : d'après leur documentation ; pour Gemini CLI et
Codex, elle dit que `systemMessage` est montré à l'humain sans dire qu'il n'atteint pas le modèle (QUA-277 : accueil de session
sans octet au modèle). Fichiers à toucher : `packages/drwil/templates/common/base/docs/ia-first/6-limits-and-tool-compatibility.md`
et sa copie `docs/ia-first/6-limits-and-tool-compatibility.md`. Aucun contrat modifié.

## Questions à trancher

- Essayer réellement Gemini CLI et Codex avant de l'écrire, ou le publier comme relevé sur documentation.
