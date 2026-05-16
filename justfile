# arch-lint — task runner

# Run the unit test suite once
test:
    npm run test

# Run only graph-milestone tests
test-graph:
    npx vitest run src/graph

# Run tests in watch mode
test-watch:
    npm run test:watch

# Run tests with coverage (90% lines+branches gate)
coverage:
    npm run coverage

# Compile dist/ via tsc
build:
    npm run build

# Type-check without emit
typecheck:
    npx tsc --noEmit

# Format all in-scope files with Biome
fmt:
    npx biome format --write .

# Lint + format check with Biome (no writes)
check:
    npx biome check .
