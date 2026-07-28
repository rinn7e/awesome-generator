import * as t from "io-ts";
import { isLeft } from "fp-ts/Either";
import { PathReporter } from "io-ts/PathReporter";

export const AwesomeItemType = t.intersection([
  t.type({
    title: t.string,
    url: t.string,
    description: t.string,
  }),
  t.partial({
    lastUpdated: t.string,
  }),
]);

export const AwesomeSectionType = t.intersection([
  t.type({
    title: t.string,
    items: t.array(AwesomeItemType),
  }),
  t.partial({
    description: t.string,
  }),
]);

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
    footers: t.array(AwesomeFooterSectionType),
  }),
]);

export type AwesomeItem = t.TypeOf<typeof AwesomeItemType>;
export type AwesomeSection = t.TypeOf<typeof AwesomeSectionType>;
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
