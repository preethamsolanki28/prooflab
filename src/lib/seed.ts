import { createAdminClient } from "./supabase/server";
import { appendLedgerEntry } from "./ledger";

export async function seedDemoData() {
  const adminClient = createAdminClient();

  // 1. Ensure Sponsor user exists
  const { data: users, error: listErr } = await adminClient.auth.admin.listUsers();
  if (listErr) throw listErr;

  const sponsorUser = users.users.find((u) => u.email === "sponsor@gardenia.test");
  if (!sponsorUser) {
    throw new Error("Sponsor user sponsor@gardenia.test not found. Run test:m0 or initialize users first.");
  }

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
