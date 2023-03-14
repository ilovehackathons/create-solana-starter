#!/usr/bin/env node

import { /* exec, */ execSync } from "child_process";
import { chdir } from "process";
import chalk from "chalk";
import { writeFileSync, rm } from "fs";
import path from "path";
// import * as readline from "node:readline/promises";
// import { stdin as input, stdout as output } from "node:process";
import pkg from "./package.json" assert { type: "json" };

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

${chalk.greenBright(
  "npx create-solana-starter -V"
)}                          show the version number
${chalk.greenBright("                          --version")}

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

if (process.argv[2] === "-V" || process.argv[2] === "--version") {
  console.log(pkg.version);
  process.exit(0);
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
const pascalCasedAppName = [...appName]
  .reverse()
  .reduce((prev, cur) =>
    cur === "-"
      ? [...prev.slice(0, -1), [...prev].reverse()[0].toUpperCase()]
      : [...prev, cur]
  )
  .reverse()
  .map((v, i) => (i === 0 ? v.toUpperCase() : v))
  .join("");

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
verify = "yarn run mocha -t 1000000 verify.js"

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

    // This method and the associated account only exist for the verify script to be able to do its job.
    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    pub fn init_data(ctx: Context<InitData>, data: i64) -> Result<()> {
        ctx.accounts.my_account.data = data;
        Ok(())
    }

    pub fn set_data(ctx: Context<SetData>, data: i64) -> Result<()> {
        ctx.accounts.my_account.data = data;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[account]
#[derive(Default)]
pub struct MyAccount {
    data: i64,
}

#[derive(Accounts)]
pub struct InitData<'info> {
    #[account(
        init,
        seeds = [b""],
        bump,
        payer = payer,
        space = 8 + 8,
    )]
    pub my_account: Account<'info, MyAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetData<'info> {
    #[account(mut)]
    pub my_account: Account<'info, MyAccount>,
}
`.trimStart();
console.log(LIB_RS);

console.log(chalk.greenBright("Writing lib.rs..."));
writeFileSync(path.join("programs", appName, "src", "lib.rs"), LIB_RS);

console.log(chalk.greenBright("Generating package.json..."));
const PACKAGE_JSON = {
  type: "module",
  scripts: {
    "lint:fix": 'prettier */*.js "*/**/*{.js,.ts}" -w',
    lint: 'prettier */*.js "*/**/*{.js,.ts}" --check',
    start:
      "(sleep 2 && solana airdrop 100000 -u localhost -k wallet.json; npm run refresh && node watcher.js) & solana-test-validator >/dev/null",
    next:
      `cd app && NEXT_PUBLIC_PROGRAM_ID=${programId} npm run dev`,
    refresh:
      "anchor build && anchor deploy && (npm run idl:init; npm run idl:upgrade) && anchor run verify",
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

console.log(chalk.greenBright("Generating watcher.js..."));
const WATCHER_JS = `
import { watch } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import chalk from "chalk";

console.log(chalk.greenBright("Watching lib.rs for changes... (Press Ctrl+C to stop the validator and file watcher.)"));

watch(join("programs", "${appName}", "src"), null, () => {
  console.log(chalk.greenBright(
    "\\nA change in lib.rs detected. Rebuilding, redeploying and reuploading the IDL..."
  ));
  console.log(execSync("npm run refresh").toString());
  console.log(chalk.greenBright("Watching lib.rs for changes... (Press Ctrl+C to stop the validator and file watcher.)"));
});
`.trim();

console.log(chalk.greenBright("Writing watcher.js..."));
writeFileSync("watcher.js", WATCHER_JS);

console.log(chalk.greenBright("Generating verify.js..."));
const VERIFY_JS = `
import * as anchor from "@coral-xyz/anchor";

anchor.setProvider(anchor.AnchorProvider.env());

it("Passes verification!", async () => {
  await anchor.workspace.${pascalCasedAppName}.methods.initialize().rpc();
});
`.trim();

console.log(chalk.greenBright("Writing verify.js..."));
writeFileSync("verify.js", VERIFY_JS);

console.log(chalk.greenBright("Running 'npm i chalk'..."));
console.log(execSync("npm i chalk").toString());

console.log(
  chalk.greenBright(
    "Running 'git clone https://github.com/ilovehackathons/dapp-scaffold-localhost app'..."
  )
);
console.log(
  execSync(
    "git clone https://github.com/ilovehackathons/dapp-scaffold-localhost app"
  ).toString()
);

console.log(chalk.greenBright(`Stepping into ${appName}/app...`));
chdir("app");

console.log(chalk.greenBright(`Running 'rm -fr .git'...`));
rm('.git', { recursive: true, force: true },(e)=>{
  console.log(chalk.greenBright(`Error: ${e?.message}`))
})

console.log(chalk.greenBright("Running 'npm i'..."));
console.log(execSync("npm i").toString());

console.log(
  chalk.greenBright("Almost done!\n\nTo start the Solana backend, run:\n\n"),
  chalk.blueBright(`cd ${appName} && npm start`),
  chalk.greenBright("\n\nTo start the Next.js frontend, run:\n\n"),
  chalk.blueBright(`cd ${appName} && npm run next`)
);

process.exit(0);
