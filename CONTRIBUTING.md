# Contributing

Thanks for your interest in c64! Here is how to get started.

## Setup

1. Install Node.js 20+
2. Clone: `git clone https://github.com/jeffsand/c64`
3. Install: `npm install`
4. Build: `npm run build`
5. Test: `npm test`

## Making changes

1. Fork the repo and create a branch from `main`
2. Make your changes in `src/`
3. Add tests for new functionality
4. Run `npm run build` (must compile cleanly)
5. Run `npm test` (all tests must pass)
6. Open a PR with a clear description

## Code style

- TypeScript strict mode
- No `any` types
- Every exported function has a JSDoc comment
- Error messages tell users what to do, not just what went wrong
- Data on stdout, messages on stderr

## What makes a good PR

- One feature or fix per PR
- Tests included
- CHANGELOG.md updated
- Docs updated if behavior changes
