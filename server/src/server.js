import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`feedbackloop api listening on port ${config.port} (${config.appEnv})`);
});
