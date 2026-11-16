import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

/**
 * Grouped checkbox list of catalogue permissions. A render helper rather than
 * a prop-taking component, following the codebase's no-propTypes style (see
 * components/common/BrandLogo.jsx).
 */
export function renderPermissionChecklist(categories, selected, onChange, idPrefix) {
  const toggle = (key, on) => onChange(on ? [...new Set([...selected, key])] : selected.filter((k) => k !== key));
  return (
    <div className="space-y-4 max-h-72 overflow-y-auto pr-1 border rounded-lg p-3">
      {categories.map((cat) => (
        <fieldset key={cat.name}>
          <legend className="text-sm font-semibold text-foreground mb-2">{cat.name}</legend>
          <div className="grid sm:grid-cols-2 gap-2">
            {cat.permissions.map((p) => {
              const id = `${idPrefix}-${p.key}`;
              return (
                <div key={p.key} className="flex items-start gap-2">
                  <Checkbox id={id} checked={selected.includes(p.key)} onCheckedChange={(v) => toggle(p.key, v === true)} />
                  <Label htmlFor={id} className="text-sm font-normal leading-tight cursor-pointer">{p.label}</Label>
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
