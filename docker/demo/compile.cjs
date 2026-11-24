const fs = require("node:fs");
const path = require("node:path");
const solc = require("/usr/local/lib/node_modules/solc");

const input = {
  language: "Solidity",
  sources: { "Crowdfunding.sol": { content: fs.readFileSync("src/Crowdfunding.sol", "utf8") } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: "cancun",
    outputSelection: { "*": { "*": ["evm.bytecode.object"] } },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input), {
  import: (name) => {
    const prefix = "@openzeppelin/contracts/";
    if (!name.startsWith(prefix)) return { error: `Unknown import: ${name}` };
    const file = path.join("/usr/local/lib/node_modules/@openzeppelin/contracts", name.slice(prefix.length));
    try { return { contents: fs.readFileSync(file, "utf8") }; }
    catch { return { error: `Import not found: ${name}` }; }
  },
}));
const errors = (output.errors ?? []).filter((error) => error.severity === "error");
if (errors.length) throw new Error(errors.map((error) => error.formattedMessage).join("\n"));
fs.writeFileSync("/tmp/crowdfunding.bytecode", `0x${output.contracts["Crowdfunding.sol"].Crowdfunding.evm.bytecode.object}`);
