export type FundraiserStatus = "ACTIVE" | "PAUSED" | "FINISHED";

export interface UpdateFundraiserStatusRequest {
  status: FundraiserStatus;
  reason?: string;
}

export interface StatusChangeLog {
  id: string;
  fundraiser_id: string;
  old_status: FundraiserStatus;
  new_status: FundraiserStatus;
  reason?: string;
  changed_by: string;
  changed_at: string;
}
