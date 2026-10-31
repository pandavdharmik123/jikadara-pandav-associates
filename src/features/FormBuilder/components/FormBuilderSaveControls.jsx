import { Button, Tooltip } from 'antd';
import { Cloud, FolderOpen } from 'lucide-react';

/**
 * Save controls shared by every form template. The database only receives the
 * typed fields; uploaded images remain in the browser's local draft.
 */
export default function FormBuilderSaveControls({
  onSave,
  saving = false,
  onOpenSavedForms,
  dirty = false,
}) {
  return (
    <div className='save-document-controls'>
      <Button icon={<Cloud size={14} />} loading={saving} onClick={onSave}>
        Save
      </Button>
      <Button icon={<FolderOpen size={14} />} onClick={onOpenSavedForms}>
        Saved forms
      </Button>
    </div>
  );
}
