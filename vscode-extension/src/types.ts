export type ValidationFinding = {
  code?: string;
  message?: string;
  table?: string;
  column?: string;
  alias?: string;
  tables?: string[];
  [key: string]: unknown;
};

export type ValidationResult = {
  status?: "valid" | "invalid" | "unsupported";
  supported?: boolean;
  findings?: (string | ValidationFinding)[];
  [key: string]: unknown;
};

export type SQLCandidate = {
  sql: string;
  line: number;
  extraction?: string;
  validation?: ValidationResult;
};

export type AnalyzedFile = {
  path: string;
  language: string;
  databaseRelated: boolean;
  sqlCandidates: SQLCandidate[];
};

export type AnalysisSummary = {
  filesAnalyzed: number;
  filesWithDatabaseCode: number;
  sqlCandidatesFound: number;
  queriesValidated: number;
  queriesValid: number;
  queriesInvalid: number;
  queriesUnsupported: number;
};

export type AnalysisResult = {
  summary: AnalysisSummary;
  files: AnalyzedFile[];
  meta?: {
    timestamp: string;
    databaseName: string;
    engine: string;
  };
};

export type SchemaColumn = {
  name: string;
  type: string;
  fullType?: string;
  nullable: boolean;
  primaryKey: boolean;
  unique?: boolean;
  foreignKey?: boolean;
  default?: unknown;
};

export type SchemaRelationship = {
  column?: string;
  referencedTable?: string;
  referencedColumn?: string;
  constraintName?: string;
};

export type SchemaTable = {
  name: string;
  columns: SchemaColumn[];
  relationships?: SchemaRelationship[];
};

export type SchemaInspection = {
  database: string;
  engine: string;
  tables: SchemaTable[];
};

export type SQLExplainResponse = {
  explanation: string;
  reasoning: string;
  suggestedSql: string;
};
