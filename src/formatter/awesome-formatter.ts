import { AwesomeList } from "../types";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function formatDateLabel(dateStr: string): string {
  const trimmed = dateStr.trim();
  if (!trimmed) return "";
  const parts = trimmed.split("-");
  if (parts.length >= 2) {
    const year = parts[0];
    const monthNum = parseInt(parts[1], 10);
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    if (monthNum >= 1 && monthNum <= 12) {
      return `${monthNames[monthNum - 1]} ${year}`;
    }
  }
  return trimmed;
}

function formatDescription(desc: string): string {
  let formatted = desc.trim();
  if (!formatted) return "";
  // Capitalize first letter
  formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
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
      const dateTag = item.lastUpdated ? ` *(${formatDateLabel(item.lastUpdated)})*` : "";
      lines.push(`- [${item.title}](${item.url})${dateTag} - ${itemDesc}`);
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
    lines.push("Contributions welcome! Please read the contribution guidelines below before submitting a pull request:");
    lines.push("");
    lines.push("- Search existing entries to avoid duplicates.");
    lines.push("- Ensure the link is active and relevant.");
    lines.push("- Add items in alphabetical order within the appropriate section.");
    lines.push("- Ensure descriptions start with a capital letter and end with a period.");
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}
