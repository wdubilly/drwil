# Intention : détection de stack élargie

**Statut** : proposée le 2026-10-26.

## Besoin

Après `init` en version 0.9.0 sur un projet C++ (drwil_dbox, dossier
`drumbox/` avec un CMakeLists.txt), la stack n'est pas détectée : `stack`
et `layers` restent vides dans `.drwil/ia-first.json`. Le demandeur veut que
la détection reconnaisse plus de technologies.

## Existant

Relevé dans `packages/drwil/src/stack.ts` le 2026-10-26 : `detectStack`
regarde la racine et les sous-dossiers directs (un seul niveau) et ne
reconnaît que Node.js, Python, Java/Maven, JVM/Gradle, Go, Rust, PHP, Ruby,
.NET et Dart/Flutter, d'après leurs fichiers de projet.

Non reconnus : C/C++ (CMakeLists.txt, `Makefile`, `meson.build`), Swift
(`Package.swift`, `.xcodeproj`), Elixir (`mix.exs`), Scala (`build.sbt`),
Haskell (stack.yaml, `.cabal`), Clojure (`project.clj`, `deps.edn`), Deno
(deno.json), Terraform (`*.tf`), Python par `Pipfile`, et tout projet
au-delà du premier niveau de sous-dossiers.

Le garde-fou `drwil doctor` ne signale pas une stack vide : l'installation
est dite saine.

## Questions à trancher

- [décision] Quelles technologies ajouter en premier (C/C++ d'abord, puis
  lesquelles) ?
- [décision] Faut-il descendre plus d'un niveau de sous-dossiers, et comment
  éviter les dossiers de dépendances ou de build ?
- [décision] Une stack vide doit-elle être signalée par `doctor` ou
  `verify` (avertissement) plutôt que passer sous silence ?
- [décision] Pour une technologie inconnue, `init` propose-t-il de la
  déclarer à la main (`/drwil-adopt`) ?
- [décision] Ce besoin relève-t-il de drwil-le-livrable (le gabarit
  distribué), seul concerné par stack.ts ?
