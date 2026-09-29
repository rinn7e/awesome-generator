import * as t from "io-ts";
import { isLeft } from "fp-ts/Either";
import { PathReporter } from "io-ts/PathReporter";

export const AwesomeItemType = t.intersection([
  t.type({
    title: t.string,
    url: t.string,
  }),
  t.partial({
    description: t.string,
    lastUpdated: t.string,
  }),
]);

export interface AwesomeSection {
  title: string;
  description?: string;
  items?: AwesomeItem[];
  subsections?: AwesomeSection[];
}

export const AwesomeSectionType: t.Type<AwesomeSection> = t.recursion(
  "AwesomeSection",
  () =>
    t.intersection([
      t.type({
        title: t.string,
      }),
      t.partial({
        description: t.string,
        items: t.array(AwesomeItemType),
        subsections: t.array(AwesomeSectionType),
      }),
    ])
);

export const AwesomeFooterSectionType = t.type({
  title: t.string,
  content: t.string,
});

// AI involvement levels of the AI-DECLARATION.md standard (https://ai-declaration.md/en/0.1.2).
export const AiDeclarationLevelType = t.keyof({
  none: null,
  hint: null,
  assist: null,
  pair: null,
  copilot: null,
  auto: null,
});

export const AiDeclarationProcessesType = t.partial({
  design: AiDeclarationLevelType,
  implementation: AiDeclarationLevelType,
  testing: AiDeclarationLevelType,
  documentation: AiDeclarationLevelType,
  review: AiDeclarationLevelType,
  deployment: AiDeclarationLevelType,
});

export const AiDeclarationType = t.intersection([
  t.type({
    level: AiDeclarationLevelType,
    notes: t.array(t.string),
  }),
  t.partial({
    processes: AiDeclarationProcessesType,
    components: t.record(t.string, AiDeclarationLevelType),
  }),
]);

export const AwesomeListType = t.intersection([
  t.type({
    slug: t.string,
    title: t.string,
    description: t.string,
    sections: t.array(AwesomeSectionType),
  }),
  t.partial({
    badgeUrl: t.string,
    badgeLink: t.string,
    footers: t.array(AwesomeFooterSectionType),
    aiDeclaration: AiDeclarationType,
  }),
]);

export type AwesomeItem = t.TypeOf<typeof AwesomeItemType>;
export type AwesomeFooterSection = t.TypeOf<typeof AwesomeFooterSectionType>;
export type AiDeclarationLevel = t.TypeOf<typeof AiDeclarationLevelType>;
export type AiDeclaration = t.TypeOf<typeof AiDeclarationType>;
export type AwesomeList = t.TypeOf<typeof AwesomeListType>;

export function validateAwesomeList(json: unknown): AwesomeList {
  const result = AwesomeListType.decode(json);
  if (isLeft(result)) {
    const errors = PathReporter.report(result);
    throw new Error(`Invalid AwesomeList JSON schema:\n${errors.join("\n")}`);
  }
  const list = result.right;
  // The standard requires a `## Notes` section, so the declaration needs at least one note.
  if (list.aiDeclaration && list.aiDeclaration.notes.length === 0) {
    throw new Error("Invalid AwesomeList JSON schema:\naiDeclaration.notes must contain at least one note");
  }
  return list;
}
