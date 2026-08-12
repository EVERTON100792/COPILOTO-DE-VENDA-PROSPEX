import { SearchAIAgent } from './src/agents/SearchAIAgent.js';
import fetch from 'node-fetch';

// Mock the global fetch since we're in node but aiClient uses fetch
global.fetch = fetch as any;

// Mock the store for settings
jest.mock('./src/services/store', () => ({
  useApp: {
    getState: () => ({
      settings: { aiApiKey: process.env.VITE_AI_API_KEY || 'REPLACE_ME' }
    })
  }
}));

async function run() {
  const agent = new SearchAIAgent();
  console.log("Iniciando busca para Academia Bronx Gym...");
  const res = await agent.execute({
    name: 'Academia Bronx Gym',
    city: 'Rolândia',
    state: 'PR',
    category: 'Academias'
  }, {});
  console.log("Resultado:", res);
}

run();
