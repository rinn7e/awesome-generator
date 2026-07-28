import * as fs from "fs";
import * as path from "path";
import { formatAwesomeList } from "./formatter/awesome-formatter";
import { validateAwesomeList } from "./types";

function parseArgs(): { inputPath: string; outputPath: string } {
  const args = process.argv.slice(2);
  let inputPath = "";
  let outputPath = "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--input" || arg === "-i") {
      inputPath = args[++i];
    } else if (arg === "--output" || arg === "-o") {
      outputPath = args[++i];
    } else if (!inputPath && !arg.startsWith("-")) {
      inputPath = arg;
    } else if (!outputPath && !arg.startsWith("-")) {
      outputPath = arg;
    }
  }

  if (!inputPath || !outputPath) {
    console.error("Error: Missing required arguments.\n");
    console.log("Usage:");
    console.log("  npm run generate -- --input <path/to/input.json> --output <path/to/output.md>");
    console.log("  npx ts-node src/index.ts <path/to/input.json> <path/to/output.md>\n");
    console.log("Example:");
    console.log("  npm run generate -- --input ../awesome-list/awesome-cambodia-jobs/cambodia-jobs.json --output ../awesome-list/awesome-cambodia-jobs/README.md");
    process.exit(1);
  }

  return {
    inputPath: path.resolve(inputPath),
    outputPath: path.resolve(outputPath),
  };
}

function main() {
  const { inputPath, outputPath } = parseArgs();

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file does not exist: ${inputPath}`);
    process.exit(1);
  }

  try {
    // Read raw JSON content
    const rawContent = fs.readFileSync(inputPath, "utf8");
    const rawJson = JSON.parse(rawContent);

    // Validate JSON against io-ts schema
    const validatedList = validateAwesomeList(rawJson);
    console.log(`Successfully validated dataset "${inputPath}" (slug: ${validatedList.slug})`);

    // Ensure output parent directory exists
    const outputDir = path.dirname(outputPath);
    fs.mkdirSync(outputDir, { recursive: true });

    // Format Markdown and write to output destination
    const mdContent = formatAwesomeList(validatedList);
    fs.writeFileSync(outputPath, mdContent, "utf8");

    console.log(`Successfully generated Awesome list README at: ${outputPath}`);
  } catch (err: any) {
    console.error(`Failed to process dataset: ${err?.message || String(err)}`);
    process.exit(1);
  }
}

main();
