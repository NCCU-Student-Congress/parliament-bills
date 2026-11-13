import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PageSizes, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { AgendaEntry, Meeting, MeetingDecision, Proposal } from '~~/shared/types/bill';
import { agendaLines } from '~~/shared/utils/agenda';
import { formatTermLabel } from '~~/shared/utils/term';

// Byte-for-byte parts of TW-Kai.ttf, kept below the Cloudflare Pages per-asset limit.
const MINUTES_FONT_PARTS = ['/fonts/TW-Kai-1.bin', '/fonts/TW-Kai-2.bin'];
const PAGE_MARGIN = 48;
const TITLE_SIZE = 16;
const HEADING_SIZE = 14;
const BODY_SIZE = 12;
const LINE_HEIGHT_RATIO = 1.5;
const CASE_GAP = BODY_SIZE * 1.25;

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  firstLineWidth: number,
  continuationWidth = firstLineWidth,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    let line = '';
    let width = 0;
    for (const char of paragraph) {
      const charWidth = font.widthOfTextAtSize(char, size);
      if (line && width + charWidth > (lines.length ? continuationWidth : firstLineWidth)) {
        lines.push(line);
        line = '';
        width = 0;
      }
      line += char;
      width += charWidth;
    }
    lines.push(line);
  }
  return lines;
}

export async function createMeetingMinutesPdf(
  meeting: Meeting,
  entries: AgendaEntry[],
  proposals: Proposal[],
  decisions: MeetingDecision[],
  closingTime: string,
): Promise<Uint8Array> {
  const parts = await Promise.all(
    MINUTES_FONT_PARTS.map(async (path) => {
      const response = await fetch(path);
      if (!response.ok) throw new Error('無法載入會議記錄字型');
      return new Uint8Array(await response.arrayBuffer());
    }),
  );
  const fontBytes = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    fontBytes.set(part, offset);
    offset += part.length;
  }

  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  // Embed the full font: pdf-lib subsetting omitted CJK glyphs in rendered PDFs.
  const font = await document.embedFont(fontBytes);
  document.setTitle(`${meeting.title} 會議記錄`);
  document.setLanguage('zh-TW');

  const [pageWidth, pageHeight] = PageSizes.A4;
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  const pages: PDFPage[] = [];
  let page: PDFPage;
  let y = 0;

  function addPage() {
    page = document.addPage(PageSizes.A4);
    pages.push(page);
    y = pageHeight - PAGE_MARGIN;
  }

  function ensureSpace(height: number) {
    if (y - height < PAGE_MARGIN + 16) addPage();
  }

  function drawText(
    text: string,
    options: {
      size?: number;
      indent?: number;
      hangingIndent?: number;
      gap?: number;
      center?: boolean;
    } = {},
  ) {
    const size = options.size ?? BODY_SIZE;
    const indent = options.indent ?? 0;
    const hangingIndent = options.hangingIndent ?? 0;
    const lineHeight = size * LINE_HEIGHT_RATIO;
    const lines = wrapText(
      text,
      font,
      size,
      contentWidth - indent,
      contentWidth - indent - hangingIndent,
    );
    for (const [index, line] of lines.entries()) {
      ensureSpace(lineHeight);
      if (line) {
        page.drawText(line, {
          x: options.center
            ? (pageWidth - font.widthOfTextAtSize(line, size)) / 2
            : PAGE_MARGIN + indent + (index ? hangingIndent : 0),
          y,
          size,
          font,
          color: rgb(0.08, 0.08, 0.08),
        });
      }
      y -= lineHeight;
    }
    y -= options.gap ?? 0;
  }

  addPage();
  drawText(`${meeting.title} 會議記錄`, { size: TITLE_SIZE, gap: 5, center: true });
  drawText(`${formatTermLabel(meeting.session)}　${meeting.meetingTypeName}`, {
    size: HEADING_SIZE,
    gap: 13,
    center: true,
  });

  const proposalDecisions = new Map(
    decisions
      .filter((item) => item.proposalId !== undefined)
      .map((item) => [item.proposalId!, item.decision]),
  );
  const textDecisions = new Map(
    decisions
      .filter((item) => item.decisionKey !== undefined)
      .map((item) => [item.decisionKey!, item.decision]),
  );
  function drawDecision(decision: string | undefined, prefix: string) {
    drawText(`決議：${decision ?? ''}`, {
      indent: 12 + font.widthOfTextAtSize(prefix, BODY_SIZE),
      hangingIndent: font.widthOfTextAtSize('決議：', BODY_SIZE),
      gap: CASE_GAP,
    });
  }
  for (const line of agendaLines(entries, proposals)) {
    if (line.entry.kind === 'heading') {
      ensureSpace(50);
      y -= 5;
      const closingLabel =
        line.entry.content.endsWith('、散會') && closingTime
          ? `（${closingTime.slice(0, 2)}時${closingTime.slice(3, 5)}分）`
          : '';
      drawText(`${line.text}${closingLabel}`, { size: HEADING_SIZE, gap: 5 });
    } else if (line.entry.kind === 'proposal') {
      ensureSpace(52);
      const match = line.text.match(/^([一二三四五六七八九十百千\d]+、)(.*)$/);
      const prefix = match?.[1] ?? '';
      const subjectLabel = `${prefix}案由：`;
      const subject = `${subjectLabel}${match ? match[2] : line.text}`;
      drawText(subject, {
        indent: 12,
        hangingIndent: font.widthOfTextAtSize(subjectLabel, BODY_SIZE),
      });
      drawDecision(proposalDecisions.get(line.entry.proposalId!), prefix);
    } else {
      ensureSpace(52);
      const prefix = line.text.match(/^([一二三四五六七八九十百千\d]+、)/)?.[1] ?? '';
      drawText(line.text, {
        indent: 12,
        hangingIndent: font.widthOfTextAtSize(prefix, BODY_SIZE),
      });
      drawDecision(textDecisions.get(line.entry.decisionKey ?? ''), prefix);
    }
  }

  pages.forEach((currentPage, index) => {
    const footer = `${index + 1} / ${pages.length}`;
    currentPage.drawText(footer, {
      x: (pageWidth - font.widthOfTextAtSize(footer, 9)) / 2,
      y: 25,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  });
  return document.save();
}
