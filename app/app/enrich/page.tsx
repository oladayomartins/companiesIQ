import { getCurrentUser } from "@/lib/supabase/server";
import { hasProAccess } from "@/lib/access";
import { ProGate } from "@/components/app/ProGate";
import { EnrichScreen } from "@/components/app/EnrichScreen";

export const dynamic = "force-dynamic";
export const metadata = { title: "Enrich a list · CompaniesIQ" };

export default async function EnrichPage() {
  const user = await getCurrentUser();
  if (!(await hasProAccess(user))) {
    return (
      <ProGate
        shape="table"
        icon="download"
        title="Enrich your list"
        features={[
          "Paste or upload company numbers",
          "Get filing status, owner nationality & an opportunity score for each",
          "Download the enriched list as CSV or save to a prospect list",
        ]}
      />
    );
  }
  return <EnrichScreen />;
}
