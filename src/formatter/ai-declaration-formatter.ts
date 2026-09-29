import { AiDeclaration, AiDeclarationLevel } from "../types";

// Version of the AI-DECLARATION.md standard this formatter emits.
const SPEC_VERSION = "0.1.2";

// Badge colours the standard uses for each level.
const BADGE_COLORS: Record<AiDeclarationLevel, string> = {
  none: "dcfce7",
  hint: "ecfccb",
  assist: "fef9c3",
  pair: "ffedd5",
  copilot: "fee2e2",
  auto: "ede9fe",
};

/** The standard's README badge for a level, linking to the generated AI-DECLARATION.md. */
export function formatAiDeclarationBadge(level: AiDeclarationLevel): string {
  const color = BADGE_COLORS[level];
  return `[![AI-DECLARATION: ${level}](https://img.shields.io/badge/䷼%20AI--DECLARATION-${level}-${color}?labelColor=${color})](AI-DECLARATION.md)`;
}

// Process keys in the order the standard lists them.
const PROCESS_ORDER = [
  "design",
  "implementation",
  "testing",
  "documentation",
  "review",
  "deployment",
] as const;

/**
 * Renders an AI-DECLARATION.md file (https://ai-declaration.md/en/0.1.2): YAML frontmatter with
 * the version and involvement levels, followed by the required `## Notes` section.
 */
export function formatAiDeclaration(declaration: AiDeclaration): string {
  const lines: string[] = [];

  lines.push("---");
  lines.push(`version: "${SPEC_VERSION}"`);
  lines.push(`level: ${declaration.level}`);

  const processes = declaration.processes;
  if (processes) {
    const entries = PROCESS_ORDER.filter((key) => processes[key] !== undefined);
    if (entries.length > 0) {
      lines.push("processes:");
      for (const key of entries) {
        lines.push(`  ${key}: ${processes[key]}`);
      }
    }
  }

  const components = declaration.components;
  if (components && Object.keys(components).length > 0) {
    lines.push("components:");
    for (const [componentPath, level] of Object.entries(components)) {
      // Quote paths so characters such as `/` or `*` stay valid YAML keys.
      lines.push(`  ${JSON.stringify(componentPath)}: ${level}`);
    }
  }

  lines.push("---");
  lines.push("");
  lines.push(`This format is based on [AI-DECLARATION.md](https://ai-declaration.md/en/${SPEC_VERSION}).`);
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  for (const note of declaration.notes) {
    lines.push(`- ${note.trim()}`);
  }
  lines.push("");

  return lines.join("\n");
}
