'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { pricingPlans as Plan } from '@/lib/types';
import { MoreHorizontal, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PlanColumnsProps {
  onEdit: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
}

export const getColumns = ({ onEdit, onDelete }: PlanColumnsProps): ColumnDef<Plan>[] => [
  {
    accessorKey: 'name',
    header: 'Plan Name',
  },
  {
    accessorKey: 'price',
    header: 'Price (PKR)',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('price'));
      const formatted = new Intl.NumberFormat('en-US').format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'features',
    header: 'Features',
    cell: ({ row }) => {
        const features = row?.original?.features;
        // Convert string to array (assuming comma-separated or JSON string)
        const featuresArray = features ? 
            (features.includes(',') ? features.split(',').map(f => f.trim()) : [features])
            : [];
        
        return (
            <ul className="list-inside">
                {featuresArray.slice(0, 3).map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>{feature}</span>
                    </li>
                ))}
                {featuresArray.length > 3 && <li className="text-sm text-muted-foreground">...and {featuresArray.length - 3} more</li>}
            </ul>
        )
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const plan = row.original;
      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(plan)}>Edit plan</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(plan)}>
                Delete plan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
