# Commit Message Convention

This document outlines the commit message convention used in this project to maintain a clean git history and enable automatic changelog generation.

## Format

```
<type>(<scope>): <subject>

<body> (optional)

<footer> (optional)
```

## Types

| Type       | Description                           | Example                                      |
| ---------- | ------------------------------------- | -------------------------------------------- |
| `feat`     | A new feature                         | `feat: add seismic data filters`             |
| `fix`      | A bug fix                             | `fix: correct coordinate bounds check`       |
| `perf`     | Performance improvements              | `perf: add debouncing to filter changes`     |
| `refactor` | Code refactoring                      | `refactor: extract EarthquakeItem component` |
| `test`     | Adding or updating tests              | `test: add unit tests for coords`            |
| `docs`     | Documentation only changes            | `docs: add API contract documentation`       |
| `chore`    | Maintenance tasks                     | `chore: update dependencies`                 |
| `style`    | Code style changes (formatting, etc.) | `style: fix indentation`                     |

## Scope (Optional)

The scope indicates the area of the codebase affected:

- `seismic` - Seismic-related changes
- `volcano` - Volcano-related changes
- `ui` - UI component changes
- `i18n` - Internationalization changes
- `api` - API/Edge Function changes
- `deps` - Dependency updates

Examples:

```
feat(seismic): add magnitude filter
fix(volcano): correct coordinate display
chore(deps): update supabase client
```

## Subject

- Use imperative, present tense ("add" not "added" or "adds")
- Don't capitalize the first letter
- No period at the end
- Maximum 72 characters

Good examples:

```
feat: add earthquake list pagination
fix: resolve i18n key mismatch in es.json
perf: implement debounced filter changes
```

Bad examples:

```
feat: Added pagination feature.
fix: Fixed the bug.
update: some changes
```

## Body (Optional)

- Use to explain the "why" and "what" of the change
- Wrap at 72 characters
- Use imperative, present tense
- Can include bullet points for multiple changes

Example:

```
feat(seismic): add multi-source data aggregation

Implement aggregation of earthquake data from USGS, OVSICORI, and RSN.
This provides more comprehensive coverage for Costa Rica region.

- Add seismic-service Edge Function
- Implement data normalization
- Add source filtering capability
```

## Footer (Optional)

Use for referencing issues, breaking changes, or co-authors:

```
Closes #123

BREAKING CHANGE: remove deprecated API endpoint

Co-authored-by: Name <email@example.com>
```

## Examples

### Feature Addition

```
feat(seismic): add real-time earthquake map

Integrate Google Maps with seismic data for visual earthquake
display. Includes color-coded markers based on magnitude.

- Add SeismicMap component
- Implement marker clustering
- Add magnitude color scheme

Closes #45
```

### Bug Fix

```
fix(coords): correct isWithinCostaRica bounds check

Fix inverted latitude/longitude comparisons that caused the
function to always return false.

The comparisons were checking:
  lat >= max && lat <= min (always false)
Instead of:
  lat >= min && lat <= max

Fixes #67
```

### Performance Improvement

```
perf: add debouncing to filter changes

Implement 300ms debounce on filter controls to reduce API calls
and improve perceived performance.

- Add useDebounce hook
- Update SeismicPage to use debounced values
- Add useDebouncedCallback for function debouncing
```

### Documentation

```
docs: add seismic API contract

Document the seismic-service Edge Function API including:
- Request/response formats
- Error handling
- Example usage
- Data sources
```

### Test Addition

```
test: add unit tests for coordinate utilities

Add comprehensive tests for:
- isWithinCostaRica function
- VOLCANO_COORDINATES data
- Edge cases for boundary conditions
```

## Changelog Generation

This project uses an automatic changelog generator that parses commit messages.

### Generating Changelog

```bash
# Generate changelog from last tag to HEAD
npm run changelog

# Dry run (print to console without writing)
npm run changelog:dry-run

# Generate changelog for specific range
node scripts/generate-changelog.js --since v1.0.0 --to v1.1.0
```

### How Commits Are Categorized

| Commit Type | Changelog Section |
| ----------- | ----------------- |
| `feat`      | ### Added         |
| `fix`       | ### Fixed         |
| `perf`      | ### Performance   |
| `refactor`  | ### Changed       |
| `test`      | ### Testing       |
| `docs`      | ### Documentation |
| `chore`     | ### Maintenance   |
| `style`     | ### Style         |

### Ignored Commits

The following commit patterns are ignored in changelog generation:

- Merge commits (`Merge branch...`, `Merge pull request...`)
- Revert commits (`Revert...`)
- Work in progress (`WIP:`)
- CI changes (`ci:`)
- Build changes (`build:`)

## Tips

1. **Make atomic commits**: Each commit should represent a single logical change
2. **Write for humans**: The commit message should explain why the change was made
3. **Reference issues**: Use `Closes #123` or `Fixes #456` to link commits to issues
4. **Be consistent**: Follow the convention for all commits
5. **Review before pushing**: Use `git log --oneline` to review commits before pushing

## Commit Checklist

Before committing, check:

- [ ] Commit type is appropriate
- [ ] Subject is clear and concise
- [ ] Imperative mood is used
- [ ] No period at end of subject
- [ ] Body explains the change (if needed)
- [ ] Issues are referenced (if applicable)
- [ ] Breaking changes are documented
