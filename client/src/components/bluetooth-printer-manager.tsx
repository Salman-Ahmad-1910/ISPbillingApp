'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bluetooth, 
  BluetoothConnected, 
  Loader2, 
  AlertCircle, 
  Settings,
  Trash2
} from 'lucide-react';
import { bluetoothPrinterService, BluetoothPrinterService, type BluetoothPrinter } from '@/services/bluetooth-printer';

interface BluetoothPrinterManagerProps {
  onPrinterConnected?: (printer: BluetoothPrinter) => void;
  onPrinterDisconnected?: () => void;
}

export function BluetoothPrinterManager({ 
  onPrinterConnected, 
  onPrinterDisconnected 
}: BluetoothPrinterManagerProps) {
  const [connectedPrinter, setConnectedPrinter] = useState<BluetoothPrinter | null>(null);
  const [availablePrinters, setAvailablePrinters] = useState<BluetoothPrinter[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkConnectedPrinter();
    loadAvailablePrinters();
  }, []);

  const checkConnectedPrinter = () => {
    if (bluetoothPrinterService.isConnected()) {
      const printer = bluetoothPrinterService.getPrinterInfo();
      setConnectedPrinter(printer);
    }
  };

  const loadAvailablePrinters = async () => {
    if (!BluetoothPrinterService.isSupported()) {
      return;
    }

    setIsLoading(true);
    try {
      const printers = await bluetoothPrinterService.getAvailablePrinters();
      setAvailablePrinters(printers);
    } catch (error) {
      console.error('Failed to load available printers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectNew = async () => {
    if (!BluetoothPrinterService.isSupported()) {
      setError('Web Bluetooth API is not supported in this browser. Please use Chrome, Edge, or Opera.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const printer = await bluetoothPrinterService.connect();
      setConnectedPrinter(printer);
      await loadAvailablePrinters(); // Refresh available printers
      onPrinterConnected?.(printer);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to connect to printer');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleReconnect = async (printerId: string) => {
    setIsConnecting(true);
    setError(null);

    try {
      const printer = await bluetoothPrinterService.reconnect(printerId);
      if (printer) {
        setConnectedPrinter(printer);
        await loadAvailablePrinters();
        onPrinterConnected?.(printer);
      } else {
        setError('Failed to reconnect to printer');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to reconnect to printer');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await bluetoothPrinterService.disconnect();
      setConnectedPrinter(null);
      await loadAvailablePrinters();
      onPrinterDisconnected?.();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to disconnect from printer');
    }
  };

  const handleForgetPrinter = async (printerId: string) => {
    // Note: Web Bluetooth API doesn't provide a direct way to forget devices
    // This would typically be handled through browser settings
    // For now, we'll just refresh the list
    await loadAvailablePrinters();
  };

  const isBluetoothSupported = BluetoothPrinterService.isSupported();

  if (!isBluetoothSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bluetooth className="h-5 w-5" />
            Bluetooth Printer
          </CardTitle>
          <CardDescription>
            Manage Bluetooth printer connections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Web Bluetooth API is not supported in this browser. Please use Chrome, Edge, or Opera on desktop or Android.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bluetooth className="h-5 w-5" />
          Bluetooth Printer Manager
        </CardTitle>
        <CardDescription>
          Connect and manage Bluetooth thermal printers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Connected Printer */}
        {connectedPrinter ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Connected Printer</h4>
              <Badge variant="default" className="bg-green-500">
                <BluetoothConnected className="mr-1 h-3 w-3" />
                Connected
              </Badge>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium">{connectedPrinter.name}</p>
              <p className="text-sm text-gray-500">ID: {connectedPrinter.id}</p>
              <p className="text-sm text-gray-500">Language: {connectedPrinter.language}</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDisconnect}
              >
                Disconnect
              </Button>
              <Button 
                variant="outline" 
                size="sm"
              >
                <Settings className="mr-1 h-3 w-3" />
                Configure
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <h4 className="font-medium">No Printer Connected</h4>
            <Button 
              onClick={handleConnectNew}
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Bluetooth className="mr-2 h-4 w-4" />
                  Connect New Printer
                </>
              )}
            </Button>
          </div>
        )}

        {/* Available Printers */}
        {availablePrinters.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Previously Connected Printers</h4>
            <div className="space-y-2">
              {availablePrinters
                .filter(printer => printer.id !== connectedPrinter?.id)
                .map(printer => (
                  <div key={printer.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{printer.name}</p>
                      <p className="text-xs text-gray-500">ID: {printer.id}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReconnect(printer.id)}
                        disabled={isConnecting}
                      >
                        {isConnecting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          'Connect'
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleForgetPrinter(printer.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="ml-2 text-sm text-gray-500">Loading printers...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
