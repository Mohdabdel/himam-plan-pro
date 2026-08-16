import type { InformationSource, Learner } from "../domain/types.js";

export const trialLearner: Learner = {
  id: "trial-learner-16",
  name: "Trial Learner",
  ageYears: 16,
  diagnosis: "Not used for automatic goal generation",
  institution: "Himam Trial Center",
  entryType: "new",
};

export const trialSources: InformationSource[] = [
  {
    id: "src-official-assessment-ttap",
    learnerId: trialLearner.id,
    kind: "official_assessment",
    status: "completed",
    title: "Official assessment - TTAP uploaded results",
    selectedToolId: "TTAP",
    selectedToolName: "TEACCH Transition Assessment Profile",
    uploadedFileName: "ttap-results.pdf",
    declaredConcepts: ["SELF_CARE", "MOBILITY", "COMMUNITY"],
    summary: "Structured assessment source; detailed extraction is deferred.",
  },
  {
    id: "src-family-voice",
    learnerId: trialLearner.id,
    kind: "family_voice",
    status: "completed",
    title: "Family compass - priorities and supports",
    declaredConcepts: ["SELF_CARE", "SAFETY", "SELF_DET"],
    declaredPriorities: ["daily independence", "safety in community routines"],
    declaredSupports: ["visual schedule", "task analysis", "short instructions"],
    summary: "Family priorities support goal selection but do not establish performance level.",
  },
  {
    id: "src-learner-voice",
    learnerId: trialLearner.id,
    kind: "learner_voice",
    status: "completed",
    title: "Learner voice - self discovery form",
    declaredConcepts: ["SELF_DET", "COMM", "SOCIAL"],
    declaredInterests: ["hands-on learning", "helping friends"],
    summary: "Learner preferences support motivation and wording.",
  },
  {
    id: "src-prior-report",
    learnerId: trialLearner.id,
    kind: "prior_report",
    status: "completed",
    title: "Previous plan report",
    declaredConcepts: ["ACADEMIC", "LEARNING_TECH"],
    summary: "Prior records require human review before current use.",
  },
];
