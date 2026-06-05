export type PrefetchMode =
  | "recent"
  | "subscriptions"
  | "budgets"
  | "anomalies"
  | "spending";

const MODE_PATTERNS: Array<{ mode: PrefetchMode; pattern: RegExp }> = [
  { mode: "subscriptions", pattern: /\b(subscription|recurring|monthly charge|netflix|spotify)\b/i },
  { mode: "budgets", pattern: /\b(budget|on track|over budget|under budget|limit)\b/i },
  { mode: "anomalies", pattern: /\b(unusual|anomaly|strange|suspicious|weird|odd charge)\b/i },
  {
    mode: "recent",
    pattern: /\b(biggest|largest|recent|last purchase|last transaction|latest|most recent)\b/i,
  },
  {
    mode: "spending",
    pattern: /\b(how much|spend|spent|spending|category|groceries|dining|total|compare|month)\b/i,
  },
];

export function routeChatQuery(message: string): PrefetchMode[] {
  const modes = new Set<PrefetchMode>();
  for (const { mode, pattern } of MODE_PATTERNS) {
    if (pattern.test(message)) modes.add(mode);
  }
  return [...modes];
}

export function needsWebSearch(message: string): boolean {
  return /\b(what is|what's|unknown|unrecognized|charge from|who is|merchant)\b/i.test(message);
}

export function needsMemorySave(message: string): boolean {
  return /\b(remember|i get paid|my salary|don't include|exclude|note that|keep in mind)\b/i.test(
    message
  );
}

/** Fast model only for factual Q&A with prefetch data — never with tool calling */
export function useFastModel(message: string, modes: PrefetchMode[]): boolean {
  if (needsWebSearch(message) || needsMemorySave(message)) return false;
  if (modes.length === 0) return false;
  return modes.every((m) => m === "recent" || m === "spending");
}

export function selectChatStrategy(
  message: string,
  modes: PrefetchMode[],
  hasPrefetchContext: boolean,
  hasReceiptImage: boolean
): { useFastModel: boolean; enableTools: boolean } {
  if (hasReceiptImage) return { useFastModel: false, enableTools: false };

  const needsTools = needsWebSearch(message) || needsMemorySave(message);
  const canUseFast =
    useFastModel(message, modes) && !needsTools && hasPrefetchContext;

  return {
    useFastModel: canUseFast,
    enableTools: !canUseFast && !hasReceiptImage,
  };
}
