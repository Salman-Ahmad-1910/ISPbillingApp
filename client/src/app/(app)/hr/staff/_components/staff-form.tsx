'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { useCompany } from '@/context/company-context';
import type { Staff, StaffQualification, StaffExperience, StaffWorkTime, StaffDepartment, TransactionType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
  import api from '@/lib/api';
  import { smartMatch } from '@/lib/search';
import { useQueryClient } from '@tanstack/react-query';
import {
    Loader2,
    Trash2,
    Plus,
    Upload,
    Eye,
    EyeOff,
    Search,
    Building2,
} from 'lucide-react';

interface StaffFormProps {
    staff: Staff | null;
    onSave: (data: any) => void;
    onCancel: () => void;
    isSaving?: boolean;
}

const TABS = ['Personal Information', 'Qualification', 'Experience', 'Accounts', 'Other', 'Attachments'];

const GENDERS = ['Male', 'Female', 'Other'];
const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'];
const QUALIFICATIONS = ['Matriculation', 'Intermediate', 'Bachelor', 'Master', 'Other'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function UploadSlot({
    label,
    value,
    isImage,
    fileName,
    onChange,
}: {
    label: string;
    value: string;
    isImage?: boolean;
    fileName?: string;
    onChange: (dataUrl: string, name: string) => void;
}) {
    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => onChange(reader.result as string, file.name);
        reader.readAsDataURL(file);
    };

    return (
        <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-4 text-center cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-50/30 transition-all min-h-[160px]">
            <input type="file" accept={isImage ? 'image/*' : undefined} onChange={handleFile} className="hidden" />
            {value ? (
                isImage ? (
                    <img src={value} alt={label} className="max-h-32 max-w-full object-contain rounded-lg" />
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8 text-emerald-600" />
                        <span className="text-sm font-medium text-emerald-700 break-all">{fileName || 'File uploaded'}</span>
                    </div>
                )
            ) : (
                <>
                    <div className="rounded-lg bg-muted p-3">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">{label}</span>
                </>
            )}
        </label>
    );
}

export function StaffForm({ staff, onSave, onCancel, isSaving }: StaffFormProps) {
    const { companyId } = useCompany();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: departmentsResponse = [] } = useGenericQuery<StaffDepartment>('hr/departments', companyId ?? undefined);
    const { data: transactionTypesResponse = [] } = useGenericQuery<TransactionType>('billing/transaction-types', companyId ?? undefined);

    const departments = Array.isArray(departmentsResponse) ? departmentsResponse : [];
    const transactionTypes = Array.isArray(transactionTypesResponse) ? transactionTypesResponse : [];

    const [tab, setTab] = useState(0);
    const isEditMode = !!staff;

    // --- Personal Information ---
    const [name, setName] = useState('');
    const [gender, setGender] = useState('');
    const [maritalStatus, setMaritalStatus] = useState('');
    const [fatherName, setFatherName] = useState('');
    const [email, setEmail] = useState('');
    const [nic, setNic] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');

    // --- Qualification ---
    const [qualifications, setQualifications] = useState<StaffQualification[]>([]);
    const [qualification, setQualification] = useState('');
    const [institute, setInstitute] = useState('');
    const [qualStartDate, setQualStartDate] = useState('');
    const [qualEndDate, setQualEndDate] = useState('');
    const [obtainedMarks, setObtainedMarks] = useState('');
    const [grade, setGrade] = useState('');
    const [majorSubject, setMajorSubject] = useState('');

    // --- Experience ---
    const [experiences, setExperiences] = useState<StaffExperience[]>([]);
    const [organization, setOrganization] = useState('');
    const [expDesignation, setExpDesignation] = useState('');
    const [expStartDate, setExpStartDate] = useState('');
    const [expEndDate, setExpEndDate] = useState('');
    const [expDescription, setExpDescription] = useState('');

    // --- Accounts ---
    const [basicPay, setBasicPay] = useState('');
    const [leaveAllow, setLeaveAllow] = useState('');
    const [paymentMode, setPaymentMode] = useState('cash');
    const [bankName, setBankName] = useState('');
    const [bankSearch, setBankSearch] = useState('');
    const [bankOpen, setBankOpen] = useState(false);
    const [accountTitle, setAccountTitle] = useState('');
    const [accountNo, setAccountNo] = useState('');

    // --- Other ---
    const [appointedDate, setAppointedDate] = useState('');
    const [technical, setTechnical] = useState('no');
    const [generatePassword, setGeneratePassword] = useState('yes');
    const [manualPassword, setManualPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [generatedPassword, setGeneratedPassword] = useState('');
    const [department, setDepartment] = useState('technical');
    const [designation, setDesignation] = useState('');
    const [status, setStatus] = useState('working');
    const [leaveDate, setLeaveDate] = useState('');
    const [workTimes, setWorkTimes] = useState<StaffWorkTime[]>([]);
    const [day, setDay] = useState(DAYS[0]);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    // --- Department add popup ---
    const [deptDialogOpen, setDeptDialogOpen] = useState(false);
    const [newDept, setNewDept] = useState('');
    const [isAddingDept, setIsAddingDept] = useState(false);
    const [deptList, setDeptList] = useState<StaffDepartment[]>([]);

    // --- Attachments ---
    const [cnicFront, setCnicFront] = useState('');
    const [cnicBack, setCnicBack] = useState('');
    const [employeeImage, setEmployeeImage] = useState('');
    const [cv, setCv] = useState('');
    const [cvName, setCvName] = useState('');

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        setDeptList(departments);
    }, [departments]);

    // Reset form whenever staff prop changes
    useEffect(() => {
        if (!staff) {
            setName(''); setGender(''); setMaritalStatus(''); setFatherName(''); setEmail('');
            setNic(''); setPhone(''); setAddress('');
            setQualifications([]); setQualification(''); setInstitute(''); setQualStartDate(''); setQualEndDate('');
            setObtainedMarks(''); setGrade(''); setMajorSubject('');
            setExperiences([]); setOrganization(''); setExpDesignation(''); setExpStartDate(''); setExpEndDate(''); setExpDescription('');
            setBasicPay(''); setLeaveAllow(''); setPaymentMode('cash'); setBankName(''); setBankSearch(''); setBankOpen(false);
            setAccountTitle(''); setAccountNo('');
            setAppointedDate(''); setTechnical('no'); setGeneratePassword('yes'); setManualPassword('');
            setGeneratedPassword(''); setDepartment('technical'); setDesignation('');
            setStatus('working'); setLeaveDate('');
            setWorkTimes([]); setDay(DAYS[0]); setStartTime(''); setEndTime('');
            setCnicFront(''); setCnicBack(''); setEmployeeImage(''); setCv(''); setCvName('');
            setErrors({});
            return;
        }

        setName(staff.name || '');
        setGender(staff.gender || '');
        setMaritalStatus(staff.maritalStatus || '');
        setFatherName(staff.fatherName || '');
        setEmail(staff.email || '');
        setNic(staff.nic || '');
        setPhone(staff.phone || '');
        setAddress(staff.address || '');
        setQualifications(staff.qualifications || []);
        setExperiences(staff.experiences || []);
        setBasicPay(staff.basicPay != null ? String(staff.basicPay) : '');
        setLeaveAllow(staff.leaveAllow != null ? String(staff.leaveAllow) : '');
        setPaymentMode(staff.paymentMode || 'cash');
        setBankName(staff.bankName || '');
        setBankSearch('');
        setAccountTitle(staff.accountTitle || '');
        setAccountNo(staff.accountNo || '');
        setAppointedDate(staff.appointedDate || '');
        setTechnical(staff.technical || 'no');
        setGeneratePassword('yes');
        setManualPassword('');
        setGeneratedPassword(staff.plainPassword || '');
        setDepartment(staff.department || 'technical');
        setDesignation(staff.designation || '');
        setStatus(staff.status || 'working');
        setLeaveDate(staff.leaveDate || '');
        setWorkTimes(staff.workTimes || []);
        setCnicFront(staff.cnicFront || '');
        setCnicBack(staff.cnicBack || '');
        setEmployeeImage(staff.employeeImage || '');
        setCv(staff.cv || '');
        setErrors({});
    }, [staff]);

    const filteredBanks = useMemo(() => {
        return transactionTypes.filter(t =>
            smartMatch(bankSearch, [], [t.transaction, t.title])
        );
    }, [transactionTypes, bankSearch]);

    // --- Validation ---
    const validatePersonal = () => {
        const e: Record<string, string> = {};
        if (!name.trim()) e.name = 'Name is required';
        if (!phone.trim()) e.phone = 'Phone is required';
        if (!email.trim()) e.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email address';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const validateAccounts = () => {
        const e: Record<string, string> = {};
        if (!basicPay || Number(basicPay) < 0) e.basicPay = 'Basic pay is required';
        if (paymentMode === 'bank' && !bankName.trim()) e.bankName = 'Select a bank';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const validateOther = () => {
        const e: Record<string, string> = {};
        if (!designation.trim()) e.designation = 'Designation is required';
        if (status === 'left' && !leaveDate) e.leaveDate = 'Leave date is required';
        if (generatePassword === 'no' && (!manualPassword || manualPassword.length < 6)) {
            e.manualPassword = 'Password must be at least 6 characters';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const addQualification = () => {
        const e: Record<string, string> = {};
        if (!qualification) e.qualification = 'Select a qualification';
        if (!institute.trim()) e.institute = 'Institute is required';
        if (!qualStartDate) e.qualStartDate = 'Start date is required';
        if (!qualEndDate) e.qualEndDate = 'End date is required';
        setErrors(e);
        if (Object.keys(e).length > 0) return;
        setQualifications(prev => [
            ...prev,
            {
                qualification,
                institute,
                startDate: qualStartDate,
                endDate: qualEndDate,
                obtainedMarks,
                grade,
                majorSubject,
            },
        ]);
        setQualification(''); setInstitute(''); setQualStartDate(''); setQualEndDate('');
        setObtainedMarks(''); setGrade(''); setMajorSubject('');
    };

    const addExperience = () => {
        const e: Record<string, string> = {};
        if (!organization.trim()) e.organization = 'Organization is required';
        if (!expDesignation.trim()) e.expDesignation = 'Designation is required';
        if (!expStartDate) e.expStartDate = 'Start date is required';
        if (!expEndDate) e.expEndDate = 'End date is required';
        setErrors(e);
        if (Object.keys(e).length > 0) return;
        setExperiences(prev => [
            ...prev,
            {
                organization,
                designation: expDesignation,
                startDate: expStartDate,
                endDate: expEndDate,
                description: expDescription,
            },
        ]);
        setOrganization(''); setExpDesignation(''); setExpStartDate(''); setExpEndDate(''); setExpDescription('');
    };

    const addWorkTime = () => {
        if (!day || !startTime || !endTime) {
            setErrors({ workTime: 'Please select a day and working hours' });
            return;
        }
        setErrors({});
        setWorkTimes(prev => [...prev, { day, startTime, endTime }]);
        setStartTime(''); setEndTime('');
    };

    const handleAddDepartment = async () => {
        if (!newDept.trim()) return;
        setIsAddingDept(true);
        try {
            const res = await api.post('/hr/departments', { name: newDept.trim(), companyId: companyId! });
            const created = res.data?.data || res.data;
            setDeptList(prev => [...prev, created]);
            setDepartment(created.name || newDept.trim());
            setDeptDialogOpen(false);
            setNewDept('');
            toast({ title: 'Success', description: 'Department added successfully.' });
            queryClient.invalidateQueries({ queryKey: ['hr/departments', companyId] });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || 'Failed to add department',
            });
        } finally {
            setIsAddingDept(false);
        }
    };

    const handleNext = () => {
        if (tab === 0 && !validatePersonal()) return;
        if (tab === 3 && !validateAccounts()) return;
        if (tab === 4 && !validateOther()) return;
        setErrors({});
        setTab(prev => Math.min(prev + 1, TABS.length - 1));
    };

    const handleSubmit = () => {
        if (!validatePersonal()) { setTab(0); return; }
        if (!validateAccounts()) { setTab(3); return; }
        if (!validateOther()) { setTab(4); return; }

        const password = generatePassword === 'yes'
            ? generatedPassword || `Staff@${Math.floor(1000 + Math.random() * 9000)}`
            : manualPassword;

        if (generatePassword === 'yes') setGeneratedPassword(password);

        if (!isEditMode && (!password || password.length < 6)) {
            toast({ variant: 'destructive', title: 'Error', description: 'A valid password is required.' });
            setTab(4);
            return;
        }

        const payload = {
            name,
            email,
            phone,
            password,
            secondaryPhone: '',
            role: 'staff',
            gender,
            maritalStatus,
            fatherName,
            nic,
            address,
            designation,
            department,
            salary: Number(basicPay) || 0,
            basicPay: Number(basicPay) || 0,
            leaveAllow: Number(leaveAllow) || 0,
            paymentMode,
            bankName,
            accountTitle,
            accountNo,
            appointedDate,
            technical,
            status,
            leaveDate,
            plainPassword: password,
            cnicFront,
            cnicBack,
            employeeImage,
            cv,
            qualifications,
            experiences,
            workTimes,
            areaId: null,
        };
        onSave(payload);
    };

    const goTo = (i: number) => setTab(i);

    const inputCls = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

    return (
        <div className="space-y-4">
            {/* Tab headers */}
            <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto border-b pb-3">
                {TABS.map((t, i) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => goTo(i)}
                        className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            tab === i
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-muted text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                    >
                        <span
                            className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
                                tab === i
                                    ? 'bg-white/25 text-white'
                                    : 'bg-muted-foreground/15 text-muted-foreground'
                            }`}
                        >
                            {i + 1}
                        </span>
                        {t}
                    </button>
                ))}
            </div>

            {/* Tab 1: Personal Information */}
            {tab === 0 && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input placeholder="e.g., John Doe" value={name} onChange={e => setName(e.target.value)} />
                            {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Gender</Label>
                            <Select value={gender} onValueChange={setGender}>
                                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                                <SelectContent portal={false}>
                                    {GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Marital Status</Label>
                            <Select value={maritalStatus} onValueChange={setMaritalStatus}>
                                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                                <SelectContent portal={false}>
                                    {MARITAL_STATUSES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Father Name</Label>
                            <Input placeholder="e.g., Muhammad Ahmed" value={fatherName} onChange={e => setFatherName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input type="email" placeholder="e.g., john@example.com" value={email} onChange={e => setEmail(e.target.value)} disabled={isEditMode} className={isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''} />
                            {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
                            {isEditMode && <p className="text-xs text-gray-500">Email cannot be changed in edit mode</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>NIC</Label>
                            <Input placeholder="e.g., 35202-1234567-1" value={nic} onChange={e => setNic(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input placeholder="e.g., 0300-1234567" value={phone} onChange={e => setPhone(e.target.value)} />
                            {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Address</Label>
                            <Input placeholder="e.g., House #12, Street #5, Model Town" value={address} onChange={e => setAddress(e.target.value)} />
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 2: Qualification */}
            {tab === 1 && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Qualification</Label>
                            <Select value={qualification} onValueChange={setQualification}>
                                <SelectTrigger><SelectValue placeholder="Select qualification" /></SelectTrigger>
                                <SelectContent portal={false}>
                                    {QUALIFICATIONS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            {errors.qualification && <p className="text-xs text-red-600">{errors.qualification}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Institute</Label>
                            <Input placeholder="e.g., Punjab University" value={institute} onChange={e => setInstitute(e.target.value)} />
                            {errors.institute && <p className="text-xs text-red-600">{errors.institute}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input type="date" value={qualStartDate} onChange={e => setQualStartDate(e.target.value)} />
                            {errors.qualStartDate && <p className="text-xs text-red-600">{errors.qualStartDate}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>End Date</Label>
                            <Input type="date" value={qualEndDate} onChange={e => setQualEndDate(e.target.value)} />
                            {errors.qualEndDate && <p className="text-xs text-red-600">{errors.qualEndDate}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Obtained Marks</Label>
                            <Input placeholder="e.g., 850/1100" value={obtainedMarks} onChange={e => setObtainedMarks(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Grade</Label>
                            <Input placeholder="e.g., A / 3.5" value={grade} onChange={e => setGrade(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Major Subject</Label>
                            <Input placeholder="e.g., Computer Science" value={majorSubject} onChange={e => setMajorSubject(e.target.value)} />
                        </div>
                        <div className="flex items-end">
                            <Button type="button" variant="outline" className="gap-2 w-full" onClick={addQualification}>
                                <Plus className="h-4 w-4" /> Add Qualification
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Qualification</TableHead>
                                    <TableHead>Institute</TableHead>
                                    <TableHead>Start & End Date</TableHead>
                                    <TableHead>Obtained</TableHead>
                                    <TableHead>Grade</TableHead>
                                    <TableHead>Major Subject</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {qualifications.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No qualifications added yet.</TableCell></TableRow>
                                ) : (
                                    qualifications.map((q, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">{q.qualification}</TableCell>
                                            <TableCell>{q.institute}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{q.startDate} — {q.endDate}</TableCell>
                                            <TableCell>{q.obtainedMarks || '—'}</TableCell>
                                            <TableCell>{q.grade || '—'}</TableCell>
                                            <TableCell>{q.majorSubject || '—'}</TableCell>
                                            <TableCell>
                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => setQualifications(prev => prev.filter((_, idx) => idx !== i))}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* Tab 3: Experience */}
            {tab === 2 && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Organization</Label>
                            <Input placeholder="e.g., ABC Networks" value={organization} onChange={e => setOrganization(e.target.value)} />
                            {errors.organization && <p className="text-xs text-red-600">{errors.organization}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Designation</Label>
                            <Input placeholder="e.g., Network Technician" value={expDesignation} onChange={e => setExpDesignation(e.target.value)} />
                            {errors.expDesignation && <p className="text-xs text-red-600">{errors.expDesignation}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input type="date" value={expStartDate} onChange={e => setExpStartDate(e.target.value)} />
                            {errors.expStartDate && <p className="text-xs text-red-600">{errors.expStartDate}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>End Date</Label>
                            <Input type="date" value={expEndDate} onChange={e => setExpEndDate(e.target.value)} />
                            {errors.expEndDate && <p className="text-xs text-red-600">{errors.expEndDate}</p>}
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Description</Label>
                            <Textarea placeholder="Describe your responsibilities..." value={expDescription} onChange={e => setExpDescription(e.target.value)} />
                        </div>
                        <div className="flex items-end">
                            <Button type="button" variant="outline" className="gap-2 w-full" onClick={addExperience}>
                                <Plus className="h-4 w-4" /> Add Experience
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Organization</TableHead>
                                    <TableHead>Designation</TableHead>
                                    <TableHead>Start & End Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {experiences.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No experiences added yet.</TableCell></TableRow>
                                ) : (
                                    experiences.map((x, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">{x.organization}</TableCell>
                                            <TableCell>{x.designation}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{x.startDate} — {x.endDate}</TableCell>
                                            <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{x.description || '—'}</TableCell>
                                            <TableCell>
                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => setExperiences(prev => prev.filter((_, idx) => idx !== i))}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* Tab 4: Accounts */}
            {tab === 3 && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Basic Pay (PKR)</Label>
                            <Input type="number" placeholder="e.g., 50000" value={basicPay} onChange={e => setBasicPay(e.target.value)} />
                            {errors.basicPay && <p className="text-xs text-red-600">{errors.basicPay}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Leave Allow (PKR)</Label>
                            <Input type="number" placeholder="e.g., 5000" value={leaveAllow} onChange={e => setLeaveAllow(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Payment Mode</Label>
                            <Select value={paymentMode} onValueChange={setPaymentMode}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent portal={false}>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="bank">Bank</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {paymentMode === 'bank' && (
                            <>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Bank Name</Label>
                                    <div className="relative">
                                        <Input
                                            placeholder="Search transaction type / bank..."
                                            value={bankSearch}
                                            onChange={e => setBankSearch(e.target.value)}
                                            onFocus={() => setBankOpen(true)}
                                            className="pr-9"
                                        />
                                        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    </div>
                                    {bankOpen && (
                                        <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border bg-background shadow-md">
                                            {filteredBanks.length === 0 ? (
                                                <div className="p-3 text-sm text-muted-foreground">No transaction types found.</div>
                                            ) : (
                                                filteredBanks.map(t => (
                                                    <button
                                                        key={t.id}
                                                        type="button"
                                                        className={`w-full px-3 py-2 text-left text-sm hover:bg-emerald-50 ${bankName === t.transaction ? 'bg-emerald-50 text-emerald-700 font-medium' : ''}`}
                                                        onClick={() => { setBankName(t.transaction); setBankOpen(false); }}
                                                    >
                                                        {t.transaction}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                    {errors.bankName && <p className="text-xs text-red-600">{errors.bankName}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Selected Bank</Label>
                                    <Input value={bankName} readOnly placeholder="No bank selected" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Account Title</Label>
                                    <Input placeholder="e.g., John Doe" value={accountTitle} onChange={e => setAccountTitle(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Account No.</Label>
                                    <Input placeholder="e.g., 0123456789" value={accountNo} onChange={e => setAccountNo(e.target.value)} />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Tab 5: Other */}
            {tab === 4 && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Appointed Date</Label>
                            <Input type="date" value={appointedDate} onChange={e => setAppointedDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Technical</Label>
                            <Select value={technical} onValueChange={setTechnical}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent portal={false}>
                                    <SelectItem value="yes">Yes</SelectItem>
                                    <SelectItem value="no">No</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Password Generate</Label>
                            <Select value={generatePassword} onValueChange={setGeneratePassword}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent portal={false}>
                                    <SelectItem value="yes">Yes</SelectItem>
                                    <SelectItem value="no">No</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {generatePassword === 'yes' ? (
                            <div className="space-y-2">
                                <Label>Generated Password</Label>
                                <div className="flex items-center gap-2">
                                    <Input value={generatedPassword || (isEditMode && staff?.plainPassword ? staff.plainPassword : 'Staff@----')} readOnly className="font-mono" />
                                </div>
                                <p className="text-xs text-muted-foreground">A new password will be generated when the form is submitted.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label>Password</Label>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter password"
                                        value={manualPassword}
                                        onChange={e => setManualPassword(e.target.value)}
                                        className="pr-9"
                                    />
                                    <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                                    </Button>
                                </div>
                                {errors.manualPassword && <p className="text-xs text-red-600">{errors.manualPassword}</p>}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Department</Label>
                            <div className="flex gap-2">
                                <Select value={department} onValueChange={setDepartment}>
                                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                                    <SelectContent portal={false}>
                                        {deptList.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Button type="button" variant="outline" size="icon" title="Add Department" onClick={() => setDeptDialogOpen(true)}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Designation</Label>
                            <Input placeholder="e.g., Network Engineer" value={designation} onChange={e => setDesignation(e.target.value)} />
                            {errors.designation && <p className="text-xs text-red-600">{errors.designation}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent portal={false}>
                                    <SelectItem value="working">Working</SelectItem>
                                    <SelectItem value="left">Left</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {status === 'left' && (
                            <div className="space-y-2">
                                <Label>Leave Date</Label>
                                <Input type="date" value={leaveDate} onChange={e => setLeaveDate(e.target.value)} />
                                {errors.leaveDate && <p className="text-xs text-red-600">{errors.leaveDate}</p>}
                            </div>
                        )}
                    </div>

                    {/* Working time */}
                    <div className="rounded-lg border p-4">
                        <Label className="mb-3 block font-semibold">Working Time</Label>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="space-y-2">
                                <Label>Day</Label>
                                <Select value={day} onValueChange={setDay}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent portal={false}>
                                        {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Start Time</Label>
                                <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>End Time</Label>
                                <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                            </div>
                            <Button type="button" variant="outline" className="gap-2 w-full" onClick={addWorkTime}>
                                <Plus className="h-4 w-4" /> Add
                            </Button>
                        </div>
                        {errors.workTime && <p className="text-xs text-red-600 mt-2">{errors.workTime}</p>}

                        <div className="mt-4 rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Day</TableHead>
                                        <TableHead>Start Time</TableHead>
                                        <TableHead>End Time</TableHead>
                                        <TableHead className="w-12"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {workTimes.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No working hours added yet.</TableCell></TableRow>
                                    ) : (
                                        workTimes.map((w, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-medium">{w.day}</TableCell>
                                                <TableCell>{w.startTime}</TableCell>
                                                <TableCell>{w.endTime}</TableCell>
                                                <TableCell>
                                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => setWorkTimes(prev => prev.filter((_, idx) => idx !== i))}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 6: Attachments */}
            {tab === 5 && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>CNIC Front</Label>
                            <UploadSlot label="Upload CNIC Front" value={cnicFront} isImage onChange={setCnicFront} />
                        </div>
                        <div className="space-y-2">
                            <Label>CNIC Back</Label>
                            <UploadSlot label="Upload CNIC Back" value={cnicBack} isImage onChange={setCnicBack} />
                        </div>
                        <div className="space-y-2">
                            <Label>Employee Image</Label>
                            <UploadSlot label="Upload Employee Image" value={employeeImage} isImage onChange={setEmployeeImage} />
                        </div>
                        <div className="space-y-2">
                            <Label>CV</Label>
                            <UploadSlot label="Upload CV" value={cv} fileName={cvName} onChange={(v, n) => { setCv(v); setCvName(n); }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Footer navigation */}
            <div className="flex items-center justify-between gap-2 pt-4 border-t">
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
                        Cancel
                    </Button>
                    {tab > 0 && (
                        <Button type="button" variant="outline" onClick={() => setTab(prev => Math.max(0, prev - 1))}>
                            Previous
                        </Button>
                    )}
                </div>
                <div className="flex gap-2">
                    {tab < TABS.length - 1 ? (
                        <Button type="button" onClick={handleNext} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
                            Next
                        </Button>
                    ) : (
                        <Button type="button" onClick={handleSubmit} disabled={isSaving} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSaving ? 'Saving...' : (isEditMode ? 'Update Staff' : 'Add Staff')}
                        </Button>
                    )}
                </div>
            </div>

            {/* Add Department popup */}
            <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
                <DialogContent className="rounded-xl shadow-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
                                <Building2 className="h-4 w-4" />
                            </div>
                            Add Department
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label>Department Name</Label>
                        <Input placeholder="e.g., Finance" value={newDept} onChange={e => setNewDept(e.target.value)} autoFocus />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDeptDialogOpen(false)} disabled={isAddingDept}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleAddDepartment} disabled={isAddingDept || !newDept.trim()} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:from-emerald-600 hover:to-green-700">
                            {isAddingDept && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
