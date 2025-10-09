// Type definitions for jGrants API responses

export interface AttachmentListItem {
  index: number; // download_attachment に渡すそのままの index
  name: string;
  sizeBytes: number; // Base64 デコード後の実バイトサイズ
}

export interface AttachmentGroup {
  count: number;
  hasAttachments: boolean;
  attachments: AttachmentListItem[];
}

export interface SubsidyListResponse {
  metadata: {
    type: string;
    resultset: {
      count: number;
    };
  };
  result: Array<{
    id: string;
    name: string;
    title?: string;
    target_area_search?: string;
    subsidy_max_limit?: number;
    acceptance_start_datetime?: string;
    acceptance_end_datetime?: string;
    target_number_of_employees?: string;
  }>;
}

export interface SubsidyDetailResponse {
  metadata: {
    type: string;
    resultset: {
      count: number;
    };
  };
  result: Array<{
    id: string;
    name: string;
    title?: string;
    subsidy_catch_phrase?: string;
    detail?: string;
    use_purpose?: string;
    industry?: string;
    target_area_search?: string;
    target_area_detail?: string;
    target_number_of_employees?: string;
    subsidy_rate?: string;
    subsidy_max_limit?: number;
    acceptance_start_datetime?: string;
    acceptance_end_datetime?: string;
    project_end_deadline?: string;
    request_reception_presence?: string;
    is_enable_multiple_request?: boolean;
    front_subsidy_detail_page_url?: string;
    application_guidelines?: Array<{
      name: string;
      data: string;
    }>;
    outline_of_grant?: Array<{
      name: string;
      data: string;
    }>;
    application_form?: Array<{
      name: string;
      data: string;
    }>;
  }>;
}

export type SubsidyDetail = SubsidyDetailResponse["result"][number];

export type SubsidyDetailSummary = Omit<
  SubsidyDetail,
  "application_guidelines" | "outline_of_grant" | "application_form"
> & {
  application_guidelines?: AttachmentGroup;
  outline_of_grant?: AttachmentGroup;
  application_form?: AttachmentGroup;
};
