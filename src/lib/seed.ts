import { createAdminClient } from "./supabase/server";
import { appendLedgerEntry } from "./ledger";

export const SEED_USERS = [
  {
    email: "sponsor@gardenia.test",
    password: "Password123!",
    role: "sponsor",
    displayName: "Dr. Ramesh (Sponsor)",
    skills: ["Project Management", "Biomedical Engineering"],
    conflict: false,
  },
  {
    email: "student_a@gardenia.test",
    password: "Password123!",
    role: "student",
    displayName: "Arjun (Student A)",
    skills: ["Computer Vision", "PyTorch", "Python", "Edge ML"],
    conflict: false,
  },
  {
    email: "student_b@gardenia.test",
    password: "Password123!",
    role: "student",
    displayName: "Priya (Student B)",
    skills: ["Web Standards", "Data Analysis", "TypeScript"],
    conflict: false,
  },
  {
    email: "student_c@gardenia.test",
    password: "Password123!",
    role: "student",
    displayName: "Kavita (Student C)",
    skills: ["Medical Imaging", "Model Evaluation", "Biostatistics"],
    conflict: false,
  },
  {
    email: "expert@gardenia.test",
    password: "Password123!",
    role: "expert",
    displayName: "Dr. Ananya (Domain Expert)",
    skills: ["Medical Imaging", "Clinical Validation", "Biostatistics"],
    conflict: false,
  },
  {
    email: "conflict_expert@gardenia.test",
    password: "Password123!",
    role: "expert",
    displayName: "Dr. Conflict (Conflicted Expert)",
    skills: ["Computer Vision", "Medical Imaging", "Edge ML"],
    conflict: true,
  },
  {
    email: "admin@gardenia.test",
    password: "Password123!",
    role: "admin",
    displayName: "System Admin",
    skills: ["Audit", "Governance"],
    conflict: false,
  },
];

export async function seedDemoData() {
  const adminClient = createAdminClient();

  // 1. Ensure all synthetic personas exist in auth.users and public.profiles
  const { data: userList, error: listErr } = await adminClient.auth.admin.listUsers();
  if (listErr) throw listErr;

  let sponsorUserId = "";

  for (const u of SEED_USERS) {
    let authUser = userList.users.find((existing) => existing.email === u.email);
    if (!authUser) {
      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { role: u.role, display_name: u.displayName },
      });
      if (createErr) throw createErr;
      authUser = created.user;
    }

    if (u.email === "sponsor@gardenia.test") {
      sponsorUserId = authUser.id;
    }

    // Upsert into public.profiles with skills & conflict flag
    await adminClient.from("profiles").upsert(
      {
        id: authUser.id,
        display_name: u.displayName,
        role: u.role,
        skills: u.skills,
        verified: true,
        conflict_of_interest: u.conflict,
      },
      { onConflict: "id" }
    );
  }

  const sponsorUser = { id: sponsorUserId };

  // 2. Check if canonical funded project exists
  const { data: existingFunded } = await adminClient
    .from("projects")
    .select("id, title")
    .eq("title", "Low-cost detection of diabetic retinopathy from fundus images on edge devices")
    .limit(1);

  let fundedProjId = existingFunded?.[0]?.id;

  if (!fundedProjId) {
    // Seed Canonical Project 1: Funded
    const { data: fundedProj, error: p1Err } = await adminClient
      .from("projects")
      .insert({
        sponsor_id: sponsorUser.id,
        title: "Low-cost detection of diabetic retinopathy from fundus images on edge devices",
        public_summary:
          "Developing edge AI pipelines for early detection of diabetic retinopathy from retinal fundus images in low-bandwidth rural clinical settings.",
        engagement_model: "FUNDED",
        data_sensitivity: "confidential",
        status: "active",
      })
      .select()
      .single();

    if (p1Err || !fundedProj) throw new Error(`Failed to seed funded project: ${p1Err?.message}`);
    fundedProjId = fundedProj.id;

    // Seed separate private brief for Project 1
    await adminClient.from("project_private_briefs").insert({
      project_id: fundedProj.id,
      confidential_brief:
        "CONFIDENTIAL RESEARCH BRIEF: Proprietary edge-optimized MobileNetV4 checkpoint weights (INT8 quantized), anonymized clinical patient cohort metadata (1,240 cases from regional rural health centers), and unpublished validation sensitivity benchmarks against standard hospital OCT scans. STRICTLY RESTRICTED TO ACCEPTED RESEARCH TEAM MEMBERS.",
    });

    // Seed Charter v1 for Project 1
    const { data: charter1 } = await adminClient
      .from("charters")
      .insert({
        project_id: fundedProj.id,
        version: 1,
        engagement_model: "FUNDED",
        budget: 100000,
        milestones_json: [
          {
            id: 1,
            title: "Milestone 1: Edge model benchmark & INT8 optimization",
            budget: 50000,
            description: "Establish baseline latency and quantify accuracy tradeoff on mobile edge hardware.",
            required_skills: ["Computer Vision", "PyTorch", "Edge Inference"],
          },
          {
            id: 2,
            title: "Milestone 2: Clinical dataset validation & reproduction report",
            budget: 50000,
            description: "Validate sensitivity/specificity against anonymized clinical fundus datasets.",
            required_skills: ["Medical Imaging", "Model Evaluation", "Biostatistics"],
          },
        ],
        roles_json: [
          { role: "student", count: 3, focus: "Model training, quantization, benchmarking" },
          { role: "expert", count: 1, focus: "Clinical accuracy review, validation scoring" },
        ],
        ip_terms:
          "Open research with attribution to human contributors; sponsor receives perpetual royalty-free non-exclusive license.",
        publication_terms:
          "Joint academic publication with named human student authors and expert reviewers.",
        confidentiality_terms:
          "Strict on-device processing. Confidential patient cohort data and model checkpoints MUST NEVER be sent to public cloud LLMs.",
        permitted_ai_tools:
          "Local model runtimes (Ollama/on-device) only for confidential briefs. Cloud AI prohibited for patient data.",
        credit_reward_terms:
          "Milestone budget split proportional to reviewed contribution impact scores (0-5 scale). AI does not receive credit.",
        exit_dispute_terms:
          "Contributor may exit with credit retained for reviewed and accepted contributions.",
        sponsor_withdrawal_terms:
          "In case of sponsor withdrawal, all accepted milestone contributions and Research Credits remain fully protected.",
        commercialisation_terms:
          "Non-exclusive commercial deployment with contributor attribution rights.",
      })
      .select()
      .single();

    // Record in Ledger
    await appendLedgerEntry(adminClient, {
      projectId: fundedProj.id,
      actorId: sponsorUser.id,
      action: "PROJECT_POSTED",
      entityType: "project",
      entityId: fundedProj.id,
      payload: {
        title: fundedProj.title,
        engagement_model: fundedProj.engagement_model,
        budget: 100000,
        data_sensitivity: "confidential",
      },
    });

    if (charter1) {
      await appendLedgerEntry(adminClient, {
        projectId: fundedProj.id,
        actorId: sponsorUser.id,
        action: "CHARTER_CREATED",
        entityType: "charter",
        entityId: charter1.id,
        payload: { version: 1, budget: 100000, engagement_model: "FUNDED" },
      });
    }
  }

  // 4. Check & Seed Canonical Project 2: Non-Monetary
  const { data: existingNonMonetary } = await adminClient
    .from("projects")
    .select("id, title")
    .eq("title", "Open-source accessibility benchmark for Indian educational websites")
    .limit(1);

  let nonMonetaryProjId = existingNonMonetary?.[0]?.id;

  if (!nonMonetaryProjId) {
    const { data: nonMonetaryProj, error: p2Err } = await adminClient
      .from("projects")
      .insert({
        sponsor_id: sponsorUser.id,
        title: "Open-source accessibility benchmark for Indian educational websites",
        public_summary:
          "Establishing open-source accessibility audit benchmarks and automated testing suites for central and state educational portals.",
        engagement_model: "KNOWLEDGE-SHARING",
        data_sensitivity: "public",
        status: "active",
      })
      .select()
      .single();

    if (!p2Err && nonMonetaryProj) {
      nonMonetaryProjId = nonMonetaryProj.id;
      await adminClient.from("project_private_briefs").insert({
        project_id: nonMonetaryProj.id,
        confidential_brief:
          "COLLABORATION RESEARCH BRIEF: Public portal audit methodology, automated Puppeteer axe-core scanning scripts, WCAG 2.1 AA checklist mappings for multilingual sites, and verification guidelines.",
      });

      const { data: charter2 } = await adminClient
        .from("charters")
        .insert({
          project_id: nonMonetaryProj.id,
          version: 1,
          engagement_model: "KNOWLEDGE-SHARING",
          budget: 0,
          milestones_json: [
            {
              id: 1,
              title: "Milestone 1: Automated audit harness development",
              budget: 0,
              description: "Build open-source crawler & accessibility scoring scripts.",
              required_skills: ["TypeScript", "Accessibility", "Puppeteer"],
            },
            {
              id: 2,
              title: "Milestone 2: Multi-language educational portal audit report",
              budget: 0,
              description: "Run automated evaluation over 100 educational sites and compile benchmark.",
              required_skills: ["Web Standards", "Data Analysis"],
            },
          ],
          ip_terms: "CC-BY-4.0 Open Source attribution license.",
          publication_terms: "Public open access report with verified student credits.",
          confidentiality_terms: "Public project data; cloud LLM assistance allowed.",
          permitted_ai_tools: "Cloud Gemini allowed for public code generation and scoping.",
          credit_reward_terms:
            "Non-monetary Research Credits, digital verifiable research credential issued on milestone acceptance.",
          sponsor_withdrawal_terms:
            "Open source project remains active in community commons; credits permanently recorded.",
        })
        .select()
        .single();

      await appendLedgerEntry(adminClient, {
        projectId: nonMonetaryProj.id,
        actorId: sponsorUser.id,
        action: "PROJECT_POSTED",
        entityType: "project",
        entityId: nonMonetaryProj.id,
        payload: {
          title: nonMonetaryProj.title,
          engagement_model: "KNOWLEDGE-SHARING",
          budget: 0,
          data_sensitivity: "public",
        },
      });

      if (charter2) {
        await appendLedgerEntry(adminClient, {
          projectId: nonMonetaryProj.id,
          actorId: sponsorUser.id,
          action: "CHARTER_CREATED",
          entityType: "charter",
          entityId: charter2.id,
          payload: { version: 1, budget: 0, engagement_model: "KNOWLEDGE-SHARING" },
        });
      }
    }
  }

  return { status: "SEEDED", fundedProjectId: fundedProjId, nonMonetaryProjectId: nonMonetaryProjId };
}

/**
 * Resets the canonical Gardenia 2K26 demo environment back to the exact initial baseline:
 * - Funded project: status active, escrow UNFUNDED, milestones open, no accepted contributions, charter v1 unaccepted by Arjun.
 * - Non-monetary project: status active, zero payouts, credentials cleared.
 * - Personas: verified, profiles with correct skill vectors and conflict-of-interest flags.
 */
export async function resetDemoData() {
  const adminClient = createAdminClient();

  // 1. Ensure baseline seeding exists
  const seedResult = await seedDemoData();
  const { fundedProjectId, nonMonetaryProjectId } = seedResult;

  if (fundedProjectId) {
    // Reset project status to active
    await adminClient
      .from("projects")
      .update({ status: "active" })
      .eq("id", fundedProjectId);

    // Clear dynamic demo records
    await adminClient.from("disputes").delete().eq("project_id", fundedProjectId);
    await adminClient.from("credentials").delete().eq("project_id", fundedProjectId);
    await adminClient.from("payouts").delete().eq("project_id", fundedProjectId);
    await adminClient.from("contributions").delete().eq("project_id", fundedProjectId);
    await adminClient.from("escrows").delete().eq("project_id", fundedProjectId);

    // Reset milestones
    const { data: milestones } = await adminClient
      .from("milestones")
      .select("id")
      .eq("project_id", fundedProjectId);

    for (const m of milestones || []) {
      await adminClient
        .from("milestones")
        .update({ status: "open" })
        .eq("id", m.id);

      await adminClient.from("escrows").insert({
        project_id: fundedProjectId,
        milestone_id: m.id,
        amount: 50000,
        status: "UNFUNDED",
      });
    }

    // Reset charter acceptances & membership (keep sponsor)
    const { data: charters } = await adminClient
      .from("charters")
      .select("id")
      .eq("project_id", fundedProjectId);

    for (const c of charters || []) {
      await adminClient.from("charter_acceptances").delete().eq("charter_id", c.id);
    }

    // Remove student members so Arjun can demonstrate accepting Charter in live demo
    const { data: sponsorProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("role", "sponsor")
      .limit(1);

    if (sponsorProfile && sponsorProfile.length > 0) {
      await adminClient
        .from("project_members")
        .delete()
        .eq("project_id", fundedProjectId)
        .neq("user_id", sponsorProfile[0].id);
    }
  }

  if (nonMonetaryProjectId) {
    await adminClient
      .from("projects")
      .update({ status: "active" })
      .eq("id", nonMonetaryProjectId);

    await adminClient.from("credentials").delete().eq("project_id", nonMonetaryProjectId);
    await adminClient.from("disputes").delete().eq("project_id", nonMonetaryProjectId);
    await adminClient.from("payouts").delete().eq("project_id", nonMonetaryProjectId);
    await adminClient.from("contributions").delete().eq("project_id", nonMonetaryProjectId);
  }

  return {
    status: "RESET_COMPLETE",
    fundedProjectId,
    nonMonetaryProjectId,
    message: "Canonical demo environment successfully restored to initial baseline.",
  };
}
