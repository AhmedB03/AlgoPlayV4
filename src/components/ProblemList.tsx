import { useState } from 'react';
import { CircleCheckBig, CirclePlay, Search, Shuffle } from 'lucide-react';
import { problems } from '../problems';

type Props = {
  solved: string[];
  attempted: string[];
  onSelect: (id: string) => void;
};

const topics = [...new Set(problems.map(p => p.category))];

export function difficultyClass(difficulty: string) {
  return `diff-${difficulty.toLowerCase()}`;
}

function ProgressRing({ solved, total }: { solved: number; total: number }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <svg className="ring" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r={r} className="ring-track" />
      <circle cx="60" cy="60" r={r} className="ring-fill" strokeDasharray={c} strokeDashoffset={c * (1 - solved / total)} />
    </svg>
  );
}

export function ProblemList({ solved, attempted, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<string | null>(null);
  const [status, setStatus] = useState<'all' | 'solved' | 'todo'>('all');

  const filtered = problems.filter(p =>
    (p.title + ' ' + p.category).toLowerCase().includes(query.trim().toLowerCase()) &&
    (!topic || p.category === topic) &&
    (status === 'all' || (status === 'solved') === solved.includes(p.id)));

  function pickRandom() {
    const pool = problems.filter(p => !solved.includes(p.id));
    const list = pool.length ? pool : problems;
    onSelect(list[Math.floor(Math.random() * list.length)].id);
  }

  return (
    <main className="library">
      <div className="library-main">
        <section className="study-banner">
          <div>
            <span className="eyebrow">Study plan</span>
            <h1>Foundation Collection</h1>
            <p>Six essential patterns. Write the code, run it, then watch the algorithm move step by step.</p>
          </div>
          <button className="btn btn-primary" onClick={() => onSelect(problems.find(p => !solved.includes(p.id))?.id ?? problems[0].id)}>
            <CirclePlay size={16} />{solved.length ? 'Continue' : 'Start'}
          </button>
        </section>

        <div className="topic-row" role="group" aria-label="Filter by topic">
          <button className={`topic-chip ${topic === null ? 'active' : ''}`} onClick={() => setTopic(null)}>
            All topics <span>{problems.length}</span>
          </button>
          {topics.map(t => (
            <button key={t} className={`topic-chip ${topic === t ? 'active' : ''}`} onClick={() => setTopic(topic === t ? null : t)}>
              {t} <span>{problems.filter(p => p.category === t).length}</span>
            </button>
          ))}
        </div>

        <div className="library-toolbar">
          <label className="search">
            <Search size={15} />
            <input aria-label="Search problems" placeholder="Search questions" value={query} onChange={e => setQuery(e.target.value)} />
          </label>
          <select aria-label="Filter by status" value={status} onChange={e => setStatus(e.target.value as typeof status)}>
            <option value="all">Status: All</option>
            <option value="todo">Todo</option>
            <option value="solved">Solved</option>
          </select>
          <button className="btn shuffle" onClick={pickRandom} title="Pick a random unsolved problem">
            <Shuffle size={15} />Pick one
          </button>
        </div>

        <div className="problem-table">
          <div className="table-head" aria-hidden="true">
            <span>Status</span>
            <span>Title</span>
            <span>Topic</span>
            <span>Difficulty</span>
          </div>
          {filtered.map(p => (
            <button className="table-row" key={p.id} onClick={() => onSelect(p.id)}>
              <span className="status-cell">
                {solved.includes(p.id)
                  ? <CircleCheckBig size={16} className="text-success" aria-label="Solved" />
                  : attempted.includes(p.id) ? <span className="attempted" aria-label="Attempted" /> : null}
              </span>
              <span className="title-cell">
                {p.number}. {p.title}
                <small>{p.summary}</small>
              </span>
              <span className="topic-text">{p.category}</span>
              <span className={difficultyClass(p.difficulty)}>{p.difficulty}</span>
            </button>
          ))}
          {filtered.length === 0 && <p className="empty">No problems match. Try a different search or topic.</p>}
        </div>
      </div>

      <aside className="library-side">
        <div className="card progress-card">
          <div className="card-title">Progress</div>
          <div className="ring-wrap">
            <ProgressRing solved={solved.length} total={problems.length} />
            <div className="ring-label">
              <b>{solved.length}<span>/{problems.length}</span></b>
              <small>Solved</small>
            </div>
          </div>
          <div className="diff-breakdown">
            {['Easy', 'Medium', 'Hard'].map(d => {
              const total = problems.filter(p => p.difficulty === d).length;
              const done = problems.filter(p => p.difficulty === d && solved.includes(p.id)).length;
              return (
                <div key={d} className="diff-stat">
                  <span className={difficultyClass(d)}>{d}</span>
                  <b>{done}/{total}</b>
                </div>
              );
            })}
          </div>
          <small className="fine">Progress is saved in this browser.</small>
        </div>
        <div className="card tip-card">
          <div className="card-title">Every problem is animated</div>
          <p>Open the <b>Visualizer</b> tab to scrub through the reference solution, or edit the input to see how it behaves on your own data.</p>
        </div>
      </aside>
    </main>
  );
}
