import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const compiledDir = resolve(root, ".tmp/stage3-runtime");
const manifest = JSON.parse(
  readFileSync(resolve(root, "src/domain/himam/stage1-manifest.json"), "utf8"),
);

const failures = [];
const userJourney = [];
const traceability = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function step(collection, message) {
  collection.push(message);
}

function compileDomainRuntime() {
  mkdirSync(compiledDir, { recursive: true });
  const tsc = resolve(root, "node_modules/.bin/tsc.cmd");
  const tscBin = existsSync(tsc) ? tsc : resolve(root, "node_modules/.bin/tsc");
  const files = [
    "src/domain/himam/concepts.ts",
    "src/domain/himam/source-types.ts",
    "src/domain/himam/types.ts",
    "src/domain/himam/schemas.ts",
    "src/domain/himam/validators.ts",
    "src/domain/himam/storage.ts",
    "src/domain/himam/stage2-repositories.ts",
    "src/domain/himam/stage3-catalog.ts",
    "src/domain/himam/stage3-repositories.ts",
    "src/domain/himam/stage3-materializer.ts",
  ];
  const args = [
    "--target",
    "ES2022",
    "--module",
    "CommonJS",
    "--moduleResolution",
    "Node",
    "--skipLibCheck",
    "--strict",
    "--noEmit",
    "false",
    "--outDir",
    compiledDir,
    ...files,
  ];
  const command = [`"${tscBin}"`, ...args.map((arg) => `"${arg}"`)].join(" ");
  const result = spawnSync(command, {
    cwd: root,
    encoding: "utf8",
    shell: true,
  });

  if (result.status !== 0) {
    failures.push(`Stage 3 runtime compilation failed: ${result.stderr || result.stdout}`);
  }
  writeFileSync(resolve(compiledDir, "package.json"), '{"type":"commonjs"}\n');
}

function validSourceRef(sourceRef) {
  return Boolean(
    sourceRef &&
      manifest.sourceTypes.includes(sourceRef.sourceType) &&
      sourceRef.sourcePackage &&
      sourceRef.sourceRecordType &&
      sourceRef.sourceId,
  );
}

compileDomainRuntime();

if (failures.length === 0) {
  const require = createRequire(import.meta.url);
  const { createMemoryStore } = require(resolve(compiledDir, "storage.js"));
  const {
    STAGE3_INFORMATION_TOOLS,
    STAGE3_TOOL_CATALOG_VERSION,
    getStage3InformationTool,
    validateStage3ToolCatalog,
  } = require(resolve(compiledDir, "stage3-catalog.js"));
  const { createStage2Repositories } = require(resolve(compiledDir, "stage2-repositories.js"));
  const {
    createStage3Repositories,
    STAGE3_STORAGE_KEYS,
  } = require(resolve(compiledDir, "stage3-repositories.js"));
  const {
    createToolAdministration,
    createStructuredResponse,
    materializeEvidenceRecord,
    materializeKnowledgeSupportItem,
    createInferenceSuggestionFromResponse,
  } = require(resolve(compiledDir, "stage3-materializer.js"));
  const { validateStructuredResponse } = require(resolve(compiledDir, "validators.js"));

  const catalogValidation = validateStage3ToolCatalog();
  assert(catalogValidation.ok, `Stage 3 catalog should validate: ${JSON.stringify(catalogValidation.issues)}`);
  assert(STAGE3_TOOL_CATALOG_VERSION === "himam-stage3-tools-v1.0", "Stage 3 catalog version should be stable");
  assert(STAGE3_INFORMATION_TOOLS.length >= 5, "Stage 3 catalog should include at least five MVP tools");
  assert(
    STAGE3_INFORMATION_TOOLS.every((tool) =>
      tool.questions.every((question) =>
        question.conceptIds.every((conceptId) => manifest.conceptIds.includes(conceptId)),
      ),
    ),
    "All Stage 3 catalog concept IDs should be official Himam concepts",
  );
  assert(
    STAGE3_INFORMATION_TOOLS.filter((tool) =>
      ["LEARNER_VOICE", "FAMILY_VISION", "INTEREST_SURVEY", "INCLINATION_SURVEY"].includes(tool.category),
    ).every((tool) => tool.questions.every((question) => question.outputChannel !== "EVIDENCE_RECORD")),
    "Voice, family, interest, and inclination tools must not create level evidence",
  );
  assert(
    STAGE3_INFORMATION_TOOLS.filter((tool) => tool.category === "TRANSITION_SURVEY_CHECKLIST").length >= 6,
    "Stage 3 catalog should include transition survey/checklist tools",
  );
  assert(
    [
      "IEP_DISABILITY_AWARENESS_CHECKLIST",
      "FAMILY_TRANSITION_ASSESSMENT_INVOLVEMENT",
      "ADOLESCENT_AUTONOMY_CHECKLIST_REFERENCE",
      "FAMILY_VISION_SNAPSHOT",
      "FAMILY_VISION_PICTURE_CARDS",
    ].every((toolId) => STAGE3_INFORMATION_TOOLS.some((tool) => tool.toolId === toolId)),
    "Final transition assessment pack tools should be represented in Stage 3 catalog",
  );
  assert(
    STAGE3_INFORMATION_TOOLS.filter((tool) =>
      ["IEP_DISABILITY_AWARENESS_CHECKLIST", "FAMILY_TRANSITION_ASSESSMENT_INVOLVEMENT", "ADOLESCENT_AUTONOMY_CHECKLIST_REFERENCE", "FAMILY_VISION_SNAPSHOT", "FAMILY_VISION_PICTURE_CARDS"].includes(tool.toolId),
    ).every((tool) => tool.questions.every((question) => question.outputChannel === "KNOWLEDGE_SUPPORT_ITEM")),
    "Final transition assessment pack tools must remain KSI only",
  );
  assert(
    STAGE3_INFORMATION_TOOLS.filter((tool) => tool.category === "PERSON_CENTERED_PLANNING").length >= 7,
    "Stage 3 catalog should include person-centered planning tools",
  );
  assert(
    STAGE3_INFORMATION_TOOLS.filter((tool) => tool.category === "PERSON_CENTERED_PLANNING")
      .every((tool) => tool.questions.every((question) => question.outputChannel === "KNOWLEDGE_SUPPORT_ITEM")),
    "Person-centered planning tools must remain KnowledgeSupportItem only",
  );
  step(userJourney, "Loaded and validated controlled Stage 3 information tool catalog");

  const store = createMemoryStore();
  const stage2 = createStage2Repositories(store);
  const stage3 = createStage3Repositories(store);
  const now = "2026-08-09T00:00:00.000Z";
  const learnerId = "learner-age-14-plus";

  const assessmentAdministration = createToolAdministration({
    administrationId: "stage3-admin-assessment-1",
    learnerId,
    toolId: "HIMAM_INSTITUTIONAL_ASSESSMENT_CORE",
    administeredByRole: "SPECIALIST",
    administeredAt: now,
  });
  assert(stage3.administrations.save(assessmentAdministration).ok, "Assessment administration should save");
  step(userJourney, "Created institutional assessment ToolAdministration");

  const assessmentResponse = createStructuredResponse({
    responseId: "stage3-response-assessment-1",
    administration: assessmentAdministration,
    questionId: "safety_current_performance",
    responseCode: "WITH_SUPPORT",
    selectedOptionIds: ["with_support"],
    capturedAt: now,
  });
  assert(stage3.responses.save(assessmentResponse).ok, "Assessment StructuredResponse should save");
  const evidence = materializeEvidenceRecord(assessmentResponse);
  assert(evidence && stage2.evidence.save(evidence).ok, "Assessment response should materialize accepted EvidenceRecord");
  assert(evidence?.eligibleForLevelEngine === true, "Assessment EvidenceRecord should be level eligible");
  step(userJourney, "Converted institutional assessment response to EvidenceRecord");

  const notObservedResponse = createStructuredResponse({
    responseId: "stage3-response-assessment-not-observed",
    administration: assessmentAdministration,
    questionId: "safety_current_performance",
    responseCode: "NOT_OBSERVED",
    selectedOptionIds: ["not_observed"],
    capturedAt: now,
  });
  assert(materializeEvidenceRecord(notObservedResponse) === null, "NOT_OBSERVED must not create EvidenceRecord");
  step(userJourney, "Prevented NOT_OBSERVED assessment response from becoming EvidenceRecord");

  const learnerVoiceAdministration = createToolAdministration({
    administrationId: "stage3-admin-voice-1",
    learnerId,
    toolId: "HIMAM_LEARNER_VOICE_CORE",
    administeredByRole: "SPECIALIST",
    administeredAt: now,
  });
  assert(stage3.administrations.save(learnerVoiceAdministration).ok, "Learner voice administration should save");
  const learnerVoiceResponse = createStructuredResponse({
    responseId: "stage3-response-voice-1",
    administration: learnerVoiceAdministration,
    questionId: "learner_preferred_activity",
    responseCode: "LIKES_TECH_ACTIVITIES",
    valueText: "Learner shows preference for simple technology activities.",
    capturedAt: now,
  });
  assert(stage3.responses.save(learnerVoiceResponse).ok, "Learner voice StructuredResponse should save");
  assert(materializeEvidenceRecord(learnerVoiceResponse) === null, "Learner voice must not create EvidenceRecord");
  const learnerKsi = materializeKnowledgeSupportItem(learnerVoiceResponse);
  assert(learnerKsi && stage2.knowledgeSupport.save(learnerKsi).ok, "Learner voice should materialize KSI");
  assert(learnerKsi?.eligibleForLevelEngine === false, "Learner voice KSI must remain level-ineligible");
  step(userJourney, "Converted learner voice response to KSI only");

  const inclinationAdministration = createToolAdministration({
    administrationId: "stage3-admin-inclination-1",
    learnerId,
    toolId: "HIMAM_INCLINATION_SURVEY_14_PLUS",
    administeredByRole: "SPECIALIST",
    administeredAt: now,
  });
  assert(stage3.administrations.save(inclinationAdministration).ok, "Inclination administration should save");
  const inclinationResponse = createStructuredResponse({
    responseId: "stage3-response-inclination-1",
    administration: inclinationAdministration,
    questionId: "future_pathway_interest",
    responseCode: "PATHWAY_SUPPORTED_WORK",
    selectedOptionIds: ["supported_work"],
    capturedAt: now,
  });
  assert(stage3.responses.save(inclinationResponse).ok, "Inclination StructuredResponse should save");
  const inclinationKsi = materializeKnowledgeSupportItem(inclinationResponse);
  assert(inclinationKsi && stage2.knowledgeSupport.save(inclinationKsi).ok, "Inclination response should materialize KSI");
  step(userJourney, "Captured AGE_14_PLUS inclination pathway as KSI");

  const suggestion = createInferenceSuggestionFromResponse(inclinationResponse);
  assert(stage2.inferenceSuggestions.save(suggestion).ok, "Inference suggestion should save as suggested");
  assert(suggestion.status === "suggested", "Inference suggestion should remain suggested");
  step(userJourney, "Created non-operative suggested inference from structured response");

  const careerInclinationAdministration = createToolAdministration({
    administrationId: "stage3-admin-career-inclination-1",
    learnerId,
    toolId: "HIMAM_CAREER_INCLINATION_SCALE_TALLY",
    administeredByRole: "SPECIALIST",
    administeredAt: now,
  });
  assert(stage3.administrations.save(careerInclinationAdministration).ok, "Career inclination administration should save");
  const careerInclinationResponse = createStructuredResponse({
    responseId: "stage3-response-career-inclination-1",
    administration: careerInclinationAdministration,
    questionId: "career_liked_clusters",
    responseCode: "CAREER_LIKES_TECHNOLOGY_DEVICES",
    selectedOptionIds: ["technology_devices", "community_participation"],
    capturedAt: now,
  });
  assert(stage3.responses.save(careerInclinationResponse).ok, "Career inclination StructuredResponse should save");
  assert(materializeEvidenceRecord(careerInclinationResponse) === null, "Career inclination must not create EvidenceRecord");
  const careerInclinationKsi = materializeKnowledgeSupportItem(careerInclinationResponse);
  assert(careerInclinationKsi && stage2.knowledgeSupport.save(careerInclinationKsi).ok, "Career inclination response should materialize KSI");
  assert(careerInclinationKsi?.informationType === "INCLINATION_SURVEY", "Career inclination KSI should keep inclination information type");
  step(userJourney, "Converted Himam career inclination Tally response to KSI only");

  const familyCompassAdministration = createToolAdministration({
    administrationId: "stage3-admin-family-compass-1",
    learnerId,
    toolId: "FAMILY_COMPASS_TALLY",
    administeredByRole: "FAMILY",
    administeredAt: now,
  });
  assert(stage3.administrations.save(familyCompassAdministration).ok, "Family compass administration should save");
  const familyCompassResponse = createStructuredResponse({
    responseId: "stage3-response-family-compass-1",
    administration: familyCompassAdministration,
    questionId: "family_future_concerns",
    responseCode: "FAMILY_CONCERN_COMMUNICATION",
    selectedOptionIds: ["communication_needs"],
    capturedAt: now,
  });
  assert(stage3.responses.save(familyCompassResponse).ok, "Family compass StructuredResponse should save");
  assert(materializeEvidenceRecord(familyCompassResponse) === null, "Family compass response must not create EvidenceRecord");
  const familyCompassKsi = materializeKnowledgeSupportItem(familyCompassResponse);
  assert(familyCompassKsi && stage2.knowledgeSupport.save(familyCompassKsi).ok, "Family compass should materialize KSI");
  assert(familyCompassKsi?.informationType === "FAMILY_VISION", "Family compass KSI should remain family vision information");
  step(userJourney, "Converted family compass response to KSI");

  const familySnapshotAdministration = createToolAdministration({
    administrationId: "stage3-admin-family-snapshot-1",
    learnerId,
    toolId: "FAMILY_VISION_SNAPSHOT",
    administeredByRole: "FAMILY",
    administeredAt: now,
  });
  assert(stage3.administrations.save(familySnapshotAdministration).ok, "Family vision snapshot administration should save");
  const familySnapshotResponse = createStructuredResponse({
    responseId: "stage3-response-family-snapshot-1",
    administration: familySnapshotAdministration,
    questionId: "family_snapshot_effective_supports",
    responseCode: "FAMILY_SNAPSHOT_SUPPORT_VISUAL",
    selectedOptionIds: ["visual_instructions", "choice_between_options"],
    capturedAt: now,
  });
  assert(stage3.responses.save(familySnapshotResponse).ok, "Family vision snapshot StructuredResponse should save");
  assert(materializeEvidenceRecord(familySnapshotResponse) === null, "Family vision snapshot must not create EvidenceRecord");
  const familySnapshotKsi = materializeKnowledgeSupportItem(familySnapshotResponse);
  assert(familySnapshotKsi && stage2.knowledgeSupport.save(familySnapshotKsi).ok, "Family vision snapshot should materialize KSI");
  assert(familySnapshotKsi?.informationType === "FAMILY_VISION", "Family vision snapshot KSI should remain family vision information");
  step(userJourney, "Converted family vision snapshot response to KSI");

  const familyPictureCardsAdministration = createToolAdministration({
    administrationId: "stage3-admin-family-picture-cards-1",
    learnerId,
    toolId: "FAMILY_VISION_PICTURE_CARDS",
    administeredByRole: "FAMILY",
    administeredAt: now,
  });
  assert(stage3.administrations.save(familyPictureCardsAdministration).ok, "Family vision picture cards administration should save");
  const familyPictureCardsResponse = createStructuredResponse({
    responseId: "stage3-response-family-picture-cards-1",
    administration: familyPictureCardsAdministration,
    questionId: "family_picture_card_response",
    responseCode: "FAMILY_CARD_PRESERVE_WORKS",
    selectedOptionIds: ["preserve_works", "important_support_needed"],
    capturedAt: now,
  });
  assert(stage3.responses.save(familyPictureCardsResponse).ok, "Family vision picture cards StructuredResponse should save");
  assert(materializeEvidenceRecord(familyPictureCardsResponse) === null, "Family vision picture cards must not create EvidenceRecord");
  const familyPictureCardsKsi = materializeKnowledgeSupportItem(familyPictureCardsResponse);
  assert(familyPictureCardsKsi && stage2.knowledgeSupport.save(familyPictureCardsKsi).ok, "Family vision picture cards should materialize KSI");
  assert(familyPictureCardsKsi?.informationType === "FAMILY_VISION", "Family vision picture cards KSI should remain family vision information");
  step(userJourney, "Converted family vision picture cards response to KSI");

  const checklistAdministration = createToolAdministration({
    administrationId: "stage3-admin-transition-checklist-1",
    learnerId,
    toolId: "TRANSITION_SKILLS_CHECKLIST",
    administeredByRole: "SPECIALIST",
    administeredAt: now,
  });
  assert(stage3.administrations.save(checklistAdministration).ok, "Transition checklist administration should save");
  const checklistResponse = createStructuredResponse({
    responseId: "stage3-response-transition-checklist-1",
    administration: checklistAdministration,
    questionId: "transition_skill_coverage",
    responseCode: "TSC_DAILY_LIVING",
    selectedOptionIds: ["daily_living"],
    capturedAt: now,
  });
  assert(stage3.responses.save(checklistResponse).ok, "Transition checklist StructuredResponse should save");
  assert(materializeEvidenceRecord(checklistResponse) === null, "Transition checklist coverage must not create EvidenceRecord by default");
  const checklistKsi = materializeKnowledgeSupportItem(checklistResponse);
  assert(checklistKsi && stage2.knowledgeSupport.save(checklistKsi).ok, "Transition checklist should materialize KSI");
  assert(checklistKsi?.informationType === "TRANSITION_SURVEY_CHECKLIST", "Transition checklist KSI should keep its information type");
  step(userJourney, "Converted transition checklist coverage to KSI");

  const worksiteAdministration = createToolAdministration({
    administrationId: "stage3-admin-worksite-1",
    learnerId,
    toolId: "COMMUNITY_WORKSITE_EVALUATION",
    administeredByRole: "WORKSITE_SUPERVISOR",
    administeredAt: now,
  });
  assert(stage3.administrations.save(worksiteAdministration).ok, "Worksite evaluation administration should save");
  const worksiteResponse = createStructuredResponse({
    responseId: "stage3-response-worksite-1",
    administration: worksiteAdministration,
    questionId: "worksite_performance_rating",
    responseCode: "OBSERVED_WITH_SUPPORT",
    selectedOptionIds: ["observed_with_support"],
    capturedAt: now,
  });
  assert(stage3.responses.save(worksiteResponse).ok, "Worksite StructuredResponse should save");
  const worksiteEvidence = materializeEvidenceRecord(worksiteResponse);
  assert(worksiteEvidence && stage2.evidence.save(worksiteEvidence).ok, "Observed worksite response should materialize EvidenceRecord candidate");
  assert(worksiteEvidence?.supportCodes.includes("SUPPORT_PRESENT"), "Observed with support should retain support code");
  step(userJourney, "Converted observed worksite performance to EvidenceRecord candidate");

  const worksiteNotObservedResponse = createStructuredResponse({
    responseId: "stage3-response-worksite-not-observed",
    administration: worksiteAdministration,
    questionId: "worksite_performance_rating",
    responseCode: "NOT_OBSERVED",
    selectedOptionIds: ["not_observed"],
    capturedAt: now,
  });
  assert(materializeEvidenceRecord(worksiteNotObservedResponse) === null, "Worksite NOT_OBSERVED must not create EvidenceRecord");
  step(userJourney, "Prevented worksite NOT_OBSERVED from becoming EvidenceRecord");

  const personCenteredAdministration = createToolAdministration({
    administrationId: "stage3-admin-person-centered-1",
    learnerId,
    toolId: "TRANSITION_TREASURE_MAP",
    administeredByRole: "SPECIALIST",
    administeredAt: now,
  });
  assert(stage3.administrations.save(personCenteredAdministration).ok, "Person-centered planning administration should save");
  const treasureMapResponse = createStructuredResponse({
    responseId: "stage3-response-person-centered-1",
    administration: personCenteredAdministration,
    questionId: "treasure_map_future_choices",
    responseCode: "TREASURE_MAP_FUTURE_WORK",
    selectedOptionIds: ["future_work"],
    capturedAt: now,
  });
  assert(stage3.responses.save(treasureMapResponse).ok, "Person-centered planning StructuredResponse should save");
  assert(materializeEvidenceRecord(treasureMapResponse) === null, "Person-centered planning must not create EvidenceRecord");
  const personCenteredKsi = materializeKnowledgeSupportItem(treasureMapResponse);
  assert(personCenteredKsi && stage2.knowledgeSupport.save(personCenteredKsi).ok, "Person-centered planning should materialize KSI");
  assert(personCenteredKsi?.informationType === "PERSON_CENTERED_PLANNING", "Person-centered KSI should keep its information type");
  step(userJourney, "Converted person-centered planning response to KSI");

  const studentVisionAdministration = createToolAdministration({
    administrationId: "stage3-admin-student-vision-1",
    learnerId,
    toolId: "IEP_STUDENT_VISION_STATEMENT",
    administeredByRole: "SPECIALIST",
    administeredAt: now,
  });
  assert(stage3.administrations.save(studentVisionAdministration).ok, "Student vision administration should save");
  const studentVisionResponse = createStructuredResponse({
    responseId: "stage3-response-student-vision-1",
    administration: studentVisionAdministration,
    questionId: "student_vision_future_statement",
    responseCode: "STUDENT_VISION_ENTERED",
    valueText: "Student and family describe a future with supported work and community participation.",
    capturedAt: now,
  });
  assert(stage3.responses.save(studentVisionResponse).ok, "Student vision StructuredResponse should save");
  assert(materializeEvidenceRecord(studentVisionResponse) === null, "Student vision must not create EvidenceRecord");
  const studentVisionKsi = materializeKnowledgeSupportItem(studentVisionResponse);
  assert(studentVisionKsi && stage2.knowledgeSupport.save(studentVisionKsi).ok, "Student vision should materialize KSI");
  step(userJourney, "Converted IEP student vision statement to KSI");

  const lifeTrajectoryAdministration = createToolAdministration({
    administrationId: "stage3-admin-life-trajectory-1",
    learnerId,
    toolId: "LIFECOURSE_LIFE_TRAJECTORY",
    administeredByRole: "SPECIALIST",
    administeredAt: now,
  });
  assert(stage3.administrations.save(lifeTrajectoryAdministration).ok, "Life trajectory administration should save");
  const lifeTrajectoryResponse = createStructuredResponse({
    responseId: "stage3-response-life-trajectory-1",
    administration: lifeTrajectoryAdministration,
    questionId: "trajectory_vision_want",
    responseCode: "LIFE_TRAJECTORY_VISION_ENTERED",
    valueText: "Learner wants a meaningful day with supported community participation.",
    capturedAt: now,
  });
  assert(stage3.responses.save(lifeTrajectoryResponse).ok, "Life trajectory StructuredResponse should save");
  assert(materializeEvidenceRecord(lifeTrajectoryResponse) === null, "Life trajectory must not create EvidenceRecord");
  const lifeTrajectoryKsi = materializeKnowledgeSupportItem(lifeTrajectoryResponse);
  assert(lifeTrajectoryKsi && stage2.knowledgeSupport.save(lifeTrajectoryKsi).ok, "Life trajectory should materialize KSI");
  step(userJourney, "Converted LifeCourse life trajectory response to KSI");

  const selfDiscoveryAdministration = createToolAdministration({
    administrationId: "stage3-admin-self-discovery-1",
    learnerId,
    toolId: "SELF_DISCOVERY_ADVENTURE_TALLY",
    administeredByRole: "SPECIALIST",
    administeredAt: now,
  });
  assert(stage3.administrations.save(selfDiscoveryAdministration).ok, "Self-discovery administration should save");
  const selfDiscoveryResponse = createStructuredResponse({
    responseId: "stage3-response-self-discovery-1",
    administration: selfDiscoveryAdministration,
    questionId: "future_dream",
    responseCode: "SELF_DISCOVERY_FUTURE_DREAM_ENTERED",
    valueText: "Learner dreams of using technology in a supported community activity.",
    capturedAt: now,
  });
  assert(stage3.responses.save(selfDiscoveryResponse).ok, "Self-discovery StructuredResponse should save");
  assert(materializeEvidenceRecord(selfDiscoveryResponse) === null, "External self-discovery summary must not create EvidenceRecord");
  const selfDiscoveryKsi = materializeKnowledgeSupportItem(selfDiscoveryResponse);
  assert(selfDiscoveryKsi && stage2.knowledgeSupport.save(selfDiscoveryKsi).ok, "Self-discovery response should materialize KSI");
  step(userJourney, "Converted external self-discovery form summary to KSI");

  const functionalSkillsAdministration = createToolAdministration({
    administrationId: "stage3-admin-functional-skills-1",
    learnerId,
    toolId: "FUNCTIONAL_SKILLS_TRANSITION_ASSESSMENT",
    administeredByRole: "SPECIALIST",
    administeredAt: now,
  });
  assert(stage3.administrations.save(functionalSkillsAdministration).ok, "Functional skills administration should save");
  const functionalSkillsObservedNoResponse = createStructuredResponse({
    responseId: "stage3-response-functional-skills-no-1",
    administration: functionalSkillsAdministration,
    questionId: "functional_transition_observed_rating",
    responseCode: "OBSERVED_NOT_ABLE",
    selectedOptionIds: ["not_able_observed"],
    capturedAt: now,
  });
  assert(stage3.responses.save(functionalSkillsObservedNoResponse).ok, "Functional skills observed no response should save");
  const functionalSkillsEvidence = materializeEvidenceRecord(functionalSkillsObservedNoResponse);
  assert(functionalSkillsEvidence && stage2.evidence.save(functionalSkillsEvidence).ok, "Observed functional skills no response should materialize EvidenceRecord candidate");
  assert(
    functionalSkillsEvidence?.supportCodes.includes("OPPORTUNITY_PRESENT_NOT_YET_PERFORMED"),
    "Observed not able should retain opportunity-present support code",
  );
  step(userJourney, "Converted observed functional transition result to EvidenceRecord candidate");

  const functionalSkillsUnknownResponse = createStructuredResponse({
    responseId: "stage3-response-functional-skills-dk-1",
    administration: functionalSkillsAdministration,
    questionId: "functional_transition_observed_rating",
    responseCode: "NOT_OBSERVED",
    selectedOptionIds: ["dont_know"],
    capturedAt: now,
  });
  assert(materializeEvidenceRecord(functionalSkillsUnknownResponse) === null, "Functional skills DK/NOT_OBSERVED must not create EvidenceRecord");
  step(userJourney, "Prevented functional skills DK response from becoming EvidenceRecord");

  const invalidVoiceEvidenceResponse = {
    ...learnerVoiceResponse,
    responseId: "stage3-response-invalid-voice-evidence",
    outputChannel: "EVIDENCE_RECORD",
  };
  assert(
    !validateStructuredResponse(invalidVoiceEvidenceResponse).ok,
    "Learner voice response cannot declare EVIDENCE_RECORD output",
  );
  step(userJourney, "Rejected learner voice response attempting level evidence output");

  const corruptResponse = {
    ...assessmentResponse,
    responseId: "stage3-response-corrupt-concept",
    conceptIds: ["DAILY_LIVING"],
  };
  store.setItem(STAGE3_STORAGE_KEYS.responses, JSON.stringify([assessmentResponse, corruptResponse]));
  assert(
    stage3.responses.list().every((record) => record.conceptIds.every((conceptId) => manifest.conceptIds.includes(conceptId))),
    "Stage 3 response repository should filter corrupted concept IDs",
  );
  step(userJourney, "Filtered corrupted StructuredResponse during repository read");

  assert(getStage3InformationTool("HIMAM_LEARNER_VOICE_CORE"), "ToolCatalog lookup should resolve learner voice tool");
  step(traceability, "ToolCatalog lookup resolves by toolId");
  assert(validSourceRef(assessmentAdministration.sourceRef), "ToolAdministration sourceRef should resolve");
  step(traceability, "ToolAdministration sourceRef resolves");
  assert(validSourceRef(assessmentResponse.sourceRef), "StructuredResponse sourceRef should resolve");
  step(traceability, "StructuredResponse sourceRef resolves");
  assert(validSourceRef(evidence?.sourceRef), "EvidenceRecord sourceRef should resolve back to StructuredResponse");
  step(traceability, "EvidenceRecord sourceRef resolves to StructuredResponse");
  assert(validSourceRef(learnerKsi?.sourceRef), "KnowledgeSupportItem sourceRef should resolve back to StructuredResponse");
  step(traceability, "KnowledgeSupportItem sourceRef resolves to StructuredResponse");
  assert(validSourceRef(careerInclinationKsi?.sourceRef), "Career inclination KSI sourceRef should resolve back to StructuredResponse");
  step(traceability, "Career inclination KnowledgeSupportItem sourceRef resolves");
  assert(validSourceRef(familyCompassKsi?.sourceRef), "Family compass KSI sourceRef should resolve back to StructuredResponse");
  step(traceability, "Family compass KnowledgeSupportItem sourceRef resolves");
  assert(validSourceRef(familySnapshotKsi?.sourceRef), "Family vision snapshot KSI sourceRef should resolve back to StructuredResponse");
  step(traceability, "Family vision snapshot KnowledgeSupportItem sourceRef resolves");
  assert(validSourceRef(familyPictureCardsKsi?.sourceRef), "Family vision picture cards KSI sourceRef should resolve back to StructuredResponse");
  step(traceability, "Family vision picture cards KnowledgeSupportItem sourceRef resolves");
  assert(validSourceRef(checklistKsi?.sourceRef), "Transition checklist KSI sourceRef should resolve back to StructuredResponse");
  step(traceability, "Transition checklist KnowledgeSupportItem sourceRef resolves");

  const disabilityAwarenessAdministration = createToolAdministration({
    administrationId: "stage3-admin-disability-awareness-1",
    learnerId,
    toolId: "IEP_DISABILITY_AWARENESS_CHECKLIST",
    administeredByRole: "SPECIALIST",
    administeredAt: now,
  });
  assert(stage3.administrations.save(disabilityAwarenessAdministration).ok, "IEP disability awareness administration should save");
  const disabilityAwarenessResponse = createStructuredResponse({
    responseId: "stage3-response-disability-awareness-1",
    administration: disabilityAwarenessAdministration,
    questionId: "iep_participation_awareness",
    responseCode: "IEP_AWARENESS_TRANSITION_14_PLUS",
    selectedOptionIds: ["knows_transition_age_14"],
    capturedAt: now,
  });
  assert(stage3.responses.save(disabilityAwarenessResponse).ok, "IEP disability awareness StructuredResponse should save");
  assert(materializeEvidenceRecord(disabilityAwarenessResponse) === null, "IEP disability awareness must not create EvidenceRecord");
  const disabilityAwarenessKsi = materializeKnowledgeSupportItem(disabilityAwarenessResponse);
  assert(disabilityAwarenessKsi && stage2.knowledgeSupport.save(disabilityAwarenessKsi).ok, "IEP disability awareness should materialize KSI");
  assert(disabilityAwarenessKsi?.informationType === "TRANSITION_SURVEY_CHECKLIST", "IEP disability awareness KSI should remain transition checklist information");
  step(userJourney, "Converted IEP disability awareness checklist response to KSI only");
  assert(validSourceRef(disabilityAwarenessKsi?.sourceRef), "IEP disability awareness KSI sourceRef should resolve back to StructuredResponse");
  step(traceability, "IEP disability awareness KnowledgeSupportItem sourceRef resolves");

  const familyTransitionAdministration = createToolAdministration({
    administrationId: "stage3-admin-family-transition-involvement-1",
    learnerId,
    toolId: "FAMILY_TRANSITION_ASSESSMENT_INVOLVEMENT",
    administeredByRole: "FAMILY",
    administeredAt: now,
  });
  assert(stage3.administrations.save(familyTransitionAdministration).ok, "Family transition involvement administration should save");
  const familyTransitionResponse = createStructuredResponse({
    responseId: "stage3-response-family-transition-involvement-1",
    administration: familyTransitionAdministration,
    questionId: "family_transition_future_domains",
    responseCode: "FAMILY_TRANSITION_EMPLOYMENT_TRAINING",
    selectedOptionIds: ["future_employment_training", "future_support_network"],
    capturedAt: now,
  });
  assert(stage3.responses.save(familyTransitionResponse).ok, "Family transition involvement StructuredResponse should save");
  assert(materializeEvidenceRecord(familyTransitionResponse) === null, "Family transition involvement must not create EvidenceRecord");
  const familyTransitionKsi = materializeKnowledgeSupportItem(familyTransitionResponse);
  assert(familyTransitionKsi && stage2.knowledgeSupport.save(familyTransitionKsi).ok, "Family transition involvement should materialize KSI");
  assert(familyTransitionKsi?.informationType === "FAMILY_VISION", "Family transition involvement KSI should remain family vision information");
  step(userJourney, "Converted family transition assessment involvement response to KSI only");
  assert(validSourceRef(familyTransitionKsi?.sourceRef), "Family transition involvement KSI sourceRef should resolve back to StructuredResponse");
  step(traceability, "Family transition involvement KnowledgeSupportItem sourceRef resolves");

  const adolescentAutonomyAdministration = createToolAdministration({
    administrationId: "stage3-admin-adolescent-autonomy-1",
    learnerId,
    toolId: "ADOLESCENT_AUTONOMY_CHECKLIST_REFERENCE",
    administeredByRole: "SPECIALIST",
    administeredAt: now,
  });
  assert(stage3.administrations.save(adolescentAutonomyAdministration).ok, "Adolescent autonomy administration should save");
  const adolescentAutonomyResponse = createStructuredResponse({
    responseId: "stage3-response-adolescent-autonomy-1",
    administration: adolescentAutonomyAdministration,
    questionId: "autonomy_needs_practice_domains",
    responseCode: "AUTONOMY_PRACTICE_COMMUNITY_NAVIGATION",
    selectedOptionIds: ["community_navigation", "health_management"],
    capturedAt: now,
  });
  assert(stage3.responses.save(adolescentAutonomyResponse).ok, "Adolescent autonomy StructuredResponse should save");
  assert(materializeEvidenceRecord(adolescentAutonomyResponse) === null, "Adolescent autonomy checklist must not create EvidenceRecord");
  const adolescentAutonomyKsi = materializeKnowledgeSupportItem(adolescentAutonomyResponse);
  assert(adolescentAutonomyKsi && stage2.knowledgeSupport.save(adolescentAutonomyKsi).ok, "Adolescent autonomy should materialize KSI");
  assert(adolescentAutonomyKsi?.informationType === "TRANSITION_SURVEY_CHECKLIST", "Adolescent autonomy KSI should remain transition checklist information");
  step(userJourney, "Converted adolescent autonomy checklist response to KSI only");
  assert(validSourceRef(adolescentAutonomyKsi?.sourceRef), "Adolescent autonomy KSI sourceRef should resolve back to StructuredResponse");
  step(traceability, "Adolescent autonomy KnowledgeSupportItem sourceRef resolves");

  assert(validSourceRef(worksiteEvidence?.sourceRef), "Worksite EvidenceRecord sourceRef should resolve back to StructuredResponse");
  step(traceability, "Worksite EvidenceRecord sourceRef resolves");
  assert(validSourceRef(personCenteredKsi?.sourceRef), "Person-centered planning KSI sourceRef should resolve back to StructuredResponse");
  step(traceability, "Person-centered planning KnowledgeSupportItem sourceRef resolves");
  assert(validSourceRef(studentVisionKsi?.sourceRef), "Student vision KSI sourceRef should resolve back to StructuredResponse");
  step(traceability, "Student vision KnowledgeSupportItem sourceRef resolves");
  assert(validSourceRef(lifeTrajectoryKsi?.sourceRef), "Life trajectory KSI sourceRef should resolve back to StructuredResponse");
  step(traceability, "Life trajectory KnowledgeSupportItem sourceRef resolves");
  assert(validSourceRef(selfDiscoveryKsi?.sourceRef), "Self-discovery KSI sourceRef should resolve back to StructuredResponse");
  step(traceability, "Self-discovery KnowledgeSupportItem sourceRef resolves");
  assert(validSourceRef(functionalSkillsEvidence?.sourceRef), "Functional skills EvidenceRecord sourceRef should resolve back to StructuredResponse");
  step(traceability, "Functional skills EvidenceRecord sourceRef resolves");
  assert(stage3.responses.listForAdministration(assessmentAdministration.administrationId).length === 1, "Responses should be readable by administration");
  step(traceability, "StructuredResponse remains linked to ToolAdministration");
}

if (failures.length > 0) {
  console.error("Stage 3 verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Stage 3 data-integrity verification PASS");
console.log("Stage 3 repository userJourney verification PASS");
console.log("Stage 3 traceability verification PASS");
console.log(`User journey checks: ${userJourney.length}`);
console.log(`Traceability checks: ${traceability.length}`);
