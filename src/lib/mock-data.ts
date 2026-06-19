export type ClientStatus = "on-track" | "needs-attention" | "at-risk" | "transitioned";
export type Stage =
  | "Assessment"
  | "Planning"
  | "Skill-building"
  | "Work Experience"
  | "Placement";

export interface Goal {
  id: string;
  domain: "Employment" | "Education" | "Independent Living" | "Community" | "Self-Advocacy";
  title: string;
  progress: number; // 0..100
  due: string;
  status: "in-progress" | "complete" | "blocked";
}

export interface Note {
  id: string;
  date: string;
  author: string;
  kind: "Session" | "Assessment" | "Family" | "Employer";
  body: string;
}

export interface Session {
  id: string;
  clientId: string;
  clientName: string;
  date: string; // ISO
  duration: number; // mins
  type: "1:1 Coaching" | "Family Meeting" | "Site Visit" | "Assessment" | "IEP / Transition Review";
  location: string;
}

export interface Client {
  id: string;
  name: string;
  initials: string;
  age: number;
  pronouns: string;
  schoolOrProgram: string;
  guardian: string;
  guardianPhone: string;
  primarySupport: string;
  stage: Stage;
  status: ClientStatus;
  progress: number;
  nextSession: string;
  startedAt: string;
  targetExit: string;
  tags: string[];
  summary: string;
  goals: Goal[];
  notes: Note[];
}

export const clients: Client[] = [
  {
    id: "yara-h",
    name: "Yara Haddad",
    initials: "YH",
    age: 17,
    pronouns: "she/her",
    schoolOrProgram: "Al-Noor Secondary — Grade 12",
    guardian: "Layla Haddad (mother)",
    guardianPhone: "+962 79 555 0142",
    primarySupport: "Mild ID, anxiety",
    stage: "Work Experience",
    status: "on-track",
    progress: 72,
    nextSession: "Today · 2:30 PM",
    startedAt: "Sep 2024",
    targetExit: "Jun 2026",
    tags: ["Hospitality interest", "Public transit ready"],
    summary:
      "Confident communicator pursuing a hospitality track. Currently in a 6-week supported internship at Citadel Café.",
    goals: [
      { id: "g1", domain: "Employment", title: "Complete 60-hour supported internship at Citadel Café", progress: 78, due: "Aug 12", status: "in-progress" },
      { id: "g2", domain: "Independent Living", title: "Travel independently to 3 weekly destinations", progress: 90, due: "Jul 30", status: "in-progress" },
      { id: "g3", domain: "Self-Advocacy", title: "Lead her own transition meeting", progress: 40, due: "Oct 05", status: "in-progress" },
      { id: "g4", domain: "Education", title: "Earn Food Safety Level 1 certificate", progress: 100, due: "Jun 02", status: "complete" },
    ],
    notes: [
      { id: "n1", date: "Jun 17", author: "You", kind: "Site Visit", body: "Observed shift at Citadel Café. Yara handled drink prep independently; needed two prompts at register. Manager rated 4/5." },
      { id: "n2", date: "Jun 10", author: "You", kind: "Session", body: "Practiced self-introduction script for upcoming IEP. Strong eye contact; needs work on requesting accommodations." },
      { id: "n3", date: "Jun 03", author: "Layla H.", kind: "Family", body: "Family reports Yara took the bus home alone twice this week — no incidents." },
    ],
  },
  {
    id: "omar-k",
    name: "Omar Khalil",
    initials: "OK",
    age: 19,
    pronouns: "he/him",
    schoolOrProgram: "Post-secondary — Bridge Year",
    guardian: "Self / Khalil family",
    guardianPhone: "+962 77 555 0901",
    primarySupport: "ASD level 1",
    stage: "Placement",
    status: "needs-attention",
    progress: 58,
    nextSession: "Tomorrow · 10:00 AM",
    startedAt: "Jan 2024",
    targetExit: "Dec 2025",
    tags: ["IT track", "Sensory accommodations"],
    summary:
      "Strong technical aptitude. Searching for a part-time IT support role; needs interview-skills coaching.",
    goals: [
      { id: "g1", domain: "Employment", title: "Secure paid IT support placement (10+ hrs/wk)", progress: 35, due: "Sep 15", status: "in-progress" },
      { id: "g2", domain: "Self-Advocacy", title: "Disclose support needs in 2 mock interviews", progress: 50, due: "Jul 20", status: "in-progress" },
      { id: "g3", domain: "Community", title: "Join one weekly community group", progress: 20, due: "Aug 01", status: "blocked" },
    ],
    notes: [
      { id: "n1", date: "Jun 16", author: "You", kind: "Session", body: "Mock interview #2. Improved pacing. Still avoids questions about gaps — schedule a focused session." },
      { id: "n2", date: "Jun 09", author: "Employer", kind: "Employer", body: "Nimbus Tech declined to advance. Cited communication fit; offered shadow day instead — accepted." },
    ],
  },
  {
    id: "sara-m",
    name: "Sara Mansour",
    initials: "SM",
    age: 16,
    pronouns: "she/her",
    schoolOrProgram: "Hope Academy — Grade 11",
    guardian: "Hanan Mansour (mother)",
    guardianPhone: "+962 78 555 0220",
    primarySupport: "Cerebral palsy, AAC user",
    stage: "Planning",
    status: "on-track",
    progress: 44,
    nextSession: "Thu · 1:00 PM",
    startedAt: "Mar 2025",
    targetExit: "Jun 2027",
    tags: ["AAC", "Creative arts"],
    summary:
      "Emerging interests in graphic design. Setting up assistive-tech assessment and exploring postsecondary art programs.",
    goals: [
      { id: "g1", domain: "Education", title: "Visit 3 postsecondary art programs with accessibility audit", progress: 33, due: "Nov 10", status: "in-progress" },
      { id: "g2", domain: "Independent Living", title: "Master AAC for ordering food in public", progress: 60, due: "Aug 05", status: "in-progress" },
    ],
    notes: [
      { id: "n1", date: "Jun 14", author: "You", kind: "Assessment", body: "Completed transition interest inventory. Top areas: visual arts, animal care." },
    ],
  },
  {
    id: "rami-d",
    name: "Rami Darwish",
    initials: "RD",
    age: 20,
    pronouns: "he/him",
    schoolOrProgram: "Vocational Center — Year 2",
    guardian: "Self",
    guardianPhone: "+962 79 555 7711",
    primarySupport: "Deaf, primary signer (ArSL)",
    stage: "Skill-building",
    status: "at-risk",
    progress: 31,
    nextSession: "Mon · 9:30 AM",
    startedAt: "Sep 2023",
    targetExit: "Jun 2025",
    tags: ["ArSL interpreter", "Carpentry"],
    summary:
      "Skilled in fine carpentry. Interpreter coverage gap is delaying placement interviews. Escalate this week.",
    goals: [
      { id: "g1", domain: "Employment", title: "Secure interpreter-supported workshop placement", progress: 25, due: "Jul 10", status: "blocked" },
      { id: "g2", domain: "Self-Advocacy", title: "Build accommodations request kit (ArSL video + PDF)", progress: 55, due: "Jul 25", status: "in-progress" },
    ],
    notes: [
      { id: "n1", date: "Jun 12", author: "You", kind: "Session", body: "Interpreter no-show again. Filed request with provider; consider switching vendors." },
    ],
  },
  {
    id: "noor-a",
    name: "Noor Al-Amin",
    initials: "NA",
    age: 18,
    pronouns: "they/them",
    schoolOrProgram: "Al-Noor Secondary — Grade 12",
    guardian: "Fadi Al-Amin (father)",
    guardianPhone: "+962 79 555 3340",
    primarySupport: "ADHD, learning difference",
    stage: "Assessment",
    status: "on-track",
    progress: 18,
    nextSession: "Fri · 11:15 AM",
    startedAt: "May 2025",
    targetExit: "Jun 2027",
    tags: ["Intake", "Sports interest"],
    summary:
      "New intake. Strong leadership in school football team. Initial assessments scheduled across the next three weeks.",
    goals: [
      { id: "g1", domain: "Education", title: "Complete intake battery (4 instruments)", progress: 25, due: "Jul 05", status: "in-progress" },
    ],
    notes: [
      { id: "n1", date: "Jun 11", author: "You", kind: "Assessment", body: "Kickoff meeting with family. Will run vocational interest inventory next." },
    ],
  },
  {
    id: "lina-s",
    name: "Lina Saif",
    initials: "LS",
    age: 21,
    pronouns: "she/her",
    schoolOrProgram: "Transitioned · Bayan Boutique",
    guardian: "Self",
    guardianPhone: "+962 79 555 8800",
    primarySupport: "Down syndrome",
    stage: "Placement",
    status: "transitioned",
    progress: 100,
    nextSession: "30-day check-in · Jul 02",
    startedAt: "Sep 2022",
    targetExit: "May 2025",
    tags: ["Retail", "Success story"],
    summary:
      "Successfully placed at Bayan Boutique (20 hrs/wk) since May. In 90-day follow-up window.",
    goals: [
      { id: "g1", domain: "Employment", title: "Sustain placement through 90-day mark", progress: 70, due: "Aug 05", status: "in-progress" },
    ],
    notes: [
      { id: "n1", date: "Jun 02", author: "You", kind: "Site Visit", body: "30-day check. Manager rates Lina 5/5 on reliability. Coworkers warm and inclusive." },
    ],
  },
];

export const upcomingSessions: Session[] = [
  { id: "s1", clientId: "yara-h", clientName: "Yara Haddad", date: "Today, 2:30 PM", duration: 60, type: "Site Visit", location: "Citadel Café, Rainbow St." },
  { id: "s2", clientId: "omar-k", clientName: "Omar Khalil", date: "Today, 4:00 PM", duration: 45, type: "1:1 Coaching", location: "Himam Center, Room 3" },
  { id: "s3", clientId: "sara-m", clientName: "Sara Mansour", date: "Tomorrow, 10:00 AM", duration: 60, type: "Family Meeting", location: "Mansour family home" },
  { id: "s4", clientId: "noor-a", clientName: "Noor Al-Amin", date: "Tomorrow, 1:00 PM", duration: 90, type: "Assessment", location: "Himam Center, Assessment Suite" },
  { id: "s5", clientId: "rami-d", clientName: "Rami Darwish", date: "Mon, 9:30 AM", duration: 60, type: "IEP / Transition Review", location: "Vocational Center" },
];

export const tasks = [
  { id: "t1", title: "Follow up with Nimbus Tech on shadow day logistics", client: "Omar Khalil", due: "Today", priority: "high" as const },
  { id: "t2", title: "Submit interpreter vendor switch request", client: "Rami Darwish", due: "Today", priority: "high" as const },
  { id: "t3", title: "Send IEP prep packet to family", client: "Yara Haddad", due: "Tomorrow", priority: "med" as const },
  { id: "t4", title: "Schedule AAC assistive-tech assessment", client: "Sara Mansour", due: "This week", priority: "med" as const },
  { id: "t5", title: "30-day employer check-in call", client: "Lina Saif", due: "Jul 02", priority: "low" as const },
];

export function getClient(id: string) {
  return clients.find((c) => c.id === id);
}
