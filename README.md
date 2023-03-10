# create-solana-starter

## Requirements

```sh
$ anchor --version
anchor-cli 0.27.0

$ solana --version
solana-cli 1.14.16 (src:ab6f3bda; feat:3488713414)

$ solana-test-validator --version
solana-test-validator 1.14.16 (src:ab6f3bda; feat:3488713414)

$ rustc --version
rustc 1.65.0 (897e37553 2022-11-02)

$ node --version
v18.12.1
```

## Usage

1. Run `npx create-solana-starter@latest my-solana-app` to initialize the project.
2. Run `cd my-solana-app && npm start` to deploy it to localhost.
3. Make changes to `lib.rs` and watch the console.
4. Press `Ctrl+C` to stop the tasks once you're done.

## npm package registry

[https://www.npmjs.com/package/create-solana-starter](https://www.npmjs.com/package/create-solana-starter)

## Ignore this

```sh
mkdir create-solana-starter
git init
npm init -y
```

## TODO

- Support Seahorse
