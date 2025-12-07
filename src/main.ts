import './styles/main.css';
import { App } from './App';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
  const appContainer = document.getElementById('app');

  if (!appContainer) {
    console.error('App container not found');
    return;
  }

  const app = new App(appContainer);
  await app.init();
});
