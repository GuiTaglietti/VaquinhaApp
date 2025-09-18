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

export type PixKeyType = "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "EVP";

export interface BankAccount {
  id: string;
  bank_code: string;
  bank_name?: string;
  agency: string;
  account_number: string;
  account_type: "CHECKING" | "SAVINGS";
  account_holder_name: string;
  document_number: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  pix_key?: string | null;
  pix_key_type?: PixKeyType | null;
}

export interface CreateBankAccountRequest {
  bank_code: string;
  bank_name?: string;
  agency: string;
  account_number: string;
  account_type: "CHECKING" | "SAVINGS";
  account_holder_name: string;
  document_number: string;
  is_default?: boolean;
  pix_key?: string | null;
  pix_key_type?: PixKeyType | null;
}

export interface UpdateBankAccountRequest {
  bank_code?: string;
  bank_name?: string;
  agency?: string;
  account_number?: string;
  account_type?: "CHECKING" | "SAVINGS";
  account_holder_name?: string;
  document_number?: string;
  is_default?: boolean;
  pix_key?: string | null;
  pix_key_type?: PixKeyType | null;
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
  { code: "001", name: "Banco do Brasil S.A." },
  { code: "003", name: "Banco da Amazônia S.A." },
  { code: "004", name: "Banco do Nordeste do Brasil S.A." },
  { code: "007", name: "Banco Nacional de Desenvolvimento Econômico e Social (BNDES)" },
  { code: "011", name: "Credit Suisse Hedging-Griffo" },
  { code: "012", name: "Banco Inbursa" },
  { code: "021", name: "Banestes S.A. - Banco do Estado do Espírito Santo" },
  { code: "025", name: "Banco Alfa S.A." },
  { code: "027", name: "Besc S.A. - Banco do Estado de Santa Catarina" },
  { code: "029", name: "Banco Itaú Consignado S.A." },
  { code: "033", name: "Banco Santander (Brasil) S.A." },
  { code: "036", name: "Banco Bradesco BBI S.A." },
  { code: "037", name: "Banco do Estado do Pará S.A. (Banpará)" },
  { code: "041", name: "Banco do Estado do Rio Grande do Sul S.A. (Banrisul)" },
  { code: "047", name: "Banco do Estado de Sergipe S.A. (Banese)" },
  { code: "062", name: "Hipercard Banco Múltiplo S.A." },
  { code: "070", name: "Banco de Brasília S.A. (BRB)" },
  { code: "077", name: "Banco Inter S.A." },
  { code: "085", name: "Cooperativa Central de Crédito Urbano (CECRED)" },
  { code: "092", name: "Banco Topázio S.A." },
  { code: "102", name: "XP Investimentos CCTVM S.A." },
  { code: "104", name: "Caixa Econômica Federal" },
  { code: "105", name: "Lecca Crédito, Financiamento e Investimento" },
  { code: "120", name: "Banco Rodobens S.A." },
  { code: "121", name: "Banco Agibank S.A." },
  { code: "122", name: "Banco Bradesco BERJ S.A." },
  { code: "129", name: "UBS Brasil CCTVM S.A." },
  { code: "136", name: "Unicred Central do Rio Grande do Sul" },
  { code: "143", name: "Treviso Corretora de Câmbio" },
  { code: "197", name: "Stone Pagamentos S.A." },
  { code: "208", name: "Banco BTG Pactual S.A." },
  { code: "212", name: "Banco Original S.A." },
  { code: "213", name: "Banco Arbi S.A." },
  { code: "214", name: "Banco Dibens S.A." },
  { code: "218", name: "Banco BS2 S.A." },
  { code: "222", name: "Banco Credit Agricole Brasil S.A." },
  { code: "224", name: "Banco Fibra S.A." },
  { code: "233", name: "Banco Cifra S.A." },
  { code: "237", name: "Banco Bradesco S.A." },
  { code: "241", name: "Banco Clássico S.A." },
  { code: "243", name: "Banco Máxima S.A." },
  { code: "246", name: "Banco ABC Brasil S.A." },
  { code: "249", name: "Banco Investcred Unibanco S.A." },
  { code: "250", name: "Banco BCV S.A." },
  { code: "260", name: "Nu Pagamentos S.A. (Nubank)" },
  { code: "265", name: "Banco Fator S.A." },
  { code: "266", name: "Banco Cédula S.A." },
  { code: "290", name: "PagSeguro Internet S.A." },
  { code: "323", name: "Mercado Pago – Banco" },
  { code: "336", name: "Banco C6 S.A. (C6 Bank)" },
  { code: "341", name: "Banco Itaú Unibanco S.A." },
  { code: "362", name: "Banco Société Générale Brasil S.A." },
  { code: "370", name: "Banco Mizuho do Brasil S.A." },
  { code: "380", name: "PicPay Bank S.A." },
  { code: "389", name: "Banco Mercantil do Brasil S.A." },
  { code: "394", name: "Banco Bradesco Financiamentos S.A." },
  { code: "399", name: "Kirton Bank S.A." },
  { code: "422", name: "Banco Safra S.A." },
  { code: "456", name: "Banco MUFG Brasil S.A." },
  { code: "464", name: "Banco Sumitomo Mitsui Brasileiro S.A." },
  { code: "473", name: "Banco Caixa Geral Brasil S.A." },
  { code: "479", name: "Banco Itaubank S.A." },
  { code: "487", name: "Deutsche Bank S.A." },
  { code: "488", name: "JPMorgan Chase Bank" },
  { code: "492", name: "ING Bank N.V." },
  { code: "494", name: "Banco de La Nacion Argentina" },
  { code: "495", name: "Banco La Provincia Buenos Aires" },
  { code: "505", name: "Banco Credit Suisse Brasil S.A." },
  { code: "600", name: "Banco Luso Brasileiro S.A." },
  { code: "604", name: "Banco Industrial do Brasil S.A." },
  { code: "610", name: "Banco VR S.A." },
  { code: "611", name: "Banco Paulista S.A." },
  { code: "612", name: "Banco Guanabara S.A." },
  { code: "623", name: "Banco Pan S.A." },
  { code: "626", name: "Banco Ficsa S.A." },
  { code: "630", name: "Banco Intercap S.A." },
  { code: "633", name: "Banco Rendimento S.A." },
  { code: "634", name: "Banco Triângulo S.A. (Tribanco)" },
  { code: "637", name: "Banco Sofisa S.A." },
  { code: "641", name: "Banco Alvorada S.A." },
  { code: "643", name: "Banco Pine S.A." },
  { code: "652", name: "Itaú Unibanco Holding S.A." },
  { code: "653", name: "Banco Indusval S.A. (Ubank)" },
  { code: "654", name: "Banco A.J. Renner S.A." },
  { code: "655", name: "Banco Votorantim S.A." },
  { code: "707", name: "Banco Daycoval S.A." },
  { code: "712", name: "Banco Ourinvest S.A." },
  { code: "739", name: "Banco Cetelem S.A." },
  { code: "741", name: "Banco Ribeirão Preto S.A." },
  { code: "743", name: "Banco Semear S.A." },
  { code: "745", name: "Banco Citibank S.A." },
  { code: "746", name: "Banco Modal S.A." },
  { code: "747", name: "Banco Rabobank International Brasil S.A." },
  { code: "748", name: "Sicredi S.A. - Cooperativa de Crédito" },
  { code: "751", name: "Scotiabank Brasil S.A." },
  { code: "752", name: "Banco BNP Paribas Brasil S.A." },
  { code: "756", name: "Banco Cooperativo do Brasil S.A. (Bancoob)" },
  { code: "757", name: "KEB Hana Bank Brasil S.A." },
];

