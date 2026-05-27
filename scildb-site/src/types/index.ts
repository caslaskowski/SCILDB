export interface Case {
  caseId: string;
  caseName: string;
  "Case Name": string;     // yes, with the space — JSON has both forms
  Year: string;
  Citation: string;
  "Final Categories": string;
  "Tribes Involved": string | null;
  partyWinning: "0" | "1" | "2";
  decisionType: string;
  // …all 39 fields from the JSON
}

export interface Vote {
  caseId: string;
  justiceName: string;
  vote: string | null;
  direction: "1" | "2" | null;
  majority: "1" | "2" | null;
  opinion: string | null;
  // …rest of the SCDB vote fields
}

export interface Justice {
  "Justice Name": string;     // the short code, e.g. "JMarshall"
  "Full Name": string;
  "Years on Court": string;
}