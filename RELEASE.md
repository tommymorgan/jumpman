# Release Process

This project uses automated releases via GitHub Actions with semantic versioning based on conventional commits.

## How It Works

1. **Write conventional commits** following the [Conventional Commits](https://www.conventionalcommits.org/) specification:
   - `fix:` - Bug fixes (triggers PATCH version bump: 1.0.X)
   - `feat:` - New features (triggers MINOR version bump: 1.X.0)
   - `feat!:` or `BREAKING CHANGE:` - Breaking changes (triggers MAJOR version bump: X.0.0)
   - Other types (`docs:`, `style:`, `refactor:`, `test:`, `chore:`) don't trigger releases

2. **Update version in package.json** before pushing to master:
   ```bash
   # For bug fixes
   pnpm run version:patch
   
   # For new features
   pnpm run version:minor
   
   # For breaking changes
   pnpm run version:major
   ```

3. **Commit the version change**:
   ```bash
   git add package.json
   git commit -m "chore: bump version to X.Y.Z"
   ```

4. **Push to master branch**:
   ```bash
   git push origin master
   ```

## What Happens Next

When you push to master, the GitHub Actions workflow will:

1. **Validate the version bump** - Ensures package.json version matches the expected bump based on conventional commits
2. **Run `pnpm verify`** - Executes lint, typecheck, and tests
3. **Build the VSIX** - Creates the extension package
4. **Create a GitHub Release** - Automatically generates release notes from commit messages
5. **Upload the VSIX** - Attaches the extension file to the release

## Workflow Requirements

The CI workflow will **fail** if:
- Version in package.json hasn't been updated when there are `feat:` or `fix:` commits
- Version bump doesn't match conventional commit requirements
- Lint, typecheck, or tests fail

## Example Workflow

```bash
# Make changes and commit with conventional commits
git add src/feature.ts
git commit -m "feat: add new navigation feature"

# Update version based on commits
pnpm run version:minor  # Because we added a feature

# Commit version bump
git add package.json
git commit -m "chore: bump version to 1.1.0"

# Push to trigger release
git push origin master
```

## Manual Release (Emergency)

If needed, you can manually create a release:

```bash
# Ensure everything passes
pnpm run verify

# Build the VSIX
pnpm run build:vsix

# Create a git tag
git tag v1.2.3
git push origin v1.2.3

# Upload the VSIX to GitHub releases manually
```