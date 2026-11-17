"use client";

import React, { useState } from "react";

// RHF
import { useFormContext } from "react-hook-form";

// ShadCn
import { Card, CardContent } from "@/components/ui/card";

// Components
import { BaseButton } from "@/app/components";

// Contexts
import { useInvoiceContext } from "@/contexts/InvoiceContext";

// Helpers
import { formatNumberWithCommas } from "@/lib/helpers";

// Types
import { InvoiceType } from "@/types";

type SavedInvoicesListProps = {
    setModalState: React.Dispatch<React.SetStateAction<boolean>>;
};

const SavedInvoicesList = ({ setModalState }: SavedInvoicesListProps) => {
    const { savedInvoices, onFormSubmit, deleteInvoice, deleteInvoices } =
        useInvoiceContext();

    const { reset } = useFormContext<InvoiceType>();
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

    const toggleSelect = (idx: number) => {
        setSelectedIndices((prev) =>
            prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIndices.length === savedInvoices.length) {
            setSelectedIndices([]);
        } else {
            setSelectedIndices(savedInvoices.map((_, idx) => idx));
        }
    };

    const batchExportJson = () => {
        const selected = savedInvoices.filter((_, idx) =>
            selectedIndices.includes(idx)
        );
        if (selected.length === 0) return;
        const blob = new Blob([JSON.stringify(selected, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `invoices_batch_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const batchDelete = () => {
        deleteInvoices(selectedIndices);
        setSelectedIndices([]);
    };

    /**
     * Loads a given invoice into the form safely without mutating the original saved state.
     *
     * @param {InvoiceType} selectedInvoice - The selected invoice
     */
    const load = (selectedInvoice: InvoiceType) => {
        if (selectedInvoice) {
            // Deep clone to prevent mutating in-memory/persisted records
            const cloned = JSON.parse(
                JSON.stringify(selectedInvoice)
            ) as InvoiceType;
            if (cloned.details.dueDate) {
                cloned.details.dueDate = new Date(
                    cloned.details.dueDate
                ) as unknown as string;
            }
            if (cloned.details.invoiceDate) {
                cloned.details.invoiceDate = new Date(
                    cloned.details.invoiceDate
                ) as unknown as string;
            }

            reset(cloned);

            // Close modal
            setModalState(false);
        }
    };

    /**
     * Loads a given invoice into the form and generates a pdf by submitting the form.
     *
     * @param {InvoiceType} selectedInvoice - The selected invoice
     */
    const loadAndGeneratePdf = (selectedInvoice: InvoiceType) => {
        load(selectedInvoice);

        // Submit form
        onFormSubmit(selectedInvoice);
    };

    const allSelected =
        savedInvoices.length > 0 &&
        selectedIndices.length === savedInvoices.length;

    return (
        <div className="flex flex-col gap-4">
            {savedInvoices.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 text-sm">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="select-all-invoices"
                            checked={allSelected}
                            onChange={toggleSelectAll}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label
                            htmlFor="select-all-invoices"
                            className="cursor-pointer font-medium"
                        >
                            Select All ({selectedIndices.length}/
                            {savedInvoices.length})
                        </label>
                    </div>

                    {selectedIndices.length > 0 && (
                        <div className="flex items-center gap-2">
                            <BaseButton
                                variant="outline"
                                size="sm"
                                onClick={batchExportJson}
                                tooltipLabel="Export selected invoices as JSON backup"
                            >
                                Export Selected ({selectedIndices.length})
                            </BaseButton>
                            <BaseButton
                                variant="destructive"
                                size="sm"
                                onClick={batchDelete}
                                tooltipLabel="Delete all selected invoices"
                            >
                                Delete Selected ({selectedIndices.length})
                            </BaseButton>
                        </div>
                    )}
                </div>
            )}

            <div className="flex flex-col gap-4 overflow-y-auto max-h-72">
                {savedInvoices.map((invoice, idx) => {
                    const isChecked = selectedIndices.includes(idx);
                    return (
                        <Card
                            key={idx}
                            className={`p-2 border rounded-sm transition-colors ${
                                isChecked
                                    ? "border-primary bg-primary/5"
                                    : "hover:border-blue-500 hover:shadow-lg"
                            }`}
                        >
                            <CardContent className="flex justify-between items-center gap-2 p-2">
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleSelect(idx)}
                                        aria-label={`Select invoice #${invoice.details.invoiceNumber}`}
                                        className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <div>
                                        <p className="font-semibold">
                                            Invoice #{invoice.details.invoiceNumber}
                                        </p>
                                        <small className="text-gray-500">
                                            Updated at:{" "}
                                            {invoice.details.updatedAt || "—"}
                                        </small>

                                        <div className="text-sm mt-1 text-gray-600">
                                            <p>Sender: {invoice.sender.name}</p>
                                            <p>
                                                Receiver: {invoice.receiver.name}
                                            </p>
                                            <p>
                                                Total:{" "}
                                                <span className="font-semibold text-gray-900">
                                                    {formatNumberWithCommas(
                                                        Number(
                                                            invoice.details
                                                                .totalAmount
                                                        )
                                                    )}{" "}
                                                    {invoice.details.currency}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <BaseButton
                                        tooltipLabel="Load invoice details into the form"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => load(invoice)}
                                    >
                                        Load
                                    </BaseButton>

                                    <BaseButton
                                        tooltipLabel="Load invoice and generate PDF"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            loadAndGeneratePdf(invoice)
                                        }
                                    >
                                        Load & Generate
                                    </BaseButton>
                                    <BaseButton
                                        variant="destructive"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteInvoice(idx);
                                        }}
                                    >
                                        Delete
                                    </BaseButton>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                {savedInvoices.length === 0 && (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                        <p>No saved invoices</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SavedInvoicesList;
