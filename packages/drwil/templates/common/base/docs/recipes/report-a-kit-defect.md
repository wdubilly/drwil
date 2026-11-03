# Recipe: report a kit defect

Goal: prepare a public report to paste into a drwil issue, without exporting
the project's data or contacting a forge.

1. After a failing local check run, run `npx drwil report` in the project.
   The command only reads the language setting, installed kit version and last
   `.drwil/evidence/run-checks-verdicts.json` (if present). It does not rerun
   checks: an old snapshot is not the current state.
2. Read the report before pasting it. It contains the CLI version, a strictly
   numeric installed version when readable, and failed built-in check IDs
   with a normalized public failure message. Raw diagnostics are deliberately
   not copied, even when they appear harmless: masking known secret formats
   cannot guarantee that arbitrary project data is absent.
3. Add the expected behaviour and a minimal reproduction using **fictitious
   data only**, preferably on a new project. Do not paste project names,
   absolute paths, repositories, credentials, configuration, file contents
   or logs. The report's local reproduction command has not been run by
   `report`; it is not a claim that the defect reproduces elsewhere.
4. Paste the reviewed text into an issue in the drwil repository yourself.
   The command does not create an issue, execute a program, write a file,
   or access another repository.

Only these built-in IDs are exported: `secrets`, `docs-references`,
`contract-tests`, `architecture-map`, `scope-gate`, `main-branch`,
`checks-self-test`, `ci-coverage`. Project-specific check names, outputs,
timestamps, fingerprints and all other fields are excluded. Missing,
invalid, oversized or symlinked input is reported as unread, never passed.
A version containing a suffix is excluded rather than risking a private label.
Exit 0 means the report was printed, not that governance passed.

If no failure is exportable, describe the kit's unexpected behaviour using
a fictitious minimal example; never attach the private snapshot or raw log.
