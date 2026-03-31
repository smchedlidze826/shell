# დეტალური გაშლის გზამკვლევი: `shell` + `remote` + `mf-remote`

ეს დოკუმენტი აღწერს **ამ რეპოში მიმდინარე სამუშაო კონფიგურაციას** რეალური აპების სახელებით და რეალური ფაილების შიგთავსით:

- `shell`
- `remote`
- `mf-remote`

`shell` არის ძირითადი host აპლიკაცია.

ის რენდერავს:

- `remote` აპს **Native Federation**-ის გამოყენებით
- `mf-remote` აპს **Webpack Module Federation**-ის გამოყენებით

არქიტექტურა:

```text
shell
|- remote     -> Native Federation remote
`- mf-remote  -> Module Federation remote
```

ეს გზამკვლევი განზრახ არის დალაგებული ზუსტად იმ क्रमით, როგორც მოითხოვე:

1. `shell`-ის გაშლა
2. `remote`-ის გაშლა
3. `mf-remote`-ის გაშლა

ბოლოში მოცემულია გაშვების სექცია ზუსტი ბრძანებებით.

---

## 1. `shell`-ის გაშლა

## `shell`-ის დანიშნულება

`shell` არის ძირითადი აპლიკაცია.

ის პასუხისმგებელია:

- Angular-ის გაშვებაზე
- `remote`-ისთვის Native Federation-ის ინიციალიზაციაზე
- `mf-remote`-ისთვის Module Federation runtime-ის ინიციალიზაციაზე
- ორივე remote-ის Angular route-ებით რენდერინგზე

## `shell/package.json`

ეს არის მიმდინარე package ფაილი:

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

მნიშვნელოვანი პუნქტები:

- `@angular-architects/native-federation` საჭიროა Native Federation host მხარისთვის
- `@module-federation/enhanced` საჭიროა იმისთვის, რომ `shell`-მა Module Federation remote-იც მოიხმაროს
- `es-module-shims` გამოიყენება Native Federation builder-ის მიერ

## `shell/angular.json`

`shell` იყენებს Native Federation Angular builder-ს:

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

მნიშვნელოვანი პუნქტი:

- `shell` თავად მაინც **Native Federation host**-ად რჩება

## `shell/federation.config.js`

ეს ფაილი აწყობს shared პაკეტებს Native Federation-ისთვის:

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

რატომ არის მნიშვნელოვანი `skip: /^@module-federation/`:

- `shell` Native Federation-ს იყენებს როგორც მთავარ host runtime-ს
- მაგრამ დამატებით ტვირთავს Module Federation remote-საც
- ამიტომ `@module-federation/*` runtime პაკეტები არ უნდა ჩაითვალოს Native Federation shared პაკეტებად

## `shell/public/federation.manifest.json`

ეს ფაილი აკავშირებს Native Federation remote-ს:

```json
{
  "remote": "http://localhost:4201/remoteEntry.json"
}
```

ეს ნიშნავს:

- remote სახელი: `remote`
- Native Federation metadata URL: `http://localhost:4201/remoteEntry.json`

## `shell/src/main.ts`

ეს არის ყველაზე მნიშვნელოვანი ფაილი მთელ hybrid setup-ში:

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

რა ხდება აქ:

1. `initNativeFederation('federation.manifest.json')`
   ტვირთავს Native Federation manifest-ს
   სწორედ ეს ხდის `remote`-ს ხელმისაწვდომს

2. `initModuleFederation(...)`
   არეგისტრირებს Module Federation remote-ს
   სწორედ ეს ხდის `mf-remote`-ს ხელმისაწვდომს

3. `shared: getShared()`
   ხელახლა იყენებს host-ის shared package map-ს Native Federation მხრიდან

4. `await import('./bootstrap')`
   Angular ეშვება მხოლოდ მას შემდეგ, რაც ორივე runtime ინიციალიზდება

## `shell/src/bootstrap.ts`

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
```

## `shell/src/app/app.routes.ts`

ეს ფაილი ეუბნება `shell`-ს როგორ დაარენდეროს ორივე remote:

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

რატომ არის ორი განსხვავებული ჩატვირთვის სტილი:

- `remote` აექსპოზებს Angular **routes**-ს, ამიტომ `shell` იყენებს `loadChildren`-ს
- `mf-remote` აექსპოზებს standalone **component**-ს, ამიტომ `shell` იყენებს `loadComponent`-ს

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

## ბრძანებები `shell`-ისთვის

დამოკიდებულებების დაყენება:

```powershell
cd C:\Users\useer\Desktop\nf\shell
& 'C:\Program Files\nodejs\npm.cmd' install
```

dev server-ის გაშვება:

```powershell
cd C:\Users\useer\Desktop\nf\shell
.\node_modules\.bin\ng.cmd serve
```

build:

```powershell
cd C:\Users\useer\Desktop\nf\shell
.\node_modules\.bin\ng.cmd build shell --configuration development
```

მოსალოდნელი local URL:

```text
http://localhost:4200
```

---

## 2. `remote`-ის გაშლა

## `remote`-ის დანიშნულება

`remote` არის Native Federation microfrontend.

ის აექსპოზებს Angular routes-ს და `shell`-ის მიერ იტვირთება მისამართზე:

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

`remote`-იც Native Federation builder-ით იგება:

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

ეს არის Native Federation remote-ის აღწერა:

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

რას აექსპოზებს ეს:

- remote სახელი: `remote`
- exposed module: `./routes`
- ამ exposed module-ის უკან მდგომი ფაილი: `./src/app/app.routes.ts`

## `remote/src/main.ts`

```ts
import { initFederation } from '@angular-architects/native-federation';

initFederation()
  .catch(err => console.error(err))
  .then(_ => import('./bootstrap'))
  .catch(err => console.error(err));
```

ეს განსხვავდება `shell`-ისგან:

- `remote` იძახებს `initFederation()`-ს manifest ფაილის გარეშე
- რადგან ის remote-ია და არა host

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

სწორედ ამას მოიხმარს `shell` შემდეგნაირად:

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

## ბრძანებები `remote`-ისთვის

დამოკიდებულებების დაყენება:

```powershell
cd C:\Users\useer\Desktop\nf\remote
& 'C:\Program Files\nodejs\npm.cmd' install
```

dev server-ის გაშვება:

```powershell
cd C:\Users\useer\Desktop\nf\remote
.\node_modules\.bin\ng.cmd serve
```

build:

```powershell
cd C:\Users\useer\Desktop\nf\remote
.\node_modules\.bin\ng.cmd build remote --configuration development
```

მოსალოდნელი local URL:

```text
http://localhost:4201
```

მოსალოდნელი Native Federation entry:

```text
http://localhost:4201/remoteEntry.json
```

---

## 3. `mf-remote`-ის გაშლა

შენ დაწერე `rm-remote`, მაგრამ ამ რეპოში რეალური აპის სახელი არის `mf-remote`.

## `mf-remote`-ის დანიშნულება

`mf-remote` არის Webpack Module Federation microfrontend.

ის `shell`-ის მიერ იტვირთება მისამართზე:

```text
http://localhost:4200/mf-remote
```

`remote`-ისგან განსხვავებით, ეს აპი **არ** იყენებს Native Federation-ს.

ის იყენებს:

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

მნიშვნელოვანი პაკეტები:

- `@angular-architects/module-federation`
- `ngx-build-plus`

სწორედ ეს აქცევს ამ აპს Webpack Module Federation remote-ად.

## `mf-remote/angular.json`

ეს აპი იყენებს webpack-ზე ორიენტირებულ builder-ებს:

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

მნიშვნელოვანი პუნქტები:

- build builder: `ngx-build-plus:browser`
- serve builder: `ngx-build-plus:dev-server`
- webpack config: `webpack.config.js`
- port: `4202`

## `mf-remote/webpack.config.js`

ეს არის Module Federation remote-ის აღწერა:

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

რას ნიშნავს ეს:

- Module Federation remote სახელი: `mfRemote`
- exposed module key: `./Component`
- რეალური ფაილი, რომელიც ექსპოზდება: `./src/app/remote-home-component/remote-home-component.ts`

სწორედ ამიტომ ტვირთავს `shell` მას ასე:

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

ეს არის async bootstrap pattern, რომელსაც Module Federation ელოდება.

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

## ბრძანებები `mf-remote`-ისთვის

დამოკიდებულებების დაყენება:

```powershell
cd C:\Users\useer\Desktop\nf\mf-remote
& 'C:\Program Files\nodejs\npm.cmd' install
```

dev server-ის გაშვება:

```powershell
cd C:\Users\useer\Desktop\nf\mf-remote
.\node_modules\.bin\ng.cmd serve
```

build:

```powershell
cd C:\Users\useer\Desktop\nf\mf-remote
.\node_modules\.bin\ng.cmd build mf-remote --configuration development
```

მოსალოდნელი local URL:

```text
http://localhost:4202
```

მოსალოდნელი Module Federation entry:

```text
http://localhost:4202/remoteEntry.js
```

---

## 4. როგორ ერთდება სამივე აპი

## `shell` -> `remote`

ეს კავშირი Native Federation-ით კეთდება.

კავშირის წყარო:

`shell/public/federation.manifest.json`

```json
{
  "remote": "http://localhost:4201/remoteEntry.json"
}
```

route consumption:

```ts
loadRemoteModule('remote', './routes').then((m) => m.REMOTE_ROUTES)
```

ანუ:

- host-ში გამოყენებული სახელი: `remote`
- remote entry URL: `http://localhost:4201/remoteEntry.json`
- exposed item: `./routes`
- `remote`-იდან ექსპორტირებული სიმბოლო: `REMOTE_ROUTES`

## `shell` -> `mf-remote`

ეს კავშირი Module Federation-ით კეთდება.

კავშირის წყარო:

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

route consumption:

```ts
loadRemote<{ RemoteHomeComponent: unknown }>('mfRemote/Component')
```

ანუ:

- `shell`-ში გამოყენებული remote სახელი: `mfRemote`
- remote entry URL: `http://localhost:4202/remoteEntry.js`
- exposed item: `./Component`
- `mf-remote`-იდან ექსპორტირებული სიმბოლო: `RemoteHomeComponent`

---

## 5. ზუსტი გაშვების რიგი

აპები გაუშვი ამ რიგით:

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

## 6. სატესტო URL-ები

Shell:

```text
http://localhost:4200
```

Native Federation remote route `shell`-ში:

```text
http://localhost:4200/remote
```

Module Federation remote route `shell`-ში:

```text
http://localhost:4200/mf-remote
```

პირდაპირი Native Federation entry:

```text
http://localhost:4201/remoteEntry.json
```

პირდაპირი Module Federation entry:

```text
http://localhost:4202/remoteEntry.js
```

---

## 7. Build-ის შემოწმების ბრძანებები

ეს არის ბრძანებები, რომლითაც setup შემოწმდა:

### `remote`-ის შემოწმება

```powershell
cd C:\Users\useer\Desktop\nf\remote
.\node_modules\.bin\ng.cmd build remote --configuration development
```

### `mf-remote`-ის შემოწმება

```powershell
cd C:\Users\useer\Desktop\nf\mf-remote
.\node_modules\.bin\ng.cmd build mf-remote --configuration development
```

### `shell`-ის შემოწმება

```powershell
cd C:\Users\useer\Desktop\nf\shell
.\node_modules\.bin\ng.cmd build shell --configuration development
```

---

## 8. საბოლოო შეჯამება

ეს repo იყენებს hybrid setup-ს:

- `shell` არის root host
- `remote` არის Native Federation remote
- `mf-remote` არის Module Federation remote

ზუსტი რენდერინგის კავშირი:

```text
shell -> remote     using Native Federation
shell -> mf-remote  using Module Federation
```

თუ გინდა, შემდეგ ნაბიჯად შემიძლია იგივე setup-ისთვის ცალკე მოკლე checklist ვერსიაც შევქმნა, მხოლოდ იმპლემენტაციის ნაბიჯებით და ნაკლები ახსნით.
