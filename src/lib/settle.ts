/**
 * Phase 6 §8-A: debt simplification — minimize transactions between N
 * people. Net each person (sum paid − sum owed), then repeatedly pair the
 * largest creditor with the largest debtor. Pure function; pairs live in
 * memory, only "mark settled" writes rows.
 */
export interface MemberNet {
  userId: string;
  /** Positive = the group owes them; negative = they owe the group. */
  net: number;
}

export interface SettlementPair {
  fromUserId: string; // debtor
  toUserId: string; // creditor
  amount: number;
}

export function simplifySettlements(nets: MemberNet[], epsilon = 0.01): SettlementPair[] {
  const creditors = nets.filter((n) => n.net > epsilon).map((n) => ({ ...n }));
  const debtors = nets.filter((n) => n.net < -epsilon).map((n) => ({ ...n }));
  creditors.sort((a, b) => b.net - a.net);
  debtors.sort((a, b) => a.net - b.net);

  const pairs: SettlementPair[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci].net;
    const debt = -debtors[di].net;
    const amount = Math.min(credit, debt);
    if (amount > epsilon) {
      pairs.push({
        fromUserId: debtors[di].userId,
        toUserId: creditors[ci].userId,
        amount: Math.round(amount * 100) / 100,
      });
    }
    creditors[ci].net -= amount;
    debtors[di].net += amount;
    if (creditors[ci].net <= epsilon) ci++;
    if (-debtors[di].net <= epsilon) di++;
  }
  return pairs;
}
