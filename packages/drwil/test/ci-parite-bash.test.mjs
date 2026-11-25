// Tests du paquet : le script du pipeline GitLab livré se lit sous bash 3.2 (macOS), séparé de ci-parite.test.mjs (plus de 180 lignes).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseAllDocuments } from "yaml";
import { DEPOT } from "./kit-commun.mjs";

const GABARIT_GITLAB = join(DEPOT, "packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml");

// bash 3.2 (macOS) compte mal la `)` d'un motif de `case` non parenthésé dans un `$( )` : « syntax error near unexpected token ';;' ».
const casNonParenthese = (script) => {
  const debut = script.indexOf("$(");
  return debut < 0 ? [] : [...script.slice(debut).matchAll(/\bcase\b[^;]*?\bin\s+(?!\()(\S[^)]*\))/g)].map((m) => m[1]);
};

test("QUA-296 : CI GitLab livrée — aucun `case` aux motifs non parenthésés dans un `$( )` (bash 3.2 de macOS)", () => {
  assert.deepEqual(casNonParenthese('x=$( { case "$h" in *" $s "*) echo y;; esac; } | cat )'), ['*" $s "*)'], "le garde voit le défaut");
  assert.deepEqual(casNonParenthese('x=$( { case "$h" in (*" $s "*) echo y;; esac; } | cat )'), []);
  const ci = parseAllDocuments(readFileSync(GABARIT_GITLAB, "utf8"))[0].toJS();
  for (const [job, def] of Object.entries(ci)) {
    for (const ligne of [def?.script, def?.before_script, def?.after_script].flat().filter((l) => typeof l === "string")) {
      assert.deepEqual(casNonParenthese(ligne), [], `${job} : motifs de case à parenthéser dans un $( )`);
    }
  }
});
