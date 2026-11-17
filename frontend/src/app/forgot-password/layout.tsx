import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Request a single-use password reset link for your Relay account.",
};

export default function ForgotPasswordLayout({ children }: { children: ReactNode }) {
  return children;
}
