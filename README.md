# create-solana-starter

create-solana-starter is a command-line tool that initializes a new [Solana](https://solana.com) project for you so you can skip tedious manual steps and go straight to coding.

## Prerequisites

- [Node.js v18.12.1](https://nodejs.org/)
  - Run `corepack enable` afterwards to enable the Yarn package manager (required by `anchor-cli`).
- [rustc 1.65.0 (897e37553 2022-11-02)](https://www.rust-lang.org/tools/install)
  - On macOS, you may need to go into `System Settings -> Privacy & Security -> Security` to dismiss the security warning several times before Rust will install successfully.
- [solana-cli 1.14.16 (src:ab6f3bda; feat:3488713414)](https://docs.solana.com/cli/install-solana-cli-tools#use-solanas-install-tool)
  - Do not use Homebrew, because it won't install `solana-test-validator 1.14.16 (src:ab6f3bda; feat:3488713414)`.
- [anchor-cli 0.27.0](https://www.anchor-lang.com/docs/installation#build-from-source-for-other-operating-systems-without-avm)
  - There seems to be an issue with `avm`; it's better if you install directly with `cargo`.

## Usage

1. Run `npx create-solana-starter@latest my-solana-app` to initialize the project.
2. Run `cd my-solana-app && npm start` to deploy it to localhost.
3. Make changes to `lib.rs` and watch the console.
4. Press `Ctrl+C` to stop the tasks once you're done.

## Features

### Working

- Initializes an Anchor project with `anchor init`.
- Generates a shareable wallet for development purposes (**do not use on mainnet!!!**).
- Generates Anchor source code with a valid program ID.
- An npm script to (re)build and init/upgrade the on-chain program/IDL anytime.
  - The IDL (ABI) is needed by frontends.
- A `lib.rs` file watcher that runs the above-mentioned script automatically on changes.
- A second npm script to do lots of heavy lifting (start the test validator & file watcher, give you some SOL so that you can actually deploy, etc.)
- Two more npm scripts for long-to-type Anchor commands.
- A script that verifies that there's actually a valid program at the program ID.
- Verbose output so that you can actually understand what's going on under the hood.
  - create-solana-starter output is green, while that of the commands it calls is (generally) white.

### Planned

- Choose between different templates (e.g. Anchor or Seahorse).
- A frontend that actually works with localhost.
  - There's a Next.js scaffold, but it only works with devnet/testnet/mainnet.

## Links

- [npm package registry](https://www.npmjs.com/package/create-solana-starter)
- [Twitter](https://twitter.com/createsolana)
- [Presentation](https://pitch.com/public/7a885e05-eea7-4755-93c9-f7c77d132a97)
