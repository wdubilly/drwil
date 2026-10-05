// Correspondance de motifs partagée par run-checks.mjs (report au pre-commit)
// et check-control-coverage.mjs (couverture CI) : les deux lisent les mêmes
// `chemins` de .drwil/ia-first.json, ils doivent les interpréter pareil.

/** Façon fnmatch de GitLab/GitHub : `**` traverse les `/`, `*` non. */
export function globEnRegex(glob) {
  let sortie = "";
  for (let i = 0; i < glob.length; ) {
    if (glob.startsWith("**/", i)) {
      sortie += "(?:.*/)?";
      i += 3;
    } else if (glob.startsWith("**", i)) {
      sortie += ".*";
      i += 2;
    } else if (glob[i] === "*") {
      sortie += "[^/]*";
      i += 1;
    } else {
      sortie += glob[i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      i += 1;
    }
  }
  return new RegExp(`^${sortie}$`);
}
