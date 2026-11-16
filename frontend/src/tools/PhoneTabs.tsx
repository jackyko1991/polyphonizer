/**
 * Tabs inside a tool, on phones only (wider screens show all of the tool at once): the Metronome's Beat | Settings,
 * the Tuner's Listen | Reference tone.
 */
export default function PhoneTabs<T extends string>({
  tabs,
  value,
  onChange,
  testid,
}: {
  tabs: [T, string][];
  value: T;
  onChange: (v: T) => void;
  testid?: string;
}) {
  return (
    <div className="flex w-full shrink-0 rounded-lg bg-gray-100 p-0.5 sm:hidden" role="tablist" data-testid={testid}>
      {tabs.map(([v, label]) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={value === v}
          onClick={() => onChange(v)}
          className={`flex-1 rounded-md py-0.5 text-sm font-medium ${value === v ? "bg-white text-(--lk-accent) shadow-sm" : "text-gray-600"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
