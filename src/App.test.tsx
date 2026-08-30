// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import App from './App';

const addJob = (
  name: string,
  minutes: string,
  power: string,
  extra: { readyFrom?: string; promisedBy?: string; urgent?: boolean } = {},
) => {
  fireEvent.change(screen.getByPlaceholderText('A0 banner print'), { target: { value: name } });
  fireEvent.change(screen.getByLabelText(/Minutes/i), { target: { value: minutes } });
  fireEvent.change(screen.getByLabelText(/Power need/i), { target: { value: power } });
  if (extra.readyFrom !== undefined) {
    fireEvent.change(screen.getByLabelText(/Ready from/i), { target: { value: extra.readyFrom } });
  }
  if (extra.promisedBy !== undefined) {
    fireEvent.change(screen.getByLabelText(/Promised by/i), {
      target: { value: extra.promisedBy },
    });
  }
  if (extra.urgent) {
    fireEvent.click(screen.getByLabelText(/Rush order/i));
  }
  fireEvent.click(screen.getByRole('button', { name: /Add job/i }));
};

const addCut = (from: string, to: string) => {
  fireEvent.change(screen.getByLabelText(/Cut starts/i), { target: { value: from } });
  fireEvent.change(screen.getByLabelText(/Cut ends/i), { target: { value: to } });
  fireEvent.click(screen.getByRole('button', { name: /Add cut/i }));
};

const planRow = (name: string): HTMLElement => {
  const panel = screen.getByRole('heading', { name: 'The plan' }).closest('section');
  return within(panel as HTMLElement).getByText(name).closest('li') as HTMLElement;
};

const generatorTotal = (): string => {
  const panel = screen.getByText(/Total generator minutes/i).parentElement;
  return within(panel as HTMLElement).getByText(/^\d+$/).textContent ?? '';
};

describe('the planner in a browser', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(cleanup);

  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /Load-Shedding Window Planner/i })).toBeDefined();
    expect(screen.getByText('24-hour timeline')).toBeDefined();
  });

  it('R1 — an entered power cut appears on the timeline', () => {
    render(<App />);
    expect(screen.getByText(/No power cuts entered/i)).toBeDefined();

    fireEvent.change(screen.getByLabelText(/Cut starts/i), { target: { value: '11:00' } });
    fireEvent.change(screen.getByLabelText(/Cut ends/i), { target: { value: '13:00' } });
    fireEvent.click(screen.getByRole('button', { name: /Add cut/i }));

    expect(screen.getByTitle('Power cut 11:00 to 13:00')).toBeDefined();
  });

  it('R1 — a cut running past midnight is kept, split at midnight', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/Cut starts/i), { target: { value: '22:00' } });
    fireEvent.change(screen.getByLabelText(/Cut ends/i), { target: { value: '02:00' } });
    fireEvent.click(screen.getByRole('button', { name: /Add cut/i }));

    expect(screen.getByTitle('Power cut 00:00 to 02:00')).toBeDefined();
    expect(screen.getByTitle('Power cut 22:00 to 24:00')).toBeDefined();
  });

  it('R2 and R3 — an added grid job is scheduled clear of the cut', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/Cut starts/i), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText(/Cut ends/i), { target: { value: '11:00' } });
    fireEvent.click(screen.getByRole('button', { name: /Add cut/i }));

    addJob('Banner print', '60', 'grid');

    // Working hours start at 09:00 and the cut runs to 11:00, so the only
    // lawful slot starts at 11:00.
    expect(screen.getByText('11:00 – 12:00')).toBeDefined();
  });

  it('R4 — the generator total updates as jobs are added and removed', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/Cut starts/i), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText(/Cut ends/i), { target: { value: '21:00' } });
    fireEvent.click(screen.getByRole('button', { name: /Add cut/i }));

    expect(generatorTotal()).toBe('0');

    addJob('ID card print', '45', 'generator');
    expect(generatorTotal()).toBe('45');

    addJob('Scanning bundle', '30', 'generator');
    expect(generatorTotal()).toBe('75');

    // The job name also appears on the timeline and in the plan, so scope the
    // lookup to the Jobs panel before clicking its Remove button.
    const jobsPanel = screen.getByRole('heading', { name: 'Jobs' }).closest('section');
    const row = within(jobsPanel as HTMLElement).getByText('Scanning bundle').closest('li');
    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: 'Remove' }));
    expect(generatorTotal()).toBe('45');
  });

  it('reports a job that cannot be scheduled instead of hiding it', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/Cut starts/i), { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText(/Cut ends/i), { target: { value: '20:00' } });
    fireEvent.click(screen.getByRole('button', { name: /Add cut/i }));

    addJob('Large format poster', '300', 'grid');

    expect(screen.getByText(/Could not be scheduled/i)).toBeDefined();
  });
});


describe('a real shop day', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(cleanup);

  it('finishes a promised job before its collection time', () => {
    render(<App />);
    // A long job is queued first, then a shorter one promised for 11:00.
    addJob('Bulk photocopying', '240', 'none');
    addJob('Wedding cards', '60', 'grid', { promisedBy: '11:00' });

    expect(within(planRow('Wedding cards')).getByText(/before promised/i)).toBeDefined();
    expect(within(planRow('Wedding cards')).getByText('09:00 – 10:00')).toBeDefined();
  });

  it('puts a rush order at the front of the day', () => {
    render(<App />);
    addJob('Routine leaflets', '60', 'grid');
    addJob('Rush banner', '60', 'grid', { urgent: true });

    expect(within(planRow('Rush banner')).getByText('09:00 – 10:00')).toBeDefined();
    expect(within(planRow('Rush banner')).getByText('Rush')).toBeDefined();
  });

  it('does not start a job before its artwork arrives', () => {
    render(<App />);
    addJob('Awaiting artwork', '60', 'grid', { readyFrom: '14:00' });

    expect(within(planRow('Awaiting artwork')).getByText('14:00 – 15:00')).toBeDefined();
  });

  it('runs two jobs at once when the shop has two machines', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/Machines/i), { target: { value: '2' } });
    addJob('Job A', '120', 'grid');
    addJob('Job B', '120', 'grid');

    expect(within(planRow('Job A')).getByText('09:00 – 11:00')).toBeDefined();
    expect(within(planRow('Job B')).getByText('09:00 – 11:00')).toBeDefined();
    expect(within(planRow('Job B')).getByText('Machine 2')).toBeDefined();
  });

  it('refuses to burn more diesel than the budget allows', () => {
    render(<App />);
    addCut('09:00', '21:00');
    fireEvent.change(screen.getByLabelText(/Generator budget/i), { target: { value: '30' } });
    addJob('Long generator run', '60', 'generator');

    expect(screen.getByText(/Could not be scheduled/i)).toBeDefined();
    expect(screen.getByText(/still in budget/i)).toBeDefined();
    expect(generatorTotal()).toBe('0');
  });
});
