import { AwesomeList, AwesomeSection } from "../types";

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

function formatDescription(desc?: string): string {
  if (!desc) return "";
  let formatted = desc.trim();
  if (!formatted) return "";
  // Capitalize first letter
  formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  if (!formatted.endsWith(".")) {
    formatted += ".";
  }
  return formatted;
}

function buildTocLines(sections: AwesomeSection[], depth = 1): string[] {
  const lines: string[] = [];
  const indent = "  ".repeat(depth);

  for (const section of sections) {
    const anchor = slugify(section.title);
    lines.push(`${indent}- [${section.title}](#${anchor})`);

    if (section.subsections && section.subsections.length > 0) {
      lines.push(...buildTocLines(section.subsections, depth + 1));
    }
  }

  return lines;
}

function buildSectionLines(sections: AwesomeSection[], depth = 4): string[] {
  const lines: string[] = [];

  for (const section of sections) {
    const headingHashes = "#".repeat(depth);
    lines.push(`${headingHashes} ${section.title}`);
    lines.push("");

    if (section.description) {
      lines.push(section.description.trim());
      lines.push("");
    }

    if (section.items && section.items.length > 0) {
      for (const item of section.items) {
        const formattedDesc = formatDescription(item.description);
        const descSeparator = formattedDesc ? ` - ${formattedDesc}` : "";
        const dateTag = item.lastUpdated ? ` *(${formatDateLabel(item.lastUpdated)})*` : "";
        lines.push(`- [${item.title}](${item.url})${descSeparator}${dateTag}`);
      }
      lines.push("");
    }

    if (section.subsections && section.subsections.length > 0) {
      lines.push(...buildSectionLines(section.subsections, Math.min(depth + 1, 6)));
    }
  }

  return lines;
}

export function formatAwesomeList(list: AwesomeList): string {
  const lines: string[] = [];

  const badgeUrl = list.badgeUrl || "https://awesome.re/badge.svg";
  const badgeLink = list.badgeLink || "https://awesome.re";

  // Title with Badge
  lines.push(`# Awesome ${list.title} [![Awesome](${badgeUrl})](${badgeLink})`);
  lines.push("");

  // Description
  lines.push(list.description.trim());
  lines.push("");
  lines.push("");

  // Table of Contents grouped under main list title like awesome-react
  const titleAnchor = slugify(list.title);
  lines.push(`- [${list.title}](#${titleAnchor})`);
  lines.push(...buildTocLines(list.sections, 1));

  // Add footers to TOC (e.g. - [Contribution](#contribution))
  if (list.footers && list.footers.length > 0) {
    for (const footer of list.footers) {
      lines.push(`- [${footer.title}](#${slugify(footer.title)})`);
    }
  } else {
    lines.push("- [Contribution](#contribution)");
  }
  lines.push("");

  // Main Section Group Header (### Title)
  lines.push(`### ${list.title}`);
  lines.push("");

  // Category Subsections (#### Category)
  lines.push(...buildSectionLines(list.sections, 4));

  // Footers
  if (list.footers && list.footers.length > 0) {
    for (const footer of list.footers) {
      lines.push(`### ${footer.title}`);
      lines.push("");
      lines.push(footer.content.trim());
      lines.push("");
    }
  } else {
    // Default Footer matching awesome-react style
    lines.push("### Contribution");
    lines.push("");
    lines.push(
      "Contributions welcome! Please read the contribution guidelines before submitting a pull request:\n\n" +
      "- Search existing entries to avoid duplicates.\n" +
      "- Ensure the link is active and relevant.\n" +
      "- Add items in alphabetical order within the appropriate section.\n" +
      "- Ensure descriptions start with a capital letter and end with a period."
    );
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}
