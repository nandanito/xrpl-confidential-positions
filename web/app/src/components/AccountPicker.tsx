import { useNavigate } from "@tanstack/react-router";

/**
 * ⚠ A convenience, not a registry. The form below still takes any account and
 * issuance — the buttons only save pasting 34 and 48 characters.
 */
export function AccountPicker({
  to,
  accounts,
  current,
}: {
  to: "/observer" | "/issuer";
  accounts: { address: string; issuanceId: string; label: string; note: string }[];
  current: { account: string; issuanceId: string };
}) {
  const navigate = useNavigate();

  return (
    <div className="mb-4">
      <div className="text-xs uppercase tracking-wide opacity-60 mb-2">Known Devnet accounts</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {accounts.map((a) => {
          const active = a.address === current.account;
          return (
            <button
              key={a.address}
              onClick={() => navigate({ to, search: { account: a.address, issuanceId: a.issuanceId } })}
              className={`text-left border rounded p-3 text-sm transition ${
                active
                  ? "border-[var(--color-hidden)] bg-black/[0.03] dark:bg-white/[0.06]"
                  : "border-black/10 dark:border-white/15 hover:border-black/30 dark:hover:border-white/30"
              }`}
            >
              <div className="font-medium">{a.label}</div>
              <code className="text-[10px] opacity-60 break-all">{a.address}</code>
              <p className="text-xs opacity-75 mt-1">{a.note}</p>
            </button>
          );
        })}
      </div>
      <p className="text-xs opacity-50 mt-2">
        Addresses and issuance ids are public ledger data — anyone with a block explorer reads them.
      </p>
    </div>
  );
}
