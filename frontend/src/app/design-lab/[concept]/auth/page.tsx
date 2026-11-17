"use client";
import { notFound, useParams } from "next/navigation";
import { AuthA } from "@/components/design-lab/concept-a";
import { AuthB } from "@/components/design-lab/concept-b";
import { AuthC } from "@/components/design-lab/concept-c";
import { AuthD } from "@/components/design-lab/concept-d";
import { conceptById, type ConceptId } from "@/components/design-lab/meta";
import { LabBar } from "@/components/design-lab/shared";

const AUTHS = { a: AuthA, b: AuthB, c: AuthC, d: AuthD };

export default function ConceptAuthPage() {
  const params = useParams<{ concept: string }>();
  const concept = conceptById(params.concept);
  if (!concept) notFound();

  const View = AUTHS[concept.id as ConceptId];
  return (
    <>
      <LabBar id={concept.id} view="auth" />
      <div className="pt-11"><View /></div>
    </>
  );
}
