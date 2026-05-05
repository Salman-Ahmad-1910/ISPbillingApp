'use client';

import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useCompany } from '@/context/company-context';
import type { Staff } from '@/lib/types';
import type { Area } from '@/lib/types';
import { staffSchema } from '@/lib/schemas';
import { Loader2, Eye, EyeOff } from 'lucide-react';

type StaffFormValues = z.infer<typeof staffSchema>;

interface StaffFormProps {
    staff: Staff | null;
    onSave: (data: StaffFormValues) => void;
    onCancel: () => void;
    isSaving?: boolean;
}

export function StaffForm({ staff, onSave, onCancel, isSaving }: StaffFormProps) {
    console.log('StaffForm received staff:', staff);
    const [showPassword, setShowPassword] = useState(false);

    const { companyId } = useCompany();
    const { data: areas = [], isLoading: isLoadingAreas } = useGenericQuery<Area[]>('network/areas', companyId ?? undefined);

    const form = useForm<StaffFormValues>({
        resolver: zodResolver(staffSchema),
        defaultValues: staff || {
            name: '',
            email: '',
            password: '',
            phone: '',
            secondaryPhone: '',
            designation: '',
            department: 'technical',
            salary: 0,
            areaId: 'unassigned',
        },
    });

    // Reset form when staff prop changes
    useEffect(() => {
        if (staff) {
            console.log('Resetting form with staff data:', staff);
            // Only include fields that are in the schema
            const filteredStaff = {
                id: staff.id,
                name: staff.name,
                email: staff.email || '',
                password: '', // Don't populate password for edit
                phone: staff.phone,
                secondaryPhone: staff.secondaryPhone || '',
                designation: staff.designation,
                department: staff.department,
                salary: staff.salary,
                areaId: staff.areaId || 'unassigned',
                companyId: staff.companyId
            };
            console.log('Filtered staff data:', filteredStaff);
            form.reset(filteredStaff);
        }
    }, [staff, form]);

    function onSubmit(values: StaffFormValues) {
        console.log('Staff form submitted with values:', values);
        // Transform 'unassigned' back to null for areaId
        // For edit mode, if password is empty, remove it from payload
        const transformedValues = {
            ...values,
            areaId: values.areaId === 'unassigned' ? null : values.areaId,
            ...(staff && !values.password && { password: undefined }) // Remove password if empty in edit mode
        };
        console.log('Transformed values:', transformedValues);
        onSave(transformedValues);
    }

    const isEditMode = !!staff;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {staff && (
                    <div className="p-3 bg-muted rounded-md">
                        <div className="text-sm font-medium">Staff ID</div>
                        <div className="text-xs font-mono text-muted-foreground mt-1">{staff.id}</div>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., John Doe" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Primary Phone</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., 0300-1234567" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="secondaryPhone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Secondary Phone</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., 0300-7654321" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input
                                        type="email"
                                        placeholder="e.g., john@example.com"
                                        {...field}
                                        disabled={isEditMode} // Disable email in edit mode
                                        className={isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}
                                    />
                                </FormControl>
                                <FormMessage />
                                {isEditMode && (
                                    <p className="text-xs text-gray-500">Email cannot be changed in edit mode</p>
                                )}
                            </FormItem>
                        )}
                    />

                    {!isEditMode && (
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="Enter password"
                                                {...field}
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
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                </div>

                <FormField
                    control={form.control}
                    name="designation"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Designation</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Network Engineer" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Department</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a department" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="technical">Technical</SelectItem>
                                        <SelectItem value="recovery">Recovery</SelectItem>
                                        <SelectItem value="sales">Sales</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="areaId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Area</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select an area" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                        {areas.map((area) => (
                                            <SelectItem key={area.id} value={area.id}>
                                                {area.city} - {area.zone}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="salary"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Salary (PKR)</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        {...field}
                                        onChange={(e) => {
                                            const value = parseFloat(e.target.value) || 0;
                                            field.onChange(value);
                                        }}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSaving || !form.formState.isValid}
                    >
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSaving ? 'Saving...' : (isEditMode ? 'Update Staff' : 'Create Staff')}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
