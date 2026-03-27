/**
 * Shell completion generators for bash, zsh, and fish.
 *
 * These output completion scripts to stdout so users can redirect
 * them into the appropriate shell config file.
 */

const COMMANDS: Array<{ name: string; description: string }> = [
  { name: "info", description: "Show device info and status" },
  { name: "drives", description: "Show drive status" },
  { name: "mount", description: "Mount a disk image" },
  { name: "eject", description: "Eject disk from drive" },
  { name: "run", description: "Auto-detect and run file" },
  { name: "play", description: "Full play sequence" },
  { name: "reset", description: "Reset the C64" },
  { name: "reboot", description: "Reboot Ultimate hardware" },
  { name: "type", description: "Type on C64 keyboard" },
  { name: "ls", description: "List files on device" },
  { name: "upload", description: "Upload file to device" },
  { name: "discover", description: "Scan for devices" },
  { name: "disk", description: "Manage data disks" },
  { name: "config", description: "Manage configuration" },
  { name: "watch", description: "Watch drive status changes" },
  { name: "completions", description: "Generate shell completions" },
];

export function generateBash(): string {
  const names = COMMANDS.map((c) => c.name).join(" ");
  return `# c64 bash completions
# Add to ~/.bashrc:  eval "$(c64 completions bash)"
_c64_completions() {
    local cur="\${COMP_WORDS[COMP_CWORD]}"
    local commands="${names}"

    if [ \$COMP_CWORD -eq 1 ]; then
        COMPREPLY=(\$(compgen -W "\$commands" -- "\$cur"))
    fi
}
complete -F _c64_completions c64
`;
}

export function generateZsh(): string {
  const entries = COMMANDS.map((c) => `        '${c.name}:${c.description}'`).join("\n");
  return `#compdef c64
# c64 zsh completions
# Install: c64 completions zsh > ~/.zfunc/_c64
# Then add to .zshrc: fpath=(~/.zfunc $fpath); autoload -Uz compinit && compinit
_c64() {
    local commands=(
${entries}
    )
    _describe 'command' commands
}
_c64
`;
}

export function generateFish(): string {
  const lines = COMMANDS.map(
    (c) => `complete -c c64 -n '__fish_use_subcommand' -a ${c.name} -d '${c.description}'`,
  );
  return `# c64 fish completions
# Install: c64 completions fish > ~/.config/fish/completions/c64.fish
${lines.join("\n")}
`;
}

export function generate(shell: string): string | null {
  switch (shell) {
    case "bash":
      return generateBash();
    case "zsh":
      return generateZsh();
    case "fish":
      return generateFish();
    default:
      return null;
  }
}
