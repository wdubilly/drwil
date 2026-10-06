// `drwil attest <ID>` (DRWIL-013, suite) : preuve humaine explicite et traçable d'un contrat MANUAL.
// Ce n'est pas « l'utilisateur a tapé y » : l'attestation est liée par empreinte au texte du contrat
// et à la définition de sa preuve ; si l'un change, elle devient obsolète et le contrat redevient
// MANUAL. Elle s'enregistre dans .drwil/evidence/attestations/ (versionné, relu en PR).
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { caviarder, DOSSIER_ATTESTATIONS, verify, type Attestation, type ResultatContrat } from "./verify.js";

export interface AttestOptions {
  targetDir: string;
  id: string;
  note?: string;
  /**
   * Confirmation humaine : reçoit le résumé affiché, rend true seulement si l'humain confirme.
   * La CLI exige un terminal interactif et la saisie de l'identifiant du contrat ; aucun drapeau
   * ne permet de s'en passer (un agent ou un script ne peut pas attester à la place d'un humain).
   */
  confirmer: (resume: string) => Promise<boolean>;
  maintenant?: Date;
}

export interface ResultatAttestation {
  /** 0 : enregistrée ; 1 : refusée (non éligible ou non confirmée) ; 2 : contrat inconnu ou configuration invalide. */
  code: 0 | 1 | 2;
  message: string;
  fichier?: string;
}

const NOTE_MAX = 500;

export function resumeContrat(k: ResultatContrat): string {
  const l = [`${k.id} — ${k.titre}`, `Règle : ${k.regle ?? "—"}`];
  if (k.controles.length) l.push("Preuve automatisée :", ...k.controles.map((c) => `  ✓ ${c.id} : ${c.statut}`));
  else l.push("Preuve automatisée : aucune");
  l.push(`Partie humaine à attester : ${k.manuel ?? "contrat historique sans contrôle : toute la preuve"}`);
  return l.join("\n");
}

export async function attester(o: AttestOptions): Promise<ResultatAttestation> {
  const v = await verify({ targetDir: o.targetDir, seulement: [o.id] });
  if (v.erreurs.length && !v.contrats.length) return { code: 2, message: v.erreurs.join(" ; ") };
  const k = v.contrats.find((c) => c.id === o.id);
  if (!k) return { code: 2, message: `contrat inconnu : ${o.id}` };
  if (k.statut === "PASS") return { code: 1, message: `${o.id} est déjà prouvé automatiquement (PASS) : rien à attester` };
  if (k.statut === "ATTESTED") return { code: 1, message: `${o.id} a déjà une attestation valide (${k.attestation?.attestedAt}) : rien à attester` };
  if (!k.attestable) {
    return { code: 1, message: `${o.id} n'est pas attestable (${k.statut}) : seule une partie humaine restante s'atteste, jamais un contrôle en échec, non exécuté ou non applicable — ${k.raisons.join(" ; ")}` };
  }
  if (!(await o.confirmer(resumeContrat(k)))) return { code: 1, message: "attestation refusée : rien n'a été enregistré" };

  const git = (...args: string[]) => {
    const r = spawnSync("git", args, { cwd: o.targetDir, encoding: "utf8" });
    return r.status === 0 && r.stdout.trim() ? r.stdout.trim() : null;
  };
  const nom = git("config", "user.name");
  const maintenant = o.maintenant ?? new Date();
  const attestation: Attestation = {
    version: 1,
    contract: k.id,
    status: "ATTESTED",
    attestedAt: maintenant.toISOString(),
    // Identité déclarative (aucun compte, aucune signature) ; jamais l'e-mail : inutile et personnel.
    actor: nom ? { name: nom, source: "git config user.name, déclaratif" } : null,
    note: o.note ? caviarder(o.note.trim()).slice(0, NOTE_MAX) || null : null,
    fingerprint: k.empreinte,
    commit: git("rev-parse", "HEAD"),
    automated: k.controles.map((c) => ({ id: c.id, status: c.statut })),
  };
  const dossier = join(o.targetDir, ...DOSSIER_ATTESTATIONS);
  mkdirSync(dossier, { recursive: true });
  const fichier = `${k.id}-${attestation.attestedAt.replace(/[:.]/g, "-")}.json`;
  writeFileSync(join(dossier, fichier), JSON.stringify(attestation, null, 2) + "\n");
  return { code: 0, message: `${k.id} attesté`, fichier: [...DOSSIER_ATTESTATIONS, fichier].join("/") };
}
