---
name: git-workflow
description: Git workflow and PR best practices. Use when committing changes, creating branches, or submitting pull requests.
---

# Git Workflow

## Quick Commands

```bash
# Status check
git status
git diff --staged

# Commit flow
git add -p                    # Interactive staging
git commit -m "type: message" # Conventional commit
git push -u origin feature/x  # Push with upstream

# Branch management
git checkout -b feature/name  # New branch
git fetch origin && git rebase origin/main  # Update branch
git branch -d feature/name    # Delete merged branch
```

## Conventional Commits

Format: `type(scope): description`

| Type | Use Case |
|------|----------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change (no new feature/fix) |
| `docs` | Documentation only |
| `style` | Formatting, missing semicolons |
| `test` | Adding/updating tests |
| `chore` | Maintenance, dependencies |
| `perf` | Performance improvement |

### Examples for This Project

```bash
git commit -m "feat(workspace): add phase-based input routing"
git commit -m "fix(runtime): handle SSE reconnection on timeout"
git commit -m "refactor(ledger): extract snapshot logic to separate method"
git commit -m "chore(deps): update xstate to 5.26"
```

## Branch Strategy

### Feature Branch Flow

```
main
  └── feature/add-ollama-streaming
        ├── commit: feat(ollama): add streaming support
        ├── commit: test(ollama): add streaming tests
        └── PR → main
```

### Naming Conventions

```
feature/short-description   # New features
fix/issue-number-desc       # Bug fixes
refactor/component-name     # Refactoring
chore/dependency-update     # Maintenance
```

## Pull Request Template

```markdown
## Summary
- Brief description of changes
- Why these changes are needed

## Changes
- [ ] Component/file 1: what changed
- [ ] Component/file 2: what changed

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing performed
- [ ] Edge cases considered

## Notes
- Any breaking changes?
- Migration steps if needed
```

## Pre-Commit Checklist

```bash
# 1. Check what's staged
git diff --staged

# 2. Run linting
npm run lint

# 3. Run build (catch type errors)
npm run build

# 4. Review commit message
# Does it follow conventional commits?
# Is the scope accurate?
```

## Handling Common Scenarios

### Amend Last Commit (unpushed only)

```bash
git add .
git commit --amend --no-edit
```

### Squash Commits Before PR

```bash
git rebase -i HEAD~3  # Squash last 3 commits
# Mark commits as 'squash' or 's'
```

### Rebase on Updated Main

```bash
git fetch origin
git rebase origin/main
# Resolve conflicts if any
git push --force-with-lease  # Safe force push
```

### Undo Last Commit (keep changes)

```bash
git reset --soft HEAD~1
```

## Code Review Guidelines

### As Author
- Keep PRs focused and small (<400 lines ideal)
- Write clear PR description
- Respond to feedback promptly
- Don't push during active review

### As Reviewer
- Review within 24 hours
- Be constructive, suggest alternatives
- Approve when "good enough", not perfect
- Use suggestions for minor fixes

## Project-Specific Notes

### Key Files to Watch
- `src/types.ts` - Type changes affect many files
- `src/machines/*.ts` - State machine changes need careful review
- `src/lib/runtime.ts` - Core event dispatch logic
- `src/app/api/*` - API contract changes

### Before Merging
- Ensure dev server runs: `npm run dev`
- Build passes: `npm run build`
- No lint errors: `npm run lint`
