import { AwesomeList } from "../types";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function formatDescription(desc: string): string {
  let formatted = desc.trim();
  if (!formatted) return "";
  // Capitalize first letter
  formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  // Ensure it ends with a period
  if (!formatted.endsWith(".")) {
    formatted += ".";
  }
  return formatted;
}

export function formatAwesomeList(list: AwesomeList): string {
  const lines: string[] = [];

  // Title with Badge
  lines.push(`# Awesome ${list.title} [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)`);
  lines.push("");

  // Description
  lines.push(list.description.trim());
  lines.push("");

  // Table of Contents
  lines.push("## Contents");
  lines.push("");
  for (const section of list.sections) {
    const anchor = slugify(section.title);
    lines.push(`- [${section.title}](#${anchor})`);
  }
  lines.push("");

  // Sections
  for (const section of list.sections) {
    lines.push(`## ${section.title}`);
    lines.push("");
    if (section.description) {
      lines.push(section.description.trim());
      lines.push("");
    }

    for (const item of section.items) {
      const itemDesc = formatDescription(item.description);
      lines.push(`- [${item.title}](${item.url}) - ${itemDesc}`);
    }
    lines.push("");
  }

  // Footers
  if (list.footers && list.footers.length > 0) {
    for (const footer of list.footers) {
      lines.push(`## ${footer.title}`);
      lines.push("");
      lines.push(footer.content.trim());
      lines.push("");
    }
  } else {
    // Default Footers
    lines.push("## Contributing");
    lines.push("");
    lines.push("Contributions welcome! Read the [contributing guide](contributing.md) first.");
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}

export function formatContributingMd(title: string): string {
  return `# Contributing to Awesome ${title}

Contributions are welcome! Please read these guidelines before submitting a pull request.

## Guidelines

- Search existing entries to avoid duplicates.
- Ensure the link is active and relevant.
- Add items in alphabetical order within the appropriate section.
- Use the format: \`- [Title](URL) - Description.\`
- Start the description with a capital letter and end with a period.
`;
}
