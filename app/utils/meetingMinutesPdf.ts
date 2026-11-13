import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PageSizes, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { AgendaEntry, Meeting, MeetingDecision, Proposal } from '~~/shared/types/bill';
import { agendaLines } from '~~/shared/utils/agenda';
import { formatTermLabel } from '~~/shared/utils/term';

// Replace this file with the licensed 標楷體 TTF when it becomes available.
const MINUTES_FONT_URL = '/fonts/LXGWWenKaiTC-Regular.ttf';
const PAGE_MARGIN = 48;
const BODY_SIZE = 11;
const BODY_LINE_HEIGHT = 19;

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    let line = '';
    let width = 0;
    for (const char of paragraph) {
      const charWidth = font.widthOfTextAtSize(char, size);
      if (line && width + charWidth > maxWidth) {
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
): Promise<Uint8Array> {
  const response = await fetch(MINUTES_FONT_URL);
  if (!response.ok) throw new Error('無法載入會議記錄字型');

  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  // pdf-lib's subsetting drops glyphs from this CJK font in rendered output.
  const font = await document.embedFont(await response.arrayBuffer());
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
    options: { size?: number; indent?: number; gap?: number; center?: boolean } = {},
  ) {
    const size = options.size ?? BODY_SIZE;
    const indent = options.indent ?? 0;
    const lineHeight = size === BODY_SIZE ? BODY_LINE_HEIGHT : size + 9;
    for (const line of wrapText(text, font, size, contentWidth - indent)) {
      ensureSpace(lineHeight);
      if (line) {
        page.drawText(line, {
          x: options.center
            ? (pageWidth - font.widthOfTextAtSize(line, size)) / 2
            : PAGE_MARGIN + indent,
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
  drawText(`${meeting.title} 會議記錄`, { size: 17, gap: 5, center: true });
  drawText(`${formatTermLabel(meeting.session)}　${meeting.meetingTypeName}`, {
    gap: 13,
    center: true,
  });

  const decisionMap = new Map(decisions.map((item) => [item.proposalId, item.decision]));
  for (const line of agendaLines(entries, proposals)) {
    if (line.entry.kind === 'heading') {
      ensureSpace(50);
      y -= 5;
      drawText(line.text, { size: 13, gap: 5 });
    } else if (line.entry.kind === 'proposal') {
      ensureSpace(52);
      const match = line.text.match(/^([一二三四五六七八九十百千\d]+、)(.*)$/);
      const prefix = match?.[1] ?? '';
      const subject = match ? `${prefix}案由：${match[2]}` : `案由：${line.text}`;
      drawText(subject, { indent: 12 });
      drawText(`決議：${decisionMap.get(line.entry.proposalId!) || '尚未填寫'}`, {
        indent: 12 + font.widthOfTextAtSize(prefix, BODY_SIZE),
        gap: 9,
      });
    } else {
      drawText(line.text, { indent: 12, gap: 5 });
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
