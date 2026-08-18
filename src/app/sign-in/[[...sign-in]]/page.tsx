import { SignIn } from "@clerk/nextjs";
import { resolveSafeNext } from "@/lib/auth/safeNext";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const redirectTo = resolveSafeNext(params.next);

  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
      <SignIn fallbackRedirectUrl={redirectTo} signUpFallbackRedirectUrl={redirectTo} />
    </div>
  );
}
