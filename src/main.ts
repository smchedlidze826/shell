import {
  getShared,
  initFederation as initNativeFederation,
} from '@angular-architects/native-federation';
import { init as initModuleFederation } from '@module-federation/enhanced/runtime';

(async () => {
  await initNativeFederation('federation.manifest.json');

  initModuleFederation({
    name: 'shell',
    remotes: [
      {
        name: 'mfRemote',
        entry: 'http://localhost:4202/remoteEntry.js',
        type: 'module',
      },
    ],
    shared: getShared(),
  }).initializeSharing();

  await import('./bootstrap');
})().catch((err) => console.error(err));
