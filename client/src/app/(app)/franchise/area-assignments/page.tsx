'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useGenericQuery } from '@/hooks/api/use-generic-query';
import { Loader2 } from 'lucide-react';

import { useCompany } from '@/context/company-context';
import {  useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AreaAssignmentsPage() {
  const { companyId } = useCompany();
  const [dealerAreas, setDealerAreas] = useState<Record<string, string[]>>({ 'DLR-001': ['AREA-002'] });

  const { data: dealers = [], isLoading: isLoadingdealers } = useGenericQuery<any>('dealers', companyId ?? undefined);

  const { data: areas = [], isLoading: isLoadingareas } = useGenericQuery<any>('network/areas', companyId ?? undefined);

  return (
    <>
      <PageHeader
        title="Area Assignments"
        description="Assign service areas to your dealers."
      >
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Assign Area
        </Button>
      </PageHeader>
      
      <Card>
        <CardContent className="p-6">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Dealer</TableHead>
                        <TableHead>Assigned Areas</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {dealers.map(dealer => (
                        <TableRow key={dealer.id}>
                            <TableCell className="font-medium">{dealer.name}</TableCell>
                            <TableCell>
                                <Select>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select areas..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {areas.map(area => (
                                            <SelectItem key={area.id} value={area.id}>
                                                {area.locality}, {area.zone}, {area.city}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="outline" size="sm">Save</Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </>
  );
}
