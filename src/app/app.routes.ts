import { Routes } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/native-federation';
import { loadRemote } from '@module-federation/enhanced/runtime';

export const routes: Routes = [
  {
    path: 'remote',
    loadChildren: () =>
      loadRemoteModule('remote', './routes').then((m) => m.REMOTE_ROUTES),
  },
  {
    path: 'mf-remote',
    loadComponent: () =>
      loadRemote<{ RemoteHomeComponent: unknown }>('mfRemote/Component').then((m) => {
        if (!m?.RemoteHomeComponent) {
          throw new Error('Module Federation remote did not expose RemoteHomeComponent.');
        }

        return m.RemoteHomeComponent as never;
      }),
  },
];
