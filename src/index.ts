import * as fs from "fs";
import * as path from "path";
import { cambodiaJobsData } from "./data/cambodia-jobs";
import { formatAwesomeList, formatContributingMd } from "./formatter/awesome-formatter";
import { AwesomeList } from "./types";

function main() {
  const lists: AwesomeList[] = [cambodiaJobsData];

  const outputBaseDir = path.resolve(__dirname, "..", "output");

  for (const list of lists) {
    const slug = list.slug;
    const listOutputDir = path.join(outputBaseDir, slug);

    try {
      // Ensure output directory exists
      fs.mkdirSync(listOutputDir, { recursive: true });

      // Generate README.md
      const mdContent = formatAwesomeList(list);
      const mdPath = path.join(listOutputDir, "README.md");
      fs.writeFileSync(mdPath, mdContent, "utf8");

      // Generate contributing.md
      const contributingContent = formatContributingMd(list.title);
      const contributingPath = path.join(listOutputDir, "contributing.md");
      fs.writeFileSync(contributingPath, contributingContent, "utf8");

      console.log(
        `Successfully generated Awesome list for "${list.title}" at: ${mdPath}`
      );
    } catch (err: any) {
      console.error(
        `Failed to generate Awesome list for "${list.title}": ${err?.message || String(err)}`
      );
      process.exit(1);
    }
  }
}

main();
