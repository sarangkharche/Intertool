import { Command } from "commander";

const BASH_SCRIPT = `
_intertool_completions() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  local commands="login logout whoami search install remove list info publish update init completions"
  COMPREPLY=($(compgen -W "$commands" -- "$cur"))
}
complete -F _intertool_completions intertool
`.trim();

const ZSH_SCRIPT = `
#compdef intertool

_intertool() {
  local -a commands
  commands=(
    'login:Authenticate with a registry'
    'logout:Clear stored credentials'
    'whoami:Show current user'
    'search:Search the skill registry'
    'install:Install a skill'
    'remove:Remove an installed skill'
    'list:List installed skills'
    'info:Show details about a skill'
    'publish:Publish a skill to the registry'
    'update:Update an installed skill'
    'init:Scaffold a new skill'
    'completions:Generate shell completions'
  )

  _describe 'command' commands
}

_intertool
`.trim();

const FISH_SCRIPT = `
complete -c intertool -n '__fish_use_subcommand' -a login -d 'Authenticate with a registry'
complete -c intertool -n '__fish_use_subcommand' -a logout -d 'Clear stored credentials'
complete -c intertool -n '__fish_use_subcommand' -a whoami -d 'Show current user'
complete -c intertool -n '__fish_use_subcommand' -a search -d 'Search the skill registry'
complete -c intertool -n '__fish_use_subcommand' -a install -d 'Install a skill'
complete -c intertool -n '__fish_use_subcommand' -a remove -d 'Remove an installed skill'
complete -c intertool -n '__fish_use_subcommand' -a list -d 'List installed skills'
complete -c intertool -n '__fish_use_subcommand' -a info -d 'Show details about a skill'
complete -c intertool -n '__fish_use_subcommand' -a publish -d 'Publish a skill to the registry'
complete -c intertool -n '__fish_use_subcommand' -a update -d 'Update an installed skill'
complete -c intertool -n '__fish_use_subcommand' -a init -d 'Scaffold a new skill'
complete -c intertool -n '__fish_use_subcommand' -a completions -d 'Generate shell completions'
`.trim();

export const completionsCommand = new Command("completions")
  .description("Generate shell completion scripts")
  .argument("<shell>", "Shell type: bash, zsh, or fish")
  .addHelpText("after", `
Examples:
  $ intertool completions bash >> ~/.bashrc
  $ intertool completions zsh >> ~/.zshrc
  $ intertool completions fish > ~/.config/fish/completions/intertool.fish
`)
  .action((shell: string) => {
    switch (shell.toLowerCase()) {
      case "bash":
        console.log(BASH_SCRIPT);
        break;
      case "zsh":
        console.log(ZSH_SCRIPT);
        break;
      case "fish":
        console.log(FISH_SCRIPT);
        break;
      default:
        console.error(`Unsupported shell: ${shell}. Use bash, zsh, or fish.`);
        process.exit(1);
    }
  });
