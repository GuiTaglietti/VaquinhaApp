import os
from textwrap import dedent
from sqlalchemy import create_engine, text

# ===== Conteúdos (MD) =====
PRIVACY_MD = dedent("""\
## 📜 Política de Privacidade e Tratamento de Dados – Velório Solidário

1. **Introdução**
O Velório Solidário é uma plataforma digital voltada a proporcionar apoio em um dos momentos mais sensíveis da vida: a despedida de alguém querido. Sabemos da importância da confiança, da transparência e da segurança nesse processo, e por isso cuidamos com responsabilidade das informações pessoais de todos que utilizam nossos serviços.
Esta Política de Privacidade e Tratamento de Dados explica de forma clara e acessível:
- Quais informações coletamos.
- Como utilizamos e protegemos os dados.
- Em quais situações podemos compartilhá-los.
- Quais são os direitos de cada usuário, de acordo com a Lei Geral de Proteção de Dados Pessoais – LGPD (Lei nº 13.709/2018).

Ao utilizar a plataforma, você concorda com os termos aqui descritos. Caso não concorde, não realize o cadastro nem utilize os serviços.

2. **Controlador e dados da empresa**
**Duke Soluções Financeiras Ltda.**  
CNPJ: 42.735.849/0001-53  
Sede: Sarandi – RS  
E-mail de contato para assuntos de privacidade: privacidade@veloriosolidario.com.br

3. **Dados coletados**
- Dados pessoais de cadastro: nome completo, CPF, data de nascimento, endereço, e-mail, telefone, senha.
- Dados financeiros: dados bancários e de pagamento (para processar doações e repasses).
- Dados de navegação: endereço IP, dispositivo, navegador, registros de acesso, histórico de páginas, cookies e geolocalização aproximada.
- Dados de uso: informações sobre campanhas criadas, doações realizadas, atualizações no cadastro.

4. **Finalidade do uso dos dados**
Os dados pessoais são tratados para:
- Permitir a criação e gestão de campanhas solidárias.
- Processar doações, pagamentos e repasses aos beneficiários.
- Cumprir obrigações legais, regulatórias e fiscais.
- Aumentar a segurança e prevenir fraudes ou usos indevidos.
- Melhorar a experiência de navegação e aperfeiçoar a plataforma.
- Comunicar informações relevantes, como confirmações, avisos de atualização ou suporte.
⚠️ **Importante:** ao realizar uma doação, alguns dados do doador (como nome e valor) poderão ser visualizados pelo beneficiário, conforme exigências legais e de transparência.

5. **Compartilhamento de dados**
Os dados pessoais poderão ser compartilhados nas seguintes hipóteses:
- Com instituições financeiras e prestadores de serviços de pagamento.
- Para cumprimento de obrigação legal, regulatória ou determinação judicial.
- Para prevenção a fraudes, crimes financeiros, lavagem de dinheiro e financiamento ao terrorismo.
- Para auditorias, análises estatísticas e melhoria de serviços.
- Para dar visibilidade às campanhas, respeitando sua natureza pública e solidária.
Em hipótese alguma seus dados serão vendidos ou comercializados.

6. **Segurança da informação**
O Velório Solidário adota medidas de segurança técnicas e organizacionais para proteger os dados contra acessos não autorizados, perdas ou alterações indevidas.
Contudo, também é responsabilidade do usuário manter sua senha em sigilo e utilizar acessos seguros.
Caso identifique alguma irregularidade ou suspeita de violação de dados, entre em contato imediatamente pelo e-mail privacidade@veloriosolidario.com.br.

7. **Direitos do usuário**
De acordo com a LGPD, todo usuário tem direito a:
- Confirmar se realizamos o tratamento de seus dados.
- Corrigir dados incompletos, inexatos ou desatualizados.
- Solicitar bloqueio ou eliminação de dados desnecessários ou tratados de forma inadequada.
- Revogar o consentimento, quando aplicável.
- Saber com quem seus dados foram compartilhados.
Essas solicitações podem ser feitas diretamente pelo e-mail de contato oficial da plataforma.

8. **Armazenamento e prazo**
Os dados pessoais serão armazenados pelo tempo necessário para o cumprimento das finalidades desta Política.
Mesmo em caso de solicitação de exclusão, alguns dados poderão ser mantidos para:
- Cumprimento de obrigações legais ou regulatórias.
- Exercício regular de direitos em processos administrativos ou judiciais.
- Prevenção a fraudes ou auditorias obrigatórias.

9. **Uso por menores de idade**
O Velório Solidário não coleta de forma consciente dados de menores de 18 anos.
Caso seja necessário criar uma campanha em nome de um menor, o responsável legal deverá fornecer os dados e autorizar expressamente seu tratamento.

10. **Alterações desta política**
Podemos atualizar esta Política de Privacidade sempre que necessário. Alterações relevantes serão comunicadas de forma clara, seja por e-mail ou dentro da própria plataforma.
Recomendamos que consulte periodicamente esta página para se manter atualizado.

11. **Foro**
Esta Política é regida pela legislação brasileira.
Para qualquer controvérsia relacionada ao Velório Solidário, fica eleito o foro da Comarca de Sarandi – RS, com renúncia a qualquer outro, por mais privilegiado que seja.
""")

FEES_MD = dedent("""\
## 🌷 Regras de Taxas – Velório Solidário

No Velório Solidário, acreditamos que cada gesto de solidariedade merece cuidado e respeito.
Criar uma campanha é sempre gratuito. As taxas existem apenas para manter a plataforma funcionando de forma segura, garantindo que cada doação chegue com transparência a quem precisa.

### 🌺 Como funcionam as taxas:
- **Taxa de manutenção:** 4,99% sobre o valor recebido.
- **Taxa fixa por doação:** R$ 0,49 por transação, independentemente do valor doado.
- **Taxa por saque:** R$ 4,50 por cada saque solicitado (transferência em até 3 dias úteis).
- **Valor mínimo de doação:** R$ 20,00.

### ⏳ Prazos
Por segurança, cada doação passa por uma breve análise antes de ficar disponível para saque.
Assim que validada, a quantia pode ser transferida para a conta indicada em até 3 dias úteis.

💙 No Velório Solidário, cada detalhe foi pensado para que a solidariedade possa florescer.
""")

TERMS_MD = dedent("""\
## 📑 Termos de Uso – Velório Solidário

### Responsável pela Plataforma
**Duke Soluções Financeiras Ltda.**  
**CNPJ:** 42.735.849/0001-53  
**Sede:** Sarandi - RS  
**E-mail de contato:** suporte@veloriosolidario.com.br

---

### 1. Aceitação dos Termos
Ao acessar ou utilizar a plataforma Velório Solidário, o usuário (criador de campanha ou doador) declara que leu, compreendeu e concorda com estes Termos de Uso.  
O não aceite destes termos impede a utilização da plataforma.

### 2. Objetivo da Plataforma
O Velório Solidário é um espaço digital que possibilita a criação de campanhas de arrecadação solidária para auxiliar famílias em momentos delicados, relacionados a despesas com velórios, traslados nacionais e internacionais, além de homenagens.  
A plataforma atua como **intermediadora** entre criadores de campanhas e doadores, garantindo transparência e segurança nas transações.  
Nosso compromisso é oferecer acolhimento, simplicidade e confiança em todas as etapas do processo.

### 3. Cadastro e Elegibilidade
- Para criar campanhas, é necessário ter mais de 18 anos e fornecer informações verdadeiras.  
- O usuário é responsável por manter a veracidade e atualização dos dados fornecidos.  
- A Duke Soluções Financeiras poderá solicitar documentos comprobatórios e realizar análises de segurança antes da liberação dos valores.

### 4. Criação de Campanhas
- O criador define título, descrição, valor de meta, prazo de arrecadação e conta bancária para recebimento.  
- É proibido criar campanhas com objetivos fraudulentos, ilícitos ou que desrespeitem a dignidade humana.  
- A plataforma poderá suspender ou remover campanhas que violem estes termos ou a legislação vigente.

### 5. Doações e Taxas
Criar campanhas no Velório Solidário é gratuito. As taxas existem apenas para garantir a manutenção do serviço e a segurança das transações.  
As doações são voluntárias e **não reembolsáveis**. Cada doador reconhece que o valor destinado é de livre escolha e não gera vínculo contratual com o beneficiário.

**Como funcionam as taxas:**
- **Taxa de manutenção:** 4,99% sobre o valor recebido.  
- **Taxa fixa por doação:** R$ 0,49 por transação.  
- **Taxa por saque:** R$ 4,50 por cada saque solicitado (transferência em até 3 dias úteis).  
- **Valor mínimo de doação:** R$ 20,00.

**Prazos:**
- Toda doação passa por análise antes de liberação.  
- Após validação, os valores podem ser transferidos em até 3 dias úteis para a conta bancária cadastrada.

### 6. Responsabilidades do Criador da Campanha
O criador é exclusivamente responsável pela veracidade das informações e pelo uso adequado dos recursos arrecadados.  
O Velório Solidário e a Duke Soluções Financeiras **não se responsabilizam** pela destinação dos valores após o repasse ao beneficiário.

### 7. Responsabilidades do Doador
O doador reconhece que sua contribuição é voluntária, sem expectativa de retorno financeiro ou obrigação de prestação de contas pela plataforma.  
O doador é responsável por fornecer informações corretas no momento da doação.

### 8. Responsabilidades da Plataforma
- Garantir ambiente seguro de transações.  
- Processar pagamentos e repasses dentro dos prazos estabelecidos.  
- Adotar medidas de prevenção a fraudes e uso indevido.  
- Suspender campanhas suspeitas ou em desconformidade com a lei ou com estes Termos.

### 9. Limitação de Responsabilidade
A plataforma atua como intermediadora tecnológica entre criadores de campanhas e doadores. **Não é responsável por:**
- Conteúdo publicado nas campanhas.  
- Veracidade das informações fornecidas pelos criadores.  
- Uso final dos recursos arrecadados.

A Duke Soluções Financeiras atua como intermediadora tecnológica entre doadores e beneficiários.  
Não nos responsabilizamos por eventuais divergências entre o valor arrecadado e a finalidade declarada pelo criador da campanha.  
Nos comprometemos, no entanto, a agir com transparência, segurança e acolhimento em todos os processos.

### 10. Propriedade Intelectual
Todo o conteúdo, marca, logotipo e identidade visual do Velório Solidário pertencem à Duke Soluções Financeiras Ltda., sendo vedada sua reprodução sem autorização prévia.

### 11. Alterações nos Termos
A Duke Soluções Financeiras poderá modificar estes Termos de Uso a qualquer momento.  
Mudanças relevantes serão comunicadas na plataforma com antecedência razoável.

### 12. Denúncia de Campanhas
**12.1.** Qualquer pessoa, a qualquer tempo, poderá denunciar uma Vaquinha que entenda estar sendo utilizada de forma indevida, inverídica, fraudulenta ou que possa ferir a dignidade das famílias e dos doadores.  
**12.2.** O time de análise antifraude do Velório Solidário avaliará a denúncia, podendo suspender temporariamente a campanha até a conclusão da investigação.  
**12.3.** Confirmada a irregularidade, a Vaquinha poderá ser encerrada ou excluída, sem prejuízo das medidas legais cabíveis.

### 13. Transparência e Auditoria das Doações
**13.1.** O Velório Solidário preza pela transparência no uso dos recursos arrecadados.  
**13.2.** Todo Participante Criador poderá compartilhar um link de auditoria pública, que permite a qualquer pessoa, entidade ou órgão acompanhar, em tempo real, os valores recebidos em cada Vaquinha.  
**13.3.** O uso do link de auditoria garante que doadores, familiares e terceiros interessados possam fiscalizar de forma independente a movimentação financeira da campanha.

### 14. Falecimento do Criador da Vaquinha
**14.1.** Em caso de falecimento do Participante Criador de uma Vaquinha que possua saldo em sua Conta Transacional, os recursos seguirão o seguinte fluxo:  
a) Primeiramente, poderão ser destinados a um familiar direto (cônjuge, filhos, pais), mediante apresentação de documentos comprobatórios;  
b) Na ausência de familiar direto, o saldo ficará retido até determinação judicial que indique o legítimo destinatário;  
c) Se, após todas as tentativas legais e transcorrido o prazo máximo definido pela legislação aplicável, não for possível identificar herdeiros legítimos, os valores poderão ser destinados a um **Fundo Solidário**, administrado pelo Velório Solidário, com a finalidade exclusiva de apoiar famílias em situação de vulnerabilidade que necessitem de ajuda financeira para despesas de velório ou correlatas.

### 15. Criação de Campanhas por Funerárias, Cemitérios ou Crematórios
**15.1.** É permitido que funerárias, cemitérios ou crematórios criem campanhas no Velório Solidário, desde que exista autorização prévia, expressa e documentada do familiar responsável pelo falecido.  
Nesses casos, os valores arrecadados serão destinados, de forma exclusiva, ao pagamento ou abatimento dos custos referentes aos serviços funerários prestados.  
Todos os recursos arrecadados e transferidos à empresa responsável estarão sujeitos às taxas aplicadas pela plataforma e permanecerão integralmente auditáveis, garantindo à família a possibilidade de verificar, a qualquer momento, a transparência sobre os valores recebidos e repassados.

### 16. Criação de Campanhas em Nome de Pessoas Falecidas
**16.1.** O Velório Solidário permite a criação de campanhas em memória de pessoas falecidas, com o objetivo exclusivo de arrecadar valores para custear despesas funerárias, de cremação, sepultamento, traslado ou homenagens póstumas.  
O criador da campanha declara, sob sua exclusiva responsabilidade, que:  
- Possui autorização expressa e inequívoca da família ou do responsável legal para utilizar o nome, imagem e informações pessoais do falecido;  
- Reconhece que é integralmente responsável por quaisquer violações de direitos de personalidade, uso indevido de imagem ou informações, respondendo civil e criminalmente por eventuais danos;  
- Compromete-se a utilizar os recursos arrecadados única e exclusivamente para os fins declarados na campanha.  

O Velório Solidário atua apenas como plataforma de intermediação e não se responsabiliza pela veracidade das informações prestadas, nem pela autorização concedida para o uso de dados e imagem do falecido.

### 17. Foro
Fica eleito o foro da Comarca de Sarandi - RS, com renúncia a qualquer outro, por mais privilegiado que seja, para dirimir eventuais conflitos decorrentes destes Termos de Uso.
""")

VERSION = "2025-09-16"
LOCALE = "pt-BR"

def main():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise SystemExit("DATABASE_URL não definido na env.")

    engine = create_engine(db_url, pool_pre_ping=True)

    with engine.begin() as conn:
        # Extensões para UUID
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
        # (opcional) fallback
        conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'))

        # Tabela legal_docs
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS legal_docs (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          key varchar(32) NOT NULL,
          locale varchar(16) NOT NULL DEFAULT 'pt-BR',
          title varchar(255) NOT NULL,
          version varchar(32) NOT NULL,
          content_html text NULL,
          content_md text NULL,
          is_active boolean NOT NULL DEFAULT TRUE,
          published_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now()
        );
        """))

        # Unique index para ON CONFLICT
        conn.execute(text("""
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_indexes WHERE indexname = 'uq_legal_docs_key_locale_version'
          ) THEN
            CREATE UNIQUE INDEX uq_legal_docs_key_locale_version
            ON legal_docs (key, locale, version);
          END IF;
        END $$;
        """))

        # Tabela legal_acceptances
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS legal_acceptances (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          doc_key varchar(32) NOT NULL,
          version varchar(32) NOT NULL,
          locale varchar(16) NOT NULL DEFAULT 'pt-BR',
          accepted_at timestamp NOT NULL DEFAULT now()
        );
        """))

        conn.execute(text("""
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_indexes WHERE indexname = 'idx_legal_acceptances_user'
          ) THEN
            CREATE INDEX idx_legal_acceptances_user ON legal_acceptances(user_id);
          END IF;
        END $$;
        """))

        # UPSERT dos documentos
        conn.execute(text("""
        INSERT INTO legal_docs (key, locale, title, version, content_md, is_active)
        VALUES (:key, :locale, :title, :version, :content_md, TRUE)
        ON CONFLICT (key, locale, version)
        DO UPDATE SET
          title = EXCLUDED.title,
          content_md = EXCLUDED.content_md,
          is_active = TRUE,
          updated_at = now()
        """), [
            {"key": "privacy", "locale": LOCALE, "title": "Política de Privacidade", "version": VERSION, "content_md": PRIVACY_MD},
            {"key": "fees",    "locale": LOCALE, "title": "Regras de Taxas",          "version": VERSION, "content_md": FEES_MD},
            {"key": "terms",   "locale": LOCALE, "title": "Termos de Uso",             "version": VERSION, "content_md": TERMS_MD},
        ])

    print("✅ Tabelas criadas/atualizadas e legal docs seed aplicados.")

if __name__ == "__main__":
    main()
