export type BusinessPolicyStatus = 'draft' | 'published' | 'archived';

export interface BusinessPolicy {
  id: string;
  name: string;
  status: BusinessPolicyStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
  nodes: unknown[];
  edges: unknown[];
  lanes?: unknown[];
  form: {
    questions: unknown[];
    attachments: unknown[];
  };
  artifacts?: PolicyArtifact[];
  description?: string;
}

export interface PolicyArtifact {
  id: string;
  title: string;
  filename: string;
  artifact_type: 'master_docx' | 'diagram_json' | 'requirements_xlsx';
  document_id: string;
  editable_roles: string[];
  storage_available: boolean;
}
