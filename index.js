#!/usr/bin/env node

import { /* exec, */ execSync } from "child_process";
import { chdir } from "process";
import chalk from "chalk";
import { writeFileSync } from "fs";
import path from "path";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

function displayHelpAndExit(isError) {
  console.log(
    `
Usage:

${chalk.greenBright(
  "npx create-solana-starter <app-name> [options]"
)}        create a new app

${chalk.greenBright(
  "npx create-solana-starter -h"
)}                          output usage information
${chalk.greenBright("                          --help")}

Options:
  --template <template-name>            `.trim() +
      //       `choose between ${chalk.greenBright(
      //         "anchor"
      //       )} (default) and ${chalk.greenBright("seahorse")}
      // `
      `        only ${chalk.greenBright("anchor")} supported right now
`.trimEnd()
  );
  process.exit(+!!isError);
}

if (!process.argv[2] || process.argv[2].startsWith("-")) {
  displayHelpAndExit();
}

const appName = process.argv[2];

const parameterName = process.argv[3];
const parameterValue = process.argv[4];

if (
  parameterName &&
  (parameterName !== "--template" || parameterValue !== "anchor")
) {
  displayHelpAndExit();
}

console.log(chalk.greenBright(`Running 'anchor init ${appName}'...`));
console.log(execSync(`anchor init ${appName}`).toString());

console.log(chalk.greenBright(`Stepping into ${appName}...`));
chdir(appName);

console.log(
  chalk.greenBright(
    `Running 'solana-keygen new --no-bip39-passphrase -o wallet.json'...`
  )
);
console.log(
  execSync(`solana-keygen new --no-bip39-passphrase -o wallet.json`).toString()
);

console.log(chalk.greenBright(`Running 'anchor build'...`));
console.log(execSync("anchor build").toString());

const snakeCasedAppName = appName.replace(/\-/g, "_");

console.log(
  chalk.greenBright(
    `Running 'solana address -k target/deploy/${snakeCasedAppName}-keypair.json'`
  )
);
let programId;
console.log(
  (programId = execSync(
    `solana address -k target/deploy/${snakeCasedAppName}-keypair.json`
  )
    .toString()
    .trim())
);

console.log(chalk.greenBright("Generating Anchor.toml..."));
const ANCHOR_TOML = `
[programs.localnet]
${snakeCasedAppName} = "${programId}"

[provider]
cluster = "Localnet"
wallet = "wallet.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"

[test.validator]
bind_address = "127.0.0.1"
`.trimStart();
console.log(ANCHOR_TOML);

console.log(chalk.greenBright("Writing Anchor.toml..."));
writeFileSync("Anchor.toml", ANCHOR_TOML);

console.log(chalk.greenBright("Generating lib.rs..."));
const LIB_RS = `
use anchor_lang::prelude::*;

declare_id!("${programId}");

#[program]
pub mod ${snakeCasedAppName} {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
`.trimStart();
console.log(LIB_RS);

console.log(chalk.greenBright("Writing lib.rs..."));
writeFileSync(path.join("programs", appName, "src", "lib.rs"), LIB_RS);

console.log(chalk.greenBright("Generating package.json..."));
const PACKAGE_JSON = {
  scripts: {
    "lint:fix": 'prettier */*.js "*/**/*{.js,.ts}" -w',
    lint: 'prettier */*.js "*/**/*{.js,.ts}" --check',
    verify:
      "echo 'Did you start solana-test-validator?' && solana airdrop 100000 -u localhost -k wallet.json && anchor deploy && npm run idl:upgrade && anchor run test",
    "idl:init": `anchor idl init  -f target/idl/${snakeCasedAppName}.json \`solana address -k target/deploy/${snakeCasedAppName}-keypair.json\``,
    "idl:upgrade": `anchor idl upgrade  -f target/idl/${snakeCasedAppName}.json \`solana address -k target/deploy/${snakeCasedAppName}-keypair.json\``,
  },
  dependencies: {
    "@coral-xyz/anchor": "^0.27.0",
  },
  devDependencies: {
    chai: "^4.3.4",
    mocha: "^9.0.3",
    "ts-mocha": "^10.0.0",
    "@types/bn.js": "^5.1.0",
    "@types/chai": "^4.3.0",
    "@types/mocha": "^9.0.0",
    typescript: "^4.3.5",
    prettier: "^2.6.2",
  },
};

console.log(chalk.greenBright("Writing package.json..."));
writeFileSync("package.json", JSON.stringify(PACKAGE_JSON, null, 2));

console.log(chalk.greenBright("Running 'anchor test'..."));
console.log(execSync("anchor test").toString());

// console.log(
//   chalk.greenBright("Running 'solana-test-validator &>/dev/null &'...")
// );
// const solanaTestValidator = exec(
//   "solana-test-validator",
//   (error, stdout, stderr) => {
//     if (error) {
//       console.error(`exec error: ${error}`);
//       // return;
//     }
//     console.log(`stdout: ${stdout}`);
//     console.error(`stderr: ${stderr}`);
//   }
// );

// console.log(
//   chalk.greenBright("Waiting 5 seconds for solana-test-validator to start...")
// );
// await new Promise((resolve) => setTimeout(resolve, 5000));

await readline
  .createInterface({ input, output })
  .question(
    chalk.greenBright("Run ") +
      chalk.blueBright(`cd ${appName} && solana-test-validator`) +
      chalk.greenBright(" in another terminal and press Enter to continue...")
  );

console.log(
  chalk.greenBright(
    "\nRunning 'solana airdrop 100000 -u localhost -k wallet.json'..."
  )
);
console.log(
  execSync("solana airdrop 100000 -u localhost -k wallet.json").toString()
);

console.log(chalk.greenBright("Running 'anchor deploy'..."));
console.log(execSync("anchor deploy").toString());

console.log(chalk.greenBright("Running 'npm run idl:init'..."));
console.log(execSync("npm run idl:init").toString());

console.log(chalk.greenBright("Running 'anchor run test'..."));
console.log(execSync("anchor run test").toString());

// console.log(chalk.greenBright("Killing solana-test-validator..."));
// console.log(solanaTestValidator.kill());

console.log(chalk.greenBright("Finished."));
process.exit(0);
