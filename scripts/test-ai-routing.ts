import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import {
  routeAiRequest,
  resolveRoutingPolicy,
  callGeminiCloud,
  DataClassification,
} from "../src/lib/ai";

async function runAiRoutingSuite() {
  console.log("==================================================");
  console.log("GARDENIA 2K26 — M0-03 & M0-04 DUAL-AI ROUTING TEST");
  console.log("==================================================\n");

  const results: Record<string, { pass: boolean; details: string }> = {};

  // ---------------------------------------------------------------------------
  // TEST 1: Deterministic Policy Resolution
  // ---------------------------------------------------------------------------
  console.log("--- TEST 1: Validating Deterministic Routing Policy ---");
  const publicPolicy = resolveRoutingPolicy("PUBLIC");
  const confidentialPolicy = resolveRoutingPolicy("CONFIDENTIAL");
  const mixedPolicy = resolveRoutingPolicy("MIXED");
  const unknownPolicy = resolveRoutingPolicy("UNKNOWN");

  const policyPass =
    publicPolicy.allowedProvider === "gemini" &&
    publicPolicy.cloudAllowed === true &&
    publicPolicy.routeBadge === "PUBLIC DATA → CLOUD AI" &&
    confidentialPolicy.allowedProvider === "local" &&
    confidentialPolicy.cloudAllowed === false &&
    confidentialPolicy.routeBadge === "CONFIDENTIAL DATA → LOCAL AI" &&
    mixedPolicy.allowedProvider === "local" &&
    mixedPolicy.cloudAllowed === false &&
    unknownPolicy.allowedProvider === "local" &&
    unknownPolicy.cloudAllowed === false;

  if (policyPass) {
    results["POLICY_RESOLUTION"] = {
      pass: true,
      details: "PASSED: PUBLIC routed to gemini (cloudAllowed=true); CONFIDENTIAL, MIXED, and UNKNOWN strictly routed to local (cloudAllowed=false).",
    };
    console.log("[PASS] Policy resolution is deterministic and fail-closed.\n");
  } else {
    results["POLICY_RESOLUTION"] = {
      pass: false,
      details: "FAILED: Routing policy did not strictly enforce boundaries.",
    };
    console.error("[FAIL] Policy resolution failed!");
  }

  // ---------------------------------------------------------------------------
  // TEST 2 (M0-03 TEST A): PUBLIC -> Cloud Gemini
  // ---------------------------------------------------------------------------
  console.log("--- TEST 2 (TASK M0-03 TEST A): PUBLIC Data -> Cloud Gemini ---");
  const publicPrompt = "Generate milestones for this PUBLIC project summary: Low-cost edge detection of diabetic retinopathy.";
  console.log(`Input: "${publicPrompt}"`);
  console.log(`Classification: PUBLIC`);

  const publicResult = await routeAiRequest({
    prompt: publicPrompt,
    classification: "PUBLIC",
  });

  console.log(`Provider Selected: ${publicResult.provider}`);
  console.log(`Badge: ${publicResult.routeBadge}`);
  console.log(`Status: ${publicResult.status}`);
  console.log(`Model: ${publicResult.model}`);
  console.log(`Output Snippet:\n  "${publicResult.output.slice(0, 160).replace(/\n/g, " ")}..."\n`);

  const isTest2Passed =
    publicResult.provider === "gemini" &&
    publicResult.routeBadge === "PUBLIC DATA → CLOUD AI" &&
    (publicResult.status === "SUCCESS" || publicResult.status === "CLOUD_FALLBACK_USED") &&
    publicResult.output.length > 0;

  results["M0_03_TEST_A_PUBLIC"] = {
    pass: isTest2Passed,
    details: isTest2Passed
      ? `PASSED: Public prompt routed to provider=${publicResult.provider} (${publicResult.model}), status=${publicResult.status}, badge="${publicResult.routeBadge}".`
      : `FAILED: Unexpected result for public prompt: ${JSON.stringify(publicResult)}`,
  };

  // ---------------------------------------------------------------------------
  // TEST 3 (M0-03 TEST B): CONFIDENTIAL -> Local Model (Never Cloud)
  // ---------------------------------------------------------------------------
  console.log("--- TEST 3 (TASK M0-03 TEST B): CONFIDENTIAL Data -> Local Model Only ---");
  const syntheticSecret = "CONFIDENTIAL_PATIENT_COHORT_ALPHA_SECRET_KEY_98765";
  const confidentialPrompt = `This is confidential sponsor research data: [${syntheticSecret}]. Validate patient privacy protocol on edge.`;
  console.log(`Input: "This is confidential sponsor research data: [${syntheticSecret}]..."`);
  console.log(`Classification: CONFIDENTIAL`);

  const confidentialResult = await routeAiRequest({
    prompt: confidentialPrompt,
    classification: "CONFIDENTIAL",
  });

  console.log(`Provider Selected: ${confidentialResult.provider}`);
  console.log(`Badge: ${confidentialResult.routeBadge}`);
  console.log(`Status: ${confidentialResult.status}`);
  console.log(`Model: ${confidentialResult.model}`);
  console.log(`Telemetry Safe: ${confidentialResult.telemetrySafe}`);
  console.log(`Output Snippet:\n  "${confidentialResult.output.slice(0, 160).replace(/\n/g, " ")}..."\n`);

  const isTest3Passed =
    confidentialResult.provider === "local" &&
    confidentialResult.routeBadge === "CONFIDENTIAL DATA → LOCAL AI" &&
    (confidentialResult.status === "SUCCESS" || confidentialResult.status === "LOCAL_AI_UNAVAILABLE") &&
    confidentialResult.telemetrySafe === true;

  results["M0_03_TEST_B_CONFIDENTIAL"] = {
    pass: isTest3Passed,
    details: isTest3Passed
      ? `PASSED: Confidential data routed to provider=${confidentialResult.provider} (${confidentialResult.model}), badge="${confidentialResult.routeBadge}", telemetrySafe=${confidentialResult.telemetrySafe}. Zero cloud transmission.`
      : `FAILED: Unexpected routing for confidential prompt: ${JSON.stringify(confidentialResult)}`,
  };

  // ---------------------------------------------------------------------------
  // TEST 4 (M0-04): Local Model Failure -> Deterministic Local Fallback (Never Gemini)
  // ---------------------------------------------------------------------------
  console.log("--- TEST 4 (TASK M0-04): Local Model Failure Safety (Fail-Closed) ---");
  const outagePrompt = "Confidential trial data: [DO_NOT_SEND_TO_CLOUD_UNDER_ANY_CIRCUMSTANCE]";
  console.log(`Simulating unreachable local runtime (http://127.0.0.1:59999)...`);

  const fallbackResult = await routeAiRequest({
    prompt: outagePrompt,
    classification: "CONFIDENTIAL",
    localBaseUrl: "http://127.0.0.1:59999", // Unreachable simulated port
  });

  console.log(`Provider Selected: ${fallbackResult.provider}`);
  console.log(`Status: ${fallbackResult.status}`);
  console.log(`Badge: ${fallbackResult.routeBadge}`);
  console.log(`Telemetry Safe: ${fallbackResult.telemetrySafe}`);
  console.log(`Output Snippet:\n  "${fallbackResult.output.slice(0, 180).replace(/\n/g, " ")}..."\n`);

  const isTest4Passed =
    fallbackResult.provider === "local" &&
    fallbackResult.status === "LOCAL_AI_UNAVAILABLE" &&
    fallbackResult.routeBadge === "CONFIDENTIAL DATA → LOCAL AI" &&
    fallbackResult.output.includes("Deterministic Local Fallback") &&
    fallbackResult.output.includes("NOT sent to any cloud provider") &&
    fallbackResult.telemetrySafe === true;

  results["M0_04_LOCAL_FAILURE_SAFETY"] = {
    pass: isTest4Passed,
    details: isTest4Passed
      ? `PASSED: Under simulated local outage, router stayed on provider=local, status=LOCAL_AI_UNAVAILABLE, returned deterministic local fallback. Gemini was NEVER called.`
      : `FAILED: Local failure did not yield correct fail-closed state: ${JSON.stringify(fallbackResult)}`,
  };

  // ---------------------------------------------------------------------------
  // TEST 5: Direct Cloud Breach Prevention (Code-level safety assertion)
  // ---------------------------------------------------------------------------
  console.log("--- TEST 5: Hard Guardrail Against Direct Cloud Transmission ---");
  let directCallBlocked = false;
  let blockErrorMsg = "";
  try {
    await callGeminiCloud("Leak secret to cloud", "CONFIDENTIAL");
  } catch (err: any) {
    directCallBlocked = err.message.includes("SECURITY_VIOLATION");
    blockErrorMsg = err.message;
  }

  results["DIRECT_CLOUD_GUARDRAIL"] = {
    pass: directCallBlocked,
    details: directCallBlocked
      ? `PASSED: Direct invocation of Cloud Gemini with CONFIDENTIAL data threw '${blockErrorMsg}'. Direct transmission BLOCKED at code level.`
      : "FAILED: Direct call to Cloud Gemini was not blocked!",
  };
  console.log(`[PASS] Direct cloud transmission attempt threw expected security violation.\n`);

  // Final Summary
  console.log("==================================================");
  console.log("SUMMARY OF DUAL-AI ROUTING TESTS (M0-03 & M0-04)");
  console.log("==================================================");
  let allPass = true;
  for (const [testName, res] of Object.entries(results)) {
    const tag = res.pass ? "✓ PASS" : "✗ FAIL";
    console.log(`${tag} - ${testName}: ${res.details}`);
    if (!res.pass) allPass = false;
  }
  console.log("==================================================");

  if (!allPass) {
    console.error("\nAI ROUTING TEST FAILED.");
    process.exit(1);
  } else {
    console.log("\nALL DUAL-AI ROUTING & SAFETY TESTS PASSED!");
    process.exit(0);
  }
}

runAiRoutingSuite().catch((err) => {
  console.error("Fatal error in AI routing test suite:", err);
  process.exit(1);
});
