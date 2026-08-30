// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import App from './App';

const addJob = (name: string, minutes: string, power: string) => {
  fireEvent.change(screen.getByPlaceholderText('A0 banner print'), { target: { value: name } });
  fireEvent.change(screen.getByLabelText(/Minutes/i), { target: { value: minutes } });
  fireEvent.change(screen.getByLabelText(/Power need/i), { target: { value: power } });
  fireEvent.click(screen.getByRole('button', { name: /Add job/i }));
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
