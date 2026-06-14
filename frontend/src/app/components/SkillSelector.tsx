import React, { useState, useEffect } from 'react';
import useSkills from '../hooks/useSkills';

type SkillOption = { id: number; name: string };

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  allowCreate?: boolean;
}

const SkillSelector: React.FC<Props> = ({ selectedIds, onChange, allowCreate = true }) => {
  const { skills, loading, createSkill } = useSkills();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);

  const visible = skills.filter(s => s.name.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    // noop: hook already loads skills
  }, []);

  const toggle = (id: number) => {
    const sid = String(id);
    if (selectedIds.includes(sid)) onChange(selectedIds.filter(x => x !== sid));
    else onChange([sid, ...selectedIds]);
  };

  const handleCreate = async () => {
    if (!query.trim()) return;
    setCreating(true);
    try {
      const created = await createSkill({ name: query.trim(), description: '' });
      if (created) onChange([String(created.id), ...selectedIds]);
      setQuery('');
    } catch (e) {
      console.error('create skill failed', e);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <label className="block text-slate-700 mb-1.5" style={{ fontWeight: 600, fontSize: '0.875rem' }}>Habilidades</label>
      <div className="mb-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar o crear habilidad"
          className="w-full px-3 py-2 border rounded-lg bg-slate-50"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {loading && <div className="text-slate-400">Cargando...</div>}
        {visible.map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => toggle(s.id)}
            className={`px-3 py-1 rounded-full border ${selectedIds.includes(String(s.id)) ? 'bg-teal-500 text-white' : 'bg-white text-slate-700'}`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {allowCreate && (
        <div className="mt-3">
          <button type="button" onClick={handleCreate} disabled={creating || !query.trim()} className="px-3 py-1 rounded-lg bg-teal-600 text-white">
            {creating ? 'Creando...' : `Crear "${query.trim()}"`}
          </button>
        </div>
      )}
    </div>
  );
};

export default SkillSelector;
