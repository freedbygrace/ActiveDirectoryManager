import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download, Camera, FileText, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface DashboardExportProps {
  dashboardRef: React.RefObject<HTMLDivElement>;
  title?: string;
}

export function DashboardExport({ dashboardRef, title = 'Dashboard' }: DashboardExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;
    
    setIsExporting(true);
    try {
      const dashboard = dashboardRef.current;
      
      // Calculate height for proper scaling
      const originalWidth = dashboard.offsetWidth;
      const originalHeight = dashboard.offsetHeight;
      
      // A4 dimensions (in pixels at 96 DPI)
      const pdfWidth = 595;
      const pdfHeight = 842;
      
      // Calculate scale to fit width
      const scale = pdfWidth / originalWidth;
      const scaledHeight = originalHeight * scale;
      
      // Create canvas from DOM node
      const canvas = await html2canvas(dashboard, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: getComputedStyle(document.body).backgroundColor || "#ffffff"
      });
      
      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: scaledHeight > pdfHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: 'a4'
      });
      
      // Add title
      pdf.setFontSize(16);
      pdf.text(title, 20, 20);
      
      // Calculate position to center image
      const imgWidth = pdf.internal.pageSize.getWidth() - 40; // margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add image 
      pdf.addImage(imgData, 'PNG', 20, 30, imgWidth, imgHeight);
      
      // Save PDF
      pdf.save(`${title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportImage = async () => {
    if (!dashboardRef.current) return;
    
    setIsExporting(true);
    try {
      const dashboard = dashboardRef.current;
      
      // Create canvas from DOM node
      const canvas = await html2canvas(dashboard, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: getComputedStyle(document.body).backgroundColor || "#ffffff"
      });
      
      // Convert to PNG
      const imgData = canvas.toDataURL('image/png');
      
      // Create a download link
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `${title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.png`;
      link.click();
    } catch (error) {
      console.error('Error exporting image:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1"
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="end">
        <div className="grid gap-2">
          <h4 className="font-medium">Export Dashboard</h4>
          <p className="text-sm text-muted-foreground">Choose export format</p>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="justify-start"
              onClick={handleExportPDF}
              disabled={isExporting}
            >
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="justify-start"
              onClick={handleExportImage}
              disabled={isExporting}
            >
              <Camera className="h-4 w-4 mr-2" />
              Image
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}