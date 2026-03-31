# Detailed Setup Guide: `shell` + `remote` + `mf-remote`

This document describes the **current working setup in this repo** using the real app names and the real file contents:

- `shell`
- `remote`
- `mf-remote`

`shell` is the root host.

It renders:

- `remote` using **Native Federation**
- `mf-remote` using **Webpack Module Federation**

Architecture:

```text
shell
|- remote     -> Native Federation remote
`- mf-remote  -> Module Federation remote
```

This guide is intentionally ordered the way you asked:

1. Setup `shell`
2. Setup `remote`
3. Setup `mf-remote`

At the end, there is a run section with the exact commands.

---

## 1. Setup `shell`

## Purpose of `shell`

`shell` is the root application.

It is responsible for:

- booting Angular
- initializing Native Federation for `remote`
- initializing Module Federation runtime for `mf-remote`
- rendering both remotes through Angular routes

## `shell/package.json`

This is the current package file:

```json
{
  "name": "shell",
  "version": "0.0.0",
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build",
    "watch": "ng build --watch --configuration development",
    "test": "ng test"
  },
  "prettier": {
    "printWidth": 100,
    "singleQuote": true,
    "overrides": [
      {
        "files": "*.html",
        "options": {
          "parser": "angular"
        }
      }
    ]
  },
  "private": true,
  "packageManager": "npm@11.6.2",
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
  },
  "devDependencies": {
    "@angular-devkit/build-angular": "^21.1.0",
    "@angular/build": "^21.1.0",
    "@angular/cli": "^21.1.0",
    "@angular/compiler-cli": "^21.1.0",
    "jsdom": "^27.1.0",
    "typescript": "~5.9.2",
    "vitest": "^4.0.8"
  }
}
```

Important points:

- `@angular-architects/native-federation` is required for the Native Federation host side
- `@module-federation/enhanced` is required so `shell` can also consume the Module Federation remote
- `es-module-shims` is used by the Native Federation builder

## `shell/angular.json`

`shell` uses the Native Federation Angular builder:

```json
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "cli": {
    "packageManager": "npm"
  },
  "newProjectRoot": "projects",
  "projects": {
    "shell": {
      "projectType": "application",
      "schematics": {},
      "root": "",
      "sourceRoot": "src",
      "prefix": "app",
      "architect": {
        "build": {
          "builder": "@angular-architects/native-federation:build",
          "options": {},
          "configurations": {
            "production": {
              "target": "shell:esbuild:production"
            },
            "development": {
              "target": "shell:esbuild:development",
              "dev": true
            }
          },
          "defaultConfiguration": "production"
        },
        "serve": {
          "builder": "@angular-architects/native-federation:build",
          "options": {
            "target": "shell:serve-original:development",
            "rebuildDelay": 500,
            "dev": true,
            "cacheExternalArtifacts": false,
            "port": 0
          }
        },
        "test": {
          "builder": "@angular/build:unit-test"
        },
        "esbuild": {
          "builder": "@angular/build:application",
          "options": {
            "browser": "src/main.ts",
            "tsConfig": "tsconfig.app.json",
            "assets": [
              {
                "glob": "**/*",
                "input": "public"
              }
            ],
            "styles": [
              "src/styles.css"
            ],
            "polyfills": [
              "es-module-shims"
            ]
          },
          "configurations": {
            "production": {
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "500kB",
                  "maximumError": "1MB"
                },
                {
                  "type": "anyComponentStyle",
                  "maximumWarning": "4kB",
                  "maximumError": "8kB"
                }
              ],
              "outputHashing": "all"
            },
            "development": {
              "optimization": false,
              "extractLicenses": false,
              "sourceMap": true
            }
          },
          "defaultConfiguration": "production"
        },
        "serve-original": {
          "builder": "@angular/build:dev-server",
          "configurations": {
            "production": {
              "buildTarget": "shell:esbuild:production"
            },
            "development": {
              "buildTarget": "shell:esbuild:development"
            }
          },
          "defaultConfiguration": "development",
          "options": {
            "port": 4200
          }
        }
      }
    }
  }
}
```

Important point:

- `shell` itself is still a **Native Federation host**

## `shell/federation.config.js`

This file configures shared packages for Native Federation:

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

  // Please read our FAQ about sharing libs:
  // https://shorturl.at/jmzH0

  features: {
    // New feature for more performance and avoiding
    // issues with node libs. Comment this out to
    // get the traditional behavior:
    ignoreUnusedDeps: true
  }
});
```

Why `skip: /^@module-federation/` matters:

- `shell` uses Native Federation as the main host runtime
- but it also loads a Module Federation remote
- those `@module-federation/*` runtime packages should not be treated as Native Federation shared packages

## `shell/public/federation.manifest.json`

This file connects the Native Federation remote:

```json
{
  "remote": "http://localhost:4201/remoteEntry.json"
}
```

This means:

- remote name: `remote`
- Native Federation metadata URL: `http://localhost:4201/remoteEntry.json`

## `shell/src/main.ts`

This is the most important file in the whole hybrid setup:

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

What happens here:

1. `initNativeFederation('federation.manifest.json')`
   Loads the Native Federation manifest
   This is what makes `remote` available

2. `initModuleFederation(...)`
   Registers the Module Federation remote
   This is what makes `mf-remote` available

3. `shared: getShared()`
   Reuses the host shared package map from the Native Federation side

4. `await import('./bootstrap')`
   Boots Angular only after both runtimes are initialized

## `shell/src/bootstrap.ts`

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
```

## `shell/src/app/app.routes.ts`

This file tells `shell` how to render both remotes:

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

Why there are two different loading styles:

- `remote` exposes Angular **routes**, so `shell` uses `loadChildren`
- `mf-remote` exposes a standalone **component**, so `shell` uses `loadComponent`

## `shell/src/app/app.ts`

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

## `shell/src/app/app.html`

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

## `shell/src/app/app.config.ts`

```ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes)
  ]
};
```

## Commands for `shell`

Install dependencies:

```powershell
cd C:\Users\useer\Desktop\nf\shell
& 'C:\Program Files\nodejs\npm.cmd' install
```

Run dev server:

```powershell
cd C:\Users\useer\Desktop\nf\shell
.\node_modules\.bin\ng.cmd serve
```

Build:

```powershell
cd C:\Users\useer\Desktop\nf\shell
.\node_modules\.bin\ng.cmd build shell --configuration development
```

Expected local URL:

```text
http://localhost:4200
```

---

## 2. Setup `remote`

## Purpose of `remote`

`remote` is the Native Federation microfrontend.

It exposes Angular routes and is loaded by `shell` at:

```text
http://localhost:4200/remote
```

## `remote/package.json`

```json
{
  "name": "remote",
  "version": "0.0.0",
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build",
    "watch": "ng build --watch --configuration development",
    "test": "ng test"
  },
  "prettier": {
    "printWidth": 100,
    "singleQuote": true,
    "overrides": [
      {
        "files": "*.html",
        "options": {
          "parser": "angular"
        }
      }
    ]
  },
  "private": true,
  "packageManager": "npm@11.6.2",
  "dependencies": {
    "@angular-architects/native-federation": "^21.2.2",
    "@angular/animations": "^21.1.0",
    "@angular/common": "^21.1.0",
    "@angular/compiler": "^21.1.0",
    "@angular/core": "^21.1.0",
    "@angular/forms": "^21.1.0",
    "@angular/platform-browser": "^21.1.0",
    "@angular/router": "^21.1.0",
    "@softarc/native-federation-node": "^3.3.4",
    "es-module-shims": "^1.5.12",
    "rxjs": "~7.8.0",
    "tslib": "^2.3.0"
  },
  "devDependencies": {
    "@angular-devkit/build-angular": "^21.1.0",
    "@angular/build": "^21.1.0",
    "@angular/cli": "^21.1.0",
    "@angular/compiler-cli": "^21.1.0",
    "jsdom": "^27.1.0",
    "typescript": "~5.9.2",
    "vitest": "^4.0.8"
  }
}
```

## `remote/angular.json`

`remote` is also built with the Native Federation builder:

```json
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "cli": {
    "packageManager": "npm"
  },
  "newProjectRoot": "projects",
  "projects": {
    "remote": {
      "projectType": "application",
      "schematics": {},
      "root": "",
      "sourceRoot": "src",
      "prefix": "app",
      "architect": {
        "build": {
          "builder": "@angular-architects/native-federation:build",
          "options": {},
          "configurations": {
            "production": {
              "target": "remote:esbuild:production"
            },
            "development": {
              "target": "remote:esbuild:development",
              "dev": true
            }
          },
          "defaultConfiguration": "production"
        },
        "serve": {
          "builder": "@angular-architects/native-federation:build",
          "options": {
            "target": "remote:serve-original:development",
            "rebuildDelay": 500,
            "dev": true,
            "cacheExternalArtifacts": false,
            "port": 0
          }
        },
        "test": {
          "builder": "@angular/build:unit-test"
        },
        "esbuild": {
          "builder": "@angular/build:application",
          "options": {
            "browser": "src/main.ts",
            "tsConfig": "tsconfig.app.json",
            "assets": [
              {
                "glob": "**/*",
                "input": "public"
              }
            ],
            "styles": [
              "src/styles.css"
            ],
            "polyfills": [
              "es-module-shims"
            ]
          },
          "configurations": {
            "production": {
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "500kB",
                  "maximumError": "1MB"
                },
                {
                  "type": "anyComponentStyle",
                  "maximumWarning": "4kB",
                  "maximumError": "8kB"
                }
              ],
              "outputHashing": "all"
            },
            "development": {
              "optimization": false,
              "extractLicenses": false,
              "sourceMap": true
            }
          },
          "defaultConfiguration": "production"
        },
        "serve-original": {
          "builder": "@angular/build:dev-server",
          "configurations": {
            "production": {
              "buildTarget": "remote:esbuild:production"
            },
            "development": {
              "buildTarget": "remote:esbuild:development"
            }
          },
          "defaultConfiguration": "development",
          "options": {
            "port": 4201
          }
        }
      }
    }
  }
}
```

## `remote/federation.config.js`

This is the Native Federation remote definition:

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
    // Add further packages you don't need at runtime
  ],

  // Please read our FAQ about sharing libs:
  // https://shorturl.at/jmzH0

  features: {
    // New feature for more performance and avoiding
    // issues with node libs. Comment this out to
    // get the traditional behavior:
    ignoreUnusedDeps: true
  }
});
```

What this exposes:

- remote name: `remote`
- exposed module: `./routes`
- file behind that exposed module: `./src/app/app.routes.ts`

## `remote/src/main.ts`

```ts
import { initFederation } from '@angular-architects/native-federation';

initFederation()
  .catch(err => console.error(err))
  .then(_ => import('./bootstrap'))
  .catch(err => console.error(err));
```

This is different from the shell:

- `remote` calls `initFederation()` with no manifest file
- because it is the remote, not the host

## `remote/src/bootstrap.ts`

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
```

## `remote/src/app/app.routes.ts`

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

This is what `shell` consumes using:

```ts
loadRemoteModule('remote', './routes')
```

## `remote/src/app/remote-home-component/remote-home-component.ts`

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

## `remote/src/app/remote-home-component/remote-home-component.html`

```html
    <h2>MFE1 loaded by Native Federation</h2>
    <p>This component comes from the remote app.</p>
```

## Commands for `remote`

Install dependencies:

```powershell
cd C:\Users\useer\Desktop\nf\remote
& 'C:\Program Files\nodejs\npm.cmd' install
```

Run dev server:

```powershell
cd C:\Users\useer\Desktop\nf\remote
.\node_modules\.bin\ng.cmd serve
```

Build:

```powershell
cd C:\Users\useer\Desktop\nf\remote
.\node_modules\.bin\ng.cmd build remote --configuration development
```

Expected local URL:

```text
http://localhost:4201
```

Expected Native Federation entry:

```text
http://localhost:4201/remoteEntry.json
```

---

## 3. Setup `mf-remote`

Note: you wrote `rm-remote`, but the actual app name in this repo is `mf-remote`.

## Purpose of `mf-remote`

`mf-remote` is the Webpack Module Federation microfrontend.

It is loaded by `shell` at:

```text
http://localhost:4200/mf-remote
```

Unlike `remote`, this app does **not** use Native Federation.

It uses:

- `@angular-architects/module-federation`
- `ngx-build-plus`
- `webpack.config.js`

## `mf-remote/package.json`

```json
{
  "name": "mf-remote",
  "version": "0.0.0",
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build",
    "watch": "ng build --watch --configuration development",
    "test": "ng test"
  },
  "prettier": {
    "printWidth": 100,
    "singleQuote": true,
    "overrides": [
      {
        "files": "*.html",
        "options": {
          "parser": "angular"
        }
      }
    ]
  },
  "private": true,
  "packageManager": "npm@11.6.2",
  "dependencies": {
    "@angular/animations": "^21.1.0",
    "@angular/common": "^21.1.0",
    "@angular/compiler": "^21.1.0",
    "@angular/core": "^21.1.0",
    "@angular/forms": "^21.1.0",
    "@angular/platform-browser": "^21.1.0",
    "@angular/router": "^21.1.0",
    "rxjs": "~7.8.0",
    "tslib": "^2.3.0"
  },
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
}
```

Important packages:

- `@angular-architects/module-federation`
- `ngx-build-plus`

These are what make this app a Webpack Module Federation remote.

## `mf-remote/angular.json`

This app uses the webpack-oriented builders:

```json
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "cli": {
    "packageManager": "npm"
  },
  "newProjectRoot": "projects",
  "projects": {
    "mf-remote": {
      "projectType": "application",
      "schematics": {},
      "root": "",
      "sourceRoot": "src",
      "prefix": "app",
      "architect": {
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
          },
          "configurations": {
            "production": {
              "outputHashing": "all",
              "extraWebpackConfig": "webpack.prod.config.js"
            },
            "development": {
              "optimization": false,
              "extractLicenses": false,
              "sourceMap": true
            }
          },
          "defaultConfiguration": "production"
        },
        "serve": {
          "builder": "ngx-build-plus:dev-server",
          "options": {
            "port": 4202,
            "publicHost": "http://localhost:4202",
            "extraWebpackConfig": "webpack.config.js"
          },
          "configurations": {
            "production": {
              "buildTarget": "mf-remote:build:production",
              "extraWebpackConfig": "webpack.prod.config.js"
            },
            "development": {
              "buildTarget": "mf-remote:build:development"
            }
          },
          "defaultConfiguration": "development"
        },
        "test": {
          "builder": "@angular/build:unit-test"
        }
      }
    }
  }
}
```

Important points:

- build builder: `ngx-build-plus:browser`
- serve builder: `ngx-build-plus:dev-server`
- webpack config: `webpack.config.js`
- port: `4202`

## `mf-remote/webpack.config.js`

This is the Module Federation remote definition:

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

What this means:

- Module Federation remote name: `mfRemote`
- exposed module key: `./Component`
- actual exposed file: `./src/app/remote-home-component/remote-home-component.ts`

This is why `shell` loads it with:

```ts
loadRemote('mfRemote/Component')
```

## `mf-remote/webpack.prod.config.js`

```js
const { merge } = require('webpack-merge');
const config = require('./webpack.config');

module.exports = merge(config, {});
```

## `mf-remote/src/main.ts`

```ts
import('./bootstrap').catch((err) => console.error(err));
```

This is the async bootstrap pattern expected by Module Federation.

## `mf-remote/src/bootstrap.ts`

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
```

## `mf-remote/src/app/remote-home-component/remote-home-component.ts`

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

## `mf-remote/src/app/remote-home-component/remote-home-component.html`

```html
<section class="mf-card">
  <span class="eyebrow">Module Federation Remote</span>
  <h2>mf-remote</h2>
  <p>This standalone component is exposed from the new Module Federation app.</p>
  <p>The Native Federation shell acts as the parent host and loads this component through the Module Federation runtime.</p>
</section>
```

## Commands for `mf-remote`

Install dependencies:

```powershell
cd C:\Users\useer\Desktop\nf\mf-remote
& 'C:\Program Files\nodejs\npm.cmd' install
```

Run dev server:

```powershell
cd C:\Users\useer\Desktop\nf\mf-remote
.\node_modules\.bin\ng.cmd serve
```

Build:

```powershell
cd C:\Users\useer\Desktop\nf\mf-remote
.\node_modules\.bin\ng.cmd build mf-remote --configuration development
```

Expected local URL:

```text
http://localhost:4202
```

Expected Module Federation entry:

```text
http://localhost:4202/remoteEntry.js
```

---

## 4. How the Three Apps Connect

## `shell` -> `remote`

This connection is Native Federation.

Connection source:

`shell/public/federation.manifest.json`

```json
{
  "remote": "http://localhost:4201/remoteEntry.json"
}
```

Route consumption:

```ts
loadRemoteModule('remote', './routes').then((m) => m.REMOTE_ROUTES)
```

So:

- host name used by shell: `remote`
- remote entry URL: `http://localhost:4201/remoteEntry.json`
- exposed item: `./routes`
- exported symbol from remote: `REMOTE_ROUTES`

## `shell` -> `mf-remote`

This connection is Module Federation.

Connection source:

`shell/src/main.ts`

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

Route consumption:

```ts
loadRemote<{ RemoteHomeComponent: unknown }>('mfRemote/Component')
```

So:

- remote name used by shell: `mfRemote`
- remote entry URL: `http://localhost:4202/remoteEntry.js`
- exposed item: `./Component`
- exported symbol from `mf-remote`: `RemoteHomeComponent`

---

## 5. Exact Run Order

Start them in this order:

1. `remote`
2. `mf-remote`
3. `shell`

### Terminal 1

```powershell
cd C:\Users\useer\Desktop\nf\remote
.\node_modules\.bin\ng.cmd serve
```

### Terminal 2

```powershell
cd C:\Users\useer\Desktop\nf\mf-remote
.\node_modules\.bin\ng.cmd serve
```

### Terminal 3

```powershell
cd C:\Users\useer\Desktop\nf\shell
.\node_modules\.bin\ng.cmd serve
```

---

## 6. URLs to Test

Shell:

```text
http://localhost:4200
```

Native Federation remote route inside shell:

```text
http://localhost:4200/remote
```

Module Federation remote route inside shell:

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

## 7. Build Verification Commands

These are the commands used to verify the setup:

### Verify `remote`

```powershell
cd C:\Users\useer\Desktop\nf\remote
.\node_modules\.bin\ng.cmd build remote --configuration development
```

### Verify `mf-remote`

```powershell
cd C:\Users\useer\Desktop\nf\mf-remote
.\node_modules\.bin\ng.cmd build mf-remote --configuration development
```

### Verify `shell`

```powershell
cd C:\Users\useer\Desktop\nf\shell
.\node_modules\.bin\ng.cmd build shell --configuration development
```

---

## 8. Final Summary

This repo uses a hybrid setup:

- `shell` is the root host
- `remote` is a Native Federation remote
- `mf-remote` is a Module Federation remote

Exact rendering relationship:

```text
shell -> remote     using Native Federation
shell -> mf-remote  using Module Federation
```

If you want the next step, I can also create a second Markdown file that explains this same setup as a pure implementation checklist without the long explanations.
