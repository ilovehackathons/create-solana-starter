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
- [git version 2.37.1](https://git-scm.com/downloads)

## Usage

1. Run `npx create-solana-starter@latest my-solana-app` to initialize the project.
2. Start the Solana backend with `cd my-solana-app && npm start`.
3. Start the Next.js frontend with `cd my-solana-app && npm run next`.
4. Make changes to `lib.rs` and watch the console.
5. Press `Ctrl+C` to stop the tasks once you're done.

## Features

### Working

- Run via [`npx`](https://docs.npmjs.com/cli/v9/commands/npx). No explicit installation required.
- Initializes an [Anchor project](https://www.anchor-lang.com/docs/hello-world) with `anchor init`.
- Generates a shareable [wallet](https://docs.solana.com/getstarted/local#create-a-file-system-wallet) for development purposes (**do not use on mainnet!!!**) with `solana-keygen`.
- Generates Anchor source code with a [valid program ID](https://www.anchor-lang.com/docs/high-level-overview).
- An npm script to (re)build and init/upgrade the on-chain program/IDL anytime.
  - An [interface definition (IDL)](https://www.anchor-lang.com/docs/cli#idl) is needed by frontends.
- A [`lib.rs`](https://docs.solana.com/getstarted/rust#create-your-first-solana-program) file watcher that runs the above-mentioned script automatically [on changes](https://nodejs.org/dist/latest-v18.x/docs/api/fs.html#fswatchfilename-options-listener).
- A second npm script to do lots of heavy lifting (start the [test validator](https://docs.solana.com/developing/test-validator) & file watcher, [give you some SOL](https://docs.solana.com/getstarted/local#airdrop-sol-tokens-to-your-wallet) so that you can actually deploy, etc.)
- Two more [npm scripts](https://docs.npmjs.com/cli/v9/using-npm/scripts) for long-to-type Anchor commands.
- An [Anchor script](https://www.anchor-lang.com/docs/manifest#scripts-required-for-testing) that verifies that there's actually a valid program at the program ID.
- Verbose output so that you can actually understand what's going on under the hood.
  - `create-solana-starter` output is [bright green](https://github.com/chalk/chalk#readme), while that of the [commands it calls](https://nodejs.org/dist/latest-v18.x/docs/api/child_process.html#child_processexecsynccommand-options) is (generally) white.
- There's a [Next.js frontend](https://github.com/ilovehackathons/dapp-scaffold-localhost) in `app` that connects to our test validator.
- The code in `lib.rs` lets you store an arbitrary signed integer on-chain.
- Interact with the Solana program (storing and retrieving an arbitrary number) in the frontend.

### Planned

- Add tests for the number storage and retrieval feature.
- Choose between different templates (e.g. Anchor or [Seahorse](https://seahorse-lang.org)).
- Real-time CLI output.
  - Right now, there's only output after the respective command (e.g. `anchor build`) has completed. That may take a minute or two.

## Links

- [npm package registry](https://www.npmjs.com/package/create-solana-starter)
- [Twitter](https://twitter.com/createsolana)
- [Presentation](https://pitch.com/public/7a885e05-eea7-4755-93c9-f7c77d132a97)
