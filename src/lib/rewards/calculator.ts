// ==============================================================================
// Gardenia 2K26 — Milestone 3: Deterministic Reward Engine & Handout Fixture
// ==============================================================================

/**
 * M3-08 — HANDOUT REWARD EXAMPLE
 * Separate test fixture containing exactly the handout's stated values.
 * Never make live calculations dependent on these hardcoded constants.
 */
export const HANDOUT_EXAMPLE_FIXTURE = {
  label: "HANDOUT EXAMPLE FIXTURE",
  description: "Official Handout ₹1,00,000 benchmark distribution",
  totalBudget: 100000,
  platformFee: 9000,
  aiReserve: 4500,
  expertPool: 25500,
  studentPool: 59500,
  expert: {
    name: "Domain Expert",
    reward: 25500,
  },
  students: [
    { name: "Student 1", reward: 25783 },
    { name: "Student 2", reward: 18643 },
    { name: "Student 3", reward: 15074 },
  ],
};

export interface ApprovedContributionItem {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  impactScore: number; // 0 to 5
  quality?: number;
  usefulness?: number;
  evidence?: number;
}

export interface ContributorReward {
  userId: string;
  userName: string;
  creditWeight: number; // sum of approved contribution impact scores
  totalCreditWeight: number;
  shareRatio: number; // e.g. 0.4
  sharePercentage: number; // e.g. 40.0%
  rewardAmount: number; // integer / rounded synthetic currency
  formula: string; // e.g. "₹40,000 × (8 / 20) = ₹16,000"
  contributions: Array<{
    id: string;
    title: string;
    impactScore: number;
  }>;
}

export interface MilestoneRewardBreakdown {
  totalMilestone: number;
  platformFee: number;
  aiReserve: number;
  expertPool: number;
  studentPool: number;
  totalStudentCredits: number;
  contributors: ContributorReward[];
  expert: {
    userName: string;
    rewardAmount: number;
  };
  arithmeticSteps: string[];
}

/**
 * Calculates milestone rewards deterministically.
 * Zero AI involvement — pure server-side arithmetic.
 *
 * Formula:
 * member_reward = student_pool * (member_credit_weight / total_credit_weight)
 */
export function calculateMilestoneRewards(params: {
  totalBudget: number;
  studentPoolOverride?: number;
  expertPoolOverride?: number;
  expertName?: string;
  approvedContributions: ApprovedContributionItem[];
}): MilestoneRewardBreakdown {
  const { totalBudget, studentPoolOverride, expertPoolOverride, expertName, approvedContributions } = params;

  // Standard allocation defaults if not explicitly overridden:
  // Platform fee: 5%, AI reserve: 5%, Expert: 20%, Student pool: 70%
  let platformFee = Math.round(totalBudget * 0.05);
  let aiReserve = Math.round(totalBudget * 0.05);
  let expertPool = expertPoolOverride ?? Math.round(totalBudget * 0.20);
  let studentPool = studentPoolOverride ?? (totalBudget - platformFee - aiReserve - expertPool);

  // If studentPoolOverride was given (e.g. ₹40,000 out of ₹57,143), adjust total
  if (studentPoolOverride && !expertPoolOverride) {
    studentPool = studentPoolOverride;
    expertPool = Math.round(studentPool * 0.25); // e.g. 10000
    platformFee = Math.round(studentPool * 0.075);
    aiReserve = Math.round(studentPool * 0.05);
  }

  // Aggregate credits by student
  const studentMap = new Map<
    string,
    {
      name: string;
      credits: number;
      contributions: Array<{ id: string; title: string; impactScore: number }>;
    }
  >();

  let totalStudentCredits = 0;

  for (const c of approvedContributions) {
    totalStudentCredits += c.impactScore;
    const existing = studentMap.get(c.ownerId) || {
      name: c.ownerName || "Student",
      credits: 0,
      contributions: [],
    };
    existing.credits += c.impactScore;
    existing.contributions.push({
      id: c.id,
      title: c.title,
      impactScore: c.impactScore,
    });
    studentMap.set(c.ownerId, existing);
  }

  // Calculate rewards per student
  const contributors: ContributorReward[] = [];
  const arithmeticSteps: string[] = [
    `Total Milestone Pool: ₹${totalBudget.toLocaleString("en-IN")}`,
    `Platform Fee (5%): ₹${platformFee.toLocaleString("en-IN")}`,
    `AI Reserve (5%): ₹${aiReserve.toLocaleString("en-IN")}`,
    `Expert Pool: ₹${expertPool.toLocaleString("en-IN")}`,
    `Student Pool: ₹${studentPool.toLocaleString("en-IN")}`,
    `Total Approved Student Credits: ${totalStudentCredits}`,
  ];

  for (const [userId, data] of studentMap.entries()) {
    const shareRatio = totalStudentCredits > 0 ? data.credits / totalStudentCredits : 0;
    const sharePercentage = Math.round(shareRatio * 1000) / 10; // 1 decimal place
    const rewardAmount = Math.round(studentPool * shareRatio);
    const formula = `₹${studentPool.toLocaleString("en-IN")} × (${data.credits} / ${totalStudentCredits}) = ₹${rewardAmount.toLocaleString("en-IN")}`;

    contributors.push({
      userId,
      userName: data.name,
      creditWeight: data.credits,
      totalCreditWeight: totalStudentCredits,
      shareRatio,
      sharePercentage,
      rewardAmount,
      formula,
      contributions: data.contributions,
    });

    arithmeticSteps.push(
      `Contributor ${data.name}: ${data.credits} credits / ${totalStudentCredits} (${sharePercentage}%) → ₹${rewardAmount.toLocaleString("en-IN")}`
    );
  }

  return {
    totalMilestone: totalBudget,
    platformFee,
    aiReserve,
    expertPool,
    studentPool,
    totalStudentCredits,
    contributors,
    expert: {
      userName: expertName || "Domain Expert",
      rewardAmount: expertPool,
    },
    arithmeticSteps,
  };
}
