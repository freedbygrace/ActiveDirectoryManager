import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ColorPicker } from "@/components/ui/color-picker";
import { CopyIcon, Share2, CheckIcon, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardConfig } from "./dashboard-layout";
import { generateSnapshot } from "@/lib/snapshot-utils";

interface ShareDashboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboard: DashboardConfig;
  dataSources: Array<{
    id: string;
    name: string;
    data: any[];
    fields: Array<{ name: string; type: string }>;
  }>;
}

export function ShareDashboardDialog({ 
  open, 
  onOpenChange, 
  dashboard,
  dataSources
}: ShareDashboardDialogProps) {
  const { toast } = useToast();
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [customTitle, setCustomTitle] = useState(dashboard.name);
  const [description, setDescription] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0f172a");
  const [secondaryColor, setSecondaryColor] = useState("#6366f1");
  const [showDate, setShowDate] = useState(true);
  const [showFooter, setShowFooter] = useState(true);
  const [footerText, setFooterText] = useState("Generated with Active Directory Management Platform");
  const [expiryDays, setExpiryDays] = useState(7);
  const [includeData, setIncludeData] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // When user uploads a logo
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Generate a sharable URL with snapshot data
  const handleGenerateShareLink = async () => {
    setIsSharing(true);
    try {
      const snapshotData = generateSnapshot({
        dashboard,
        dataSources: includeData ? dataSources : [],
        branding: {
          logoUrl,
          companyName,
          title: customTitle,
          description,
          primaryColor,
          secondaryColor,
          showDate,
          showFooter,
          footerText,
          expiresInDays: expiryDays
        }
      });
      
      // In a real app, this would make an API call to store the snapshot
      // For now, we're simulating it with localStorage
      const snapshotId = `dash_${Date.now().toString(36)}`;
      localStorage.setItem(`snapshot_${snapshotId}`, JSON.stringify(snapshotData));
      
      // Generate share URL
      const shareUrl = `${window.location.origin}/dashboards/shared/${snapshotId}`;
      setShareUrl(shareUrl);
      
      toast({
        title: "Share link generated",
        description: "The share link for this dashboard has been created.",
      });
    } catch (error) {
      console.error("Error generating share link:", error);
      toast({
        title: "Error",
        description: "Failed to generate share link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  // Copy the URL to clipboard
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Share link copied to clipboard.",
    });
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  // Generate a PDF or image snapshot for download
  const handleDownloadSnapshot = async () => {
    setIsGenerating(true);
    try {
      const snapshotData = generateSnapshot({
        dashboard,
        dataSources: includeData ? dataSources : [],
        branding: {
          logoUrl,
          companyName,
          title: customTitle,
          description,
          primaryColor,
          secondaryColor,
          showDate,
          showFooter,
          footerText,
          expiresInDays: 0 // Download doesn't expire
        }
      });
      
      // In a real implementation, we would generate a PDF or image here
      // For now, we'll just download the JSON data
      const dataStr = JSON.stringify(snapshotData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dashboard.name.replace(/\s+/g, '_')}_snapshot.json`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      toast({
        title: "Snapshot downloaded",
        description: "Your dashboard snapshot has been downloaded.",
      });
    } catch (error) {
      console.error("Error generating snapshot:", error);
      toast({
        title: "Error",
        description: "Failed to generate snapshot. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Dashboard: {dashboard.name}</DialogTitle>
          <DialogDescription>
            Create a shareable snapshot of this dashboard with custom branding.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">Share Link</TabsTrigger>
            <TabsTrigger value="branding">Branding Options</TabsTrigger>
          </TabsList>
          
          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Include data in snapshot</Label>
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={includeData} 
                    onCheckedChange={setIncludeData} 
                    id="include-data"
                  />
                  <Label htmlFor="include-data">
                    {includeData 
                      ? "Data included (snapshot works offline)" 
                      : "Live data only (requires access to API)"}
                  </Label>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Snapshot expiry</Label>
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Expires after</span>
                    <span className="font-medium">
                      {expiryDays === 0 ? "Never expires" : `${expiryDays} days`}
                    </span>
                  </div>
                  <Slider
                    value={[expiryDays]}
                    min={0}
                    max={30}
                    step={1}
                    onValueChange={(value) => setExpiryDays(value[0])}
                  />
                </div>
              </div>

              {!shareUrl ? (
                <Button 
                  className="w-full" 
                  onClick={handleGenerateShareLink}
                  disabled={isSharing}
                >
                  {isSharing ? "Generating..." : "Generate Share Link"}
                </Button>
              ) : (
                <>
                  <div className="flex mt-4 space-x-2">
                    <Input 
                      value={shareUrl} 
                      readOnly 
                      className="flex-1"
                    />
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={handleCopyLink}
                      className="flex-shrink-0"
                    >
                      {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                    </Button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={handleDownloadSnapshot}
                      disabled={isGenerating}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {isGenerating ? "Generating..." : "Download Snapshot"}
                    </Button>
                    <Button 
                      variant="default" 
                      className="flex-1"
                      onClick={handleGenerateShareLink}
                      disabled={isSharing}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      {isSharing ? "Regenerating..." : "Regenerate Link"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="branding" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company-logo">Company Logo</Label>
                <Input
                  id="company-logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                />
                {logoUrl && (
                  <div className="mt-2 border rounded-md p-2 flex justify-center">
                    <img 
                      src={logoUrl} 
                      alt="Company Logo" 
                      className="max-h-20 object-contain" 
                    />
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your Company Name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="custom-title">Dashboard Title</Label>
                <Input
                  id="custom-title"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Dashboard Title"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Dashboard Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description for this dashboard"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 mt-4">
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-8 h-8 rounded-md border"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Secondary Color</Label>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-8 h-8 rounded-md border"
                    style={{ backgroundColor: secondaryColor }}
                  />
                  <Input
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4 mt-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  checked={showDate} 
                  onCheckedChange={setShowDate} 
                  id="show-date"
                />
                <Label htmlFor="show-date">Show date in snapshot</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  checked={showFooter} 
                  onCheckedChange={setShowFooter} 
                  id="show-footer"
                />
                <Label htmlFor="show-footer">Show footer in snapshot</Label>
              </div>
              
              {showFooter && (
                <div className="space-y-2">
                  <Label htmlFor="footer-text">Footer Text</Label>
                  <Input
                    id="footer-text"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="Footer text"
                  />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}