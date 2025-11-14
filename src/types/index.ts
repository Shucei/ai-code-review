export interface GitLabMergeRequestEvent {
  object_kind: string;
  event_type: string;
  user: {
    id: number;
    name: string;
    username: string;
    email: string;
  };
  project: {
    id: number;
    name: string;
    description: string;
    web_url: string;
    git_http_url: string;
    namespace: string;
    visibility_level: number;
    path_with_namespace: string;
    default_branch: string;
  };
  object_attributes: {
    id: number;
    iid: number;
    title: string;
    description: string;
    state: string;
    created_at: string;
    updated_at: string;
    target_branch: string;
    source_branch: string;
    source_project_id: number;
    target_project_id: number;
    author_id: number;
    assignee_id: number | null;
    action: "open" | "update" | "merge" | "close" | "reopen";
    work_in_progress: boolean;
    source: {
      name: string;
      description: string;
      web_url: string;
      git_http_url: string;
      namespace: string;
      visibility_level: number;
    };
    target: {
      name: string;
      description: string;
      web_url: string;
      git_http_url: string;
      namespace: string;
      visibility_level: number;
    };
    last_commit: {
      id: string;
      message: string;
      timestamp: string;
      url: string;
      author: {
        name: string;
        email: string;
      };
    };
  };
  labels: Array<{
    id: number;
    title: string;
    color: string;
    project_id: number;
    created_at: string;
    updated_at: string;
  }>;
  changes: {
    updated_at?: {
      previous: string;
      current: string;
    };
  };
}

export interface GitLabDiffFile {
  old_path: string;
  new_path: string;
  a_mode: string;
  b_mode: string;
  new_file: boolean;
  renamed_file: boolean;
  deleted_file: boolean;
  diff: string;
}

export interface GitLabComment {
  body: string;
  position?: {
    base_sha: string;
    start_sha: string;
    head_sha: string;
    old_path: string;
    new_path: string;
    position_type: "text";
    old_line?: number;
    new_line: number;
  };
}

export interface CodeReviewComment {
  file: string;
  line: number;
  message: string;
  severity: "error" | "warning" | "info";
  rule?: string;
  suggestion?: string;
}

export interface ReviewResult {
  projectId: number;
  mergeRequestIid: number;
  comments: CodeReviewComment[];
  summary: {
    totalIssues: number;
    errors: number;
    warnings: number;
    infos: number;
  };
}

export interface Config {
  gitlabUrl: string;
  gitlabToken: string;
  webhookSecret?: string;
  aiApiKey: string;
  aiModel: string;
  port: number;
  logLevel: string;
  targetBranches?: string[]; // 需要审查的目标分支列表，默认为 ["master", "main"]
}

export interface DiffChange {
  file: string;
  oldPath: string;
  newPath: string;
  isNew: boolean;
  isDeleted: boolean;
  isRenamed: boolean;
  changes: Array<{
    type: "add" | "delete" | "modify";
    lineNumber: number;
    content: string;
  }>;
}
