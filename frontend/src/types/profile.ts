export interface UserProfile {
  id: string;
  name: string;
  email: string;
  document_type: "CPF" | "CNPJ";
  document_number?: string;
  rg?: string;
  phone?: string;
  birth_date?: string;
  address?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zip_code: string;
  };
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileRequest {
  name?: string;
  document_type?: "CPF" | "CNPJ";
  document_number?: string;
  rg?: string;
  phone?: string;
  birth_date?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  };
}

export interface BankAccount {
  id: string;
  bank_code: string;
  bank_name: string;
  agency: string;
  account_number: string;
  account_type: "CHECKING" | "SAVINGS";
  account_holder_name: string;
  document_number: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBankAccountRequest {
  bank_code: string;
  agency: string;
  account_number: string;
  account_type: "CHECKING" | "SAVINGS";
  account_holder_name: string;
  document_number: string;
  is_default?: boolean;
}

export interface UpdateBankAccountRequest {
  bank_code?: string;
  agency?: string;
  account_number?: string;
  account_type?: "CHECKING" | "SAVINGS";
  account_holder_name?: string;
  document_number?: string;
  is_default?: boolean;
}

export interface PublicFundraiserListItem {
  id: string;
  title: string;
  description?: string;
  goal_amount: number;
  current_amount: number;
  cover_image_url?: string;
  city?: string;
  state?: string;
  public_slug: string;
  created_at: string;
}

export const BRAZILIAN_BANKS = [
  { code: "001", name: "Banco do Brasil" },
  { code: "033", name: "Banco Santander" },
  { code: "104", name: "Caixa Econômica Federal" },
  { code: "237", name: "Banco Bradesco" },
  { code: "341", name: "Banco Itaú" },
  { code: "260", name: "Nu Pagamentos" },
  { code: "077", name: "Banco Inter" },
  { code: "212", name: "Banco Original" },
  { code: "290", name: "Pagseguro Internet" },
  { code: "323", name: "Mercado Pago" },
];
