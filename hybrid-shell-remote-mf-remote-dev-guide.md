# Hybrid Setup Guide: `shell` + `remote` + `mf-remote`

This setup has three Angular apps:

- `shell`: the root host
- `remote`: a Native Federation remote
- `mf-remote`: a Webpack Module Federation remote

The goal is simple:

```text
shell
|- renders remote     via Native Federation
`- renders mf-remote  via Module Federation
```

This guide is written as an implementation reference for another developer working in the same repo.

---

## Project Roles

### `shell`

`shell` is the parent application.

Responsibilities:

- starts Angular
- initializes Native Federation for `remote`
- initializes Module Federation runtime for `mf-remote`
- exposes routes that render both remotes

### `remote`

`remote` is a Native Federation microfrontend.

It exposes Angular routes through `./routes`.

### `mf-remote`

`mf-remote` is a Webpack Module Federation microfrontend.

It exposes one standalone component through `./Component`.

---

## Setup Order

Build the setup in this order:

1. Configure `shell`
2. Configure `remote`
3. Configure `mf-remote`
4. Start all three apps

---

## 1. Configure `shell`

### Install dependencies

```powershell
cd C:\Users\useer\Desktop\nf\shell
& 'C:\Program Files\nodejs\npm.cmd' install
```

### `package.json`

`shell` needs both runtimes:

- `@angular-architects/native-federation`
- `@module-federation/enhanced`

Current dependency block:

```json
"dependencies": {
  "@angular-architects/native-federation": "^21.2.2",
  "@angular/animations": "^21.1.0",
  "@angular/common": "^21.1.0",
  "@angular/compiler": "^21.1.0",
  "@angular/core": "^21.1.0",
  "@angular/forms": "^21.1.0",
  "@angular/platform-browser": "^21.1.0",
  "@angular/router": "^21.1.0",
  "@module-federation/enhanced": "^2.3.0",
  "@softarc/native-federation-node": "^3.3.4",
  "es-module-shims": "^1.5.12",
  "rxjs": "~7.8.0",
  "tslib": "^2.3.0"
}
```

### Native Federation config

File:

`shell/federation.config.js`

```js
const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

module.exports = withNativeFederation({
  name: 'shell',

  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },

  skip: [
    'rxjs/ajax',
    'rxjs/fetch',
    'rxjs/testing',
    'rxjs/webSocket',
    /^@module-federation/,
    // Add further packages you don't need at runtime
  ],

  features: {
    ignoreUnusedDeps: true
  }
});
```

Important detail:

- `@module-federation/*` is skipped from Native Federation sharing because `shell` also initializes the Module Federation runtime.

### Native Federation manifest

File:

`shell/public/federation.manifest.json`

```json
{
  "remote": "http://localhost:4201/remoteEntry.json"
}
```

This connects `shell` to the Native Federation remote named `remote`.

### Runtime initialization

File:

`shell/src/main.ts`

```ts
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
```

What this does:

1. Loads Native Federation remotes from `federation.manifest.json`
2. Registers the Module Federation remote `mfRemote`
3. Reuses shared dependencies from the Native Federation host
4. Bootstraps Angular only after both runtimes are ready

### Shell routes

File:

`shell/src/app/app.routes.ts`

```ts
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
```

Why this differs by route:

- `remote` exposes routes, so `loadChildren` is correct
- `mf-remote` exposes a standalone component, so `loadComponent` is correct

### Shell UI

Files:

- `shell/src/app/app.ts`
- `shell/src/app/app.html`

```ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  constructor(private readonly router: Router) {}

  loadRemoteApp(): void {
    this.router.navigate(['/remote']);
  }

  loadMfRemoteApp(): void {
    this.router.navigate(['/mf-remote']);
  }
}
```

```html
<div class="shell-home">
  <h1>Shell Application</h1>
  <p>Click a button below to load either the Native Federation remote or the new Module Federation remote.</p>

  <button type="button" (click)="loadRemoteApp()">
    Load Native Remote
  </button>

  <button type="button" (click)="loadMfRemoteApp()">
    Load Module Federation Remote
  </button>
</div>

<router-outlet></router-outlet>
```

### Verify shell build

```powershell
cd C:\Users\useer\Desktop\nf\shell
.\node_modules\.bin\ng.cmd build shell --configuration development
```

---

## 2. Configure `remote`

### Install dependencies

```powershell
cd C:\Users\useer\Desktop\nf\remote
& 'C:\Program Files\nodejs\npm.cmd' install
```

### Native Federation remote config

File:

`remote/federation.config.js`

```js
const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

module.exports = withNativeFederation({
  name: 'remote',

  exposes: {
    './routes': './src/app/app.routes.ts',
  },

  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },

  skip: [
    'rxjs/ajax',
    'rxjs/fetch',
    'rxjs/testing',
    'rxjs/webSocket',
  ],

  features: {
    ignoreUnusedDeps: true
  }
});
```

This means:

- remote name is `remote`
- it exposes `./routes`
- that exposed file is `src/app/app.routes.ts`

### Remote startup

File:

`remote/src/main.ts`

```ts
import { initFederation } from '@angular-architects/native-federation';

initFederation()
  .catch(err => console.error(err))
  .then(_ => import('./bootstrap'))
  .catch(err => console.error(err));
```

This is a remote, not a host, so it does not need a manifest path.

### Exposed route file

File:

`remote/src/app/app.routes.ts`

```ts
import { Routes } from '@angular/router';
import { RemoteHomeComponent } from './remote-home-component/remote-home-component';

export const REMOTE_ROUTES: Routes = [
    {
    path: '',
    component: RemoteHomeComponent,
  },
];
```

This is what `shell` consumes with:

```ts
loadRemoteModule('remote', './routes')
```

### Example remote component

Files:

- `remote/src/app/remote-home-component/remote-home-component.ts`
- `remote/src/app/remote-home-component/remote-home-component.html`

```ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-remote-home-component',
  imports: [],
  standalone:true,
  templateUrl: './remote-home-component.html',
  styleUrl: './remote-home-component.css',
})
export class RemoteHomeComponent {

}
```

```html
<h2>MFE1 loaded by Native Federation</h2>
<p>This component comes from the remote app.</p>
```

### Verify remote build

```powershell
cd C:\Users\useer\Desktop\nf\remote
.\node_modules\.bin\ng.cmd build remote --configuration development
```

### Expected runtime URL

```text
http://localhost:4201/remoteEntry.json
```

---

## 3. Configure `mf-remote`

### Install dependencies

```powershell
cd C:\Users\useer\Desktop\nf\mf-remote
& 'C:\Program Files\nodejs\npm.cmd' install
```

### What `mf-remote` is

`mf-remote` is not a Native Federation app.

It uses:

- `@angular-architects/module-federation`
- `ngx-build-plus`
- `webpack.config.js`

### `mf-remote/package.json`

Relevant dev dependencies:

```json
"devDependencies": {
  "@angular-architects/module-federation": "^21.2.2",
  "@angular-devkit/build-angular": "^21.1.0",
  "@angular/build": "^21.1.0",
  "@angular/cli": "^21.1.0",
  "@angular/compiler-cli": "^21.1.0",
  "jsdom": "^27.1.0",
  "ngx-build-plus": "^20.0.0",
  "typescript": "~5.9.2",
  "vitest": "^4.0.8"
}
```

### Angular builder config

File:

`mf-remote/angular.json`

Important parts:

```json
"build": {
  "builder": "ngx-build-plus:browser",
  "options": {
    "outputPath": "dist/mf-remote",
    "index": "src/index.html",
    "main": "src/main.ts",
    "tsConfig": "tsconfig.app.json",
    "assets": [
      {
        "glob": "**/*",
        "input": "public",
        "output": "."
      }
    ],
    "styles": [
      "src/styles.css"
    ],
    "extraWebpackConfig": "webpack.config.js",
    "commonChunk": false
  }
}
```

```json
"serve": {
  "builder": "ngx-build-plus:dev-server",
  "options": {
    "port": 4202,
    "publicHost": "http://localhost:4202",
    "extraWebpackConfig": "webpack.config.js"
  }
}
```

This app runs on:

```text
http://localhost:4202
```

### Module Federation config

File:

`mf-remote/webpack.config.js`

```js
const { shareAll, withModuleFederationPlugin } = require('@angular-architects/module-federation/webpack');

module.exports = withModuleFederationPlugin({
  name: 'mfRemote',

  exposes: {
    './Component': './src/app/remote-home-component/remote-home-component.ts',
  },

  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },
});
```

This means:

- remote name is `mfRemote`
- exposed module key is `./Component`
- exposed file is `src/app/remote-home-component/remote-home-component.ts`

That is why `shell` loads it with:

```ts
loadRemote('mfRemote/Component')
```

### Production merge file

File:

`mf-remote/webpack.prod.config.js`

```js
const { merge } = require('webpack-merge');
const config = require('./webpack.config');

module.exports = merge(config, {});
```

### Async bootstrap

File:

`mf-remote/src/main.ts`

```ts
import('./bootstrap').catch((err) => console.error(err));
```

This is the standard async bootstrap pattern used for Module Federation.

### Exposed component

Files:

- `mf-remote/src/app/remote-home-component/remote-home-component.ts`
- `mf-remote/src/app/remote-home-component/remote-home-component.html`

```ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-remote-home-component',
  imports: [],
  standalone:true,
  templateUrl: './remote-home-component.html',
  styleUrl: './remote-home-component.css',
})
export class RemoteHomeComponent {

}
```

```html
<section class="mf-card">
  <span class="eyebrow">Module Federation Remote</span>
  <h2>mf-remote</h2>
  <p>This standalone component is exposed from the new Module Federation app.</p>
  <p>The Native Federation shell acts as the parent host and loads this component through the Module Federation runtime.</p>
</section>
```

### Verify mf-remote build

```powershell
cd C:\Users\useer\Desktop\nf\mf-remote
.\node_modules\.bin\ng.cmd build mf-remote --configuration development
```

### Expected runtime URL

```text
http://localhost:4202/remoteEntry.js
```

---

## 4. How the connections work

### `shell` -> `remote`

This path uses Native Federation.

Configuration source:

```json
{
  "remote": "http://localhost:4201/remoteEntry.json"
}
```

Consumption:

```ts
loadRemoteModule('remote', './routes').then((m) => m.REMOTE_ROUTES)
```

### `shell` -> `mf-remote`

This path uses Module Federation.

Registration:

```ts
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
```

Consumption:

```ts
loadRemote<{ RemoteHomeComponent: unknown }>('mfRemote/Component')
```

---

## 5. Run the whole system

Start the apps in this order:

1. `remote`
2. `mf-remote`
3. `shell`

### Terminal 1

```powershell
cd C:\Users\useer\Desktop\nf\remote
npm start
```

### Terminal 2

```powershell
cd C:\Users\useer\Desktop\nf\mf-remote
npm start
```

### Terminal 3

```powershell
cd C:\Users\useer\Desktop\nf\shell
npm start
```

---

## 6. URLs to test

Shell:

```text
http://localhost:4200
```

Native Federation remote through shell:

```text
http://localhost:4200/remote
```

Module Federation remote through shell:

```text
http://localhost:4200/mf-remote
```

Direct Native Federation entry:

```text
http://localhost:4201/remoteEntry.json
```

Direct Module Federation entry:

```text
http://localhost:4202/remoteEntry.js
```

---

## 7. Summary

This repo is using a hybrid host setup:

- `shell` is the root host
- `remote` is a Native Federation remote
- `mf-remote` is a Module Federation remote

Final relationship:

```text
shell -> remote     using Native Federation
shell -> mf-remote  using Module Federation
```
