import { SignUp } from "@clerk/nextjs";
import { resolveSafeNext } from "@/lib/auth/safeNext";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const redirectTo = resolveSafeNext(params.next);

  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
      <SignUp fallbackRedirectUrl={redirectTo} signInFallbackRedirectUrl={redirectTo} />
    </div>
  );
}
