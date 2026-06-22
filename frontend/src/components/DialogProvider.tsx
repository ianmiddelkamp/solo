import { useEffect, useState } from 'react';
import { _register } from '../services/dialog';
import type { DialogOptions } from '../services/dialog';
import ConfirmDialog from './dialogs/confirm';
import ListSelectionDialog from './dialogs/ListSelection';

export default function DialogProvider() {
  const [dialog, setDialog] = useState<DialogOptions | null>(null);

  useEffect(() => {
    _register((d) => setDialog(d));
  }, []);

  if (!dialog) return null;

  switch (dialog.type) {
    case 'confirm':
    case 'alert':
      return <ConfirmDialog dialog={dialog} />;
    case 'list':
      return <ListSelectionDialog dialog={dialog} />; 
    default:
      return null;
  }
}
