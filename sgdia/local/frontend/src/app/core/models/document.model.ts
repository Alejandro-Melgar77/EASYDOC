export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  path: string[]; // List of parent folder IDs for breadcrumb
}

export interface DocumentVersion {
  version: string;
  author: string;
  date: string;
  summary: string;
  fileSize: string;
}

export interface DocumentPermission {
  subjectId: string; // User ID or Role name
  subjectName: string;
  type: 'user' | 'role';
  level: 'read' | 'write' | 'approve' | 'admin';
}

export interface Document {
  id: string;
  title: string;
  description: string;
  type: 'pdf' | 'doc' | 'xls' | 'img';
  size: string;
  folderId: string;
  tags: string[];
  author: string;
  createdAt: string;
  status: 'active' | 'archived';
  versions: DocumentVersion[];
  permissions: DocumentPermission[];
}
