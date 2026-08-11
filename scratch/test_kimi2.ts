import { searchCompanyData } from './src/agents/SearchAIAgent.js';
import fetch from 'node-fetch';

global.fetch = fetch as any;

// Mock store to provide the hardcoded settings
jest.mock('./src/services/store', () => ({
  useApp: {
    getState: () => ({
      settings: {}
    })
  }
}));

async function run() {
  console.log("Iniciando busca real pelo Kimi K3...");
  const res = await searchCompanyData({
    name: 'Academia Bronx Gym',
    city: 'Rolândia',
    state: 'PR',
    category: 'Academias'
  });
  console.log("Resultado FINAL:", res);
}

run();
