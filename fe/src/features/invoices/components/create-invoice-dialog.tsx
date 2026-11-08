import { Dialog } from '@/components/ui/dialog';
import type { Invoice } from '../types';
import { CreateInvoiceForm } from './create-invoice-form';

export function CreateInvoiceDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (invoice: Invoice) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Buat tagihan UKT" className="max-w-2xl">
      <CreateInvoiceForm onCreated={onCreated} onCancel={onClose} />
    </Dialog>
  );
}
