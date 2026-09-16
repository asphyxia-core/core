/**
 * Dependency-free subset of `argparse` v1, matching its parsing rules,
 * help layout and error messages for the options used by Asphyxia CORE
 * (long-option prefix matching, `-p1234`/`--port=1234` forms, int
 * conversion, usage wrapping and ambiguous-option reporting).
 */
import path from 'path';

export interface ArgumentParserOptions {
  version?: string;
  addHelp?: boolean;
  description?: string;
  prog?: string;
  debug?: boolean;
}

export interface ArgumentOptions {
  help?: string;
  type?: 'int' | 'string';
  metavar?: string;
  dest?: string;
  defaultValue?: any;
  action?: 'store' | 'storeTrue';
}

interface Action {
  optionStrings: string[];
  dest: string;
  nargs: number | null;
  type?: 'int' | 'string';
  metavar?: string;
  help?: string;
  defaultValue: any;
  action: 'store' | 'storeTrue' | 'help' | 'version';
}

const EOL = '\n';
const SUPPRESS = '==SUPPRESS==';
const NEGATIVE_NUMBER = /^[-]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$/;

function splitLines(text: string, width: number): string[] {
  const lines: string[] = [];
  const delimiters = [' ', '.', ',', '!', '?'];
  const re = new RegExp('[' + delimiters.join('') + '][^' + delimiters.join('') + ']*$');

  text = text.replace(/[\n|\t]/g, ' ');
  text = text.trim();
  text = text.replace(/\s+/g, ' ');

  text.split(EOL).forEach(line => {
    if (width >= line.length) {
      lines.push(line);
      return;
    }

    let wrapStart = 0;
    let wrapEnd = width;
    let delimiterIndex = 0;
    while (wrapEnd <= line.length) {
      // Mirrors argparse's formatter (the `indexOf(...)` expression is
      // always -1, which is truthy, so the delimiter branch always runs).
      const bogus = (delimiters as any[]).indexOf(((line[wrapEnd] as any) < -1) as any);
      if (wrapEnd !== line.length && bogus) {
        delimiterIndex = ((re.exec(line.substring(wrapStart, wrapEnd)) as any) || {}).index;
        wrapEnd = wrapStart + delimiterIndex + 1;
      }
      lines.push(line.substring(wrapStart, wrapEnd));
      wrapStart = wrapEnd;
      wrapEnd += width;
    }
    if (wrapStart < line.length) {
      lines.push(line.substring(wrapStart, wrapEnd));
    }
  });

  return lines;
}

function formatText(text: string, width: number, indent: string): string {
  return (
    splitLines(text, width)
      .map(line => indent + line)
      .join(EOL) +
    EOL +
    EOL
  );
}

export class ArgumentParser {
  public readonly prog: string;
  public readonly description?: string;
  public readonly version?: string;
  public readonly debug: boolean;

  private readonly actions: Action[] = [];
  private readonly optionStringActions: { [key: string]: Action } = {};
  private readonly width: number;

  constructor(options: ArgumentParserOptions = {}) {
    this.prog = options.prog || path.basename(process.argv[1] || '');
    this.description = options.description;
    this.version = options.version;
    this.debug = options.debug === true;
    this.width = (process.env.COLUMNS ? parseInt(process.env.COLUMNS) : 80) - 2;

    if (options.addHelp !== false) {
      this.addArgument(['-h', '--help'], {
        help: 'Show this help message and exit.',
        action: 'help' as any,
      });
    }

    if (options.version) {
      this.addArgument(['-v', '--version'], {
        help: "Show program's version number and exit.",
        action: 'version' as any,
      });
    }
  }

  public addArgument(flags: string | string[], options: ArgumentOptions = {}): void {
    const optionStrings = Array.isArray(flags) ? flags : [flags];

    let dest = options.dest;
    if (!dest) {
      const long = optionStrings.reduce((a, b) => (a.length >= b.length ? a : b));
      dest = long.replace(/^--?/, '').replace(/-/g, '_');
    }

    const action: Action = {
      optionStrings,
      dest,
      nargs: options.action === 'storeTrue' ? 0 : null,
      type: options.type,
      metavar: options.metavar,
      help: options.help,
      action: (options.action as any) || 'store',
      defaultValue:
        options.defaultValue !== undefined
          ? options.defaultValue
          : options.action === 'storeTrue'
          ? false
          : null,
    };

    if (action.action === 'help' || action.action === 'version') {
      action.dest = SUPPRESS;
      action.nargs = 0;
    }

    this.actions.push(action);
    for (const optionString of optionStrings) {
      this.optionStringActions[optionString] = action;
    }
  }

  public parseArgs(argv: string[] = process.argv.slice(2)): any {
    const namespace: any = {};
    for (const action of this.actions) {
      if (action.dest !== SUPPRESS) {
        namespace[action.dest] = action.defaultValue;
      }
    }

    const unrecognized: string[] = [];

    for (let i = 0; i < argv.length; i++) {
      const arg = argv[i];

      if (arg === '--') {
        unrecognized.push(...argv.slice(i + 1));
        break;
      }

      if (!arg || arg[0] !== '-' || arg === '-') {
        unrecognized.push(arg);
        continue;
      }

      const tuple = this.parseOptional(arg);
      const action = tuple[0];

      if (!action) {
        unrecognized.push(arg);
        continue;
      }

      if (action.action === 'help') {
        this.printHelp();
        this.exit(0);
      }

      if (action.action === 'version') {
        this.exit(0, `${this.version}${EOL}`);
      }

      let explicitArg = tuple[2];

      if (action.nargs === 0) {
        if (explicitArg != null) {
          this.error(`argument "${action.optionStrings.join('/')}": ignored explicit argument '${explicitArg}'`);
        }
        namespace[action.dest] = true;
        continue;
      }

      let value: string;
      if (explicitArg != null) {
        value = explicitArg;
      } else {
        const next = argv[i + 1];
        if (
          next !== undefined &&
          next !== '--' &&
          (next[0] !== '-' || next === '-' || NEGATIVE_NUMBER.test(next))
        ) {
          value = next;
          i++;
        } else {
          this.error(
            `argument "${action.optionStrings.join('/')}": Expected one argument. ${action.nargs}`
          );
        }
      }

      namespace[action.dest] = this.convert(action, value);
    }

    if (unrecognized.length > 0) {
      this.error(`Unrecognized arguments: ${unrecognized.join(' ')}.`);
    }

    return namespace;
  }

  private convert(action: Action, value: string): any {
    if (action.type === 'int') {
      const parsed = parseInt(value);
      if (isNaN(parsed)) {
        this.error(`argument "${action.optionStrings.join('/')}": Invalid int value: ${value}`);
      }
      return parsed;
    }
    return value;
  }

  private parseOptional(arg: string): [Action, string, string] | [null, string, null] {
    // exact option string, or the part before "="
    if (this.optionStringActions[arg]) {
      return [this.optionStringActions[arg], arg, null];
    }

    if (arg.indexOf('=') >= 0) {
      const optionString = arg.split('=')[0];
      const explicitArg = arg.slice(optionString.length + 1);
      if (this.optionStringActions[optionString]) {
        return [this.optionStringActions[optionString], optionString, explicitArg];
      }
    }

    const tuples: [Action, string, string][] = [];

    if (arg[0] === '-' && arg[1] === '-') {
      for (const optionString in this.optionStringActions) {
        if (optionString.substr(0, arg.length) === arg) {
          tuples.push([this.optionStringActions[optionString], optionString, null]);
        }
      }
    } else if (arg[0] === '-' && arg[1] !== '-') {
      const optionPrefixShort = arg.substr(0, 2);
      const argExplicitShort = arg.substr(2);
      for (const optionString in this.optionStringActions) {
        const action = this.optionStringActions[optionString];
        if (optionString === optionPrefixShort) {
          tuples.push([action, optionString, argExplicitShort]);
        } else if (optionString.substr(0, arg.length) === arg) {
          tuples.push([action, optionString, null]);
        }
      }
    }

    if (tuples.length > 1) {
      this.error(
        `Ambiguous option: "${arg}" could match ${tuples.map(t => t[1]).join(', ')}.`
      );
    }
    if (tuples.length === 1) {
      return tuples[0];
    }

    return [null, arg, null];
  }

  private formatActionInvocation(action: Action): string {
    if (action.nargs === 0) {
      return action.optionStrings.join(', ');
    }

    const metavar = action.metavar || action.dest.toUpperCase();
    return action.optionStrings.map(optionString => `${optionString} ${metavar}`).join(', ');
  }

  private formatActionUsage(action: Action): string {
    if (action.nargs === 0) {
      return `[${action.optionStrings[0]}]`;
    }
    const metavar = action.metavar || action.dest.toUpperCase();
    return `[${action.optionStrings[0]} ${metavar}]`;
  }

  private getLines(parts: string[], indent: string, prefix?: string): string[] {
    const lines: string[] = [];
    let line: string[] = [];
    let lineLength = prefix ? prefix.length - 1 : indent.length - 1;

    parts.forEach(part => {
      if (lineLength + 1 + part.length > this.width) {
        lines.push(indent + line.join(' '));
        line = [];
        lineLength = indent.length - 1;
      }
      line.push(part);
      lineLength += part.length + 1;
    });

    if (line) {
      lines.push(indent + line.join(' '));
    }
    if (prefix) {
      lines[0] = lines[0].substr(indent.length);
    }
    return lines;
  }

  private buildUsage(): string {
    const prefix = 'usage: ';
    const actionUsage = this.actions.map(a => this.formatActionUsage(a)).join(' ');
    let usage = `${this.prog} ${actionUsage}`;

    if (prefix.length + usage.length > this.width) {
      const parts = actionUsage.match(/\(.*?\)+|\[.*?\]+|\S+/g) || [];
      const indent = ' '.repeat(prefix.length + this.prog.length + 1);
      const lines = this.getLines([this.prog, ...parts], indent, prefix);
      const positionalLines = this.getLines([], indent);
      usage = lines.concat(positionalLines).join(EOL);
    }

    return prefix + usage + EOL + EOL;
  }

  /**
   * Matches argparse's `printUsage()`, which runs the usage through the
   * help formatter (trimming the trailing blank line).
   */
  public formatUsage(): string {
    return this.buildUsage().replace(/^\n+|\n+$/g, '') + EOL;
  }

  private formatAction(action: Action): string {
    const helpPosition = Math.min(this.actionMaxLength() + 2, 24);
    const helpWidth = this.width - helpPosition;
    const actionWidth = helpPosition - 2 - 2;
    let actionHeader = this.formatActionInvocation(action);
    let indentFirst: number;

    if (!action.help) {
      actionHeader = '  ' + actionHeader + EOL;
      indentFirst = 0;
    } else if (actionHeader.length <= actionWidth) {
      actionHeader = '  ' + actionHeader + '  ' + ' '.repeat(actionWidth - actionHeader.length);
      indentFirst = 0;
    } else {
      actionHeader = '  ' + actionHeader + EOL;
      indentFirst = helpPosition;
    }

    const parts: string[] = [actionHeader];

    if (action.help) {
      const helpLines = splitLines(action.help, helpWidth);
      parts.push(' '.repeat(indentFirst) + helpLines[0] + EOL);
      helpLines.slice(1).forEach(line => {
        parts.push(' '.repeat(helpPosition) + line + EOL);
      });
    } else if (actionHeader.charAt(actionHeader.length - 1) !== EOL) {
      parts.push(EOL);
    }

    return parts.filter(part => part && part !== SUPPRESS).join('');
  }

  private actionMaxLength(): number {
    let max = 0;
    for (const action of this.actions) {
      max = Math.max(max, this.formatActionInvocation(action).length + 2);
    }
    return max;
  }

  public formatHelp(): string {
    const usage = this.buildUsage();
    const description = this.description ? formatText(this.description, this.width, '') : '';

    let section = '';
    if (this.actions.length > 0) {
      section = EOL + 'Optional arguments:' + EOL;
      section += this.actions.map(a => this.formatAction(a)).join('');
      section += EOL;
    }

    let help = EOL + usage + description + section + EOL;
    help = help.replace(new RegExp(EOL + EOL + EOL + '+', 'g'), EOL + EOL);
    help = help.replace(/^\n+|\n+$/g, '') + EOL;
    return help;
  }

  public printUsage(): void {
    process.stdout.write(this.formatUsage());
  }

  public printHelp(stream: NodeJS.WritableStream = process.stdout): void {
    stream.write(this.formatHelp());
  }

  public exit(status: number, message?: string): never {
    if (message) {
      if (status === 0) {
        process.stdout.write(message);
      } else {
        process.stderr.write(message);
      }
    }
    process.exit(status);
  }

  public error(message: string | Error): never {
    const text = message instanceof Error ? message.message : message;
    if (this.debug) {
      throw message instanceof Error ? message : new Error(text);
    }

    this.printUsage();
    return this.exit(2, `${this.prog}: error: ${text}${EOL}`);
  }
}
