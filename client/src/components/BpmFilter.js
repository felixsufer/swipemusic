import React from 'react';
import './BpmFilter.css';

const BPM_RANGES = [
  { label: 'Any', min: null, max: null },
  { label: '< 120', min: null, max: 120 },
  { label: '120–128', min: 120, max: 128, desc: 'House' },
  { label: '128–135', min: 128, max: 135, desc: 'Tech House' },
  { label: '135–145', min: 135, max: 145, desc: 'Trance' },
  { label: '145–160', min: 145, max: 160, desc: 'Techno' },
  { label: '160–180', min: 160, max: 180, desc: 'DnB' },
  { label: '180+', min: 180, max: null, desc: 'Hardcore' },
];

const BpmFilter = ({ bpmMin, bpmMax, onChange }) => {
  const isActive = (range) => range.min === bpmMin && range.max === bpmMax;

  return (
    <div className="bpm-filter">
      <div className="bpm-filter-label">BPM</div>
      <div className="bpm-filter-pills">
        {BPM_RANGES.map((range) => (
          <button
            key={range.label}
            className={`bpm-pill ${isActive(range) ? 'active' : ''}`}
            onClick={() => onChange(range.min, range.max)}
          >
            {range.label}
            {range.desc && <span className="bpm-pill-desc">{range.desc}</span>}
          </button>
        ))}
      </div>
    </div>
  );
};

export default BpmFilter;
