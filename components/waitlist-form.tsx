import { ArrowRight } from 'lucide-react';

type WaitlistFormProps = {
  source: 'header' | 'footer';
  inverted?: boolean;
};

const subject = 'Redwood private beta request';
const body = [
  'Hello Redwood team,',
  '',
  'I would like to request access to the Redwood private beta.',
  '',
  'Name:',
  'Company (optional):',
  '',
  'What I am looking for:',
  '',
  'Best,',
].join('\n');

const emailHref = `mailto:request@cortexhubs.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

export function WaitlistForm({ inverted = false }: WaitlistFormProps) {
  return (
    <a
      className={inverted ? 'button beta-trigger beta-trigger-inverted' : 'button button-outline'}
      href={emailHref}
      aria-label="Email Redwood to request private beta access"
    >
      Join private beta <ArrowRight size={16} />
    </a>
  );
}
