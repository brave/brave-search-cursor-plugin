# Safe query handling

`$ARGUMENTS` is substituted into command markdown before the agent runs. Do
not put it inside a code fence or an inline shell command — the agent will
copy that line, and `$(...)` inside double quotes executes before `bx` starts.
`allowed-tools: Bash(bx:*)` does not help; the string still starts with `bx`.

Put `$ARGUMENTS` in prose so the agent reads it as data. Fences use a
placeholder (`bx "<query>"`, `--data-urlencode "q=your query"`); the agent
substitutes the query itself.

For awkward pasted input, `bx answers -` reads a JSON body from stdin, and
`--goggles @-` / curl `--data-urlencode q@file` keep the text off the command
line. Other `bx` subcommands take the query as a positional argument.
