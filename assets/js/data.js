/*
  Catálogo de pipelines e origem das skills.

  Para adicionar um pipeline, acrescente um objeto ao array PIPELINES. A interface
  se reconstrói sozinha (filtros, busca, contagem de skills e rotas).

  Formato do pipeline:
  {
    id, name, category, statement,
    precondition (opcional),
    when: string[],
    outcome: string,
    mcps: string[] (opcional),
    stages: [{ skill, cmd, role, what, artifact, gate }],
    note (opcional),
    related: string[]
  }

  SKILL_SOURCES guarda o repositório de onde cada skill vem, extraído do
  .skill-lock.json da instalação. Sem repositório registrado, deixe url vazio.
*/

window.PIPELINES = [
  {
    id: "feature",
    name: "Feature",
    category: "Implementação",
    statement:
      "Eu abro com um prompt que dispara subagentes, um por skill, e eles trabalham em background até a feature ficar pronta.",
    when: [
      "Feature pequena ou grande.",
      "Eu quero paralelismo: vários subagentes rodando ao mesmo tempo, cada um com uma skill."
    ],
    outcome:
      "Uma equipe de subagentes trabalhando em background e uma feature precisa, correta, com a segurança validada.",
    stages: [
      {
        skill: "gsd",
        cmd: "/gsd",
        role: "Enquadrar",
        what:
          "Fecha o escopo e escreve o PLAN da fase: tarefas, dependências e critério de verificação. É esse plano que vai no prompt dos subagentes.",
        artifact: ".planning/ com ROADMAP, REQUIREMENTS e o PLAN da fase.",
        gate: "Cada tarefa do plano tem um critério de verificação objetivo."
      },
      {
        skill: "senior-fullstack",
        cmd: "/senior-fullstack",
        role: "Definir a forma",
        what:
          "Escolhe o perfil de stack com as premissas explícitas (time, cadência, público, orçamento), monta o esqueleto e roda a análise de qualidade inicial.",
        artifact: "Stack decidida, projeto scaffoldado e relatório com os problemas P0.",
        gate: "Nenhum P0 aberto antes de escrever a primeira fatia."
      },
      {
        skill: "incremental-implementation",
        cmd: "/incremental-implementation",
        role: "Construir em fatias",
        what:
          "Uma fatia vertical por vez: implementa, testa, verifica e commita antes de abrir a próxima.",
        artifact: "Commits pequenos, cada um com a aplicação de pé.",
        gate: "Testes e build verdes ao fim de cada fatia."
      },
      {
        skill: "security-audit",
        cmd: "/security-audit",
        role: "Auditar a segurança",
        what:
          "Procura violação de fronteira de confiança com evidência no código, não com checklist. Cada achado tem principal, recurso e a menor correção que resolve.",
        artifact: "Findings com severidade, evidência e correção mínima.",
        gate: "Nenhum achado alto ou crítico fica sem correção aplicada."
      },
      {
        skill: "code-review-and-quality",
        cmd: "/code-review-and-quality",
        role: "Revisar em cinco eixos",
        what:
          "Correção, legibilidade, arquitetura, segurança e performance no mesmo diff.",
        artifact: "Review com achados classificados entre bloqueante e opcional.",
        gate: "Zero bloqueantes."
      },
      {
        skill: "kaizen",
        cmd: "/kaizen",
        role: "Fixar o padrão",
        what:
          "Transforma o que a revisão pegou em melhoria pequena e permanente: validação na fronteira, menos abstração.",
        artifact: "Uma melhoria concreta no repositório.",
        gate: "A próxima feature herda o padrão sem eu precisar lembrar."
      }
    ],
    note:
      "É esse fluxo que eu disparo como subagentes em background, um por skill, na ordem acima. O prompt inicial carrega o PLAN da fase.",
    related: ["debug", "entrega"]
  },

  {
    id: "debug",
    name: "Debug do agente",
    category: "Diagnóstico",
    statement:
      "Depois do debug manual, o agente analisa, aplica a correção e mostra onde aplicou.",
    precondition: "Debug manual feito. Eu já testei na mão e não encontrei o problema.",
    when: [
      "Eu já fiz o debug manual e o problema continua.",
      "Quero a correção aplicada com o lugar exato onde ela foi feita."
    ],
    outcome:
      "Uma análise, a correção já aplicada e o ponto exato onde ela entrou, para eu revisar de novo.",
    stages: [
      {
        skill: "atomic-tasks",
        cmd: "/atomic-tasks",
        role: "Quebrar em tarefas",
        what:
          "Divide o trabalho em tarefas pequenas, cada uma rodando num subagente com contexto novo. É o contexto acumulado que degrada a análise depois de metade da janela.",
        artifact: "Tarefas atômicas, cada uma com plano curto e critério de sucesso.",
        gate: "Cada tarefa cabe em uma sessão e tem critério de sucesso próprio."
      },
      {
        skill: "tdd",
        cmd: "/tdd",
        role: "Travar o comportamento",
        what: "O bug vira teste vermelho antes de virar correção.",
        artifact: "Teste que falha com o bug e passa com a correção.",
        gate: "O teste falha no código atual e passa depois do fix."
      },
      {
        skill: "systematic-debugging",
        cmd: "/systematic-debugging",
        role: "Achar a causa raiz",
        what:
          "Causa raiz antes de qualquer correção. Reproduz, lê o erro inteiro, checa o que mudou e instrumenta as fronteiras até nomear a causa.",
        artifact: "Causa raiz em uma frase, com a evidência que a sustenta.",
        gate: "Nenhuma falha conhecida fica sem causa raiz nomeada."
      },
      {
        skill: "code-review-excellence",
        cmd: "/code-review-excellence",
        role: "Revisar a correção",
        what:
          "O diff da correção passa por revisão antes de chegar em mim: o que mudou, por que mudou e o que pode ter quebrado junto.",
        artifact: "Review com severidade e o diff anotado.",
        gate: "Zero bloqueantes."
      },
      {
        skill: "kaizen",
        cmd: "/kaizen",
        role: "Não repetir",
        what:
          "A falha vira barreira no repositório, para não voltar do mesmo jeito.",
        artifact: "Uma melhoria concreta que teria pego o bug antes.",
        gate: "O mesmo bug não volta sem um aviso automático."
      }
    ],
    note:
      "O debug manual não pode morrer. Este fluxo é a segunda revisão, nunca a primeira.",
    related: ["feature", "entrega"]
  },

  {
    id: "interface",
    name: "Interface",
    category: "Interface",
    statement:
      "Seis skills e dois MCPs até a tela ficar sem slop de componente e de escrita.",
    when: [
      "Vou construir ou refazer uma tela.",
      "A interface precisa ficar responsiva e alinhada com o que eu desenhei."
    ],
    outcome:
      "Uma interface livre de slop de componente e de texto, responsiva e alinhada com o que eu queria.",
    mcps: ["shadcn", "magicui"],
    stages: [
      {
        skill: "senior-frontend",
        cmd: "/senior-frontend",
        role: "Montar a base",
        what:
          "Estrutura, componentes, peso de bundle e acessibilidade. Sem essa base, as skills de gosto trabalham em cima de nada.",
        artifact: "Projeto e componentes com padrão de performance e a11y.",
        gate: "Build limpo e componente básico renderizando."
      },
      {
        skill: "ui-taste",
        cmd: "/ui-taste",
        role: "Escolher a direção",
        what:
          "Pega o playbook da tarefa (tela nova, polimento, auditoria) e define layout e hierarquia com referências reais de produto. Depois confere o render no tamanho de uso.",
        artifact: "Direção de layout e hierarquia, com as referências usadas.",
        gate: "A tela tem hierarquia clara: o que é principal, o que é secundário."
      },
      {
        skill: "design-taste-frontend",
        cmd: "/design-taste-frontend",
        role: "Compor as seções",
        what:
          "Sorteia três direções de arte e entrega o blueprint de cada seção. Um inspetor no navegador mede as regras da casa e reprova o que passa.",
        artifact: "Direção sorteada, blueprint por seção e relatório do inspetor.",
        gate: "Zero falhas no inspetor nos três tamanhos."
      },
      {
        skill: "lean-ux",
        cmd: "/lean-ux",
        role: "Checar pelo uso",
        what:
          "Transforma a suposição da tela em hipótese testável e reduz a entrega ao experimento mais barato que responde.",
        artifact: "Hipótese com critério de sucesso e o experimento escolhido.",
        gate: "A hipótese pode ser invalidada por um teste, não por opinião."
      },
      {
        skill: "impeccable",
        cmd: "/impeccable",
        role: "Passar o acabamento",
        what:
          "Revisa hierarquia, espaçamento, estados, foco e o comportamento no tamanho real em que a tela vai ser usada.",
        artifact: "Correções de acabamento aplicadas.",
        gate: "A tela funciona no tamanho de uso, inclusive pelo teclado."
      },
      {
        skill: "no-ai-slop",
        cmd: "/no-ai-slop",
        role: "Limpar a escrita",
        what:
          "Tira rótulo genérico, texto de enfeite e frase que serviria para qualquer produto.",
        artifact: "Copy revisada, com termo concreto no lugar de adjetivo.",
        gate: "Nenhuma frase da tela sobrevive num outro produto sem mudar."
      }
    ],
    note:
      "Os componentes vêm dos MCPs que já estão conectados: shadcn e magicui. O pipeline decide a direção, os MCPs evitam reinventar componente.",
    related: ["feature", "entrega"]
  },

  {
    id: "entrega",
    name: "Entrega",
    category: "Entrega",
    statement:
      "Do commit solto ao PR: histórico organizado, diff revisado em dois eixos e PR aberto com contexto.",
    when: [
      "As mudanças estão prontas e testadas na branch.",
      "Vou abrir PR ou pedir review."
    ],
    outcome:
      "Commits atômicos, diff revisado e PR aberto com a descrição que o revisor precisa.",
    stages: [
      {
        skill: "atomic-commits",
        cmd: "/atomic-commits",
        role: "Organizar o histórico",
        what:
          "Agrupa as mudanças por tipo e commita uma coisa por vez, cada commit revisável sozinho.",
        artifact: "Histórico com um commit por mudança lógica.",
        gate: "Cada commit passa sozinho: build e teste verdes."
      },
      {
        skill: "code-review",
        cmd: "/code-review",
        role: "Revisar o diff",
        what:
          "Dois eixos em paralelo: aderência ao padrão do repositório e fidelidade à spec.",
        artifact: "Relatório com achados de padrão e de spec, separados.",
        gate: "Nenhum requisito da spec em falta e nenhum desvio de padrão sem justificativa."
      },
      {
        skill: "create-pr",
        cmd: "/create-pr",
        role: "Abrir o PR",
        what:
          "Sincroniza a base, confere o diff, escreve o corpo e abre o PR com o que o revisor precisa saber.",
        artifact: "PR aberto, com contexto, evidência de teste e o que revisar.",
        gate: "O PR explica o que mudou, por que mudou e como foi verificado."
      }
    ],
    related: ["feature", "debug"]
  }
];

window.SKILL_SOURCES = {
  "gsd": { repo: "ctsstc/get-shit-done-skills", url: "https://github.com/ctsstc/get-shit-done-skills" },
  "senior-fullstack": { repo: "alirezarezvani/claude-skills", url: "https://github.com/alirezarezvani/claude-skills" },
  "senior-frontend": { repo: "alirezarezvani/claude-skills", url: "https://github.com/alirezarezvani/claude-skills" },
  "incremental-implementation": { repo: "addyosmani/agent-skills", url: "https://github.com/addyosmani/agent-skills" },
  "code-review-and-quality": { repo: "addyosmani/agent-skills", url: "https://github.com/addyosmani/agent-skills" },
  "security-audit": { repo: "cloudflare/security-audit-skill", url: "https://github.com/cloudflare/security-audit-skill" },
  "kaizen": { repo: "neolabhq/context-engineering-kit", url: "https://github.com/neolabhq/context-engineering-kit" },
  "atomic-tasks": { repo: "thebeardedbearsas/claude-craft", url: "https://github.com/thebeardedbearsas/claude-craft" },
  "tdd": { repo: "mattpocock/skills", url: "https://github.com/mattpocock/skills" },
  "code-review": { repo: "mattpocock/skills", url: "https://github.com/mattpocock/skills" },
  "systematic-debugging": { repo: "superpowers", url: "" },
  "code-review-excellence": { repo: "wshobson/agents", url: "https://github.com/wshobson/agents" },
  "ui-taste": { repo: "uizze.sh", url: "https://uizze.sh" },
  "design-taste-frontend": { repo: "Leonxlnx/taste-skill", url: "https://github.com/Leonxlnx/taste-skill" },
  "lean-ux": { repo: "wondelai/skills", url: "https://github.com/wondelai/skills" },
  "impeccable": { repo: "pbakaus/impeccable", url: "https://github.com/pbakaus/impeccable" },
  "no-ai-slop": { repo: "petergyang/no-ai-slop", url: "https://github.com/petergyang/no-ai-slop" },
  "atomic-commits": { repo: "nullswan/atomic-commits", url: "https://github.com/nullswan/atomic-commits" },
  "create-pr": { repo: "warpdotdev/common-skills", url: "https://github.com/warpdotdev/common-skills" }
};
