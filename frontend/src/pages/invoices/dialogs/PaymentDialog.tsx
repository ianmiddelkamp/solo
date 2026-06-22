import { DateTime } from "luxon";
import { useState } from "react";
import { PaymentEntry } from "src/types";

interface FormState {
    paymentDate: string | null,
    amount_paid: number
}
const EMPTY_PAYMENT: FormState = { paymentDate: null, amount_paid: 0 }



export default function PaymentDialog({ payment, onSubmit, onCancel }: { payment: PaymentEntry, onSubmit: (payment: PaymentEntry) => void, onCancel: () => void }) {

    const title = `Enter payment for invoice ${payment.invoice.number}`
    const [form, setForm] = useState<FormState>({ ...EMPTY_PAYMENT, paymentDate: payment.paid_at ?? DateTime.local().toISODate(), amount_paid: payment.amount_paid ?? 0 })

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        let value:number|string = e.target.value;
        if(e.target.name === 'amount_paid'){
            value = Number(e.target.value)
        }
        setForm(prev => ({ ...prev, [e.target.name]: value }));
    }

    function submit(e: React.SubmitEvent) {
        e.preventDefault();
        onSubmit({ ...payment, amount_paid: Number(form.amount_paid), paid_at: form.paymentDate });
    }



    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/40"
            />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-2">{title}</h2>
                <form onSubmit={submit}>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid *</label>
                        <input
                            type="number"
                            name="amount_paid"
                            value={form.amount_paid}
                            onChange={handleChange}
                            placeholder="0"
                            min="0"
                            step="0.01"
                            className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date </label>
                        <input
                            type="date"
                            name="paymentDate"
                            value={form.paymentDate ?? ''}
                            onChange={handleChange}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
                        />
                    </div>

                    <div className="mt-5 flex justify-end gap-3">

                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>

                        <button
                            type='submit'
                            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors bg-indigo-600 hover:bg-indigo-700`}
                        >
                            Go
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
}
