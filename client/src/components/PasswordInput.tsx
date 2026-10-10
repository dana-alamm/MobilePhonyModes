import { useState } from "react";

export default function PasswordInput(props: {
  id: string; value: string; onChange: (v: string) => void; autoComplete: string; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw">
      <input
        id={props.id} type={show ? "text" : "password"} value={props.value} required
        autoComplete={props.autoComplete} placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
      />
      <button type="button" className="eye" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow((s) => !s)}>
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
