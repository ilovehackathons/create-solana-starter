#!/usr/bin/env node

import { execSync } from "child_process";
import { chdir } from "process";
import chalk from "chalk";
import { writeFileSync, rmSync } from "fs";
import path from "path";
import pkg from "./package.json" assert { type: "json" };
import { argv } from "process";

handleArguments();
process.exit(0);

function displayHelpAndExit(isError) {
  console.log(
    `Usage:

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
  --template <template-name>        only ${chalk.greenBright(
    "anchor"
  )} supported right now
  --docker                          use ${chalk.greenBright(
    "projectserum/build:v0.27.0"
  )} to execute the commands
`
  );
  process.exit(+!!isError); // !! handles undefined
}

function displayVersionAndExit() {
  console.log(pkg.version);
  process.exit(0);
}

// TODO: use a proper argument parser
function handleArguments() {
  const helpFlags = ["-h", "--help"];
  const versionFlags = ["-V", "--version"];

  const args = argv.slice(2);

  if (args.length) {
    if (!args[0].startsWith("-")) {
      // create a new app
      const [appName, ...options] = args;
      if (options.length) {
        // one or two options (--template <template-name> and/or --docker)
        // TODO: display help when invalid options are given
        const docker = [options[0], options[2]].includes("--docker");
        const template =
          options[0] === "--template"
            ? options[1]
            : options[1] === "--template"
            ? options[2]
            : "anchor";
        if (template === "anchor") {
          // use Anchor
          if (docker) {
            // use Anchor+Docker
            initWithAnchorAndDocker(appName);
          } else {
            // use Anchor directly
            initWithAnchor(appName);
          }
        } else {
          // invalid template
          displayHelpAndExit(true);
        }
      } else {
        // no options. use Anchor directly
        initWithAnchor(appName);
      }
    } else {
      // help, version or invalid flag
      const flag = args[0];
      if (helpFlags.includes(flag)) {
        // help
        displayHelpAndExit(false);
      } else if (versionFlags.includes(flag)) {
        // version
        displayVersionAndExit();
      } else {
        // invalid flag
        displayHelpAndExit(true);
      }
    }
  } else {
    // no arguments given
    displayHelpAndExit(true);
  }
}

function logInGreen(text) {
  console.log(chalk.greenBright(text));
}

function execAndLog(command) {
  logInGreen(`Running '${command}'...`);
  const output = execSync(command).toString();
  console.log(output);
  return output;
}

function convertToSnakeCase(value) {
  return value.replace(/\-/g, "_");
}

function convertToPascalCase(value) {
  return [...value]
    .reverse()
    .reduce((prev, cur) =>
      cur === "-"
        ? [...prev.slice(0, -1), [...prev].reverse()[0].toUpperCase()]
        : [...prev, cur]
    )
    .reverse()
    .map((v, i) => (i === 0 ? v.toUpperCase() : v))
    .join("");
}

function logAndReturn(name, content) {
  logInGreen(`Generating ${name}...`);
  // console.log(content); // we log the echo command already (in Docker)
  logInGreen(`Writing ${name}...`);

  return content;
}

function generateAnchorToml(snakeCasedAppName, programId) {
  return logAndReturn(
    "Anchor.toml",
    `[programs.localnet]
${snakeCasedAppName} = "${programId}"

[provider]
cluster = "Localnet"
wallet = "wallet.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
verify = "yarn run mocha -t 1000000 verify.js"

[test.validator]
bind_address = "127.0.0.1"
`
  );
}

function generateLibRs(snakeCasedAppName, programId) {
  return logAndReturn(
    "lib.rs",
    `use anchor_lang::prelude::*;

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
`
  );
}

// TODO: also put a package.json outside the container and use Docker in the scripts
function generatePackageJson(snakeCasedAppName, programId) {
  return logAndReturn(
    "package.json",
    JSON.stringify(
      {
        type: "module",
        scripts: {
          "lint:fix": 'prettier */*.js "*/**/*{.js,.ts}" -w',
          lint: 'prettier */*.js "*/**/*{.js,.ts}" --check',
          start:
            "(sleep 2 && solana airdrop 100000 -u localhost -k wallet.json; npm run refresh && node watcher.js) & solana-test-validator >/dev/null",
          next: `cd app && NEXT_PUBLIC_PROGRAM_ID=${programId} npm run dev`,
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
      },
      null,
      2
    )
  );
}

function generateWatcherJs(appName) {
  return logAndReturn(
    "watcher.js",
    `import { watch } from "fs";
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
`
  );
}

function generateVerifyJs(pascalCasedAppName) {
  return logAndReturn(
    "verify.js",
    `import * as anchor from "@coral-xyz/anchor";

anchor.setProvider(anchor.AnchorProvider.env());

it("Passes verification!", async () => {
  await anchor.workspace.${pascalCasedAppName}.methods.initialize().rpc();
});
`
  );
}

function showSuccessMessage(appName) {
  console.log(
    chalk.greenBright("Almost done!\n\nTo start the Solana backend, run:\n\n"),
    chalk.blueBright(`cd ${appName} && npm start`),
    chalk.greenBright("\n\nTo start the Next.js frontend, run:\n\n"),
    chalk.blueBright(`cd ${appName} && npm run next`)
  );
}

function initWithAnchor(appName) {
  logInGreen(`Initializing ${appName} using Anchor...`);

  execAndLog(`anchor init ${appName}`);

  logInGreen(`Stepping into ${appName}...`);
  chdir(appName);

  execAndLog("solana-keygen new --no-bip39-passphrase -o wallet.json");
  execAndLog("anchor build");

  const snakeCasedAppName = convertToSnakeCase(appName);

  const programId = execAndLog(
    `solana address -k target/deploy/${snakeCasedAppName}-keypair.json`
  ).trim();

  const anchorToml = generateAnchorToml(snakeCasedAppName, programId);
  writeFileSync("Anchor.toml", anchorToml);

  const libRs = generateLibRs(snakeCasedAppName, programId);
  writeFileSync(path.join("programs", appName, "src", "lib.rs"), libRs);

  const packageJson = generatePackageJson(snakeCasedAppName, programId);
  writeFileSync("package.json", packageJson);

  execAndLog("anchor test");

  const watcherJs = generateWatcherJs(appName);
  writeFileSync("watcher.js", watcherJs);

  const pascalCasedAppName = convertToPascalCase(appName);
  const verifyJs = generateVerifyJs(pascalCasedAppName);
  writeFileSync("verify.js", verifyJs);

  execAndLog("npm i chalk");
  execAndLog(
    "git clone https://github.com/ilovehackathons/dapp-scaffold-localhost app"
  );

  logInGreen(`Stepping into ${appName}/app...`);
  chdir("app");

  logInGreen(`Running 'rm -fr .git' (via rmSync)...`);
  rmSync(".git", { recursive: true, force: true });
  // rm(".git", { recursive: true, force: true }, (e) =>
  //   logInGreen(`Error: ${e?.message}`)
  // );
  // execAndLog("rm -fr .git");

  execAndLog("npm i");

  showSuccessMessage(appName);
}

function createExecInContainer(dockerPrefix) {
  return function execInContainer(command) {
    return execAndLog(`${dockerPrefix} ${command}`);
  };
}

function initWithAnchorAndDocker(appName) {
  logInGreen(`Initializing ${appName} using Anchor+Docker...`);

  const containerName = `create-solana-starter-${appName}`;

  // just in case
  execAndLog(`docker rm -f ${containerName}`);

  // start the container
  execAndLog(
    `docker run -di --name ${containerName} --rm projectserum/build:v0.27.0 /bin/sh`
  );

  let execInContainer = createExecInContainer(
    `docker exec -w /workdir ${containerName}`
  );

  execInContainer(`anchor init ${appName}`);

  execInContainer = createExecInContainer(
    `docker exec -w /workdir/${appName} ${containerName}`
  );

  execInContainer("solana-keygen new --no-bip39-passphrase -o wallet.json");

  execInContainer("date");
  execInContainer("anchor build");
  execInContainer("date");

  const snakeCasedAppName = convertToSnakeCase(appName);

  const programId = execInContainer(
    `solana address -k target/deploy/${snakeCasedAppName}-keypair.json`
  ).trim();

  execAndLog(`docker cp ${containerName}:/workdir/${appName} .`);
  logInGreen(`Stepping into ${appName}...`);
  chdir(appName);

  const anchorToml = generateAnchorToml(snakeCasedAppName, programId);
  writeFileSync("Anchor.toml", anchorToml);
  execAndLog(`docker cp Anchor.toml ${containerName}:/workdir/${appName}`);

  const libRs = generateLibRs(snakeCasedAppName, programId);
  writeFileSync(path.join("programs", appName, "src", "lib.rs"), libRs);
  execAndLog(
    `docker cp programs/${appName}/src/lib.rs ${containerName}:/workdir/${appName}/programs/${appName}/src`
  );

  const packageJson = generatePackageJson(snakeCasedAppName, programId);
  writeFileSync("package.json", packageJson);
  execAndLog(`docker cp package.json ${containerName}:/workdir/${appName}`);

  // execInContainer("anchor test"); // TODO: Unable to get latest blockhash. Test validator does not look started. Check .anchor/test-ledger/test-ledger-log.txt for errors. Consider increasing [test.startup_wait] in Anchor.toml.

  const watcherJs = generateWatcherJs(appName);
  writeFileSync("watcher.js", watcherJs);
  execAndLog(`docker cp watcher.js ${containerName}:/workdir/${appName}`);

  const pascalCasedAppName = convertToPascalCase(appName);
  const verifyJs = generateVerifyJs(pascalCasedAppName);
  writeFileSync("verify.js", verifyJs);
  execAndLog(`docker cp verify.js ${containerName}:/workdir/${appName}`);

  execInContainer("npm i chalk");
  execInContainer(
    "git clone https://github.com/ilovehackathons/dapp-scaffold-localhost app"
  );

  execInContainer = createExecInContainer(
    `docker exec -w /workdir/${appName}/app ${containerName}`
  );

  execInContainer("rm -fr .git");
  execInContainer("npm i");

  logInGreen(`Stepping out of ${appName}...`);
  chdir("..");
  rmSync(".git", { recursive: true, force: true });

  execAndLog(`docker cp ${containerName}:/workdir/${appName} .`);

  // cleanup. remove the container
  execAndLog(`docker rm -f ${containerName}`);

  // TODO: mount?
  showSuccessMessage(appName);
}
