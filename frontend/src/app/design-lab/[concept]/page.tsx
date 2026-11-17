"use client";
import { notFound, useParams } from "next/navigation";
import { AuthA, HomeA } from "@/components/design-lab/concept-a";
import { AuthB, HomeB } from "@/components/design-lab/concept-b";
import { AuthC, HomeC } from "@/components/design-lab/concept-c";
import { AuthD, HomeD } from "@/components/design-lab/concept-d";
import { conceptById, type ConceptId } from "@/components/design-lab/meta";
import { LabBar } from "@/components/design-lab/shared";

const HOMES = { a: HomeA, b: HomeB, c: HomeC, d: HomeD };
const AUTHS = { a: AuthA, b: AuthB, c: AuthC, d: AuthD };

export default function ConceptHomePage() {
  const params = useParams<{ concept: string }>();
  const concept = conceptById(params.concept);
  if (!concept) notFound();

  const View = HOMES[concept.id as ConceptId];
  return (
    <>
      <LabBar id={concept.id} view="home" />
      <div className="pt-11"><View /></div>
    </>
  );
}
