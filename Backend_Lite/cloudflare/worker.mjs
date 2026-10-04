import { createBackendApp } from '../src/app.mjs';
import { D1Repo } from './d1-repo.mjs';

function envFlag(env, key) { return String(env[key] || '').toLowerCase() === 'true'; }

export default {
  async scheduled(controller, env, ctx) {
    const scheduledTime = Number(controller.scheduledTime);
    const time = Number.isFinite(scheduledTime) ? scheduledTime : Date.now();
    const cutoff = new Date(time - 30 * 24 * 60 * 60 * 1000).toISOString();
    ctx.waitUntil(new D1Repo(env.DB).purgeEvents(cutoff));
  },
  async fetch(request, env) {
    const repo = new D1Repo(env.DB);
    const handle = createBackendApp({
      repo,
      configProvider: () => ({
        gateCeiling: env.FS_GATE_CEILING || 'LEVEL_A',
        flags: {
          API_ENHANCED_SEARCH: envFlag(env, 'FS_API_ENHANCED_SEARCH'),
          DERIVED_METRICS: envFlag(env, 'FS_DERIVED_METRICS'),
          AI_TOPIC_TAGGING: envFlag(env, 'FS_AI_TOPIC_TAGGING'),
          HISTORICAL_TRACKING: envFlag(env, 'FS_HISTORICAL_TRACKING'),
          CREATOR_RANKINGS: envFlag(env, 'FS_CREATOR_RANKINGS'),
          ALERTS: envFlag(env, 'FS_ALERTS')
        },
        message: env.FS_CONFIG_MESSAGE || ''
      })
    });
    return handle(request);
  }
};
