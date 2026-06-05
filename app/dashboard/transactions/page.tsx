import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/db/users";
import { fetchTransactionsForUser } from "@/lib/transactions/fetch";
import { buildTransactionsHref, type TransactionQueryParams } from "@/lib/transactions/filters";
import { TransactionsView } from "@/components/transactions/TransactionsView";

function TransactionsFallback() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-10 w-48 rounded-xl" />
      <div className="skeleton h-32 rounded-2xl" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton h-12 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<TransactionQueryParams>;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const dbUser = await ensureDbUser(
    authUser.id,
    authUser.email!,
    authUser.user_metadata?.full_name ?? undefined
  );

  const params = await searchParams;
  const initialData = await fetchTransactionsForUser(dbUser.id, params);

  if (
    params.page &&
    parseInt(params.page, 10) > initialData.pagination.totalPages &&
    initialData.pagination.total > 0
  ) {
    redirect(
      buildTransactionsHref(params, { page: String(initialData.pagination.totalPages) })
    );
  }

  return (
    <Suspense fallback={<TransactionsFallback />}>
      <TransactionsView initialData={initialData} initialParams={params} />
    </Suspense>
  );
}
