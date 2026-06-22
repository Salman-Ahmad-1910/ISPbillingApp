'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/context/company-context';
import { z } from 'zod';

import type { RecoveryTransaction } from '@/lib/types';
import { recoveryTransactionSchema } from '@/lib/schemas';

import { DataTable } from './data-table';
import { getColumns } from './columns';
import { RecoveryTransactionForm } from './recovery-transaction-form';
import { DeleteAlertDialog } from '@/components/shared/delete-alert-dialog';

import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

type TransactionFormValues = z.infer<typeof recoveryTransactionSchema>;

interface ClientPageProps {
    data: RecoveryTransaction[];
    officerId: string;
}

export function ClientPage({ data, officerId }: ClientPageProps) {
    const { companyId } = useCompany();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [transactions, setTransactions] = useState<RecoveryTransaction[]>(data);
    const [filter, setFilter] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<RecoveryTransaction | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setTransactions(data);
    }, [data]);

    const filteredData = useMemo(() => transactions.filter(transaction =>
        transaction.description.toLowerCase().includes(filter.toLowerCase())
    ), [transactions, filter]);

    const handleSave = async (formData: TransactionFormValues) => {
        setIsSaving(true);
        try {
            if (selectedTransaction) {
                await api.put(`/recovery/transactions/${selectedTransaction.id}?companyId=${companyId}`, formData);
                toast({ title: "Success", description: "Transaction updated successfully." });
            } else {
                await api.post(`/recovery/transactions?companyId=${companyId}`, { ...formData, companyId, officerId });
                toast({ title: "Success", description: "Transaction added successfully." });
            }
            queryClient.invalidateQueries({ queryKey: ['recovery/transactions', companyId] });
            setIsFormOpen(false);
            setSelectedTransaction(null);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Error",
                description: error.response?.data?.message || "Failed to save transaction"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (transaction: RecoveryTransaction) => {
        setSelectedTransaction(transaction);
        setIsFormOpen(true);
    };

    const handleDelete = async () => {
        if (selectedTransaction) {
            try {
                await api.delete(`/recovery/transactions/${selectedTransaction.id}?companyId=${companyId}`);
                toast({ title: "Success", description: "Transaction deleted successfully." });
                queryClient.invalidateQueries({ queryKey: ['recovery/transactions', companyId] });
                setIsDeleteDialogOpen(false);
                setSelectedTransaction(null);
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: "Error",
                    description: error.response?.data?.message || "Failed to delete transaction"
                });
            }
        }
    };

    const openDeleteDialog = (transaction: RecoveryTransaction) => {
        setSelectedTransaction(transaction);
        setIsDeleteDialogOpen(true);
    };

    const columns = getColumns({
        onEdit: handleEdit,
        onDelete: openDeleteDialog,
    });

    return (
        <>
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <Input
                        placeholder="Filter by description..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="max-w-sm"
                    />
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => setSelectedTransaction(null)}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Transaction
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{selectedTransaction ? 'Edit' : 'Add'} Transaction</DialogTitle>
                            </DialogHeader>
                            <RecoveryTransactionForm
                                transaction={selectedTransaction}
                                onSave={handleSave}
                                onCancel={() => setIsFormOpen(false)}
                                isSaving={isSaving}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
                <DataTable columns={columns} data={filteredData} />
            </div>

            <DeleteAlertDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onDelete={handleDelete}
                itemName={`Transaction: ${selectedTransaction?.description}`}
            />
        </>
    )
}
