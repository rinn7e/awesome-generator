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
  }),
]);

export type AwesomeItem = t.TypeOf<typeof AwesomeItemType>;
export type AwesomeFooterSection = t.TypeOf<typeof AwesomeFooterSectionType>;
export type AwesomeList = t.TypeOf<typeof AwesomeListType>;

export function validateAwesomeList(json: unknown): AwesomeList {
  const result = AwesomeListType.decode(json);
  if (isLeft(result)) {
    const errors = PathReporter.report(result);
    throw new Error(`Invalid AwesomeList JSON schema:\n${errors.join("\n")}`);
  }
  return result.right;
}
