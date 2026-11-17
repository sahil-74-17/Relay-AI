/** Pure metadata for the design-lab previews (safe to import from server components). */
export type ConceptId = "a" | "b" | "c" | "d";
export type ConceptView = "home" | "auth";

export interface ConceptMeta {
  id: ConceptId;
  name: string;
  style: string;
  blurb: string;
  swatches: string[];
  fonts: string;
}

export const CONCEPTS: ConceptMeta[] = [
  {
    id: "a",
    name: "Atelier",
    style: "Premium SaaS / enterprise",
    blurb: "Editorial restraint, deep navy and warm sand. Signals maturity and care for high-stakes support teams.",
    swatches: ["#0B1B2A", "#F7F4EF", "#1F6F5C", "#B08A4F"],
    fonts: "Serif display + IBM Plex Sans",
  },
  {
    id: "b",
    name: "Signal",
    style: "Modern AI-tech / futuristic",
    blurb: "Dark, instrumented, quietly technical. Cyan-to-violet accents and mono labels put the model front and centre.",
    swatches: ["#05070B", "#0B111C", "#22D3EE", "#818CF8"],
    fonts: "IBM Plex Sans + Plex Mono",
  },
  {
    id: "c",
    name: "Meridian",
    style: "Minimal professional / Swiss",
    blurb: "Type, rules and white space. Almost no colour, so dense operational screens feel calm and legible.",
    swatches: ["#FFFFFF", "#FAFAF9", "#111315", "#1F6F5C"],
    fonts: "IBM Plex Sans only",
  },
  {
    id: "d",
    name: "Verve",
    style: "Bold product-first / visual",
    blurb: "Deep green, lime and cream with chunky rounded surfaces. Confident and memorable without losing clarity.",
    swatches: ["#0C3B2E", "#CBF35C", "#F6F2E7", "#111315"],
    fonts: "IBM Plex Sans, heavy weights",
  },
];

export const conceptById = (id: string): ConceptMeta | undefined =>
  CONCEPTS.find((c) => c.id === id);

export const viewHref = (id: string, view: ConceptView) =>
  view === "auth" ? `/design-lab/${id}/auth` : `/design-lab/${id}`;
