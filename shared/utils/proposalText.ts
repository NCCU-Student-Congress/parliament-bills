import type { ProposalCosponsor } from '../types/bill';

export const COSPONSOR_COUNT_TOKEN = '{{連署人數}}';

export function renderProposalText(text: string, cosponsors: ProposalCosponsor[]): string {
  if (!text.includes(COSPONSOR_COUNT_TOKEN)) return text;
  const count = cosponsors.filter((cosponsor) => cosponsor.status === 'confirmed').length;
  return text.replaceAll(COSPONSOR_COUNT_TOKEN, String(count));
}
