---
name: using-wt
description: Manages git worktree-based sandboxes with the wt CLI tool, both locally and on remote hosts over SSH. Use when the user wants to create, enter, run commands in, list, remove, or manage isolated worktree sandboxes, configure remote hosts, or troubleshoot wt issues.
---

# wt — Git Worktree Sandbox Manager

CLI tool that creates isolated git worktree checkouts ("sandboxes") locally or on remote SSH hosts. Built with TypeScript + Commander.

## Core Concepts

- **Sandbox**: An isolated git worktree checkout with a unique name, ID (nanoid), host, and path
- **Host**: Either `"local"` (built-in) or a registered remote SSH target
- **Mirror**: A bare `--mirror` clone stored at `.wt/mirrors/<repoId>.git` (local) or `<root>/mirrors/` (remote)
- **Config**: `~/.config/wt/config.json` — stores hosts, sandboxes, default host

## Directory Layout

```
.wt/                          # Local (inside repo root, gitignored)
  mirrors/<repoId>.git/       # bare --mirror clone
  sandboxes/<sandboxName>/      # worktree checkout
  meta/<sandboxName>.json       # metadata

<remote-root>/                # Remote (user-configured)
  mirrors/<repoId>.git/
  sandboxes/<sandboxName>/
  meta/<sandboxName>.json
```

## Commands

| Command | Description |
|---|---|
| `wt up [name]` | Create sandbox on a host. `-H <host>`, `--branch <ref>`. Auto-names from branch. |
| `wt local [name]` | Shorthand for `wt up` on local host. |
| `wt enter <name>` | Shell into sandbox. `--tmux` for persistent session. |
| `wt run <name> -- <cmd...>` | Run command in sandbox. `--json`, `--quiet`. |
| `wt ls` | List sandboxes. `--host` to filter. |
| `wt rm <name>` | Remove sandbox (prompts confirmation, `--yes` to skip). |
| `wt rename <old> <new>` | Rename a sandbox. |
| `wt status <name>` | Show sandbox info (host, ref, path, age, tmux state). |
| `wt sessions` | List active `wt-*` tmux sessions. |
| `wt gc` | Remove stale sandboxes. `--older-than 7d` (default), `--dry-run`. |
| `wt doctor` | Check prerequisites (git, bun/node, tmux) on a host. |
| `wt bootstrap` | Report host readiness + install hints (read-only, installs nothing). |
| `wt host add [name]` | Register remote host. Interactive mode if args omitted. |
| `wt host ls` | List configured hosts (includes port mappings). |
| `wt host check <name>` | Test SSH connectivity. |
| `wt host rm <name>` | Remove host config. |
| `wt host map <name> <localPort> <hostPort>` | Add port forwarding (`-L`) to a host. |
| `wt host unmap <name> <localPort>` | Remove a port mapping. |

## Common Workflows

**Local sandbox:**
```bash
cd my-project
wt local my-experiment        # Create from current repo
wt enter my-experiment        # Shell in
wt rm my-experiment           # Clean up
```

**Remote sandbox:**
```bash
wt host add prod --ssh user@10.0.0.5 --root /srv/wt
wt doctor -H prod
wt up my-feature -H prod --branch feature/auth
wt enter my-feature --tmux
wt run my-feature -- make build
```

**Port forwarding:**
```bash
wt host map prod 3000 8080      # local:3000 -> remote:8080
wt host map prod 5432 5432      # forward postgres
wt enter my-feature             # mappings applied automatically
wt host unmap prod 3000         # remove mapping
```

**Parallel branch testing:**
```bash
wt up auth --branch feature/auth
wt up payments --branch feature/payments
wt run auth -- bun test
wt run payments -- bun test
wt gc --older-than 1d
```

## Important Conventions

- All commands support `--json` for machine-readable output (errors: `{ "ok": false, "error": "..." }`)
- Host flag is `-H` (capital), not `-h` (which is `--help`)
- `wt run` uses `--` to separate wt flags from the command to execute
- Sandbox names auto-derive from branch name if omitted (last segment after `/`, sanitized)
- Host names must match `/^[a-z][a-z0-9_-]{0,31}$/`
- `wt up` is idempotent — re-running with same name/host/repo returns existing sandbox
- `.env*` files from CWD are auto-copied into new sandboxes
- Config writes are concurrency-safe — all mutations use `withConfig(fn)` (`proper-lockfile`) in `src/core/host/config.ts`

## Good-to-know

- **`wt up` defaults to HEAD SHA** (detached), not a branch ref. Branch name is only used for naming.
- **Remote sandboxes require the origin to be cloneable from the remote host.**
- **`wt enter --tmux` and interactive commands call `process.exit()`** — they take over the process.
- **Local `.wt/` resolves from repo root** via `git rev-parse --show-toplevel`, even from subdirectories.
