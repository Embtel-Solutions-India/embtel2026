'use client';

// A list of small sub-forms (FAQs, sources, takeaways) with add / remove / move buttons.
export function RepeatableField<T>({
  legend,
  items,
  onChange,
  empty,
  addLabel,
  max,
  render,
}: {
  legend: string;
  items: T[];
  onChange: (items: T[]) => void;
  empty: () => T;
  addLabel: string;
  max: number;
  render: (item: T, set: (item: T) => void, index: number) => React.ReactNode;
}) {
  const set = (i: number, v: T) => onChange(items.map((x, j) => (j === i ? v : x)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <fieldset className="adm-stack" style={{ border: 0, padding: 0, margin: 0, gap: 10 }}>
      <legend className="adm-field" style={{ marginBottom: 8 }}>
        <span>{legend}</span>
      </legend>
      {items.map((item, i) => (
        <div key={i} className="adm-card adm-stack" style={{ padding: 12, gap: 8 }}>
          {render(item, (v) => set(i, v), i)}
          <div className="adm-row" style={{ gap: 6 }}>
            <button type="button" className="adm-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move item ${i + 1} up`}>
              ↑
            </button>
            <button type="button" className="adm-btn" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={`Move item ${i + 1} down`}>
              ↓
            </button>
            <button type="button" className="adm-btn adm-btn-danger" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Remove item ${i + 1}`}>
              Remove
            </button>
          </div>
        </div>
      ))}
      {items.length < max && (
        <div>
          <button type="button" className="adm-btn" onClick={() => onChange([...items, empty()])}>
            {addLabel}
          </button>
        </div>
      )}
    </fieldset>
  );
}
