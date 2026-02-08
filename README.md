# wt

Run `git worktree` sandboxes, locally or on remote hosts over SSH, with minimal setup.

`wt` clones your repo into a bare mirror, then spins up isolated worktrees you can enter, run commands in, and throw away when you're done. Works on your machine or any box you can SSH into, with SSH keys, agents, environments, and more included.

```
wt
├── host
│   ├── add [name]
│   ├── ls
│   ├── check <name>
│   └── rm <name>
├── up [name]
├── local [name]
├── rename <old> <new>
├── enter <name>
├── run <name> <cmd>
├── sessions
├── gc
├── doctor
├── bootstrap
├── ls
├── rm <name>
└── status <name>
```

## Install

```bash
# with any package manager, but bun is recommended
bun install -g @abhi-arya1/wt
```

Requires [Bun](https://bun.sh) (v1.3.3+). You can also build a standalone binary with `bun build --compile` if you prefer — no runtime needed, but the binary will be larger.

### From source

```bash
git clone https://github.com/abhi-arya1/wt.git && cd wt
bun install
bun run build
bun link
```

Or just run it directly during development:

```bash
bun run dev -- <command>
```

## Quick start

### Local sandbox

You're in a git repo. You want an isolated copy to mess around in without touching your working tree.

```bash
wt local my-experiment --enter
# you're now in a worktree at .wt/sandboxes/my-experiment

# or just let it pick the name from your current branch
wt local --enter
# sandbox named after your current branch
```

### Remote sandbox

You have a server you can SSH into. Register it as a host, then spin up sandboxes there.

```bash
wt host add prod-box --ssh user@10.0.0.5 --root /srv/wt
wt up my-feature --host prod-box --enter
```

### Clean up

```bash
wt rm my-experiment       # remove a specific sandbox
wt gc                     # remove all sandboxes older than 7 days
wt gc --older-than 1d     # more aggressive
wt gc --dry-run           # see what would get deleted
```

### Agent Usage 

If you are using an agent to make sandboxes for multiple agents to work within them, you can install `wt` then give agents the [`SKILL.md`](./SKILL.md) file. This will allow them to understand usage of `wt` and create sandboxes on your behalf.

## Guides

### Setting up a remote host from scratch

1. Make sure the remote box has `git` installed and your SSH key is authorized.

2. Add the host:

```bash
wt host add myserver --ssh me@myserver.com --root /home/me/wt-sandboxes
```

This registers the host and runs a connectivity check. If it passes, you're good.

3. Check what's installed on the remote:

```bash
wt bootstrap --host myserver --tmux --agents claude,opencode
```

This tells you what's present and what's missing. It doesn't install anything -- just reports.

4. Verify everything works:

```bash
wt doctor --host myserver
```

5. Create a sandbox from any local git repo:

```bash
cd ~/projects/my-app
wt up test-sandbox --host myserver --enter
```

You're now in a shell on `myserver` inside a worktree of your repo. `.env` files from your local directory get copied over automatically.

6. Run commands without entering:

```bash
wt run test-sandbox -- make build
wt run test-sandbox -- bun test
```

7. Use tmux for persistent sessions:

```bash
wt enter test-sandbox --tmux
# detach with ctrl-b d, reattach later with the same command
```

### Running multiple sandboxes for parallel work

Say you need to test three branches at once.

```bash
wt up --branch feature/auth
wt up --branch feature/payments
wt up --branch fix/header-bug

wt ls
# NAME         HOST   REF       CREATED
# auth         local  a1b2c3d4  2/8/2026
# payments     local  e5f6g7h8  2/8/2026
# header-bug   local  i9j0k1l2  2/8/2026

wt run auth -- bun test
wt run payments -- bun test
wt run header-bug -- bun test

# rename one if you want
wt rename auth login-revamp

# done, clean up
wt rm login-revamp
wt rm payments
wt rm header-bug
```

### SSH keys and identity files

Use `-i` to point at a specific key when adding a host, and `-p` for a non-standard port:

```bash
wt host add mybox --ssh deploy@10.0.0.5 --root /srv/wt -i ~/.ssh/id_mybox -p 2222
```

These are stored in config and used for every SSH and SCP operation to that host. If you don't pass `-i`, wt uses whatever OpenSSH picks from your agent or default key.

### Private repos on remote hosts

When you run `wt up --host myserver`, wt tells the **remote** to `git clone --bare --mirror <origin>`. That means the remote host needs access to your git remote (e.g. GitHub). For private repos, you have two options:

**Option 1: SSH agent forwarding (recommended)**

Add `ForwardAgent yes` for the host in your `~/.ssh/config`:

```
Host myserver
    HostName 10.0.0.5
    User deploy
    ForwardAgent yes
```

Now your local SSH keys are available on the remote when wt runs git commands. No keys need to be deployed on the server.

**Option 2: Deploy a key on the remote**

Add an SSH key on the remote host and register it as a deploy key with your git provider (e.g. GitHub deploy keys). This works without agent forwarding but means the remote has standing access to the repo.

### Hosts behind firewalls and jump hosts

wt doesn't have explicit jump host flags, but it passes the SSH target directly to OpenSSH, so anything in your `~/.ssh/config` is honored. To reach a host behind a bastion:

```
Host bastion
    HostName bastion.example.com
    User ops

Host internal-box
    HostName 10.0.1.50
    User deploy
    ProxyJump bastion
    ForwardAgent yes
```

Then register it using the alias:

```bash
wt host add internal-box --ssh internal-box --root /srv/wt
```

wt will connect through the bastion transparently. The same applies to `ProxyCommand`, custom `ControlMaster` settings, or any other OpenSSH config directives.

### Using with tmux sessions

Every sandbox can have a tmux session tied to it. Sessions are named `wt-<sandboxId>`.

```bash
wt enter my-sandbox --tmux      # creates or reattaches to tmux session
wt sessions                     # list all wt-managed tmux sessions
wt sessions --host prod-box     # list sessions on a remote host
```

## Command reference

### `wt up [name]`

Create a sandbox worktree on a host. If `name` is omitted, it defaults to the branch name from `-b` / `--ref`, or the current branch.

| Flag | Description |
|---|---|
| `-H, --host <name>` | Target host (defaults to configured default, falls back to `local`) |
| `-b, --branch <name>` | Create or use a branch with this name |
| `-r, --ref <ref>` | Git ref to check out (branch, tag, or sha that must exist) |
| `-e, --enter` | Enter the sandbox after creating it |
| `--tmux` | Use tmux when entering (implies `--enter`) |
| `--json` | JSON output |

### `wt local [name]`

Shorthand for `wt up [name]` on the local host. Same options minus `--host`.

| Flag | Description |
|---|---|
| `-b, --branch <name>` | Create or use a branch with this name |
| `-r, --ref <ref>` | Git ref to check out (branch, tag, or sha that must exist) |
| `-e, --enter` | Enter the sandbox after creating it |
| `--tmux` | Use tmux when entering (implies `--enter`) |
| `--json` | JSON output |

### `wt rename <old> <new>`

Rename a sandbox.

| Flag | Description |
|---|---|
| `--json` | JSON output |

### `wt enter <name>`

Open a shell inside a sandbox.

| Flag | Description |
|---|---|
| `--tmux` | Use a tmux session instead of a plain shell |
| `--json` | Print sandbox record as JSON without entering |

### `wt run <name> <cmd...>`

Run a command inside a sandbox. Streams output by default.

| Flag | Description |
|---|---|
| `--json` | Capture stdout/stderr and return as JSON (must come before `--`) |
| `--quiet` | Suppress non-error output (must come before `--`) |

Note: flags for `wt run` itself go **before** `--`. Everything after `--` is passed to the command.

```bash
wt run my-sandbox --json -- git log --oneline -5
```

### `wt ls`

List all sandboxes.

| Flag | Description |
|---|---|
| `-H, --host <name>` | Filter by host |
| `--json` | JSON output |

### `wt rm <name>`

Remove a sandbox. Deletes the worktree directory, metadata, and config entry. Prunes the mirror's worktree references.

| Flag | Description |
|---|---|
| `--json` | JSON output |

### `wt status <name>`

Show sandbox details: host, ref, path, age, whether the directory exists, and whether a tmux session is active.

| Flag | Description |
|---|---|
| `--json` | JSON output |

### `wt sessions`

List active `wt-*` tmux sessions.

| Flag | Description |
|---|---|
| `-H, --host <name>` | Target host |
| `--json` | JSON output |

### `wt gc`

Garbage-collect stale sandboxes. A sandbox is stale if it's older than the threshold or its directory no longer exists.

| Flag | Description |
|---|---|
| `-H, --host <name>` | Target host (omit for all hosts) |
| `--older-than <dur>` | Age threshold, e.g. `7d`, `24h`, `1w` (default: `7d`) |
| `--dry-run` | Preview what would be deleted |
| `--json` | JSON output |

### `wt doctor`

Check that git, bun/node, and tmux are available on a host.

| Flag | Description |
|---|---|
| `-H, --host <name>` | Target host |
| `--json` | JSON output |

### `wt bootstrap`

Check host readiness. Reports what's installed and what's missing. Does not install anything.

| Flag | Description |
|---|---|
| `-H, --host <name>` | Target host |
| `--tmux` | Include tmux in checks |
| `--agents <list>` | Comma-separated agent CLIs to check (e.g. `claude,opencode`) |
| `--json` | JSON output |

### `wt host add [name]`

Register or update a remote host.

| Flag | Description |
|---|---|
| `-s, --ssh <target>` | SSH target (alias, `user@host`, or `ssh://user@host:port`) |
| `-r, --root <path>` | Remote base directory (absolute path) |
| `-d, --default` | Set as default host |
| `-p, --port <n>` | SSH port |
| `-i, --identity <path>` | Path to SSH identity file |
| `-t, --connect-timeout <s>` | Connection timeout in seconds (default: 10) |
| `-l, --labels <k=v,...>` | Comma-separated key=value labels |
| `--no-check` | Skip connectivity check |
| `--json` | JSON output |

### `wt host ls`

List all configured hosts.

| Flag | Description |
|---|---|
| `--json` | JSON output |

### `wt host check <name>`

Test SSH connectivity and capabilities of a host.

| Flag | Description |
|---|---|
| `--json` | JSON output |

### `wt host rm <name>`

Remove a host.

| Flag | Description |
|---|---|
| `-y, --yes` | Skip confirmation prompt |
| `--json` | JSON output |

## How it works

`wt` creates a bare mirror of your repo, then uses `git worktree add` to spin up isolated checkouts. Each sandbox gets its own directory and metadata file.

```
.wt/                          # local root (inside your repo)
  mirrors/
    <repoId>.git/             # bare mirror
  sandboxes/
    <name>/                   # worktree checkout
  meta/
    <sandboxId>.json          # sandbox metadata
```

Remote hosts use the same layout under the configured `root` path (e.g. `/srv/wt`). All remote operations go over SSH.

Config lives at `~/.config/wt/config.json` and stores hosts and sandbox records. Every structured command supports `--json` for scripting.

## JSON output

Every command that produces structured output supports `--json`. Errors in JSON mode return:

```json
{
  "ok": false,
  "error": "what went wrong"
}
```

This makes it straightforward to compose `wt` with other tools, scripts, or agents.
