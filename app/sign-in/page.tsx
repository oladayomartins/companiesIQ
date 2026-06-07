import { Suspense } from "react";
import { SignIn } from "@/components/marketing/SignIn";

export const metadata = { title: "Sign in · CompaniesIQ" };

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignIn />
    </Suspense>
  );
}
