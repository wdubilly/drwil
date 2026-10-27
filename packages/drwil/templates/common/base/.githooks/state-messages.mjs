// Messages of the transitions and of the state's validation (state-validate.mjs, state-transitions.mjs),
// in the project's language.
import { MESSAGES_EN } from "./state-messages-en.mjs";
import { MESSAGES_FR } from "./state-messages-fr.mjs";

/** Fills the `{0}`, `{1}`… holes of a message. */
export const fill = (message, ...values) => message.replace(/\{(\d)\}/g, (_, i) => values[i]);

export const STATE_MESSAGES = { fr: MESSAGES_FR, en: MESSAGES_EN };
