import type { ConceptId } from "./concepts";

export type TransitionAssessmentReferenceSourceId =
  | "NSTTAC_AGE_APPROPRIATE_TRANSITION_ASSESSMENT_GUIDE"
  | "OSSE_ASSESSMENT_FOR_TRANSITION_PART_ONE"
  | "OSSE_ASSESSMENT_FOR_TRANSITION_PART_TWO"
  | "ADOLESCENT_AUTONOMY_CHECKLIST"
  | "IEP_DISABILITY_AWARENESS_CHECKLIST"
  | "FAMILY_INVOLVEMENT_TRANSITION_ASSESSMENT"
  | "HIMAM_FAMILY_VISION_SNAPSHOT_AND_PICTURE_CARDS";

export type TransitionAssessmentPrincipleId =
  | "AGE_APPROPRIATE_TRANSITION_ASSESSMENT"
  | "MULTIPLE_SOURCES_AND_METHODS"
  | "FORMAL_INFORMAL_ASSESSMENT_BOUNDARY"
  | "REPEATED_INFORMAL_ASSESSMENT"
  | "TRIANGULATION_EXPRESSED_TESTED_DEMONSTRATED"
  | "APIE_ASSESS_PLAN_INSTRUCT_EVALUATE"
  | "STUDENT_ENVIRONMENT_MATCHING"
  | "ASSESSMENT_TO_GOAL_TRANSLATION"
  | "FAMILY_EARLY_INVOLVEMENT"
  | "FAMILY_VISION_VISUAL_CHOICE_WITH_SUPPORTS"
  | "ACCESSIBLE_ASSESSMENT_COMMUNICATION"
  | "SELF_AWARENESS_AND_IEP_PARTICIPATION"
  | "AUTONOMY_DAILY_LIVING_COVERAGE"
  | "COMMUNITY_AND_HEALTH_AUTONOMY_COVERAGE"
  | "CAREER_AND_HOUSING_FUTURE_SKILLS";

export type TransitionAssessmentReferenceSource = {
  sourceId: TransitionAssessmentReferenceSourceId;
  title: string;
  sourceKind: "GUIDE" | "TRAINING_PRESENTATION" | "CHECKLIST" | "PRACTICE_BRIEF";
  libraryPlacement: "REFERENCE_ONLY" | "STAGE3_TOOL_TEMPLATE" | "REFERENCE_AND_TOOL_TEMPLATE";
  knowledgeOnly: true;
  implementsStage4: false;
  createsEvidenceRecord: false;
  advisoryOnly: true;
  notes: string;
};

export type TransitionAssessmentPrinciple = {
  principleId: TransitionAssessmentPrincipleId;
  sourceIds: TransitionAssessmentReferenceSourceId[];
  conceptIds: ConceptId[];
  operationalUse:
    | "TOOL_SELECTION_GUIDANCE"
    | "RESPONSE_MAPPING_GUIDANCE"
    | "QUALITY_REVIEW_GUIDANCE"
    | "SPECIALIST_SUPPORT_CONTEXT";
  stage3Effect: "KNOWLEDGE_SUPPORT_ONLY" | "CATALOG_COVERAGE_ONLY";
  stage4Effect: "DEFERRED_NO_CALIBRATION";
  summary: string;
};

export const TRANSITION_ASSESSMENT_REFERENCE_SOURCES: TransitionAssessmentReferenceSource[] = [
  {
    sourceId: "NSTTAC_AGE_APPROPRIATE_TRANSITION_ASSESSMENT_GUIDE",
    title: "NSTTAC Age-Appropriate Transition Assessment Guide",
    sourceKind: "GUIDE",
    libraryPlacement: "REFERENCE_ONLY",
    knowledgeOnly: true,
    implementsStage4: false,
    createsEvidenceRecord: false,
    advisoryOnly: true,
    notes:
      "Reference for age-appropriate transition assessment, formal/informal boundaries, multiple methods, and using results to inform IEP transition goals.",
  },
  {
    sourceId: "OSSE_ASSESSMENT_FOR_TRANSITION_PART_ONE",
    title: "Assessment for Transition Planning and Preparation: Part One",
    sourceKind: "TRAINING_PRESENTATION",
    libraryPlacement: "REFERENCE_ONLY",
    knowledgeOnly: true,
    implementsStage4: false,
    createsEvidenceRecord: false,
    advisoryOnly: true,
    notes:
      "Reference for transition assessment purpose, domains, roles, multiple sources, and organized ongoing assessment routines.",
  },
  {
    sourceId: "OSSE_ASSESSMENT_FOR_TRANSITION_PART_TWO",
    title: "Assessment for Transition Planning and Preparation: Part Two",
    sourceKind: "TRAINING_PRESENTATION",
    libraryPlacement: "REFERENCE_ONLY",
    knowledgeOnly: true,
    implementsStage4: false,
    createsEvidenceRecord: false,
    advisoryOnly: true,
    notes:
      "Reference for triangulation across expressed, tested, and demonstrated information and translating findings into goals.",
  },
  {
    sourceId: "ADOLESCENT_AUTONOMY_CHECKLIST",
    title: "Adolescent Autonomy Checklist",
    sourceKind: "CHECKLIST",
    libraryPlacement: "REFERENCE_AND_TOOL_TEMPLATE",
    knowledgeOnly: true,
    implementsStage4: false,
    createsEvidenceRecord: false,
    advisoryOnly: true,
    notes:
      "Checklist coverage for home living, health, emergency readiness, community skills, money, future education, employment, and housing.",
  },
  {
    sourceId: "IEP_DISABILITY_AWARENESS_CHECKLIST",
    title: "IEP / Disability Awareness Checklist",
    sourceKind: "CHECKLIST",
    libraryPlacement: "REFERENCE_AND_TOOL_TEMPLATE",
    knowledgeOnly: true,
    implementsStage4: false,
    createsEvidenceRecord: false,
    advisoryOnly: true,
    notes:
      "Learner self-awareness checklist about IEP participation, disability awareness, accommodations, goals, and transition discussion from age 14.",
  },
  {
    sourceId: "FAMILY_INVOLVEMENT_TRANSITION_ASSESSMENT",
    title: "Family Involvement in the Transition Assessment Process",
    sourceKind: "PRACTICE_BRIEF",
    libraryPlacement: "REFERENCE_AND_TOOL_TEMPLATE",
    knowledgeOnly: true,
    implementsStage4: false,
    createsEvidenceRecord: false,
    advisoryOnly: true,
    notes:
      "Practice reference for involving families early, using family input, and communicating assessment rationale and results accessibly.",
  },
  {
    sourceId: "HIMAM_FAMILY_VISION_SNAPSHOT_AND_PICTURE_CARDS",
    title: "Himam Family Vision Snapshot and Picture Cards Design Notes",
    sourceKind: "PRACTICE_BRIEF",
    libraryPlacement: "REFERENCE_AND_TOOL_TEMPLATE",
    knowledgeOnly: true,
    implementsStage4: false,
    createsEvidenceRecord: false,
    advisoryOnly: true,
    notes:
      "Internal synthesis for a short family vision snapshot and a deeper visual card tool that separates what matters, existing strengths, and what helps.",
  },
];

export const TRANSITION_ASSESSMENT_PRINCIPLES: TransitionAssessmentPrinciple[] = [
  {
    principleId: "AGE_APPROPRIATE_TRANSITION_ASSESSMENT",
    sourceIds: ["NSTTAC_AGE_APPROPRIATE_TRANSITION_ASSESSMENT_GUIDE"],
    conceptIds: ["SELF_DET", "ACADEMIC", "COMMUNITY"],
    operationalUse: "TOOL_SELECTION_GUIDANCE",
    stage3Effect: "CATALOG_COVERAGE_ONLY",
    stage4Effect: "DEFERRED_NO_CALIBRATION",
    summary:
      "Age 14 plus should raise an explicit transition-planning expectation and broaden tool coverage, without blocking the workflow or creating a level.",
  },
  {
    principleId: "MULTIPLE_SOURCES_AND_METHODS",
    sourceIds: ["NSTTAC_AGE_APPROPRIATE_TRANSITION_ASSESSMENT_GUIDE", "OSSE_ASSESSMENT_FOR_TRANSITION_PART_ONE"],
    conceptIds: ["SELF_DET", "COMM", "COMMUNITY", "ACADEMIC"],
    operationalUse: "QUALITY_REVIEW_GUIDANCE",
    stage3Effect: "CATALOG_COVERAGE_ONLY",
    stage4Effect: "DEFERRED_NO_CALIBRATION",
    summary:
      "Transition assessment should combine records, interviews, observation, work/community samples, and structured tools before interpreting patterns.",
  },
  {
    principleId: "FORMAL_INFORMAL_ASSESSMENT_BOUNDARY",
    sourceIds: ["NSTTAC_AGE_APPROPRIATE_TRANSITION_ASSESSMENT_GUIDE"],
    conceptIds: ["ACADEMIC", "SELF_DET", "COMMUNITY"],
    operationalUse: "RESPONSE_MAPPING_GUIDANCE",
    stage3Effect: "CATALOG_COVERAGE_ONLY",
    stage4Effect: "DEFERRED_NO_CALIBRATION",
    summary:
      "Formal tool labels may inform upload parsing and classification, while informal tools remain supporting information unless observed performance criteria are met.",
  },
  {
    principleId: "REPEATED_INFORMAL_ASSESSMENT",
    sourceIds: ["NSTTAC_AGE_APPROPRIATE_TRANSITION_ASSESSMENT_GUIDE"],
    conceptIds: ["SELF_DET", "COMM", "SOCIAL", "COMMUNITY"],
    operationalUse: "QUALITY_REVIEW_GUIDANCE",
    stage3Effect: "CATALOG_COVERAGE_ONLY",
    stage4Effect: "DEFERRED_NO_CALIBRATION",
    summary:
      "Informal transition information becomes stronger when repeated and collected by more than one person, but Stage 3 still stores it as support information.",
  },
  {
    principleId: "TRIANGULATION_EXPRESSED_TESTED_DEMONSTRATED",
    sourceIds: ["OSSE_ASSESSMENT_FOR_TRANSITION_PART_TWO"],
    conceptIds: ["SELF_DET", "COMM", "ACADEMIC", "COMMUNITY"],
    operationalUse: "QUALITY_REVIEW_GUIDANCE",
    stage3Effect: "CATALOG_COVERAGE_ONLY",
    stage4Effect: "DEFERRED_NO_CALIBRATION",
    summary:
      "Expressed preferences, tested results, and demonstrated performance must remain distinguishable in the learner profile and specialist support view.",
  },
  {
    principleId: "APIE_ASSESS_PLAN_INSTRUCT_EVALUATE",
    sourceIds: ["NSTTAC_AGE_APPROPRIATE_TRANSITION_ASSESSMENT_GUIDE"],
    conceptIds: ["ACADEMIC", "SELF_DET", "COMMUNITY"],
    operationalUse: "SPECIALIST_SUPPORT_CONTEXT",
    stage3Effect: "CATALOG_COVERAGE_ONLY",
    stage4Effect: "DEFERRED_NO_CALIBRATION",
    summary:
      "Assessment findings should be available to support planning, instruction, and later evaluation, without implying automated plan approval.",
  },
  {
    principleId: "FAMILY_VISION_VISUAL_CHOICE_WITH_SUPPORTS",
    sourceIds: ["NSTTAC_AGE_APPROPRIATE_TRANSITION_ASSESSMENT_GUIDE"],
    conceptIds: ["SELF_DET", "COMMUNITY", "HEALTH", "SAFETY"],
    operationalUse: "SPECIALIST_SUPPORT_CONTEXT",
    stage3Effect: "KNOWLEDGE_SUPPORT_ONLY",
    stage4Effect: "DEFERRED_NO_CALIBRATION",
    summary:
      "Student interests, preferences, needs, and environmental demands should be shown together for human interpretation.",
  },
  {
    principleId: "ASSESSMENT_TO_GOAL_TRANSLATION",
    sourceIds: ["NSTTAC_AGE_APPROPRIATE_TRANSITION_ASSESSMENT_GUIDE", "OSSE_ASSESSMENT_FOR_TRANSITION_PART_TWO"],
    conceptIds: ["SELF_DET", "ACADEMIC", "COMMUNITY", "COMM"],
    operationalUse: "QUALITY_REVIEW_GUIDANCE",
    stage3Effect: "CATALOG_COVERAGE_ONLY",
    stage4Effect: "DEFERRED_NO_CALIBRATION",
    summary:
      "Assessment results should support goal drafting only through traceable handoff, not through direct automated quality-passed goals.",
  },
  {
    principleId: "FAMILY_EARLY_INVOLVEMENT",
    sourceIds: ["FAMILY_INVOLVEMENT_TRANSITION_ASSESSMENT", "HIMAM_FAMILY_VISION_SNAPSHOT_AND_PICTURE_CARDS"],
    conceptIds: ["SOCIAL", "COMM", "SELF_DET", "COMMUNITY"],
    operationalUse: "TOOL_SELECTION_GUIDANCE",
    stage3Effect: "KNOWLEDGE_SUPPORT_ONLY",
    stage4Effect: "DEFERRED_NO_CALIBRATION",
    summary:
      "Family input should be invited early and treated as planning context, priorities, strengths, and support conditions.",
  },
  {
    principleId: "STUDENT_ENVIRONMENT_MATCHING",
    sourceIds: ["HIMAM_FAMILY_VISION_SNAPSHOT_AND_PICTURE_CARDS", "NSTTAC_AGE_APPROPRIATE_TRANSITION_ASSESSMENT_GUIDE"],
    conceptIds: ["SELF_DET", "COMMUNITY", "COMM", "SAFETY", "HEALTH", "LEARNING_TECH"],
    operationalUse: "SPECIALIST_SUPPORT_CONTEXT",
    stage3Effect: "KNOWLEDGE_SUPPORT_ONLY",
    stage4Effect: "DEFERRED_NO_CALIBRATION",
    summary:
      "Family visual cards should keep the scene neutral and collect structured judgments outside the image so the specialist can compare context, supports, strengths, and priorities.",
  },
  {
    principleId: "ACCESSIBLE_ASSESSMENT_COMMUNICATION",
    sourceIds: ["FAMILY_INVOLVEMENT_TRANSITION_ASSESSMENT"],
    conceptIds: ["COMM", "SOCIAL", "SELF_DET"],
    operationalUse: "SPECIALIST_SUPPORT_CONTEXT",
    stage3Effect: "KNOWLEDGE_SUPPORT_ONLY",
    stage4Effect: "DEFERRED_NO_CALIBRATION",
    summary:
      "Families should receive plain-language explanation of assessment purpose, results, and next steps.",
  },
  {
    principleId: "SELF_AWARENESS_AND_IEP_PARTICIPATION",
    sourceIds: ["IEP_DISABILITY_AWARENESS_CHECKLIST"],
    conceptIds: ["SELF_DET", "COMM", "ACADEMIC", "HEALTH"],
    operationalUse: "TOOL_SELECTION_GUIDANCE",
    stage3Effect: "KNOWLEDGE_SUPPORT_ONLY",
    stage4Effect: "DEFERRED_NO_CALIBRATION",
    summary:
      "Student awareness of IEP participation, disability, accommodations, and goals informs support and self-determination planning.",
  },
  {
    principleId: "AUTONOMY_DAILY_LIVING_COVERAGE",
    sourceIds: ["ADOLESCENT_AUTONOMY_CHECKLIST"],
    conceptIds: ["SELF_CARE", "SAFETY", "HEALTH"],
    operationalUse: "TOOL_SELECTION_GUIDANCE",
    stage3Effect: "KNOWLEDGE_SUPPORT_ONLY",
    stage4Effect: "DEFERRED_NO_CALIBRATION",
    summary:
      "Daily living, home routines, hygiene, and emergency readiness should be available as autonomy checklist domains.",
  },
  {
    principleId: "COMMUNITY_AND_HEALTH_AUTONOMY_COVERAGE",
    sourceIds: ["ADOLESCENT_AUTONOMY_CHECKLIST"],
    conceptIds: ["COMMUNITY", "MOBILITY", "HEALTH", "SAFETY", "COMM"],
    operationalUse: "TOOL_SELECTION_GUIDANCE",
    stage3Effect: "KNOWLEDGE_SUPPORT_ONLY",
    stage4Effect: "DEFERRED_NO_CALIBRATION",
    summary:
      "Community navigation, health management, emergency contacts, and requesting support should be visible as transition autonomy areas.",
  },
  {
    principleId: "CAREER_AND_HOUSING_FUTURE_SKILLS",
    sourceIds: ["ADOLESCENT_AUTONOMY_CHECKLIST", "NSTTAC_AGE_APPROPRIATE_TRANSITION_ASSESSMENT_GUIDE"],
    conceptIds: ["ACADEMIC", "COMMUNITY", "SELF_DET", "MOBILITY"],
    operationalUse: "TOOL_SELECTION_GUIDANCE",
    stage3Effect: "KNOWLEDGE_SUPPORT_ONLY",
    stage4Effect: "DEFERRED_NO_CALIBRATION",
    summary:
      "Future education, work exploration, housing, money, and transportation should inform transition pathway discussion for older learners.",
  },
];
