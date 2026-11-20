# DevTools for PC

A React 19.3.1 and Vite implementation of the DevTools dashboard. This download contains 211 local tools plus 323 catalog links to the reference website, organized into 23 categories. The catalog includes two additional entries for world time and file sizes. Select **Local only** in search or a category to see the workspaces included in the ZIP. See [FEATURES.md](FEATURES.md) for the inventory.

## Run on Windows

1. Install **Node.js 24 LTS** from https://nodejs.org if Node is not already installed.
2. Right-click the ZIP, select **Extract All**, then open the extracted `devtools-react` folder.
3. Double-click **Start-DevTools.cmd**. Your browser opens the dashboard. Keep the terminal window open while using the app.
4. If the browser does not open automatically, copy the local URL printed in the window. Press **Ctrl+C** in that window to stop the server.

The launcher serves the included production build on the loopback address. It normally uses port 4173 and tries the next port when busy. The included fonts and local modules work without an internet connection. Local browser settings belong to the browser and port where you saved them. Device tools depend on the sensors, microphone and permissions available to that browser. Online entries open the corresponding reference page in a new tab.

## Edit and develop

From the extracted project folder, open PowerShell or a terminal and run:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. Changes inside `src/` appear automatically in development. After editing, run the following to refresh the assets used by the Windows launcher:

```sh
npm test
npm run build
npm start
```

The first command checks conversion, validation and calculation cases. The second builds the application into `dist/`. The third serves the result on Windows, macOS or Linux. Downloading development dependencies with `npm ci` requires internet access.

## Project guide

| Location                   | Responsibility                                                             |
| -------------------------- | -------------------------------------------------------------------------- |
| src/main.jsx               | App shell, navigation state, theme, favorites and recent tools             |
| src/components/            | Dashboard, navigation, catalog search, result display and shared tool form |
| src/modules/               | Implementations grouped by topic. Each module exports an array of tools    |
| src/modules/fields.js      | Constructors for fields, transformations and multi-operation tools         |
| src/catalog/index.js       | Discovers modules, joins them to the catalog and builds navigation         |
| src/catalog/reference.json | Names, categories and paths of the 532 reference directory entries         |
| src/styles.css             | Theme variables, responsive layout and component styling                   |
| public/brand/              | Dashboard logo assets                                                      |
| tests/                     | Executable regression checks                                               |
| dist/                      | Prebuilt site used by the launcher                                         |
| serve.mjs                  | Dependency-free local HTTP server                                          |

## Add a module

Create **src/modules/my-team.tools.js** and paste the following:

```js
import { area, tool } from "./fields.js";

export default [
  {
    ...tool(
      "line-numberer",
      "Add a line number to each row of text.",
      [area("input", "Text", "First row\nSecond row")],
      ({ input }) =>
        input
          .split(/\r?\n/)
          .map((line, index) => index + 1 + ". " + line)
          .join("\n"),
    ),
    name: "Line Numberer",
    category: "text-analysis",
  },
];
```

Open **Text & Analysis → Line Numberer**, or press **Ctrl+K** and search for it. The catalog assigns the tool a stable URL at `#/tool/line-numberer`. Search, navigation, favorites, and the local tool count update automatically. Use a unique ID and a category ID from the reference catalog.

To implement an existing **Online** entry locally, use its existing catalog ID. The registry supplies the name and category and changes the link to a local route. Duplicate implementations raise an error at startup.

For a game, live timer or other interactive interface, use a `.tools.jsx` file. Export an entry with `id`, `name`, `category`, `description` and `Component`. See `audio-games.tools.jsx` and `interactive.tools.jsx`. Components receive the tool ID. Clean up event listeners, media streams and timers when the component unmounts.

## Workbench contract

A tool receives values keyed by the field names. Number fields arrive as numbers, file inputs as File objects and the other inputs as strings. A tool can return a value or a Promise. Throw an Error to show a validation message. Use `text` for copyable text, `table` for arrays of rows, `colors` for swatches, `image` for an image data URL or `html` for an isolated preview. Plain strings and numbers also render directly.

## Reference and scope

The dashboard follows the reference site's sidebar, search shortcut, featured fixtures, device cards, category directory, theme colors and Geist typography. Each local tool's description defines its supported operations. Some implement a subset of the original options. The local fixture generators have explicitly labeled country coverage. VAT checks use bundled validation rules. External account features, the blog, cheat sheets and online catalog entries depend on the original host. This download is an independent implementation.

Reference site: https://www.devtools.tools/
