import type { AgendaEntry, Meeting, Proposal } from '../types/bill';

const chineseNumbers = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const sectionNumbers = ['壹', '貳', '參', '肆', '伍', '陸', '柒', '捌', '玖', '拾'];
type Section = 'time' | 'location' | 'report' | 'election' | 'discussion' | 'temporary' | 'closing';

function agendaSection(content: string): Section | null {
  if (content.includes('會議時間')) return 'time';
  if (content.includes('會議地點')) return 'location';
  if (content.includes('報告事項')) return 'report';
  if (content.includes('選舉事項')) return 'election';
  if (content.includes('討論事項')) return 'discussion';
  if (content.includes('臨時動議')) return 'temporary';
  if (content.includes('散會')) return 'closing';
  return null;
}

export function agendaNumber(index: number): string {
  const number = index + 1;
  if (number <= 10) return chineseNumbers[index] ?? String(number);
  if (number < 20) return `十${number === 10 ? '' : (chineseNumbers[number - 11] ?? '')}`;
  if (number < 100) {
    const tens = chineseNumbers[Math.floor(number / 10) - 1];
    const ones = number % 10;
    return `${tens}十${ones ? chineseNumbers[ones - 1] : ''}`;
  }
  return String(number);
}

export function splitAgendaNumberedText(text: string) {
  const match = text.match(/^([壹貳參肆伍陸柒捌玖拾一二三四五六七八九十百千\d]+、)([\s\S]*)$/);
  return { prefix: match?.[1] ?? '', content: match?.[2] ?? text };
}

function fixedAgenda(meeting: Meeting, groups: Record<Section, AgendaEntry[]>): AgendaEntry[] {
  const date = new Date(meeting.meetingDate);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('zh-TW', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  const time = Number.isNaN(date.getTime())
    ? meeting.meetingDate
    : `${Number(parts.year) - 1911} 年 ${parts.month} 月 ${parts.day} 日（${parts.weekday}）${parts.hour} 時 ${parts.minute} 分`;
  const heading = (content: string): AgendaEntry => ({
    kind: 'heading',
    content,
    proposalId: null,
  });
  const sections: { title: string; items: AgendaEntry[] }[] = [
    { title: `會議時間：${time}`, items: groups.time },
    { title: `會議地點：${meeting.location || ''}`, items: groups.location },
    { title: '報告事項', items: groups.report },
  ];
  if (groups.election.length) sections.push({ title: '選舉事項', items: groups.election });
  sections.push(
    { title: '討論事項', items: groups.discussion },
    { title: '臨時動議', items: groups.temporary },
    { title: '散會', items: groups.closing },
  );
  return sections.flatMap((section, index) => [
    heading(`${sectionNumbers[index]}、${section.title}`),
    ...section.items,
  ]);
}

function emptyGroups(): Record<Section, AgendaEntry[]> {
  return {
    time: [],
    location: [],
    report: [],
    election: [],
    discussion: [],
    temporary: [],
    closing: [],
  };
}

export function createInitialAgenda(meeting: Meeting, proposals: Proposal[]): AgendaEntry[] {
  const groups = emptyGroups();
  for (const proposal of proposals) {
    groups[proposal.proposalType].push({ kind: 'proposal', content: '', proposalId: proposal.id });
  }
  return fixedAgenda(meeting, groups);
}

export function normalizeAgenda(
  meeting: Meeting,
  proposals: Proposal[],
  entries: AgendaEntry[],
): AgendaEntry[] {
  if (!entries.length) return createInitialAgenda(meeting, proposals);
  const groups = emptyGroups();
  const proposalIds = new Set(proposals.map((proposal) => proposal.id));
  let section: Section = 'time';
  for (const entry of entries) {
    if (entry.kind === 'heading') {
      const identified = agendaSection(entry.content);
      if (identified) section = identified;
      else groups[section].push({ kind: 'text', content: entry.content, proposalId: null });
    } else if (entry.kind === 'text' || proposalIds.has(entry.proposalId ?? -1)) {
      groups[section].push(entry);
    }
  }
  const includedIds = new Set(
    entries.filter((entry) => entry.kind === 'proposal').map((entry) => entry.proposalId),
  );
  for (const proposal of proposals) {
    if (!includedIds.has(proposal.id)) {
      groups[proposal.proposalType].push({
        kind: 'proposal',
        content: '',
        proposalId: proposal.id,
      });
    }
  }
  return fixedAgenda(meeting, groups);
}

export function agendaLines(entries: AgendaEntry[], proposals: Proposal[]) {
  const proposalMap = new Map(proposals.map((proposal) => [proposal.id, proposal]));
  let itemNumber = 0;
  let numbered = false;
  let headingNumber = 0;
  const visibleEntries = entries.filter((entry, index) => {
    if (entry.kind !== 'heading' || !entry.content.includes('選舉事項')) return true;
    const nextHeading = entries.findIndex(
      (later, laterIndex) => laterIndex > index && later.kind === 'heading',
    );
    const sectionItems = entries.slice(index + 1, nextHeading < 0 ? undefined : nextHeading);
    return sectionItems.some((item) =>
      item.kind === 'text'
        ? Boolean(item.content.trim())
        : item.kind === 'proposal'
          ? proposalMap.has(item.proposalId ?? -1)
          : false,
    );
  });
  return visibleEntries.flatMap((entry) => {
    if (entry.kind === 'heading') {
      itemNumber = 0;
      numbered = /事項|動議/.test(entry.content);
      const text = /^[壹貳參肆伍陸柒捌玖拾]、/.test(entry.content)
        ? entry.content.replace(
            /^[壹貳參肆伍陸柒捌玖拾]、/,
            `${sectionNumbers[headingNumber++] ?? headingNumber}、`,
          )
        : entry.content;
      return [{ entry, text }];
    }
    const content =
      entry.kind === 'proposal' ? proposalMap.get(entry.proposalId ?? -1)?.subject : entry.content;
    if (!content) return [];
    const prefix = numbered ? `${agendaNumber(itemNumber++)}、` : '';
    return [{ entry, text: `${prefix}${content}` }];
  });
}
