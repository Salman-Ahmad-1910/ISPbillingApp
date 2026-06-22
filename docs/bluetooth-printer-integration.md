# Bluetooth Printer Integration

This document describes the Bluetooth printer integration for the FinTrack-ERP system, allowing users to print invoices directly to Bluetooth thermal printers from the web interface.

## Overview

The Bluetooth printer integration uses the Web Bluetooth API to connect to thermal receipt printers and send ESC/POS commands for printing invoices. This provides a seamless printing experience without requiring additional software installation.

## Architecture

### Components

1. **BluetoothPrinterService** (`/src/services/bluetooth-printer.ts`)
   - Handles Bluetooth device connection and communication
   - Manages printer state and data transmission
   - Provides methods for connecting, disconnecting, and printing

2. **ESCPOSEncoder** (`/src/services/escpos-encoder.ts`)
   - Converts invoice data to ESC/POS printer commands
   - Handles text formatting, layout, and printer control
   - Supports thermal printer specific features (cut, buzz, etc.)

3. **PrintDialog Components**
   - Enhanced sales invoice print dialog (`/src/app/(app)/sales/invoices/_components/print-dialog.tsx`)
   - Enhanced vendor invoice print dialog (`/src/app/(app)/vendor-invoices/_components/print-dialog.tsx`)
   - Provides UI for both browser and Bluetooth printing options

4. **BluetoothPrinterManager** (`/src/components/bluetooth-printer-manager.tsx`)
   - Standalone component for managing printer connections
   - Can be integrated into settings or admin pages
   - Shows available printers and connection status

## Features

### Supported Printers
- ESC/POS compatible thermal printers
- Bluetooth receipt printers with Serial Port Profile (SPP)
- Most popular thermal printer brands (Epson, Star, Zebra, etc.)

### Printing Options
- **Browser Printing**: Traditional browser print dialog (A4/Thermal layouts)
- **Bluetooth Printing**: Direct printing to thermal receipt printers
- **Automatic Reconnection**: Reconnects to previously paired printers
- **Printer Management**: View and manage connected printers

### Invoice Support
- Sales invoices
- Vendor invoices
- Both A4 and thermal receipt formats
- Company branding and information
- Customer details and itemized billing

## Browser Compatibility

### Supported Browsers
- **Chrome** (Desktop and Android) - Full support
- **Edge** (Desktop) - Full support
- **Opera** (Desktop) - Full support

### Not Supported
- Safari (iOS/macOS)
- Firefox
- Mobile browsers (except Chrome Android)

### Requirements
- HTTPS connection (required for Web Bluetooth API)
- User gesture required for initial connection
- Bluetooth enabled on device

## Usage

### Basic Printing
1. Open any invoice (sales or vendor)
2. Click the "Print" button
3. Choose printing method:
   - **Browser Printing**: Select A4 or Thermal size
   - **Bluetooth Printing**: Connect printer and print directly

### Bluetooth Printer Setup
1. Ensure Bluetooth printer is paired with your device
2. In the print dialog, click "Connect Bluetooth Printer"
3. Select your printer from the browser's device picker
4. Grant permission for Bluetooth access
5. Print directly to the connected printer

### Printer Management
- Connected printers are remembered for future sessions
- Use the Bluetooth Printer Manager component to view available printers
- Disconnect or reconnect printers as needed

## Technical Implementation

### Connection Process
```typescript
// Connect to printer
const printer = await bluetoothPrinterService.connect();

// Print invoice data
const encoder = new ESCPOSEncoder();
const printData = encoder.encodeInvoice(invoiceData);
await bluetoothPrinterService.print(printData, { cut: true });
```

### ESC/POS Commands
The system uses standard ESC/POS commands for:
- Text formatting (bold, underline, alignment)
- Text sizing (normal, double height/width)
- Line feeds and spacing
- Paper cutting
- Printer buzzing (for alerts)

### Data Flow
1. User selects Bluetooth printing option
2. System fetches invoice and company data
3. Data is encoded to ESC/POS format
4. Bluetooth connection is established
5. Print data is sent to printer
6. Printer processes and prints the receipt

## Security Considerations

### Web Bluetooth API Security
- Requires HTTPS connection
- User must explicitly grant permission
- Connections are initiated by user gesture
- Limited to paired devices

### Data Protection
- Invoice data is transmitted locally via Bluetooth
- No data is sent to external servers
- Connection is encrypted by Bluetooth protocol

## Troubleshooting

### Common Issues

**"Web Bluetooth API is not supported"**
- Use Chrome, Edge, or Opera browser
- Ensure HTTPS connection
- Try on desktop or Android device

**"Failed to connect to printer"**
- Ensure printer is paired with device
- Check printer is powered on and ready
- Verify printer supports Serial Port Profile
- Try disconnecting and reconnecting

**"Print failed"**
- Check printer has paper and is ready
- Verify printer is still connected
- Try reconnecting the printer
- Check for printer error indicators

**"Permission denied"**
- Grant Bluetooth permission when prompted
- Check browser settings for Bluetooth access
- Try refreshing the page and reconnecting

### Debug Information
Browser console logs provide detailed error information:
- Connection status
- Bluetooth device discovery
- Data transmission errors
- Printer response codes

## Future Enhancements

### Planned Features
- Support for more printer languages (StarPRNT)
- Custom receipt templates
- Printer status monitoring
- Batch printing capabilities
- Mobile app integration

### Potential Improvements
- Web USB printer support
- Network printer integration
- Advanced formatting options
- Print job queue management
- Printer configuration settings

## Development Notes

### Adding New Invoice Types
To add Bluetooth printing to new invoice types:
1. Import the Bluetooth printer services
2. Create invoice data structure
3. Use ESCPOSEncoder to format data
4. Handle connection and printing logic

### Customizing Receipt Layout
Modify the `ESCPOSEncoder` class to:
- Change receipt formatting
- Add custom headers/footers
- Modify text sizing and alignment
- Include additional information

### Testing
- Test with various Bluetooth printers
- Verify browser compatibility
- Test connection/disconnection scenarios
- Validate receipt output quality

## Support

For technical support or questions about the Bluetooth printer integration:
1. Check this documentation for common solutions
2. Review browser console for error messages
3. Verify printer compatibility and setup
4. Contact development team for advanced issues

---

*Last Updated: May 2026*
*Version: 1.0.0*
