export type PillarCode = "GOV" | "AST" | "IAM" | "END" | "PER" | "BAK" | "LOG" | "IR";

export type Question = {
  id: string;
  pillarCode: PillarCode;
  pillarName: string;
  text: string;
  order: number;
};

export const PILLARS: Array<{ code: PillarCode; name: string }> = [
  { code: "GOV", name: "Governance & Ownership" },
  { code: "AST", name: "Asset Visibility" },
  { code: "IAM", name: "Identity & Access Control" },
  { code: "END", name: "Endpoint Security" },
  { code: "PER", name: "Email & Perimeter Controls" },
  { code: "BAK", name: "Backups & Resilience" },
  { code: "LOG", name: "Logging & Monitoring" },
  { code: "IR", name: "Incident Response & Awareness" },
];

export const QUESTIONS: Question[] = [
  // GOV
  { id: "GOV-01", pillarCode: "GOV", pillarName: "Governance & Ownership", text: "Is there a named person/team accountable for cyber security?", order: 1 },
  { id: "GOV-02", pillarCode: "GOV", pillarName: "Governance & Ownership", text: "Does cyber risk get reported to leadership at least quarterly?", order: 2 },
  { id: "GOV-03", pillarCode: "GOV", pillarName: "Governance & Ownership", text: "Are basic security policies in place (acceptable use, passwords, remote access, data handling)?", order: 3 },
  { id: "GOV-04", pillarCode: "GOV", pillarName: "Governance & Ownership", text: "Is there a known set of top cyber risks (risk register or risk list)?", order: 4 },

  // AST
  { id: "AST-01", pillarCode: "AST", pillarName: "Asset Visibility", text: "Do you maintain a list of ICT assets (endpoints/servers/network equipment)?", order: 1 },
  { id: "AST-02", pillarCode: "AST", pillarName: "Asset Visibility", text: "Do you know what is public-facing/internet exposed (websites, VPN, email, DNS, hosting)?", order: 2 },
  { id: "AST-03", pillarCode: "AST", pillarName: "Asset Visibility", text: "Is there a defined way to track patching of servers/endpoints (even basic)?", order: 3 },
  { id: "AST-04", pillarCode: "AST", pillarName: "Asset Visibility", text: "Have you identified which systems are critical to Parliament operations?", order: 4 },

  // IAM
  { id: "IAM-01", pillarCode: "IAM", pillarName: "Identity & Access Control", text: "Is MFA enabled for email and remote access for all staff?", order: 1 },
  { id: "IAM-02", pillarCode: "IAM", pillarName: "Identity & Access Control", text: "Are admin accounts separated from normal user accounts?", order: 2 },
  { id: "IAM-03", pillarCode: "IAM", pillarName: "Identity & Access Control", text: "Are access changes and leavers handled promptly and consistently?", order: 3 },
  { id: "IAM-04", pillarCode: "IAM", pillarName: "Identity & Access Control", text: "Are privileged accounts reviewed regularly (at least every 6–12 months)?", order: 4 },

  // END
  { id: "END-01", pillarCode: "END", pillarName: "Endpoint Security", text: "Are workstations/laptops centrally managed (Intune/MDM/GPO/standard build)?", order: 1 },
  { id: "END-02", pillarCode: "END", pillarName: "Endpoint Security", text: "Is endpoint protection deployed and monitored (Defender, CrowdStrike, Sophos etc.)?", order: 2 },
  { id: "END-03", pillarCode: "END", pillarName: "Endpoint Security", text: "Are all portable devices encrypted (BitLocker/FileVault)?", order: 3 },
  { id: "END-04", pillarCode: "END", pillarName: "Endpoint Security", text: "Are local admin rights restricted and granted only where necessary?", order: 4 },

  // PER
  { id: "PER-01", pillarCode: "PER", pillarName: "Email & Perimeter Controls", text: "Is phishing/spam filtering in place and actively managed?", order: 1 },
  { id: "PER-02", pillarCode: "PER", pillarName: "Email & Perimeter Controls", text: "Are SPF + DKIM + DMARC implemented for official Parliament domains?", order: 2 },
  { id: "PER-03", pillarCode: "PER", pillarName: "Email & Perimeter Controls", text: "Is remote access protected (VPN or ZTNA + MFA, strong controls)?", order: 3 },
  { id: "PER-04", pillarCode: "PER", pillarName: "Email & Perimeter Controls", text: "Is there a managed firewall with change control and basic rule hygiene?", order: 4 },

  // BAK
  { id: "BAK-01", pillarCode: "BAK", pillarName: "Backups & Resilience", text: "Are backups in place for critical systems and important data?", order: 1 },
  { id: "BAK-02", pillarCode: "BAK", pillarName: "Backups & Resilience", text: "Are restores tested at least annually (or more often)?", order: 2 },
  { id: "BAK-03", pillarCode: "BAK", pillarName: "Backups & Resilience", text: "Are backups protected from ransomware (offline/immutable/separate credentials)?", order: 3 },
  { id: "BAK-04", pillarCode: "BAK", pillarName: "Backups & Resilience", text: "Is there a basic continuity plan or agreed approach for what matters most during outages?", order: 4 },

  // LOG
  { id: "LOG-01", pillarCode: "LOG", pillarName: "Logging & Monitoring", text: "Is there central visibility of security events (SIEM, Defender portal, syslog, alerting)?", order: 1 },
  { id: "LOG-02", pillarCode: "LOG", pillarName: "Logging & Monitoring", text: "Is there a defined process/person responsible for responding to alerts?", order: 2 },
  { id: "LOG-03", pillarCode: "LOG", pillarName: "Logging & Monitoring", text: "Are key audit logs enabled for identity/email/admin activity?", order: 3 },

  // IR
  { id: "IR-01", pillarCode: "IR", pillarName: "Incident Response & Awareness", text: "Is there a basic documented incident response process (even a 1–2 pager)?", order: 1 },
  { id: "IR-02", pillarCode: "IR", pillarName: "Incident Response & Awareness", text: "Have you run an incident tabletop exercise in the last 12–18 months?", order: 2 },
  { id: "IR-03", pillarCode: "IR", pillarName: "Incident Response & Awareness", text: "Do staff receive security awareness guidance/training at least annually?", order: 3 },
];
