import { readFile, unlink, writeFile } from 'node:fs/promises'

const clientPath = new URL('../lib/client.js', import.meta.url)
const cssPath = new URL('../lib/style.css', import.meta.url)
const css = await readFile(cssPath, 'utf8')
let client = await readFile(clientPath, 'utf8')

const importLine = "import './style.css';\n"
if (!client.startsWith(importLine)) {
  throw new Error('tsdown client output did not start with the expected CSS import')
}
client = client.slice(importLine.length)

const injection = `
const __dshTaskBoardCss = ${JSON.stringify(css)};
if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=\\"dsh-task-board-model\\"]") === null) {
  const __dshTaskBoardStyle = document.createElement("style");
  __dshTaskBoardStyle.setAttribute("data-plugin-css", "dsh-task-board-model");
  __dshTaskBoardStyle.textContent = __dshTaskBoardCss;
  document.head.appendChild(__dshTaskBoardStyle);
}
`
const marker = 'var exports = module.exports;'
if (!client.includes(marker)) throw new Error('tsdown client output has no CJS module marker')
client = client.replace(marker, `${marker}${injection}`)

await writeFile(clientPath, client)
await unlink(cssPath)
