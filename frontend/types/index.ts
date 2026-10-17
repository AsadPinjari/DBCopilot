
export type DatabaseConnectionConfig = {
  host: string;
  port: string;
  username: string;
  password: string;
  database: string;
};

export type SchemaColumn = {
  name: string;
  type?: string;
  dataType?: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  nullable?: boolean;
};

export type SchemaTable = {
  name: string;
  columns?: SchemaColumn[];
};

export type SchemaRelationship = {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
};

export type AnalysisSummary = {
  totalFiles?: number;
  totalTables?: number;
  totalQueries?: number;
  issuesFound?: number;
};

export type AnalysisData = Record<string, unknown>;

export type SQLExplanationResult = unknown;
