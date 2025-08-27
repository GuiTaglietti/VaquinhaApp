export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface Fundraiser {
  id: string;
  title: string;
  description?: string;
  goal_amount: number;
  current_amount: number;
  status: "ACTIVE" | "PAUSED" | "FINISHED";
  is_public: boolean;
  public_slug?: string;
  city?: string;
  state?: string;
  cover_image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFundraiserRequest {
  title: string;
  goal_amount: number;
  description?: string;
  city?: string;
  state?: string;
  cover_image_url?: string;
  is_public?: boolean;
}

export interface UpdateFundraiserRequest {
  title?: string;
  goal_amount?: number;
  description?: string;
  city?: string;
  state?: string;
  cover_image_url?: string;
  is_public?: boolean;
}

export interface Contribution {
  id: string;
  amount: number;
  message?: string;
  is_anonymous: boolean;
  status: "PENDING" | "PAID" | "FAILED";
  created_at: string;
  fundraiser?: {
    id: string;
    title: string;
    public_slug?: string;
  };
}

export interface CreateContributionRequest {
  amount: number;
  message?: string;
  is_anonymous?: boolean;
}

export interface PublicFundraiserData {
  id: string;
  title: string;
  description?: string;
  goal_amount: number;
  current_amount: number;
  cover_image_url?: string;
  city?: string;
  state?: string;
  public_slug: string;
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

export interface AuditData {
  fundraiser: Fundraiser;
  contributions: Contribution[];
}

export interface DashboardStats {
  total_fundraisers: number;
  total_raised: number;
  total_contributions: number;
}

export const BRAZILIAN_STATES = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
];
