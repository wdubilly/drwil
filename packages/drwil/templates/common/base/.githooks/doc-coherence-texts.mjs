// Messages of the documentary coherence, French and English (split from doc-coherence.mjs).

export const TEXTS = {
  fr: {
    openButDone: (brief) => `case ouverte mais la fiche ${brief} se dit déjà terminée (QUA-015)`,
    checkedButOpen: (brief) => `case cochée mais la fiche ${brief} ne se dit pas terminée (QUA-015)`,
    deadClosing: (place, b) => `${place} cite ${b}, qui sera supprimée : à réorienter vers le journal`,
    deadGone: (place, b) => `${place} cite ${b}, déjà retirée : citation à supprimer`,
    codeCite: (place, b) =>
      `${place} cite la fiche de chantier ${b} : réécrire ce commentaire en citant le contrat que ce code sert (la clôture ne touche pas au code) (QUA-049)`,
    intentLeft: (b, i) =>
      `la fiche ${b} est supprimée sans que son intention ${i} soit touchée : la mettre à jour, ou la résumer au journal et la retirer si elle est couverte (QUA-036)`,
    twin: (p, news, old) => `${p} : cité par ${news}${old ? `, déjà cité par ${old}` : ""} — doublon possible, à vérifier`,
  },
  en: {
    openButDone: (brief) => `item unchecked but ${brief} already says it is done (QUA-015)`,
    checkedButOpen: (brief) => `item checked but ${brief} does not say it is done (QUA-015)`,
    deadClosing: (place, b) => `${place} cites ${b}, which will be deleted: to redirect to the journal`,
    deadGone: (place, b) => `${place} cites ${b}, already removed: citation to delete`,
    codeCite: (place, b) =>
      `${place} cites the workstream brief ${b}: rewrite this comment citing the contract this code serves (closing does not touch code) (QUA-049)`,
    intentLeft: (b, i) =>
      `brief ${b} is deleted without touching its intent ${i}: update it, or summarise it in the journal and remove it when covered (QUA-036)`,
    twin: (p, news, old) => `${p}: cited by ${news}${old ? `, already cited by ${old}` : ""} — possible duplicate, to check`,
  },
};
