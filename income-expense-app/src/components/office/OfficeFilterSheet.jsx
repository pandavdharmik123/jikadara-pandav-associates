import { Button, Drawer } from 'antd';
import { RotateCcw } from 'lucide-react';

/**
 * Bottom-sheet filter panel. Replaces the stack of full-width selects that
 * used to push the actual list below the fold on phones.
 */
export default function OfficeFilterSheet({
  open,
  onClose,
  onReset,
  onApply,
  title = 'Filters',
  children,
  applyLabel = 'Show results',
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="bottom"
      height="auto"
      title={title}
      className="office-filter-sheet"
      rootClassName="office-filter-sheet-root"
      styles={{
        body: { padding: '4px 16px calc(16px + env(safe-area-inset-bottom))' },
        header: { borderBottom: '1px solid var(--line)' },
      }}
    >
      <div className="office-sheet-fields">{children}</div>
      <div className="office-sheet-actions">
        {onReset ? (
          <Button icon={<RotateCcw size={15} />} onClick={onReset}>
            Reset
          </Button>
        ) : null}
        <Button type="primary" onClick={onApply || onClose}>
          {applyLabel}
        </Button>
      </div>
    </Drawer>
  );
}
