/**
 * Shell-quote a string for safe interpolation into remote shell commands.
 *
 * Wraps the value in single quotes with proper escaping of any embedded
 * single-quote characters. This is the standard POSIX shell quoting
 * technique and prevents injection of shell metacharacters.
 */
export function q(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}
