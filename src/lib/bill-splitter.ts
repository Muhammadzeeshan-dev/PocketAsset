import { formatPkr, parseRupeesToPaisa } from "./finance";

export interface SplitParticipant {
  id: string;
  name: string;
  phone?: string;
  sharePaisa: bigint;
  hasPaid: boolean;
  paidAt?: string;
}

export interface SplitBillGroup {
  id: string;
  title: string;
  totalPaisa: bigint;
  paidBy: string; // e.g. "Me (Muhammad Zeeshan)"
  dateKey: string;
  category: string;
  participants: SplitParticipant[];
  settled: boolean;
  notes?: string;
}

export function createSplitBill(
  title: string,
  totalRupees: string,
  participantNames: string[],
  includeSelf = true,
  category = "Dining & Food",
  dateKey = new Date().toISOString().slice(0, 10)
): SplitBillGroup {
  const totalPaisa = parseRupeesToPaisa(totalRupees);
  const totalPeople = participantNames.length + (includeSelf ? 1 : 0);
  if (totalPeople === 0) throw new Error("At least one participant required.");

  const equalShare = totalPaisa / BigInt(totalPeople);
  let remainder = totalPaisa % BigInt(totalPeople);

  const participants: SplitParticipant[] = [];

  if (includeSelf) {
    participants.push({
      id: "self",
      name: "Me (Organizer)",
      sharePaisa: equalShare + (remainder > 0n ? 1n : 0n),
      hasPaid: true, // You paid the bill initially
      paidAt: new Date().toISOString(),
    });
    if (remainder > 0n) remainder--;
  }

  for (let idx = 0; idx < participantNames.length; idx++) {
    const name = participantNames[idx].trim();
    if (!name) continue;
    const share = equalShare + (remainder > 0n ? 1n : 0n);
    if (remainder > 0n) remainder--;

    participants.push({
      id: `p-${idx + 1}-${Date.now()}`,
      name,
      sharePaisa: share,
      hasPaid: false,
    });
  }

  return {
    id: `split-${Date.now()}`,
    title,
    totalPaisa,
    paidBy: "Me (Muhammad Zeeshan)",
    dateKey,
    category,
    participants,
    settled: false,
  };
}

export function generateWhatsAppReminderMessage(
  bill: SplitBillGroup,
  participant: SplitParticipant,
  paymentDetails = "JazzCash / Easypaisa on 0300-XXXXXXX"
): string {
  const amount = formatPkr(participant.sharePaisa);
  return `Salam ${participant.name}! 😊\n` +
    `Regarding our bill: "${bill.title}" (Total ${formatPkr(bill.totalPaisa)} on ${bill.dateKey}).\n` +
    `Your split share is ${amount}.\n` +
    `Kindly transfer via ${paymentDetails} when convenient. JazakAllah! ✨`;
}

export function calculateSplitSummary(bill: SplitBillGroup) {
  const total = bill.totalPaisa;
  const collected = bill.participants
    .filter((p) => p.hasPaid)
    .reduce((sum, p) => sum + p.sharePaisa, 0n);
  const remaining = total - collected;
  const isFullySettled = remaining === 0n;

  return {
    totalPaisa: total,
    collectedPaisa: collected,
    remainingPaisa: remaining,
    isFullySettled,
  };
}
