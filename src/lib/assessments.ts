export type AssessmentKey =
  | "real_estate_capital_readiness"
  | "sme_funding_readiness"
  | "investor_suitability"
  | "sharia_compliance";

export interface AssessmentMeta {
  key: AssessmentKey;
  slug: string;
  title: string;
  short: string;
  description: string;
}

export const ASSESSMENTS: AssessmentMeta[] = [
  {
    key: "real_estate_capital_readiness",
    slug: "real-estate-capital-readiness",
    title: "Real Estate Capital Readiness",
    short: "Assess your project's readiness to attract real estate capital.",
    description:
      "For developers and sponsors raising equity, JV or debt against GCC real estate assets.",
  },
  {
    key: "sme_funding_readiness",
    slug: "sme-funding-readiness",
    title: "SME Funding Readiness",
    short: "Evaluate your company's institutional funding readiness.",
    description:
      "For operating businesses seeking growth equity, private credit or working capital.",
  },
  {
    key: "investor_suitability",
    slug: "investor-suitability",
    title: "Investor Suitability",
    short: "Identify the investor profile most suited to your transaction.",
    description:
      "Maps capital required, structure and geography to the right family office, fund or institutional profile.",
  },
  {
    key: "sharia_compliance",
    slug: "sharia-compliance",
    title: "Sharia Compliance",
    short: "Screen your deal structure for Sharia compliance.",
    description:
      "High-level review of structure, sector and capital stack against Sharia principles.",
  },
];

export const assessmentBySlug = (slug: string) =>
  ASSESSMENTS.find((a) => a.slug === slug);

export const assessmentByKey = (k: string) =>
  ASSESSMENTS.find((a) => a.key === k);
