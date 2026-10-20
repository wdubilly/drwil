import assert from "node:assert/strict";
import { test } from "node:test";
import { formatVerdict } from "../dist/verdict.js";
import { criteriaTable, durabilityHint, evaluateCriteria } from "../dist/criteria.js";

const contrats = [
  { id: "AUTO-1", status: "PASS", manual: null, checks: [{ id: "x", status: "ok" }] },
  { id: "MAN-1", status: "MANUAL", manual: "relecture", checks: [] },
];
const juger = (link, human) => evaluateCriteria([{ text: "Un critère", link, human }], contrats)[0];

test("QUA-070 : un critère « not-durable » dit s'il faut ajouter ou retirer [humain], et nomme le contrat — un message par sens, deux langues", () => {
  const aAjouter = juger("MAN-1", false);
  const aRetirer = juger("AUTO-1", true);
  assert.equal(aAjouter.status, "not-durable");
  assert.equal(aRetirer.status, "not-durable");
  assert.equal(durabilityHint(aAjouter, "fr"), "MAN-1 est à attester : ajouter [humain] au critère");
  assert.equal(durabilityHint(aRetirer, "fr"), "AUTO-1 est entièrement automatisé : retirer [humain] du critère");
  assert.equal(durabilityHint(aAjouter, "en"), "MAN-1 is attested by a human: add [human] to the criterion");
  assert.equal(durabilityHint(aRetirer, "en"), "AUTO-1 is fully automated: remove [human] from the criterion");
  assert.equal(durabilityHint(juger("AUTO-1", false), "fr"), null, "un critère prouvé n'a rien à changer");
  assert.equal(durabilityHint(juger(null, false), "fr"), null);
});

test("QUA-070 : le message est dans le tableau des critères et dans la sortie lisible de verify", () => {
  const critere = juger("MAN-1", false);
  assert.match(criteriaTable([critere], "fr"), /❌ preuve non durable — MAN-1 est à attester : ajouter \[humain\] au critère \|\n$/);
  assert.match(
    criteriaTable([juger("AUTO-1", true)], "en"),
    /proof not durable — AUTO-1 is fully automated: remove \[human\] from the criterion \|\n$/,
  );
  const verdict = { lang: "fr", status: "FAIL", code: 1, contracts: [], errors: [], unattached: [], criteria: [critere] };
  assert.match(formatVerdict(verdict), /« Un critère » \(not-durable : MAN-1 est à attester : ajouter \[humain\] au critère\)/);
});
