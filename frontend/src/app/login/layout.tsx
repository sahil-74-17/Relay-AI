import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Sign in or register",
  description: "Sign in to Relay, or create a customer account to raise tickets and ask the knowledge-base assistant.",
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
