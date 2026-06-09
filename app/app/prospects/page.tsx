import { getCurrentUser } from "@/lib/supabase/server";
import { hasProAccess } from "@/lib/access";
import { getProspectLists, getProspectList } from "@/lib/prospects";
import { ProGate } from "@/components/app/ProGate";
import { ProspectsScreen } from "@/components/app/ProspectsScreen";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prospects · CompaniesIQ" };

export default async function ProspectsPage({ searchParams }: { searchParams: Promise<{ list?: string }> }) {
  const user = await getCurrentUser();
  if (!(await hasProAccess(user))) {
    return (
      <ProGate
        icon="bookmark"
        title="Prospect lists"
        features={[
          "Save qualified companies to lead lists",
          "Capture the opportunity score with each prospect",
          "Export any list to CSV for your CRM or outreach",
        ]}
      />
    );
  }

  const { list } = await searchParams;
  const lists = await getProspectLists();
  const selId = list ?? lists[0]?.id;
  const selected = selId ? await getProspectList(selId) : null;

  return <ProspectsScreen lists={lists} selected={selected} />;
}
