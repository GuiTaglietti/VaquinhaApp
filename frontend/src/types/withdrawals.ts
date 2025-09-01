export interface WithdrawalRequest {
  fundraiser_id: string;
  bank_account_id: string;
  amount: number;
  description?: string;
}

export interface Withdrawal {
  id: string;
  fundraiser_id: string;
  bank_account_id: string;
  amount: number;
  description?: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  requested_at: string;
  processed_at?: string;
  bank_account: {
    id: string;
    bank_name: string;
    agency: string;
    account_number: string;
    account_type: string;
    account_holder_name: string;
  };
}

export interface FundraiserStats {
  total_contributions: number;
  total_contributors: number;
  recent_contributions: Array<{
    id: string;
    amount: number;
    message?: string;
    is_anonymous: boolean;
    contributor_name?: string;
    created_at: string;
  }>;
  withdrawals: Withdrawal[];
  available_balance: number;
  total_withdrawn: number;
}
