import { useEffect, useId, useMemo, useRef, useState } from "react";
import { api } from "../api";

const MAX_SKILLS = 2;

interface Group { group: string; skills: string[] }

// Searchable combobox with autocomplete. Suggestions come from the skill list. At most two skills; picking a third replaces the oldest.
export default function SkillCombobox({ selected, onChange }: {
  selected: string[]; onChange: (v: string[]) => void;
}) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loadError, setLoadError] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    api<{ groups: Group[] }>("/skills").then((r) => setGroups(r.groups)).catch((e) => setLoadError(e.message));
  }, []);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const options = useMemo(() => {
    const needle = text.trim().toLowerCase();
    return groups.flatMap((g) =>
      g.skills.filter((s) => !selected.includes(s) && s.toLowerCase().includes(needle)).map((s) => ({ s, group: g.group })));
  }, [groups, text, selected]);

  function pick(s: string) {
    if (selected.includes(s)) return;
    onChange([...selected, s].slice(-MAX_SKILLS));
    setText("");
    setActive(0);
    setOpen(false);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, options.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (open && options[active]) pick(options[active].s); }
    else if (e.key === "Escape") setOpen(false);
    else if (e.key === "Backspace" && !text && selected.length) onChange(selected.slice(0, -1));
  }

  let lastGroup = "";
  return (
    <div ref={box}>
      <div className="row between" style={{ marginBottom: 8 }}>
        <div className="chips" style={{ margin: 0 }}>
          {selected.map((s) => (
            <span key={s} className="chip">
              {s}
              <button type="button" aria-label={`Remove ${s}`} onClick={() => onChange(selected.filter((x) => x !== s))}>×</button>
            </span>
          ))}
        </div>
      </div>
      <div className="combo">
        <input
          role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
          aria-label="Search specializations" placeholder="Search skills, e.g. Flutter, UI, Data…"
          value={text}
          onChange={(e) => { setText(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)} onKeyDown={onKey}
        />
        {open && (
          <ul id={listId} role="listbox" className="combo-list">
            {loadError && <li className="combo-empty">{loadError}</li>}
            {!loadError && options.length === 0 && <li className="combo-empty">No matching skill.</li>}
            {options.map((o, i) => {
              const header = o.group !== lastGroup ? <li key={`g-${o.group}`} className="combo-group" role="presentation">{o.group}</li> : null;
              lastGroup = o.group;
              return [
                header,
                <li key={o.s} role="option" aria-selected={i === active} className={`combo-opt ${i === active ? "active" : ""}`}
                  onMouseEnter={() => setActive(i)} onMouseDown={(e) => { e.preventDefault(); pick(o.s); }}>
                  <span>{o.s}</span><span className="accent">+</span>
                </li>,
              ];
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
