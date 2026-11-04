// QUA-235 : décodeurs des événements documentés, jamais une réponse interprétée du chat.
export const serialise = (value) =>
  JSON.stringify(
    Array.isArray(value)
      ? value.map((v) => JSON.parse(serialise(v)))
      : value && typeof value === "object"
        ? Object.fromEntries(
            Object.keys(value)
              .sort()
              .map((k) => [k, JSON.parse(serialise(value[k]))]),
          )
        : value,
  );

export function nativeAttestationEvent(input, tool, phase) {
  if (tool === "copilot")
    return {
      pre: phase === "pre",
      post: phase === "post",
      session: input?.sessionId,
      agent: input?.agentId ?? null,
      name: input?.toolName,
      args: input?.toolArgs,
      result: input?.toolResult,
    };
  if (tool === "gemini")
    return {
      pre: input?.hook_event_name === "BeforeTool",
      post: input?.hook_event_name === "AfterTool",
      session: input?.session_id,
      agent: null,
      name: input?.tool_name,
      args: input?.tool_input,
      result: input?.tool_response,
    };
  if (tool === "codex")
    return {
      pre: input?.hook_event_name === "PreToolUse",
      post: input?.hook_event_name === "PostToolUse",
      session: input?.session_id,
      agent: input?.agent_id ?? null,
      call: input?.tool_use_id,
      name: input?.tool_name,
      args: input?.tool_input,
      result: input?.tool_response,
    };
  if (tool === "cursor")
    return {
      pre: phase === "pre",
      post: phase === "post",
      session: input?.sessionId,
      agent: null,
      call: input?.params?.toolCallId,
      name: "cursor/ask_question",
      args: input?.params,
      result: input?.response,
    };
  return null;
}

export function portableQuestion(args) {
  return typeof args?.question === "string" ? args.question : (args?.questions?.[0]?.question ?? args?.questions?.[0]?.prompt);
}

export function portableIdentity(args) {
  const text = portableQuestion(args);
  if (typeof text !== "string" || !text.startsWith("drwil-attest-v1 ")) return null;
  const match =
    /^drwil-attest-v1 (copilot|gemini|codex|cursor) ([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\ndrwil-attest ([A-Z][A-Z0-9]*-\d+)( --renew)?\n[\s\S]*\n\n(?:Essai de l'agent|Agent trial):\n([\s\S]+)$/.exec(
      text,
    );
  return match ? { tool: match[1], nonce: match[2], id: match[3], renew: Boolean(match[4]), tried: match[5] } : {};
}

export function nativePositive(event, tool) {
  if (tool === "cursor")
    return (
      serialise(event.result) ===
      serialise({
        outcome: { outcome: "answered", answers: [{ questionId: "drwil_attest", selectedOptionIds: ["attest"] }] },
      })
    );
  if (tool === "copilot")
    return event.result?.resultType === "success" && event.result.textResultForLlm === `User responded: ${event.args.choices[0]}`;
  if (tool === "codex") {
    if (typeof event.result !== "string") return false;
    try {
      const question = event.args.questions[0];
      return serialise(JSON.parse(event.result)) === serialise({ answers: { [question.id]: { answers: [question.options[0].label] } } });
    } catch {
      return false;
    }
  }
  if (event.result?.error || typeof event.result?.llmContent !== "string") return false;
  try {
    const result = JSON.parse(event.result.llmContent);
    return serialise(result) === serialise({ answers: { 0: event.args.questions[0].options[0].label } });
  } catch {
    return false;
  }
}
