// Configuração central reutilizável.
// O app atual permanece Porcelane; novos aplicativos podem substituir
// apenas esta configuração e habilitar módulos diferentes.

export const APP_CONFIG = {
  appId: 'porcelane-operacional',
  nome: 'Porcelane',
  segmento: 'marmoraria',
  ambiente: 'production',
  modules: {
    dashboard: true,
    clientes: true,
    comercial: true,
    orcamentos: true,
    pedidos: true,
    medicao: true,
    projetos: true,
    producao: true,
    acabamento: true,
    logistica: true,
    instalacao: true,
    financeiro: true,
    estoque: true,
    rh: true,
    documentos: true,
    assistente: true,
  },
  integrations: {
    supabase: true,
    supabaseStorage: true,
    oneDrive: false,
    trello: false,
  },
};

export default APP_CONFIG;
