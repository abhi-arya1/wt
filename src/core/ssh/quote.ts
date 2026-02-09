/**
 * Shell-quote a string for safe parsing into remote shell commands.
 *
 * Wraps the value in single quotes with proper escaping of any embedded
 * single-quote characters. This is the standard POSIX shell quoting
 * technique and prevents injection of shell metacharacters.
 *
 * Paths starting with `~/` are handled specially: the tilde is kept
 * unquoted so the remote shell expands it to the user's home directory
 * (e.g. `~/.wt/mirrors` becomes `~/'.wt/mirrors'`).
 */
export function q(s: string): string {
  if (s.startsWith("~/")) {
    return `~/'${s.slice(2).replace(/'/g, "'\\''")}'`;
  }
  return `'${s.replace(/'/g, "'\\''")}'`;
}
