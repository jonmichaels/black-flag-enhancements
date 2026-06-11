export function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c] ?? c));
}

export function enrichTraitLine(line) {
  const match = line.match(/^([^.:]{2,80})\.\s+(.*)$/);
  if (!match) return `<p>${escapeHTML(line)}</p>`;
  return `<p><em><strong>${escapeHTML(match[1])}.</strong></em> ${escapeHTML(match[2])}</p>`;
}

export function linesToHtml(lines, { traitStyle = true } = {}) {
  const html = [];
  for (const raw of lines) {
    const line = String(raw || "").trim();
    if (!line) continue;
    if (/^[-•*]\s+/.test(line)) html.push(`<p>• ${escapeHTML(line.replace(/^[-•*]\s+/, ""))}</p>`);
    else if (traitStyle && /^[^.:]{2,80}\.\s+/.test(line)) html.push(enrichTraitLine(line));
    else if (/^[A-Z][A-Za-z /-]{2,80}$/.test(line)) html.push(`<h5>${escapeHTML(line)}</h5>`);
    else html.push(`<p>${escapeHTML(line)}</p>`);
  }
  return html.join("\n");
}

export function makeDescription(html) {
  return { value: html || "", chat: "", unidentified: "" };
}
