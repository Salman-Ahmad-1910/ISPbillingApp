'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { recoveryOfficerSchema } from '@/lib/schemas';
import type { RecoveryOfficer } from '@/lib/types';
import { useCompany } from '@/context/company-context';
import api from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import type { Area } from '@/lib/types';
import { Eye, EyeOff } from 'lucide-react';

type RecoveryOfficerFormValues = z.infer<typeof recoveryOfficerSchema>;

interface RecoveryOfficerFormProps {
    recoveryOfficer?: RecoveryOfficer | null;
    onSave: (data: RecoveryOfficerFormValues) => void;
    onCancel: () => void;
    isSaving?: boolean;
}

export function RecoveryOfficerForm({ recoveryOfficer, onSave, onCancel, isSaving = false }: RecoveryOfficerFormProps) {
    const { companyId } = useCompany();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState<RecoveryOfficerFormValues>({
        name: '',
        email: '',
        password: '',
        phone: '',
        secondaryPhone: '',
        areaId: null,
        role: 'recovery_officer',
        companyId: companyId || '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [areas, setAreas] = useState<Area[]>([]);

    // Fetch areas for dropdown
    useEffect(() => {
        if (companyId) {
            api.get(`/network/areas?companyId=${companyId}`)
                .then(response => {
                    setAreas(response.data.data || []);
                })
                .catch(error => {
                    console.error('Failed to fetch areas:', error);
                });
        }
    }, [companyId]);

    useEffect(() => {
        if (recoveryOfficer) {
            setFormData({
                id: recoveryOfficer.id,
                name: recoveryOfficer.name,
                email: recoveryOfficer.email,
                password: '', // Don't populate password for edit
                phone: recoveryOfficer.phone,
                secondaryPhone: recoveryOfficer.secondaryPhone || '',
                areaId: recoveryOfficer.areaId || null,
                role: 'recovery_officer',
                companyId: companyId || '',
            });
        }
    }, [recoveryOfficer, companyId]);

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const validateForm = () => {
        try {
            // For edit mode, don't validate password if it's empty
            const dataToValidate = recoveryOfficer && !formData.password
                ? { ...formData, password: 'placeholder' } // Skip password validation
                : formData;

            recoveryOfficerSchema.parse(dataToValidate);
            setErrors({});
            return true;
        } catch (err: any) {
            const newErrors: Record<string, string> = {};
            err.errors?.forEach((error: any) => {
                newErrors[error.path[0]] = error.message;
            });
            setErrors(newErrors);
            return false;
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        // For edit mode, if password is empty, remove it from payload
        const payload = recoveryOfficer && !formData.password
            ? { ...formData, password: undefined }
            : formData;

        onSave(payload);
    };

    const isEditMode = !!recoveryOfficer;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter recovery officer name"
                        className={errors.name ? 'border-red-500' : ''}
                    />
                    {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="Enter email address"
                        className={errors.email ? 'border-red-500' : ''}
                    />
                    {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="phone">Primary Phone *</Label>
                    <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="Enter primary phone number"
                        className={errors.phone ? 'border-red-500' : ''}
                    />
                    {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="secondaryPhone">Secondary Phone</Label>
                    <Input
                        id="secondaryPhone"
                        value={formData.secondaryPhone}
                        onChange={(e) => handleInputChange('secondaryPhone', e.target.value)}
                        placeholder="Enter secondary phone number"
                        className={errors.secondaryPhone ? 'border-red-500' : ''}
                    />
                    {errors.secondaryPhone && <p className="text-sm text-red-500">{errors.secondaryPhone}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password">Password {!isEditMode ? '*' : ''}</Label>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password}
                            onChange={(e) => handleInputChange('password', e.target.value)}
                            placeholder={isEditMode ? 'Leave blank to keep current' : 'Enter password'}
                            className={errors.password ? 'border-red-500' : ''}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-500" />
                            ) : (
                                <Eye className="h-4 w-4 text-gray-500" />
                            )}
                        </Button>
                    </div>
                    {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="areaId">Area</Label>
                    <Select
                        value={formData.areaId || ''}
                        onValueChange={(value) => handleInputChange('areaId', value === 'unassigned' ? null : value)}
                    >
                        <SelectTrigger className={errors.areaId ? 'border-red-500' : ''}>
                            <SelectValue placeholder="Select area" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {areas.map((area) => (
                                <SelectItem key={area.id} value={area.id}>
                                    {area.locality} - {area.city}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.areaId && <p className="text-sm text-red-500">{errors.areaId}</p>}
                </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSaving}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={isSaving}
                    className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700"
                >
                    {isSaving ? 'Saving...' : (isEditMode ? 'Update' : 'Create')}
                </Button>
            </div>
        </form>
    );
}
