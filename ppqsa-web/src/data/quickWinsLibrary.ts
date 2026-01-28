import type { Question } from "./questionBank";

export type QuickWinEffort = "Low" | "Med" | "High";
export type QuickWinIndicativeCost = "$" | "$$" | "$$$";
export type QuickWinTimeframe = "0-30 days" | "30-90 days" | "90+";

export type QuickWinRecommendation = {
  recommendationTitle: string;
  actionSteps: [string, string, string];
  whyItMatters: string;
  suggestedOwner: string;
  effort: QuickWinEffort;
  indicativeCost: QuickWinIndicativeCost;
  timeframe: QuickWinTimeframe;
};

export type QuickWinsLibrary = Record<Question["id"], QuickWinRecommendation>;

export const QUICK_WINS_LIBRARY: QuickWinsLibrary = {
  // GOV
  "GOV-01": {
    recommendationTitle: "Assign clear cyber accountability",
    actionSteps: [
      "Nominate an accountable owner (person or role) for cyber security.",
      "Define responsibilities (policy approvals, risk decisions, reporting cadence).",
      "Schedule a monthly check-in to track progress on actions.",
    ],
    whyItMatters: "Clear accountability helps prioritise and deliver improvements.",
    suggestedOwner: "Leadership",
    effort: "Low",
    indicativeCost: "$",
    timeframe: "0-30 days",
  },
  "GOV-02": {
    recommendationTitle: "Introduce quarterly cyber reporting",
    actionSteps: [
      "Create a one-page cyber status report template.",
      "Agree a quarterly reporting cadence with leadership.",
      "Track a small set of metrics and actions to completion.",
    ],
    whyItMatters: "Regular reporting keeps cyber risk visible and supports timely decisions.",
    suggestedOwner: "Leadership",
    effort: "Low",
    indicativeCost: "$",
    timeframe: "0-30 days",
  },
  "GOV-03": {
    recommendationTitle: "Publish core security policies",
    actionSteps: [
      "Draft short policies (acceptable use, passwords/MFA, remote access).",
      "Get leadership approval and publish to all staff.",
      "Embed policies into onboarding and annual refresh communications.",
    ],
    whyItMatters: "Policies set expectations and reduce preventable security incidents.",
    suggestedOwner: "Leadership",
    effort: "Med",
    indicativeCost: "$",
    timeframe: "30-90 days",
  },
  "GOV-04": {
    recommendationTitle: "Create a simple cyber risk list",
    actionSteps: [
      "List the top risks and their business impact.",
      "Assign an owner and 1–2 actions per risk.",
      "Review the list quarterly and update priorities.",
    ],
    whyItMatters: "A shared risk list helps focus effort on the highest-impact gaps.",
    suggestedOwner: "Leadership",
    effort: "Low",
    indicativeCost: "$",
    timeframe: "0-30 days",
  },

  // AST
  "AST-01": {
    recommendationTitle: "Build an ICT asset register",
    actionSteps: [
      "Start with endpoints, servers, and network equipment.",
      "Record owner, location, OS/version, and criticality.",
      "Update monthly and link new purchases to the register.",
    ],
    whyItMatters: "You cannot protect or patch what you cannot identify.",
    suggestedOwner: "ICT Ops",
    effort: "Med",
    indicativeCost: "$",
    timeframe: "30-90 days",
  },
  "AST-02": {
    recommendationTitle: "Inventory internet-exposed services",
    actionSteps: [
      "List public-facing services (websites, VPN, email, DNS, hosting).",
      "Record who patches/owns each service and how access is controlled.",
      "Remove or lock down anything unused.",
    ],
    whyItMatters: "Public-facing services are common attack paths and need extra control.",
    suggestedOwner: "ICT Ops",
    effort: "Low",
    indicativeCost: "$",
    timeframe: "0-30 days",
  },
  "AST-03": {
    recommendationTitle: "Define a basic patch tracking process",
    actionSteps: [
      "Set a monthly patch cadence plus an emergency patch process.",
      "Track patch status for endpoints and servers (even in a spreadsheet).",
      "Report patch compliance and exceptions monthly.",
    ],
    whyItMatters: "Patch visibility reduces exposure to known exploited vulnerabilities.",
    suggestedOwner: "ICT Ops",
    effort: "Med",
    indicativeCost: "$",
    timeframe: "30-90 days",
  },
  "AST-04": {
    recommendationTitle: "Identify critical systems",
    actionSteps: [
      "Agree which systems are essential to Parliament operations.",
      "Tier systems by criticality (critical/important/standard).",
      "Use tiers to prioritise backups, monitoring, and patching.",
    ],
    whyItMatters: "Criticality guides backup priorities and outage planning.",
    suggestedOwner: "Leadership",
    effort: "Low",
    indicativeCost: "$",
    timeframe: "0-30 days",
  },

  // IAM
  "IAM-01": {
    recommendationTitle: "Enable MFA for email and remote access",
    actionSteps: [
      "Enable MFA for all staff, prioritising admins and leadership.",
      "Disable legacy authentication where possible.",
      "Track and remediate MFA exceptions until coverage is complete.",
    ],
    whyItMatters: "MFA reduces account compromise from stolen passwords.",
    suggestedOwner: "ICT Ops",
    effort: "Med",
    indicativeCost: "$",
    timeframe: "0-30 days",
  },
  "IAM-02": {
    recommendationTitle: "Separate admin and user accounts",
    actionSteps: [
      "Create separate privileged accounts for administrators.",
      "Require MFA and stronger controls for privileged accounts.",
      "Document when and how privileged access is used and approved.",
    ],
    whyItMatters: "Admin separation limits damage if a normal account is compromised.",
    suggestedOwner: "ICT Ops",
    effort: "Med",
    indicativeCost: "$",
    timeframe: "30-90 days",
  },
  "IAM-03": {
    recommendationTitle: "Standardise joiner/leaver access changes",
    actionSteps: [
      "Create a joiner/leaver checklist and approval flow.",
      "Set an SLA (e.g., leavers disabled within 24 hours).",
      "Keep an auditable record of completion.",
    ],
    whyItMatters: "Prompt access removal reduces risk from orphaned accounts and unauthorised access.",
    suggestedOwner: "Service Desk",
    effort: "Low",
    indicativeCost: "$",
    timeframe: "0-30 days",
  },
  "IAM-04": {
    recommendationTitle: "Schedule privileged access reviews",
    actionSteps: [
      "List privileged groups, admins, and service accounts.",
      "Review access at least every 6–12 months with system owners.",
      "Remove unnecessary access and document exceptions.",
    ],
    whyItMatters: "Regular reviews reduce unnecessary access and misuse risk.",
    suggestedOwner: "ICT Ops",
    effort: "Low",
    indicativeCost: "$",
    timeframe: "90+",
  },

  // END
  "END-01": {
    recommendationTitle: "Standardise endpoint management",
    actionSteps: [
      "Define a standard build and baseline configuration.",
      "Use a central management tool to enforce settings and updates.",
      "Reduce unsupported devices and exceptions over time.",
    ],
    whyItMatters: "Central management enables consistent patching and secure configuration.",
    suggestedOwner: "ICT Ops",
    effort: "High",
    indicativeCost: "$$",
    timeframe: "90+",
  },
  "END-02": {
    recommendationTitle: "Deploy and monitor endpoint protection",
    actionSteps: [
      "Confirm endpoint protection is installed on all devices.",
      "Enable alerting and assign who reviews alerts.",
      "Keep agents up to date and enable tamper protection.",
    ],
    whyItMatters: "Endpoint protection helps detect and contain malware.",
    suggestedOwner: "ICT Ops",
    effort: "Med",
    indicativeCost: "$$",
    timeframe: "30-90 days",
  },
  "END-03": {
    recommendationTitle: "Enable full-disk encryption",
    actionSteps: [
      "Enable BitLocker/FileVault (or equivalent) on all laptops.",
      "Store recovery keys securely and test recovery.",
      "Make encryption part of the standard device build.",
    ],
    whyItMatters: "Encryption reduces data exposure when devices are lost or stolen.",
    suggestedOwner: "ICT Ops",
    effort: "Med",
    indicativeCost: "$",
    timeframe: "30-90 days",
  },
  "END-04": {
    recommendationTitle: "Restrict local admin rights",
    actionSteps: [
      "Identify who has local admin and why.",
      "Remove broad admin rights and introduce an exception process.",
      "Use separate admin accounts or time-bound elevation where possible.",
    ],
    whyItMatters: "Fewer admin rights reduces ransomware spread and accidental changes.",
    suggestedOwner: "ICT Ops",
    effort: "Med",
    indicativeCost: "$",
    timeframe: "30-90 days",
  },

  // PER
  "PER-01": {
    recommendationTitle: "Tune and manage anti-phishing controls",
    actionSteps: [
      "Review and enable recommended anti-phishing policies.",
      "Define a process for reported phishing (triage and comms).",
      "Review blocked events and false positives monthly.",
    ],
    whyItMatters: "Email is a leading entry point for attacks and credential theft.",
    suggestedOwner: "ICT Ops",
    effort: "Med",
    indicativeCost: "$$",
    timeframe: "30-90 days",
  },
  "PER-02": {
    recommendationTitle: "Implement SPF, DKIM, and DMARC",
    actionSteps: [
      "Publish SPF records and enable DKIM signing.",
      "Enable DMARC monitoring, then progress to quarantine/reject.",
      "Review DMARC reports and fix misaligned senders.",
    ],
    whyItMatters: "Domain protections reduce spoofing and improve trust in official email.",
    suggestedOwner: "ICT Ops",
    effort: "Med",
    indicativeCost: "$",
    timeframe: "30-90 days",
  },
  "PER-03": {
    recommendationTitle: "Harden remote access",
    actionSteps: [
      "Enforce MFA for VPN/remote access and restrict admin access paths.",
      "Limit remote access to required users and review access monthly.",
      "Enable logging and alerts for unusual sign-ins.",
    ],
    whyItMatters: "Remote access is a high-value target and needs strong protection.",
    suggestedOwner: "ICT Ops",
    effort: "Med",
    indicativeCost: "$$",
    timeframe: "0-30 days",
  },
  "PER-04": {
    recommendationTitle: "Apply basic firewall rule hygiene",
    actionSteps: [
      "Review inbound rules and remove anything unused or overly broad.",
      "Implement change control for firewall changes (who/why/when).",
      "Restrict management access and keep firmware up to date.",
    ],
    whyItMatters: "Good rule hygiene reduces exposure and misconfiguration risk.",
    suggestedOwner: "ICT Ops",
    effort: "Med",
    indicativeCost: "$$",
    timeframe: "30-90 days",
  },

  // BAK
  "BAK-01": {
    recommendationTitle: "Ensure backups for critical systems",
    actionSteps: [
      "Confirm critical systems are backed up and schedules are documented.",
      "Define retention and recovery objectives for key services.",
      "Enable alerts for failed backup jobs.",
    ],
    whyItMatters: "Backups are essential for recovery from ransomware and outages.",
    suggestedOwner: "ICT Ops",
    effort: "Med",
    indicativeCost: "$$",
    timeframe: "0-30 days",
  },
  "BAK-02": {
    recommendationTitle: "Test restores on a schedule",
    actionSteps: [
      "Perform a restore test for at least one system or dataset.",
      "Document the steps, time taken, and issues found.",
      "Schedule repeat tests and track improvements.",
    ],
    whyItMatters: "Restore testing confirms backups work when needed.",
    suggestedOwner: "ICT Ops",
    effort: "Low",
    indicativeCost: "$",
    timeframe: "30-90 days",
  },
  "BAK-03": {
    recommendationTitle: "Protect backups from ransomware",
    actionSteps: [
      "Use separate credentials and restrict admin access to backup systems.",
      "Add offline or immutable backup copies for critical data.",
      "Enable alerts for deletion attempts and unusual access.",
    ],
    whyItMatters: "Protected backups prevent attackers from removing recovery options.",
    suggestedOwner: "ICT Ops",
    effort: "High",
    indicativeCost: "$$",
    timeframe: "90+",
  },
  "BAK-04": {
    recommendationTitle: "Create a basic continuity approach",
    actionSteps: [
      "Agree the top services and processes to restore first.",
      "Document roles, contacts, and decision points.",
      "Run a short walkthrough to validate and update.",
    ],
    whyItMatters: "Continuity planning reduces downtime and confusion during outages.",
    suggestedOwner: "Leadership",
    effort: "Med",
    indicativeCost: "$",
    timeframe: "30-90 days",
  },

  // LOG
  "LOG-01": {
    recommendationTitle: "Centralise security event visibility",
    actionSteps: [
      "Identify key log sources (identity, email, endpoints, firewall).",
      "Enable central access/collection and basic alerting.",
      "Define who reviews alerts and how escalations work.",
    ],
    whyItMatters: "Visibility enables faster detection and response.",
    suggestedOwner: "ICT Ops",
    effort: "High",
    indicativeCost: "$$",
    timeframe: "90+",
  },
  "LOG-02": {
    recommendationTitle: "Assign alert triage ownership",
    actionSteps: [
      "Assign a primary and backup person for alert review.",
      "Create response steps for common alerts.",
      "Agree escalation paths for major incidents.",
    ],
    whyItMatters: "Clear responsibility prevents missed alerts and delays.",
    suggestedOwner: "ICT Ops",
    effort: "Low",
    indicativeCost: "$",
    timeframe: "0-30 days",
  },
  "LOG-03": {
    recommendationTitle: "Enable key audit logging",
    actionSteps: [
      "Enable audit logs for identity, email, and admin activity.",
      "Set retention suitable for investigations.",
      "Confirm logs are searchable during incidents.",
    ],
    whyItMatters: "Audit logs support investigations and detection of unauthorised activity.",
    suggestedOwner: "ICT Ops",
    effort: "Med",
    indicativeCost: "$",
    timeframe: "30-90 days",
  },

  // IR
  "IR-01": {
    recommendationTitle: "Document a basic incident response process",
    actionSteps: [
      "Write a short playbook: detect, contain, recover, and report.",
      "Define roles, contacts, and communications channels.",
      "Store it where it is accessible during outages.",
    ],
    whyItMatters: "A basic playbook reduces confusion and speeds response.",
    suggestedOwner: "ICT Ops",
    effort: "Low",
    indicativeCost: "$",
    timeframe: "0-30 days",
  },
  "IR-02": {
    recommendationTitle: "Run an incident tabletop exercise",
    actionSteps: [
      "Pick a scenario and hold a 60-minute tabletop session.",
      "Walk through actions, communications, and decisions.",
      "Capture improvements and assign owners and dates.",
    ],
    whyItMatters: "Exercises reveal gaps and build confidence in escalation paths.",
    suggestedOwner: "Leadership",
    effort: "Low",
    indicativeCost: "$",
    timeframe: "30-90 days",
  },
  "IR-03": {
    recommendationTitle: "Deliver annual security awareness guidance",
    actionSteps: [
      "Share a short training/briefing on phishing and safe practices.",
      "Define a single reporting path for suspicious emails/incidents.",
      "Repeat annually and after major incidents.",
    ],
    whyItMatters: "Awareness reduces phishing success and improves reporting.",
    suggestedOwner: "Leadership",
    effort: "Low",
    indicativeCost: "$",
    timeframe: "30-90 days",
  },
};
