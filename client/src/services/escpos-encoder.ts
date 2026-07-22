export interface InvoiceData {
  company: {
    name: string;
    address: string;
    email: string;
    contact1: string;
    ntn?: string;
  };
  invoice: {
    id: string;
    amount: number;
    dueDate: string;
    invoiceDate?: string;
    fbrInvoiceReferenceNumber?: string;
    billingPeriodStart?: string;
    billingPeriodEnd?: string;
    itemizedCharges?: {
      subscriptionFee: number;
      installationCharges?: number;
      addOnServices?: { name: string; amount: number }[];
      discounts?: number;
    };
  };
  subscriber: {
    name: string;
    installationAddress: string;
    phone: string;
    packageName: string;
    uniqueId: string;
    cnic: string;
  };
  fbrData?: {
    irn: string;
    qrCodeData: string;
    ntn: string;
  };
  totals?: {
    subtotal: number;
    tax: number;
    total: number;
  };
}

export class ESCPOSEncoder {
  private buffer: number[] = [];

  // ESC/POS Commands
  private readonly ESC = 0x1B;
  private readonly GS = 0x1D;
  private readonly LF = 0x0A;
  private readonly CR = 0x0D;

  // Text formatting
  private readonly ALIGN_LEFT = 0x00;
  private readonly ALIGN_CENTER = 0x01;
  private readonly ALIGN_RIGHT = 0x02;

  private readonly TEXT_SIZE_NORMAL = 0x00;
  private readonly TEXT_SIZE_DOUBLE_HEIGHT = 0x01;
  private readonly TEXT_SIZE_DOUBLE_WIDTH = 0x02;
  private readonly TEXT_SIZE_DOUBLE_BOTH = 0x03;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Initialize printer
    this.addCommand(this.ESC, 0x40); // ESC @ - Initialize printer
  }

  private addCommand(...commands: number[]): void {
    this.buffer.push(...commands);
  }

  private addText(text: string): void {
    // Convert string to bytes (assuming ASCII/UTF-8)
    for (let i = 0; i < text.length; i++) {
      this.buffer.push(text.charCodeAt(i));
    }
  }

  private addLine(text: string = ''): void {
    this.addText(text);
    this.addCommand(this.LF);
  }

  setAlignment(alignment: number): void {
    this.addCommand(this.ESC, 0x61, alignment);
  }

  setTextSize(size: number): void {
    this.addCommand(this.GS, 0x21, size);
  }

  setBold(enabled: boolean): void {
    this.addCommand(this.ESC, 0x45, enabled ? 0x01 : 0x00);
  }

  setUnderline(enabled: boolean): void {
    this.addCommand(this.ESC, 0x2D, enabled ? 0x01 : 0x00);
  }

  addSeparator(char: string = '-', length: number = 32): void {
    const separator = char.repeat(Math.ceil(length / char.length)).substring(0, length);
    this.addLine(separator);
  }

  addHeader(company: InvoiceData['company']): void {
    // Company name - centered, bold, double size
    this.setAlignment(this.ALIGN_CENTER);
    this.setBold(true);
    this.setTextSize(this.TEXT_SIZE_DOUBLE_BOTH);
    this.addLine(company.name.toUpperCase());
    
    // Reset formatting
    this.setBold(false);
    this.setTextSize(this.TEXT_SIZE_NORMAL);
    
    // Company details
    this.addLine(company.address);
    if (company.ntn) {
      this.addLine(`NTN: ${company.ntn}`);
    }
    this.addLine(`Ph: ${company.contact1}`);
    this.addLine();
  }

  addInvoiceInfo(invoice: InvoiceData['invoice']): void {
    this.setAlignment(this.ALIGN_LEFT);
    this.addSeparator();
    this.addLine(`Invoice: ${invoice.id}`);
    if (invoice.invoiceDate) {
      const date = new Date(invoice.invoiceDate);
      this.addLine(`Date: ${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}`);
      this.addLine(`Time: ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`);
    }
    this.addLine(`Due: ${invoice.dueDate}`);
    if (invoice.fbrInvoiceReferenceNumber) {
      this.addLine(`FBR: ${invoice.fbrInvoiceReferenceNumber}`);
    }
    this.addSeparator();
  }

  addCustomerInfo(subscriber: InvoiceData['subscriber']): void {
    this.setAlignment(this.ALIGN_LEFT);
    // Condensed format for thermal printer
    const userName = subscriber.name.replace(/\s+/g, '_').toLowerCase();
    this.addLine(`User: ${userName}`);
    this.addLine(`CID: ${subscriber.uniqueId}`);
    this.addLine(`Phone: ${subscriber.phone}`);
    this.addSeparator();
  }

  addItems(data: InvoiceData): void {
    this.setAlignment(this.ALIGN_LEFT);
    this.addLine('Description'.padEnd(20) + 'Amount');
    this.addSeparator();
    
    const { invoice, subscriber } = data;
    const currentMonth = new Date().toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
    
    // Main package
    const packageName = `${subscriber.packageName} (${currentMonth})`.padEnd(20);
    const subscriptionFee = invoice.itemizedCharges?.subscriptionFee || invoice.amount;
    const price = `PKR ${subscriptionFee.toLocaleString()}`;
    this.addLine(packageName + price);
    
    // Installation charges if any
    if (invoice.itemizedCharges?.installationCharges) {
      const installName = 'Installation'.padEnd(20);
      const installPrice = `PKR ${invoice.itemizedCharges.installationCharges.toLocaleString()}`;
      this.addLine(installName + installPrice);
    }
    
    // Add-on services if any
    if (invoice.itemizedCharges?.addOnServices) {
      for (const service of invoice.itemizedCharges.addOnServices) {
        const serviceName = service.name.padEnd(20);
        const servicePrice = `PKR ${service.amount.toLocaleString()}`;
        this.addLine(serviceName + servicePrice);
      }
    }
    
    // Discounts if any
    if (invoice.itemizedCharges?.discounts && invoice.itemizedCharges.discounts > 0) {
      const discountName = 'Discount'.padEnd(20);
      const discountPrice = `-PKR ${invoice.itemizedCharges.discounts.toLocaleString()}`;
      this.addLine(discountName + discountPrice);
    }
    
    this.addSeparator();
  }

  addTotals(data: InvoiceData): void {
    const { invoice, totals } = data;
    const subtotal = totals?.subtotal || invoice.amount;
    const tax = totals?.tax || Math.round(subtotal * 0.195); // 19.5% GST
    const total = totals?.total || (subtotal + tax);
    
    this.setAlignment(this.ALIGN_RIGHT);
    this.addLine(`SUBTOTAL: PKR ${subtotal.toLocaleString()}`);
    this.addLine(`GST (19.5%): PKR ${tax.toLocaleString()}`);
    
    this.setBold(true);
    this.setTextSize(this.TEXT_SIZE_DOUBLE_HEIGHT);
    this.addLine(`TOTAL PAYABLE: PKR ${total.toLocaleString()}`);
    
    // Reset formatting
    this.setBold(false);
    this.setTextSize(this.TEXT_SIZE_NORMAL);
  }

  addFooter(data: InvoiceData): void {
    this.setAlignment(this.ALIGN_CENTER);
    this.addSeparator();
    
    // FBR Compliance section
    if (data.fbrData) {
      this.setBold(true);
      this.addLine('FBR COMPLIANT');
      this.setBold(false);
      this.addLine('Verifiable via App');
      this.addLine(`IRN: ${data.fbrData.irn}`);
      this.addSeparator();
    }
    
    // Support info
    this.addLine(`Support: ${data.company.contact1}`);
    this.addLine(data.company.name);
    this.addLine('Thank you for choosing!');
    this.addLine();
    this.addLine('Non-refundable');
    this.addLine('Subject to SLA');
    this.addLine();
    this.addLine();
  }

  encodeInvoice(data: InvoiceData): Uint8Array {
    this.initialize();
    
    // Build thermal receipt
    this.addHeader(data.company);
    this.addInvoiceInfo(data.invoice);
    this.addCustomerInfo(data.subscriber);
    this.addItems(data);
    this.addTotals(data);
    this.addFooter(data);
    
    // Add cut command
    this.addCommand(this.GS, 0x56, 0x00); // Full cut
    
    return new Uint8Array(this.buffer);
  }

  clear(): void {
    this.buffer = [];
  }

  getBuffer(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

// Helper function to create enhanced invoice data from existing invoice structure
export function createInvoiceData(
  invoice: any,
  company: any,
  subscriber: any
): InvoiceData {
  const subtotal = invoice.amount || 0;
  const taxRate = 0.195; // 19.5% GST
  const taxAmount = Math.round(subtotal * taxRate);
  const total = subtotal + taxAmount;
  
  return {
    company: {
      name: company.name || '',
      address: company.address || '',
      email: company.email || '',
      contact1: company.contact1 || '',
      ntn: company.taxRules || 'N/A'
    },
    invoice: {
      id: invoice.id || '',
      amount: invoice.amount || 0,
      dueDate: invoice.dueDate || '',
      invoiceDate: new Date().toISOString().split('T')[0],
      fbrInvoiceReferenceNumber: `FBR-${invoice.id}-${Date.now()}`,
      billingPeriodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      billingPeriodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
      itemizedCharges: {
        subscriptionFee: subtotal,
        installationCharges: 0,
        addOnServices: [],
        discounts: 0
      }
    },
    subscriber: {
      name: subscriber.name || '',
      installationAddress: subscriber.installationAddress || '',
      phone: subscriber.phone || '',
      packageName: subscriber.packageName || '',
      uniqueId: subscriber.subscriber_identity || '',
      cnic: subscriber.cnic || ''
    },
    fbrData: {
      irn: `IRN-${invoice.id}-${Date.now()}`,
      qrCodeData: JSON.stringify({
        invoiceNumber: invoice.id,
        invoiceDate: new Date().toISOString().split('T')[0],
        totalAmount: total,
        taxAmount: taxAmount,
        companyName: company.name,
        ntn: company.taxRules || 'N/A',
        customerName: subscriber.name,
        customerNTN: subscriber.cnic
      }),
      ntn: company.taxRules || 'N/A'
    },
    totals: {
      subtotal,
      tax: taxAmount,
      total
    }
  };
}
