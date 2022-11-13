import { locate } from "https://deno.land/x/locate@0.0.1/mod.ts";

export class Parser<T> {
  pointer: number;
  template: string;
  stack: T[];
  constructor(template: string) {
    this.pointer = 0;
    this.template = template;
    this.stack = [];
  }
  get current(): T {
    return this.stack[this.stack.length - 1];
  }
  error(message: string, index = this.pointer) {
    throw new ParseError(message, this.template, index);
  }
  match(val: string): boolean {
    return this.template.slice(
      this.pointer,
      this.pointer + val.length,
    ) === val;
  }
  /** Move the pointer ahead of the `val` string */
  move(val: string, required = false): boolean {
    if (this.match(val)) {
      this.pointer += val.length;
      return true;
    }
    if (required) this.error(`${val} is required at position ${this.pointer}.`);
    return false;
  }
  /** Move ahead if the pattern is found and return the matched slice */
  read(pattern: RegExp): string {
    const matches = pattern.exec(this.template.slice(this.pointer));
    if (!matches || matches.index !== 0) return "";

    this.pointer += matches[0].length;

    return matches[0];
  }
  /** Move ahead till the pattern is found and return the matched slice */
  readUntil(val: RegExp): string {
    const match = val.exec(this.template.slice(this.pointer));
    return this.template.slice(
      this.pointer,
      match ? (this.pointer += match.index) : this.template.length,
    );
  }
  /** Return the rest of the string */
  remaining(): string {
    return this.template.slice(this.pointer, this.template.length - 1);
  }
  /** Require at least one whitespace at the current index */
  requireWhitespace(): boolean {
    if (!this.move(" ")) this.error(`Expected whitespace`);
    this.skipCharacter(/\s/);
    return true;
  }
  /** Skip all characters that match a pattern from current index */
  skipCharacter(pattern: RegExp) {
    while (
      this.pointer < this.template.length &&
      pattern.test(this.template[this.pointer])
    ) {
      this.pointer++;
    }
  }
}

/** Custom class for parsing-related errors */
export class ParseError {
  message: string;
  // For firefox and for custom error handling
  lineNumber: number;
  columnNumber: number;
  // For people who don't want to flood their console
  shortMessage: string;
  constructor(message: string, template: string, index: number) {
    // locate the line and column
    const { line, column } = locate(template, index);
    const lines = template.split("\n");

    const frameStart = Math.max(0, line - 2);
    const frameEnd = Math.min(line + 3, lines.length);

    const digits = String(frameEnd + 1).length;
    const frame = lines
      .slice(frameStart, frameEnd)
      .map((content, i) => {
        const isErrorLine = frameStart + i === line;

        let lineNum = String(i + frameStart + 1);
        while (lineNum.length < digits) lineNum = ` ${lineNum}`;

        if (isErrorLine) {
          const indicator = repeat(
            " ",
            digits + 2 + tabsToSpaces(content.slice(0, column)).length,
          ) +
            "^";
          return `${lineNum}: ${tabsToSpaces(content)}\n${indicator}`;
        }

        return `${lineNum}: ${tabsToSpaces(content)}`;
      })
      .join("\n");

    this.message = `${message} (${line + 1}:${column})\n${frame}`;
    this.lineNumber = line;
    this.columnNumber = column;
    this.shortMessage = message;
  }
}

/**
 * Repeat a string n times.
 */
function repeat(s: string, n: number): string {
  let res = "";
  while (n > 0) {
    res += s;
    n -= 1;
  }
  return res;
}

/**
 * Tabs are not cool.
 */
function tabsToSpaces(str: string) {
  return str.replace(/^\t+/, (m) => m.split("\t").join("  "));
}
