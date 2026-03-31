# Hybrid სეთაფის გზამკვლევი: `shell` + `remote` + `mf-remote`

ამ სეთაფში არის სამი Angular აპი:

- `shell`: root host
- `remote`: Native Federation remote
- `mf-remote`: Webpack Module Federation remote

მიზანი მარტივია:

```text
shell
|- renders remote     via Native Federation
`- renders mf-remote  via Module Federation
```

ეს გზამკვლევი დაწერილია როგორც იმპლემენტაციის reference სხვა დეველოპერისთვის, რომელიც ამავე რეპოში მუშაობს.

---

## პროექტის როლები

### `shell`

`shell` არის მშობელი აპლიკაცია.

პასუხისმგებლობები:

- Angular-ის გაშვება
- `remote`-ისთვის Native Federation-ის ინიციალიზაცია
- `mf-remote`-ისთვის Module Federation runtime-ის ინიციალიზაცია
- route-ების ექსპოზი, რომლებიც ორივე remote-ს არენდერებს

### `remote`

`remote` არის Native Federation microfrontend.

ის Angular route-ებს აექსპოზებს `./routes`-ით.

### `mf-remote`

`mf-remote` არის Webpack Module Federation microfrontend.

ის ერთ standalone component-ს აექსპოზებს `./Component`-ით.

---

## სეთაფის რიგი

სეთაფი ააწყე ამ რიგით:

1. `shell`-ის კონფიგურაცია
2. `remote`-ის კონფიგურაცია
3. `mf-remote`-ის კონფიგურაცია
4. სამივე აპის გაშვება

---

## 1. `shell`-ის კონფიგურაცია

### დამოკიდებულებების დაყენება

```powershell
cd C:\Users\useer\Desktop\nf\shell
& 'C:\Program Files\nodejs\npm.cmd' install
```

### `package.json`

`shell`-ს ორივე runtime სჭირდება:

- `@angular-architects/native-federation`
- `@module-federation/enhanced`

მიმდინარე dependency block:

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

ფაილი:

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

მნიშვნელოვანი დეტალი:

- `@module-federation/*` გამოტოვებულია Native Federation sharing-იდან, რადგან `shell` დამატებით Module Federation runtime-საც ინიციალიზებს.

### Native Federation manifest

ფაილი:

`shell/public/federation.manifest.json`

```json
{
  "remote": "http://localhost:4201/remoteEntry.json"
}
```

ეს აკავშირებს `shell`-ს Native Federation remote-თან, რომლის სახელია `remote`.

### Runtime-ის ინიციალიზაცია

ფაილი:

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

ეს რას აკეთებს:

1. ტვირთავს Native Federation remote-ებს `federation.manifest.json`-იდან
2. არეგისტრირებს Module Federation remote-ს `mfRemote`
3. თავიდან იყენებს shared dependency-ებს Native Federation host-იდან
4. Angular-ს უშვებს მხოლოდ მას შემდეგ, რაც ორივე runtime მზად არის

### Shell route-ები

ფაილი:

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

რატომ არის აქ route-ის მიხედვით განსხვავებული მიდგომა:

- `remote` route-ებს აექსპოზებს, ამიტომ სწორია `loadChildren`
- `mf-remote` standalone component-ს აექსპოზებს, ამიტომ სწორია `loadComponent`

### Shell UI

ფაილები:

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

---

## 2. `remote`-ის კონფიგურაცია

### დამოკიდებულებების დაყენება

```powershell
cd C:\Users\useer\Desktop\nf\remote
npm  install
```

### Native Federation remote config

ფაილი:

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

ეს ნიშნავს:

- remote-ის სახელია `remote`
- ის აექსპოზებს `./routes`-ს
- ეს exposed ფაილი არის `src/app/app.routes.ts`

### Remote startup

ფაილი:

`remote/src/main.ts`

```ts
import { initFederation } from '@angular-architects/native-federation';

initFederation()
  .catch(err => console.error(err))
  .then(_ => import('./bootstrap'))
  .catch(err => console.error(err));
```

ეს remote-ია და არა host, ამიტომ manifest path არ სჭირდება.

### Exposed route ფაილი

ფაილი:

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

სწორედ ამას მოიხმარს `shell` ასე:

```ts
loadRemoteModule('remote', './routes')
```

### Remote component-ის მაგალითი

ფაილები:

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

### Remote build-ის შემოწმება

```powershell
cd C:\Users\useer\Desktop\nf\remote
.\node_modules\.bin\ng.cmd build remote --configuration development
```

### მოსალოდნელი runtime URL

```text
http://localhost:4201/remoteEntry.json
```

---

## 3. `mf-remote`-ის კონფიგურაცია

### დამოკიდებულებების დაყენება

```powershell
cd C:\Users\useer\Desktop\nf\mf-remote
npm install
```

### რა არის `mf-remote`

`mf-remote` არ არის Native Federation აპი.

ის იყენებს:

- `@angular-architects/module-federation`
- `ngx-build-plus`
- `webpack.config.js`

### `mf-remote/package.json`

შესაბამისი dev dependency-ები:

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

ფაილი:

`mf-remote/angular.json`

მნიშვნელოვანი ნაწილები:

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

ეს აპი ეშვება მისამართზე:

```text
http://localhost:4202
```

### Module Federation config

ფაილი:

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

ეს ნიშნავს:

- remote-ის სახელია `mfRemote`
- exposed module key არის `./Component`
- exposed ფაილი არის `src/app/remote-home-component/remote-home-component.ts`

ამიტომ ტვირთავს `shell` მას ასე:

```ts
loadRemote('mfRemote/Component')
```

### Production merge ფაილი

ფაილი:

`mf-remote/webpack.prod.config.js`

```js
const { merge } = require('webpack-merge');
const config = require('./webpack.config');

module.exports = merge(config, {});
```

### Async bootstrap

ფაილი:

`mf-remote/src/main.ts`

```ts
import('./bootstrap').catch((err) => console.error(err));
```

ეს არის სტანდარტული async bootstrap pattern, რომელსაც Module Federation იყენებს.

### Exposed component

ფაილები:

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

### `mf-remote` build-ის შემოწმება

```powershell
cd C:\Users\useer\Desktop\nf\mf-remote
.\node_modules\.bin\ng.cmd build mf-remote --configuration development
```

### მოსალოდნელი runtime URL

```text
http://localhost:4202/remoteEntry.js
```

---

## 4. როგორ მუშაობს კავშირები

### `shell` -> `remote`

ეს გზა Native Federation-ს იყენებს.

კონფიგურაციის წყარო:

```json
{
  "remote": "http://localhost:4201/remoteEntry.json"
}
```

მოხმარება:

```ts
loadRemoteModule('remote', './routes').then((m) => m.REMOTE_ROUTES)
```

### `shell` -> `mf-remote`

ეს გზა Module Federation-ს იყენებს.

რეგისტრაცია:

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

გამოყენება:

```ts
loadRemote<{ RemoteHomeComponent: unknown }>('mfRemote/Component')
```

---

## 5. მთელი სისტემის გაშვება

აპები გაუშვი ამ რიგით:

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

## 6. სატესტო URL-ები

Shell:

```text
http://localhost:4200
```

Native Federation remote `shell`-ის გავლით:

```text
http://localhost:4200/remote
```

Module Federation remote `shell`-ის გავლით:

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

## 7. შეჯამება

ეს repo იყენებს hybrid host სეთაფს:

- `shell` არის root host
- `remote` არის Native Federation remote
- `mf-remote` არის Module Federation remote

საბოლოო კავშირი:

```text
shell -> remote     using Native Federation
shell -> mf-remote  using Module Federation
```
