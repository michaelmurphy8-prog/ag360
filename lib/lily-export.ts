import jsPDF from "jspdf";
import * as XLSX from "xlsx";

// ─── AG360 Brand Colors ──────────────────────────────────────
const BRAND = {
  green: [74, 124, 89] as [number, number, number],
  darkText: [34, 37, 39] as [number, number, number],
  mutedText: [122, 138, 124] as [number, number, number],
  lightBg: [247, 248, 246] as [number, number, number],
  border: [218, 222, 216] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

// ─── Parse markdown-ish text into structured blocks ──────────
type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet"; text: string }
  | { type: "numbered"; num: string; text: string }
  | { type: "divider" }
  | { type: "blank" };

function parseContent(raw: string): Block[] {
  const lines = raw.split("\n");
  const blocks: Block[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      blocks.push({ type: "blank" });
      continue;
    }

    if (trimmed === "---" || trimmed === "***") {
      blocks.push({ type: "divider" });
      continue;
    }

    // Headings
    const h3 = trimmed.match(/^###\s+(.+)/);
    if (h3) { blocks.push({ type: "heading", level: 3, text: h3[1] }); continue; }
    const h2 = trimmed.match(/^##\s+(.+)/);
    if (h2) { blocks.push({ type: "heading", level: 2, text: h2[1] }); continue; }
    const h1 = trimmed.match(/^#\s+(.+)/);
    if (h1) { blocks.push({ type: "heading", level: 1, text: h1[1] }); continue; }

    // Bold-only lines as sub-headings
    const boldLine = trimmed.match(/^\*\*(.+?)\*\*:?$/);
    if (boldLine) { blocks.push({ type: "heading", level: 3, text: boldLine[1] }); continue; }

    // Numbered list
    const num = trimmed.match(/^(\d+)[\.\)]\s+(.+)/);
    if (num) { blocks.push({ type: "numbered", num: num[1], text: stripMarkdown(num[2]) }); continue; }

    // Bullets
    const bullet = trimmed.match(/^[-•*]\s+(.+)/);
    if (bullet) { blocks.push({ type: "bullet", text: stripMarkdown(bullet[1]) }); continue; }

    // Regular paragraph
    blocks.push({ type: "paragraph", text: stripMarkdown(trimmed) });
  }

  return blocks;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1");
}

// ─── PDF Export ──────────────────────────────────────────────

export function exportLilyPDF(
  content: string,
  farmName: string = "My Farm",
  title?: string,
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const marginL = 20;
  const marginR = 20;
  const contentW = pageW - marginL - marginR;
  const footerY = pageH - 15;
  let y = 0;
  let pageNum = 1;

  const autoTitle = title || guessTitle(content);
  const dateStr = new Date().toLocaleDateString("en-CA", {
    year: "numeric", month: "long", day: "numeric",
  });

  // ── Draw header on each page
  function drawHeader() {
    // Top bar
    doc.setFillColor(...BRAND.green);
    doc.rect(0, 0, pageW, 28, "F");

    // AG360 logo text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...BRAND.white);
    doc.text("AG", marginL, 13);
    const agW = doc.getTextWidth("AG");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("| 360", marginL + agW + 1, 13);

    // Tagline
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("FOR THE FARMER", marginL, 19);

    // Farm name right-aligned
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.white);
    doc.text(farmName, pageW - marginR, 13, { align: "right" });

    // Date
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(dateStr, pageW - marginR, 19, { align: "right" });

    // Lily badge
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(marginL, 32, 70, 7, 1.5, 1.5, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.green);
    doc.text("LILY  AG360 ADVISOR", marginL + 3, 36.5);

    y = 45;
  }

  // ── Draw footer on each page
  function drawFooter() {
    doc.setDrawColor(...BRAND.border);
    doc.line(marginL, footerY - 3, pageW - marginR, footerY - 3);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.mutedText);
    doc.text("AG360 — Agricultural Operating System  |  ag360.farm", marginL, footerY);
    doc.text(
      "Operational guidance only — not legal, financial, or medical advice.",
      marginL,
      footerY + 3.5,
    );
    doc.text(`Page ${pageNum}`, pageW - marginR, footerY, { align: "right" });
  }

  // ── Check if we need a new page
  function checkPage(needed: number) {
    if (y + needed > footerY - 8) {
      drawFooter();
      doc.addPage();
      pageNum++;
      drawHeader();
    }
  }

  // ── Wrap text and return lines
  function wrapText(text: string, maxW: number, fontSize: number): string[] {
    doc.setFontSize(fontSize);
    return doc.splitTextToSize(text, maxW);
  }

  // ── Start building
  drawHeader();

  // Title
  if (autoTitle) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...BRAND.darkText);
    const titleLines = wrapText(autoTitle, contentW, 14);
    checkPage(titleLines.length * 6 + 6);
    doc.text(titleLines, marginL, y);
    y += titleLines.length * 6 + 6;
  }

  // Parse and render blocks
  const blocks = parseContent(content);

  for (const block of blocks) {
    switch (block.type) {
      case "blank":
        y += 2;
        break;

      case "divider":
        checkPage(6);
        doc.setDrawColor(...BRAND.border);
        doc.line(marginL, y, pageW - marginR, y);
        y += 5;
        break;

      case "heading": {
        const sizes = { 1: 13, 2: 11, 3: 10 };
        const sz = sizes[block.level as 1 | 2 | 3] || 10;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(sz);
        doc.setTextColor(...BRAND.darkText);
        const lines = wrapText(block.text, contentW, sz);
        checkPage(lines.length * (sz * 0.45) + 4);
        y += 3;
        doc.text(lines, marginL, y);
        y += lines.length * (sz * 0.45) + 3;
        break;
      }

      case "paragraph": {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...BRAND.darkText);
        const lines = wrapText(block.text, contentW, 9.5);
        checkPage(lines.length * 4.2 + 2);
        doc.text(lines, marginL, y);
        y += lines.length * 4.2 + 2;
        break;
      }

      case "bullet": {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...BRAND.darkText);
        const bLines = wrapText(block.text, contentW - 8, 9.5);
        checkPage(bLines.length * 4.2 + 1);

        // Bullet dot
        doc.setFillColor(...BRAND.green);
        doc.circle(marginL + 2, y - 1, 0.8, "F");
        doc.text(bLines, marginL + 8, y);
        y += bLines.length * 4.2 + 1;
        break;
      }

      case "numbered": {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(...BRAND.green);
        const nLines = wrapText(block.text, contentW - 10, 9.5);
        checkPage(nLines.length * 4.2 + 1);

        doc.text(`${block.num}.`, marginL, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...BRAND.darkText);
        doc.text(nLines, marginL + 10, y);
        y += nLines.length * 4.2 + 1;
        break;
      }
    }
  }

  // Final footer
  drawFooter();

  // Save
  const fileName = `AG360_${(autoTitle || "Lily_Report").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40)}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

// ─── Excel Export ────────────────────────────────────────────

export function exportLilyExcel(
  content: string,
  farmName: string = "My Farm",
  title?: string,
) {
  const autoTitle = title || guessTitle(content);
  const dateStr = new Date().toLocaleDateString("en-CA", {
    year: "numeric", month: "long", day: "numeric",
  });

  // Build rows
  const rows: string[][] = [];
  rows.push(["AG360 — For the Farmer"]);
  rows.push([`Farm: ${farmName}`, "", `Date: ${dateStr}`]);
  rows.push([`Prepared by: Lily — AG360 Advisor`]);
  rows.push([""]);
  if (autoTitle) {
    rows.push([autoTitle]);
    rows.push([""]);
  }

  // Parse content into rows
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { rows.push([""]); continue; }
    if (trimmed === "---" || trimmed === "***") { rows.push(["————————————————————"]); continue; }
    rows.push([stripMarkdown(trimmed)]);
  }

  rows.push([""]);
  rows.push(["AG360 — Agricultural Operating System  |  ag360.farm"]);
  rows.push(["Operational guidance only — not legal, financial, or medical advice."]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column width
  ws["!cols"] = [{ wch: 80 }, { wch: 20 }, { wch: 25 }];

  // Merge header cells for branding row
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
  ];
  if (autoTitle) {
    ws["!merges"].push({ s: { r: 4, c: 0 }, e: { r: 4, c: 2 } });
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Lily Report");

  const fileName = `AG360_${(autoTitle || "Lily_Report").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40)}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// ─── Guess a title from the first heading or bold line ───────
function guessTitle(content: string): string {
  const lines = content.split("\n");
  for (const line of lines) {
    const t = line.trim();
    const h = t.match(/^#{1,3}\s+(.+)/);
    if (h) return stripMarkdown(h[1]);
    const bold = t.match(/^\*\*(.+?)\*\*/);
    if (bold) return bold[1];
  }
  return "Lily Report";
}