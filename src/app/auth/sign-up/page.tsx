import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/auth-layout";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = {
  title: "Create an Account",
  description: "Create your Praise account and start collecting genuine customer testimonials.",
};

export default function SignUpPage() {
  return (
    <AuthLayout visualVariant="sign-up">
      <SignUpForm />
    </AuthLayout>
  );
}
