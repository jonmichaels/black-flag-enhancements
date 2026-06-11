export class Parser {
  constructor(input = "") {
    this.input = String(input).replace(/\r\n?/g, "\n");
    this.position = 0;
  }

  get remainder() {
    return this.input.slice(this.position);
  }

  consumeLine() {
    const rest = this.remainder;
    if (!rest) return "";
    const idx = rest.indexOf("\n");
    const line = idx === -1 ? rest : rest.slice(0, idx);
    this.position += idx === -1 ? rest.length : idx + 1;
    return line.trim();
  }

  consumeRegex(regex) {
    const m = this.remainder.match(regex);
    if (!m || m.index !== 0) return null;
    this.position += m[0].length;
    return m;
  }

  consumeIfMatches(regex) {
    const m = this.remainder.match(regex);
    if (!m || m.index !== 0) return null;
    this.position += m[0].length;
    return m[0].trim();
  }

  consumeNumber() {
    const m = this.consumeRegex(/^\s*(-?\d+(?:\.\d+)?)/);
    return m ? Number(m[1]) : null;
  }

  consumeEnum(values) {
    const line = this.consumeLine();
    return values.find(v => v.toLowerCase() === line.toLowerCase()) ?? null;
  }

  consumeEnumPlurals(values) {
    const line = this.consumeLine().toLowerCase();
    return values.find(v => line === v.toLowerCase() || line === `${v.toLowerCase()}s`) ?? null;
  }

  consumeDescription() {
    return this.remainder.trim();
  }

  parseEnrichers(text) {
    return String(text ?? "");
  }

  consumeAttunement() {
    return /requires attunement/i.test(this.input);
  }

  consumeCost() {
    const m = this.input.match(/(?:cost|price)[:\s]+([^\n]+)/i);
    return m?.[1]?.trim() ?? "";
  }

  consumeCasting() {
    const m = this.input.match(/Casting Time[:\s]+([^\n]+)/i);
    return m?.[1]?.trim() ?? "";
  }

  consumeComponents() {
    const m = this.input.match(/Components?[:\s]+([^\n]+)/i);
    return m?.[1]?.trim() ?? "";
  }

  consumeDuration() {
    const m = this.input.match(/Duration[:\s]+([^\n]+)/i);
    return m?.[1]?.trim() ?? "";
  }

  consumeRange() {
    const m = this.input.match(/Range[:\s]+([^\n]+)/i);
    return m?.[1]?.trim() ?? "";
  }
}
