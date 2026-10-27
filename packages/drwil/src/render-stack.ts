// Commands allowed by default per detected stack, split from render.ts (QUA-001).
import type { StackEntry } from "./stack.js";

// Test/lint commands allowed by default in .claude/settings.json, according to the detected technology
// (a model the project completes).
const STACK_ALLOW: Record<string, string[]> = {
  "Node.js": ["npm test:*", "npm run:*", "npx vitest:*", "npx tsc:*", "npx eslint:*"],
  Python: ["pytest:*", "python3 -m pytest:*"],
  Go: ["go test:*", "go build:*"],
  Rust: ["cargo test:*", "cargo build:*"],
  "Java/Maven": ["mvn test:*"],
  "JVM/Gradle": ["./gradlew test:*"],
  ".NET": ["dotnet test:*"],
  Ruby: ["bundle exec rspec:*"],
  PHP: ["composer test:*"],
};

export function stackAllow(stack: StackEntry[]): string {
  const technos = new Set(stack.flatMap((s) => s.technos.flatMap((t) => Object.keys(STACK_ALLOW).filter((k) => t.includes(k)))));
  const commands = [...technos].flatMap((t) => STACK_ALLOW[t]);
  return commands.map((c) => `,\n      "Bash(${c})"`).join("");
}
