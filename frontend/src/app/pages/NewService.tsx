import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { ArrowLeft, Clock, Plus, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CATEGORIES } from '../data/mockData';

export const NewService: React.FC = () => {
  const { currentUser, addService } = useApp();
  const navigate = useNavigate();

  const [type, setType] = useState<'offer' | 'request'>('offer');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [duration, setDuration] = useState(60);
  const [credits, setCredits] = useState(1);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace('#', '');
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags(prev => [...prev, t]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'El título es obligatorio';
    if (title.length > 80) e.title = 'Máximo 80 caracteres';
    if (!description.trim()) e.description = 'La descripción es obligatoria';
    if (!category) e.category = 'Selecciona una categoría';
    if (credits < 0.5 || credits > 10) e.credits = 'Entre 0.5 y 10 créditos';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 500));
    addService({
      userId: currentUser!.id,
      type,
      title: title.trim(),
      description: description.trim(),
      category,
      duration,
      credits,
      status: 'active',
      tags,
    });
    navigate('/services');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/services" className="flex items-center gap-2 text-slate-500 hover:text-teal-600 mb-6 transition-colors" style={{ fontSize: '0.875rem' }}>
        <ArrowLeft className="w-4 h-4" />
        Volver a servicios
      </Link>

      <div className="bg-white border border-slate-100 rounded-2xl p-6 md:p-8">
        <div className="mb-6">
          <h1 className="text-slate-900" style={{ fontSize: '1.4rem', fontWeight: 700 }}>Publicar servicio</h1>
          <p className="text-slate-500 mt-1" style={{ fontSize: '0.875rem' }}>
            Ofrece tus habilidades o solicita ayuda a la comunidad
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type */}
          <div>
            <label className="block text-slate-700 mb-2" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
              Tipo de publicación
            </label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { val: 'offer', label: '✋ Ofrezco ayuda', desc: 'Quiero dar algo a la comunidad' },
                { val: 'request', label: '🙋 Solicito ayuda', desc: 'Necesito que alguien me ayude' },
              ] as const).map(({ val, label, desc }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setType(val)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    type === val
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-slate-200 hover:border-teal-300'
                  }`}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }} className="text-slate-900">{label}</div>
                  <div className="text-slate-500 mt-0.5" style={{ fontSize: '0.75rem' }}>{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-slate-700 mb-2" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
              Categoría *
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => { setCategory(cat.id); setErrors(e => ({ ...e, category: '' })); }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                    category === cat.id
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-slate-200 hover:border-teal-300'
                  }`}
                >
                  <span style={{ fontSize: '1.3rem' }}>{cat.icon}</span>
                  <span className="text-slate-700" style={{ fontSize: '0.7rem' }}>{cat.label}</span>
                </button>
              ))}
            </div>
            {errors.category && <p className="text-red-500 mt-1" style={{ fontSize: '0.8rem' }}>{errors.category}</p>}
          </div>

          {/* Title */}
          <div>
            <label className="block text-slate-700 mb-1.5" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
              Título *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); setErrors(v => ({ ...v, title: '' })); }}
              placeholder={type === 'offer' ? 'Ej: Clases de cocina mediterránea' : 'Ej: Necesito ayuda con mi jardín'}
              maxLength={80}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-slate-50"
              style={{ fontSize: '0.875rem' }}
            />
            <div className="flex justify-between mt-1">
              {errors.title ? <p className="text-red-500" style={{ fontSize: '0.8rem' }}>{errors.title}</p> : <span />}
              <span className="text-slate-400" style={{ fontSize: '0.75rem' }}>{title.length}/80</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-700 mb-1.5" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
              Descripción *
            </label>
            <textarea
              value={description}
              onChange={e => { setDescription(e.target.value); setErrors(v => ({ ...v, description: '' })); }}
              placeholder="Describe con detalle lo que ofreces o necesitas. Cuanto más específico, mejor."
              rows={4}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-slate-50 resize-none"
              style={{ fontSize: '0.875rem' }}
            />
            {errors.description && <p className="text-red-500 mt-1" style={{ fontSize: '0.8rem' }}>{errors.description}</p>}
          </div>

          {/* Credits & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 mb-1.5" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                Créditos horarios *
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                <input
                  type="number"
                  value={credits}
                  onChange={e => { setCredits(Number(e.target.value)); setErrors(v => ({ ...v, credits: '' })); }}
                  min={0.5}
                  max={10}
                  step={0.5}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50"
                  style={{ fontSize: '0.875rem' }}
                />
              </div>
              {errors.credits && <p className="text-red-500 mt-1" style={{ fontSize: '0.8rem' }}>{errors.credits}</p>}
              <p className="text-slate-400 mt-1" style={{ fontSize: '0.75rem' }}>1 crédito = 1 hora</p>
            </div>
            <div>
              <label className="block text-slate-700 mb-1.5" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                Duración estimada
              </label>
              <select
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50"
                style={{ fontSize: '0.875rem' }}
              >
                <option value={30}>30 minutos</option>
                <option value={60}>1 hora</option>
                <option value={90}>1.5 horas</option>
                <option value={120}>2 horas</option>
                <option value={180}>3 horas</option>
                <option value={240}>4 horas o más</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-slate-700 mb-1.5" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
              Etiquetas (máx. 5)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Ej: cocina, mediterránea..."
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50"
                style={{ fontSize: '0.875rem' }}
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                style={{ fontSize: '0.875rem' }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-700 rounded-full" style={{ fontSize: '0.8rem' }}>
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-teal-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${CATEGORIES.find(c => c.id === category)?.color || 'bg-gray-100'}`} style={{ fontSize: '0.9rem' }}>
                {CATEGORIES.find(c => c.id === category)?.icon || '✨'}
              </div>
              <span className={`px-2 py-0.5 rounded-full ${type === 'offer' ? 'bg-teal-100 text-teal-700' : 'bg-purple-100 text-purple-700'}`} style={{ fontSize: '0.7rem', fontWeight: 600 }}>
                {type === 'offer' ? '✋ Oferta' : '🙋 Solicitud'}
              </span>
              <span className="text-amber-600 ml-auto" style={{ fontWeight: 700, fontSize: '0.9rem' }}>{credits}h</span>
            </div>
            <p className="text-slate-700" style={{ fontSize: '0.875rem', fontWeight: 500 }}>{title || 'Tu título aparecerá aquí'}</p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl transition-colors"
            style={{ fontWeight: 600 }}
          >
            {submitting ? 'Publicando...' : 'Publicar servicio'}
          </button>
        </form>
      </div>
    </div>
  );
};
